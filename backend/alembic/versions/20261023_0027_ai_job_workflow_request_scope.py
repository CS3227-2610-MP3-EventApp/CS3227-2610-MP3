"""Scope AI request identifiers by workflow."""
from alembic import op
import sqlalchemy as sa


revision = "20261023_0027"
down_revision = "20261023_0026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("uq_ai_job_owner_request", "ai_jobs", type_="unique")
    op.create_unique_constraint("uq_ai_job_owner_workflow_request", "ai_jobs",
                                ["owner_id", "workflow", "request_id"])


def downgrade() -> None:
    bind = op.get_bind()
    duplicate = bind.execute(sa.text(
        "SELECT 1 FROM ai_jobs GROUP BY owner_id, request_id HAVING count(*) > 1 LIMIT 1"
    )).first()
    if duplicate:
        raise RuntimeError("Cannot restore global AI request uniqueness while workflow duplicates exist")
    op.drop_constraint("uq_ai_job_owner_workflow_request", "ai_jobs", type_="unique")
    op.create_unique_constraint("uq_ai_job_owner_request", "ai_jobs", ["owner_id", "request_id"])
