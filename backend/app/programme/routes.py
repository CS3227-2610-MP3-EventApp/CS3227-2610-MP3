from datetime import date as Date, timezone
import re
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import Date as SQLDate, DateTime, cast, exists, func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import require_event_membership, require_workspace
from app.auth.models import Event, EventMembership
from app.auth.schemas import CurrentActor
from app.database import get_db
from app.programme import models, schemas, service as svc
from app.programme.problems import ProgrammeProblem, invalid, missing


ERROR_RESPONSES = {status: {"model": schemas.ProgrammeProblem, "content": {"application/problem+json": {"schema": {"$ref": "#/components/schemas/ProgrammeProblem"}}}} for status in (401, 403, 404, 409, 422, 500, 503)}
router = APIRouter(prefix="/api/v1", tags=["Programme"], responses=ERROR_RESPONSES)
DB = Annotated[Session, Depends(get_db)]
Organiser = Annotated[CurrentActor, Depends(require_event_membership)]
OrganiserWorkspace = Annotated[CurrentActor, Depends(require_workspace("organiser"))]
Attendee = Annotated[CurrentActor, Depends(require_workspace("attendee"))]
Limit = Annotated[int, Query(ge=1, le=100)]
Offset = Annotated[int, Query(ge=0, le=2147483647)]
O = "/organiser/events/{event_id}"
A = "/attendee/events/{event_id}"


@router.get("/organiser/programme-events", response_model=schemas.Page[schemas.EventSummary])
def organiser_events(db: DB, actor: OrganiserWorkspace, limit: Limit = 50, offset: Offset = 0):
    query = select(Event).join(EventMembership).where(EventMembership.user_id == actor.id, EventMembership.status == "active", EventMembership.role == "organiser").order_by(Event.starts_at, Event.id)
    return svc.page(db, query, schemas.EventSummary, limit, offset)


@router.get(O + "/venues", response_model=schemas.Page[schemas.Venue])
def venues(event_id: UUID, db: DB, actor: Organiser, limit: Limit = 50, offset: Offset = 0):
    return svc.page(db, select(models.Venue).where(models.Venue.event_id == event_id).order_by(models.Venue.name, models.Venue.id), schemas.Venue, limit, offset)


@router.post(O + "/venues", status_code=201, response_model=schemas.Venue)
def create_venue(event_id: UUID, body: schemas.VenueFields, db: DB, actor: Organiser):
    svc.event(db, event_id, True)
    row = models.Venue(event_id=event_id, **svc.values(body))
    db.add(row)
    db.commit()
    return svc.facts(row, schemas.Venue)


@router.patch(O + "/venues/{venue_id}", response_model=schemas.Venue)
def update_venue(event_id: UUID, venue_id: UUID, body: schemas.VenueReplacement, db: DB, actor: Organiser):
    svc.event(db, event_id, True)
    row = svc.resource(db, models.Venue, event_id, venue_id, True)
    svc.revision(row, body.expectedRevision)
    if svc.published_reference(db, event_id, venue_id=venue_id):
        raise ProgrammeProblem()
    svc.replace(row, body)
    db.commit()
    return svc.facts(row, schemas.Venue)


@router.delete(O + "/venues/{venue_id}", status_code=204)
def delete_venue(event_id: UUID, venue_id: UUID, body: schemas.RevisionRequest, db: DB, actor: Organiser):
    svc.event(db, event_id, True)
    row = svc.resource(db, models.Venue, event_id, venue_id, True)
    svc.revision(row, body.expectedRevision)
    if db.scalar(select(models.Room.id).where(models.Room.event_id == event_id, models.Room.venue_id == venue_id).limit(1)):
        raise ProgrammeProblem()
    db.delete(row)
    db.commit()
    return Response(status_code=204)


@router.post(O + "/venues/{venue_id}/rooms", status_code=201, response_model=schemas.Room)
def create_room(event_id: UUID, venue_id: UUID, body: schemas.RoomFields, db: DB, actor: Organiser):
    svc.event(db, event_id, True)
    svc.resource(db, models.Venue, event_id, venue_id, True)
    row = models.Room(event_id=event_id, venue_id=venue_id, **svc.values(body))
    db.add(row)
    db.commit()
    return svc.facts(row, schemas.Room)


@router.get(O + "/rooms", response_model=schemas.Page[schemas.Room])
def rooms(event_id: UUID, db: DB, actor: Organiser, venueId: UUID | None = None, limit: Limit = 50, offset: Offset = 0):
    query = select(models.Room).where(models.Room.event_id == event_id)
    if venueId is not None:
        svc.resource(db, models.Venue, event_id, venueId)
        query = query.where(models.Room.venue_id == venueId)
    return svc.page(db, query.order_by(models.Room.name, models.Room.id), schemas.Room, limit, offset)


@router.patch(O + "/rooms/{room_id}", response_model=schemas.Room)
def update_room(event_id: UUID, room_id: UUID, body: schemas.RoomReplacement, db: DB, actor: Organiser):
    svc.event(db, event_id, True)
    _, row = svc.location(db, event_id, room_id)
    svc.revision(row, body.expectedRevision)
    if svc.published_reference(db, event_id, room_id=room_id) or db.scalar(select(models.ProgrammeItem.id).where(models.ProgrammeItem.room_id == room_id, models.ProgrammeItem.capacity > body.maxCapacity).limit(1)):
        raise ProgrammeProblem()
    svc.replace(row, body)
    db.commit()
    return svc.facts(row, schemas.Room)


@router.delete(O + "/rooms/{room_id}", status_code=204)
def delete_room(event_id: UUID, room_id: UUID, body: schemas.RevisionRequest, db: DB, actor: Organiser):
    svc.event(db, event_id, True)
    _, row = svc.location(db, event_id, room_id)
    svc.revision(row, body.expectedRevision)
    if db.scalar(select(models.ProgrammeItem.id).where(models.ProgrammeItem.room_id == room_id).limit(1)):
        raise ProgrammeProblem()
    db.delete(row)
    db.commit()
    return Response(status_code=204)


@router.get(O + "/programme-items", response_model=schemas.Page[schemas.ProgrammeItem])
def items(event_id: UUID, db: DB, actor: Organiser, state: schemas.ItemState | None = None, limit: Limit = 50, offset: Offset = 0):
    query = select(models.ProgrammeItem).where(models.ProgrammeItem.event_id == event_id)
    if state is not None:
        query = query.where(models.ProgrammeItem.state == state)
    return svc.page(db, query.order_by(models.ProgrammeItem.starts_at, models.ProgrammeItem.id), schemas.ProgrammeItem, limit, offset)


@router.post(O + "/programme-items", status_code=201, response_model=schemas.ProgrammeItem)
def create_item(event_id: UUID, body: schemas.ItemFields, db: DB, actor: Organiser):
    current_event = svc.event(db, event_id, True)
    _, room = svc.location(db, event_id, body.roomId, True)
    errors = svc.findings(current_event, room, body)
    if errors:
        raise invalid(errors)
    row = models.ProgrammeItem(event_id=event_id, **svc.values(body))
    db.add(row)
    db.commit()
    return svc.facts(row, schemas.ProgrammeItem)


@router.get(O + "/programme-items/{item_id}", response_model=schemas.ProgrammeItem)
def item_detail(event_id: UUID, item_id: UUID, db: DB, actor: Organiser):
    return svc.facts(svc.resource(db, models.ProgrammeItem, event_id, item_id), schemas.ProgrammeItem)


@router.patch(O + "/programme-items/{item_id}", response_model=schemas.ProgrammeItem)
def update_item(event_id: UUID, item_id: UUID, body: schemas.ItemReplacement, db: DB, actor: Organiser):
    current_event, _, room, row = svc.locked_item(db, event_id, item_id, body.roomId)
    svc.revision(row, body.expectedRevision, True)
    errors = svc.findings(current_event, room, body)
    if errors:
        raise invalid(errors)
    svc.replace(row, body)
    db.commit()
    return svc.facts(row, schemas.ProgrammeItem)


@router.delete(O + "/programme-items/{item_id}", status_code=204)
def delete_item(event_id: UUID, item_id: UUID, body: schemas.RevisionRequest, db: DB, actor: Organiser):
    _, _, _, row = svc.locked_item(db, event_id, item_id)
    svc.revision(row, body.expectedRevision, True)
    db.delete(row)
    db.commit()
    return Response(status_code=204)


@router.post(O + "/programme-items/{item_id}/validate", response_model=schemas.ValidationResult)
def validate_item(event_id: UUID, item_id: UUID, body: schemas.RevisionRequest, db: DB, actor: Organiser):
    current_event, _, room, row = svc.locked_item(db, event_id, item_id)
    svc.revision(row, body.expectedRevision)
    errors = svc.stored_findings(current_event, room, row)
    return {"itemId": row.id, "revision": row.revision, "valid": not errors, "errors": errors}


@router.post(O + "/programme-items/{item_id}/publish", response_model=schemas.ProgrammeItem)
def publish_item(event_id: UUID, item_id: UUID, body: schemas.RevisionRequest, db: DB, actor: Organiser):
    current_event, venue, room, row = svc.locked_item(db, event_id, item_id)
    svc.revision(row, body.expectedRevision, True)
    return svc.publish(db, current_event, venue, room, row, actor.id)


@router.get(O + "/programme-items/{item_id}/publication", response_model=schemas.PublicationAudit)
def publication(event_id: UUID, item_id: UUID, db: DB, actor: Organiser):
    row = db.scalar(select(models.ProgrammeItemRevision).where(models.ProgrammeItemRevision.event_id == event_id, models.ProgrammeItemRevision.item_id == item_id))
    if row is None:
        raise missing()
    return {"itemId": row.item_id, "revision": row.revision, "actorUserId": row.actor_user_id, "occurredAt": row.occurred_at.astimezone(timezone.utc)}


@router.get("/attendee/events", response_model=schemas.Page[schemas.EventSummary])
def attendee_events(db: DB, actor: Attendee, limit: Limit = 50, offset: Offset = 0):
    query = select(Event).where(exists().where(models.ProgrammeItemRevision.event_id == Event.id)).order_by(Event.starts_at, Event.id)
    return svc.page(db, query, schemas.EventSummary, limit, offset)


@router.get(A + "/programme", response_model=schemas.Page[schemas.PublishedProgramme])
def published_items(event_id: UUID, db: DB, actor: Attendee, q: Annotated[str | None, Query(max_length=200)] = None,
                    type: schemas.ItemType | None = None, date: str | None = None, limit: Limit = 50, offset: Offset = 0):
    svc.visible_event(db, event_id)
    day = None
    if date is not None:
        try:
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
                raise ValueError()
            day = Date.fromisoformat(date)
        except ValueError:
            raise invalid({"date": ["Use a valid YYYY-MM-DD date."]}) from None
    query = select(models.ProgrammeItemRevision).where(models.ProgrammeItemRevision.event_id == event_id)
    if q and q.strip():
        query = query.where(models.ProgrammeItemRevision.snapshot["title"].astext.icontains(q.strip(), autoescape=True))
    if type is not None:
        query = query.where(models.ProgrammeItemRevision.snapshot["type"].astext == type)
    start = cast(models.ProgrammeItemRevision.snapshot["startsAt"].astext, DateTime(timezone=True))
    if day is not None:
        zone = models.ProgrammeItemRevision.snapshot["event"]["timezone"].astext
        query = query.where(cast(func.timezone(zone, start), SQLDate) == day)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(query.order_by(start, models.ProgrammeItemRevision.item_id).limit(limit).offset(offset))
    return {"items": [row.snapshot for row in rows], "total": total, "limit": limit, "offset": offset}


@router.get(A + "/programme/{item_id}", response_model=schemas.PublishedProgramme)
def published_detail(event_id: UUID, item_id: UUID, db: DB, actor: Attendee):
    svc.visible_event(db, event_id)
    row = db.scalar(select(models.ProgrammeItemRevision).where(models.ProgrammeItemRevision.event_id == event_id, models.ProgrammeItemRevision.item_id == item_id))
    if row is None:
        raise missing()
    return row.snapshot
