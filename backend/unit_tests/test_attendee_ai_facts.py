"""Developer-owned checks for the AI itinerary fact selection; no database or provider requests."""
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import UUID, uuid4

from app.attendee_ai.service import current_facts

EVENT = uuid4()


def snapshot(item_id, revision, title, state="published", hour=10):
    start = datetime(2027, 1, 1, hour, tzinfo=timezone.utc)
    return {"id": str(item_id), "eventId": str(EVENT), "revision": revision, "state": state, "title": title,
            "type": "talk", "startsAt": start.isoformat(), "endsAt": start.replace(hour=hour + 1).isoformat(),
            "capacity": 5, "priceMinorUnits": 0, "currency": "SGD", "accessibilityDetails": None,
            "publishedAt": start.isoformat(),
            "event": {"id": str(EVENT), "title": "Event", "timezone": "Asia/Singapore",
                      "startsAt": start.isoformat(), "endsAt": start.replace(hour=23).isoformat()},
            "venue": {"id": str(uuid4()), "name": "Venue", "address": "Addr", "accessibilityDetails": None},
            "room": {"id": str(uuid4()), "name": "Room", "maxCapacity": 5, "accessibilityDetails": None}}


def row(item_id: UUID, revision: int, title: str, state="published", hour=10):
    return SimpleNamespace(item_id=item_id, revision=revision, snapshot=snapshot(item_id, revision, title, state, hour))


def test_only_the_latest_revision_of_each_activity_is_used():
    item, other = uuid4(), uuid4()
    facts = current_facts([row(item, 1, "Old title", hour=9), row(item, 2, "New title", hour=11), row(other, 1, "Other", hour=14)])
    assert [(str(fact.id), fact.revision, fact.title) for fact in facts] == [
        (str(item), 2, "New title"), (str(other), 1, "Other")]


def test_the_result_does_not_depend_on_row_order():
    item = uuid4()
    rows = [row(item, 1, "Old"), row(item, 3, "Newest"), row(item, 2, "Middle")]
    assert [fact.title for fact in current_facts(rows)] == ["Newest"]
    assert [fact.title for fact in current_facts(list(reversed(rows)))] == ["Newest"]


def test_cancelled_activities_are_never_offered():
    kept, gone = uuid4(), uuid4()
    facts = current_facts([row(kept, 1, "Kept"), row(gone, 1, "Gone"), row(gone, 2, "Gone", state="cancelled")])
    assert [str(fact.id) for fact in facts] == [str(kept)]


def test_an_activity_cancelled_then_nothing_else_leaves_an_empty_list():
    gone = uuid4()
    assert current_facts([row(gone, 1, "Gone"), row(gone, 2, "Gone", state="cancelled")]) == []
