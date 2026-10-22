from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.auth.dependencies import require_workspace
from app.auth.schemas import CurrentActor
from app.database import get_db
from app.ai.routes import command
from app.ai.service import job_view
from app.preparation_drafts import service
from app.preparation_drafts.schemas import (CreatePreparationDraft, ReplacePreparationDraft, AdoptPreparationDraft, PreparationDraftView, PreparationDraftHistory, BusinessPreparationJob, AdoptionResult)

router = APIRouter(prefix="/api/v1/business", tags=["Business preparation drafts"])
DB = Annotated[Session, Depends(get_db)]
Owner = Annotated[CurrentActor, Depends(require_workspace("business"))]

@router.post("/participations/{participationId}/preparation-drafts", status_code=202, response_model=BusinessPreparationJob)
def create(participationId: UUID, body: CreatePreparationDraft, actor: Owner, db: DB):
    return job_view(db, command(db, service.create_job, actor, participationId, body))

@router.get("/participations/{participationId}/preparation-drafts", response_model=PreparationDraftHistory)
def history(participationId: UUID, actor: Owner, db: DB, limit: Annotated[int, Query(ge=1, le=100)] = 20, offset: Annotated[int, Query(ge=0)] = 0):
    return service.history(db, actor, participationId, limit, offset)

@router.get("/preparation-drafts/{draftId}", response_model=PreparationDraftView)
def read(draftId: UUID, actor: Owner, db: DB):
    return service.get_draft(db, actor, draftId)

@router.put("/preparation-drafts/{draftId}", response_model=PreparationDraftView)
def edit(draftId: UUID, body: ReplacePreparationDraft, actor: Owner, db: DB):
    return command(db, service.replace_draft, actor, draftId, body)

@router.post("/preparation-drafts/{draftId}/adopt", response_model=AdoptionResult)
def adopt(draftId: UUID, body: AdoptPreparationDraft, actor: Owner, db: DB):
    return command(db, service.adopt_draft, actor, draftId, body)
