from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.ai import service as ai_service
from app.auth.dependencies import require_workspace
from app.auth.schemas import CurrentActor
from app.database import get_db
from app.supplier_research import service
from app.supplier_research.schemas import (BusinessSupplierResearchJob, CreateSupplierResearch,
    ReplaceShortlist, ShortlistView, SupplierResearchHistory,
    SupplierResearchSnapshot as SnapshotView)


router = APIRouter(prefix="/api/v1", tags=["Business supplier research"])
DB = Annotated[Session, Depends(get_db)]
Business = Annotated[CurrentActor, Depends(require_workspace("business"))]


def command(db, operation, *args):
    try:
        result = operation(db, *args)
        db.commit()
        return result
    except Exception as exc:
        db.rollback()
        if isinstance(exc, ai_service.AIError) and args:
            actor = args[0]
            resource_id = args[1] if len(args) > 1 else None
            candidate = args[-1] if args else None
            revision = candidate if isinstance(candidate, int) else getattr(candidate, "expectedRevision", None)
            outcome = "denied" if exc.code in {"forbidden", "not_found", "password_change_required"} else "conflict"
            service.record_rejected(actor, "supplier_" + operation.__name__, resource_id, revision, outcome)
        raise


@router.post("/business/participations/{participationId}/supplier-research", status_code=202,
             response_model=BusinessSupplierResearchJob)
def create(participationId: UUID, body: CreateSupplierResearch, actor: Business, db: DB):
    job = command(db, service.create_job, actor, participationId, body)
    return ai_service.job_view(db, job)


@router.get("/business/participations/{participationId}/supplier-research",
            response_model=SupplierResearchHistory)
def history(participationId: UUID, actor: Business, db: DB,
            limit: Annotated[int, Query(ge=1, le=100)] = 20,
            offset: Annotated[int, Query(ge=0)] = 0):
    return service.history(db, actor, participationId, limit, offset)


@router.get("/business/supplier-research/{snapshotId}", response_model=SnapshotView)
def get_snapshot(snapshotId: UUID, actor: Business, db: DB):
    return service.get_snapshot(db, actor, snapshotId)


@router.delete("/business/supplier-research/{snapshotId}", status_code=204)
def delete_snapshot(snapshotId: UUID, expectedRevision: Annotated[int, Query(ge=1)], actor: Business, db: DB):
    command(db, service.delete_snapshot, actor, snapshotId, expectedRevision)
    return Response(status_code=204)


@router.get("/business/participations/{participationId}/supplier-shortlist", response_model=ShortlistView)
def get_shortlist(participationId: UUID, actor: Business, db: DB):
    return service.get_shortlist(db, actor, participationId)


@router.put("/business/participations/{participationId}/supplier-shortlist", response_model=ShortlistView)
def replace_shortlist(participationId: UUID, body: ReplaceShortlist, actor: Business, db: DB):
    return command(db, service.replace_shortlist, actor, participationId, body)
