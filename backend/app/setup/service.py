from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.applications.models import Submission
from app.auth.models import AuditEvent, BusinessMembership, utcnow
from app.auth.schemas import CurrentActor
from app.business.models import EventParticipation
from app.setup.models import ParticipationSetup
from app.setup.problems import SetupError
from app.setup.schemas import SaveSetup


def _setup_projection(participation: EventParticipation, record: ParticipationSetup | None):
    return {"participationId": participation.id, "eventId": participation.event_id,
            "revision": record.revision if record else 1,
            "boothLabel": record.booth_label if record else None,
            "setupInstructions": record.setup_instructions if record else None,
            "updatedAt": record.updated_at if record else None}


def _assigned_accepted(db: Session, actor: CurrentActor, event_id: UUID,
                       participation_id: UUID, *, lock=False) -> EventParticipation:
    # Route dependency establishes current event authority before this target lookup.
    query = select(EventParticipation).join(Submission, Submission.participation_id == EventParticipation.id).where(
        EventParticipation.id == participation_id,
        EventParticipation.event_id == event_id,
        Submission.status == "accepted")
    if lock:
        query = query.with_for_update(of=EventParticipation)
    participation = db.scalar(query)
    if participation is None:
        raise SetupError("not_found")
    return participation


def get_organiser_setup(db: Session, actor: CurrentActor, event_id: UUID, participation_id: UUID):
    participation = _assigned_accepted(db, actor, event_id, participation_id)
    record = db.get(ParticipationSetup, participation.id)
    return _setup_projection(participation, record)


def save_organiser_setup(db: Session, actor: CurrentActor, event_id: UUID,
                         participation_id: UUID, body: SaveSetup):
    participation = _assigned_accepted(db, actor, event_id, participation_id, lock=True)
    record = db.get(ParticipationSetup, participation.id)
    current_revision = record.revision if record else 1
    if body.expectedRevision != current_revision:
        raise SetupError("revision_conflict", current_revision=current_revision)
    next_revision = current_revision + 1
    if record is None:
        record = ParticipationSetup(participation_id=participation.id, revision=next_revision,
                                    booth_label=body.boothLabel, setup_instructions=body.setupInstructions,
                                    updated_by_user_id=actor.id)
        db.add(record)
    else:
        record.revision = next_revision
        record.booth_label = body.boothLabel
        record.setup_instructions = body.setupInstructions
        record.updated_by_user_id = actor.id
        record.updated_at = utcnow()
    db.add(AuditEvent(user_id=actor.id, action="setup_save", resource_id=participation.id,
                      resource_revision=next_revision, outcome="success"))
    db.flush()
    return _setup_projection(participation, record)


def get_business_setup(db: Session, actor: CurrentActor, participation_id: UUID):
    participation = db.get(EventParticipation, participation_id)
    if participation is None:
        raise SetupError("not_found")
    membership = db.scalar(select(BusinessMembership.id).where(
        BusinessMembership.user_id == actor.id,
        BusinessMembership.business_id == participation.business_id,
        BusinessMembership.membership_role == "owner",
        BusinessMembership.status == "active"))
    if actor.role != "business" or membership is None:
        raise SetupError("not_found")
    accepted = db.scalar(select(Submission.id).where(
        Submission.participation_id == participation.id, Submission.status == "accepted"))
    record = db.get(ParticipationSetup, participation.id) if accepted else None
    return _setup_projection(participation, record)
