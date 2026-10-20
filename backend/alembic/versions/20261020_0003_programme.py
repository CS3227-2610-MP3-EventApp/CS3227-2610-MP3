"""Add programme authoring and immutable publication without changing auth data."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261020_0003"
down_revision = "20261019_0002"
branch_labels = None
depends_on = None


def record_columns():
    return [sa.Column("id", sa.Uuid(), primary_key=True),
            sa.Column("event_id", sa.Uuid(), sa.ForeignKey("events.id"), nullable=False),
            sa.Column("revision", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False)]


def upgrade() -> None:
    op.create_table("venues", *record_columns(),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("accessibility_details", sa.String(2000)),
        sa.UniqueConstraint("event_id", "id"),
        sa.CheckConstraint("revision >= 1", name="ck_venues_revision"),
        sa.CheckConstraint("name = btrim(name) AND char_length(name) BETWEEN 1 AND 200", name="ck_venues_name"),
        sa.CheckConstraint("address = btrim(address) AND char_length(address) BETWEEN 1 AND 500", name="ck_venues_address"),
        sa.CheckConstraint("char_length(accessibility_details) <= 2000", name="ck_venues_accessibility"),
    )
    op.create_index("ix_venues_event_id", "venues", ["event_id"])
    op.create_table("rooms", *record_columns(),
        sa.Column("venue_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("max_capacity", sa.Integer(), nullable=False),
        sa.Column("accessibility_details", sa.String(2000)),
        sa.UniqueConstraint("event_id", "id"),
        sa.ForeignKeyConstraint(["event_id", "venue_id"], ["venues.event_id", "venues.id"]),
        sa.CheckConstraint("revision >= 1", name="ck_rooms_revision"),
        sa.CheckConstraint("name = btrim(name) AND char_length(name) BETWEEN 1 AND 200", name="ck_rooms_name"),
        sa.CheckConstraint("max_capacity >= 1", name="ck_rooms_capacity"),
        sa.CheckConstraint("char_length(accessibility_details) <= 2000", name="ck_rooms_accessibility"),
    )
    op.create_index("ix_rooms_event_id", "rooms", ["event_id"])
    op.create_table("programme_items", *record_columns(),
        sa.Column("room_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("type", sa.String(16), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("price_minor_units", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("accessibility_details", sa.String(2000)),
        sa.Column("state", sa.String(16), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("event_id", "id"),
        sa.ForeignKeyConstraint(["event_id", "room_id"], ["rooms.event_id", "rooms.id"]),
        sa.CheckConstraint("revision >= 1", name="ck_programme_items_revision"),
        sa.CheckConstraint("title = btrim(title) AND char_length(title) BETWEEN 1 AND 200", name="ck_programme_items_title"),
        sa.CheckConstraint("type IN ('talk','workshop','panel','booth','performance','other')", name="ck_programme_items_type"),
        sa.CheckConstraint("state IN ('draft','published')", name="ck_programme_items_state"),
        sa.CheckConstraint("ends_at > starts_at", name="ck_programme_items_duration"),
        sa.CheckConstraint("capacity >= 1 AND price_minor_units >= 0 AND currency = 'SGD'", name="ck_programme_items_values"),
        sa.CheckConstraint("char_length(accessibility_details) <= 2000", name="ck_programme_items_accessibility"),
        sa.CheckConstraint("(state = 'draft' AND published_at IS NULL) OR (state = 'published' AND published_at IS NOT NULL)", name="ck_programme_items_publication"),
    )
    op.create_index("ix_programme_items_event_id", "programme_items", ["event_id"])
    op.create_table("programme_item_revisions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("event_id", sa.Uuid(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("item_id", sa.Uuid(), nullable=False, unique=True),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["event_id", "item_id"], ["programme_items.event_id", "programme_items.id"]),
        sa.UniqueConstraint("item_id", "revision"),
        sa.CheckConstraint("revision >= 1", name="ck_programme_item_revisions_revision"),
    )
    op.create_index("ix_programme_item_revisions_event_id", "programme_item_revisions", ["event_id"])


def downgrade() -> None:
    for table in ("programme_item_revisions", "programme_items", "rooms", "venues"):
        op.drop_table(table)
