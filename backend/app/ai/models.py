from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, CheckConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.models import utcnow
from app.database import Base
# ai_jobs references programme_changes/announcement_drafts; register them for entry points that skip the API routes
# (the worker otherwise fails to flush with NoReferencedTableError).
from app.disruptions import models as _disruption_models  # noqa: F401


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
    __table_args__ = (
        UniqueConstraint("owner_id", "workflow", "request_id", name="uq_ai_job_owner_workflow_request"),
        CheckConstraint("workflow IN ('analysis','preparation','promotional','supplier_research')", name="ck_ai_job_workflow"),
        CheckConstraint("(workflow = 'analysis' AND source_revision IS NOT NULL AND business_participation_id IS NULL) OR (workflow IN ('preparation','promotional','supplier_research') AND application_id IS NULL AND source_revision IS NULL AND rubric_revision IS NULL AND business_participation_id IS NOT NULL)", name="ck_ai_job_workflow_context"),
        CheckConstraint("(workflow = 'analysis' AND ((kind = 'application_analysis' AND application_id IS NOT NULL AND rubric_revision IS NOT NULL AND source_change_id IS NULL AND announcement_draft_id IS NULL) OR (kind = 'announcement_draft' AND application_id IS NULL AND rubric_revision IS NULL AND source_change_id IS NOT NULL))) OR (workflow <> 'analysis' AND kind = 'application_analysis' AND source_change_id IS NULL AND announcement_draft_id IS NULL)", name="ck_ai_job_kind_target"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"), index=True)
    kind: Mapped[str] = mapped_column(String(32), default="application_analysis", server_default="application_analysis")
    # Organiser jobs (both kinds) use workflow "analysis"; business workflows carry a participation instead.
    workflow: Mapped[str] = mapped_column(String(24), nullable=False,
        default="analysis", server_default=text("'analysis'"), index=True)
    business_participation_id: Mapped[UUID | None] = mapped_column(ForeignKey("event_participations.id"), index=True)
    source_snapshot: Mapped[dict | None] = mapped_column(JSON)
    application_id: Mapped[UUID | None] = mapped_column(ForeignKey("submissions.id"), index=True)
    source_change_id: Mapped[UUID | None] = mapped_column(ForeignKey("programme_changes.id"))
    announcement_draft_id: Mapped[UUID | None] = mapped_column(ForeignKey("announcement_drafts.id", ondelete="SET NULL"))
    request_id: Mapped[UUID]
    source_revision: Mapped[int | None] = mapped_column(Integer)
    rubric_revision: Mapped[int | None] = mapped_column(Integer)
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
