"""Extend shared AI jobs for business preparation workflow."""
from alembic import op
import sqlalchemy as sa

# Organiser job kinds (20261021_0006) stay governed by kind; business workflows keep the default kind and no
# announcement links, so the kind target check applies only to organiser ("analysis") rows.
MASTER_KIND_TARGET = (
    "(kind = 'application_analysis' AND application_id IS NOT NULL AND rubric_revision IS NOT NULL "
    "AND source_change_id IS NULL AND announcement_draft_id IS NULL) "
    "OR (kind = 'announcement_draft' AND application_id IS NULL AND rubric_revision IS NULL AND source_change_id IS NOT NULL)")
SCOPED_KIND_TARGET = (
    f"(workflow = 'analysis' AND ({MASTER_KIND_TARGET})) OR (workflow <> 'analysis' AND kind = 'application_analysis' "
    "AND source_change_id IS NULL AND announcement_draft_id IS NULL)")


revision = "20261023_0022"
down_revision = "20261023_0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("ai_jobs", sa.Column("workflow", sa.String(length=24), nullable=False,
                                        server_default="analysis"))
    op.add_column("ai_jobs", sa.Column("business_participation_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_ai_jobs_business_participation_id_event_participations",
                          "ai_jobs", "event_participations", ["business_participation_id"], ["id"])
    op.alter_column("ai_jobs", "source_revision", existing_type=sa.Integer(), nullable=True)
    op.create_index("ix_ai_jobs_workflow", "ai_jobs", ["workflow"])
    op.create_index("ix_ai_jobs_business_participation_id", "ai_jobs", ["business_participation_id"])
    op.create_check_constraint("ck_ai_job_workflow", "ai_jobs", "workflow IN ('analysis','preparation')")
    op.drop_constraint("ck_ai_job_kind_target", "ai_jobs", type_="check")
    op.create_check_constraint("ck_ai_job_kind_target", "ai_jobs", SCOPED_KIND_TARGET)
    op.create_check_constraint(
        "ck_ai_job_workflow_context", "ai_jobs",
        "(workflow = 'analysis' AND source_revision IS NOT NULL AND business_participation_id IS NULL) OR (workflow = 'preparation' AND application_id IS NULL AND source_revision IS NULL AND rubric_revision IS NULL AND business_participation_id IS NOT NULL)")
    op.alter_column("ai_jobs", "workflow", server_default=None)


def downgrade() -> None:
    op.drop_constraint("ck_ai_job_workflow_context", "ai_jobs", type_="check")
    op.drop_constraint("ck_ai_job_workflow", "ai_jobs", type_="check")
    op.drop_constraint("ck_ai_job_kind_target", "ai_jobs", type_="check")
    op.create_check_constraint("ck_ai_job_kind_target", "ai_jobs", MASTER_KIND_TARGET)
    op.drop_index("ix_ai_jobs_business_participation_id", table_name="ai_jobs")
    op.drop_index("ix_ai_jobs_workflow", table_name="ai_jobs")
    op.alter_column("ai_jobs", "source_revision", existing_type=sa.Integer(), nullable=False)
    op.drop_constraint("fk_ai_jobs_business_participation_id_event_participations", "ai_jobs", type_="foreignkey")
    op.drop_column("ai_jobs", "business_participation_id")
    op.drop_column("ai_jobs", "workflow")
