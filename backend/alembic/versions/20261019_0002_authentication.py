"""Add shared authentication without rewriting the foundation revision."""
from alembic import op
import sqlalchemy as sa

revision = "20261019_0002"
down_revision = "20261018_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("username", sa.String(32), nullable=False, unique=True),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("role IN ('attendee','organiser','business')", name="ck_users_role"),
        sa.CheckConstraint("username ~ '^[a-z0-9_.-]{3,32}$'", name="ck_users_username"),
        sa.CheckConstraint("email = lower(btrim(email)) AND char_length(email) > 3", name="ck_users_email"),
        sa.CheckConstraint("display_name = btrim(display_name) AND char_length(display_name) > 0", name="ck_users_display_name"),
    )
    op.create_table("password_credentials",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("password_hash", sa.String(512), nullable=False),
        sa.Column("must_change_password", sa.Boolean(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table("sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_hash", sa.String(64), unique=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("token_hash ~ '^[0-9a-f]{64}$'", name="ck_sessions_digest"),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])
    op.create_table("events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("timezone", sa.String(100), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("ends_at > starts_at", name="ck_events_duration"),
        sa.CheckConstraint("title = btrim(title) AND char_length(title) > 0", name="ck_events_title"),
        sa.CheckConstraint("revision >= 1", name="ck_events_revision"),
    )
    op.create_table("businesses",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("normalized_name", sa.String(480), unique=True, nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("char_length(name) > 0 AND name = btrim(name)", name="ck_businesses_name"),
        sa.CheckConstraint("char_length(normalized_name) > 0", name="ck_businesses_normalized_name"),
        sa.CheckConstraint("revision >= 1", name="ck_businesses_revision"),
    )
    op.create_table("event_memberships",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("event_id", sa.Uuid(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.UniqueConstraint("user_id", "event_id", "role"),
        sa.CheckConstraint("role = 'organiser'", name="ck_event_membership_role"),
        sa.CheckConstraint("status IN ('active','inactive')", name="ck_event_membership_status"),
    )
    op.create_table("business_memberships",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("business_id", sa.Uuid(), sa.ForeignKey("businesses.id"), nullable=False),
        sa.Column("membership_role", sa.String(16), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.UniqueConstraint("business_id", "user_id"),
        sa.CheckConstraint("membership_role = 'owner'", name="ck_business_membership_role"),
        sa.CheckConstraint("status IN ('active','inactive')", name="ck_business_membership_status"),
    )
    op.create_table("audit_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id")),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("resource_id", sa.Uuid()),
        sa.Column("outcome", sa.String(16), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    for table in ("audit_events", "business_memberships", "event_memberships", "businesses", "events", "sessions", "password_credentials", "users"):
        op.drop_table(table)
