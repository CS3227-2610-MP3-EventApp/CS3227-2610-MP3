from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.models import utcnow
from app.database import Base


class PlanningState(Base):
    __tablename__ = "attendee_planning_states"
    __table_args__ = (
        UniqueConstraint("user_id", "event_id"), UniqueConstraint("id", "event_id"),
        CheckConstraint("state_revision >= 1 AND preference_revision >= 0 AND draft_revision >= 0 AND draft_preference_revision >= 0", name="ck_attendee_planning_revisions"),
        CheckConstraint("budget_minor_units IS NULL OR budget_minor_units BETWEEN 0 AND 2147483647", name="ck_attendee_planning_budget"),
        CheckConstraint("minimum_gap_minutes BETWEEN 0 AND 1440", name="ck_attendee_planning_gap"),
        CheckConstraint("char_length(interests) <= 1000 AND char_length(accessibility_needs) <= 2000", name="ck_attendee_planning_text"),
        ForeignKeyConstraint(["id", "current_accepted_version_id"], ["attendee_accepted_versions.state_id", "attendee_accepted_versions.id"],
                             name="fk_attendee_current_version", use_alter=True, deferrable=True, initially="DEFERRED"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"), index=True)
    state_revision: Mapped[int] = mapped_column(Integer, default=1)
    preference_revision: Mapped[int] = mapped_column(Integer, default=0)
    draft_revision: Mapped[int] = mapped_column(Integer, default=0)
    draft_preference_revision: Mapped[int] = mapped_column(Integer, default=0)
    interests: Mapped[str] = mapped_column(String(1000), default="")
    budget_minor_units: Mapped[int | None] = mapped_column(Integer)
    accessibility_needs: Mapped[str] = mapped_column(String(2000), default="")
    minimum_gap_minutes: Mapped[int] = mapped_column(Integer, default=0)
    current_accepted_version_id: Mapped[UUID | None]


class Bookmark(Base):
    __tablename__ = "attendee_bookmarks"
    __table_args__ = (
        ForeignKeyConstraint(["state_id", "event_id"], ["attendee_planning_states.id", "attendee_planning_states.event_id"]),
        ForeignKeyConstraint(["event_id", "programme_item_id"], ["programme_items.event_id", "programme_items.id"]),
    )
    state_id: Mapped[UUID] = mapped_column(primary_key=True)
    programme_item_id: Mapped[UUID] = mapped_column(primary_key=True)
    event_id: Mapped[UUID]


class DraftItem(Base):
    __tablename__ = "attendee_draft_items"
    __table_args__ = (
        ForeignKeyConstraint(["state_id", "event_id"], ["attendee_planning_states.id", "attendee_planning_states.event_id"]),
        ForeignKeyConstraint(["event_id", "programme_item_id"], ["programme_items.event_id", "programme_items.id"]),
        CheckConstraint("observed_programme_revision >= 1 AND confirmation_preference_revision >= 0", name="ck_attendee_draft_revisions"),
    )
    state_id: Mapped[UUID] = mapped_column(primary_key=True)
    programme_item_id: Mapped[UUID] = mapped_column(primary_key=True)
    event_id: Mapped[UUID]
    observed_programme_revision: Mapped[int] = mapped_column(Integer)
    accessibility_confirmed: Mapped[bool] = mapped_column(Boolean)
    confirmation_preference_revision: Mapped[int] = mapped_column(Integer)


class AcceptedVersion(Base):
    __tablename__ = "attendee_accepted_versions"
    __table_args__ = (
        UniqueConstraint("state_id", "id"), UniqueConstraint("state_id", "version"),
        CheckConstraint("version >= 1 AND draft_revision >= 1 AND preference_revision >= 0", name="ck_attendee_accepted_revisions"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    state_id: Mapped[UUID] = mapped_column(ForeignKey("attendee_planning_states.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    draft_revision: Mapped[int] = mapped_column(Integer)
    preference_revision: Mapped[int] = mapped_column(Integer)
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    snapshot: Mapped[dict] = mapped_column(JSONB)
