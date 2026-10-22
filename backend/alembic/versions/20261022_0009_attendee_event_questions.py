"""Let attendee AI jobs carry event-question jobs next to itinerary jobs."""
from alembic import op
import sqlalchemy as sa


revision = "20261022_0009"
down_revision = "20261022_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("attendee_ai_jobs", sa.Column("workflow", sa.String(16), nullable=False, server_default="itinerary"))
    op.add_column("attendee_ai_jobs", sa.Column("question", sa.String(300)))
    op.alter_column("attendee_ai_jobs", "preference_revision", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.execute("DELETE FROM attendee_ai_jobs WHERE workflow <> 'itinerary'")
    op.alter_column("attendee_ai_jobs", "preference_revision", existing_type=sa.Integer(), nullable=False)
    op.drop_column("attendee_ai_jobs", "question")
    op.drop_column("attendee_ai_jobs", "workflow")
