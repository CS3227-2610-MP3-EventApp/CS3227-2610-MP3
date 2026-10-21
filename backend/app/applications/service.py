"""Submission-owned commands coordinate participation and audit in one transaction."""
from uuid import UUID

from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from app.auth.models import Business, Event, utcnow
from app.auth.schemas import CurrentActor
from app.auth.service import audit
from app.business.models import EventParticipation
from app.business.service import create_participation, replace_participant_type
from app.applications.models import ApplicationSettings, ApplicationDecision, Submission
from app.applications.problems import ApplicationError
from app.applications.schemas import (ApplicationContent, ApplicationEvent, BusinessApplication,
    ApplicationSettings as SettingsProjection, OrganiserEventSummary, Decision)


def owner(actor: CurrentActor, business_id: UUID) -> None:
    if not any(member.businessId == business_id for member in actor.businessMemberships):
        raise ApplicationError("not_found")


def organiser(actor: CurrentActor, event_id: UUID) -> None:
    if not any(member.eventId == event_id for member in actor.eventMemberships):
        raise ApplicationError("forbidden")


def event_lock(db, event_id):
    # Lock the stable parent to serialize first settings upserts with create/submit.
    # This reads Programme facts without changing its metadata or revision.
    event = db.scalar(select(Event).where(Event.id == event_id).with_for_update())
    if event is None:
        raise ApplicationError("not_found")
    return event


def settings(db, event_id):
    return db.scalar(select(ApplicationSettings).where(ApplicationSettings.event_id == event_id)
                     .execution_options(populate_existing=True))


def settings_projection(event_id, record):
    return SettingsProjection(eventId=event_id, applicationsOpen=record.applications_open if record else False,
                              revision=record.revision if record else 1)


def get_settings(db, actor, event_id):
    organiser(actor, event_id)
    return settings_projection(event_id, settings(db, event_id))


def update_settings(db, actor, event_id, body):
    organiser(actor, event_id)
    event_lock(db, event_id)
    record = settings(db, event_id)
    current = settings_projection(event_id, record)
    if body.expectedRevision != current.revision:
        raise ApplicationError("event_revision_conflict")
    if body.applicationsOpen == current.applicationsOpen:
        return current
    if record is None:
        record = ApplicationSettings(event_id=event_id, applications_open=body.applicationsOpen,
                                     revision=current.revision + 1)
        db.add(record)
    else:
        record.applications_open = body.applicationsOpen
        record.revision += 1
    db.flush()
    audit(db, "application_settings_update", actor.id, resource_id=event_id, resource_revision=record.revision)
    db.flush()
    return settings_projection(event_id, record)


def projection(db, submission: Submission, participation: EventParticipation) -> BusinessApplication:
    business = db.get(Business, participation.business_id)
    event = db.get(Event, participation.event_id)
    decision = db.scalar(select(ApplicationDecision).where(ApplicationDecision.submission_id == submission.id))
    return BusinessApplication(id=submission.id, businessId=participation.business_id,
        businessName=business.name, eventId=participation.event_id, eventTitle=event.title,
        participationId=participation.id, status=submission.status,
        revision=submission.revision,
        content=submission.frozen_content if submission.status != "draft" else submission.content,
        frozenSubmittedContentRevision=submission.frozen_submitted_content_revision,
        submittedAt=submission.submitted_at,
        decision=Decision(outcome=decision.outcome, reason=decision.reason, decidedAt=decision.decided_at) if decision else None)


def retired_eligibility(db: Session, actor: CurrentActor, event_id: UUID):
    organiser(actor, event_id)
    raise ApplicationError("eligibility_retired")


def event_projection(event, record, **extra):
    return dict(eventId=event.id, title=event.title, timezone=event.timezone,
        startsAt=event.starts_at, endsAt=event.ends_at, eventRevision=event.revision,
        applicationsOpen=record.applications_open if record else False,
        settingsRevision=record.revision if record else 1, **extra)


def organiser_events(db, actor):
    assigned = [member.eventId for member in actor.eventMemberships]
    return [OrganiserEventSummary(**event_projection(event, record)) for event, record in db.execute(
        select(Event, ApplicationSettings).outerjoin(ApplicationSettings).where(Event.id.in_(assigned)).order_by(Event.id))]


def application_events(db: Session, actor: CurrentActor, business_id: UUID):
    owner(actor, business_id)
    rows = db.execute(select(Event, ApplicationSettings, Submission.id).outerjoin(ApplicationSettings).outerjoin(EventParticipation,
        (EventParticipation.event_id == Event.id) & (EventParticipation.business_id == business_id)
    ).outerjoin(Submission, Submission.participation_id == EventParticipation.id).where(
        or_(ApplicationSettings.applications_open.is_(True), Submission.id.is_not(None))).order_by(Event.id)).all()
    return [ApplicationEvent(**event_projection(event, record, applicationId=application_id))
            for event, record, application_id in rows]


def own_application(db: Session, actor: CurrentActor, application_id: UUID, lock=False):
    owned = [member.businessId for member in actor.businessMemberships]
    statement = select(Submission, EventParticipation).join(EventParticipation).where(
        Submission.id == application_id, EventParticipation.business_id.in_(owned))
    if lock:
        statement = statement.with_for_update(of=Submission).execution_options(populate_existing=True)
    row = db.execute(statement).first()
    if row is None:
        raise ApplicationError("not_found")
    submission, participation = row
    return submission, participation


def list_own(db: Session, actor: CurrentActor, business_id: UUID):
    owner(actor, business_id)
    rows = db.execute(select(Submission, EventParticipation).join(EventParticipation).where(
        EventParticipation.business_id == business_id).order_by(EventParticipation.event_id, Submission.id))
    return [projection(db, submission, participation) for submission, participation in rows]


def create_application(db: Session, actor: CurrentActor, body):
    owner(actor, body.businessId)
    event_lock(db, body.eventId)
    existing = db.scalar(select(Submission.id).join(EventParticipation).where(
        EventParticipation.business_id == body.businessId, EventParticipation.event_id == body.eventId))
    if existing is not None:
        raise ApplicationError("application_exists")
    record = settings(db, body.eventId)
    if record is None or not record.applications_open:
        raise ApplicationError("not_found")
    participation = create_participation(db, body.eventId, body.businessId, body.participantType)
    submission = Submission(participation_id=participation.id,
                            content=ApplicationContent.model_validate(body.model_dump(include=set(ApplicationContent.model_fields))).model_dump())
    db.add(submission)
    db.flush()
    audit(db, "application_create", actor.id, resource_id=submission.id, resource_revision=submission.revision)
    db.flush()
    return projection(db, submission, participation)


def mutate_application(db: Session, actor: CurrentActor, application_id: UUID, body, submit=False):
    submission, participation = own_application(db, actor, application_id, lock=True)
    if submission.status != "draft":
        raise ApplicationError("application_submitted")
    if submission.revision != body.expectedRevision:
        raise ApplicationError("revision_conflict")
    changes = {"revision": submission.revision + 1}
    if submit:
        event_lock(db, participation.event_id)
        record = settings(db, participation.event_id)
        if record is None or not record.applications_open:
            raise ApplicationError("applications_closed")
        changes.update(status="submitted", frozen_content=dict(submission.content),
            frozen_submitted_content_revision=submission.revision, submitted_at=utcnow(),
            submitted_by_user_id=actor.id)
    else:
        changes["content"] = body.model_dump(include=set(ApplicationContent.model_fields))
    result = db.execute(update(Submission).where(Submission.id == submission.id,
        Submission.status == "draft", Submission.revision == body.expectedRevision).values(**changes))
    if result.rowcount != 1:
        raise ApplicationError("revision_conflict")
    if not submit:
        replace_participant_type(db, participation, body.participantType)
    audit(db, "application_submit" if submit else "application_edit", actor.id,
          resource_id=submission.id, resource_revision=body.expectedRevision + 1)
    db.flush()
    return projection(db, submission, participation)


def organiser_applications(db: Session, actor: CurrentActor, event_id: UUID, application_id=None):
    organiser(actor, event_id)
    statement = select(Submission, EventParticipation).join(EventParticipation).where(
        EventParticipation.event_id == event_id, Submission.status != "draft")
    if application_id is not None:
        row = db.execute(statement.where(Submission.id == application_id)).first()
        if row is None:
            raise ApplicationError("not_found")
        return projection(db, *row)
    return [projection(db, *row) for row in db.execute(statement.order_by(EventParticipation.event_id, Submission.id))]


def decide_application(db, actor, event_id, application_id, body):
    organiser(actor, event_id)
    row = db.execute(select(Submission, EventParticipation).join(EventParticipation).where(
        EventParticipation.event_id == event_id, Submission.status != "draft", Submission.id == application_id)
        .with_for_update(of=Submission).execution_options(populate_existing=True)).first()
    if row is None:
        raise ApplicationError("not_found")
    submission, participation = row
    if submission.status != "submitted":
        raise ApplicationError("application_decided", projection(db, submission, participation))
    if submission.revision != body.expectedRevision:
        raise ApplicationError("revision_conflict", projection(db, submission, participation))
    db.add(ApplicationDecision(submission_id=submission.id, outcome=body.outcome, reason=body.reason,
        decided_by_user_id=actor.id, decided_at=utcnow(), expected_record_revision=body.expectedRevision,
        frozen_content_revision=submission.frozen_submitted_content_revision))
    submission.status = body.outcome
    submission.revision += 1
    db.flush()
    audit(db, "application_decide", actor.id, resource_id=submission.id, resource_revision=submission.revision)
    db.flush()
    return projection(db, submission, participation)
