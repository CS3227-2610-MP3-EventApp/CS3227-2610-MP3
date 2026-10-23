from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.models import utcnow
from app.database import Base


class PromotionalConcept(Base):
    __tablename__ = "promotional_concepts"
    __table_args__ = (CheckConstraint("revision >= 1", name="ck_promotional_concepts_revision"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    job_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("ai_jobs.id", ondelete="SET NULL"), unique=True, nullable=True)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    participation_id: Mapped[UUID] = mapped_column(
        ForeignKey("event_participations.id", ondelete="CASCADE"), index=True)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    source_revisions: Mapped[dict] = mapped_column(JSON, nullable=False)
    fact_fields: Mapped[list] = mapped_column(JSON, nullable=False)
    source_facts: Mapped[list] = mapped_column(JSON, nullable=False)
    poster_copy_suggestions: Mapped[list] = mapped_column(JSON, nullable=False)
    freebie_concepts: Mapped[list] = mapped_column(JSON, nullable=False)
    layout_brief: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
