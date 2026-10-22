from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.schemas import AnalysisProblem
from app.attendee_ai import questions, service
from app.attendee_ai.schemas import AskQuestion, GenerateItinerary, ItineraryJobView, QuestionJobView
from app.auth.dependencies import require_workspace
from app.auth.schemas import CurrentActor
from app.database import get_db


router = APIRouter(prefix="/api/v1/attendee", tags=["Attendee AI itineraries"], responses={
    status: {"model": AnalysisProblem, "content": {"application/problem+json": {}}}
    for status in (401, 403, 404, 409, 422, 429, 503)})
DB = Annotated[Session, Depends(get_db)]
Attendee = Annotated[CurrentActor, Depends(require_workspace("attendee"))]


def command(db, operation, *args):
    try:
        result = operation(db, *args)
        db.commit()
        return result
    except Exception:
        db.rollback()
        raise


@router.post("/events/{eventId}/itinerary-generations", status_code=202, response_model=ItineraryJobView)
def create_generation(eventId: UUID, body: GenerateItinerary, actor: Attendee, db: DB):
    job = command(db, service.create_job, actor.id, eventId, body)
    return service.job_view(job)


@router.get("/ai/jobs/{jobId}", response_model=ItineraryJobView)
def get_job(jobId: UUID, actor: Attendee, db: DB):
    return service.get_job(db, actor.id, jobId)


@router.post("/ai/jobs/{jobId}/cancel", response_model=ItineraryJobView)
def cancel_job(jobId: UUID, actor: Attendee, db: DB):
    return command(db, service.cancel_job, actor.id, jobId)


@router.post("/events/{eventId}/event-questions", status_code=202, response_model=QuestionJobView)
def ask_question(eventId: UUID, body: AskQuestion, actor: Attendee, db: DB):
    job = command(db, questions.create_job, actor.id, eventId, body)
    return questions.job_view(db, job)


@router.get("/ai/question-jobs/{jobId}", response_model=QuestionJobView)
def get_question_job(jobId: UUID, actor: Attendee, db: DB):
    return questions.get_job(db, actor.id, jobId)


@router.post("/ai/question-jobs/{jobId}/cancel", response_model=QuestionJobView)
def cancel_question_job(jobId: UUID, actor: Attendee, db: DB):
    return command(db, questions.cancel_job, actor.id, jobId)
