from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.models import AnalysisJob
from app.ai.service import AIError
from app.auth.models import AuditEvent, BusinessMembership, Event, PasswordCredential, User, utcnow
from app.auth.schemas import CurrentActor
from app.business.models import EventParticipation
from app.promotional_concepts.models import PromotionalConcept
from app.promotional_concepts.schemas import CreatePromotionalConcept, PromotionalCreative
from app.settings import Settings
from app.setup.models import ParticipationSetup


FACT_FIELDS = {
    "event.title": ("event", "title"),
    "event.startsAt": ("event", "startsAt"),
    "event.endsAt": ("event", "endsAt"),
    "event.timezone": ("event", "timezone"),
    "setup.boothLabel": ("setup", "boothLabel"),
    "setup.setupInstructions": ("setup", "setupInstructions"),
}


def _actor_and_participation(db: Session, actor: CurrentActor, participation_id, *, lock_sources=False):
    user = db.scalar(select(User).where(User.id == actor.id).with_for_update().execution_options(populate_existing=True))
    credential = db.scalar(select(PasswordCredential).where(
        PasswordCredential.user_id == actor.id).with_for_update().execution_options(populate_existing=True))
    if user is None or credential is None or user.role != "business" or actor.role != "business":
        raise AIError("forbidden")
    if credential.must_change_password or actor.mustChangePassword:
        raise AIError("password_change_required")
    event_id = db.scalar(select(EventParticipation.event_id).where(
        EventParticipation.id == participation_id))
    if event_id is None:
        raise AIError("not_found")
    event_query = select(Event).where(Event.id == event_id)
    if lock_sources:
        event_query = event_query.with_for_update().execution_options(populate_existing=True)
    event = db.scalar(event_query)
    participation_query = select(EventParticipation).where(EventParticipation.id == participation_id)
    if lock_sources:
        participation_query = participation_query.with_for_update().execution_options(populate_existing=True)
    participation = db.scalar(participation_query)
    if event is None or participation is None or participation.event_id != event_id:
        raise AIError("not_found")
    membership = db.scalar(select(BusinessMembership.id).where(
        BusinessMembership.user_id == actor.id,
        BusinessMembership.business_id == participation.business_id,
        BusinessMembership.membership_role == "owner",
        BusinessMembership.status == "active").with_for_update())
    if membership is None:
        raise AIError("not_found")
    setup_query = select(ParticipationSetup).where(ParticipationSetup.participation_id == participation_id)
    if lock_sources:
        setup_query = setup_query.execution_options(populate_existing=True)
    setup = db.scalar(setup_query)
    return event, participation, setup


def _source(event, setup):
    published = setup is not None and setup.published_at is not None
    revisions = {"event": event.revision,
                 "setup": setup.published_revision if published else None}
    values = {
        "event.title": event.title,
        "event.startsAt": event.starts_at.isoformat().replace("+00:00", "Z"),
        "event.endsAt": event.ends_at.isoformat().replace("+00:00", "Z"),
        "event.timezone": event.timezone,
        "setup.boothLabel": setup.published_booth_label if published else None,
        "setup.setupInstructions": setup.published_setup_instructions if published else None,
    }
    return revisions, values


def _capture_selected(fields, revisions, values):
    selected = []
    for field in fields:
        group, _ = FACT_FIELDS[field]
        value = values[field]
        revision = revisions[group]
        if revision is None or value is None:
            raise AIError("validation_error")
        selected.append({"field": field, "value": value, "observedRevision": revision})
    return selected


def check_job_context(db: Session, job: AnalysisJob, *, lock_sources=False):
    try:
        event, participation, setup = _actor_and_participation(
            db, SimpleNamespace(id=job.owner_id, role="business", mustChangePassword=False),
            job.business_participation_id, lock_sources=lock_sources)
    except AIError as exc:
        return ("access_revoked" if exc.code in {"forbidden", "not_found", "password_change_required"}
                else "source_changed"), None
    if event.id != job.event_id:
        return "source_changed", None
    revisions, values = _source(event, setup)
    snapshot = job.source_snapshot or {}
    if revisions != snapshot.get("sourceRevisions"):
        return "source_changed", None
    try:
        selected = _capture_selected(snapshot.get("factFields", []), revisions, values)
    except AIError:
        return "source_changed", None
    if selected != snapshot.get("sourceFacts"):
        return "source_changed", None
    return None, snapshot


def _assert_live_enabled(event_id, body):
    try:
        settings = Settings()
        allowed = settings.allowed_event_ids
    except ValueError:
        raise AIError("provider_unavailable") from None
    if (settings.environment == "production" or not settings.ai_enabled
            or not (settings.ai_synthetic_only or settings.ai_real_data_enabled)
            or not settings.soclaas_api_key or not settings.soclaas_model
            or event_id not in allowed):
        raise AIError("provider_unavailable")
    if body.dataSharingConfirmed is not True:
        raise AIError("validation_error")


def _normalized(body):
    return {"expectedEventRevision": body.expectedEventRevision,
            "expectedSetupRevision": body.expectedSetupRevision,
            "brief": body.brief, "factFields": body.factFields,
            "dataSharingConfirmed": True}


def create_job(db: Session, actor: CurrentActor, participation_id, body: CreatePromotionalConcept):
    user = db.scalar(select(User).where(User.id == actor.id).with_for_update().execution_options(populate_existing=True))
    if user is None or user.role != "business" or actor.role != "business":
        raise AIError("forbidden")
    if actor.mustChangePassword:
        raise AIError("password_change_required")
    _actor_and_participation(db, actor, participation_id)
    normalized = _normalized(body)
    previous = db.scalar(select(AnalysisJob).where(
        AnalysisJob.owner_id == actor.id, AnalysisJob.workflow == "promotional",
        AnalysisJob.request_id == body.requestId))
    if previous is not None:
        prior = (previous.source_snapshot or {}).get("request")
        if previous.workflow != "promotional" or previous.business_participation_id != participation_id or prior != normalized:
            raise AIError("request_conflict")
        return previous
    event, participation, setup = _actor_and_participation(db, actor, participation_id, lock_sources=True)
    revisions, values = _source(event, setup)
    if body.expectedEventRevision != revisions["event"] or body.expectedSetupRevision != revisions["setup"]:
        raise AIError("source_changed")
    selected = _capture_selected(body.factFields, revisions, values)
    _assert_live_enabled(event.id, body)
    active = db.scalar(select(AnalysisJob.id).where(
        AnalysisJob.owner_id == actor.id, AnalysisJob.state.in_(["pending", "running"])).limit(1))
    if active is not None:
        raise AIError("active_job")
    now = utcnow()
    day_start = datetime.combine(now.date(), datetime.min.time(), tzinfo=timezone.utc)
    count = db.scalar(select(func.count()).select_from(AnalysisJob).where(
        AnalysisJob.owner_id == actor.id, AnalysisJob.created_at >= day_start)) or 0
    if count >= 10:
        raise AIError("quota_exceeded")
    snapshot = {"request": normalized, "sourceRevisions": revisions,
                "factFields": list(body.factFields), "sourceFacts": selected,
                "brief": body.brief}
    job = AnalysisJob(owner_id=actor.id, event_id=event.id,
        business_participation_id=participation.id, workflow="promotional",
        source_snapshot=snapshot, application_id=None, request_id=body.requestId,
        source_revision=None, rubric_revision=None, comparison_revisions=[], state="pending",
        failure_code=None, provider_may_have_run=False, created_at=now, updated_at=now,
        deadline_at=now + timedelta(seconds=180))
    db.add(job)
    db.flush()
    db.add(AuditEvent(user_id=actor.id, action="promotional_concept_job_create",
        resource_id=job.id, resource_revision=event.revision, outcome="success"))
    return job


def _owned_concept(db, actor, concept_id, *, lock=False):
    query = select(PromotionalConcept).where(
        PromotionalConcept.id == concept_id, PromotionalConcept.owner_id == actor.id)
    if lock:
        query = query.with_for_update()
    concept = db.scalar(query)
    if concept is None:
        raise AIError("not_found")
    event, participation, setup = _actor_and_participation(
        db, actor, concept.participation_id)
    if participation.id != concept.participation_id:
        raise AIError("not_found")
    return concept, event, setup


def _project_facts(concept, event, setup):
    revisions, values = _source(event, setup)
    projected = []
    for observed in concept.source_facts:
        field = observed["field"]
        group, _ = FACT_FIELDS[field]
        current_revision = revisions[group]
        value = values[field]
        if current_revision is None or value is None:
            projected.append({"field": field, "value": None,
                "observedRevision": observed["observedRevision"],
                "currentRevision": None, "status": "unavailable"})
        elif current_revision == observed["observedRevision"]:
            projected.append({"field": field, "value": value,
                "observedRevision": observed["observedRevision"],
                "currentRevision": current_revision, "status": "current"})
        else:
            projected.append({"field": field, "value": value,
                "observedRevision": observed["observedRevision"],
                "currentRevision": current_revision, "status": "stale"})
    return projected


def concept_view(concept, event=None, setup=None, db=None):
    if event is None or db is None:
        raise ValueError("Authorized source context is required")
    from app.promotional_concepts.schemas import PromotionalConceptView
    return PromotionalConceptView(id=concept.id, participationId=concept.participation_id,
        revision=concept.revision, sourceRevisions=concept.source_revisions,
        factFields=concept.fact_fields, sourceFacts=_project_facts(concept, event, setup),
        posterCopySuggestions=concept.poster_copy_suggestions,
        freebieConcepts=concept.freebie_concepts, layoutBrief=concept.layout_brief,
        createdAt=concept.created_at, updatedAt=concept.updated_at)


def create_persisted_concept(db, job, payload):
    snapshot = job.source_snapshot
    now = utcnow()
    concept = PromotionalConcept(id=uuid4(), job_id=job.id, owner_id=job.owner_id,
        participation_id=job.business_participation_id, revision=1,
        source_revisions=snapshot["sourceRevisions"], fact_fields=snapshot["factFields"],
        source_facts=snapshot["sourceFacts"],
        poster_copy_suggestions=payload["posterCopySuggestions"],
        freebie_concepts=payload["freebieConcepts"], layout_brief=payload["layoutBrief"],
        created_at=now, updated_at=now)
    db.add(concept)
    db.flush()
    return concept


def get_concept_for_job(db, job):
    if job.workflow != "promotional" or job.state != "completed":
        return None
    concept = db.scalar(select(PromotionalConcept).where(PromotionalConcept.job_id == job.id))
    if concept is None:
        return None
    try:
        _, event, setup = _owned_concept_by_job(db, job, concept)
    except AIError:
        return None
    return concept_view(concept, event, setup, db)


def _owned_concept_by_job(db, job, concept):
    actor = SimpleNamespace(id=job.owner_id, role="business", mustChangePassword=False)
    event, participation, setup = _actor_and_participation(db, actor, concept.participation_id)
    if event.id != job.event_id or participation.event_id != event.id:
        raise AIError("not_found")
    return actor, event, setup


def history(db, actor, participation_id, limit=20, offset=0):
    _actor_and_participation(db, actor, participation_id)
    base = select(PromotionalConcept).where(
        PromotionalConcept.owner_id == actor.id,
        PromotionalConcept.participation_id == participation_id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    concepts = db.scalars(base.order_by(
        PromotionalConcept.created_at.desc(), PromotionalConcept.id.desc()).limit(limit).offset(offset)).all()
    items = []
    for concept in concepts:
        _, event, setup = _owned_concept(db, actor, concept.id)
        items.append(concept_view(concept, event, setup, db))
    latest = db.scalar(select(AnalysisJob).where(
        AnalysisJob.owner_id == actor.id, AnalysisJob.workflow == "promotional",
        AnalysisJob.business_participation_id == participation_id).order_by(
        AnalysisJob.created_at.desc(), AnalysisJob.id.desc()).limit(1))
    from app.ai.service import job_view
    from app.promotional_concepts.schemas import PromotionalConceptHistory
    return PromotionalConceptHistory(items=items, total=total, limit=limit, offset=offset,
        latestJob=job_view(db, latest) if latest else None)


def get_concept(db, actor, concept_id):
    concept, event, setup = _owned_concept(db, actor, concept_id)
    return concept_view(concept, event, setup, db)


def replace_concept(db, actor, concept_id, body):
    concept, event, setup = _owned_concept(db, actor, concept_id, lock=True)
    if concept.revision != body.expectedRevision:
        raise AIError("revision_conflict")
    concept.revision += 1
    concept.poster_copy_suggestions = body.posterCopySuggestions
    concept.freebie_concepts = [item.model_dump(mode="json", by_alias=True) for item in body.freebieConcepts]
    concept.layout_brief = body.layoutBrief
    concept.updated_at = utcnow()
    db.add(AuditEvent(user_id=actor.id, action="promotional_concept_edit",
        resource_id=concept.id, resource_revision=concept.revision, outcome="success"))
    db.flush()
    return concept_view(concept, event, setup, db)


def refresh_facts(db, actor, concept_id, body):
    concept, _, _ = _owned_concept(db, actor, concept_id, lock=True)
    if concept.revision != body.expectedRevision:
        raise AIError("revision_conflict")
    event, participation, setup = _actor_and_participation(
        db, actor, concept.participation_id, lock_sources=True)
    revisions, values = _source(event, setup)
    if body.expectedEventRevision != revisions["event"] or body.expectedSetupRevision != revisions["setup"]:
        raise AIError("source_changed")
    selected = _capture_selected(body.factFields, revisions, values)
    concept.revision += 1
    concept.source_revisions = revisions
    concept.fact_fields = list(body.factFields)
    concept.source_facts = selected
    concept.updated_at = utcnow()
    db.add(AuditEvent(user_id=actor.id, action="promotional_concept_refresh_facts",
        resource_id=concept.id, resource_revision=concept.revision, outcome="success"))
    db.flush()
    return concept_view(concept, event, setup, db)


def delete_concept(db, actor, concept_id, expected_revision):
    concept, _, _ = _owned_concept(db, actor, concept_id, lock=True)
    if concept.revision != expected_revision:
        raise AIError("revision_conflict")
    db.add(AuditEvent(user_id=actor.id, action="promotional_concept_delete",
        resource_id=concept.id, resource_revision=concept.revision, outcome="success"))
    db.delete(concept)
    db.flush()


def validate_generated(raw):
    from app.promotional_concepts.schemas import PromotionalCreative
    if not isinstance(raw, str) or len(raw) > 40_000:
        raise ValueError("invalid_output")
    try:
        value = PromotionalCreative.model_validate_json(raw)
    except Exception as exc:
        raise ValueError("invalid_output") from exc
    return value.model_dump(mode="json", by_alias=True)


def record_rejected_mutation(actor, action, resource_id, expected_revision, outcome):
    """Write a minimal audit event after the failed request transaction rolls back."""
    from app.database import SessionLocal
    try:
        with SessionLocal.begin() as db:
            db.add(AuditEvent(user_id=actor.id, action=action, resource_id=resource_id,
                resource_revision=expected_revision, outcome=outcome))
    except Exception:
        # Audit failure must not replace the original authorization/conflict response.
        return
