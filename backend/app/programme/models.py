from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.models import utcnow
from app.database import Base


class Venue(Base):
    __tablename__ = "venues"
    __table_args__ = (
        UniqueConstraint("event_id", "id"),
        CheckConstraint("revision >= 1", name="ck_venues_revision"),
        CheckConstraint("name = btrim(name) AND char_length(name) BETWEEN 1 AND 200", name="ck_venues_name"),
        CheckConstraint("address = btrim(address) AND char_length(address) BETWEEN 1 AND 500", name="ck_venues_address"),
        CheckConstraint("char_length(accessibility_details) <= 2000", name="ck_venues_accessibility"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str] = mapped_column(String(500))
    accessibility_details: Mapped[str | None] = mapped_column(String(2000))
    revision: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = (
        UniqueConstraint("event_id", "id"),
        ForeignKeyConstraint(["event_id", "venue_id"], ["venues.event_id", "venues.id"]),
        CheckConstraint("revision >= 1", name="ck_rooms_revision"),
        CheckConstraint("name = btrim(name) AND char_length(name) BETWEEN 1 AND 200", name="ck_rooms_name"),
        CheckConstraint("max_capacity >= 1", name="ck_rooms_capacity"),
        CheckConstraint("char_length(accessibility_details) <= 2000", name="ck_rooms_accessibility"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"), index=True)
    venue_id: Mapped[UUID]
    name: Mapped[str] = mapped_column(String(200))
    max_capacity: Mapped[int] = mapped_column(Integer)
    accessibility_details: Mapped[str | None] = mapped_column(String(2000))
    revision: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ProgrammeItem(Base):
    __tablename__ = "programme_items"
    __table_args__ = (
        UniqueConstraint("event_id", "id"),
        ForeignKeyConstraint(["event_id", "room_id"], ["rooms.event_id", "rooms.id"]),
        CheckConstraint("revision >= 1", name="ck_programme_items_revision"),
        CheckConstraint("title = btrim(title) AND char_length(title) BETWEEN 1 AND 200", name="ck_programme_items_title"),
        CheckConstraint("type IN ('talk','workshop','panel','booth','performance','other')", name="ck_programme_items_type"),
        CheckConstraint("state IN ('draft','published')", name="ck_programme_items_state"),
        CheckConstraint("ends_at > starts_at", name="ck_programme_items_duration"),
        CheckConstraint("capacity >= 1 AND price_minor_units >= 0 AND currency = 'SGD'", name="ck_programme_items_values"),
        CheckConstraint("char_length(accessibility_details) <= 2000", name="ck_programme_items_accessibility"),
        CheckConstraint("(state = 'draft' AND published_at IS NULL) OR (state = 'published' AND published_at IS NOT NULL)", name="ck_programme_items_publication"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"), index=True)
    room_id: Mapped[UUID]
    title: Mapped[str] = mapped_column(String(200))
    type: Mapped[str] = mapped_column(String(16))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    capacity: Mapped[int] = mapped_column(Integer)
    price_minor_units: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3))
    accessibility_details: Mapped[str | None] = mapped_column(String(2000))
    state: Mapped[str] = mapped_column(String(16), default="draft")
    revision: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ProgrammeItemRevision(Base):
    __tablename__ = "programme_item_revisions"
    __table_args__ = (
        ForeignKeyConstraint(["event_id", "item_id"], ["programme_items.event_id", "programme_items.id"]),
        UniqueConstraint("item_id", "revision"),
        CheckConstraint("revision >= 1", name="ck_programme_item_revisions_revision"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"), index=True)
    item_id: Mapped[UUID] = mapped_column(unique=True)
    revision: Mapped[int] = mapped_column(Integer)
    snapshot: Mapped[dict] = mapped_column(JSONB)
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
