from datetime import datetime, timedelta, timezone
import json
from uuid import UUID

from pydantic import ValidationError
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.ai.service import AIError
from app.attendee_ai.models import ItineraryJob
from app.attendee_ai.schemas import ItineraryJobView, ModelFeasible, ModelInfeasible
from app.attendee_planning.models import PlanningState
from app.auth.models import AuditEvent, PasswordCredential, User, utcnow
from app.programme.models import ProgrammeItemRevision
from app.programme.schemas import PublishedProgramme
from app.settings import Settings


def lock_attendee(db: Session, owner_id: UUID) -> bool:
    row = db.execute(select(User, PasswordCredential).join(
        PasswordCredential, PasswordCredential.user_id == User.id).where(
        User.id == owner_id, User.role == "attendee", PasswordCredential.must_change_password.is_(False)
    ).with_for_update(of=(User, PasswordCredential))).first()
    return row is not None


def current_facts(rows) -> list[PublishedProgramme]:
    """Latest revision of each activity, without cancelled ones, in chronological order."""
    latest = {}
    for row in rows:
        if row.item_id not in latest or row.revision > latest[row.item_id].revision:
            latest[row.item_id] = row
    facts = [PublishedProgramme.model_validate(row.snapshot) for row in latest.values()]
    facts = [fact for fact in facts if fact.state == "published"]
    return sorted(facts, key=lambda fact: (fact.startsAt, fact.endsAt, str(fact.id)))


def published_facts(db: Session, event_id: UUID) -> list[PublishedProgramme]:
    return current_facts(db.scalars(select(ProgrammeItemRevision).where(ProgrammeItemRevision.event_id == event_id)).all())


def planning_row(db: Session, owner_id: UUID, event_id: UUID):
    return db.scalar(select(PlanningState).where(PlanningState.user_id == owner_id,
        PlanningState.event_id == event_id).execution_options(populate_existing=True))


def provider_configured(settings: Settings, event_id: UUID) -> bool:
    return bool(settings.ai_enabled and settings.ai_synthetic_only and settings.environment != "production"
                and settings.soclaas_api_key and settings.soclaas_model
                and event_id in settings.synthetic_event_ids)


def create_job(db: Session, owner_id: UUID, event_id: UUID, body) -> ItineraryJob:
    # A stable user lock serializes idempotency, active-job and daily-quota checks.
    if not lock_attendee(db, owner_id):
        raise AIError("forbidden")
    previous = db.scalar(select(ItineraryJob).where(
        ItineraryJob.owner_id == owner_id, ItineraryJob.request_id == body.requestId))
    if previous:
        if (previous.event_id, previous.preference_revision) != (event_id, body.preferenceRevision):
            raise AIError("revision_conflict")
        return previous
    if not published_facts(db, event_id):
        raise AIError("not_found")
    row = planning_row(db, owner_id, event_id)
    if (row.preference_revision if row else 0) != body.preferenceRevision:
        raise AIError("revision_conflict")
    if not provider_configured(Settings(), event_id):
        raise AIError("service_unavailable")
    active = db.scalar(select(ItineraryJob.id).where(ItineraryJob.owner_id == owner_id,
        ItineraryJob.state.in_(["pending", "running"])).limit(1))
    if active:
        raise AIError("active_job")
    now = utcnow()
    day_start = datetime.combine(now.date(), datetime.min.time(), tzinfo=timezone.utc)
    count = db.scalar(select(func.count()).select_from(ItineraryJob).where(
        ItineraryJob.owner_id == owner_id, ItineraryJob.created_at >= day_start)) or 0
    if count >= 10:
        raise AIError("daily_limit")
    job = ItineraryJob(owner_id=owner_id, event_id=event_id, request_id=body.requestId,
        preference_revision=body.preferenceRevision, state="pending", failure_code=None,
        provider_may_have_run=False, created_at=now, updated_at=now, deadline_at=now + timedelta(seconds=180))
    db.add(job)
    db.flush()
    db.add(AuditEvent(user_id=owner_id, action="itinerary_job_create", resource_id=job.id, outcome="success"))
    return job


def job_view(job: ItineraryJob) -> ItineraryJobView:
    return ItineraryJobView(id=job.id, eventId=job.event_id, state=job.state, createdAt=job.created_at,
        updatedAt=job.updated_at, completedAt=job.completed_at, failureCode=job.failure_code,
        providerMayHaveRun=job.provider_may_have_run,
        result=job.result if job.state == "completed" else None)


def _owned(db, owner_id, job_id, *, lock=False):
    query = select(ItineraryJob).where(ItineraryJob.id == job_id, ItineraryJob.owner_id == owner_id)
    job = db.scalar(query.with_for_update() if lock else query)
    if job is None:
        raise AIError("not_found")
    return job


def get_job(db: Session, owner_id: UUID, job_id: UUID) -> ItineraryJobView:
    return job_view(_owned(db, owner_id, job_id))


def cancel_job(db: Session, owner_id: UUID, job_id: UUID) -> ItineraryJobView:
    job = _owned(db, owner_id, job_id, lock=True)
    if job.state in {"pending", "running"}:
        job.state = "cancelled"
        job.updated_at = job.completed_at = utcnow()
        job.lease_until = None
        job.provider_may_have_run = job.dispatch_at is not None
        db.add(AuditEvent(user_id=owner_id, action="itinerary_job_cancel", resource_id=job.id, outcome="success"))
    db.flush()
    return job_view(job)


def recovery(db: Session, now=None):
    now = now or utcnow()
    jobs = list(db.scalars(select(ItineraryJob).where(ItineraryJob.state == "running",
        ItineraryJob.lease_until < now).with_for_update(skip_locked=True)).all())
    jobs += db.scalars(select(ItineraryJob).where(ItineraryJob.state == "pending",
        ItineraryJob.deadline_at < now).with_for_update(skip_locked=True)).all()
    for job in jobs:
        job.state, job.failure_code = "failed", "worker_interrupted"
        job.updated_at = job.completed_at = now
        job.lease_until = None
    db.flush()


def cleanup(db: Session, now=None):
    cutoff = (now or utcnow()) - timedelta(days=30)
    db.execute(delete(ItineraryJob).where(ItineraryJob.created_at <= cutoff,
        ItineraryJob.state.in_(["completed", "failed", "cancelled"])))


def _invalid():
    return ValueError("invalid_output")


def validate_result(raw: str, facts: list[PublishedProgramme], preference_revision: int,
                    budget: int | None, needs: str) -> dict:
    """Validate raw model output against current published facts and the hard constraints."""
    if not isinstance(raw, str) or not raw.strip() or len(raw) > 40_000:
        raise _invalid()
    try:
        document = json.loads(raw)
        outcome = document.get("outcome") if isinstance(document, dict) else None
        if outcome == "infeasible":
            value = ModelInfeasible.model_validate_json(raw)
        elif outcome == "feasible":
            value = ModelFeasible.model_validate_json(raw)
        else:
            raise _invalid()
    except (ValueError, ValidationError) as exc:
        raise _invalid() from exc
    if value.outcome == "infeasible":
        if any(not entry.detail.strip() for entry in value.blockingConstraints):
            raise _invalid()
        return {"outcome": "infeasible",
                "blockingConstraints": [entry.model_dump() for entry in value.blockingConstraints]}
    labels = {str(fact.id): f"activity-{index}" for index, fact in enumerate(facts, 1)}
    by_id = {str(fact.id): fact for fact in facts}
    chosen, seen = [], set()
    for item in value.items:
        fact = by_id.get(str(item.itemId))
        if (fact is None or str(item.itemId) in seen or not item.reason.strip()
                or item.startsAt.tzinfo is None or item.endsAt.tzinfo is None
                or item.itemRevision != fact.revision or item.startsAt != fact.startsAt
                or item.endsAt != fact.endsAt):
            raise _invalid()
        seen.add(str(item.itemId))
        chosen.append((fact, item.reason))
    chosen.sort(key=lambda pair: (pair[0].startsAt, pair[0].endsAt, str(pair[0].id)))
    for index, (first, _) in enumerate(chosen):
        for second, _ in chosen[index + 1:]:
            if first.startsAt < second.endsAt and second.startsAt < first.endsAt:
                raise _invalid()
    if budget is not None and sum(fact.priceMinorUnits for fact, _ in chosen) > budget:
        raise _invalid()
    accessible = not needs or all(fact.accessibilityDetails is not None for fact, _ in chosen)
    return {"outcome": "feasible",
        "items": [{"itemId": str(fact.id), "itemRevision": fact.revision, "startsAt": fact.startsAt.isoformat(),
                   "endsAt": fact.endsAt.isoformat(), "reason": reason, "sourceLabel": labels[str(fact.id)]}
                  for fact, reason in chosen],
        "constraintResults": [{"constraint": "overlap", "passed": True}, {"constraint": "budget", "passed": True},
                              {"constraint": "accessibility", "passed": accessible}],
        "preferenceRevision": preference_revision,
        "observedProgrammeRevisions": {str(fact.id): fact.revision for fact, _ in chosen}}
