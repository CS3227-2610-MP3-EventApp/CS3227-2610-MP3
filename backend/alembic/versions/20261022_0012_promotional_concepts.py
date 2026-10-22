"""Persist private promotional concepts and add shared job workflow."""
from alembic import op
import sqlalchemy as sa


revision = "20261022_0012"
down_revision = "20261022_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_ai_job_workflow", "ai_jobs", type_="check")
    op.drop_constraint("ck_ai_job_workflow_context", "ai_jobs", type_="check")
    op.create_check_constraint("ck_ai_job_workflow", "ai_jobs",
                               "workflow IN ('analysis','preparation','promotional')")
    op.create_check_constraint("ck_ai_job_workflow_context", "ai_jobs",
        "(workflow = 'analysis' AND application_id IS NOT NULL AND source_revision IS NOT NULL AND rubric_revision IS NOT NULL AND business_participation_id IS NULL) OR (workflow IN ('preparation','promotional') AND application_id IS NULL AND source_revision IS NULL AND rubric_revision IS NULL AND business_participation_id IS NOT NULL)")
    op.create_table("promotional_concepts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("job_id", sa.Uuid(), sa.ForeignKey("ai_jobs.id", ondelete="SET NULL"), nullable=True, unique=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("participation_id", sa.Uuid(), sa.ForeignKey("event_participations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("source_revisions", sa.JSON(), nullable=False),
        sa.Column("fact_fields", sa.JSON(), nullable=False),
        sa.Column("source_facts", sa.JSON(), nullable=False),
        sa.Column("poster_copy_suggestions", sa.JSON(), nullable=False),
        sa.Column("freebie_concepts", sa.JSON(), nullable=False),
        sa.Column("layout_brief", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("revision >= 1", name="ck_promotional_concepts_revision"))
    op.create_index("ix_promotional_concepts_owner_id", "promotional_concepts", ["owner_id"])
    op.create_index("ix_promotional_concepts_participation_id", "promotional_concepts", ["participation_id"])


def downgrade() -> None:
    op.drop_index("ix_promotional_concepts_participation_id", table_name="promotional_concepts")
    op.drop_index("ix_promotional_concepts_owner_id", table_name="promotional_concepts")
    op.drop_table("promotional_concepts")
    op.drop_constraint("ck_ai_job_workflow_context", "ai_jobs", type_="check")
    op.drop_constraint("ck_ai_job_workflow", "ai_jobs", type_="check")
    op.create_check_constraint("ck_ai_job_workflow", "ai_jobs", "workflow IN ('analysis','preparation')")
    op.create_check_constraint("ck_ai_job_workflow_context", "ai_jobs",
        "(workflow = 'analysis' AND application_id IS NOT NULL AND source_revision IS NOT NULL AND rubric_revision IS NOT NULL AND business_participation_id IS NULL) OR (workflow = 'preparation' AND application_id IS NULL AND source_revision IS NULL AND rubric_revision IS NULL AND business_participation_id IS NOT NULL)")
