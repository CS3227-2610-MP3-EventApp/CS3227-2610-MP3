"""Transactional, source-bound business action proposals with local simulation only."""
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import ipaddress
import json
import re
from types import SimpleNamespace
from urllib.parse import urlsplit
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.service import AIError
from app.auth.models import AuditEvent, BusinessMembership, PasswordCredential, User, utcnow as auth_utcnow
from app.business.models import EventParticipation
from app.database import SessionLocal
from app.external_actions.models import ActionApproval, ActionIdempotencyKey, ActionProposal, ActionReceipt
from app.external_actions.problems import ActionError
from app.external_actions.schemas import ProposalInput, RevisionInput
from app.supplier_research import service as supplier_service


def utcnow():
    """Aware UTC clock seam used for expiry and source-age boundaries."""
    return auth_utcnow()


def simulate(payload):
    """Complete the approved local sandbox action; this function has no I/O."""
    return "simulated", None


def _aware(value):
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _iso(value):
    return _aware(value).isoformat().replace("+00:00", "Z")


def _authority(db: Session, actor, participation_id: UUID, *, lock=True):
    user_query = select(User).where(User.id == actor.id)
    credential_query = select(PasswordCredential).where(PasswordCredential.user_id == actor.id)
    if lock:
        user_query = user_query.with_for_update().execution_options(populate_existing=True)
        credential_query = credential_query.with_for_update().execution_options(populate_existing=True)
    user, credential = db.scalar(user_query), db.scalar(credential_query)
    if user is None or credential is None or user.role != "business" or actor.role != "business":
        raise ActionError("not_found")
    if credential.must_change_password or getattr(actor, "mustChangePassword", False):
        raise ActionError("password_change_required")
    participation_query = select(EventParticipation).where(EventParticipation.id == participation_id)
    if lock:
        participation_query = participation_query.with_for_update().execution_options(populate_existing=True)
    participation = db.scalar(participation_query)
    if participation is None:
        raise ActionError("not_found")
    membership_query = select(BusinessMembership.id).where(
        BusinessMembership.user_id == actor.id,
        BusinessMembership.business_id == participation.business_id,
        BusinessMembership.membership_role == "owner",
        BusinessMembership.status == "active")
    if lock:
        membership_query = membership_query.with_for_update()
    if db.scalar(membership_query) is None:
        raise ActionError("not_found")
    return participation


def _fresh(sources, now):
    for source in sources:
        try:
            retrieved = _aware(datetime.fromisoformat(source["retrievedAt"].replace("Z", "+00:00")))
        except (KeyError, TypeError, ValueError):
            raise ActionError("stale_source") from None
        if retrieved > now or now - retrieved > timedelta(hours=24):
            raise ActionError("stale_source")


def _safe_source_url(value):
    try:
        parsed = urlsplit(value)
        if parsed.scheme.lower() != "https" or not parsed.hostname or parsed.username is not None or parsed.password is not None:
            return False
        host = parsed.hostname.rstrip(".").lower()
        if host in {"localhost", "localhost.localdomain"} or host.endswith((".localhost", ".local", ".internal")):
            return False
        labels = host.split(".")
        if all(re.fullmatch(r"(?:[0-9]+|0[xX][0-9a-fA-F]+|0[0-7]+)", label) for label in labels):
            return False
        parsed.port  # Reject malformed port syntax before constructing the bound origin.
        try:
            address = ipaddress.ip_address(host.strip("[]"))
        except ValueError:
            pass
        else:
            if not address.is_global:
                return False
        return True
    except (TypeError, ValueError):
        return False


def _origin(value):
    parsed = urlsplit(value)
    port = parsed.port
    return (parsed.scheme.lower(), (parsed.hostname or "").lower(), port or 443)


def _canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _digest(proposal_id, revision, business_id, participation_id, action_type,
            payload, shortlist_id, shortlist_revision):
    value = {"proposalId": str(proposal_id), "proposalRevision": revision,
        "businessId": str(business_id), "participationId": str(participation_id),
        "actionType": action_type, "payload": payload, "shortlistId": str(shortlist_id),
        "shortlistRevision": shortlist_revision}
    return sha256(_canonical(value).encode("utf-8")).hexdigest()


def _build_payload(body: ProposalInput, source_data, now):
    if body.actionType == "purchase_cart" and (body.recipientEmail is not None or body.requestText is not None):
        raise ActionError("validation_error")
    if body.actionType == "quotation_request" and body.recipientEmail is None and body.requestText is None:
        # Empty quotation drafts remain useful; no minimum content rule is implied.
        pass
    entries = source_data["items"]
    sellers = {entry["offer"].get("supplierName") for entry in entries}
    if len(sellers) != 1 or None in sellers:
        raise ActionError("validation_error")
    item_origins = []
    output_items = []
    for requested, entry in zip(body.items, entries):
        snapshot, offer = entry["snapshot"], entry["offer"]
        sources_by_id = {str(source.get("sourceId")): source for source in snapshot["sources"]}
        refs = {str(evidence.get("sourceId")) for evidence in offer.get("evidenceByField", [])}
        sources = [sources_by_id[key] for key in sorted(refs) if key in sources_by_id]
        if not sources or any(not all(_safe_source_url(source.get(field))
                for field in ("searchResultUrl", "requestedUrl", "finalUrl")) for source in sources):
            raise ActionError("validation_error")
        item_origins.extend(_origin(source["finalUrl"]) for source in sources)
        _fresh(sources, now)
        request = snapshot["request"]
        price = offer.get("listedPrice") or {}
        amount = price.get("amountMinorUnits")
        basis = price.get("quantityBasis")
        subtotal = None
        currency = None
        unknown_reason = None
        if requested.quantity != request.get("quantity"):
            unknown_reason = "quantity_mismatch"
        elif (price.get("currency") != "SGD" or not isinstance(amount, str)
              or not amount.isdigit() or len(amount) > 18
              or not isinstance(basis, str) or not basis.isdigit()
              or int(basis) < 1 or int(basis) > 1_000_000):
            unknown_reason = "source_price_unknown"
        else:
            try:
                exact = int(amount) * requested.quantity
                divisor = int(basis)
                if exact % divisor:
                    unknown_reason = "source_price_unknown"
                else:
                    exact //= divisor
                    if exact > 999999999999999999:
                        unknown_reason = "arithmetic_overflow"
                    else:
                        subtotal, currency = str(exact), "SGD"
            except (ValueError, TypeError, ZeroDivisionError):
                unknown_reason = "source_price_unknown"
        output_items.append({
            "snapshotId": str(snapshot["id"]), "snapshotRevision": snapshot["revision"],
            "offerId": str(requested.offerId), "quantity": requested.quantity,
            "supplierName": offer.get("supplierName"),
            "productDescription": offer.get("productDescription"),
            "listedPrice": price,
            "estimatedItemSubtotalMinorUnits": subtotal,
            "estimatedCurrency": currency,
            "unknownReason": unknown_reason,
            "sources": [{"sourceId": str(source["sourceId"]), "requestedUrl": source["requestedUrl"],
                "finalUrl": source["finalUrl"], "retrievedAt": source["retrievedAt"],
                "sourceRevision": 1} for source in sources],
        })
    if len({str(entry["snapshot"]["id"]) for entry in entries}) != 1 or len(set(item_origins)) != 1:
        raise ActionError("validation_error")
    payload = {"seller": {"supplierName": next(iter(sellers)),
                "sourceOrigin": {"scheme": item_origins[0][0], "host": item_origins[0][1], "port": item_origins[0][2]}},
        "items": output_items}
    if body.actionType == "quotation_request":
        payload["recipientEmail"] = body.recipientEmail
        payload["requestText"] = body.requestText
    return payload


def _get_sources(db, actor, participation_id, shortlist_id, revision, items, now,
                 action_type="quotation_request", recipient_email=None, request_text=None):
    try:
        result = supplier_service.read_action_sources(db, actor, participation_id,
            shortlist_id, revision, [item.model_dump() if hasattr(item, "model_dump") else {
                "snapshotId": item.snapshotId, "offerId": item.offerId, "quantity": item.quantity}
                for item in items])
    except AIError as exc:
        raise ActionError({"not_found": "not_found", "stale_source": "stale_source"}.get(exc.code, "not_found")) from None
    return result


def _proposal_rows(db, proposal_id, *, lock=False):
    query = select(ActionProposal).where(ActionProposal.proposal_id == proposal_id).order_by(ActionProposal.revision.desc())
    if lock:
        query = query.with_for_update().execution_options(populate_existing=True)
    return db.scalars(query).all()


def _audit(db, actor, action, resource_id, revision, outcome="success"):
    db.add(AuditEvent(user_id=actor.id, action="external_action_" + action,
        resource_id=resource_id, resource_revision=revision, outcome=outcome))


def _iso_receipt(receipt):
    if receipt is None:
        return None
    result = {"executionId": receipt.id, "proposalRevision": receipt.proposal_revision,
        "approvalId": receipt.approval_id, "actorId": receipt.actor_id,
        "idempotencyKey": receipt.idempotency_key, "startedAt": _iso(receipt.started_at),
        "completedAt": _iso(receipt.completed_at), "outcome": receipt.outcome}
    if receipt.reason_code:
        result["reasonCode"] = receipt.reason_code
    return result


def _approval_view(approval, now):
    state = approval.state
    if state == "valid" and now >= _aware(approval.expires_at):
        state = "expired"
    return {"approvalId": approval.id, "proposalRevision": approval.proposal_revision,
        "approvedBy": approval.approved_by, "approvedAt": _iso(approval.approved_at),
        "expiresAt": _iso(approval.expires_at), "payloadDigest": approval.payload_digest, "state": state}


def _view(db, row, now=None):
    now = now or utcnow()
    approvals = db.scalars(select(ActionApproval).where(
        ActionApproval.proposal_id == row.proposal_id,
        ActionApproval.proposal_revision == row.revision).order_by(ActionApproval.approved_at, ActionApproval.id)).all()
    receipt = db.scalar(select(ActionReceipt).where(
        ActionReceipt.proposal_id == row.proposal_id,
        ActionReceipt.proposal_revision == row.revision))
    revisions = []
    for historical in reversed(_proposal_rows(db, row.proposal_id)):
        historical_approvals = db.scalars(select(ActionApproval).where(
            ActionApproval.proposal_id == historical.proposal_id,
            ActionApproval.proposal_revision == historical.revision).order_by(ActionApproval.approved_at, ActionApproval.id)).all()
        historical_receipt = _receipt_by_proposal(db, historical.proposal_id, historical.revision)
        revisions.append({"proposalRevision": historical.revision, "actionType": historical.action_type,
            "payload": historical.payload, "shortlistId": historical.shortlist_id,
            "shortlistRevision": historical.shortlist_revision, "payloadDigest": historical.payload_digest,
            "state": historical.state, "createdAt": _iso(historical.created_at),
            "updatedAt": _iso(historical.updated_at),
            "approvals": [_approval_view(value, now) for value in historical_approvals],
            "executionReceipt": _iso_receipt(historical_receipt)})
    return {"proposalId": row.proposal_id, "proposalRevision": row.revision,
        "creatorId": row.creator_id, "businessId": row.business_id,
        "participationId": row.participation_id, "actionType": row.action_type,
        "mode": row.mode, "recipientVerification": row.recipient_verification,
        "payload": row.payload, "shortlistId": row.shortlist_id,
        "shortlistRevision": row.shortlist_revision, "payloadDigest": row.payload_digest,
        "state": row.state, "createdAt": _iso(row.created_at), "updatedAt": _iso(row.updated_at),
        "approvals": [_approval_view(approval, now) for approval in approvals],
        "executionReceipt": _iso_receipt(receipt), "revisions": revisions}


def _find_proposal(db, actor, proposal_id, *, lock=False):
    # Resolve participation without locking proposal rows, then acquire authority
    # locks before proposal locks using the shared producer lock order.
    rows = _proposal_rows(db, proposal_id, lock=False)
    if not rows or rows[0].creator_id != actor.id:
        raise ActionError("not_found")
    _authority(db, actor, rows[0].participation_id, lock=lock)
    if lock:
        rows = _proposal_rows(db, proposal_id, lock=True)
    return rows


def create(db: Session, actor, body: ProposalInput):
    now = _aware(utcnow())
    participation = _authority(db, actor, body.participationId)
    source_data = _get_sources(db, actor, body.participationId, body.shortlistId,
        body.expectedShortlistRevision, body.items, now, body.actionType,
        body.recipientEmail, body.requestText)
    payload = _build_payload(body, source_data, now)
    proposal_id = uuid4()
    digest = _digest(proposal_id, 1, participation.business_id, participation.id,
        body.actionType, payload, body.shortlistId, body.expectedShortlistRevision)
    row = ActionProposal(id=uuid4(), proposal_id=proposal_id, revision=1,
        creator_id=actor.id, business_id=participation.business_id,
        participation_id=participation.id, action_type=body.actionType,
        recipient_verification="unverified" if body.actionType == "quotation_request" and body.recipientEmail else None,
        payload=payload, shortlist_id=body.shortlistId,
        shortlist_revision=body.expectedShortlistRevision, payload_digest=digest,
        state="open", created_at=now, updated_at=now)
    db.add(row)
    db.flush()
    _audit(db, actor, "proposal_create", proposal_id, 1)
    return _view(db, row, now)


def revise(db: Session, actor, proposal_id: UUID, body: RevisionInput):
    rows = _find_proposal(db, actor, proposal_id, lock=True)
    latest = rows[0]
    if body.participationId != latest.participation_id:
        raise ActionError("revision_conflict")
    if body.expectedProposalRevision != latest.revision:
        raise ActionError("revision_conflict")
    if latest.state != "open" or db.scalar(select(ActionReceipt.id).where(
            ActionReceipt.proposal_id == proposal_id, ActionReceipt.proposal_revision == latest.revision)):
        raise ActionError("execution_claimed")
    _authority(db, actor, latest.participation_id)
    source_data = _get_sources(db, actor, body.participationId, body.shortlistId,
        body.expectedShortlistRevision, body.items, _aware(utcnow()), body.actionType,
        body.recipientEmail, body.requestText)
    payload = _build_payload(body, source_data, _aware(utcnow()))
    if body.actionType == "purchase_cart" and (body.recipientEmail is not None or body.requestText is not None):
        raise ActionError("validation_error")
    rev = latest.revision + 1
    digest = _digest(proposal_id, rev, latest.business_id, latest.participation_id,
        body.actionType, payload, body.shortlistId, body.expectedShortlistRevision)
    row = ActionProposal(id=uuid4(), proposal_id=proposal_id, revision=rev,
        creator_id=actor.id, business_id=latest.business_id, participation_id=latest.participation_id,
        action_type=body.actionType,
        recipient_verification="unverified" if body.actionType == "quotation_request" and body.recipientEmail else None,
        payload=payload, shortlist_id=body.shortlistId, shortlist_revision=body.expectedShortlistRevision,
        payload_digest=digest, state="open", created_at=_aware(utcnow()), updated_at=_aware(utcnow()))
    db.add(row)
    db.flush()
    _audit(db, actor, "proposal_revision", proposal_id, rev)
    return _view(db, row)


def list_proposals(db: Session, actor, limit=20, offset=0):
    # List only the actor's proposal roots; each root is represented by its latest immutable revision.
    roots = db.scalars(select(ActionProposal.proposal_id).where(
        ActionProposal.creator_id == actor.id).group_by(ActionProposal.proposal_id)
        .order_by(func.max(ActionProposal.created_at).desc(), ActionProposal.proposal_id.asc())
        .limit(limit).offset(offset)).all()
    if not roots:
        # Still recheck live authority for callers whose membership was revoked.
        _actor_authority(db, actor)
    total = db.scalar(select(func.count(func.distinct(ActionProposal.proposal_id))).where(
        ActionProposal.creator_id == actor.id)) or 0
    values = []
    for proposal_id in roots:
        rows = _proposal_rows(db, proposal_id)
        if rows:
            _authority(db, actor, rows[0].participation_id, lock=False)
            values.append(_view(db, rows[0]))
    return {"items": values, "total": total, "limit": limit, "offset": offset}


def _actor_authority(db, actor):
    user, credential = db.get(User, actor.id), db.get(PasswordCredential, actor.id)
    if user is None or credential is None or user.role != "business":
        raise ActionError("not_found")
    if credential.must_change_password:
        raise ActionError("password_change_required")
    active = db.scalar(select(BusinessMembership.id).where(
        BusinessMembership.user_id == actor.id, BusinessMembership.status == "active").limit(1))
    if active is None:
        raise ActionError("not_found")


def get_proposal(db: Session, actor, proposal_id):
    rows = _find_proposal(db, actor, proposal_id, lock=False)
    return _view(db, rows[0])


def approve(db: Session, actor, proposal_id, revision):
    rows = _find_proposal(db, actor, proposal_id, lock=True)
    row = next((entry for entry in rows if entry.revision == revision), None)
    if row is None:
        raise ActionError("not_found")
    if row.revision != rows[0].revision:
        raise ActionError("revision_conflict")
    if row.state == "cancelled":
        raise ActionError("cancelled")
    if row.state != "open":
        raise ActionError("execution_claimed")
    items = [SimpleNamespace(snapshotId=UUID(item["snapshotId"]), offerId=UUID(item["offerId"]), quantity=item["quantity"])
             for item in row.payload["items"]]
    source_data = _get_sources(db, actor, row.participation_id, row.shortlist_id,
        row.shortlist_revision, [SimpleNamespace(**{
            "snapshotId": UUID(item["snapshotId"]), "offerId": UUID(item["offerId"]), "quantity": item["quantity"]})
            for item in row.payload["items"]], _aware(utcnow()), row.action_type,
            row.payload.get("recipientEmail"), row.payload.get("requestText"))
    # Rebuild and compare the canonical source-bound digest so edits to supplier-owned JSON are detected.
    digest = _digest(row.proposal_id, row.revision, row.business_id, row.participation_id,
        row.action_type, _rebuild_payload(row, source_data, _aware(utcnow())), row.shortlist_id, row.shortlist_revision)
    if digest != row.payload_digest:
        raise ActionError("stale_source")
    now = _aware(utcnow())
    approval = ActionApproval(id=uuid4(), proposal_id=row.proposal_id,
        proposal_revision=row.revision, approved_by=actor.id, approved_at=now,
        expires_at=now + timedelta(minutes=15), payload_digest=row.payload_digest, state="valid")
    db.add(approval)
    db.flush()
    _audit(db, actor, "approval_create", approval.id, row.revision)
    return _approval_view(approval, now)


def _rebuild_payload(row, source_data, now):
    items = []
    for item in row.payload["items"]:
        items.append(SimpleNamespace(snapshotId=UUID(item["snapshotId"]), offerId=UUID(item["offerId"]), quantity=item["quantity"]))
    return _build_payload(SimpleNamespace(actionType=row.action_type,
        recipientEmail=row.payload.get("recipientEmail"), requestText=row.payload.get("requestText"),
        items=items), source_data, now)


def cancel(db: Session, actor, proposal_id, expected_revision):
    rows = _find_proposal(db, actor, proposal_id, lock=True)
    row = rows[0]
    if row.revision != expected_revision:
        raise ActionError("revision_conflict")
    if row.state != "open" or db.scalar(select(ActionReceipt.id).where(
            ActionReceipt.proposal_id == proposal_id, ActionReceipt.proposal_revision == row.revision)):
        raise ActionError("execution_claimed")
    now = _aware(utcnow())
    row.state = "cancelled"
    row.updated_at = now
    db.query(ActionApproval).filter(ActionApproval.proposal_id == proposal_id,
        ActionApproval.proposal_revision == row.revision, ActionApproval.state == "valid").update({"state": "cancelled"})
    _audit(db, actor, "proposal_cancel", proposal_id, row.revision)
    return _view(db, row, now)


def _receipt_by_proposal(db, proposal_id, revision):
    return db.scalar(select(ActionReceipt).where(ActionReceipt.proposal_id == proposal_id,
        ActionReceipt.proposal_revision == revision))


def execute(db: Session, actor, approval_id, idempotency_key):
    approval = db.scalar(select(ActionApproval).where(ActionApproval.id == approval_id))
    if approval is None:
        raise ActionError("not_found")
    # Lock order matches source deletion/shortlist replacement: actor, credential, participation,
    # active membership, proposal revision, then approval/source rows.
    rows = _find_proposal(db, actor, approval.proposal_id, lock=True)
    approval = db.scalar(select(ActionApproval).where(ActionApproval.id == approval_id)
        .with_for_update().execution_options(populate_existing=True))
    if approval is None or approval.approved_by != actor.id:
        raise ActionError("not_found")
    proposal = next((item for item in rows if item.revision == approval.proposal_revision), None)
    if proposal is None:
        raise ActionError("not_found")
    existing = _receipt_by_proposal(db, proposal.proposal_id, proposal.revision)
    prior_key = db.scalar(select(ActionIdempotencyKey).where(
        ActionIdempotencyKey.creator_id == actor.id,
        ActionIdempotencyKey.idempotency_key == idempotency_key))
    if prior_key and (prior_key.proposal_id != proposal.proposal_id or prior_key.proposal_revision != proposal.revision):
        raise ActionError("idempotency_conflict")
    if existing:
        if prior_key is None:
            db.add(ActionIdempotencyKey(creator_id=actor.id, idempotency_key=idempotency_key,
                proposal_id=proposal.proposal_id, proposal_revision=proposal.revision))
        _audit(db, actor, "execution_replay", proposal.proposal_id, proposal.revision, existing.outcome)
        db.flush()
        return _iso_receipt(existing)
    if prior_key:
        # A reservation without a receipt cannot be committed in this service's atomic transaction.
        raise ActionError("idempotency_conflict")
    if proposal.revision != rows[0].revision:
        raise ActionError("revision_conflict")
    if proposal.state == "cancelled":
        raise ActionError("cancelled")
    if proposal.state != "open":
        raise ActionError("execution_claimed")
    if approval.state == "cancelled":
        raise ActionError("cancelled")
    if _aware(utcnow()) >= _aware(approval.expires_at):
        raise ActionError("expired")
    if approval.payload_digest != proposal.payload_digest:
        raise ActionError("stale_source")
    items = [SimpleNamespace(snapshotId=UUID(item["snapshotId"]), offerId=UUID(item["offerId"]), quantity=item["quantity"])
             for item in proposal.payload["items"]]
    source_data = _get_sources(db, actor, proposal.participation_id, proposal.shortlist_id,
        proposal.shortlist_revision, items, _aware(utcnow()), proposal.action_type,
        proposal.payload.get("recipientEmail"), proposal.payload.get("requestText"))
    rebuilt = _rebuild_payload(proposal, source_data, _aware(utcnow()))
    if _canonical(rebuilt) != _canonical(proposal.payload):
        raise ActionError("stale_source")
    digest = _digest(proposal.proposal_id, proposal.revision, proposal.business_id,
        proposal.participation_id, proposal.action_type, rebuilt, proposal.shortlist_id, proposal.shortlist_revision)
    if digest != proposal.payload_digest:
        raise ActionError("stale_source")
    _fresh([source for item in rebuilt["items"] for source in item["sources"]], _aware(utcnow()))
    started = _aware(utcnow())
    try:
        outcome, reason = simulate(rebuilt)
    except Exception:
        outcome, reason = "uncertain", "simulation_error"
    if outcome not in {"simulated", "failed", "uncertain"}:
        outcome, reason = "uncertain", "simulation_error"
    if outcome == "simulated":
        reason = None
    completed = _aware(utcnow())
    receipt = ActionReceipt(id=uuid4(), proposal_id=proposal.proposal_id,
        proposal_revision=proposal.revision, approval_id=approval.id, actor_id=actor.id,
        idempotency_key=idempotency_key, started_at=started, completed_at=completed,
        outcome=outcome, reason_code=reason)
    db.add(ActionIdempotencyKey(creator_id=actor.id, idempotency_key=idempotency_key,
        proposal_id=proposal.proposal_id, proposal_revision=proposal.revision))
    db.add(receipt)
    proposal.state = outcome
    proposal.updated_at = completed
    approval.state = "consumed"
    db.query(ActionApproval).filter(ActionApproval.proposal_id == proposal.proposal_id,
        ActionApproval.proposal_revision == proposal.revision, ActionApproval.state == "valid").update({"state": "consumed"})
    _audit(db, actor, "execution", proposal.proposal_id, proposal.revision, outcome)
    db.flush()
    return _iso_receipt(receipt)


def record_rejected(actor, action, resource_id, revision, outcome):
    try:
        with SessionLocal.begin() as db:
            if action == "execution" and revision is None and resource_id is not None:
                revision = db.scalar(select(ActionApproval.proposal_revision).where(
                    ActionApproval.id == resource_id))
            db.add(AuditEvent(user_id=actor.id, action="external_action_" + action,
                resource_id=resource_id, resource_revision=revision, outcome=outcome))
    except Exception:
        pass
