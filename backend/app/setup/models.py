from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.models import utcnow
from app.database import Base


class ParticipationSetup(Base):
    __tablename__ = "participation_setup"
    __table_args__ = (CheckConstraint("revision >= 2", name="ck_participation_setup_revision"),)

    participation_id: Mapped[UUID] = mapped_column(
        ForeignKey("event_participations.id", ondelete="CASCADE"), primary_key=True)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    booth_label: Mapped[str | None] = mapped_column(Text)
    setup_instructions: Mapped[str | None] = mapped_column(Text)
    updated_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
