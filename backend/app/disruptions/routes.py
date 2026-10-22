from uuid import UUID

from sqlalchemy import func, select

from app.disruptions import models, notifications, schemas, service
from app.programme import schemas as programme_schemas, service as programme
from app.programme.problems import missing
from app.programme.routes import A, O, APIRouter, Attendee, DB, ERROR_RESPONSES, Limit, Offset, Organiser


router = APIRouter(prefix="/api/v1", tags=["Disruptions"], responses=ERROR_RESPONSES)


@router.post(O + "/programme-items/{item_id}/changes", response_model=programme_schemas.ProgrammeItem)
def change(event_id: UUID, item_id: UUID, body: schemas.ChangeRequest, db: DB, actor: Organiser):
    return service.change_item(db, event_id, item_id, body, actor.id)


@router.post(O + "/programme-items/{item_id}/cancel", response_model=programme_schemas.ProgrammeItem)
def cancel(event_id: UUID, item_id: UUID, body: schemas.CancelRequest, db: DB, actor: Organiser):
    return service.change_item(db, event_id, item_id, body, actor.id, cancel=True)


@router.get(O + "/programme-items/{item_id}/changes", response_model=programme_schemas.Page[schemas.Change])
def history(event_id: UUID, item_id: UUID, db: DB, actor: Organiser, limit: Limit = 50, offset: Offset = 0):
    programme.resource(db, service.programme_models.ProgrammeItem, event_id, item_id)
    return programme.page(db, select(models.ProgrammeChange).where(models.ProgrammeChange.event_id == event_id,
        models.ProgrammeChange.item_id == item_id).order_by(models.ProgrammeChange.to_revision.desc(), models.ProgrammeChange.id), schemas.Change, limit, offset)


def announcement_page(db, query, limit, offset):
    total = db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
    rows = db.scalars(query.order_by(models.AnnouncementDraft.created_at, models.AnnouncementDraft.id).limit(limit).offset(offset))
    return {"items": [service.announcement(db, row) for row in rows], "total": total, "limit": limit, "offset": offset}


@router.post(O + "/announcements", status_code=201, response_model=schemas.Announcement)
def create(event_id: UUID, body: schemas.CreateDraft, db: DB, actor: Organiser):
    row = service.create_draft(db, event_id, actor.id, body.changeId, body.body)
    db.commit()
    return service.announcement(db, row)


@router.get(O + "/announcements", response_model=programme_schemas.Page[schemas.Announcement])
def own_announcements(event_id: UUID, db: DB, actor: Organiser, limit: Limit = 50, offset: Offset = 0):
    return announcement_page(db, select(models.AnnouncementDraft).where(models.AnnouncementDraft.event_id == event_id,
        models.AnnouncementDraft.owner_user_id == actor.id), limit, offset)


@router.get(O + "/announcements/{announcement_id}", response_model=schemas.Announcement)
def own_announcement(event_id: UUID, announcement_id: UUID, db: DB, actor: Organiser):
    return service.announcement(db, service.owned_draft(db, event_id, announcement_id, actor.id))


@router.patch(O + "/announcements/{announcement_id}", response_model=schemas.Announcement)
def edit(event_id: UUID, announcement_id: UUID, body: schemas.EditDraft, db: DB, actor: Organiser):
    return service.edit_draft(db, service.owned_draft(db, event_id, announcement_id, actor.id, True), body)


@router.post(O + "/announcements/{announcement_id}/preview", response_model=schemas.Preview)
def preview(event_id: UUID, announcement_id: UUID, body: schemas.PreviewRequest, db: DB, actor: Organiser):
    return service.preview_draft(db, service.owned_draft(db, event_id, announcement_id, actor.id, True), body.expectedRevision)


@router.post(O + "/announcements/{announcement_id}/publish", response_model=schemas.Announcement)
def publish(event_id: UUID, announcement_id: UUID, body: schemas.PublishRequest, db: DB, actor: Organiser):
    return service.publish_draft(db, service.owned_draft(db, event_id, announcement_id, actor.id, True), body.previewId)


@router.get(A + "/announcements", response_model=programme_schemas.Page[schemas.Announcement])
def public_announcements(event_id: UUID, db: DB, actor: Attendee, limit: Limit = 50, offset: Offset = 0):
    programme.visible_event(db, event_id)
    return announcement_page(db, select(models.AnnouncementDraft).where(models.AnnouncementDraft.event_id == event_id,
        models.AnnouncementDraft.state == "published"), limit, offset)


@router.get(A + "/announcements/{announcement_id}", response_model=schemas.Announcement)
def public_announcement(event_id: UUID, announcement_id: UUID, db: DB, actor: Attendee):
    programme.visible_event(db, event_id)
    row = db.scalar(select(models.AnnouncementDraft).where(models.AnnouncementDraft.id == announcement_id,
        models.AnnouncementDraft.event_id == event_id, models.AnnouncementDraft.state == "published"))
    if row is None:
        raise missing()
    return service.announcement(db, row)


def notification_view(db, row):
    change = db.get(models.ProgrammeChange, row.change_id)
    return {"id": row.id, "eventId": row.event_id, "itemId": change.item_id,
            "readAt": row.read_at, "createdAt": row.created_at, "change": service.source_facts(change)}


@router.get("/attendee/notifications", response_model=programme_schemas.Page[schemas.Notification])
def notification_list(db: DB, actor: Attendee, limit: Limit = 50, offset: Offset = 0):
    notifications.require_ready()
    query = select(models.AttendeeNotification).where(models.AttendeeNotification.recipient_user_id == actor.id)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(query.order_by(models.AttendeeNotification.created_at.desc(), models.AttendeeNotification.id).limit(limit).offset(offset))
    return {"items": [notification_view(db, row) for row in rows], "total": total, "limit": limit, "offset": offset}


def owned_notification(db, identifier, owner_id, lock=False):
    query = select(models.AttendeeNotification).where(models.AttendeeNotification.id == identifier,
        models.AttendeeNotification.recipient_user_id == owner_id)
    if lock:
        query = query.with_for_update()
    row = db.scalar(query)
    if row is None:
        raise missing()
    return row


@router.get("/attendee/notifications/{notification_id}", response_model=schemas.Notification)
def notification_detail(notification_id: UUID, db: DB, actor: Attendee):
    notifications.require_ready()
    return notification_view(db, owned_notification(db, notification_id, actor.id))


@router.post("/attendee/notifications/{notification_id}/read", response_model=schemas.Notification)
def notification_read(notification_id: UUID, db: DB, actor: Attendee):
    notifications.require_ready()
    row = owned_notification(db, notification_id, actor.id, True)
    if row.read_at is None:
        row.read_at = service.utcnow()
    db.commit()
    return notification_view(db, row)
