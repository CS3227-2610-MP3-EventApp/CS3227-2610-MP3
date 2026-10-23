from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.models import utcnow
from app.database import Base


class ItineraryJob(Base):
    __tablename__ = "attendee_ai_jobs"
    __table_args__ = (UniqueConstraint("owner_id", "request_id", name="uq_attendee_ai_job_owner_request"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"), index=True)
    request_id: Mapped[UUID]
    workflow: Mapped[str] = mapped_column(String(16), default="itinerary", server_default="itinerary")
    question: Mapped[str | None] = mapped_column(String(300))
    preference_revision: Mapped[int | None] = mapped_column(Integer)
    state: Mapped[str] = mapped_column(String(16), index=True)
    failure_code: Mapped[str | None] = mapped_column(String(40))
    provider_may_have_run: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deadline_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    dispatch_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    result: Mapped[dict | None] = mapped_column(JSON)


class ItineraryProviderAttempt(Base):
    __tablename__ = "attendee_ai_provider_attempts"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    job_id: Mapped[UUID] = mapped_column(ForeignKey("attendee_ai_jobs.id", ondelete="CASCADE"), index=True)
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
