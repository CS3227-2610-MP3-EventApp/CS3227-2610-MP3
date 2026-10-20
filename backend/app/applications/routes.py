from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import completed, get_current_actor, require_workspace
from app.auth.problems import AuthProblem
from app.auth.schemas import CurrentActor
from app.database import get_db
from app.applications import service
from app.applications.schemas import (ApplicationEvent, ApplicationProblem, ApplicationSettings,
    BusinessApplication, CreateApplication, DecideApplication, OrganiserEventSummary,
    ReplaceApplication, SubmitApplication, UpdateApplicationSettings)


router = APIRouter(prefix="/api/v1", tags=["Business applications"], responses={
    status: {"model": ApplicationProblem, "content": {"application/problem+json": {}}}
    for status in (401, 403, 404, 405, 409, 410, 422, 500, 503)})
DB = Annotated[Session, Depends(get_db)]
Owner = Annotated[CurrentActor, Depends(require_workspace("business"))]
Organiser = Annotated[CurrentActor, Depends(require_workspace("organiser"))]


def command(db, operation, *args, **kwargs):
    try:
        result = operation(db, *args, **kwargs)
        db.commit()
        return result
    except Exception:
        db.rollback()
        raise


@router.post("/organiser/events/{eventId}/business-approvals")
def approve(eventId: UUID, actor: Organiser, db: DB):
    return service.retired_eligibility(db, actor, eventId)


@router.get("/organiser/events/{eventId}/business-approvals")
def approvals(eventId: UUID, actor: Organiser, db: DB):
    return service.retired_eligibility(db, actor, eventId)


@router.get("/organiser/events", response_model=list[OrganiserEventSummary])
def assigned_events(actor: Annotated[CurrentActor, Depends(get_current_actor)], db: DB):
    completed(actor)
    if actor.role != "organiser":
        raise AuthProblem("forbidden")
    return service.organiser_events(db, actor)


@router.get("/organiser/events/{eventId}/application-settings", response_model=ApplicationSettings)
def application_settings(eventId: UUID, actor: Organiser, db: DB):
    return service.get_settings(db, actor, eventId)


@router.put("/organiser/events/{eventId}/application-settings", response_model=ApplicationSettings)
def save_application_settings(eventId: UUID, body: UpdateApplicationSettings, actor: Organiser, db: DB):
    return command(db, service.update_settings, actor, eventId, body)


@router.get("/business/application-events", response_model=list[ApplicationEvent])
def events(actor: Owner, db: DB, businessId: Annotated[UUID, Query()]):
    return service.application_events(db, actor, businessId)


@router.get("/business/applications", response_model=list[BusinessApplication])
def applications(actor: Owner, db: DB, businessId: Annotated[UUID, Query()]):
    return service.list_own(db, actor, businessId)


@router.post("/business/applications", status_code=201, response_model=BusinessApplication)
def create(body: CreateApplication, actor: Owner, db: DB):
    return command(db, service.create_application, actor, body)


@router.get("/business/applications/{applicationId}", response_model=BusinessApplication)
def detail(applicationId: UUID, actor: Owner, db: DB):
    return service.projection(db, *service.own_application(db, actor, applicationId))


@router.put("/business/applications/{applicationId}", response_model=BusinessApplication)
def replace(applicationId: UUID, body: ReplaceApplication, actor: Owner, db: DB):
    return command(db, service.mutate_application, actor, applicationId, body)


@router.post("/business/applications/{applicationId}/submit", response_model=BusinessApplication)
def submit(applicationId: UUID, body: SubmitApplication, actor: Owner, db: DB):
    return command(db, service.mutate_application, actor, applicationId, body, submit=True)


@router.get("/organiser/events/{eventId}/applications", response_model=list[BusinessApplication])
def review_list(eventId: UUID, actor: Organiser, db: DB):
    return service.organiser_applications(db, actor, eventId)


@router.get("/organiser/events/{eventId}/applications/{applicationId}", response_model=BusinessApplication)
def review_detail(eventId: UUID, applicationId: UUID, actor: Organiser, db: DB):
    return service.organiser_applications(db, actor, eventId, applicationId)


@router.post("/organiser/events/{eventId}/applications/{applicationId}/decision", response_model=BusinessApplication)
def decide(eventId: UUID, applicationId: UUID, body: DecideApplication, actor: Organiser, db: DB):
    return command(db, service.decide_application, actor, eventId, applicationId, body)
