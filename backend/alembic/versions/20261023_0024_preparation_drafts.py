"""Persist generated business preparation drafts separately from manual data."""
from alembic import op
import sqlalchemy as sa


revision = "20261023_0024"
down_revision = "20261023_0023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("ai_jobs", sa.Column("source_snapshot", sa.JSON(), nullable=True))
    op.create_table("preparation_drafts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("job_id", sa.Uuid(), sa.ForeignKey("ai_jobs.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("participation_id", sa.Uuid(), sa.ForeignKey("event_participations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("source_revisions", sa.JSON(), nullable=False),
        sa.Column("source_facts", sa.JSON(), nullable=False),
        sa.Column("tasks", sa.JSON(), nullable=False),
        sa.Column("budget_lines", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("adopted_at", sa.DateTime(timezone=True)),
        sa.Column("adopted_preparation_revision", sa.Integer()),
        sa.CheckConstraint("revision >= 1", name="ck_preparation_drafts_revision"))
    op.create_index("ix_preparation_drafts_participation_id", "preparation_drafts", ["participation_id"])


def downgrade() -> None:
    op.drop_index("ix_preparation_drafts_participation_id", table_name="preparation_drafts")
    op.drop_table("preparation_drafts")
    op.drop_column("ai_jobs", "source_snapshot")
