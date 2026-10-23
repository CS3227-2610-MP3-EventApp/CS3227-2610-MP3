"""Add immutable programme changes, private announcements and blocked delivery storage."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "20261021_0006"
down_revision = "20261021_0005"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint("ck_programme_items_state", "programme_items", type_="check")
    op.drop_constraint("ck_programme_items_publication", "programme_items", type_="check")
    op.create_check_constraint("ck_programme_items_state", "programme_items", "state IN ('draft','published','cancelled')")
    op.create_check_constraint("ck_programme_items_publication", "programme_items", "(state = 'draft' AND published_at IS NULL) OR (state IN ('published','cancelled') AND published_at IS NOT NULL)")
    op.add_column("programme_items", sa.Column("last_change_id", sa.Uuid()))
    op.add_column("programme_items", sa.Column("cancelled_at", sa.DateTime(timezone=True)))
    op.add_column("programme_items", sa.Column("cancellation_reason", sa.String(1000)))
    op.add_column("programme_items", sa.Column("cancelled_by_user_id", sa.Uuid(), sa.ForeignKey("users.id")))
    op.drop_constraint("programme_item_revisions_item_id_key", "programme_item_revisions", type_="unique")
    op.create_table("programme_changes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("event_id", sa.Uuid(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("item_id", sa.Uuid(), nullable=False),
        sa.Column("from_revision", sa.Integer(), nullable=False),
        sa.Column("to_revision", sa.Integer(), nullable=False),
        sa.Column("old_facts", JSONB(), nullable=False),
        sa.Column("new_facts", JSONB(), nullable=False),
        sa.Column("change_type", sa.String(16), nullable=False),
        sa.Column("reason", sa.String(1000)),
        sa.Column("actor_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("recipient_snapshot_status", sa.String(20), nullable=False),
        sa.ForeignKeyConstraint(["event_id", "item_id"], ["programme_items.event_id", "programme_items.id"]),
        sa.UniqueConstraint("item_id", "to_revision", name="uq_programme_change_item_revision"),
        sa.CheckConstraint("to_revision = from_revision + 1", name="ck_programme_change_revision"),
        sa.CheckConstraint("change_type IN ('updated','cancelled')", name="ck_programme_change_type"),
        sa.CheckConstraint("recipient_snapshot_status IN ('blocked_f02','snapshotted')", name="ck_programme_change_recipients"))
    op.create_index("ix_programme_changes_event_id", "programme_changes", ["event_id"])
    op.create_foreign_key("fk_programme_items_last_change", "programme_items", "programme_changes", ["last_change_id"], ["id"])
    op.create_table("announcement_drafts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("event_id", sa.Uuid(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("owner_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("change_id", sa.Uuid(), sa.ForeignKey("programme_changes.id"), nullable=False),
        sa.Column("source_revision", sa.Integer(), nullable=False),
        sa.Column("body", sa.String(3000), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("state", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("published_preview_id", sa.Uuid()),
        sa.CheckConstraint("revision >= 1", name="ck_announcement_revision"),
        sa.CheckConstraint("body = btrim(body) AND char_length(body) BETWEEN 1 AND 3000", name="ck_announcement_body"),
        sa.CheckConstraint("state IN ('draft','published')", name="ck_announcement_state"))
    op.create_index("ix_announcement_drafts_event_id", "announcement_drafts", ["event_id"])
    op.create_index("ix_announcement_drafts_owner_user_id", "announcement_drafts", ["owner_user_id"])
    op.create_index("uq_announcement_published_change", "announcement_drafts", ["change_id"], unique=True, postgresql_where=sa.text("state = 'published'"))
    op.create_table("announcement_publication_previews",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("announcement_id", sa.Uuid(), sa.ForeignKey("announcement_drafts.id"), nullable=False),
        sa.Column("event_id", sa.Uuid(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("owner_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("change_id", sa.Uuid(), sa.ForeignKey("programme_changes.id"), nullable=False),
        sa.Column("source_revision", sa.Integer(), nullable=False),
        sa.Column("draft_revision", sa.Integer(), nullable=False),
        sa.Column("body_hash", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_announcement_publication_previews_announcement_id", "announcement_publication_previews", ["announcement_id"])
    op.create_table("attendee_notifications",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("event_id", sa.Uuid(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("change_id", sa.Uuid(), sa.ForeignKey("programme_changes.id"), nullable=False),
        sa.Column("recipient_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("accepted_revision_id", sa.Uuid(), nullable=False),
        sa.Column("old_facts", JSONB(), nullable=False),
        sa.Column("new_facts", JSONB(), nullable=False),
        sa.Column("delivery_state", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("recipient_user_id", "change_id", name="uq_notification_recipient_change"))
    op.create_index("ix_attendee_notifications_recipient_user_id", "attendee_notifications", ["recipient_user_id"])
    op.add_column("ai_jobs", sa.Column("kind", sa.String(32), nullable=False, server_default="application_analysis"))
    op.alter_column("ai_jobs", "application_id", nullable=True)
    op.alter_column("ai_jobs", "rubric_revision", nullable=True)
    op.add_column("ai_jobs", sa.Column("source_change_id", sa.Uuid(), sa.ForeignKey("programme_changes.id")))
    op.add_column("ai_jobs", sa.Column("announcement_draft_id", sa.Uuid(), sa.ForeignKey("announcement_drafts.id", ondelete="SET NULL")))
    op.create_check_constraint("ck_ai_job_kind_target", "ai_jobs", "(kind = 'application_analysis' AND application_id IS NOT NULL AND rubric_revision IS NOT NULL AND source_change_id IS NULL AND announcement_draft_id IS NULL) OR (kind = 'announcement_draft' AND application_id IS NULL AND rubric_revision IS NULL AND source_change_id IS NOT NULL)")


def downgrade():
    # Do not silently discard retained cancellation/history or completed draft jobs.
    connection = op.get_bind()
    if connection.scalar(sa.text("SELECT EXISTS (SELECT 1 FROM programme_changes) OR EXISTS (SELECT 1 FROM ai_jobs WHERE kind = 'announcement_draft')")):
        raise RuntimeError("Disruption records must be retained; downgrade requires explicit archival first.")
    op.drop_constraint("ck_ai_job_kind_target", "ai_jobs", type_="check")
    op.drop_column("ai_jobs", "announcement_draft_id")
    op.drop_column("ai_jobs", "source_change_id")
    op.alter_column("ai_jobs", "rubric_revision", nullable=False)
    op.alter_column("ai_jobs", "application_id", nullable=False)
    op.drop_column("ai_jobs", "kind")
    for table in ("attendee_notifications", "announcement_publication_previews", "announcement_drafts"):
        op.drop_table(table)
    op.drop_constraint("fk_programme_items_last_change", "programme_items", type_="foreignkey")
    op.drop_table("programme_changes")
    for column in ("cancelled_by_user_id", "cancellation_reason", "cancelled_at", "last_change_id"):
        op.drop_column("programme_items", column)
    op.drop_constraint("ck_programme_items_state", "programme_items", type_="check")
    op.drop_constraint("ck_programme_items_publication", "programme_items", type_="check")
    op.create_check_constraint("ck_programme_items_state", "programme_items", "state IN ('draft','published')")
    op.create_check_constraint("ck_programme_items_publication", "programme_items", "(state = 'draft' AND published_at IS NULL) OR (state = 'published' AND published_at IS NOT NULL)")
    op.create_unique_constraint("programme_item_revisions_item_id_key", "programme_item_revisions", ["item_id"])
