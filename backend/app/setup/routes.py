from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_event_membership, require_workspace
from app.auth.schemas import CurrentActor
from app.database import get_db
from app.setup import service
from app.setup.problems import SetupError
from app.setup.schemas import SaveSetup, SetupDetails, SetupProblem, PublishSetup, OrganiserSetupDetails


router = APIRouter(prefix="/api/v1", tags=["Business setup"], responses={
    status: {"model": SetupProblem, "content": {"application/problem+json": {}}}
    for status in (401, 403, 404, 405, 409, 422, 500, 503)})
DB = Annotated[Session, Depends(get_db)]
Owner = Annotated[CurrentActor, Depends(require_workspace("business"))]
Organizer = Annotated[CurrentActor, Depends(require_event_membership)]


def command(db: Session, operation, *args):
    try:
        result = operation(db, *args)
        db.commit()
        return result
    except Exception:
        db.rollback()
        raise


@router.get("/organiser/events/{event_id}/participations/{participation_id}/setup", response_model=OrganiserSetupDetails)
def organiser_get(event_id: UUID, participation_id: UUID, actor: Organizer, db: DB):
    return service.get_organiser_setup(db, actor, event_id, participation_id)


@router.put("/organiser/events/{event_id}/participations/{participation_id}/setup", response_model=OrganiserSetupDetails)
def organiser_save(event_id: UUID, participation_id: UUID, body: SaveSetup, actor: Organizer, db: DB):
    return command(db, service.save_organiser_setup, actor, event_id, participation_id, body)


@router.get("/business/participations/{participation_id}/setup", response_model=SetupDetails)
def business_get(participation_id: UUID, actor: Owner, db: DB):
    return service.get_business_setup(db, actor, participation_id)


@router.post("/organiser/events/{event_id}/participations/{participation_id}/setup/publish", response_model=OrganiserSetupDetails)
def publish_setup(event_id: UUID, participation_id: UUID, body: PublishSetup, actor: Organizer, db: DB):
    return command(db, service.publish_organiser_setup, actor, event_id, participation_id, body)
