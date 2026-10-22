"""Persist private supplier research snapshots and shortlists."""
from alembic import op
import sqlalchemy as sa


revision = "20261022_0014"
down_revision = "20261022_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_ai_job_workflow", "ai_jobs", type_="check")
    op.drop_constraint("ck_ai_job_workflow_context", "ai_jobs", type_="check")
    op.create_check_constraint("ck_ai_job_workflow", "ai_jobs",
        "workflow IN ('analysis','preparation','promotional','supplier_research')")
    op.create_check_constraint("ck_ai_job_workflow_context", "ai_jobs",
        "(workflow = 'analysis' AND application_id IS NOT NULL AND source_revision IS NOT NULL AND rubric_revision IS NOT NULL AND business_participation_id IS NULL) OR (workflow IN ('preparation','promotional','supplier_research') AND application_id IS NULL AND source_revision IS NULL AND rubric_revision IS NULL AND business_participation_id IS NOT NULL)")
    op.create_table("supplier_research_snapshots",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("job_id", sa.Uuid(), sa.ForeignKey("ai_jobs.id", ondelete="SET NULL"), nullable=True, unique=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("participation_id", sa.Uuid(), sa.ForeignKey("event_participations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(12), nullable=False),
        sa.Column("request", sa.JSON(), nullable=False),
        sa.Column("offers", sa.JSON(), nullable=False),
        sa.Column("sources", sa.JSON(), nullable=False),
        sa.Column("source_failures", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("revision = 1", name="ck_supplier_research_snapshots_revision"),
        sa.CheckConstraint("status IN ('complete','partial')", name="ck_supplier_research_snapshots_status"))
    op.create_index("ix_supplier_research_snapshots_owner_id", "supplier_research_snapshots", ["owner_id"])
    op.create_index("ix_supplier_research_snapshots_participation_id", "supplier_research_snapshots", ["participation_id"])
    op.create_table("supplier_shortlists",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("participation_id", sa.Uuid(), sa.ForeignKey("event_participations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("selected_offers", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("owner_id", "participation_id", name="uq_supplier_shortlists_owner_participation"),
        sa.CheckConstraint("revision >= 2", name="ck_supplier_shortlists_revision"))
    op.create_index("ix_supplier_shortlists_owner_id", "supplier_shortlists", ["owner_id"])
    op.create_index("ix_supplier_shortlists_participation_id", "supplier_shortlists", ["participation_id"])


def downgrade() -> None:
    bind = op.get_bind()
    if bind.execute(sa.text("SELECT 1 FROM ai_jobs WHERE workflow='supplier_research' LIMIT 1")).first():
        raise RuntimeError("Cannot remove supplier research while supplier jobs are retained")
    if bind.execute(sa.text("SELECT 1 FROM supplier_research_snapshots LIMIT 1")).first():
        raise RuntimeError("Cannot remove supplier research while snapshots are retained")
    if bind.execute(sa.text("SELECT 1 FROM supplier_shortlists LIMIT 1")).first():
        raise RuntimeError("Cannot remove supplier research while shortlists are retained")
    op.drop_index("ix_supplier_shortlists_participation_id", table_name="supplier_shortlists")
    op.drop_index("ix_supplier_shortlists_owner_id", table_name="supplier_shortlists")
    op.drop_table("supplier_shortlists")
    op.drop_index("ix_supplier_research_snapshots_participation_id", table_name="supplier_research_snapshots")
    op.drop_index("ix_supplier_research_snapshots_owner_id", table_name="supplier_research_snapshots")
    op.drop_table("supplier_research_snapshots")
    op.drop_constraint("ck_ai_job_workflow_context", "ai_jobs", type_="check")
    op.drop_constraint("ck_ai_job_workflow", "ai_jobs", type_="check")
    op.create_check_constraint("ck_ai_job_workflow", "ai_jobs",
        "workflow IN ('analysis','preparation','promotional')")
    op.create_check_constraint("ck_ai_job_workflow_context", "ai_jobs",
        "(workflow = 'analysis' AND application_id IS NOT NULL AND source_revision IS NOT NULL AND rubric_revision IS NOT NULL AND business_participation_id IS NULL) OR (workflow IN ('preparation','promotional') AND application_id IS NULL AND source_revision IS NULL AND rubric_revision IS NULL AND business_participation_id IS NOT NULL)")
