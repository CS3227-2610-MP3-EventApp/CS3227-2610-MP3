from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('attendee','organiser','business')", name="ck_users_role"),
        CheckConstraint("username ~ '^[a-z0-9_.-]{3,32}$'", name="ck_users_username"),
        CheckConstraint("email = lower(btrim(email)) AND char_length(email) > 3", name="ck_users_email"),
        CheckConstraint("display_name = btrim(display_name) AND char_length(display_name) > 0", name="ck_users_display_name"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    username: Mapped[str] = mapped_column(String(32), unique=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    display_name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PasswordCredential(Base):
    __tablename__ = "password_credentials"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), primary_key=True)
    password_hash: Mapped[str] = mapped_column(String(512))
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (CheckConstraint("token_hash ~ '^[0-9a-f]{64}$'", name="ck_sessions_digest"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (
        CheckConstraint("ends_at > starts_at", name="ck_events_duration"),
        CheckConstraint("title = btrim(title) AND char_length(title) > 0", name="ck_events_title"),
        CheckConstraint("revision >= 1", name="ck_events_revision"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String(200))
    timezone: Mapped[str] = mapped_column(String(100))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revision: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Business(Base):
    __tablename__ = "businesses"
    __table_args__ = (
        CheckConstraint("char_length(name) > 0 AND name = btrim(name)", name="ck_businesses_name"),
        CheckConstraint("char_length(normalized_name) > 0", name="ck_businesses_normalized_name"),
        CheckConstraint("revision >= 1", name="ck_businesses_revision"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(160))
    normalized_name: Mapped[str] = mapped_column(String(480), unique=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class EventMembership(Base):
    __tablename__ = "event_memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "event_id", "role"),
        CheckConstraint("role = 'organiser'", name="ck_event_membership_role"),
        CheckConstraint("status IN ('active','inactive')", name="ck_event_membership_status"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"))
    role: Mapped[str] = mapped_column(String(16), default="organiser")
    status: Mapped[str] = mapped_column(String(16), default="active")


class BusinessMembership(Base):
    __tablename__ = "business_memberships"
    __table_args__ = (
        UniqueConstraint("business_id", "user_id"),
        CheckConstraint("membership_role = 'owner'", name="ck_business_membership_role"),
        CheckConstraint("status IN ('active','inactive')", name="ck_business_membership_status"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    business_id: Mapped[UUID] = mapped_column(ForeignKey("businesses.id"))
    membership_role: Mapped[str] = mapped_column(String(16), default="owner")
    status: Mapped[str] = mapped_column(String(16), default="active")


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(64))
    resource_id: Mapped[UUID | None]
    outcome: Mapped[str] = mapped_column(String(16))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
