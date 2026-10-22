"""Persist private source-bound external action proposals and sandbox outcomes."""
from alembic import op
import sqlalchemy as sa


revision = "20261023_0015"
down_revision = "20261022_0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("action_proposals",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("proposal_id", sa.Uuid(), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("creator_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("business_id", sa.Uuid(), sa.ForeignKey("businesses.id"), nullable=False),
        sa.Column("participation_id", sa.Uuid(), sa.ForeignKey("event_participations.id"), nullable=False),
        sa.Column("action_type", sa.String(24), nullable=False),
        sa.Column("mode", sa.String(16), nullable=False),
        sa.Column("recipient_verification", sa.String(16)),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("shortlist_id", sa.Uuid(), nullable=False),
        sa.Column("shortlist_revision", sa.Integer(), nullable=False),
        sa.Column("payload_digest", sa.String(64), nullable=False),
        sa.Column("state", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("proposal_id", "revision", name="uq_action_proposals_id_revision"),
        sa.CheckConstraint("revision >= 1", name="ck_action_proposals_revision"),
        sa.CheckConstraint("action_type IN ('quotation_request','purchase_cart')", name="ck_action_proposals_type"),
        sa.CheckConstraint("state IN ('open','cancelled','simulated','failed','uncertain')", name="ck_action_proposals_state"),
        sa.CheckConstraint("mode = 'simulation'", name="ck_action_proposals_mode"))
    op.create_index("ix_action_proposals_proposal_id", "action_proposals", ["proposal_id"])
    op.create_index("ix_action_proposals_creator_id", "action_proposals", ["creator_id"])
    op.create_index("ix_action_proposals_participation_id", "action_proposals", ["participation_id"])
    op.create_table("action_approvals",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("proposal_id", sa.Uuid(), nullable=False),
        sa.Column("proposal_revision", sa.Integer(), nullable=False),
        sa.Column("approved_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payload_digest", sa.String(64), nullable=False),
        sa.Column("state", sa.String(16), nullable=False),
        sa.ForeignKeyConstraint(["proposal_id", "proposal_revision"],
            ["action_proposals.proposal_id", "action_proposals.revision"],
            ondelete="CASCADE", name="fk_action_approvals_proposal_revision"),
        sa.CheckConstraint("proposal_revision >= 1", name="ck_action_approvals_revision"),
        sa.CheckConstraint("state IN ('valid','expired','cancelled','consumed')", name="ck_action_approvals_state"))
    op.create_index("ix_action_approvals_proposal_id", "action_approvals", ["proposal_id"])
    op.create_table("action_receipts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("proposal_id", sa.Uuid(), nullable=False),
        sa.Column("proposal_revision", sa.Integer(), nullable=False),
        sa.Column("approval_id", sa.Uuid(), sa.ForeignKey("action_approvals.id"), nullable=False),
        sa.Column("actor_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("idempotency_key", sa.Uuid(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("outcome", sa.String(16), nullable=False),
        sa.Column("reason_code", sa.String(64)),
        sa.ForeignKeyConstraint(["proposal_id", "proposal_revision"],
            ["action_proposals.proposal_id", "action_proposals.revision"],
            ondelete="CASCADE", name="fk_action_receipts_proposal_revision"),
        sa.UniqueConstraint("proposal_id", "proposal_revision", name="uq_action_receipts_proposal_revision"),
        sa.CheckConstraint("outcome IN ('simulated','failed','uncertain')", name="ck_action_receipts_outcome"))
    op.create_index("ix_action_receipts_proposal_id", "action_receipts", ["proposal_id"])
    op.create_table("action_idempotency_keys",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("creator_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("idempotency_key", sa.Uuid(), nullable=False),
        sa.Column("proposal_id", sa.Uuid(), nullable=False),
        sa.Column("proposal_revision", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["proposal_id", "proposal_revision"],
            ["action_proposals.proposal_id", "action_proposals.revision"],
            ondelete="CASCADE", name="fk_action_idempotency_proposal_revision"),
        sa.UniqueConstraint("creator_id", "idempotency_key", name="uq_action_idempotency_creator_key"))


def downgrade() -> None:
    bind = op.get_bind()
    for table in ("action_receipts", "action_idempotency_keys", "action_approvals", "action_proposals"):
        if bind.execute(sa.text(f"SELECT 1 FROM {table} LIMIT 1")).first():
            raise RuntimeError("Cannot remove external action history while records are retained")
    op.drop_table("action_idempotency_keys")
    op.drop_index("ix_action_receipts_proposal_id", table_name="action_receipts")
    op.drop_table("action_receipts")
    op.drop_index("ix_action_approvals_proposal_id", table_name="action_approvals")
    op.drop_table("action_approvals")
    op.drop_index("ix_action_proposals_participation_id", table_name="action_proposals")
    op.drop_index("ix_action_proposals_creator_id", table_name="action_proposals")
    op.drop_index("ix_action_proposals_proposal_id", table_name="action_proposals")
    op.drop_table("action_proposals")
