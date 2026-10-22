from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.ai import service
from app.ai.schemas import AnalysisHistory, AnalysisJob, AnalysisProblem, AnalysisRubric, CreateAnalysis, ReplaceAnalysisRubric
from app.preparation_drafts.schemas import BusinessPreparationJob
from app.auth.dependencies import completed, get_current_actor, require_workspace
from app.auth.schemas import CurrentActor
from app.database import get_db


router = APIRouter(prefix="/api/v1", tags=["Organiser AI analysis"], responses={
    status: {"model": AnalysisProblem, "content": {"application/problem+json": {}}}
    for status in (401, 403, 404, 409, 422, 429, 503)})
DB = Annotated[Session, Depends(get_db)]
Organiser = Annotated[CurrentActor, Depends(require_workspace("organiser"))]
JobActor = Annotated[CurrentActor, Depends(get_current_actor)]
SharedJob = AnalysisJob | BusinessPreparationJob


def command(db, operation, *args):
    try:
        result = operation(db, *args)
        db.commit()
        return result
    except Exception:
        db.rollback()
        raise


@router.get("/organiser/events/{eventId}/analysis-rubric", response_model=AnalysisRubric)
def get_rubric(eventId: UUID, actor: Organiser, db: DB, revision: Annotated[int | None, Query(ge=1)] = None):
    return service.get_rubric(db, actor, eventId, revision)


@router.put("/organiser/events/{eventId}/analysis-rubric", response_model=AnalysisRubric)
def save_rubric(eventId: UUID, body: ReplaceAnalysisRubric, actor: Organiser, db: DB):
    return command(db, service.save_rubric, actor, eventId, body)


@router.post("/organiser/events/{eventId}/applications/{applicationId}/analyses", status_code=202, response_model=AnalysisJob)
def create_analysis(eventId: UUID, applicationId: UUID, body: CreateAnalysis, actor: Organiser, db: DB):
    job = command(db, service.create_job, actor, eventId, applicationId, body)
    return service.job_view(db, job)


@router.get("/organiser/events/{eventId}/applications/{applicationId}/analyses", response_model=AnalysisHistory)
def analysis_history(eventId: UUID, applicationId: UUID, actor: Organiser, db: DB,
                     limit: Annotated[int, Query(ge=1, le=100)] = 20,
                     offset: Annotated[int, Query(ge=0)] = 0):
    return service.history(db, actor, eventId, applicationId, limit, offset)


@router.get("/ai/jobs/{jobId}", response_model=SharedJob)
def get_job(jobId: UUID, actor: JobActor, db: DB):
    completed(actor)
    return service.get_job(db, actor, jobId)


@router.post("/ai/jobs/{jobId}/cancel", response_model=SharedJob)
def cancel_job(jobId: UUID, actor: JobActor, db: DB):
    completed(actor)
    return command(db, service.cancel_job, actor, jobId)
