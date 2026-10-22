from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.auth.dependencies import require_workspace
from app.auth.schemas import CurrentActor
from app.database import get_db
from app.attendee_planning import schemas, service


router = APIRouter(prefix="/api/v1/attendee/events/{event_id}/planning", tags=["Attendee planning"],
    responses={status: {"model": schemas.PlanningProblemBody} for status in (401, 403, 404, 409, 422, 503)})
DB = Annotated[Session, Depends(get_db)]
Attendee = Annotated[CurrentActor, Depends(require_workspace("attendee"))]


@router.get("", response_model=schemas.PlanningState)
def read(event_id: UUID, db: DB, actor: Attendee):
    return service.read_state(db, actor.id, event_id)


@router.put("/preferences", response_model=schemas.PlanningState)
def preferences(event_id: UUID, body: schemas.PreferenceCommand, db: DB, actor: Attendee):
    return service.replace_preferences(db, actor.id, event_id, body)


@router.put("/bookmarks/{item_id}", response_model=schemas.PlanningState)
def add_bookmark(event_id: UUID, item_id: UUID, body: schemas.StateCommand, db: DB, actor: Attendee):
    return service.bookmark(db, actor.id, event_id, item_id, body)


@router.delete("/bookmarks/{item_id}", response_model=schemas.PlanningState)
def remove_bookmark(event_id: UUID, item_id: UUID, body: schemas.StateCommand, db: DB, actor: Attendee):
    return service.bookmark(db, actor.id, event_id, item_id, body, remove=True)


@router.put("/draft", response_model=schemas.PlanningState)
def draft(event_id: UUID, body: schemas.DraftCommand, db: DB, actor: Attendee):
    return service.replace_draft(db, actor.id, event_id, body)


@router.post("/accept", response_model=schemas.PlanningState)
def accept(event_id: UUID, body: schemas.AcceptCommand, db: DB, actor: Attendee):
    return service.accept(db, actor.id, event_id, body)


@router.get("/accepted/{version_id}", response_model=schemas.AcceptedDetail)
def accepted(event_id: UUID, version_id: UUID, db: DB, actor: Attendee):
    return service.accepted_detail(db, actor.id, event_id, version_id)


@router.delete("", status_code=204)
def clear(event_id: UUID, body: schemas.StateCommand, db: DB, actor: Attendee):
    service.clear(db, actor.id, event_id, body)
    return Response(status_code=204)
