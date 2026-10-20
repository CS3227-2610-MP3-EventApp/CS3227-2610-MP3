"""Independent programme revision-6 acceptance tests; real guarded PostgreSQL."""
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from tests.test_authentication import PASSWORD, ORIGIN, bootstrap, connect, login, payload


@pytest.fixture
def journey():
    from app.main import app
    import subprocess
    import sys
    from pathlib import Path
    result = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=Path(__file__).resolve().parents[1], capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr
    with connect() as connection:
        connection.execute("TRUNCATE audit_events, sessions, event_memberships, business_memberships, password_credentials, users, businesses, events CASCADE")
    event, other = str(uuid4()), str(uuid4())
    for identifier in (event, other):
        result = bootstrap(["event", "--id", identifier, "--title", f"Synthetic {identifier}", "--timezone", "Asia/Singapore", "--starts-at", "2027-01-01T00:00:00+08:00", "--ends-at", "2027-01-03T00:00:00+08:00"])
        assert result.returncode == 0, result.stderr
    result = bootstrap(["organiser", "--username", "programme-owner", "--email", "programme@example.test", "--display-name", "Programme Owner", "--event-id", event])
    assert result.returncode == 0, result.stderr
    with TestClient(app, raise_server_exceptions=False) as organiser, TestClient(app, raise_server_exceptions=False) as attendee:
        assert login(organiser, "programme-owner", role="organiser").status_code == 200
        assert organiser.post("/api/v1/auth/change-password", json={"currentPassword": PASSWORD, "newPassword": "Replacement-123"}, headers=ORIGIN).status_code == 200
        assert attendee.post("/api/v1/auth/register/attendee", json=payload(), headers=ORIGIN).status_code == 201
        yield organiser, attendee, f"/api/v1/organiser/events/{event}", f"/api/v1/attendee/events/{event}", other


def request(client, method, path, body=None, status=200, headers=ORIGIN):
    response = client.request(method, path, json=body, headers=headers)
    assert response.status_code == status, response.text
    return response.json() if status != 204 else None


def locations(client, base):
    venue = request(client, "POST", base + "/venues", {"name": "Hall", "address": "1 Synthetic Road", "accessibilityDetails": "  "}, 201)
    room = request(client, "POST", base + f"/venues/{venue['id']}/rooms", {"name": "Room A", "maxCapacity": 30}, 201)
    return venue, room


def fields(room, **updates):
    return {"roomId": room["id"], "title": "Creative 100%_Lab", "type": "workshop", "startsAt": "2027-01-01T23:30:00+08:00", "endsAt": "2027-01-02T00:30:00+08:00", "capacity": 30, "priceMinorUnits": 0, "currency": "SGD", **updates}


def draft(client, base, room, **updates):
    return request(client, "POST", base + "/programme-items", fields(room, **updates), 201)


def test_create_validate_publish_exact_snapshot_and_audit(journey):
    organiser, attendee, base, public, _ = journey
    venue, room = locations(organiser, base)
    item = draft(organiser, base, room)
    assert item["state"] == "draft" and item["revision"] == 1
    assert venue["accessibilityDetails"] is None
    request(attendee, "GET", public + "/programme", status=404)
    validation = request(organiser, "POST", base + f"/programme-items/{item['id']}/validate", {"expectedRevision": 1})
    assert validation == {"itemId": item["id"], "revision": 1, "valid": True, "errors": {}}
    assert request(organiser, "GET", base + f"/programme-items/{item['id']}")["revision"] == 1
    published = request(organiser, "POST", base + f"/programme-items/{item['id']}/publish", {"expectedRevision": 1})
    assert published["state"] == "published" and published["revision"] == 2
    visible = request(attendee, "GET", public + f"/programme/{item['id']}")
    for key in ("id", "eventId", "title", "type", "startsAt", "endsAt", "capacity", "priceMinorUnits", "currency", "revision", "accessibilityDetails", "publishedAt"):
        assert visible[key] == published[key]
    assert visible["venue"] == {key: venue[key] for key in ("id", "name", "address", "accessibilityDetails")}
    assert visible["room"] == {key: room[key] for key in ("id", "name", "maxCapacity", "accessibilityDetails")}
    assert visible["event"]["timezone"] == "Asia/Singapore"
    assert not {"actorUserId", "audit", "password", "token"} & visible.keys()
    audit = request(organiser, "GET", base + f"/programme-items/{item['id']}/publication")
    actor = organiser.get("/api/v1/auth/me").json()
    assert audit["actorUserId"] == actor["id"] and audit["revision"] == 2
    assert audit["itemId"] == item["id"] and audit["action"] == "programme_publish" and audit["outcome"] == "success"
    request(attendee, "GET", base + f"/programme-items/{item['id']}/publication", status=403)


@pytest.mark.parametrize("updates", [
    {"title": " "}, {"title": "x" * 201}, {"type": "unknown"}, {"currency": "USD"},
    {"capacity": 0}, {"capacity": -1}, {"capacity": 1.5}, {"capacity": True}, {"capacity": 31},
    {"priceMinorUnits": -1}, {"priceMinorUnits": 0.5}, {"priceMinorUnits": True},
    {"startsAt": "2027-01-02T00:30:00+08:00"}, {"startsAt": "2026-12-31T23:59:59+08:00"},
    {"endsAt": "2027-01-03T00:00:01+08:00"}, {"startsAt": "2027-01-01T12:00:00"},
    {"accessibilityDetails": "x" * 2001}, {"state": "published"}, {"actorUserId": str(uuid4())},
])
def test_invalid_complete_drafts_preserve_state(journey, updates):
    organiser, _, base, _, _ = journey
    _, room = locations(organiser, base)
    before = {suffix: request(organiser, "GET", base + suffix) for suffix in ("/venues", "/rooms", "/programme-items")}
    response = request(organiser, "POST", base + "/programme-items", fields(room, **updates), 422)
    assert response["status"] == 422 and isinstance(response["errors"], dict)
    assert {suffix: request(organiser, "GET", base + suffix) for suffix in before} == before


def test_overlap_event_boundaries_stale_and_safe_deletion(journey):
    organiser, _, base, _, _ = journey
    venue, room = locations(organiser, base)
    item = draft(organiser, base, room, startsAt="2027-01-01T00:00:00+08:00", endsAt="2027-01-03T00:00:00+08:00")
    second = draft(organiser, base, room)
    path = base + f"/programme-items/{item['id']}"
    changed = request(organiser, "PATCH", path, {**fields(room), "expectedRevision": 1})
    assert changed["revision"] == 2
    for method, suffix, body in [("PATCH", "", {**fields(room), "expectedRevision": 1}), ("DELETE", "", {"expectedRevision": 1}), ("POST", "/validate", {"expectedRevision": 1}), ("POST", "/publish", {"expectedRevision": 1})]:
        request(organiser, method, path + suffix, body, 409)
    assert request(organiser, "GET", path) == changed
    request(organiser, "DELETE", base + f"/rooms/{room['id']}", {"expectedRevision": 1}, 409)
    request(organiser, "DELETE", base + f"/venues/{venue['id']}", {"expectedRevision": 1}, 409)
    request(organiser, "PATCH", base + f"/rooms/{room['id']}", {"name": "Room A", "maxCapacity": 29, "expectedRevision": 1}, 409)
    request(organiser, "POST", path + "/publish", {"expectedRevision": 2})
    for method, suffix, body in [("PATCH", "", {**fields(room), "expectedRevision": 3}), ("DELETE", "", {"expectedRevision": 3}), ("POST", "/publish", {"expectedRevision": 3})]:
        request(organiser, method, path + suffix, body, 409)
    request(organiser, "PATCH", base + f"/rooms/{room['id']}", {"name": "Renamed", "maxCapacity": 30, "expectedRevision": 1}, 409)
    request(organiser, "PATCH", base + f"/venues/{venue['id']}", {"name": "Renamed", "address": "New", "expectedRevision": 1}, 409)
    request(organiser, "DELETE", base + f"/programme-items/{second['id']}", {"expectedRevision": 1}, 204)
    spare, spare_room = locations(organiser, base)
    request(organiser, "DELETE", base + f"/rooms/{spare_room['id']}", {"expectedRevision": 1}, 204)
    request(organiser, "DELETE", base + f"/venues/{spare['id']}", {"expectedRevision": 1}, 204)


def test_published_filtering_literal_search_and_pagination(journey):
    organiser, attendee, base, public, _ = journey
    _, room = locations(organiser, base)
    first = draft(organiser, base, room)
    hidden = draft(organiser, base, room, title="Private draft")
    second = draft(organiser, base, room, title="Creative other", type="talk", startsAt="2027-01-02T10:00:00+08:00", endsAt="2027-01-02T11:00:00+08:00")
    for item in (first, second):
        request(organiser, "POST", base + f"/programme-items/{item['id']}/publish", {"expectedRevision": 1})
    request(attendee, "GET", public + f"/programme/{hidden['id']}", status=404)
    for query in ("q=100%25_", "q=CREATIVE&type=workshop&date=2027-01-01", "date=2027-01-01"):
        result = request(attendee, "GET", public + "/programme?" + query)
        assert result["total"] == 1 and result["items"][0]["id"] == first["id"]
    assert request(attendee, "GET", public + "/programme?date=2027-01-02")["items"][0]["id"] == second["id"]
    page = request(attendee, "GET", public + "/programme?limit=1&offset=1")
    assert page["total"] == 2 and page["limit"] == 1 and page["offset"] == 1 and page["items"][0]["id"] == second["id"]
    for query in ("limit=0", "limit=101", "offset=-1", "date=2027-02-30", "type=invalid"):
        request(attendee, "GET", public + "/programme?" + query, status=422)


@pytest.mark.parametrize("origin", [None, "null", "https://attacker.invalid"])
def test_new_mutations_reject_untrusted_origins_without_changes(journey, origin):
    organiser, _, base, _, _ = journey
    venue, room = locations(organiser, base)
    item = draft(organiser, base, room)
    headers = {} if origin is None else {"Origin": origin}
    actions = [("POST", "/venues", {"name": "Rejected", "address": "No"}), ("PATCH", f"/venues/{venue['id']}", {"name": "Changed", "address": "No", "expectedRevision": 1}), ("DELETE", f"/rooms/{room['id']}", {"expectedRevision": 1}), ("POST", f"/programme-items/{item['id']}/validate", {"expectedRevision": 1}), ("POST", f"/programme-items/{item['id']}/publish", {"expectedRevision": 1})]
    before = {suffix: request(organiser, "GET", base + suffix) for suffix in ("/venues", "/rooms", "/programme-items")}
    for method, suffix, body in actions:
        request(organiser, method, base + suffix, body, 403, headers)
    assert {suffix: request(organiser, "GET", base + suffix) for suffix in before} == before


def test_scope_and_revocation_on_next_request(journey):
    organiser, attendee, base, _, other = journey
    _, room = locations(organiser, base)
    item = draft(organiser, base, room)
    for suffix in ("/venues", "/rooms", "/programme-items", f"/programme-items/{item['id']}"):
        request(attendee, "GET", base + suffix, status=403)
        request(organiser, "GET", f"/api/v1/organiser/events/{other}" + suffix, status=403)
    with connect() as connection:
        connection.execute("UPDATE event_memberships SET status='inactive' WHERE event_id=%s", (base.split("/")[-1],))
    request(organiser, "GET", base + "/programme-items", status=403)
    request(organiser, "POST", base + f"/programme-items/{item['id']}/publish", {"expectedRevision": 1}, 403)


def test_competing_publications_create_one_success(journey):
    organiser, attendee, base, public, _ = journey
    _, room = locations(organiser, base)
    item = draft(organiser, base, room)
    from app.main import app
    from threading import Barrier
    barrier = Barrier(2)
    cookie = dict(organiser.cookies)
    def publish():
        with TestClient(app, raise_server_exceptions=False) as client:
            client.cookies.update(cookie)
            barrier.wait(timeout=10)
            return client.post(base + f"/programme-items/{item['id']}/publish", json={"expectedRevision": 1}, headers=ORIGIN).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(lambda _: publish(), range(2))) == [200, 409]
    assert request(attendee, "GET", public + f"/programme/{item['id']}")["revision"] == 2
    with connect() as connection:
        assert connection.execute("SELECT count(*) FROM audit_events WHERE action='programme_publish' AND outcome='success'").fetchone()[0] == 1
        assert connection.execute("SELECT count(*) FROM programme_item_revisions").fetchone()[0] == 1


def test_audit_storage_failure_rolls_back_publication(journey):
    organiser, attendee, base, public, _ = journey
    _, room = locations(organiser, base)
    item = draft(organiser, base, room)
    # A real database trigger fails the success audit; no production function is mocked.
    with connect() as connection:
        connection.execute("CREATE FUNCTION programme_test_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='programme_publish' AND NEW.outcome='success' THEN RAISE EXCEPTION 'synthetic publication failure'; END IF; RETURN NEW; END $$")
        connection.execute("CREATE TRIGGER programme_test_failure BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION programme_test_fail_audit()")
    try:
        response = organiser.post(base + f"/programme-items/{item['id']}/publish", json={"expectedRevision": 1}, headers=ORIGIN)
        assert response.status_code == 503, response.text
        assert "synthetic publication failure" not in response.text
        assert request(organiser, "GET", base + f"/programme-items/{item['id']}") == item
        request(attendee, "GET", public + f"/programme/{item['id']}", status=404)
        request(organiser, "GET", base + f"/programme-items/{item['id']}/publication", status=404)
        with connect() as connection:
            assert connection.execute("SELECT count(*) FROM programme_item_revisions").fetchone()[0] == 0
            assert connection.execute("SELECT count(*) FROM audit_events WHERE action='programme_publish' AND outcome='success'").fetchone()[0] == 0
    finally:
        with connect() as connection:
            connection.execute("DROP TRIGGER programme_test_failure ON audit_events")
            connection.execute("DROP FUNCTION programme_test_fail_audit()")
    request(organiser, "POST", base + f"/programme-items/{item['id']}/publish", {"expectedRevision": 1})


@pytest.mark.parametrize("identity,status", [("anonymous", 401), ("attendee", 403), ("business", 403), ("mandatory", 403), ("other-event", 403)])
def test_every_programme_surface_enforces_server_authority(journey, identity, status):
    organiser, attendee, base, _, other = journey
    venue, room = locations(organiser, base)
    item = draft(organiser, base, room)
    before = {suffix: request(organiser, "GET", base + suffix) for suffix in ("/venues", "/rooms", "/programme-items")}
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as alternate:
        client = alternate
        if identity == "attendee":
            client = attendee
        elif identity == "business":
            body = payload(username="business-user", email="business@example.test", businessName="Synthetic Business")
            assert alternate.post("/api/v1/auth/register/business", json=body, headers=ORIGIN).status_code == 201
        elif identity == "mandatory":
            result = bootstrap(["organiser", "--username", "new-organiser", "--email", "new@example.test", "--display-name", "New", "--event-id", base.split("/")[-1]])
            assert result.returncode == 0, result.stderr
            assert login(alternate, "new-organiser", role="organiser").status_code == 200
        elif identity == "other-event":
            client = organiser
        denied_base = f"/api/v1/organiser/events/{other}" if identity == "other-event" else base
        item_path = f"/programme-items/{item['id']}"
        actions = [
            ("GET", "/venues", None), ("GET", "/rooms", None), ("GET", "/programme-items", None), ("GET", item_path, None),
            ("POST", "/venues", {"name": "Forbidden", "address": "No"}),
            ("PATCH", f"/venues/{venue['id']}", {"name": "Changed", "address": "No", "expectedRevision": 1}),
            ("DELETE", f"/venues/{venue['id']}", {"expectedRevision": 1}),
            ("POST", f"/venues/{venue['id']}/rooms", {"name": "Forbidden", "maxCapacity": 1}),
            ("PATCH", f"/rooms/{room['id']}", {"name": "Changed", "maxCapacity": 30, "expectedRevision": 1}),
            ("DELETE", f"/rooms/{room['id']}", {"expectedRevision": 1}),
            ("POST", "/programme-items", fields(room)), ("PATCH", item_path, {**fields(room), "expectedRevision": 1}),
            ("DELETE", item_path, {"expectedRevision": 1}), ("POST", item_path + "/validate", {"expectedRevision": 1}),
            ("POST", item_path + "/publish", {"expectedRevision": 1}), ("GET", item_path + "/publication", None),
        ]
        for method, suffix, body in actions:
            request(client, method, denied_base + suffix, body, status)
    assert {suffix: request(organiser, "GET", base + suffix) for suffix in before} == before


def test_cross_event_resources_are_concealed_and_relationships_rejected(journey):
    organiser, _, base, _, other = journey
    _, room = locations(organiser, base)
    # Give this actor both memberships so resource scoping, not event denial, is tested.
    result = bootstrap(["organiser", "--username", "programme-owner", "--email", "programme@example.test", "--display-name", "Programme Owner", "--event-id", other])
    assert result.returncode == 0, result.stderr
    other_base = f"/api/v1/organiser/events/{other}"
    venue_b, room_b = locations(organiser, other_base)
    item_b = draft(organiser, other_base, room_b)
    request(organiser, "POST", base + "/programme-items", fields(room_b), 422)
    request(organiser, "POST", base + f"/venues/{venue_b['id']}/rooms", {"name": "Wrong", "maxCapacity": 1}, 404)
    request(organiser, "GET", base + f"/programme-items/{item_b['id']}", status=404)
    request(organiser, "POST", base + f"/programme-items/{item_b['id']}/publish", {"expectedRevision": 1}, 404)
    assert request(organiser, "GET", base + "/programme-items")["total"] == 0


def test_publication_serializes_with_parent_edit(journey):
    organiser, attendee, base, public, _ = journey
    _, room = locations(organiser, base)
    item = draft(organiser, base, room)
    from app.main import app
    from threading import Barrier
    barrier = Barrier(2)
    cookies = dict(organiser.cookies)
    def action(publish):
        with TestClient(app, raise_server_exceptions=False) as client:
            client.cookies.update(cookies)
            barrier.wait(timeout=10)
            if publish:
                return client.post(base + f"/programme-items/{item['id']}/publish", json={"expectedRevision": 1}, headers=ORIGIN)
            return client.patch(base + f"/rooms/{room['id']}", json={"name": "Changed room", "maxCapacity": 30, "expectedRevision": 1}, headers=ORIGIN)
    with ThreadPoolExecutor(max_workers=2) as pool:
        publication, edit = list(pool.map(action, [True, False]))
    assert publication.status_code == 200, publication.text
    assert edit.status_code in (200, 409), edit.text
    snapshot = request(attendee, "GET", public + f"/programme/{item['id']}")
    current_room = request(organiser, "GET", base + "/rooms")["items"][0]
    assert snapshot["room"]["name"] == current_room["name"]
    assert snapshot["room"]["name"] == ("Changed room" if edit.status_code == 200 else "Room A")


def test_revalidation_uses_current_parent_and_preserves_invalid_draft(journey):
    organiser, attendee, base, public, _ = journey
    _, room = locations(organiser, base)
    item = draft(organiser, base, room)
    # Simulate stale/legacy parent data; ordinary API capacity reduction is separately rejected.
    with connect() as connection:
        connection.execute("UPDATE rooms SET max_capacity=29 WHERE id=%s", (room["id"],))
    path = base + f"/programme-items/{item['id']}"
    finding = request(organiser, "POST", path + "/validate", {"expectedRevision": 1})
    assert finding["valid"] is False and "capacity" in finding["errors"]
    request(organiser, "POST", path + "/publish", {"expectedRevision": 1}, 422)
    assert request(organiser, "GET", path) == item
    request(attendee, "GET", public + f"/programme/{item['id']}", status=404)
    with connect() as connection:
        assert connection.execute("SELECT count(*) FROM programme_item_revisions").fetchone()[0] == 0
        assert connection.execute("SELECT count(*) FROM audit_events WHERE action='programme_publish' AND outcome='success'").fetchone()[0] == 0


def test_complete_fields_expected_revision_and_location_updates(journey):
    organiser, _, base, _, _ = journey
    venue, room = locations(organiser, base)
    for key in fields(room):
        body = fields(room)
        body.pop(key)
        request(organiser, "POST", base + "/programme-items", body, 422)
    for body in ({}, {"expectedRevision": 0}, {"expectedRevision": True}, {"expectedRevision": 1.5}):
        request(organiser, "DELETE", base + f"/rooms/{room['id']}", body, 422)
    updated_venue = request(organiser, "PATCH", base + f"/venues/{venue['id']}", {"name": "Hall Two", "address": "2 Synthetic Road", "expectedRevision": 1})
    assert updated_venue["revision"] == 2 and updated_venue["name"] == "Hall Two"
    updated_room = request(organiser, "PATCH", base + f"/rooms/{room['id']}", {"name": "Room B", "maxCapacity": 31, "expectedRevision": 1})
    assert updated_room["revision"] == 2 and updated_room["maxCapacity"] == 31
    same = request(organiser, "PATCH", base + f"/rooms/{room['id']}", {"name": "Room B", "maxCapacity": 31, "expectedRevision": 2})
    assert same["revision"] == 3


def test_cors_preflight_allows_trusted_new_methods_and_not_untrusted(journey):
    organiser, _, base, _, _ = journey
    for method in ("PATCH", "DELETE"):
        response = organiser.options(base + "/venues", headers={**ORIGIN, "Access-Control-Request-Method": method, "Access-Control-Request-Headers": "content-type"})
        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == ORIGIN["Origin"]
        assert method in response.headers["access-control-allow-methods"]
        rejected = organiser.options(base + "/venues", headers={"Origin": "https://attacker.invalid", "Access-Control-Request-Method": method})
        assert "access-control-allow-origin" not in rejected.headers
