from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.models import utcnow
from app.database import Base


class AnalysisRubricVersion(Base):
    __tablename__ = "analysis_rubric_versions"
    __table_args__ = (UniqueConstraint("event_id", "revision", name="uq_analysis_rubric_event_revision"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"), index=True)
    revision: Mapped[int] = mapped_column(Integer)
    criteria: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AnalysisJob(Base):
    __tablename__ = "ai_jobs"
    __table_args__ = (UniqueConstraint("owner_id", "request_id", name="uq_ai_job_owner_request"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"), index=True)
    application_id: Mapped[UUID] = mapped_column(ForeignKey("submissions.id"), index=True)
    request_id: Mapped[UUID]
    source_revision: Mapped[int] = mapped_column(Integer)
    rubric_revision: Mapped[int] = mapped_column(Integer)
    comparison_revisions: Mapped[list] = mapped_column(JSON, default=list)
    state: Mapped[str] = mapped_column(String(16), index=True)
    failure_code: Mapped[str | None] = mapped_column(String(40))
    provider_may_have_run: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deadline_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    dispatch_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AnalysisReport(Base):
    __tablename__ = "ai_reports"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    job_id: Mapped[UUID] = mapped_column(ForeignKey("ai_jobs.id", ondelete="CASCADE"), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    source_revision: Mapped[int] = mapped_column(Integer)
    rubric_revision: Mapped[int] = mapped_column(Integer)
    comparison_revisions: Mapped[list] = mapped_column(JSON, default=list)
    payload: Mapped[dict] = mapped_column(JSON)


class AIProviderAttempt(Base):
    __tablename__ = "ai_provider_attempts"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    job_id: Mapped[UUID] = mapped_column(ForeignKey("ai_jobs.id", ondelete="CASCADE"), index=True)
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
