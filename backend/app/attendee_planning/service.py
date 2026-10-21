from datetime import timedelta
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth.models import AuditEvent, Event, PasswordCredential, User, utcnow
from app.programme.models import ProgrammeItemRevision
from app.programme.schemas import PublishedProgramme
from app.attendee_planning import models, schemas
from app.attendee_planning.problems import PlanningProblem


def state_row(db, owner, event_id):
    return db.scalar(select(models.PlanningState).where(models.PlanningState.user_id == owner,
                     models.PlanningState.event_id == event_id).execution_options(populate_existing=True))


def visible_event(db, event_id):
    if db.scalar(select(ProgrammeItemRevision.id).where(ProgrammeItemRevision.event_id == event_id).limit(1)) is None:
        raise PlanningProblem(404, "not_found")


def published(db, event_id, item_id):
    row = db.scalar(select(ProgrammeItemRevision).where(ProgrammeItemRevision.event_id == event_id,
                   ProgrammeItemRevision.item_id == item_id).order_by(ProgrammeItemRevision.revision.desc()).limit(1))
    if row is None:
        raise PlanningProblem(404, "not_found")
    return PublishedProgramme.model_validate(row.snapshot)


def preferences(row):
    return schemas.Preferences(revision=row.preference_revision if row else 0,
        interests=row.interests if row else "", budgetMinorUnits=row.budget_minor_units if row else None,
        accessibilityNeeds=row.accessibility_needs if row else "", minimumGapMinutes=row.minimum_gap_minutes if row else 0)


def draft_items(db, row):
    if row is None:
        return []
    values = []
    for entry in db.scalars(select(models.DraftItem).where(models.DraftItem.state_id == row.id)):
        current = published(db, row.event_id, entry.programme_item_id)
        confirmed = entry.accessibility_confirmed and entry.confirmation_preference_revision == row.preference_revision and entry.observed_programme_revision == current.revision
        values.append(schemas.DraftItem(programmeItemId=entry.programme_item_id,
            observedProgrammeRevision=entry.observed_programme_revision, accessibilityConfirmed=confirmed,
            currentItem=current, currentProgrammeRevision=current.revision, changed=entry.observed_programme_revision != current.revision))
    return sorted(values, key=lambda value: (value.currentItem.startsAt, value.currentItem.endsAt, str(value.programmeItemId)))


def validation(prefs, items, draft_preference_revision):
    issues = []
    def issue(code, ids):
        issues.append(schemas.Issue(code=code, itemIds=ids))
    if not items:
        issue("empty_itinerary", [])
    if items and draft_preference_revision != prefs.revision:
        issue("stale_preferences", [])
    for entry in items:
        if entry.changed:
            issue("stale_programme", [entry.programmeItemId])
        if prefs.accessibilityNeeds and not entry.accessibilityConfirmed:
            issue("accessibility_unconfirmed", [entry.programmeItemId])
    # Check all interval pairs: nested intervals can overlap non-adjacent entries.
    for index, entry in enumerate(items):
        for later in items[index + 1:]:
            if later.currentItem.startsAt >= entry.currentItem.endsAt:
                break
            issue("overlap", [entry.programmeItemId, later.programmeItemId])
    for first, second in zip(items, items[1:]):
        gap = second.currentItem.startsAt - first.currentItem.endsAt
        if gap >= timedelta(0) and gap < timedelta(minutes=prefs.minimumGapMinutes):
            issue("minimum_gap", [first.programmeItemId, second.programmeItemId])
    total = sum(entry.currentItem.priceMinorUnits for entry in items)
    if prefs.budgetMinorUnits is not None and total > prefs.budgetMinorUnits:
        issue("budget_exceeded", [entry.programmeItemId for entry in items])
    return schemas.Validation(valid=not issues, totalMinorUnits=total, issues=issues)


def read_state(db, owner, event_id, row=None):
    visible_event(db, event_id)
    row = row if row is not None else state_row(db, owner, event_id)
    prefs = preferences(row)
    items = draft_items(db, row)
    summaries, bookmarks = [], []
    if row:
        summaries = [schemas.AcceptedSummary(id=value.id, version=value.version, acceptedAt=value.accepted_at)
                     for value in db.scalars(select(models.AcceptedVersion).where(models.AcceptedVersion.state_id == row.id).order_by(models.AcceptedVersion.version))]
        bookmarks = list(db.scalars(select(models.Bookmark.programme_item_id).where(models.Bookmark.state_id == row.id).order_by(models.Bookmark.programme_item_id)))
    observed = row.draft_preference_revision if row else 0
    return schemas.PlanningState(eventId=event_id, stateRevision=row.state_revision if row else 0,
        preferences=prefs, bookmarks=bookmarks,
        draft=schemas.Draft(revision=row.draft_revision if row else 0, preferenceRevision=observed,
                            items=items, validation=validation(prefs, items, observed)),
        acceptedVersions=summaries, currentAcceptedVersionId=row.current_accepted_version_id if row else None)


def locked(db, owner, event_id):
    # Serialize first creation using an existing owner row, then follow programme's
    # Event-before-resource lock order to hold a consistent producer snapshot.
    user = db.scalar(select(User).where(User.id == owner).with_for_update().execution_options(populate_existing=True))
    credential = db.get(PasswordCredential, owner, populate_existing=True)
    if user is None or user.role != "attendee" or credential is None or credential.must_change_password:
        raise PlanningProblem(403, "forbidden")
    event = db.scalar(select(Event).where(Event.id == event_id).with_for_update().execution_options(populate_existing=True))
    if event is None:
        raise PlanningProblem(404, "not_found")
    visible_event(db, event_id)
    return state_row(db, owner, event_id)


def check_revision(row, expected):
    if (row.state_revision if row else 0) != expected:
        raise PlanningProblem()


def ensure_row(db, row, owner, event_id):
    if row is None:
        row = models.PlanningState(user_id=owner, event_id=event_id, state_revision=1,
            preference_revision=0, draft_revision=0, draft_preference_revision=0,
            interests="", accessibility_needs="", minimum_gap_minutes=0)
        db.add(row)
        db.flush()
    else:
        row.state_revision += 1
    return row


def finish(db, row, action):
    db.add(AuditEvent(user_id=row.user_id, action=action, resource_id=row.event_id,
                     resource_revision=row.state_revision, outcome="success", occurred_at=utcnow()))
    db.flush()
    result = read_state(db, row.user_id, row.event_id, row)
    db.commit()
    return result


def replace_preferences(db, owner, event_id, body):
    row = locked(db, owner, event_id)
    check_revision(row, body.expectedStateRevision)
    before = preferences(row).model_dump(exclude={"revision"})
    values = body.model_dump(exclude={"expectedStateRevision"})
    if values == before:
        return read_state(db, owner, event_id, row)
    row = ensure_row(db, row, owner, event_id)
    row.preference_revision += 1
    row.interests, row.budget_minor_units = body.interests, body.budgetMinorUnits
    row.accessibility_needs, row.minimum_gap_minutes = body.accessibilityNeeds, body.minimumGapMinutes
    # Confirmation revision binding makes prior assertions ineffective immediately.
    return finish(db, row, "planning_preferences")


def bookmark(db, owner, event_id, item_id, body, remove=False):
    row = locked(db, owner, event_id)
    check_revision(row, body.expectedStateRevision)
    # Validate even a nominal no-op so foreign/unpublished IDs cannot become probes.
    published(db, event_id, item_id)
    existing = db.get(models.Bookmark, (row.id, item_id)) if row else None
    if (remove and existing is None) or (not remove and existing is not None):
        return read_state(db, owner, event_id, row)
    row = ensure_row(db, row, owner, event_id)
    if remove:
        db.delete(existing)
    else:
        db.add(models.Bookmark(state_id=row.id, event_id=event_id, programme_item_id=item_id))
    return finish(db, row, "planning_bookmark")


def replace_draft(db, owner, event_id, body):
    row = locked(db, owner, event_id)
    check_revision(row, body.expectedStateRevision)
    if body.expectedPreferenceRevision != (row.preference_revision if row else 0):
        raise PlanningProblem()
    for value in body.items:
        current = published(db, event_id, value.programmeItemId)
        if current.revision != value.observedProgrammeRevision:
            raise PlanningProblem(409, "stale_programme")
    old = list(db.scalars(select(models.DraftItem).where(models.DraftItem.state_id == row.id))) if row else []
    old_values = {(value.programme_item_id, value.observed_programme_revision,
                   value.accessibility_confirmed and value.confirmation_preference_revision == body.expectedPreferenceRevision) for value in old}
    new_values = {(value.programmeItemId, value.observedProgrammeRevision, value.accessibilityConfirmed) for value in body.items}
    if old_values == new_values and (row.draft_preference_revision if row else 0) == body.expectedPreferenceRevision:
        return read_state(db, owner, event_id, row)
    row = ensure_row(db, row, owner, event_id)
    db.execute(delete(models.DraftItem).where(models.DraftItem.state_id == row.id))
    for value in body.items:
        db.add(models.DraftItem(state_id=row.id, event_id=event_id, programme_item_id=value.programmeItemId,
            observed_programme_revision=value.observedProgrammeRevision, accessibility_confirmed=value.accessibilityConfirmed,
            confirmation_preference_revision=body.expectedPreferenceRevision))
    row.draft_revision += 1
    row.draft_preference_revision = body.expectedPreferenceRevision
    return finish(db, row, "planning_draft")


def accept(db, owner, event_id, body):
    row = locked(db, owner, event_id)
    if row is None:
        check_revision(row, body.expectedStateRevision)
        raise PlanningProblem(409, "constraint_violation", [schemas.Issue(code="empty_itinerary", itemIds=[])])
    if body.expectedDraftRevision != row.draft_revision or body.expectedPreferenceRevision != row.preference_revision:
        raise PlanningProblem()
    current = read_state(db, owner, event_id, row)
    if not current.draft.validation.valid:
        # CAS still wins for superseded requests; never modify accepted state.
        check_revision(row, body.expectedStateRevision)
        raise PlanningProblem(409, "constraint_violation", current.draft.validation.issues)
    existing = db.scalar(select(models.AcceptedVersion).where(models.AcceptedVersion.state_id == row.id,
        models.AcceptedVersion.draft_revision == row.draft_revision,
        models.AcceptedVersion.preference_revision == row.preference_revision).order_by(models.AcceptedVersion.version.desc()).limit(1))
    if existing is not None:
        observed = {str(value.programmeItemId): value.currentProgrammeRevision for value in current.draft.items}
        accepted = {value["programmeItemId"]: value["observedProgrammeRevision"] for value in existing.snapshot["items"]}
        if observed == accepted:
            return current
    check_revision(row, body.expectedStateRevision)
    row.state_revision += 1
    summaries = current.acceptedVersions
    entry = models.AcceptedVersion(state_id=row.id, version=max((value.version for value in summaries), default=0) + 1,
        draft_revision=row.draft_revision, preference_revision=row.preference_revision,
        snapshot={"preferencesSnapshot": current.preferences.model_dump(mode="json", exclude={"revision"}),
                  "totalMinorUnits": current.draft.validation.totalMinorUnits,
                  "items": [{"programmeItemId": str(value.programmeItemId), "observedProgrammeRevision": value.observedProgrammeRevision,
                             "accessibilityConfirmed": value.accessibilityConfirmed,
                             "acceptedItem": value.currentItem.model_dump(mode="json")} for value in current.draft.items]})
    db.add(entry)
    db.flush()
    row.current_accepted_version_id = entry.id
    return finish(db, row, "planning_accept")


def accepted_detail(db, owner, event_id, version_id):
    visible_event(db, event_id)
    row = state_row(db, owner, event_id)
    entry = db.scalar(select(models.AcceptedVersion).where(models.AcceptedVersion.id == version_id,
                      models.AcceptedVersion.state_id == row.id)) if row else None
    if entry is None:
        raise PlanningProblem(404, "not_found")
    items = []
    for value in entry.snapshot["items"]:
        now = published(db, event_id, UUID(value["programmeItemId"]))
        before = PublishedProgramme.model_validate(value["acceptedItem"])
        items.append(schemas.AcceptedItem(**value, currentItem=now, changed=now != before))
    prefs = schemas.PreferenceValues.model_validate(entry.snapshot["preferencesSnapshot"])
    return schemas.AcceptedDetail(id=entry.id, eventId=event_id, version=entry.version,
        draftRevision=entry.draft_revision, preferenceRevision=entry.preference_revision, acceptedAt=entry.accepted_at,
        preferencesSnapshot=prefs, totalMinorUnits=entry.snapshot["totalMinorUnits"], items=items,
        needsAttention=any(value.changed for value in items) or prefs != schemas.PreferenceValues.model_validate(preferences(row).model_dump(exclude={"revision"})))


def clear(db, owner, event_id, body):
    row = locked(db, owner, event_id)
    check_revision(row, body.expectedStateRevision)
    if row is None:
        return
    if (row.preference_revision == row.draft_revision == row.draft_preference_revision == 0
            and row.current_accepted_version_id is None and not row.interests and not row.accessibility_needs
            and row.budget_minor_units is None and row.minimum_gap_minutes == 0
            and not any(db.scalar(select(model.state_id).where(model.state_id == row.id).limit(1))
                        for model in (models.Bookmark, models.DraftItem, models.AcceptedVersion))):
        return
    row.current_accepted_version_id = None
    db.flush()
    for model in (models.Bookmark, models.DraftItem, models.AcceptedVersion):
        db.execute(delete(model).where(model.state_id == row.id))
    row.state_revision += 1
    row.preference_revision = row.draft_revision = row.draft_preference_revision = 0
    row.interests = row.accessibility_needs = ""
    row.budget_minor_units, row.minimum_gap_minutes = None, 0
    finish(db, row, "planning_delete")
