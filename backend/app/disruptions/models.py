from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint, Index, Integer, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.models import utcnow
from app.database import Base


class ProgrammeChange(Base):
    __tablename__ = "programme_changes"
    __table_args__ = (
        ForeignKeyConstraint(["event_id", "item_id"], ["programme_items.event_id", "programme_items.id"]),
        UniqueConstraint("item_id", "to_revision", name="uq_programme_change_item_revision"),
        CheckConstraint("to_revision = from_revision + 1", name="ck_programme_change_revision"),
        CheckConstraint("change_type IN ('updated','cancelled')", name="ck_programme_change_type"),
        CheckConstraint("recipient_snapshot_status IN ('blocked_f02','snapshotted')", name="ck_programme_change_recipients"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"), index=True)
    item_id: Mapped[UUID]
    from_revision: Mapped[int] = mapped_column(Integer)
    to_revision: Mapped[int] = mapped_column(Integer)
    old_facts: Mapped[dict] = mapped_column(JSONB)
    new_facts: Mapped[dict] = mapped_column(JSONB)
    change_type: Mapped[str] = mapped_column(String(16))
    reason: Mapped[str | None] = mapped_column(String(1000))
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    recipient_snapshot_status: Mapped[str] = mapped_column(String(20))


class AnnouncementDraft(Base):
    __tablename__ = "announcement_drafts"
    __table_args__ = (
        CheckConstraint("revision >= 1", name="ck_announcement_revision"),
        CheckConstraint("body = btrim(body) AND char_length(body) BETWEEN 1 AND 3000", name="ck_announcement_body"),
        CheckConstraint("state IN ('draft','published')", name="ck_announcement_state"),
        Index("uq_announcement_published_change", "change_id", unique=True, postgresql_where=text("state = 'published'")),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"), index=True)
    owner_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    change_id: Mapped[UUID] = mapped_column(ForeignKey("programme_changes.id"))
    source_revision: Mapped[int] = mapped_column(Integer)
    body: Mapped[str] = mapped_column(String(3000))
    revision: Mapped[int] = mapped_column(Integer, default=1)
    state: Mapped[str] = mapped_column(String(16), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_preview_id: Mapped[UUID | None]


class AnnouncementPublicationPreview(Base):
    __tablename__ = "announcement_publication_previews"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    announcement_id: Mapped[UUID] = mapped_column(ForeignKey("announcement_drafts.id"), index=True)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"))
    owner_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    change_id: Mapped[UUID] = mapped_column(ForeignKey("programme_changes.id"))
    source_revision: Mapped[int] = mapped_column(Integer)
    draft_revision: Mapped[int] = mapped_column(Integer)
    body_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AttendeeNotification(Base):
    __tablename__ = "attendee_notifications"
    __table_args__ = (UniqueConstraint("recipient_user_id", "change_id", name="uq_notification_recipient_change"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"))
    change_id: Mapped[UUID] = mapped_column(ForeignKey("programme_changes.id"))
    recipient_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    accepted_revision_id: Mapped[UUID]
    old_facts: Mapped[dict] = mapped_column(JSONB)
    new_facts: Mapped[dict] = mapped_column(JSONB)
    delivery_state: Mapped[str] = mapped_column(String(16), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
