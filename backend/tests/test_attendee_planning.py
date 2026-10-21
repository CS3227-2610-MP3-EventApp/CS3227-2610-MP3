"""Independent F02 revision-2 acceptance: public APIs and guarded real PostgreSQL.

No provider or implementation module is imported. Existing programme fixture creates
real auth/event state; publication uses the existing producer API.
"""
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from tests.test_programme import journey, locations, draft, request
from tests.test_authentication import ORIGIN, payload, login


@pytest.fixture
def planning(journey):
    organiser, attendee, producer, public, other = journey
    _, room = locations(organiser, producer)
    items = []
    for title, start, end, price in [
        ("First", "10:00", "11:00", 100),
        ("Adjacent", "11:00", "12:00", 25),
        ("Overlap", "10:30", "11:30", 0),
        ("Gap", "11:10", "12:10", 0),
    ]:
        value = draft(organiser, producer, room, title=title,
                      startsAt=f"2027-01-01T{start}:00+08:00",
                      endsAt=f"2027-01-01T{end}:00+08:00", priceMinorUnits=price)
        request(organiser, "POST", producer + f"/programme-items/{value['id']}/publish", {"expectedRevision": 1})
        items.append(request(attendee, "GET", public + f"/programme/{value['id']}"))
    return organiser, attendee, public + "/planning", items, other


def read(client, path):
    response = client.get(path)
    assert response.status_code == 200, response.text
    assert response.headers.get("cache-control") == "no-store"
    return response.json()


def prefs(client, path, state, **updates):
    return request(client, "PUT", path + "/preferences", {
        "expectedStateRevision": state["stateRevision"], "interests": "Art",
        "budgetMinorUnits": None, "currency": "SGD", "accessibilityNeeds": "",
        "minimumGapMinutes": 0, **updates,
    })


def save(client, path, state, items, confirmed=False):
    return request(client, "PUT", path + "/draft", {
        "expectedStateRevision": state["stateRevision"],
        "expectedPreferenceRevision": state["preferences"]["revision"],
        "items": [{"programmeItemId": x["id"], "observedProgrammeRevision": x["revision"],
                   "accessibilityConfirmed": confirmed} for x in items],
    })


def accept_body(state):
    return {"expectedStateRevision": state["stateRevision"],
            "expectedDraftRevision": state["draft"]["revision"],
            "expectedPreferenceRevision": state["preferences"]["revision"]}


def reject_preserving(client, path, method, suffix, body, status, headers=ORIGIN):
    before = read(client, path)
    response = client.request(method, path + suffix, json=body, headers=headers)
    assert response.status_code == status, response.text
    assert read(client, path) == before
    return response.json()


def test_empty_read_is_side_effect_free_preferences_persist_and_owner_is_server_resolved(planning):
    organiser, attendee, path, _, _ = planning
    empty = read(attendee, path)
    assert empty["stateRevision"] == empty["preferences"]["revision"] == empty["draft"]["revision"] == 0
    assert empty["bookmarks"] == empty["draft"]["items"] == empty["acceptedVersions"] == []
    assert empty["currentAcceptedVersionId"] is None
    assert read(attendee, path) == empty
    state = prefs(attendee, path, empty, interests="  <script>synthetic</script>  ", budgetMinorUnits=0)
    assert state["preferences"]["interests"] == "<script>synthetic</script>"
    assert state["preferences"]["budgetMinorUnits"] == 0
    assert state["stateRevision"] > 0
    from app.main import app
    with TestClient(app) as restored, TestClient(app) as other, TestClient(app) as anonymous:
        restored.cookies.update(attendee.cookies)
        assert read(restored, path) == state  # new application client, no reseed
        assert other.post("/api/v1/auth/register/attendee", json=payload(username="other", email="other@example.test"), headers=ORIGIN).status_code == 201
        assert read(other, path)["preferences"]["interests"] == ""
        for client, status in [(organiser, 403), (anonymous, 401)]:
            assert client.get(path).status_code == status
        forged = {"expectedStateRevision": 0, "ownerId": str(uuid4()), "interests": "stolen", "budgetMinorUnits": None, "currency": "SGD", "accessibilityNeeds": "", "minimumGapMinutes": 0}
        assert other.put(path + "/preferences", json=forged, headers=ORIGIN).status_code == 422
    assert read(attendee, path) == state


@pytest.mark.parametrize("field,value", [("budgetMinorUnits", -1), ("budgetMinorUnits", 0.1), ("budgetMinorUnits", True), ("budgetMinorUnits", 2147483648), ("currency", "USD"), ("minimumGapMinutes", -1), ("minimumGapMinutes", 1441), ("interests", "x" * 1001), ("accessibilityNeeds", "x" * 2001)])
def test_invalid_preferences_are_atomic(planning, field, value):
    _, attendee, path, _, _ = planning
    state = read(attendee, path)
    body = {"expectedStateRevision": 0, "interests": "", "budgetMinorUnits": None, "currency": "SGD", "accessibilityNeeds": "", "minimumGapMinutes": 0, field: value}
    reject_preserving(attendee, path, "PUT", "/preferences", body, 422)


def test_bookmarks_are_independent_idempotent_and_reject_unpublished_foreign_targets(planning):
    organiser, attendee, path, items, other = planning
    state = read(attendee, path)
    suffix = "/bookmarks/" + items[0]["id"]
    state = request(attendee, "PUT", path + suffix, {"expectedStateRevision": state["stateRevision"]})
    assert state["bookmarks"] == [items[0]["id"]]
    assert state["draft"]["items"] == []
    assert request(attendee, "PUT", path + suffix, {"expectedStateRevision": state["stateRevision"]}) == state
    producer = path.replace("/attendee/", "/organiser/").removesuffix("/planning")
    _, room = locations(organiser, producer)
    hidden = draft(organiser, producer, room)
    reject_preserving(attendee, path, "PUT", "/bookmarks/" + hidden["id"], {"expectedStateRevision": state["stateRevision"]}, 404)
    reject_preserving(attendee, path, "PUT", "/bookmarks/" + str(uuid4()), {"expectedStateRevision": state["stateRevision"]}, 404)
    assert attendee.put(path.replace(path.split("/")[-2], other) + suffix, json={"expectedStateRevision": 0}, headers=ORIGIN).status_code == 404
    state = request(attendee, "DELETE", path + suffix, {"expectedStateRevision": state["stateRevision"]})
    assert state["bookmarks"] == []
    assert request(attendee, "DELETE", path + suffix, {"expectedStateRevision": state["stateRevision"]}) == state


def test_draft_sorts_uses_producer_facts_and_overlap_saves_but_cannot_accept(planning):
    _, attendee, path, items, _ = planning
    state = prefs(attendee, path, read(attendee, path))
    state = save(attendee, path, state, [items[2], items[0]])
    assert [x["programmeItemId"] for x in state["draft"]["items"]] == [items[0]["id"], items[2]["id"]]
    assert state["draft"]["items"][0]["currentItem"] == items[0]
    assert state["draft"]["validation"]["valid"] is False
    assert "overlap" in {x["code"] for x in state["draft"]["validation"]["issues"]}
    reject_preserving(attendee, path, "POST", "/accept", accept_body(state), 409)


def test_exact_budget_adjacent_and_gap_boundaries_and_history(planning):
    _, attendee, path, items, _ = planning
    state = prefs(attendee, path, read(attendee, path), budgetMinorUnits=125)
    state = save(attendee, path, state, items[:2])
    assert state["draft"]["validation"]["totalMinorUnits"] == 125
    assert state["draft"]["validation"]["valid"] is True
    accepted = request(attendee, "POST", path + "/accept", accept_body(state))
    version = accepted["currentAcceptedVersionId"]
    detail = read(attendee, path + "/accepted/" + version)
    assert detail["items"][0]["acceptedItem"] == items[0]
    assert detail["totalMinorUnits"] == 125
    state = prefs(attendee, path, accepted, budgetMinorUnits=124)
    state = save(attendee, path, state, items[:2])
    reject_preserving(attendee, path, "POST", "/accept", accept_body(state), 409)
    assert read(attendee, path)["currentAcceptedVersionId"] == version
    state = prefs(attendee, path, state, minimumGapMinutes=10)
    state = save(attendee, path, state, items[:2])
    assert state["draft"]["validation"]["valid"] is False
    state = save(attendee, path, state, [items[0], items[3]])
    assert state["draft"]["validation"]["valid"] is True
    state = request(attendee, "POST", path + "/accept", accept_body(state))
    assert len(state["acceptedVersions"]) == 2
    historical = read(attendee, path + "/accepted/" + version)
    for field in ("items", "preferencesSnapshot", "totalMinorUnits", "acceptedAt", "version"):
        assert historical[field] == detail[field]


def test_accessibility_confirmation_required_invalidated_by_any_preference_change(planning):
    _, attendee, path, items, _ = planning
    state = prefs(attendee, path, read(attendee, path), accessibilityNeeds="Step-free access")
    state = save(attendee, path, state, items[:1])
    reject_preserving(attendee, path, "POST", "/accept", accept_body(state), 409)
    state = save(attendee, path, state, items[:1], confirmed=True)
    assert state["draft"]["validation"]["valid"] is True
    assert state["draft"]["items"][0]["currentItem"]["accessibilityDetails"] is None
    state = prefs(attendee, path, state, accessibilityNeeds="Step-free access", interests="Changed interests")
    reject_preserving(attendee, path, "POST", "/accept", accept_body(state), 409)
    assert not all(x["accessibilityConfirmed"] for x in read(attendee, path)["draft"]["items"])


def test_zero_budget_free_item_and_empty_acceptance_preserve_previous_plan(planning):
    _, attendee, path, items, _ = planning
    state = prefs(attendee, path, read(attendee, path), budgetMinorUnits=0)
    state = save(attendee, path, state, [items[2]])
    assert state["draft"]["validation"]["valid"] is True
    state = request(attendee, "POST", path + "/accept", accept_body(state))
    version = state["currentAcceptedVersionId"]
    state = save(attendee, path, state, items[:1])
    reject_preserving(attendee, path, "POST", "/accept", accept_body(state), 409)
    state = save(attendee, path, state, [])
    error = reject_preserving(attendee, path, "POST", "/accept", accept_body(state), 409)
    assert error["code"] == "constraint_violation"
    assert read(attendee, path)["currentAcceptedVersionId"] == version


def test_draft_rejects_duplicate_spoofed_stale_and_foreign_references_without_writes(planning):
    _, attendee, path, items, _ = planning
    state = prefs(attendee, path, read(attendee, path))
    item = {"programmeItemId": items[0]["id"], "observedProgrammeRevision": items[0]["revision"], "accessibilityConfirmed": False}
    body = {"expectedStateRevision": state["stateRevision"], "expectedPreferenceRevision": state["preferences"]["revision"], "items": [item]}
    for changed, status in [
        ({**body, "items": [item, item]}, 422),
        ({**body, "items": [{**item, "priceMinorUnits": 0}]}, 422),
        ({**body, "items": [{**item, "programmeItemId": str(uuid4())}]}, 404),
        ({**body, "items": [{**item, "observedProgrammeRevision": item["observedProgrammeRevision"] - 1}]}, 409),
        ({**body, "expectedPreferenceRevision": state["preferences"]["revision"] - 1}, 409),
    ]:
        reject_preserving(attendee, path, "PUT", "/draft", changed, status)


def test_new_connection_reads_persisted_acceptance_and_other_owner_cannot_read_history(planning):
    organiser, attendee, path, items, _ = planning
    state = prefs(attendee, path, read(attendee, path))
    state = save(attendee, path, state, items[:1])
    state = request(attendee, "POST", path + "/accept", accept_body(state))
    from app.main import app
    from app.database import engine
    engine.dispose()  # actual database connection lifecycle; not a PostgreSQL process restart
    with TestClient(app) as restored, TestClient(app) as other, TestClient(app) as anonymous:
        restored.cookies.update(attendee.cookies)
        assert read(restored, path) == state
        assert other.post("/api/v1/auth/register/attendee", json=payload(username="history-other", email="history-other@example.test"), headers=ORIGIN).status_code == 201
        assert other.get(path + "/accepted/" + state["currentAcceptedVersionId"]).status_code == 404
        assert read(other, path)["acceptedVersions"] == []
        assert organiser.get(path + "/accepted/" + state["currentAcceptedVersionId"]).status_code == 403
        assert anonymous.get(path + "/accepted/" + state["currentAcceptedVersionId"]).status_code == 401
    assert read(attendee, path) == state


def test_stale_revisions_concurrent_first_create_and_concurrent_accept_do_not_duplicate(planning):
    _, attendee, path, items, _ = planning
    from app.main import app
    cookies = dict(attendee.cookies)
    def put_interests(text):
        with TestClient(app) as client:
            client.cookies.update(cookies)
            return client.put(path + "/preferences", json={"expectedStateRevision": 0, "interests": text, "budgetMinorUnits": None, "currency": "SGD", "accessibilityNeeds": "", "minimumGapMinutes": 0}, headers=ORIGIN)
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(put_interests, ["one", "two"]))
    assert sorted(x.status_code for x in responses) == [200, 409]
    state = save(attendee, path, read(attendee, path), items[:1])
    body = accept_body(state)
    def perform_accept(_):
        with TestClient(app) as client:
            client.cookies.update(cookies)
            return client.post(path + "/accept", json=body, headers=ORIGIN)
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(perform_accept, range(2)))
    assert [x.status_code for x in responses] == [200, 200]
    state = read(attendee, path)
    assert len(state["acceptedVersions"]) == 1
    assert request(attendee, "POST", path + "/accept", body) == state
    state = save(attendee, path, state, [items[1]])
    state = request(attendee, "POST", path + "/accept", accept_body(state))
    reject_preserving(attendee, path, "POST", "/accept", body, 409)
    assert len(read(attendee, path)["acceptedVersions"]) == 2


def test_delete_history_and_tombstone_prevent_aba_and_preserve_programme(planning):
    _, attendee, path, items, _ = planning
    state = prefs(attendee, path, read(attendee, path))
    stale = state["stateRevision"]
    state = save(attendee, path, state, items[:1])
    state = request(attendee, "POST", path + "/accept", accept_body(state))
    version = state["currentAcceptedVersionId"]
    request(attendee, "DELETE", path, {"expectedStateRevision": state["stateRevision"]}, 204)
    empty = read(attendee, path)
    assert empty["stateRevision"] > state["stateRevision"]
    assert empty["acceptedVersions"] == empty["bookmarks"] == empty["draft"]["items"] == []
    assert empty["currentAcceptedVersionId"] is None
    assert attendee.get(path + "/accepted/" + version).status_code == 404
    assert read(attendee, path.removesuffix("/planning") + "/programme/" + items[0]["id"]) == items[0]
    reject_preserving(attendee, path, "PUT", "/preferences", {"expectedStateRevision": stale, "interests": "resurrect", "budgetMinorUnits": None, "currency": "SGD", "accessibilityNeeds": "", "minimumGapMinutes": 0}, 409)
    recreated = prefs(attendee, path, empty)
    reject_preserving(attendee, path, "DELETE", "", {"expectedStateRevision": state["stateRevision"]}, 409)
    assert read(attendee, path) == recreated


@pytest.mark.parametrize("origin", [None, "null", "https://attacker.invalid"])
def test_every_mutation_requires_trusted_origin_and_failure_preserves_state(planning, origin):
    _, attendee, path, items, _ = planning
    state = prefs(attendee, path, read(attendee, path))
    headers = {} if origin is None else {"Origin": origin}
    for method, suffix, body in [
        ("PUT", "/preferences", {"interests": "x", "budgetMinorUnits": None, "currency": "SGD", "accessibilityNeeds": "", "minimumGapMinutes": 0}),
        ("PUT", "/bookmarks/" + items[0]["id"], {}),
        ("DELETE", "/bookmarks/" + items[0]["id"], {}),
        ("PUT", "/draft", {"expectedPreferenceRevision": state["preferences"]["revision"], "items": []}),
        ("POST", "/accept", accept_body(state)), ("DELETE", "", {}),
    ]:
        reject_preserving(attendee, path, method, suffix, {**body, "expectedStateRevision": state["stateRevision"]}, 403, headers)
