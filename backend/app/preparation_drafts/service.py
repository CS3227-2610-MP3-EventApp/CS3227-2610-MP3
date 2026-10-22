from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.models import AnalysisJob
from app.ai.service import AIError
from app.auth.models import AuditEvent, BusinessMembership, Event, PasswordCredential, User, utcnow
from app.auth.schemas import CurrentActor
from app.business.models import EventParticipation
from app.preparation.models import PreparationDocument
from app.preparation_drafts.models import PreparationDraft
from app.preparation_drafts.schemas import (
    AdoptPreparationDraft, CreatePreparationDraft, PreparationGenerationOutput,
    ReplacePreparationDraft,
)
from app.settings import Settings
from app.setup.models import ParticipationSetup


def _authority(db: Session, actor: CurrentActor, participation_id: UUID, *, lock_sources=False):
    user = db.scalar(select(User).where(User.id == actor.id).with_for_update().execution_options(populate_existing=True))
    credential = db.scalar(select(PasswordCredential).where(PasswordCredential.user_id == actor.id).with_for_update().execution_options(populate_existing=True))
    if user is None or credential is None or user.role != "business":
        raise AIError("forbidden")
    if credential.must_change_password:
        raise AIError("password_change_required")
    target_event_id = db.scalar(select(EventParticipation.event_id).where(
        EventParticipation.id == participation_id))
    if target_event_id is None:
        raise AIError("not_found")
    event_query = select(Event).where(Event.id == target_event_id)
    if lock_sources:
        event_query = event_query.with_for_update().execution_options(populate_existing=True)
    event = db.scalar(event_query)
    participation_query = select(EventParticipation).where(EventParticipation.id == participation_id)
    if lock_sources:
        participation_query = participation_query.with_for_update().execution_options(populate_existing=True)
    participation = db.scalar(participation_query)
    if event is None or participation is None or participation.event_id != event.id:
        raise AIError("not_found")
    membership = db.scalar(select(BusinessMembership.id).where(
        BusinessMembership.user_id == actor.id,
        BusinessMembership.business_id == participation.business_id,
        BusinessMembership.membership_role == "owner",
        BusinessMembership.status == "active").with_for_update())
    if membership is None:
        raise AIError("not_found")
    return event, participation


def _current_context(db: Session, actor: CurrentActor, participation_id: UUID, *, lock_sources=False):
    event, participation = _authority(db, actor, participation_id, lock_sources=lock_sources)
    setup = db.get(ParticipationSetup, participation.id)
    preparation = db.get(PreparationDocument, participation.id)
    revisions = {
        "event": event.revision,
        "setup": setup.published_revision if setup else 1,
        "preparation": preparation.revision if preparation else 1,
    }
    facts = {
        "event": {
            "title": event.title,
            "startsAt": event.starts_at.isoformat().replace("+00:00", "Z"),
            "endsAt": event.ends_at.isoformat().replace("+00:00", "Z"),
            "timezone": event.timezone,
        },
        "setup": {
            "boothLabel": setup.published_booth_label if setup else None,
            "setupInstructions": setup.published_setup_instructions if setup else None,
        },
    }
    return event, participation, setup, preparation, revisions, facts


def _selected_context(preparation, task_ids, line_ids):
    tasks = preparation.tasks if preparation else []
    lines = preparation.budget_lines if preparation else []
    task_map = {str(item["id"]): item for item in tasks}
    line_map = {str(item["id"]): item for item in lines}
    if any(str(identifier) not in task_map for identifier in task_ids):
        raise AIError("validation_error")
    if any(str(identifier) not in line_map for identifier in line_ids):
        raise AIError("validation_error")
    selected_tasks = [{key: task_map[str(identifier)][key] for key in ("title", "status", "dueDate")}
                      for identifier in task_ids]
    selected_lines = [{key: line_map[str(identifier)][key]
                       for key in ("description", "quantity", "unitPriceMinorUnits", "priceBasis", "quotationBasis")}
                      for identifier in line_ids]
    for index, identifier in enumerate(line_ids):
        if line_map[str(identifier)].get("category") is not None:
            selected_lines[index]["category"] = line_map[str(identifier)]["category"]
    return selected_tasks, selected_lines


def _normal_request(body: CreatePreparationDraft):
    return {
        "expectedPreparationRevision": body.expectedPreparationRevision,
        "expectedSetupRevision": body.expectedSetupRevision,
        "expectedEventRevision": body.expectedEventRevision,
        "needs": body.needs,
        "selectedTaskIds": [str(value) for value in body.selectedTaskIds],
        "selectedLineIds": [str(value) for value in body.selectedLineIds],
        "dataSharingConfirmed": body.dataSharingConfirmed is True,
        "syntheticDataConfirmed": body.syntheticDataConfirmed is True,
    }


def _assert_live_enabled(event_id: UUID, body: CreatePreparationDraft):
    try:
        settings = Settings()
    except ValueError:
        raise AIError("service_unavailable") from None
    if (settings.environment == "production" or not settings.ai_enabled
            or not (settings.ai_synthetic_only or settings.ai_real_data_enabled) or not settings.soclaas_api_key
            or not settings.soclaas_model or event_id not in settings.allowed_event_ids):
        raise AIError("service_unavailable")
    if body.dataSharingConfirmed is not True and body.syntheticDataConfirmed is not True:
        raise AIError("validation_error")


def create_job(db: Session, actor: CurrentActor, participation_id: UUID, body: CreatePreparationDraft):
    # Owner row serializes request deduplication, daily quotas, and active-job checks.
    user = db.scalar(select(User).where(User.id == actor.id).with_for_update().execution_options(populate_existing=True))
    if user is None or user.role != "business":
        raise AIError("forbidden")
    if actor.mustChangePassword:
        raise AIError("password_change_required")
    _authority(db, actor, participation_id)
    normalized_request = _normal_request(body)
    previous = db.scalar(select(AnalysisJob).where(
        AnalysisJob.owner_id == actor.id, AnalysisJob.request_id == body.requestId))
    if previous is not None:
        prior = (previous.source_snapshot or {}).get("request")
        if isinstance(prior, dict): prior = {"dataSharingConfirmed":False, **prior}
        if previous.workflow != "preparation" or previous.business_participation_id != participation_id or prior != normalized_request:
            raise AIError("request_conflict")
        return previous

    event, participation, _, preparation, revisions, facts = _current_context(
        db, actor, participation_id, lock_sources=True)
    if (body.expectedEventRevision != revisions["event"]
            or body.expectedSetupRevision != revisions["setup"]
            or body.expectedPreparationRevision != revisions["preparation"]):
        raise AIError("source_changed")
    selected_tasks, selected_lines = _selected_context(
        preparation, body.selectedTaskIds, body.selectedLineIds)
    _assert_live_enabled(event.id, body)

    active = db.scalar(select(AnalysisJob.id).where(
        AnalysisJob.owner_id == actor.id,
        AnalysisJob.state.in_(["pending", "running"])).limit(1))
    if active is not None:
        raise AIError("active_job")
    now = utcnow()
    day_start = datetime.combine(now.date(), datetime.min.time(), tzinfo=timezone.utc)
    count = db.scalar(select(func.count()).select_from(AnalysisJob).where(
        AnalysisJob.owner_id == actor.id, AnalysisJob.created_at >= day_start)) or 0
    if count >= 10:
        raise AIError("quota_exceeded")

    snapshot = {
        "request": normalized_request,
        "sourceRevisions": revisions,
        "participationRevision": participation.revision,
        "participantType": participation.participant_type,
        "sourceFacts": facts,
        "needs": body.needs,
        "selectedTasks": selected_tasks,
        "selectedLines": selected_lines,
    }
    job = AnalysisJob(
        owner_id=actor.id, event_id=event.id, business_participation_id=participation.id,
        workflow="preparation", source_snapshot=snapshot, application_id=None,
        request_id=body.requestId, source_revision=None, rubric_revision=None,
        comparison_revisions=[], state="pending", failure_code=None,
        provider_may_have_run=False, created_at=now, updated_at=now,
        deadline_at=now + timedelta(seconds=180),
    )
    db.add(job)
    db.flush()
    db.add(AuditEvent(user_id=actor.id, action="preparation_draft_job_create",
        resource_id=job.id, resource_revision=participation.revision, outcome="success"))
    return job


def check_job_context(db: Session, job: AnalysisJob, *, lock_sources=False):
    snapshot = job.source_snapshot or {}
    row = db.execute(select(User, PasswordCredential, BusinessMembership).join(
        PasswordCredential, PasswordCredential.user_id == User.id).join(
        BusinessMembership, BusinessMembership.user_id == User.id).where(
        User.id == job.owner_id, User.role == "business",
        PasswordCredential.must_change_password.is_(False),
        BusinessMembership.business_id == db.scalar(select(EventParticipation.business_id).where(
            EventParticipation.id == job.business_participation_id)),
        BusinessMembership.membership_role == "owner", BusinessMembership.status == "active")
        .with_for_update(of=(User, PasswordCredential, BusinessMembership))).first()
    if row is None:
        return "permission_revoked", None
    # Same producer lock order used by setup/preparation and event writers.
    event_id = db.scalar(select(EventParticipation.event_id).where(
        EventParticipation.id == job.business_participation_id))
    event_query = select(Event).where(Event.id == event_id)
    if lock_sources:
        event_query = event_query.with_for_update().execution_options(populate_existing=True)
    event = db.scalar(event_query)
    participation_query = select(EventParticipation).where(
        EventParticipation.id == job.business_participation_id)
    if lock_sources:
        participation_query = participation_query.with_for_update().execution_options(populate_existing=True)
    participation = db.scalar(participation_query)
    if (event is None or participation is None or event.id != job.event_id
            or participation.event_id != event.id):
        return "source_changed", None
    setup = db.get(ParticipationSetup, participation.id)
    preparation = db.get(PreparationDocument, participation.id)
    revisions = {"event": event.revision, "setup": setup.published_revision if setup else 1,
                 "preparation": preparation.revision if preparation else 1}
    snapshot_revisions = snapshot.get("sourceRevisions")
    facts = {"event": {"title": event.title, "startsAt": event.starts_at.isoformat().replace("+00:00", "Z"),
                        "endsAt": event.ends_at.isoformat().replace("+00:00", "Z"), "timezone": event.timezone},
             "setup": {"boothLabel": setup.published_booth_label if setup else None,
                       "setupInstructions": setup.published_setup_instructions if setup else None}}
    if (revisions != snapshot_revisions
            or participation.revision != snapshot.get("participationRevision")
            or participation.participant_type != snapshot.get("participantType")
            or facts != snapshot.get("sourceFacts")):
        return "source_changed", None
    return None, snapshot


def validate_generated(raw: str, snapshot: dict):
    if not isinstance(raw, str) or len(raw) > 40_000:
        raise ValueError("invalid_output")
    try:
        result = PreparationGenerationOutput.model_validate_json(raw)
    except Exception as exc:
        raise ValueError("invalid_output") from exc
    expected_facts = snapshot["sourceFacts"]
    facts = result.sourceFacts.model_dump(mode="json", by_alias=True)
    if facts != expected_facts:
        raise ValueError("invalid_output")
    tasks = [{"title": task.title, "status": "not_started", "dueDate": None}
             for task in result.tasks]
    lines = [{"description": line.description, "quantity": line.quantity,
              "unitPriceMinorUnits": line.unitPriceMinorUnits,
              "priceBasis": "estimate" if line.unitPriceMinorUnits is not None else "unknown",
              "quotationBasis": None} for line in result.lines]
    return {"tasks": tasks, "lines": lines}


def _budget(lines):
    subtotal = sum(line["quantity"] * line["unitPriceMinorUnits"]
                   for line in lines if line["unitPriceMinorUnits"] is not None)
    complete = all(line["unitPriceMinorUnits"] is not None for line in lines)
    return {"currency": "SGD", "lines": lines,
            "totalMinorUnits": str(subtotal) if complete else None,
            "knownSubtotalMinorUnits": str(subtotal), "isComplete": complete}


def draft_view(draft: PreparationDraft):
    from app.preparation_drafts.schemas import PreparationDraftView
    return PreparationDraftView(
        id=draft.id, jobId=draft.job_id, participationId=draft.participation_id,
        revision=draft.revision, sourceRevisions=draft.source_revisions,
        sourceFacts=draft.source_facts, tasks=draft.tasks,
        budget=_budget(draft.budget_lines), createdAt=draft.created_at,
        adoptedAt=draft.adopted_at, adoptedPreparationRevision=draft.adopted_preparation_revision)


def create_persisted_draft(db: Session, job: AnalysisJob, payload: dict):
    snapshot = job.source_snapshot
    draft = PreparationDraft(
        id=uuid4(), job_id=job.id, participation_id=job.business_participation_id,
        revision=1, source_revisions=snapshot["sourceRevisions"],
        source_facts=snapshot["sourceFacts"], tasks=payload["tasks"],
        budget_lines=payload["lines"], created_at=utcnow(), updated_at=utcnow())
    db.add(draft)
    db.flush()
    return draft


def get_draft_for_job(db: Session, job: AnalysisJob):
    if job.workflow != "preparation" or job.state != "completed":
        return None
    record = db.scalar(select(PreparationDraft).where(PreparationDraft.job_id == job.id))
    return draft_view(record) if record else None


def _owner_draft(db: Session, actor: CurrentActor, draft_id: UUID, *, lock=False):
    query = select(PreparationDraft, AnalysisJob).join(
        AnalysisJob, PreparationDraft.job_id == AnalysisJob.id).where(
        PreparationDraft.id == draft_id, AnalysisJob.owner_id == actor.id,
        AnalysisJob.workflow == "preparation")
    if lock:
        query = query.with_for_update(of=PreparationDraft)
    pair = db.execute(query).first()
    if pair is None:
        raise AIError("not_found")
    draft, job = pair
    _authority(db, actor, draft.participation_id)
    return draft, job


def history(db: Session, actor: CurrentActor, participation_id: UUID, limit=20, offset=0):
    _authority(db, actor, participation_id)
    draft_query = select(PreparationDraft).join(AnalysisJob).where(
        PreparationDraft.participation_id == participation_id,
        AnalysisJob.owner_id == actor.id, AnalysisJob.workflow == "preparation")
    total = db.scalar(select(func.count()).select_from(draft_query.subquery())) or 0
    records = db.scalars(draft_query.order_by(
        PreparationDraft.created_at.desc(), PreparationDraft.id.desc()).limit(limit).offset(offset)).all()
    latest = db.scalar(select(AnalysisJob).where(
        AnalysisJob.owner_id == actor.id, AnalysisJob.workflow == "preparation",
        AnalysisJob.business_participation_id == participation_id).order_by(
        AnalysisJob.created_at.desc(), AnalysisJob.id.desc()).limit(1))
    from app.ai.service import job_view
    from app.preparation_drafts.schemas import PreparationDraftHistory
    return PreparationDraftHistory(items=[draft_view(item) for item in records], total=total,
        limit=limit, offset=offset, latestJob=job_view(db, latest) if latest else None)


def get_draft(db: Session, actor: CurrentActor, draft_id: UUID):
    draft, _ = _owner_draft(db, actor, draft_id)
    return draft_view(draft)


def replace_draft(db: Session, actor: CurrentActor, draft_id: UUID, body: ReplacePreparationDraft):
    draft, _ = _owner_draft(db, actor, draft_id, lock=True)
    if draft.adopted_at is not None:
        raise AIError("already_adopted")
    if body.expectedRevision != draft.revision:
        raise AIError("revision_conflict")
    draft.revision += 1
    draft.tasks = [item.model_dump(mode="json", by_alias=True) for item in body.tasks]
    draft.budget_lines = [item.model_dump(mode="json", by_alias=True) for item in body.budget.lines]
    draft.updated_at = utcnow()
    db.flush()
    return draft_view(draft)


def adopt_draft(db: Session, actor: CurrentActor, draft_id: UUID, body: AdoptPreparationDraft):
    draft, job = _owner_draft(db, actor, draft_id, lock=True)
    if draft.adopted_at is not None:
        raise AIError("already_adopted")
    if body.expectedDraftRevision != draft.revision:
        raise AIError("revision_conflict")
    snapshot = job.source_snapshot or {}
    event, participation, _, _, revisions, _ = _current_context(
        db, actor, draft.participation_id, lock_sources=True)
    snap_revisions = draft.source_revisions
    if (revisions != snap_revisions
            or participation.revision != snapshot.get("participationRevision")
            or participation.participant_type != snapshot.get("participantType")):
        raise AIError("source_changed")
    if (body.expectedEventRevision != revisions["event"]
            or body.expectedSetupRevision != revisions["setup"]
            or body.expectedPreparationRevision != revisions["preparation"]):
        raise AIError("source_changed")
    if (any(index >= len(draft.tasks) for index in body.taskIndexes)
            or any(index >= len(draft.budget_lines) for index in body.lineIndexes)):
        raise AIError("validation_error")
    from app.preparation.service import append_draft_items
    selected_tasks = [draft.tasks[index] for index in body.taskIndexes]
    selected_lines = [draft.budget_lines[index] for index in body.lineIndexes]
    preparation = append_draft_items(db, actor, participation.id,
                                     body.expectedPreparationRevision,
                                     selected_tasks, selected_lines)
    now = utcnow()
    draft.adopted_at = now
    draft.adopted_preparation_revision = preparation["revision"]
    db.add(AuditEvent(user_id=actor.id, action="preparation_draft_adopt",
        resource_id=draft.id, resource_revision=preparation["revision"], outcome="success"))
    db.flush()
    return {"draft": draft_view(draft), "preparation": preparation}


def problem_response(request, code):
    # Reuse the fixed AI problem envelope so provider/domain errors remain safe.
    from app.ai.service import problem_response as ai_problem_response
    aliases = {
        "request_conflict": "request_conflict", "source_changed": "source_changed",
        "already_adopted": "already_adopted", "quota_exceeded": "quota_exceeded",
        "active_job": "active_job", "revision_conflict": "revision_conflict",
        "not_found": "not_found", "forbidden": "forbidden",
        "password_change_required": "password_change_required",
        "validation_error": "validation_error", "service_unavailable": "service_unavailable",
        "internal_error": "service_unavailable",
    }
    return ai_problem_response(request, aliases.get(code, "service_unavailable"))
