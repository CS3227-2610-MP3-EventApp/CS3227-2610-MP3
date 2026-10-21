"""Add versioned published booth and setup details."""
from alembic import op
import sqlalchemy as sa

revision = "20261021_0007"
down_revision = "20261021_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("participation_setup",
        sa.Column("participation_id", sa.Uuid(), sa.ForeignKey("event_participations.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("booth_label", sa.Text()),
        sa.Column("setup_instructions", sa.Text()),
        sa.Column("updated_by_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("revision >= 2", name="ck_participation_setup_revision"))


def downgrade() -> None:
    op.drop_table("participation_setup")
