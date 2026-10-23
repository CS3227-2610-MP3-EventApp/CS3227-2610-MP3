"""Add independent business preparation documents."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261023_0020"
down_revision = "20261022_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("preparation_documents",
        sa.Column("participation_id", sa.Uuid(), sa.ForeignKey("event_participations.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("id", sa.Uuid(), nullable=False, unique=True),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("tasks", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("budget_lines", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_by_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("revision >= 2", name="ck_preparation_documents_revision"))


def downgrade() -> None:
    op.drop_table("preparation_documents")
