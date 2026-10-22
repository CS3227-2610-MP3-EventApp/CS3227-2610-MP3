from datetime import datetime, timedelta, timezone
import re
import unicodedata
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.ai.models import AnalysisJob, AnalysisReport, AnalysisRubricVersion
from pydantic import ValidationError

from app.ai.schemas import AnalysisHistory, AnalysisJob as JobView, AnalysisPayload, AnalysisReport as ReportView
from app.applications.models import Submission
from app.auth.models import AuditEvent, BusinessMembership, Event, EventMembership, PasswordCredential, User, utcnow
from app.business.models import EventParticipation
from app.settings import Settings


class AIError(Exception):
    def __init__(self, code: str):
        self.code = code


STARTERS = [
    {"id": "event-relevance", "title": "Event relevance", "instructions": "Assess relevance to the explicit event requirements in the rubric. Return insufficient_evidence when they are not provided."},
    {"id": "proposal-clarity", "title": "Proposal clarity and completeness", "instructions": "Assess how clearly and completely the proposal describes its offering."},
    {"id": "distinctiveness", "title": "Distinctiveness", "instructions": "Assess what distinguishes this proposal, using only submitted evidence."},
]


def lock_authority(db: Session, owner_id: UUID, event_id: UUID) -> bool:
    row = db.execute(select(User, PasswordCredential, EventMembership).join(
        PasswordCredential, PasswordCredential.user_id == User.id).join(
        EventMembership, EventMembership.user_id == User.id).where(
        User.id == owner_id, User.role == "organiser", PasswordCredential.must_change_password.is_(False),
        EventMembership.event_id == event_id, EventMembership.role == "organiser",
        EventMembership.status == "active").with_for_update(of=(User, PasswordCredential, EventMembership))).first()
    return row is not None


def require_authority(db: Session, owner_id: UUID, event_id: UUID):
    if not lock_authority(db, owner_id, event_id):
        raise AIError("forbidden")


def _latest_rubric(db, event_id):
    return db.scalar(select(AnalysisRubricVersion).where(
        AnalysisRubricVersion.event_id == event_id).order_by(AnalysisRubricVersion.revision.desc()).limit(1))


def get_rubric(db: Session, owner, event_id: UUID, revision: int | None = None):
    require_authority(db, owner.id, event_id)
    record = (db.scalar(select(AnalysisRubricVersion).where(
        AnalysisRubricVersion.event_id == event_id, AnalysisRubricVersion.revision == revision))
        if revision is not None else _latest_rubric(db, event_id))
    if revision is not None and record is None:
        raise AIError("not_found")
    return {"eventId": event_id, "revision": record.revision if record else 0,
            "criteria": record.criteria if record else STARTERS}


def save_rubric(db: Session, owner, event_id: UUID, body):
    require_authority(db, owner.id, event_id)
    event = db.scalar(select(Event).where(Event.id == event_id).with_for_update())
    if event is None:
        raise AIError("not_found")
    latest = _latest_rubric(db, event_id)
    current = latest.revision if latest else 0
    if current != body.expectedRevision:
        raise AIError("revision_conflict")
    revision = current + 1
    record = AnalysisRubricVersion(event_id=event_id, revision=revision,
                                   criteria=[criterion.model_dump() for criterion in body.criteria])
    db.add(record)
    db.add(AuditEvent(user_id=owner.id, action="analysis_rubric_update", resource_id=event_id,
                      resource_revision=revision, outcome="success"))
    db.flush()
    return {"eventId": event_id, "revision": revision, "criteria": record.criteria}


def _tokens(value):
    normalized = unicodedata.normalize("NFKC", value).lower()
    return set(re.findall(r"[^\W_]+", normalized, flags=re.UNICODE))


def _similarity(left, right):
    a, b = _tokens(left), _tokens(right)
    return len(a & b) / len(a | b) if a and b else 0.0


def _target(db, event_id, application_id, *, lock=False):
    query = select(Submission, EventParticipation).join(
        EventParticipation, Submission.participation_id == EventParticipation.id).where(
        Submission.id == application_id, EventParticipation.event_id == event_id,
        Submission.status.in_(["submitted", "accepted", "rejected"]),
        Submission.frozen_content.is_not(None), Submission.frozen_submitted_content_revision.is_not(None))
    if lock:
        query = query.with_for_update(of=Submission)
    return db.execute(query).first()


def _compare(db, event_id, target_id, target_description):
    rows = db.execute(select(Submission, EventParticipation).join(
        EventParticipation, Submission.participation_id == EventParticipation.id).where(
        EventParticipation.event_id == event_id, Submission.id != target_id,
        Submission.status.in_(["submitted", "accepted", "rejected"]),
        Submission.frozen_content.is_not(None), Submission.frozen_submitted_content_revision.is_not(None))).all()
    candidates = []
    for submission, _ in rows:
        content = submission.frozen_content
        score = _similarity(target_description, content["description"])
        if score >= .50:
            candidates.append((score, str(submission.id).lower(), submission, content))
    candidates.sort(key=lambda row: (-row[0], row[1]))
    selected = []
    for index, (score, _, submission, content) in enumerate(candidates[:5], 1):
        selected.append({"applicationId": str(submission.id),
                         "sourceRevision": submission.frozen_submitted_content_revision,
                         "sourceLabel": f"comparison-{index}", "similarity": score,
                         "participantType": content["participantType"], "description": content["description"]})
    return selected


def validate_report(raw: str, criteria: list[dict], sources: dict[str, dict]) -> dict:
    if not isinstance(raw, str) or len(raw) > 40_000:
        raise ValueError("invalid_output")
    try:
        value = AnalysisPayload.model_validate_json(raw)
    except (ValidationError, ValueError) as exc:
        raise ValueError("invalid_output") from exc
    expected = [item["id"] for item in criteria]
    actual = [item.criterionId for item in value.findings]
    if len(actual) != len(set(actual)) or set(actual) != set(expected) or len(actual) != len(expected):
        raise ValueError("invalid_output")
    for finding in value.findings:
        if finding.status in {"supported", "concern"} and not finding.evidence:
            raise ValueError("invalid_output")
        for evidence in finding.evidence:
            source = sources.get(evidence.sourceLabel)
            if source is None or evidence.quote not in source.get(evidence.field, ""):
                raise ValueError("invalid_output")
    for flag in value.duplicateFlags:
        if flag.sourceLabel == "target" or flag.sourceLabel not in sources:
            raise ValueError("invalid_output")
        grounded_in_flagged_source = False
        for evidence in flag.evidence:
            source = sources.get(evidence.sourceLabel)
            if source is None or evidence.quote not in source.get(evidence.field, ""):
                raise ValueError("invalid_output")
            grounded_in_flagged_source |= evidence.sourceLabel == flag.sourceLabel
        if not grounded_in_flagged_source:
            raise ValueError("invalid_output")
    return value.model_dump()


def create_job(db: Session, owner, event_id: UUID, application_id: UUID, body):
    require_authority(db, owner.id, event_id)
    # A stable user lock serializes idempotency, active-job and daily-quota checks.
    user = db.scalar(select(User).where(User.id == owner.id).with_for_update())
    if user is None:
        raise AIError("forbidden")
    if not lock_authority(db, owner.id, event_id):
        raise AIError("forbidden")
    previous = db.scalar(select(AnalysisJob).where(
        AnalysisJob.owner_id == owner.id, AnalysisJob.workflow == "analysis",
        AnalysisJob.request_id == body.requestId))
    if previous is None:
        previous = db.scalar(select(AnalysisJob).where(
            AnalysisJob.owner_id == owner.id, AnalysisJob.request_id == body.requestId).limit(1))
        if previous is not None:
            raise AIError("revision_conflict")
    if previous:
        if (previous.event_id, previous.application_id, previous.rubric_revision, previous.source_revision) != (
                event_id, application_id, body.expectedRubricRevision, body.expectedSubmittedRevision):
            raise AIError("revision_conflict")
        return previous
    target = _target(db, event_id, application_id)
    if target is None:
        raise AIError("not_found")
    submission, _ = target
    latest = _latest_rubric(db, event_id)
    if latest is None or latest.revision != body.expectedRubricRevision or submission.frozen_submitted_content_revision != body.expectedSubmittedRevision:
        raise AIError("revision_conflict")
    settings = Settings()
    if (not settings.ai_enabled or not (settings.ai_synthetic_only or settings.ai_real_data_enabled)
            or settings.environment == "production" or not settings.soclaas_api_key
            or not settings.soclaas_model or event_id not in settings.allowed_event_ids
            or (body.syntheticDataConfirmed is not True and body.dataSharingConfirmed is not True)):
        raise AIError("service_unavailable")
    active = db.scalar(select(AnalysisJob.id).where(AnalysisJob.owner_id == owner.id,
        AnalysisJob.state.in_(["pending", "running"])).limit(1))
    if active:
        raise AIError("active_job")
    now = utcnow()
    day_start = datetime.combine(now.date(), datetime.min.time(), tzinfo=timezone.utc)
    count = db.scalar(select(func.count()).select_from(AnalysisJob).where(
        AnalysisJob.owner_id == owner.id, AnalysisJob.created_at >= day_start)) or 0
    if count >= 10:
        raise AIError("daily_limit")
    comparisons = _compare(db, event_id, application_id, submission.frozen_content["description"])
    revision_records = [{key: item[key] for key in ("applicationId", "sourceRevision", "sourceLabel", "similarity")}
                        for item in comparisons]
    job = AnalysisJob(owner_id=owner.id, event_id=event_id, application_id=application_id,
        request_id=body.requestId, source_revision=submission.frozen_submitted_content_revision,
        rubric_revision=latest.revision, comparison_revisions=revision_records, state="pending",
        failure_code=None, provider_may_have_run=False, created_at=now, updated_at=now,
        deadline_at=now + timedelta(seconds=180))
    db.add(job)
    db.flush()
    db.add(AuditEvent(user_id=owner.id, action="analysis_job_create", resource_id=job.id,
                      resource_revision=job.source_revision, outcome="success"))
    return job


def _report_view(db, report):
    job = db.get(AnalysisJob, report.job_id)
    current = _latest_rubric(db, job.event_id)
    target = _target(db, job.event_id, job.application_id)
    stale = (current is None or current.revision != report.rubric_revision or target is None
             or target[0].frozen_submitted_content_revision != report.source_revision)
    return ReportView(id=report.id, createdAt=report.created_at, sourceRevision=report.source_revision,
        rubricRevision=report.rubric_revision, comparisonRevisions=report.comparison_revisions,
        stale=stale, payload=report.payload)


def job_view(db, job):
    if job.workflow == "preparation":
        from app.preparation_drafts.schemas import BusinessPreparationJob
        from app.preparation_drafts.service import get_draft_for_job
        return BusinessPreparationJob(id=job.id, eventId=job.event_id, participationId=job.business_participation_id, state=job.state, createdAt=job.created_at, updatedAt=job.updated_at, completedAt=job.completed_at, failureCode=job.failure_code, providerMayHaveRun=job.provider_may_have_run, draft=get_draft_for_job(db, job))
    if job.workflow == "promotional":
        from app.promotional_concepts.schemas import BusinessPromotionalConceptJob
        from app.promotional_concepts.service import get_concept_for_job
        return BusinessPromotionalConceptJob(id=job.id, eventId=job.event_id,
            participationId=job.business_participation_id, state=job.state,
            createdAt=job.created_at, updatedAt=job.updated_at, completedAt=job.completed_at,
            failureCode=job.failure_code, providerMayHaveRun=job.provider_may_have_run,
            concept=get_concept_for_job(db, job))
    # A newer report must not be paired with an older in-memory running state.
    report = db.scalar(select(AnalysisReport).where(AnalysisReport.job_id == job.id)) if job.state == "completed" else None
    return JobView(id=job.id, eventId=job.event_id, applicationId=job.application_id,
        state=job.state, createdAt=job.created_at, updatedAt=job.updated_at,
        completedAt=job.completed_at, failureCode=job.failure_code,
        providerMayHaveRun=job.provider_may_have_run,
        report=_report_view(db, report) if report else None)


def get_job(db, owner, job_id):
    if owner.role == "attendee":
        raise AIError("forbidden")
    job = db.scalar(select(AnalysisJob).where(AnalysisJob.id == job_id, AnalysisJob.owner_id == owner.id))
    if job is None:
        raise AIError("not_found")
    if job.workflow == "preparation":
        return _business_job(db, owner, job)
    if job.workflow == "promotional":
        return _promotional_job(db, owner, job)
    if job.workflow != "analysis" or owner.role != "organiser":
        raise AIError("not_found")
    require_authority(db, owner.id, job.event_id)
    return job_view(db, job)


def cancel_job(db, owner, job_id):
    if owner.role == "attendee":
        raise AIError("forbidden")
    job = db.scalar(select(AnalysisJob).where(AnalysisJob.id == job_id,
        AnalysisJob.owner_id == owner.id).with_for_update())
    if job is None:
        raise AIError("not_found")
    if job.workflow == "preparation":
        return _cancel_business_job(db, owner, job)
    if job.workflow == "promotional":
        return _cancel_promotional_job(db, owner, job)
    if job.workflow != "analysis" or owner.role != "organiser":
        raise AIError("not_found")
    require_authority(db, owner.id, job.event_id)
    if job.state in {"pending", "running"}:
        job.state = "cancelled"
        job.updated_at = utcnow()
        job.completed_at = job.updated_at
        job.provider_may_have_run = job.dispatch_at is not None
        db.add(AuditEvent(user_id=owner.id, action="analysis_job_cancel", resource_id=job.id,
                          resource_revision=job.source_revision, outcome="success"))
    db.flush()
    return job_view(db, job)


def _business_job(db, actor, job):
    from app.preparation_drafts.service import get_draft_for_job
    from app.preparation_drafts.schemas import BusinessPreparationJob

    if actor.mustChangePassword:
        raise AIError("password_change_required")
    participation = db.get(EventParticipation, job.business_participation_id)
    if participation is None or participation.event_id != job.event_id:
        raise AIError("not_found")
    has_workspace = db.scalar(select(BusinessMembership.id).where(
        BusinessMembership.user_id == actor.id,
        BusinessMembership.membership_role == "owner",
        BusinessMembership.status == "active").limit(1))
    if not has_workspace:
        raise AIError("forbidden")
    membership = db.scalar(select(BusinessMembership.id).where(
        BusinessMembership.user_id == actor.id,
        BusinessMembership.business_id == participation.business_id,
        BusinessMembership.membership_role == "owner",
        BusinessMembership.status == "active"))
    if actor.role != "business" or membership is None:
        raise AIError("not_found")
    return BusinessPreparationJob(id=job.id, eventId=job.event_id,
        participationId=participation.id, state=job.state, createdAt=job.created_at,
        updatedAt=job.updated_at, completedAt=job.completed_at,
        failureCode=job.failure_code, providerMayHaveRun=job.provider_may_have_run,
        draft=get_draft_for_job(db, job))


def _cancel_business_job(db, actor, job):
    # The job row is already locked by cancel_job; membership is rechecked in
    # this transaction before any state or audit mutation.
    view = _business_job(db, actor, job)
    if job.state in {"pending", "running"}:
        now = utcnow()
        job.state = "cancelled"
        job.updated_at = now
        job.completed_at = now
        job.provider_may_have_run = job.dispatch_at is not None
        db.add(AuditEvent(user_id=actor.id, action="preparation_job_cancel",
            resource_id=job.id, resource_revision=None, outcome="success"))
        db.flush()
        return _business_job(db, actor, job)
    return view


def _promotional_job(db, actor, job):
    from app.promotional_concepts.schemas import BusinessPromotionalConceptJob
    from app.promotional_concepts.service import _actor_and_participation, get_concept_for_job
    if actor.role != "business":
        raise AIError("not_found")
    if actor.mustChangePassword:
        raise AIError("password_change_required")
    event, participation, _ = _actor_and_participation(db, actor, job.business_participation_id)
    if event.id != job.event_id or participation.event_id != event.id:
        raise AIError("not_found")
    return BusinessPromotionalConceptJob(id=job.id, eventId=job.event_id,
        participationId=participation.id, state=job.state, createdAt=job.created_at,
        updatedAt=job.updated_at, completedAt=job.completed_at, failureCode=job.failure_code,
        providerMayHaveRun=job.provider_may_have_run, concept=get_concept_for_job(db, job))


def _cancel_promotional_job(db, actor, job):
    view = _promotional_job(db, actor, job)
    if job.state in {"pending", "running"}:
        now = utcnow()
        job.state = "cancelled"
        job.failure_code = "cancelled"
        job.updated_at = now
        job.completed_at = now
        job.provider_may_have_run = job.dispatch_at is not None
        db.add(AuditEvent(user_id=actor.id, action="promotional_concept_job_cancel",
            resource_id=job.id, resource_revision=None, outcome="success"))
        db.flush()
        return _promotional_job(db, actor, job)
    return view


def history(db, owner, event_id, application_id, limit=20, offset=0):
    require_authority(db, owner.id, event_id)
    if _target(db, event_id, application_id) is None:
        raise AIError("not_found")
    jobs = select(AnalysisJob).where(AnalysisJob.owner_id == owner.id,
        AnalysisJob.event_id == event_id, AnalysisJob.application_id == application_id)
    latest_job = db.scalar(jobs.order_by(AnalysisJob.created_at.desc(), AnalysisJob.id.desc()).limit(1))
    report_filter = select(AnalysisReport).join(AnalysisJob).where(
        AnalysisJob.owner_id == owner.id, AnalysisJob.event_id == event_id,
        AnalysisJob.application_id == application_id)
    total = db.scalar(select(func.count()).select_from(report_filter.subquery())) or 0
    reports = db.scalars(report_filter.order_by(
        AnalysisReport.created_at.desc(), AnalysisReport.id.desc()).limit(limit).offset(offset)).all()
    return AnalysisHistory(items=[_report_view(db, report) for report in reports], total=total,
        limit=limit, offset=offset, latestJob=job_view(db, latest_job) if latest_job else None)


def recovery(db, now=None):
    now = now or utcnow()
    jobs = db.scalars(select(AnalysisJob).where(AnalysisJob.state == "running",
        AnalysisJob.lease_until < now).with_for_update(skip_locked=True)).all()
    for job in jobs:
        job.state = "failed"
        job.failure_code = "timed_out" if job.workflow == "promotional" else "worker_interrupted"
        job.updated_at = now
        job.completed_at = now
        job.lease_until = None
        if job.workflow == "promotional":
            db.add(AuditEvent(user_id=job.owner_id, action="promotional_concept_job_failure",
                resource_id=job.id, resource_revision=None, outcome="failure"))
    overdue = db.scalars(select(AnalysisJob).where(AnalysisJob.state == "pending",
        AnalysisJob.deadline_at < now).with_for_update(skip_locked=True)).all()
    for job in overdue:
        job.state = "failed"
        job.failure_code = "timed_out" if job.workflow == "promotional" else "worker_interrupted"
        job.updated_at = now
        job.completed_at = now
        job.lease_until = None
        if job.workflow == "promotional":
            db.add(AuditEvent(user_id=job.owner_id, action="promotional_concept_job_failure",
                resource_id=job.id, resource_revision=None, outcome="failure"))
    db.flush()


def cleanup(db, now=None):
    cutoff = (now or utcnow()) - timedelta(days=30)
    db.execute(text("DELETE FROM ai_jobs WHERE created_at <= :cutoff AND state IN ('completed','failed','cancelled')"),
               {"cutoff": cutoff})


def problem_response(request, code):
    from http import HTTPStatus
    from fastapi.responses import JSONResponse

    mapping = {
        "source_changed": (409, "Source facts changed. Review or regenerate the draft."),
        "already_adopted": (409, "This draft has already been adopted."),
        "request_conflict": (409, "Request identifier already used for different inputs."),
        "quota_exceeded": (429, "The daily job limit has been reached."),
        "forbidden": (403, "Access is not permitted."), "not_found": (404, "Resource not found."),
        "revision_conflict": (409, "The analysis inputs changed."), "active_job": (409, "An analysis is already active."),
        "daily_limit": (429, "The daily analysis limit has been reached."),
        "validation_error": (422, "Request validation failed."),
        "password_change_required": (403, "Password change is required."),
        "service_unavailable": (503, "AI analysis is not available for this event."),
        "provider_unavailable": (503, "AI generation is not available for this event."),
        "provider_rate_limited": (503, "AI generation is temporarily rate limited."),
        "provider_auth_failed": (503, "AI generation is not available for this event."),
        "timed_out": (503, "AI generation timed out. You can continue editing saved concepts."),
        "job_timeout": (503, "AI generation timed out. You can continue editing saved concepts."),
        "invalid_output": (503, "AI returned an unusable result. No concept was saved."),
        "cancelled": (409, "The job was cancelled."),
        "access_revoked": (403, "Access is no longer permitted."),
    }
    status, detail = mapping.get(code, mapping["service_unavailable"])
    body = {"type": "about:blank", "title": HTTPStatus(status).phrase, "status": status,
            "detail": detail, "instance": request.url.path, "code": code}
    return JSONResponse(status_code=status, media_type="application/problem+json",
                        headers={"Cache-Control": "no-store"}, content=body)
