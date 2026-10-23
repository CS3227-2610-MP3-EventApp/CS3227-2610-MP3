from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import require_workspace
from app.auth.schemas import CurrentActor
from app.database import get_db
from app.external_actions import service
from app.external_actions.problems import ActionError
from app.external_actions.schemas import (ApprovalInput, CancelInput, ExecuteInput,
    ApprovalView, ProposalInput, ProposalList, ProposalView, ReceiptView, RevisionInput)


router = APIRouter(prefix="/api/v1/business", tags=["Business external action sandbox"])
DB = Annotated[Session, Depends(get_db)]
Business = Annotated[CurrentActor, Depends(require_workspace("business"))]


def command(db, actor, action, operation, *args, resource_id=None, revision=None):
    try:
        result = operation(db, actor, *args)
        db.commit()
        return result
    except Exception as exc:
        db.rollback()
        if isinstance(exc, (ActionError,)):
            outcome = "denied" if exc.code == "not_found" else "conflict"
            service.record_rejected(actor, action, resource_id, revision, outcome)
        raise


@router.post("/action-proposals", status_code=201, response_model=ProposalView)
def create(body: ProposalInput, actor: Business, db: DB):
    return command(db, actor, "proposal_create", service.create, body,
        resource_id=body.participationId, revision=1)


@router.get("/action-proposals", response_model=ProposalList)
def list_actions(actor: Business, db: DB,
                 limit: Annotated[int, Query(ge=1, le=100)] = 20,
                 offset: Annotated[int, Query(ge=0)] = 0):
    try:
        return service.list_proposals(db, actor, limit, offset)
    except ActionError:
        db.rollback()
        raise


@router.get("/action-proposals/{proposalId}", response_model=ProposalView)
def read(proposalId: UUID, actor: Business, db: DB):
    try:
        return service.get_proposal(db, actor, proposalId)
    except ActionError as exc:
        db.rollback()
        service.record_rejected(actor, "proposal_read", proposalId, None, "denied")
        raise exc


@router.post("/action-proposals/{proposalId}/revisions", status_code=201, response_model=ProposalView)
def revise(proposalId: UUID, body: RevisionInput, actor: Business, db: DB):
    return command(db, actor, "proposal_revision", service.revise, proposalId, body,
        resource_id=proposalId, revision=body.expectedProposalRevision + 1)


@router.post("/action-proposals/{proposalId}/approvals", status_code=201, response_model=ApprovalView)
def approve(proposalId: UUID, body: ApprovalInput, actor: Business, db: DB):
    return command(db, actor, "approval_create", service.approve, proposalId, body.proposalRevision,
        resource_id=proposalId, revision=body.proposalRevision)


@router.post("/action-proposals/{proposalId}/cancel", response_model=ProposalView)
def cancel(proposalId: UUID, body: CancelInput, actor: Business, db: DB):
    return command(db, actor, "proposal_cancel", service.cancel, proposalId,
        body.expectedProposalRevision, resource_id=proposalId, revision=body.expectedProposalRevision)


@router.post("/action-approvals/{approvalId}/execute", response_model=ReceiptView)
def execute(approvalId: UUID, body: ExecuteInput, actor: Business, db: DB):
    return command(db, actor, "execution", service.execute, approvalId, body.idempotencyKey,
        resource_id=approvalId, revision=None)
