"""Add eligibility, preparation participation and private/frozen applications."""
from alembic import op
import sqlalchemy as sa

revision = "20261020_0003"
down_revision = "20261019_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("audit_events", sa.Column("resource_revision", sa.Integer(), nullable=True))
    op.create_check_constraint("ck_audit_resource_revision", "audit_events", "resource_revision IS NULL OR resource_revision >= 1")
    op.create_table("application_approvals",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("event_id", sa.Uuid(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("business_id", sa.Uuid(), sa.ForeignKey("businesses.id"), nullable=False),
        sa.Column("approved_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("event_id", "business_id", name="uq_approval_event_business"),
    )
    op.create_table("event_participations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("event_id", sa.Uuid(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("business_id", sa.Uuid(), sa.ForeignKey("businesses.id"), nullable=False),
        sa.Column("participant_type", sa.String(16), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.UniqueConstraint("event_id", "business_id", name="uq_participation_event_business"),
        sa.CheckConstraint("participant_type IN ('exhibitor','vendor')", name="ck_participation_type"),
        sa.CheckConstraint("revision >= 1", name="ck_participation_revision"),
    )
    op.create_table("submissions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("participation_id", sa.Uuid(), sa.ForeignKey("event_participations.id"), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("frozen_content", sa.JSON(none_as_null=True)),
        sa.Column("frozen_submitted_content_revision", sa.Integer()),
        sa.Column("submitted_by_user_id", sa.Uuid(), sa.ForeignKey("users.id")),
        sa.Column("submitted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("participation_id", name="uq_submission_participation"),
        sa.CheckConstraint("revision >= 1", name="ck_submission_revision"),
        sa.CheckConstraint("status IN ('draft','submitted')", name="ck_submission_status"),
        sa.CheckConstraint("(status = 'draft' AND frozen_content IS NULL AND frozen_submitted_content_revision IS NULL AND submitted_by_user_id IS NULL AND submitted_at IS NULL) OR (status = 'submitted' AND frozen_content IS NOT NULL AND frozen_submitted_content_revision IS NOT NULL AND frozen_submitted_content_revision >= 1 AND frozen_submitted_content_revision < revision AND submitted_by_user_id IS NOT NULL AND submitted_at IS NOT NULL)", name="ck_submission_frozen_state"),
    )


def downgrade() -> None:
    # Destructive, explicit development recovery only; never run against retained data.
    op.drop_table("submissions")
    op.drop_table("event_participations")
    op.drop_table("application_approvals")
    op.drop_constraint("ck_audit_resource_revision", "audit_events", type_="check")
    op.drop_column("audit_events", "resource_revision")
