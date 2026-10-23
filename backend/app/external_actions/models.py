from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint,
                        Integer, JSON, String, UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.models import utcnow
from app.database import Base


class ActionProposal(Base):
    __tablename__ = "action_proposals"
    __table_args__ = (
        UniqueConstraint("proposal_id", "revision", name="uq_action_proposals_id_revision"),
        CheckConstraint("revision >= 1", name="ck_action_proposals_revision"),
        CheckConstraint("action_type IN ('quotation_request','purchase_cart')", name="ck_action_proposals_type"),
        CheckConstraint("state IN ('open','cancelled','simulated','failed','uncertain')", name="ck_action_proposals_state"),
        CheckConstraint("mode = 'simulation'", name="ck_action_proposals_mode"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    proposal_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    creator_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    business_id: Mapped[UUID] = mapped_column(ForeignKey("businesses.id"), nullable=False)
    participation_id: Mapped[UUID] = mapped_column(ForeignKey("event_participations.id"), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(String(24), nullable=False)
    mode: Mapped[str] = mapped_column(String(16), nullable=False, default="simulation")
    recipient_verification: Mapped[str | None] = mapped_column(String(16))
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    shortlist_id: Mapped[UUID] = mapped_column(nullable=False)
    shortlist_revision: Mapped[int] = mapped_column(Integer, nullable=False)
    payload_digest: Mapped[str] = mapped_column(String(64), nullable=False)
    state: Mapped[str] = mapped_column(String(16), nullable=False, default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)


class ActionApproval(Base):
    __tablename__ = "action_approvals"
    __table_args__ = (
        ForeignKeyConstraint(["proposal_id", "proposal_revision"],
                             ["action_proposals.proposal_id", "action_proposals.revision"],
                             ondelete="CASCADE", name="fk_action_approvals_proposal_revision"),
        CheckConstraint("proposal_revision >= 1", name="ck_action_approvals_revision"),
        CheckConstraint("state IN ('valid','expired','cancelled','consumed')", name="ck_action_approvals_state"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    proposal_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    proposal_revision: Mapped[int] = mapped_column(Integer, nullable=False)
    approved_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    payload_digest: Mapped[str] = mapped_column(String(64), nullable=False)
    state: Mapped[str] = mapped_column(String(16), nullable=False, default="valid")


class ActionReceipt(Base):
    __tablename__ = "action_receipts"
    __table_args__ = (
        ForeignKeyConstraint(["proposal_id", "proposal_revision"],
                             ["action_proposals.proposal_id", "action_proposals.revision"],
                             ondelete="CASCADE", name="fk_action_receipts_proposal_revision"),
        UniqueConstraint("proposal_id", "proposal_revision", name="uq_action_receipts_proposal_revision"),
        CheckConstraint("outcome IN ('simulated','failed','uncertain')", name="ck_action_receipts_outcome"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    proposal_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    proposal_revision: Mapped[int] = mapped_column(Integer, nullable=False)
    approval_id: Mapped[UUID] = mapped_column(ForeignKey("action_approvals.id"), nullable=False)
    actor_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    idempotency_key: Mapped[UUID] = mapped_column(nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    outcome: Mapped[str] = mapped_column(String(16), nullable=False)
    reason_code: Mapped[str | None] = mapped_column(String(64))


class ActionIdempotencyKey(Base):
    __tablename__ = "action_idempotency_keys"
    __table_args__ = (
        UniqueConstraint("creator_id", "idempotency_key", name="uq_action_idempotency_creator_key"),
        ForeignKeyConstraint(["proposal_id", "proposal_revision"],
                             ["action_proposals.proposal_id", "action_proposals.revision"],
                             ondelete="CASCADE", name="fk_action_idempotency_proposal_revision"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    creator_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    idempotency_key: Mapped[UUID] = mapped_column(nullable=False)
    proposal_id: Mapped[UUID] = mapped_column(nullable=False)
    proposal_revision: Mapped[int] = mapped_column(Integer, nullable=False)
