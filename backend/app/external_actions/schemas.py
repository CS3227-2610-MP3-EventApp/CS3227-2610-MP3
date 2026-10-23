from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID
import re

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


def _identifier(value):
    if isinstance(value, UUID):
        return value
    if isinstance(value, str):
        try:
            return UUID(value)
        except ValueError as exc:
            raise ValueError("Invalid identifier") from exc
    raise ValueError("Invalid identifier")


Identifier = Annotated[UUID, BeforeValidator(_identifier)]


class ItemInput(Input):
    snapshotId: Identifier
    offerId: Identifier
    quantity: Annotated[int, Field(ge=1, le=1_000_000)]


class ProposalInput(Input):
    participationId: Identifier
    actionType: Literal["quotation_request", "purchase_cart"]
    shortlistId: Identifier
    expectedShortlistRevision: Annotated[int, Field(ge=1)]
    items: Annotated[list[ItemInput], Field(min_length=1, max_length=100)]
    recipientEmail: Annotated[str | None, Field(max_length=254)] = None
    requestText: Annotated[str | None, Field(max_length=1000)] = None

    @field_validator("recipientEmail", mode="before")
    @classmethod
    def email(cls, value):
        if value is None:
            return None
        if not isinstance(value, str) or "\r" in value or "\n" in value:
            raise ValueError("Invalid email")
        value = value.strip()
        if len(value) > 254 or not re.fullmatch(r"[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+", value):
            raise ValueError("Invalid email")
        return value

    @field_validator("requestText", mode="before")
    @classmethod
    def text(cls, value):
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("Invalid request text")
        value = value.strip()
        if len(value) > 1000:
            raise ValueError("Request text is too long")
        return value

    @field_validator("items")
    @classmethod
    def unique_items(cls, values):
        keys = [(item.snapshotId, item.offerId) for item in values]
        if len(set(keys)) != len(keys):
            raise ValueError("Duplicate offers are not allowed")
        return values


class RevisionInput(ProposalInput):
    expectedProposalRevision: Annotated[int, Field(ge=1)]


class ApprovalInput(Input):
    proposalRevision: Annotated[int, Field(ge=1)]


class CancelInput(Input):
    expectedProposalRevision: Annotated[int, Field(ge=1)]


class ExecuteInput(Input):
    idempotencyKey: Identifier


class ApprovalView(BaseModel):
    approvalId: UUID
    proposalRevision: int
    approvedBy: UUID
    approvedAt: str
    expiresAt: str
    payloadDigest: str
    state: Literal["valid", "expired", "cancelled", "consumed"]


class ReceiptView(BaseModel):
    executionId: UUID
    proposalRevision: int
    approvalId: UUID
    actorId: UUID
    idempotencyKey: UUID
    startedAt: datetime
    completedAt: datetime
    outcome: Literal["simulated", "failed", "uncertain"]
    reasonCode: str | None = None


class RevisionView(BaseModel):
    proposalRevision: int
    actionType: Literal["quotation_request", "purchase_cart"]
    payload: dict
    shortlistId: UUID
    shortlistRevision: int
    payloadDigest: str
    state: Literal["open", "cancelled", "simulated", "failed", "uncertain"]
    createdAt: datetime
    updatedAt: datetime
    approvals: list[ApprovalView]
    executionReceipt: ReceiptView | None


class ProposalView(BaseModel):
    proposalId: UUID
    proposalRevision: int
    creatorId: UUID
    businessId: UUID
    participationId: UUID
    actionType: Literal["quotation_request", "purchase_cart"]
    mode: Literal["simulation"]
    recipientVerification: Literal["unverified"] | None
    payload: dict
    shortlistId: UUID
    shortlistRevision: int
    payloadDigest: str
    state: Literal["open", "cancelled", "simulated", "failed", "uncertain"]
    createdAt: datetime
    updatedAt: datetime
    approvals: list[ApprovalView]
    executionReceipt: ReceiptView | None
    revisions: list[RevisionView]


class ProposalList(BaseModel):
    items: list[ProposalView]
    total: int
    limit: int
    offset: int
