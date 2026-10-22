from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.models import utcnow
from app.database import Base


class PreparationDraft(Base):
    __tablename__ = "preparation_drafts"
    __table_args__ = (CheckConstraint("revision >= 1", name="ck_preparation_drafts_revision"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    job_id: Mapped[UUID] = mapped_column(ForeignKey("ai_jobs.id", ondelete="CASCADE"), unique=True)
    participation_id: Mapped[UUID] = mapped_column(ForeignKey("event_participations.id", ondelete="CASCADE"), index=True)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    source_revisions: Mapped[dict] = mapped_column(JSON, nullable=False)
    source_facts: Mapped[dict] = mapped_column(JSON, nullable=False)
    tasks: Mapped[list] = mapped_column(JSON, nullable=False)
    budget_lines: Mapped[list] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    adopted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    adopted_preparation_revision: Mapped[int | None] = mapped_column(Integer)
