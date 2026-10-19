import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.dependencies import cookie_auth, get_current_actor
from app.auth.models import Business, BusinessMembership, PasswordCredential, User, utcnow
from app.auth.problems import AuthProblem
from app.auth.schemas import AttendeeRegistration, BusinessRegistration, CurrentActor, LoginRequest, PasswordChangeRequest, Problem
from app.auth.service import COOKIE, actor, audit, audit_denial, authenticate, digest, fresh_session, hasher, presented_session, revoke_others, set_cookie, verify
from app.database import get_db
from app.settings import Settings


ERROR_RESPONSES = {status: {"model": Problem, "content": {"application/problem+json": {"schema": {"$ref": "#/components/schemas/Problem"}}}} for status in (401, 403, 409, 422, 500, 503)}
router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"], responses=ERROR_RESPONSES)
DB = Annotated[Session, Depends(get_db)]


def register(body: AttendeeRegistration, request: Request, response: Response, db: Session, role: str):
    user = User(username=body.username, email=body.email, display_name=body.displayName, role=role)
    try:
        db.add(user)
        db.flush()
        credential = PasswordCredential(user_id=user.id, password_hash=hasher.hash(body.password.get_secret_value()), must_change_password=False)
        db.add(credential)
        if isinstance(body, BusinessRegistration):
            business = Business(name=body.businessName, normalized_name=body.businessName.casefold())
            db.add(business)
            db.flush()
            db.add(BusinessMembership(user_id=user.id, business_id=business.id))
        token = fresh_session(db, request, user.id)
        audit(db, "registration", user.id, resource_id=user.id)
        db.flush()
        result = actor(db, user, credential)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if getattr(exc.orig, "sqlstate", None) == "23505":
            audit_denial("registration")
            raise AuthProblem("registration_conflict") from None
        raise
    set_cookie(response, token)
    return result


@router.post("/register/attendee", status_code=201, response_model=CurrentActor)
def register_attendee(body: AttendeeRegistration, request: Request, response: Response, db: DB):
    return register(body, request, response, db, "attendee")


@router.post("/register/business", status_code=201, response_model=CurrentActor)
def register_business(body: BusinessRegistration, request: Request, response: Response, db: DB):
    return register(body, request, response, db, "business")


@router.post("/login", response_model=CurrentActor)
def login(body: LoginRequest, request: Request, response: Response, db: DB):
    identifier = body.identifier.strip().casefold()
    field = User.email if "@" in identifier else User.username
    user = db.scalar(select(User).where(field == identifier).with_for_update())
    credential = db.get(PasswordCredential, user.id) if user else None
    if not credential or not verify(credential.password_hash, body.password.get_secret_value()) or user.role != body.role:
        audit(db, "login", user.id if user else None, "denied")
        db.commit()
        raise AuthProblem("invalid_credentials")
    token = fresh_session(db, request, user.id)
    audit(db, "login", user.id, resource_id=user.id)
    db.flush()
    result = actor(db, user, credential)
    db.commit()
    set_cookie(response, token)
    return result


@router.get("/me", response_model=CurrentActor)
def me(current: Annotated[CurrentActor, Depends(get_current_actor)]):
    return current


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: DB):
    current = presented_session(db, request)
    now = utcnow()
    if current is not None and current.revoked_at is None and now < current.expires_at:
        current.revoked_at = now
        audit(db, "logout", current.user_id, resource_id=current.user_id)
        db.commit()
    response.delete_cookie(COOKIE, path="/", secure=Settings().environment != "development", httponly=True, samesite="lax")


@router.post("/change-password", response_model=CurrentActor, dependencies=[Depends(cookie_auth)])
def change_password(body: PasswordChangeRequest, request: Request, response: Response, db: DB):
    context = authenticate(db, request)
    # Serialize password replacement with logins and other replacements for this identity.
    db.scalar(select(User).where(User.id == context.user.id).with_for_update())
    credential = db.scalar(select(PasswordCredential).where(PasswordCredential.user_id == context.user.id).execution_options(populate_existing=True))
    db.refresh(context.session)
    if context.session.token_hash != digest(request.cookies.get(COOKIE, "")) or context.session.revoked_at is not None or utcnow() >= context.session.expires_at:
        raise AuthProblem("unauthenticated")
    if not verify(credential.password_hash, body.currentPassword.get_secret_value()):
        audit(db, "password_change", context.user.id, "denied", context.user.id)
        db.commit()
        raise AuthProblem("invalid_credentials")
    now = utcnow()
    credential.password_hash = hasher.hash(body.newPassword.get_secret_value())
    credential.must_change_password = False
    credential.updated_at = now
    context.user.updated_at = now
    revoke_others(db, context)
    token = secrets.token_urlsafe(32)
    context.session.token_hash = digest(token)
    context.session.last_used_at = now
    audit(db, "password_change", context.user.id, resource_id=context.user.id)
    result = actor(db, context.user, credential)
    db.commit()
    set_cookie(response, token, max_age=max(0, int((context.session.expires_at - now).total_seconds())))
    return result
