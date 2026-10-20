from datetime import timezone
import re
from uuid import UUID

from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.models import AuditEvent, Event, utcnow
from app.programme import models, schemas
from app.programme.problems import ProgrammeProblem, field_errors, invalid, missing


def facts(row, schema):
    values = {}
    for key in schema.model_fields:
        attribute = re.sub(r"(?<!^)(?=[A-Z])", "_", key).lower()
        value = getattr(row, attribute)
        values[key] = value.astimezone(timezone.utc) if hasattr(value, "astimezone") else value
    return schema.model_validate(values)


def page(db, statement, schema, limit, offset):
    total = db.scalar(select(func.count()).select_from(statement.order_by(None).subquery()))
    rows = db.scalars(statement.limit(limit).offset(offset)).all()
    return {"items": [facts(row, schema) for row in rows], "total": total, "limit": limit, "offset": offset}


def event(db: Session, event_id: UUID, lock=False):
    query = select(Event).where(Event.id == event_id)
    if lock:
        # Every programme writer takes this lock before any parent or item lock.
        query = query.with_for_update().execution_options(populate_existing=True)
    result = db.scalar(query)
    if result is None:
        raise missing()
    return result


def resource(db, model, event_id, identifier, lock=False):
    query = select(model).where(model.id == identifier, model.event_id == event_id)
    if lock:
        query = query.with_for_update().execution_options(populate_existing=True)
    result = db.scalar(query)
    if result is None:
        raise missing()
    return result


def location(db, event_id, room_id, input_reference=False):
    room = db.scalar(select(models.Room).where(models.Room.id == room_id, models.Room.event_id == event_id))
    if room is None:
        if input_reference:
            raise invalid({"roomId": ["Choose a room belonging to this event."]})
        raise missing()
    venue = resource(db, models.Venue, event_id, room.venue_id, True)
    room = resource(db, models.Room, event_id, room.id, True)
    return venue, room


def locked_item(db, event_id, item_id, replacement_room_id=None):
    current_event = event(db, event_id, True)
    item = resource(db, models.ProgrammeItem, event_id, item_id)
    room_ids = {item.room_id}
    if replacement_room_id is not None:
        room_ids.add(replacement_room_id)
    rooms = []
    for room_id in sorted(room_ids):
        room = db.scalar(select(models.Room).where(models.Room.event_id == event_id, models.Room.id == room_id))
        if room is None:
            raise invalid({"roomId": ["Choose a room belonging to this event."]})
        rooms.append(room)
    venues = {room.venue_id for room in rooms}
    for venue_id in sorted(venues):
        resource(db, models.Venue, event_id, venue_id, True)
    for room_id in sorted(room_ids):
        resource(db, models.Room, event_id, room_id, True)
    item = resource(db, models.ProgrammeItem, event_id, item_id, True)
    room = next(room for room in rooms if room.id == (replacement_room_id or item.room_id))
    venue = resource(db, models.Venue, event_id, room.venue_id)
    return current_event, venue, room, item


def revision(row, expected, draft=False):
    if row.revision != expected or (draft and row.state != "draft"):
        raise ProgrammeProblem()


def replace(row, body):
    for key, value in body.model_dump(exclude={"expectedRevision"}).items():
        setattr(row, re.sub(r"(?<!^)(?=[A-Z])", "_", key).lower(), value)
    row.revision += 1
    row.updated_at = utcnow()


def values(body):
    return {re.sub(r"(?<!^)(?=[A-Z])", "_", key).lower(): value for key, value in body.model_dump().items()}


def findings(current_event, room, body):
    errors = {}
    if body.endsAt <= body.startsAt:
        errors["endsAt"] = ["End must follow start."]
    if body.startsAt < current_event.starts_at or body.startsAt > current_event.ends_at:
        errors["startsAt"] = ["Start must be within the event."]
    if body.endsAt > current_event.ends_at or body.endsAt < current_event.starts_at:
        errors["endsAt"] = ["End must be within the event."]
    if body.capacity > room.max_capacity:
        errors["capacity"] = ["Capacity exceeds the room maximum."]
    return errors


def stored_findings(current_event, room, item):
    stored = facts(item, schemas.ProgrammeItem).model_dump(mode="json")
    try:
        body = schemas.ItemFields.model_validate({key: stored[key] for key in schemas.ItemFields.model_fields})
    except ValidationError as exc:
        return field_errors(exc.errors())
    return findings(current_event, room, body)


def published_reference(db, event_id, venue_id=None, room_id=None):
    statement = select(models.ProgrammeItem.id).where(models.ProgrammeItem.event_id == event_id, models.ProgrammeItem.state == "published")
    if room_id is not None:
        statement = statement.where(models.ProgrammeItem.room_id == room_id)
    if venue_id is not None:
        statement = statement.join(models.Room, models.Room.id == models.ProgrammeItem.room_id).where(models.Room.venue_id == venue_id)
    return db.scalar(statement.limit(1)) is not None


def publish(db, current_event, venue, room, item, actor_id):
    errors = stored_findings(current_event, room, item)
    if errors:
        raise invalid(errors)
    now = utcnow()
    item.state, item.published_at, item.updated_at = "published", now, now
    item.revision += 1
    db.flush()
    stored = facts(item, schemas.ProgrammeItem).model_dump()
    snapshot = schemas.PublishedProgramme.model_validate({
        **stored, "event": facts(current_event, schemas.EventFacts),
        "venue": facts(venue, schemas.VenueFacts), "room": facts(room, schemas.RoomFacts),
    }).model_dump(mode="json")
    db.add(models.ProgrammeItemRevision(event_id=item.event_id, item_id=item.id, revision=item.revision,
                                      snapshot=snapshot, actor_user_id=actor_id, occurred_at=now))
    db.add(AuditEvent(user_id=actor_id, action="programme_publish", resource_id=item.id, outcome="success", occurred_at=now))
    db.commit()
    return facts(item, schemas.ProgrammeItem)


def visible_event(db, event_id):
    if db.scalar(select(models.ProgrammeItemRevision.id).where(models.ProgrammeItemRevision.event_id == event_id).limit(1)) is None:
        raise missing()
