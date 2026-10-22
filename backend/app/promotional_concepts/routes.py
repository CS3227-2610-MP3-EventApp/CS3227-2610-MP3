from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.ai import service as ai_service
from app.auth.dependencies import require_workspace
from app.auth.schemas import CurrentActor
from app.database import get_db
from app.promotional_concepts import service
from app.promotional_concepts.schemas import (BusinessPromotionalConceptJob, CreatePromotionalConcept,
    PromotionalConceptHistory, PromotionalConceptView, PromotionalProblem, RefreshPromotionalFacts,
    ReplacePromotionalConcept)


router = APIRouter(prefix="/api/v1", tags=["Business promotional concepts"], responses={
    status: {"model": PromotionalProblem, "content": {"application/problem+json": {}}}
    for status in (401, 403, 404, 409, 422, 429, 503)})
DB = Annotated[Session, Depends(get_db)]
Business = Annotated[CurrentActor, Depends(require_workspace("business"))]


def command(db, operation, *args):
    try:
        result = operation(db, *args)
        db.commit()
        return result
    except Exception as exc:
        db.rollback()
        if isinstance(exc, ai_service.AIError):
            actor = args[0] if args else None
            if actor is not None:
                action = getattr(operation, "__name__", "promotional_concept_mutation")
                resource_id = args[1] if len(args) > 1 else None
                candidate = args[-1] if args else None
                expected_revision = (candidate if isinstance(candidate, int) else
                    getattr(candidate, "expectedRevision", getattr(candidate, "expectedEventRevision", None)))
                outcome = "denied" if exc.code in {"forbidden", "not_found", "password_change_required"} else "conflict"
                service.record_rejected_mutation(actor, "promotional_" + action, resource_id,
                    expected_revision, outcome)
        raise


@router.post("/business/participations/{participationId}/promotional-concepts", status_code=202,
             response_model=BusinessPromotionalConceptJob)
def create(participationId: UUID, body: CreatePromotionalConcept, actor: Business, db: DB):
    job = command(db, service.create_job, actor, participationId, body)
    return ai_service.job_view(db, job)


@router.get("/business/participations/{participationId}/promotional-concepts",
            response_model=PromotionalConceptHistory)
def history(participationId: UUID, actor: Business, db: DB,
            limit: Annotated[int, Query(ge=1, le=100)] = 20,
            offset: Annotated[int, Query(ge=0)] = 0):
    return service.history(db, actor, participationId, limit, offset)


@router.get("/business/promotional-concepts/{conceptId}", response_model=PromotionalConceptView)
def get(conceptId: UUID, actor: Business, db: DB):
    return service.get_concept(db, actor, conceptId)


@router.put("/business/promotional-concepts/{conceptId}", response_model=PromotionalConceptView)
def replace(conceptId: UUID, body: ReplacePromotionalConcept, actor: Business, db: DB):
    return command(db, service.replace_concept, actor, conceptId, body)


@router.post("/business/promotional-concepts/{conceptId}/refresh-facts", response_model=PromotionalConceptView)
def refresh(conceptId: UUID, body: RefreshPromotionalFacts, actor: Business, db: DB):
    return command(db, service.refresh_facts, actor, conceptId, body)


@router.delete("/business/promotional-concepts/{conceptId}", status_code=204)
def delete(conceptId: UUID, expectedRevision: Annotated[int, Query(ge=1)], actor: Business, db: DB):
    command(db, service.delete_concept, actor, conceptId, expectedRevision)
    return Response(status_code=204)
