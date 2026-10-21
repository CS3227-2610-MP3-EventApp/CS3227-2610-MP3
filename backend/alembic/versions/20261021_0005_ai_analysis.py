"""Add durable organiser AI analysis jobs, reports, rubrics and provider gate."""
from alembic import op
import sqlalchemy as sa


revision = "20261021_0005"
down_revision = "20261021_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("analysis_rubric_versions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("event_id", sa.Uuid(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("criteria", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("event_id", "revision", name="uq_analysis_rubric_event_revision"))
    op.create_index("ix_analysis_rubric_versions_event_id", "analysis_rubric_versions", ["event_id"])
    op.create_table("ai_jobs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("event_id", sa.Uuid(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("application_id", sa.Uuid(), sa.ForeignKey("submissions.id"), nullable=False),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column("source_revision", sa.Integer(), nullable=False),
        sa.Column("rubric_revision", sa.Integer(), nullable=False),
        sa.Column("comparison_revisions", sa.JSON(), nullable=False),
        sa.Column("state", sa.String(16), nullable=False),
        sa.Column("failure_code", sa.String(40)),
        sa.Column("provider_may_have_run", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lease_until", sa.DateTime(timezone=True)),
        sa.Column("dispatch_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("owner_id", "request_id", name="uq_ai_job_owner_request"),
        sa.CheckConstraint("state IN ('pending','running','completed','failed','cancelled')", name="ck_ai_job_state"))
    op.create_index("ix_ai_jobs_owner_id", "ai_jobs", ["owner_id"])
    op.create_index("ix_ai_jobs_event_id", "ai_jobs", ["event_id"])
    op.create_index("ix_ai_jobs_application_id", "ai_jobs", ["application_id"])
    op.create_index("ix_ai_jobs_state", "ai_jobs", ["state"])
    op.create_index("ix_ai_jobs_created_at", "ai_jobs", ["created_at"])
    op.create_index("ix_ai_jobs_lease_until", "ai_jobs", ["lease_until"])
    op.create_table("ai_reports",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("job_id", sa.Uuid(), sa.ForeignKey("ai_jobs.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source_revision", sa.Integer(), nullable=False),
        sa.Column("rubric_revision", sa.Integer(), nullable=False),
        sa.Column("comparison_revisions", sa.JSON(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False))
    op.create_table("ai_provider_attempts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("job_id", sa.Uuid(), sa.ForeignKey("ai_jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_ai_provider_attempts_job_id", "ai_provider_attempts", ["job_id"])
    op.create_index("ix_ai_provider_attempts_attempted_at", "ai_provider_attempts", ["attempted_at"])


def downgrade() -> None:
    op.drop_index("ix_ai_provider_attempts_attempted_at", table_name="ai_provider_attempts")
    op.drop_index("ix_ai_provider_attempts_job_id", table_name="ai_provider_attempts")
    op.drop_table("ai_provider_attempts")
    op.drop_table("ai_reports")
    for name in ("ix_ai_jobs_lease_until", "ix_ai_jobs_created_at", "ix_ai_jobs_state",
                 "ix_ai_jobs_application_id", "ix_ai_jobs_event_id", "ix_ai_jobs_owner_id"):
        op.drop_index(name, table_name="ai_jobs")
    op.drop_table("ai_jobs")
    op.drop_index("ix_analysis_rubric_versions_event_id", table_name="analysis_rubric_versions")
    op.drop_table("analysis_rubric_versions")
