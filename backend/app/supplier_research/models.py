from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.models import utcnow
from app.database import Base


class SupplierResearchSnapshot(Base):
    __tablename__ = "supplier_research_snapshots"
    __table_args__ = (
        CheckConstraint("revision = 1", name="ck_supplier_research_snapshots_revision"),
        CheckConstraint("status IN ('complete','partial')", name="ck_supplier_research_snapshots_status"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    job_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("ai_jobs.id", ondelete="SET NULL"), unique=True, nullable=True)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    participation_id: Mapped[UUID] = mapped_column(
        ForeignKey("event_participations.id", ondelete="CASCADE"), index=True)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(12), nullable=False)
    request: Mapped[dict] = mapped_column(JSON, nullable=False)
    offers: Mapped[list] = mapped_column(JSON, nullable=False)
    sources: Mapped[list] = mapped_column(JSON, nullable=False)
    source_failures: Mapped[list] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)


class SupplierShortlist(Base):
    __tablename__ = "supplier_shortlists"
    __table_args__ = (
        UniqueConstraint("owner_id", "participation_id", name="uq_supplier_shortlists_owner_participation"),
        CheckConstraint("revision >= 2", name="ck_supplier_shortlists_revision"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    participation_id: Mapped[UUID] = mapped_column(
        ForeignKey("event_participations.id", ondelete="CASCADE"), index=True)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    selected_offers: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
