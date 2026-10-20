from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, false
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.models import utcnow
from app.database import Base


class ApplicationApproval(Base):
    __tablename__ = "application_approvals"
    __table_args__ = (UniqueConstraint("event_id", "business_id", name="uq_approval_event_business"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"))
    business_id: Mapped[UUID] = mapped_column(ForeignKey("businesses.id"))
    approved_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (
        UniqueConstraint("participation_id", name="uq_submission_participation"),
        CheckConstraint("revision >= 1", name="ck_submission_revision"),
        CheckConstraint("status IN ('draft','submitted','accepted','rejected')", name="ck_submission_status"),
        CheckConstraint("(status = 'draft' AND frozen_content IS NULL AND frozen_submitted_content_revision IS NULL AND submitted_by_user_id IS NULL AND submitted_at IS NULL) OR (status IN ('submitted','accepted','rejected') AND frozen_content IS NOT NULL AND frozen_submitted_content_revision IS NOT NULL AND frozen_submitted_content_revision >= 1 AND frozen_submitted_content_revision < revision AND submitted_by_user_id IS NOT NULL AND submitted_at IS NOT NULL)", name="ck_submission_frozen_state"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    participation_id: Mapped[UUID] = mapped_column(ForeignKey("event_participations.id"))
    content: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(16), default="draft")
    revision: Mapped[int] = mapped_column(Integer, default=1)
    frozen_content: Mapped[dict | None] = mapped_column(JSON(none_as_null=True))
    frozen_submitted_content_revision: Mapped[int | None] = mapped_column(Integer)
    submitted_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ApplicationSettings(Base):
    __tablename__ = "application_settings"
    __table_args__ = (CheckConstraint("revision >= 1", name="ck_application_settings_revision"),)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"), primary_key=True)
    applications_open: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    revision: Mapped[int] = mapped_column(Integer, default=1, server_default="1")


class ApplicationDecision(Base):
    __tablename__ = "application_decisions"
    __table_args__ = (
        UniqueConstraint("submission_id", name="uq_application_decision_submission"),
        CheckConstraint("outcome IN ('accepted','rejected')", name="ck_application_decision_outcome"),
        CheckConstraint("(outcome = 'accepted' AND (reason IS NULL OR char_length(reason) BETWEEN 1 AND 1000)) OR (outcome = 'rejected' AND reason IS NOT NULL AND char_length(reason) BETWEEN 1 AND 1000)", name="ck_application_decision_reason"),
        CheckConstraint("expected_record_revision >= 1 AND frozen_content_revision >= 1 AND frozen_content_revision < expected_record_revision", name="ck_application_decision_revisions"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    submission_id: Mapped[UUID] = mapped_column(ForeignKey("submissions.id"))
    outcome: Mapped[str] = mapped_column(String(16))
    reason: Mapped[str | None] = mapped_column(Text)
    decided_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expected_record_revision: Mapped[int] = mapped_column(Integer)
    frozen_content_revision: Mapped[int] = mapped_column(Integer)
