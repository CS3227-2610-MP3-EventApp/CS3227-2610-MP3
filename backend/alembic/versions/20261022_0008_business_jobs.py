"""Extend shared AI jobs for business preparation workflow."""
from alembic import op
import sqlalchemy as sa


revision = "20261022_0008"
down_revision = "20261021_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("ai_jobs", sa.Column("workflow", sa.String(length=24), nullable=False,
                                        server_default="analysis"))
    op.add_column("ai_jobs", sa.Column("business_participation_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_ai_jobs_business_participation_id_event_participations",
                          "ai_jobs", "event_participations", ["business_participation_id"], ["id"])
    op.alter_column("ai_jobs", "application_id", existing_type=sa.Uuid(), nullable=True)
    op.alter_column("ai_jobs", "source_revision", existing_type=sa.Integer(), nullable=True)
    op.alter_column("ai_jobs", "rubric_revision", existing_type=sa.Integer(), nullable=True)
    op.create_index("ix_ai_jobs_workflow", "ai_jobs", ["workflow"])
    op.create_index("ix_ai_jobs_business_participation_id", "ai_jobs", ["business_participation_id"])
    op.create_check_constraint("ck_ai_job_workflow", "ai_jobs", "workflow IN ('analysis','preparation')")
    op.create_check_constraint(
        "ck_ai_job_workflow_context", "ai_jobs",
        "(workflow = 'analysis' AND application_id IS NOT NULL AND source_revision IS NOT NULL AND rubric_revision IS NOT NULL AND business_participation_id IS NULL) OR (workflow = 'preparation' AND application_id IS NULL AND source_revision IS NULL AND rubric_revision IS NULL AND business_participation_id IS NOT NULL)")
    op.alter_column("ai_jobs", "workflow", server_default=None)


def downgrade() -> None:
    op.drop_constraint("ck_ai_job_workflow_context", "ai_jobs", type_="check")
    op.drop_constraint("ck_ai_job_workflow", "ai_jobs", type_="check")
    op.drop_index("ix_ai_jobs_business_participation_id", table_name="ai_jobs")
    op.drop_index("ix_ai_jobs_workflow", table_name="ai_jobs")
    op.alter_column("ai_jobs", "rubric_revision", existing_type=sa.Integer(), nullable=False)
    op.alter_column("ai_jobs", "source_revision", existing_type=sa.Integer(), nullable=False)
    op.alter_column("ai_jobs", "application_id", existing_type=sa.Uuid(), nullable=False)
    op.drop_constraint("fk_ai_jobs_business_participation_id_event_participations", "ai_jobs", type_="foreignkey")
    op.drop_column("ai_jobs", "business_participation_id")
    op.drop_column("ai_jobs", "workflow")
