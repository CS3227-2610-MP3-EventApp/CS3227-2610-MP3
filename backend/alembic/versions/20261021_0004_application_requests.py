"""Add independent application settings and immutable decision records."""
from alembic import op
import sqlalchemy as sa

revision = "20261021_0004"
down_revision = "20261020_0003_programme"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("application_settings",
        sa.Column("event_id", sa.Uuid(), sa.ForeignKey("events.id"), primary_key=True),
        sa.Column("applications_open", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.CheckConstraint("revision >= 1", name="ck_application_settings_revision"))
    op.create_table("application_decisions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("submission_id", sa.Uuid(), sa.ForeignKey("submissions.id"), nullable=False),
        sa.Column("outcome", sa.String(16), nullable=False),
        sa.Column("reason", sa.Text()),
        sa.Column("decided_by_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expected_record_revision", sa.Integer(), nullable=False),
        sa.Column("frozen_content_revision", sa.Integer(), nullable=False),
        sa.UniqueConstraint("submission_id", name="uq_application_decision_submission"),
        sa.CheckConstraint("outcome IN ('accepted','rejected')", name="ck_application_decision_outcome"),
        sa.CheckConstraint("(outcome = 'accepted' AND (reason IS NULL OR char_length(reason) BETWEEN 1 AND 1000)) OR (outcome = 'rejected' AND reason IS NOT NULL AND char_length(reason) BETWEEN 1 AND 1000)", name="ck_application_decision_reason"),
        sa.CheckConstraint("expected_record_revision >= 1 AND frozen_content_revision >= 1 AND frozen_content_revision < expected_record_revision", name="ck_application_decision_revisions"))
    op.drop_constraint("ck_submission_status", "submissions", type_="check")
    op.drop_constraint("ck_submission_frozen_state", "submissions", type_="check")
    op.create_check_constraint("ck_submission_status", "submissions", "status IN ('draft','submitted','accepted','rejected')")
    op.create_check_constraint("ck_submission_frozen_state", "submissions", "(status = 'draft' AND frozen_content IS NULL AND frozen_submitted_content_revision IS NULL AND submitted_by_user_id IS NULL AND submitted_at IS NULL) OR (status IN ('submitted','accepted','rejected') AND frozen_content IS NOT NULL AND frozen_submitted_content_revision IS NOT NULL AND frozen_submitted_content_revision >= 1 AND frozen_submitted_content_revision < revision AND submitted_by_user_id IS NOT NULL AND submitted_at IS NOT NULL)")


def downgrade() -> None:
    # Retained applications and decisions cannot be safely downgraded.
    raise RuntimeError("Application request migration requires forward recovery.")
