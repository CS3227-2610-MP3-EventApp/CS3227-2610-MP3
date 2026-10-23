"""Independent TCR-F05-002 extensions for review findings; real HTTP and DB."""
from concurrent.futures import ThreadPoolExecutor
from threading import Event

import pytest
from fastapi.testclient import TestClient

from tests.test_authentication import ORIGIN, connect
from tests.test_programme import journey, request, fields
from tests.test_disruptions import changed, published, change, announcement


def test_published_announcement_cannot_be_edited_through_draft_endpoint(journey):
    organiser, attendee, base, public, _, _, _, _, current = changed(journey)
    saved = announcement(organiser, base, current)
    path = base + f"/announcements/{saved['id']}"
    preview = request(organiser, "POST", path + "/preview", {"expectedRevision": saved["revision"]})
    published_record = request(organiser, "POST", path + "/publish", {"previewId": preview["previewId"]})
    attendee_before = request(attendee, "GET", public + f"/announcements/{saved['id']}")
    request(organiser, "PATCH", path, {"expectedRevision": published_record["revision"], "body": "Unapproved replacement text."}, 409)
    assert request(organiser, "GET", path) == published_record
    assert request(attendee, "GET", public + f"/announcements/{saved['id']}") == attendee_before


def test_history_default_page_exposes_newest_changes_before_older_offset(journey):
    organiser, _, _, _, _, room, path, _ = published(journey)
    changes = []
    for index in range(51):
        current = request(organiser, "POST", path + "/changes", {**fields(room, title=f"Historical update {index}"), "expectedRevision": 2 + index, "confirmed": True})
        changes.append(current["lastChangeId"])
    first = request(organiser, "GET", path + "/changes")
    older = request(organiser, "GET", path + "/changes?offset=50")
    assert (first["total"], first["limit"], first["offset"]) == (51, 50, 0)
    assert [entry["id"] for entry in first["items"]] == list(reversed(changes[1:]))
    assert [entry["toRevision"] for entry in first["items"]] == list(range(53, 3, -1))
    assert older["total"] == 51 and older["offset"] == 50
    assert [entry["id"] for entry in older["items"]] == changes[:1]
    assert older["items"][0]["toRevision"] == 3


@pytest.mark.parametrize("operation", ["change", "cancel", "create", "edit", "preview", "publish"])
def test_membership_revoked_after_actor_snapshot_cannot_commit_write(journey, monkeypatch, operation):
    organiser, attendee, base, public, _, room, item_path, _, current = changed(journey)
    saved = announcement(organiser, base, current)
    draft_path = base + f"/announcements/{saved['id']}"
    preview = request(organiser, "POST", draft_path + "/preview", {"expectedRevision": 1})
    actions = {
        "change": ("POST", item_path + "/changes", {**fields(room), "title": "Should never commit", "expectedRevision": 3, "confirmed": True}),
        "cancel": ("POST", item_path + "/cancel", {"expectedRevision": 3, "confirmed": True, "reason": "Should never commit"}),
        "create": ("POST", base + "/announcements", {"changeId": current["lastChangeId"], "body": "Should never save"}),
        "edit": ("PATCH", draft_path, {"expectedRevision": 1, "body": "Should never save"}),
        "preview": ("POST", draft_path + "/preview", {"expectedRevision": 1}),
        "publish": ("POST", draft_path + "/publish", {"previewId": preview["previewId"]}),
    }
    tables = ("programme_items", "programme_item_revisions", "programme_changes", "announcement_drafts", "announcement_publication_previews")
    def state():
        with connect() as connection:
            result = {table: connection.execute(f"SELECT to_jsonb(t) FROM {table} t ORDER BY id").fetchall() for table in tables}
            result["success_audits"] = connection.execute("SELECT to_jsonb(t) FROM audit_events t WHERE outcome='success' ORDER BY id").fetchall()
            return result
    before = state()
    public_before = request(attendee, "GET", public + f"/programme/{current['id']}")
    from app.auth import dependencies
    from app.main import app
    real_actor = dependencies.actor
    snapshot_taken, resume = Event(), Event()
    def held_actor(*args, **kwargs):
        snapshot = real_actor(*args, **kwargs)
        snapshot_taken.set()
        assert resume.wait(timeout=15), "Revocation coordinator did not release actor snapshot"
        return snapshot
    monkeypatch.setattr(dependencies, "actor", held_actor)
    cookies = dict(organiser.cookies)
    def write():
        with TestClient(app, raise_server_exceptions=False) as client:
            client.cookies.update(cookies)
            method, path, body = actions[operation]
            return client.request(method, path, json=body, headers=ORIGIN)
    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(write)
        try:
            assert snapshot_taken.wait(timeout=15), "Request never resolved its real actor"
            with connect() as connection:
                connection.execute("UPDATE event_memberships SET status='inactive' WHERE event_id=%s", (base.rsplit("/", 1)[1],))
        finally:
            resume.set()
        response = future.result(timeout=20)
    monkeypatch.setattr(dependencies, "actor", real_actor)
    assert response.status_code == 403, response.text
    assert state() == before
    assert request(attendee, "GET", public + f"/programme/{current['id']}") == public_before
