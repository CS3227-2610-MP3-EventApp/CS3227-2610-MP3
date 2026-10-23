"""Independent F05 acceptance baseline: guarded real PostgreSQL, no invented F02 data."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from threading import Barrier
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from tests.test_authentication import ORIGIN, PASSWORD, bootstrap, connect, login
from tests.test_programme import journey, request, locations, fields, draft


def published(journey):
    organiser, attendee, base, public, other = journey
    _, room = locations(organiser, base)
    item = draft(organiser, base, room)
    path = base + f"/programme-items/{item['id']}"
    item = request(organiser, "POST", path + "/publish", {"expectedRevision": 1})
    return organiser, attendee, base, public, other, room, path, item


def change(client, path, room, revision=2, **updates):
    return request(client, "POST", path + "/changes", {**fields(room, title="Revised workshop", **updates), "expectedRevision": revision, "confirmed": True})


def changed(journey):
    setup = published(journey)
    current = change(setup[0], setup[6], setup[5])
    return (*setup, current)


def announcement(client, base, current, body="The workshop title has changed."):
    return request(client, "POST", base + "/announcements", {"changeId": current["lastChangeId"], "body": body}, 201)


def test_successive_changes_preserve_history_and_only_latest_attendee_facts(journey):
    organiser, attendee, base, public, _, room, path, original = published(journey)
    first = change(organiser, path, room)
    history = request(organiser, "GET", path + "/changes")
    assert history["total"] == 1
    entry = history["items"][0]
    assert entry["id"] == first["lastChangeId"]
    assert (entry["itemId"], entry["fromRevision"], entry["toRevision"], entry["changeType"]) == (original["id"], 2, 3, "updated")
    assert entry["oldFacts"]["title"] == original["title"]
    assert entry["newFacts"]["title"] == first["title"]
    assert entry["occurredAt"] and entry["reason"] is None
    assert entry["recipientSnapshotStatus"] == "blocked_f02"
    actor_id = request(organiser, "GET", "/api/v1/auth/me")["id"]
    assert entry["actorUserId"] == actor_id
    second = change(organiser, path, room, revision=3, capacity=20, priceMinorUnits=500, accessibilityDetails="Step-free", type="talk", startsAt="2027-01-02T10:00:00+08:00", endsAt="2027-01-02T11:00:00+08:00")
    assert second["revision"] == 4 and second["lastChangeId"] != first["lastChangeId"]
    page = request(organiser, "GET", path + "/changes?limit=1&offset=1")
    assert (page["total"], page["limit"], page["offset"]) == (2, 1, 1)
    all_history = request(organiser, "GET", path + "/changes")["items"]
    assert entry in all_history
    assert sorted(x["fromRevision"] for x in all_history) == [2, 3]
    visible = request(attendee, "GET", public + f"/programme/{original['id']}")
    for key in ("title", "revision", "lastChangeId", "capacity", "priceMinorUnits", "accessibilityDetails", "type", "startsAt", "endsAt"):
        assert visible[key] == second[key]
    assert request(attendee, "GET", public + "/programme")["items"][0]["revision"] == 4
    with connect() as connection:
        assert connection.execute("SELECT count(*) FROM programme_item_revisions WHERE item_id=%s", (original["id"],)).fetchone()[0] == 3
        audits = connection.execute("SELECT user_id, resource_id, resource_revision, occurred_at FROM audit_events WHERE action='programme_change' AND outcome='success' ORDER BY resource_revision").fetchall()
        assert len(audits) == 2
        assert all(str(row[0]) == actor_id and str(row[1]) == original["id"] and row[3] for row in audits)
        assert [row[2] for row in audits] == [3, 4]


def test_cancellation_is_retained_visible_and_cannot_repeat_or_edit(journey):
    organiser, attendee, _, public, _, room, path, item = published(journey)
    cancelled = request(organiser, "POST", path + "/cancel", {"expectedRevision": 2, "confirmed": True, "reason": "  Venue unavailable  "})
    assert cancelled["state"] == "cancelled" and cancelled["revision"] == 3
    assert cancelled["cancellationReason"] == "Venue unavailable" and cancelled["cancelledAt"]
    visible = request(attendee, "GET", public + f"/programme/{item['id']}")
    assert visible["state"] == "cancelled" and visible["lastChangeId"] == cancelled["lastChangeId"]
    assert item["id"] in {x["id"] for x in request(attendee, "GET", public + "/programme")["items"]}
    request(organiser, "POST", path + "/cancel", {"expectedRevision": 3, "confirmed": True, "reason": "Again"}, 409)
    request(organiser, "POST", path + "/changes", {**fields(room), "expectedRevision": 3, "confirmed": True}, 409)
    assert request(organiser, "GET", path) == cancelled
    history = request(organiser, "GET", path + "/changes")
    assert history["total"] == 1 and history["items"][0]["changeType"] == "cancelled"
    assert history["items"][0]["oldFacts"]["state"] == "published"
    assert history["items"][0]["newFacts"]["state"] == "cancelled"


@pytest.mark.parametrize("updates", [{"title": " "}, {"capacity": 31}, {"capacity": True}, {"currency": "USD"}, {"startsAt": "2027-01-01T12:00:00"}, {"roomId": str(uuid4())}, {"confirmed": False}, {"expectedRevision": True}, {"reason": "x" * 1001}, {"state": "cancelled"}])
def test_invalid_change_preserves_all_observable_state(journey, updates):
    organiser, attendee, _, public, _, room, path, item = published(journey)
    before = request(attendee, "GET", public + f"/programme/{item['id']}")
    request(organiser, "POST", path + "/changes", {**fields(room), "title": "Changed", "expectedRevision": 2, "confirmed": True, **updates}, 422)
    assert request(organiser, "GET", path) == item
    assert request(attendee, "GET", public + f"/programme/{item['id']}") == before
    assert request(organiser, "GET", path + "/changes")["total"] == 0


def test_noop_missing_fields_stale_and_invalid_cancel_are_rejected(journey):
    organiser, _, _, _, _, room, path, item = published(journey)
    request(organiser, "POST", path + "/changes", {**fields(room), "expectedRevision": 2, "confirmed": True}, 422)
    for key in (*fields(room), "expectedRevision", "confirmed"):
        body = {**fields(room), "title": "Changed", "expectedRevision": 2, "confirmed": True}
        body.pop(key)
        request(organiser, "POST", path + "/changes", body, 422)
    for reason in ("", " ", "x" * 1001):
        request(organiser, "POST", path + "/cancel", {"expectedRevision": 2, "confirmed": True, "reason": reason}, 422)
    updated = change(organiser, path, room)
    request(organiser, "POST", path + "/cancel", {"expectedRevision": 2, "confirmed": True, "reason": "Stale"}, 409)
    assert request(organiser, "GET", path) == updated
    assert request(organiser, "GET", path + "/changes")["total"] == 1


def test_room_change_and_overlap_allowed_with_per_item_capacity(journey):
    organiser, _, base, _, _, room, path, _ = published(journey)
    _, replacement = locations(organiser, base)
    draft(organiser, base, replacement)
    updated = change(organiser, path, replacement)
    assert updated["roomId"] == replacement["id"]


def test_disruption_authority_origin_and_revocation(journey):
    organiser, attendee, base, _, other, room, path, item = published(journey)
    actions = [("POST", "/changes", {**fields(room), "title": "Denied", "expectedRevision": 2, "confirmed": True}), ("POST", "/cancel", {"expectedRevision": 2, "confirmed": True, "reason": "Denied"}), ("GET", "/changes", None)]
    for method, suffix, body in actions:
        request(attendee, method, path + suffix, body, 403)
        request(organiser, method, path.replace(base, f"/api/v1/organiser/events/{other}") + suffix, body, 403)
        if method == "POST":
            request(organiser, method, path + suffix, body, 403, {"Origin": "https://attacker.invalid"})
    assert request(organiser, "GET", path) == item
    with connect() as connection:
        connection.execute("UPDATE event_memberships SET status='inactive' WHERE event_id=%s", (base.rsplit("/", 1)[1],))
    request(organiser, "GET", path + "/changes", status=403)
    request(organiser, "POST", path + "/cancel", actions[1][2], 403)


def test_concurrent_changes_have_one_winner(journey):
    organiser, _, _, _, _, room, path, _ = published(journey)
    from app.main import app
    barrier = Barrier(2)
    cookies = dict(organiser.cookies)
    def attempt(index):
        with TestClient(app, raise_server_exceptions=False) as client:
            client.cookies.update(cookies)
            barrier.wait(timeout=10)
            return client.post(path + "/changes", json={**fields(room), "title": f"Winner {index}", "expectedRevision": 2, "confirmed": True}, headers=ORIGIN).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(attempt, range(2))) == [200, 409]
    assert request(organiser, "GET", path)["revision"] == 3
    assert request(organiser, "GET", path + "/changes")["total"] == 1


def test_change_audit_failure_rolls_back_snapshot_and_history(journey):
    organiser, attendee, _, public, _, room, path, item = published(journey)
    with connect() as connection:
        audit_count = connection.execute("SELECT count(*) FROM audit_events WHERE outcome='success'").fetchone()[0]
        connection.execute("CREATE FUNCTION disruption_test_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.outcome='success' THEN RAISE EXCEPTION 'synthetic change failure'; END IF; RETURN NEW; END $$")
        connection.execute("CREATE TRIGGER disruption_test_failure BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION disruption_test_fail_audit()")
    try:
        response = organiser.post(path + "/changes", json={**fields(room), "title": "Rollback", "expectedRevision": 2, "confirmed": True}, headers=ORIGIN)
        assert response.status_code == 503 and "synthetic change failure" not in response.text
        assert request(organiser, "GET", path) == item
        assert request(attendee, "GET", public + f"/programme/{item['id']}")["revision"] == 2
        assert request(organiser, "GET", path + "/changes")["total"] == 0
        with connect() as connection:
            assert connection.execute("SELECT count(*) FROM programme_item_revisions WHERE item_id=%s", (item["id"],)).fetchone()[0] == 1
            assert connection.execute("SELECT count(*) FROM audit_events WHERE outcome='success'").fetchone()[0] == audit_count
    finally:
        with connect() as connection:
            connection.execute("DROP TRIGGER disruption_test_failure ON audit_events")
            connection.execute("DROP FUNCTION disruption_test_fail_audit()")


def test_manual_draft_edit_preview_and_exact_attendee_publication(journey):
    organiser, attendee, base, public, _, _, _, _, current = changed(journey)
    saved = announcement(organiser, base, current, "  Updated workshop information.  ")
    path = base + f"/announcements/{saved['id']}"
    assert saved["body"] == "Updated workshop information." and saved["state"] == "draft" and saved["revision"] == 1
    assert saved["sourceFacts"] and not {"actorUserId", "recipients"} & saved["sourceFacts"].keys()
    assert request(organiser, "GET", base + "/announcements")["items"] == [saved]
    assert request(attendee, "GET", public + "/announcements")["total"] == 0
    request(attendee, "GET", public + f"/announcements/{saved['id']}", status=404)
    edited = request(organiser, "PATCH", path, {"expectedRevision": 1, "body": "Please check the revised workshop title."})
    preview = request(organiser, "POST", path + "/preview", {"expectedRevision": 2})
    assert preview["body"] == edited["body"] and preview["revision"] == 2 and preview["announcementId"] == saved["id"]
    assert request(organiser, "POST", path + "/preview", {"expectedRevision": 2})["previewId"] == preview["previewId"]
    result = request(organiser, "POST", path + "/publish", {"previewId": preview["previewId"]})
    assert result["state"] == "published" and result["publishedAt"] and result["body"] == preview["body"]
    visible = request(attendee, "GET", public + f"/announcements/{saved['id']}")
    assert visible["body"] == result["body"] and visible["changeId"] == current["lastChangeId"]
    assert not {"actorUserId", "ownerUserId", "previewId", "recipients"} & visible.keys()
    assert request(attendee, "GET", public + "/announcements")["total"] == 1
    assert request(organiser, "POST", path + "/publish", {"previewId": preview["previewId"]}) == result


@pytest.mark.parametrize("body", ["", " ", "x" * 3001, 123])
def test_announcement_body_bounds_preserve_drafts(journey, body):
    organiser, _, base, _, _, _, _, _, current = changed(journey)
    request(organiser, "POST", base + "/announcements", {"changeId": current["lastChangeId"], "body": body}, 422)
    assert request(organiser, "GET", base + "/announcements")["total"] == 0


def test_edited_reverted_text_invalidates_preview_and_stale_edits(journey):
    organiser, _, base, _, _, _, _, _, current = changed(journey)
    saved = announcement(organiser, base, current)
    path = base + f"/announcements/{saved['id']}"
    preview = request(organiser, "POST", path + "/preview", {"expectedRevision": 1})
    request(organiser, "PATCH", path, {"expectedRevision": 1, "body": "Temporary editorial text."})
    reverted = request(organiser, "PATCH", path, {"expectedRevision": 2, "body": saved["body"]})
    request(organiser, "PATCH", path, {"expectedRevision": 1, "body": "Stale"}, 409)
    request(organiser, "POST", path + "/preview", {"expectedRevision": 1}, 409)
    request(organiser, "POST", path + "/publish", {"previewId": preview["previewId"]}, 409)
    assert request(organiser, "GET", path) == reverted


def test_expired_preview_and_changed_source_reject_publication(journey, monkeypatch):
    organiser, _, base, _, _, room, item_path, _, current = changed(journey)
    saved = announcement(organiser, base, current)
    path = base + f"/announcements/{saved['id']}"
    preview = request(organiser, "POST", path + "/preview", {"expectedRevision": 1})
    from app.disruptions import service
    expires = datetime.fromisoformat(preview["expiresAt"].replace("Z", "+00:00"))
    monkeypatch.setattr(service, "utcnow", lambda: expires)
    request(organiser, "POST", path + "/publish", {"previewId": preview["previewId"]}, 409)
    monkeypatch.undo()
    fresh = request(organiser, "POST", path + "/preview", {"expectedRevision": 1})
    change(organiser, item_path, room, revision=3, capacity=20)
    request(organiser, "POST", path + "/publish", {"previewId": fresh["previewId"]}, 409)
    assert request(organiser, "GET", path)["state"] == "draft"


def test_other_organiser_cannot_read_edit_preview_or_publish_private_draft(journey):
    organiser, attendee, base, _, other, _, _, _, current = changed(journey)
    saved = announcement(organiser, base, current)
    path = base + f"/announcements/{saved['id']}"
    preview = request(organiser, "POST", path + "/preview", {"expectedRevision": 1})
    from app.main import app
    result = bootstrap(["organiser", "--username", "second-owner", "--email", "second@example.test", "--display-name", "Second", "--event-id", base.rsplit("/", 1)[1]])
    assert result.returncode == 0, result.stderr
    with TestClient(app, raise_server_exceptions=False) as second:
        assert login(second, "second-owner", role="organiser").status_code == 200
        request(second, "POST", "/api/v1/auth/change-password", {"currentPassword": PASSWORD, "newPassword": "Replacement-123"})
        assert request(second, "GET", base + "/announcements")["total"] == 0
        for method, suffix, body in [("GET", "", None), ("PATCH", "", {"expectedRevision": 1, "body": "Denied"}), ("POST", "/preview", {"expectedRevision": 1}), ("POST", "/publish", {"previewId": preview["previewId"]})]:
            request(second, method, path + suffix, body, 404)
            request(attendee, method, path + suffix, body, 403)
            request(organiser, method, path.replace(base, f"/api/v1/organiser/events/{other}") + suffix, body, 403)
    assert request(organiser, "GET", path) == saved


def test_one_publication_per_change_and_competing_publish_is_idempotent(journey):
    organiser, attendee, base, public, _, _, _, _, current = changed(journey)
    first = announcement(organiser, base, current)
    second = announcement(organiser, base, current, "Another draft for the same change.")
    paths = [base + f"/announcements/{item['id']}" for item in (first, second)]
    previews = [request(organiser, "POST", path + "/preview", {"expectedRevision": 1}) for path in paths]
    from app.main import app
    cookies, barrier = dict(organiser.cookies), Barrier(2)
    def publish(index):
        with TestClient(app, raise_server_exceptions=False) as client:
            client.cookies.update(cookies)
            barrier.wait(timeout=10)
            return client.post(paths[index] + "/publish", json={"previewId": previews[index]["previewId"]}, headers=ORIGIN).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(publish, range(2))) == [200, 409]
    assert request(attendee, "GET", public + "/announcements")["total"] == 1


def test_announcement_publish_audit_failure_leaves_private_draft(journey):
    organiser, attendee, base, public, _, _, _, _, current = changed(journey)
    saved = announcement(organiser, base, current)
    path = base + f"/announcements/{saved['id']}"
    preview = request(organiser, "POST", path + "/preview", {"expectedRevision": 1})
    with connect() as connection:
        connection.execute("CREATE FUNCTION announcement_test_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.outcome='success' THEN RAISE EXCEPTION 'synthetic announcement failure'; END IF; RETURN NEW; END $$")
        connection.execute("CREATE TRIGGER announcement_test_failure BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION announcement_test_fail_audit()")
    try:
        response = organiser.post(path + "/publish", json={"previewId": preview["previewId"]}, headers=ORIGIN)
        assert response.status_code == 503 and "synthetic announcement failure" not in response.text
        assert request(organiser, "GET", path) == saved
        assert request(attendee, "GET", public + "/announcements")["total"] == 0
    finally:
        with connect() as connection:
            connection.execute("DROP TRIGGER announcement_test_failure ON audit_events")
            connection.execute("DROP FUNCTION announcement_test_fail_audit()")
    request(organiser, "POST", path + "/publish", {"previewId": preview["previewId"]})


def test_missing_f02_notification_dependency_is_explicit_and_preserves_programme(journey):
    organiser, attendee, _, _, _, _, path, _, current = changed(journey)
    root = "/api/v1/attendee/notifications"
    for method, suffix in [("GET", ""), ("GET", f"/{uuid4()}"), ("POST", f"/{uuid4()}/read")]:
        problem = request(attendee, method, root + suffix, {} if method == "POST" else None, 503)
        assert problem["status"] == 503
        assert problem["code"] == "f02_integration_pending"
    assert request(organiser, "GET", path) == current
    assert request(organiser, "GET", path + "/changes")["total"] == 1


def test_announcement_origin_anonymous_preview_swap_and_revoked_replay(journey):
    organiser, attendee, base, public, _, _, item_path, _, current = changed(journey)
    first = announcement(organiser, base, current)
    second = announcement(organiser, base, current, "Second private draft.")
    path = base + f"/announcements/{first['id']}"
    second_path = base + f"/announcements/{second['id']}"
    preview = request(organiser, "POST", path + "/preview", {"expectedRevision": 1})
    request(organiser, "POST", second_path + "/publish", {"previewId": preview["previewId"]}, 409)
    actions = [("POST", base + "/announcements", {"changeId": current["lastChangeId"], "body": "Denied"}), ("PATCH", path, {"expectedRevision": 1, "body": "Denied"}), ("POST", path + "/preview", {"expectedRevision": 1}), ("POST", path + "/publish", {"previewId": preview["previewId"]})]
    for method, target, body in actions:
        for headers in ({}, {"Origin": "https://attacker.invalid"}):
            request(organiser, method, target, body, 403, headers)
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as anonymous:
        for target in (public + "/announcements", public + f"/announcements/{first['id']}", item_path + "/changes"):
            request(anonymous, "GET", target, status=401)
    published_record = request(organiser, "POST", path + "/publish", {"previewId": preview["previewId"]})
    second_preview = request(organiser, "POST", second_path + "/preview", {"expectedRevision": 1})
    with connect() as connection:
        connection.execute("UPDATE event_memberships SET status='inactive' WHERE event_id=%s", (base.rsplit("/", 1)[1],))
    request(organiser, "POST", path + "/publish", {"previewId": preview["previewId"]}, 403)
    request(organiser, "POST", second_path + "/publish", {"previewId": second_preview["previewId"]}, 403)
    assert request(attendee, "GET", public + f"/announcements/{first['id']}")["body"] == published_record["body"]


def test_enabled_f02_without_real_provider_rejects_change_atomically(journey, monkeypatch):
    organiser, _, _, _, _, room, path, item = published(journey)
    with connect() as connection:
        snapshots = connection.execute("SELECT to_jsonb(t) FROM programme_item_revisions t ORDER BY id").fetchall()
        audits = connection.execute("SELECT to_jsonb(t) FROM audit_events t WHERE outcome='success' ORDER BY id").fetchall()
    history = request(organiser, "GET", path + "/changes")
    monkeypatch.setenv("F02_PLANNING_ENABLED", "true")
    problem = request(organiser, "POST", path + "/changes", {**fields(room), "title": "Blocked update", "expectedRevision": 2, "confirmed": True}, 503)
    assert problem["code"] == "f02_integration_pending"
    assert request(organiser, "GET", path) == item
    assert request(organiser, "GET", path + "/changes") == history
    with connect() as connection:
        assert connection.execute("SELECT to_jsonb(t) FROM programme_item_revisions t ORDER BY id").fetchall() == snapshots
        assert connection.execute("SELECT to_jsonb(t) FROM audit_events t WHERE outcome='success' ORDER BY id").fetchall() == audits
