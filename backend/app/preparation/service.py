from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.models import AuditEvent, BusinessMembership, Event, utcnow
from app.auth.schemas import CurrentActor
from app.business.models import EventParticipation
from app.preparation.models import PreparationDocument
from app.preparation.problems import PreparationError
from app.preparation.schemas import ReplacePreparation


def _participation(db: Session, actor: CurrentActor, participation_id: UUID, *, lock=False) -> EventParticipation:
    query = select(EventParticipation).where(EventParticipation.id == participation_id)
    if lock:
        query = query.with_for_update()
    participation = db.scalar(query)
    if participation is None:
        raise PreparationError("not_found")
    membership = db.scalar(select(BusinessMembership.id).where(
        BusinessMembership.user_id == actor.id,
        BusinessMembership.business_id == participation.business_id,
        BusinessMembership.membership_role == "owner",
        BusinessMembership.status == "active"))
    if actor.role != "business" or membership is None:
        raise PreparationError("not_found")
    return participation


def _event_timezone(db: Session, participation: EventParticipation) -> str:
    event = db.get(Event, participation.event_id)
    return event.timezone if event is not None else "UTC"


def _projection(participation_id: UUID, record: PreparationDocument | None):
    tasks = record.tasks if record else []
    lines = record.budget_lines if record else []
    subtotal = sum(line["quantity"] * line["unitPriceMinorUnits"]
                   for line in lines if line["unitPriceMinorUnits"] is not None)
    complete = all(line["unitPriceMinorUnits"] is not None for line in lines)
    return {"participationId": participation_id, "revision": record.revision if record else 1,
            "tasks": tasks,
            "budget": {"currency": "SGD", "lines": lines,
                       "knownSubtotalMinorUnits": str(subtotal),
                       "totalMinorUnits": str(subtotal) if complete else None,
                       "isComplete": complete}}


def get_preparation(db: Session, actor: CurrentActor, participation_id: UUID):
    participation = _participation(db, actor, participation_id)
    record = db.get(PreparationDocument, participation_id)
    return _projection(participation.id, record)


def replace_preparation(db: Session, actor: CurrentActor, participation_id: UUID,
                        body: ReplacePreparation):
    # Serialize before reading the current document, including concurrent first saves.
    participation = _participation(db, actor, participation_id, lock=True)
    record = db.get(PreparationDocument, participation_id)
    current_revision = record.revision if record else 1
    if body.expectedRevision != current_revision:
        raise PreparationError("revision_conflict", current_revision=current_revision)

    tasks = [task.model_dump(mode="json", by_alias=True, exclude={"id"}) | {
        "id": str(task.id or uuid4())} for task in body.tasks]
    lines = [line.model_dump(mode="json", by_alias=True, exclude={"id"}) | {
        "id": str(line.id or uuid4())} for line in body.budget.lines]
    ids = [item["id"] for item in tasks + lines]
    if len(ids) != len(set(ids)):
        raise PreparationError("validation_error", fields={"id"})
    existing_tasks = {item["id"] for item in record.tasks} if record else set()
    existing_lines = {item["id"] for item in record.budget_lines} if record else set()
    if any(task.id is not None and str(task.id) not in existing_tasks for task in body.tasks):
        raise PreparationError("validation_error", fields={"id"})
    if any(line.id is not None and str(line.id) not in existing_lines for line in body.budget.lines):
        raise PreparationError("validation_error", fields={"id"})

    next_revision = current_revision + 1
    if record is None:
        record = PreparationDocument(participation_id=participation.id, revision=next_revision,
                                     tasks=tasks, budget_lines=lines, updated_by_user_id=actor.id)
        db.add(record)
    else:
        record.revision = next_revision
        record.tasks = tasks
        record.budget_lines = lines
        record.updated_by_user_id = actor.id
        record.updated_at = utcnow()
    db.add(AuditEvent(user_id=actor.id, action="preparation_update", resource_id=participation.id,
                      resource_revision=next_revision, outcome="success"))
    db.flush()
    return _projection(participation.id, record)
