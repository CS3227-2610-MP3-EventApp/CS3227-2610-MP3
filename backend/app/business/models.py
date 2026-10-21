from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EventParticipation(Base):
    __tablename__ = "event_participations"
    __table_args__ = (
        UniqueConstraint("event_id", "business_id", name="uq_participation_event_business"),
        CheckConstraint("participant_type IN ('exhibitor','vendor')", name="ck_participation_type"),
        CheckConstraint("revision >= 1", name="ck_participation_revision"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"))
    business_id: Mapped[UUID] = mapped_column(ForeignKey("businesses.id"))
    participant_type: Mapped[str] = mapped_column(String(16))
    revision: Mapped[int] = mapped_column(Integer, default=1)
