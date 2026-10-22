"""Add durable attendee AI itinerary generation jobs and provider gate."""
from alembic import op
import sqlalchemy as sa


revision = "20261022_0008"
down_revision = "20261022_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("attendee_ai_jobs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("event_id", sa.Uuid(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column("preference_revision", sa.Integer(), nullable=False),
        sa.Column("state", sa.String(16), nullable=False),
        sa.Column("failure_code", sa.String(40)),
        sa.Column("provider_may_have_run", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lease_until", sa.DateTime(timezone=True)),
        sa.Column("dispatch_at", sa.DateTime(timezone=True)),
        sa.Column("result", sa.JSON()),
        sa.UniqueConstraint("owner_id", "request_id", name="uq_attendee_ai_job_owner_request"))
    for column in ("owner_id", "event_id", "state", "created_at", "lease_until"):
        op.create_index(f"ix_attendee_ai_jobs_{column}", "attendee_ai_jobs", [column])
    op.create_table("attendee_ai_provider_attempts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("job_id", sa.Uuid(), sa.ForeignKey("attendee_ai_jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_attendee_ai_provider_attempts_job_id", "attendee_ai_provider_attempts", ["job_id"])
    op.create_index("ix_attendee_ai_provider_attempts_attempted_at", "attendee_ai_provider_attempts", ["attempted_at"])


def downgrade() -> None:
    op.drop_index("ix_attendee_ai_provider_attempts_attempted_at", table_name="attendee_ai_provider_attempts")
    op.drop_index("ix_attendee_ai_provider_attempts_job_id", table_name="attendee_ai_provider_attempts")
    op.drop_table("attendee_ai_provider_attempts")
    for column in ("lease_until", "created_at", "state", "event_id", "owner_id"):
        op.drop_index(f"ix_attendee_ai_jobs_{column}", table_name="attendee_ai_jobs")
    op.drop_table("attendee_ai_jobs")
