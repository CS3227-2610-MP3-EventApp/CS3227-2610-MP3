"""Restore the legacy analysis default for direct and application inserts."""
from alembic import op
import sqlalchemy as sa


revision = "20261023_0023"
down_revision = "20261023_0022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("ai_jobs", "workflow", existing_type=sa.String(length=24),
                    nullable=False, server_default="analysis")


def downgrade() -> None:
    op.alter_column("ai_jobs", "workflow", existing_type=sa.String(length=24),
                    nullable=False, server_default=None)
