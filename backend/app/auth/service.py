from dataclasses import dataclass
from datetime import timedelta
import hashlib
import logging
import re
import secrets
from uuid import UUID

from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Request, Response
from sqlalchemy import select, update
from sqlalchemy.orm import Session as DBSession

from app.auth.models import AuditEvent, Business, BusinessMembership, EventMembership, PasswordCredential, Session, User, utcnow
from app.auth.problems import AuthProblem
from app.auth.schemas import CurrentActor
from app.database import SessionLocal
from app.settings import Settings


COOKIE = "eventapp_session"
LIFETIME = 604800
hasher = PasswordHasher(type=Type.ID)
logger = logging.getLogger(__name__)


def verify(verifier: str, password: str) -> bool:
    try:
        return hasher.verify(verifier, password)
    except (VerificationError, InvalidHashError):
        return False


def audit(db: DBSession, action: str, user_id: UUID | None, outcome="success", resource_id: UUID | None = None):
    db.add(AuditEvent(action=action, user_id=user_id, outcome=outcome, resource_id=resource_id))


def audit_denial(action: str):
    # The rejected mutation has rolled back; audit failure must preserve its original error.
    try:
        with SessionLocal.begin() as db:
            audit(db, action, None, "denied")
    except Exception:
        logger.warning("Authentication audit could not be recorded.")


def digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def presented_session(db: DBSession, request: Request) -> Session | None:
    token = request.cookies.get(COOKIE, "")
    if not re.fullmatch(r"[A-Za-z0-9_-]{43}", token):
        return None
    return db.scalar(select(Session).where(Session.token_hash == digest(token)))


def fresh_session(db: DBSession, request: Request, user_id: UUID) -> str:
    now = utcnow()
    previous = presented_session(db, request)
    if previous is not None:
        previous.revoked_at = now
    token = secrets.token_urlsafe(32)
    db.add(Session(user_id=user_id, token_hash=digest(token), created_at=now,
                   last_used_at=now, expires_at=now + timedelta(seconds=LIFETIME)))
    return token


def set_cookie(response: Response, token: str, max_age: int = LIFETIME):
    response.set_cookie(COOKIE, token, max_age=max_age, httponly=True, secure=Settings().environment != "development", samesite="lax", path="/")


def actor(db: DBSession, user: User, credential: PasswordCredential) -> CurrentActor:
    events = []
    businesses = []
    if user.role == "organiser":
        events = [{"eventId": m.event_id} for m in db.scalars(select(EventMembership).where(
            EventMembership.user_id == user.id, EventMembership.status == "active",
            EventMembership.role == "organiser").order_by(EventMembership.event_id))]
    if user.role == "business":
        businesses = [{"businessId": business.id, "businessName": business.name} for business in db.scalars(
            select(Business).join(BusinessMembership).where(
                BusinessMembership.user_id == user.id, BusinessMembership.status == "active",
                BusinessMembership.membership_role == "owner").order_by(Business.id))]
    return CurrentActor(id=user.id, username=user.username, displayName=user.display_name,
                        role=user.role, mustChangePassword=credential.must_change_password,
                        eventMemberships=events, businessMemberships=businesses)


@dataclass
class AuthContext:
    user: User
    credential: PasswordCredential
    session: Session


def authenticate(db: DBSession, request: Request) -> AuthContext:
    current = presented_session(db, request)
    if current is None or current.revoked_at is not None or utcnow() >= current.expires_at:
        raise AuthProblem("unauthenticated")
    user = db.get(User, current.user_id)
    credential = db.get(PasswordCredential, current.user_id)
    if user is None or credential is None:
        raise AuthProblem("unauthenticated")
    return AuthContext(user, credential, current)


def revoke_others(db: DBSession, context: AuthContext):
    db.execute(update(Session).where(Session.user_id == context.user.id, Session.id != context.session.id,
                                    Session.revoked_at.is_(None)).values(revoked_at=utcnow()))
