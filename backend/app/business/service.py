"""Business-owned participation commands; caller owns the shared transaction."""
from uuid import UUID

from sqlalchemy.orm import Session

from app.business.models import EventParticipation


def create_participation(db: Session, event_id: UUID, business_id: UUID,
                         participant_type: str) -> EventParticipation:
    participation = EventParticipation(event_id=event_id, business_id=business_id,
                                       participant_type=participant_type)
    db.add(participation)
    db.flush()
    return participation


def replace_participant_type(db: Session, participation: EventParticipation, participant_type: str) -> None:
    # The submissions command holds its application's row lock throughout this call.
    if participation.participant_type != participant_type:
        participation.participant_type = participant_type
        participation.revision += 1
        db.flush()
