"""Add private attendee planning with revision tombstones and immutable history."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261021_f02"
down_revision = "20261021_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("attendee_planning_states",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("event_id", sa.Uuid(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("state_revision", sa.Integer(), nullable=False),
        sa.Column("preference_revision", sa.Integer(), nullable=False),
        sa.Column("draft_revision", sa.Integer(), nullable=False),
        sa.Column("draft_preference_revision", sa.Integer(), nullable=False),
        sa.Column("interests", sa.String(1000), nullable=False),
        sa.Column("budget_minor_units", sa.Integer()),
        sa.Column("accessibility_needs", sa.String(2000), nullable=False),
        sa.Column("minimum_gap_minutes", sa.Integer(), nullable=False),
        sa.Column("current_accepted_version_id", sa.Uuid()),
        sa.UniqueConstraint("user_id", "event_id"), sa.UniqueConstraint("id", "event_id"),
        sa.CheckConstraint("state_revision >= 1 AND preference_revision >= 0 AND draft_revision >= 0 AND draft_preference_revision >= 0", name="ck_attendee_planning_revisions"),
        sa.CheckConstraint("budget_minor_units IS NULL OR budget_minor_units BETWEEN 0 AND 2147483647", name="ck_attendee_planning_budget"),
        sa.CheckConstraint("minimum_gap_minutes BETWEEN 0 AND 1440", name="ck_attendee_planning_gap"),
        sa.CheckConstraint("char_length(interests) <= 1000 AND char_length(accessibility_needs) <= 2000", name="ck_attendee_planning_text"))
    op.create_index("ix_attendee_planning_states_user_id", "attendee_planning_states", ["user_id"])
    op.create_index("ix_attendee_planning_states_event_id", "attendee_planning_states", ["event_id"])
    op.create_table("attendee_bookmarks",
        sa.Column("state_id", sa.Uuid(), primary_key=True),
        sa.Column("programme_item_id", sa.Uuid(), primary_key=True),
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["state_id", "event_id"], ["attendee_planning_states.id", "attendee_planning_states.event_id"]),
        sa.ForeignKeyConstraint(["event_id", "programme_item_id"], ["programme_items.event_id", "programme_items.id"]))
    op.create_table("attendee_draft_items",
        sa.Column("state_id", sa.Uuid(), primary_key=True),
        sa.Column("programme_item_id", sa.Uuid(), primary_key=True),
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("observed_programme_revision", sa.Integer(), nullable=False),
        sa.Column("accessibility_confirmed", sa.Boolean(), nullable=False),
        sa.Column("confirmation_preference_revision", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["state_id", "event_id"], ["attendee_planning_states.id", "attendee_planning_states.event_id"]),
        sa.ForeignKeyConstraint(["event_id", "programme_item_id"], ["programme_items.event_id", "programme_items.id"]),
        sa.CheckConstraint("observed_programme_revision >= 1 AND confirmation_preference_revision >= 0", name="ck_attendee_draft_revisions"))
    op.create_table("attendee_accepted_versions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("state_id", sa.Uuid(), sa.ForeignKey("attendee_planning_states.id"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("draft_revision", sa.Integer(), nullable=False),
        sa.Column("preference_revision", sa.Integer(), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(), nullable=False),
        sa.UniqueConstraint("state_id", "id"), sa.UniqueConstraint("state_id", "version"),
        sa.CheckConstraint("version >= 1 AND draft_revision >= 1 AND preference_revision >= 0", name="ck_attendee_accepted_revisions"))
    op.create_index("ix_attendee_accepted_versions_state_id", "attendee_accepted_versions", ["state_id"])
    op.create_foreign_key("fk_attendee_current_version", "attendee_planning_states", "attendee_accepted_versions",
                          ["id", "current_accepted_version_id"], ["state_id", "id"], deferrable=True, initially="DEFERRED")


def downgrade() -> None:
    # Destructive recovery must be deliberate; history cannot be reconstructed.
    raise RuntimeError("Attendee planning migration requires forward recovery.")
