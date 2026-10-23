from datetime import timedelta
from hashlib import sha256
import json
from uuid import uuid4

from sqlalchemy import select

from app.ai.service import require_authority
from app.auth.models import AuditEvent, utcnow
from app.disruptions import models, notifications, schemas
from app.programme import models as programme_models, schemas as programme_schemas, service as programme
from app.programme.problems import ProgrammeProblem, invalid, missing


def snapshot(db, item):
    row = db.scalar(select(programme_models.ProgrammeItemRevision).where(
        programme_models.ProgrammeItemRevision.item_id == item.id,
        programme_models.ProgrammeItemRevision.revision == item.revision))
    if row is None:
        raise ProgrammeProblem()
    return dict(row.snapshot)


def change_item(db, event_id, item_id, body, actor_id, cancel=False):
    # Match worker lock order and retain current authority through the write.
    require_authority(db, actor_id, event_id)
    current_event, venue, room, item = programme.locked_item(db, event_id, item_id, None if cancel else body.roomId)
    programme.revision(item, body.expectedRevision)
    if item.state != "published":
        raise ProgrammeProblem()
    if not cancel:
        errors = programme.findings(current_event, room, body)
        if errors:
            raise invalid(errors)
        supplied = body.model_dump(include=set(programme_schemas.ItemFields.model_fields))
        current = programme.facts(item, programme_schemas.ProgrammeItem).model_dump(include=set(programme_schemas.ItemFields.model_fields))
        if supplied == current:
            raise invalid({"request": ["Change at least one programme field."]})
    selected = notifications.recipients(db, event_id, item_id)
    old_facts, old_revision = snapshot(db, item), item.revision
    now, change_id = utcnow(), uuid4()
    if cancel:
        item.state, item.cancelled_at = "cancelled", now
        item.cancellation_reason, item.cancelled_by_user_id = body.reason, actor_id
    else:
        import re
        for key, value in supplied.items():
            key = re.sub(r"(?<!^)(?=[A-Z])", "_", key).lower()
            setattr(item, key, value)
    item.revision += 1
    item.updated_at, item.last_change_id = now, change_id
    new_facts = programme_schemas.PublishedProgramme.model_validate({
        **programme.facts(item, programme_schemas.ProgrammeItem).model_dump(),
        "event": programme.facts(current_event, programme_schemas.EventFacts),
        "venue": programme.facts(venue, programme_schemas.VenueFacts),
        "room": programme.facts(room, programme_schemas.RoomFacts),
    }).model_dump(mode="json")
    change = models.ProgrammeChange(id=change_id, event_id=event_id, item_id=item_id,
        from_revision=old_revision, to_revision=item.revision, old_facts=old_facts, new_facts=new_facts,
        change_type="cancelled" if cancel else "updated", reason=body.reason, actor_user_id=actor_id,
        occurred_at=now, recipient_snapshot_status="blocked_f02" if selected is None else "snapshotted")
    # Insert the immutable change before updating the item's last-change foreign key.
    db.add(change)
    db.flush([change])
    db.add(programme_models.ProgrammeItemRevision(event_id=event_id, item_id=item_id,
        revision=item.revision, snapshot=new_facts, actor_user_id=actor_id, occurred_at=now))
    if selected is not None:
        for recipient in {record["recipient_user_id"]: record for record in selected}.values():
            db.add(models.AttendeeNotification(event_id=event_id, change_id=change_id,
                recipient_user_id=recipient["recipient_user_id"], accepted_revision_id=recipient["accepted_revision_id"],
                old_facts=old_facts, new_facts=new_facts, created_at=now, delivery_state="delivered"))
    db.add(AuditEvent(user_id=actor_id, action="programme_cancel" if cancel else "programme_change",
        resource_id=item_id, resource_revision=item.revision, outcome="success", occurred_at=now))
    db.commit()
    return programme.facts(item, programme_schemas.ProgrammeItem)


def source_change(db, event_id, change_id):
    return programme.resource(db, models.ProgrammeChange, event_id, change_id)


def assert_latest_source(db, change):
    item = programme.resource(db, programme_models.ProgrammeItem, change.event_id, change.item_id)
    if item.revision != change.to_revision or item.last_change_id != change.id:
        raise ProgrammeProblem(409, "source_stale", "The programme changed. Review its latest facts.")
    return change


def get_current_change(db, event_id, change_id, lock=True):
    if lock:
        programme.event(db, event_id, True)
    change = source_change(db, event_id, change_id)
    return assert_latest_source(db, change)


def source_facts(change):
    return {"changeId": str(change.id), "itemId": str(change.item_id), "fromRevision": change.from_revision,
        "toRevision": change.to_revision, "changeType": change.change_type, "reason": change.reason,
        "oldFacts": change.old_facts, "newFacts": change.new_facts}


def create_draft(db, event_id, owner_user_id, change_id, body):
    require_authority(db, owner_user_id, event_id)
    change = get_current_change(db, event_id, change_id)
    validated = schemas.CreateDraft(changeId=change_id, body=body)
    row = models.AnnouncementDraft(event_id=event_id, owner_user_id=owner_user_id, change_id=change_id,
        source_revision=change.to_revision, body=validated.body)
    db.add(row)
    db.flush()
    return row


def create_ai_draft(db, owner_id, event_id, change_id, body):
    return create_draft(db, event_id, owner_id, change_id, body)


def owned_draft(db, event_id, identifier, owner_id, lock=False):
    if lock:
        require_authority(db, owner_id, event_id)
        programme.event(db, event_id, True)
    query = select(models.AnnouncementDraft).where(models.AnnouncementDraft.id == identifier,
        models.AnnouncementDraft.event_id == event_id, models.AnnouncementDraft.owner_user_id == owner_id)
    if lock:
        query = query.with_for_update().execution_options(populate_existing=True)
    row = db.scalar(query)
    if row is None:
        raise missing()
    return row


def announcement(db, row):
    result = {
        "id": row.id, "eventId": row.event_id, "changeId": row.change_id, "body": row.body,
        "revision": row.revision, "state": row.state, "createdAt": row.created_at,
        "updatedAt": row.updated_at, "publishedAt": row.published_at,
        "sourceFacts": source_facts(source_change(db, row.event_id, row.change_id)),
    }
    return result


def binding(row):
    payload = [str(row.id), str(row.owner_user_id), str(row.event_id), str(row.change_id),
               row.source_revision, row.revision, row.body, "event_attendees"]
    return sha256(json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def edit_draft(db, row, body):
    programme.revision(row, body.expectedRevision, True)
    row.body, row.updated_at = body.body, utcnow()
    row.revision += 1
    db.commit()
    return announcement(db, row)


def preview_draft(db, row, expected_revision):
    programme.revision(row, expected_revision, True)
    assert_latest_source(db, source_change(db, row.event_id, row.change_id))
    now, digest = utcnow(), binding(row)
    existing = db.scalar(select(models.AnnouncementPublicationPreview).where(
        models.AnnouncementPublicationPreview.announcement_id == row.id,
        models.AnnouncementPublicationPreview.body_hash == digest,
        models.AnnouncementPublicationPreview.expires_at > now).order_by(models.AnnouncementPublicationPreview.created_at.desc()).limit(1))
    if existing is None:
        existing = models.AnnouncementPublicationPreview(announcement_id=row.id, event_id=row.event_id,
            owner_user_id=row.owner_user_id, change_id=row.change_id, source_revision=row.source_revision,
            draft_revision=row.revision, body_hash=digest, created_at=now, expires_at=now + timedelta(minutes=15))
        db.add(existing)
        db.commit()
    return {"previewId": existing.id, "announcementId": row.id, "revision": row.revision,
            "body": row.body, "expiresAt": existing.expires_at}


def publish_draft(db, row, preview_id):
    preview = db.scalar(select(models.AnnouncementPublicationPreview).where(
        models.AnnouncementPublicationPreview.id == preview_id,
        models.AnnouncementPublicationPreview.announcement_id == row.id,
        models.AnnouncementPublicationPreview.owner_user_id == row.owner_user_id,
        models.AnnouncementPublicationPreview.event_id == row.event_id))
    if preview is None:
        raise ProgrammeProblem()
    if row.state == "published" and row.published_preview_id == preview.id:
        return announcement(db, row)
    if (row.state != "draft" or preview.body_hash != binding(row) or preview.draft_revision != row.revision
            or preview.source_revision != row.source_revision or preview.change_id != row.change_id
            or preview.expires_at <= utcnow()):
        raise ProgrammeProblem()
    assert_latest_source(db, source_change(db, row.event_id, row.change_id))
    if db.scalar(select(models.AnnouncementDraft.id).where(models.AnnouncementDraft.change_id == row.change_id,
            models.AnnouncementDraft.state == "published").limit(1)):
        raise ProgrammeProblem()
    now = utcnow()
    row.state, row.published_at, row.updated_at, row.published_preview_id = "published", now, now, preview.id
    db.add(AuditEvent(user_id=row.owner_user_id, action="announcement_publish", resource_id=row.id,
        resource_revision=row.revision, outcome="success", occurred_at=now))
    db.commit()
    return announcement(db, row)
