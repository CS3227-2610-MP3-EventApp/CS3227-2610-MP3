from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request
from fastapi.security import APIKeyCookie
from sqlalchemy.orm import Session

from app.auth.problems import AuthProblem
from app.auth.schemas import CurrentActor, Role
from app.auth.service import COOKIE, actor, authenticate
from app.database import get_db


cookie_auth = APIKeyCookie(name=COOKIE, auto_error=False)


def get_current_actor(request: Request, db: Annotated[Session, Depends(get_db)],
                      cookie: Annotated[str | None, Depends(cookie_auth)]) -> CurrentActor:
    context = authenticate(db, request)
    return actor(db, context.user, context.credential)


def completed(actor: CurrentActor):
    if actor.mustChangePassword:
        raise AuthProblem("password_change_required")


def require_workspace(role: Role):
    def guard(actor: Annotated[CurrentActor, Depends(get_current_actor)]) -> CurrentActor:
        completed(actor)
        if actor.role != role or (role == "organiser" and not actor.eventMemberships) or (role == "business" and not actor.businessMemberships):
            raise AuthProblem("forbidden")
        return actor
    return guard


def require_event_membership(event_id: UUID, actor: Annotated[CurrentActor, Depends(get_current_actor)]) -> CurrentActor:
    completed(actor)
    if actor.role != "organiser" or not any(m.eventId == event_id for m in actor.eventMemberships):
        raise AuthProblem("forbidden")
    return actor


def require_business_membership(business_id: UUID, actor: Annotated[CurrentActor, Depends(get_current_actor)]) -> CurrentActor:
    completed(actor)
    if actor.role != "business" or not any(m.businessId == business_id for m in actor.businessMemberships):
        raise AuthProblem("forbidden")
    return actor
