from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_workspace
from app.auth.schemas import CurrentActor
from app.database import get_db
from app.preparation import service
from app.preparation.problems import PreparationError
from app.preparation.schemas import PreparationProblem, PreparationView, ReplacePreparation


router = APIRouter(prefix="/api/v1/business/participations", tags=["Business preparation"], responses={
    status: {"model": PreparationProblem, "content": {"application/problem+json": {}}}
    for status in (401, 403, 404, 409, 422, 500, 503)})
DB = Annotated[Session, Depends(get_db)]
Owner = Annotated[CurrentActor, Depends(require_workspace("business"))]


def command(db, operation, *args):
    try:
        result = operation(db, *args)
        db.commit()
        return result
    except Exception:
        db.rollback()
        raise


@router.get("/{participationId}/preparation", response_model=PreparationView)
def get(participationId: UUID, actor: Owner, db: DB):
    return service.get_preparation(db, actor, participationId)


@router.put("/{participationId}/preparation", response_model=PreparationView)
def replace(participationId: UUID, body: ReplacePreparation, actor: Owner, db: DB):
    return command(db, service.replace_preparation, actor, participationId, body)
