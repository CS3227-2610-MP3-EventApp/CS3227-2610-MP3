"""Trusted local operator provisioning; credentials are read only with getpass."""
import argparse
from datetime import datetime
import getpass
import sys
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import or_, select

from app.auth.models import Event, EventMembership, PasswordCredential, User
from app.auth.schemas import AttendeeRegistration, DisplayName, Email, Username
from app.auth.service import audit, audit_denial, hasher
from app.database import SessionLocal
from pydantic import TypeAdapter


def event_command(args):
    title = args.title.strip()
    if not 1 <= len(title) <= 200:
        raise ValueError()
    ZoneInfo(args.timezone)
    starts = datetime.fromisoformat(args.starts_at)
    ends = datetime.fromisoformat(args.ends_at)
    if starts.tzinfo is None or starts.utcoffset() is None or ends.tzinfo is None or ends.utcoffset() is None or ends <= starts:
        raise ValueError()
    with SessionLocal.begin() as db:
        event = db.get(Event, args.id)
        if event is not None:
            if (event.title, event.timezone, event.starts_at, event.ends_at) != (title, args.timezone, starts, ends):
                raise ValueError()
            return
        db.add(Event(id=args.id, title=title, timezone=args.timezone, starts_at=starts, ends_at=ends))
        audit(db, "event_provision", None, resource_id=args.id)


def organiser_command(args):
    username = TypeAdapter(Username).validate_python(args.username)
    email = TypeAdapter(Email).validate_python(args.email)
    display_name = TypeAdapter(DisplayName).validate_python(args.display_name)
    event_ids = set(args.event_id)
    with SessionLocal.begin() as db:
        if set(db.scalars(select(Event.id).where(Event.id.in_(event_ids)))) != event_ids:
            raise ValueError()
        matches = list(db.scalars(select(User).where(or_(User.username == username, User.email == email)).with_for_update()))
        if matches:
            if len(matches) != 1:
                raise ValueError()
            user = matches[0]
            if (user.username, user.email, user.display_name, user.role) != (username, email, display_name, "organiser"):
                raise ValueError()
            existing = set(db.scalars(select(EventMembership.event_id).where(EventMembership.user_id == user.id)))
        else:
            password = getpass.getpass("Initial password: ")
            repeated = getpass.getpass("Repeat initial password: ")
            if password != repeated:
                raise ValueError()
            validated = AttendeeRegistration(username=username, email=email, displayName=display_name, password=password)
            user = User(username=username, email=email, display_name=display_name, role="organiser")
            db.add(user)
            db.flush()
            db.add(PasswordCredential(user_id=user.id, password_hash=hasher.hash(validated.password.get_secret_value()), must_change_password=True))
            existing = set()
        missing = event_ids - existing
        for event_id in missing:
            db.add(EventMembership(user_id=user.id, event_id=event_id))
        if not matches or missing:
            audit(db, "organiser_provision", user.id, resource_id=user.id)


def main() -> int:
    parser = argparse.ArgumentParser(description="Provision EventApp events and organisers")
    commands = parser.add_subparsers(dest="command", required=True)
    event = commands.add_parser("event")
    event.add_argument("--id", type=UUID, required=True)
    for option in ("title", "timezone", "starts-at", "ends-at"):
        event.add_argument("--" + option, required=True)
    organiser = commands.add_parser("organiser")
    for option in ("username", "email", "display-name"):
        organiser.add_argument("--" + option, required=True)
    organiser.add_argument("--event-id", type=UUID, action="append", required=True)
    args = parser.parse_args()
    try:
        (event_command if args.command == "event" else organiser_command)(args)
    except (Exception, KeyboardInterrupt):
        if args.command == "organiser":
            audit_denial("organiser_provision")
        print("Provisioning could not be completed.", file=sys.stderr)
        return 1
    print("Provisioning completed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
