"""Independent announcement job-kind acceptance cases; synthetic provider seam only."""
from datetime import timedelta
import json
from uuid import uuid4

import pytest

from tests.test_programme import journey, request
from tests.test_disruptions import changed, change
from tests.test_ai_analysis import ai_world, _application, _save_rubric, _start
from tests.test_business_applications import submit, clean_database, migrated_database


class Provider:
    def __init__(self, payload, during=None):
        self.payload, self.during, self.calls = payload, during, []

    def complete(self, messages):
        self.calls.append(messages)
        if self.during:
            self.during()
        return json.dumps(self.payload)


@pytest.fixture
def ai_change(journey, monkeypatch):
    setup = changed(journey)
    event_id = setup[2].rsplit("/", 1)[1]
    monkeypatch.setenv("AI_ENABLED", "true")
    monkeypatch.setenv("AI_SYNTHETIC_ONLY", "true")
    monkeypatch.setenv("AI_SYNTHETIC_EVENT_IDS", json.dumps([event_id]))
    monkeypatch.setenv("SOCLAAS_API_KEY", "synthetic-not-a-live-key")
    monkeypatch.setenv("SOCLAAS_MODEL", "synthetic-test-model")
    return setup


def start(setup, request_id=None):
    client, _, base, _, _, _, _, _, current = setup
    body = {"changeId": current["lastChangeId"], "requestId": str(request_id or uuid4()), "syntheticDataConfirmed": True}
    job = request(client, "POST", base + "/announcements/generate", body, 202)
    assert job["kind"] == "announcement_draft"
    assert job["applicationId"] is None and job["report"] is None
    assert job["sourceChangeId"] == current["lastChangeId"] and job["announcementDraftId"] is None
    return job, body


def valid(setup):
    return {"changeId": setup[8]["lastChangeId"], "sourceRevision": setup[8]["revision"], "opening": "update", "closing": "review_plan"}


def run(provider):
    from app.ai.worker import run_once
    assert run_once(provider=provider) is True


def get(setup, job):
    return request(setup[0], "GET", f"/api/v1/ai/jobs/{job['id']}")


def test_announcement_job_creates_private_durable_domain_draft_not_application(ai_change):
    setup = ai_change
    job, _ = start(setup)
    provider = Provider(valid(setup))
    run(provider)
    done = get(setup, job)
    assert done["state"] == "completed" and done["report"] is None and done["applicationId"] is None
    assert done["announcementDraftId"]
    draft_path = setup[2] + f"/announcements/{done['announcementDraftId']}"
    saved = request(setup[0], "GET", draft_path)
    assert saved["state"] == "draft" and saved["changeId"] == setup[8]["lastChangeId"]
    assert saved["body"] and saved["sourceFacts"]
    assert setup[8]["title"] in saved["body"]
    assert saved["sourceFacts"]["newFacts"]["title"] == setup[8]["title"]
    assert saved["sourceFacts"]["toRevision"] == setup[8]["revision"]
    assert request(setup[1], "GET", setup[3] + "/announcements")["total"] == 0
    outbound = json.dumps(provider.calls, default=str)
    for secret in ("programme@example.test", "programme-owner", "Replacement-123", "synthetic-not-a-live-key"):
        assert secret not in outbound
    assert setup[8]["lastChangeId"] in outbound and "Revised workshop" in outbound
    from tests.test_authentication import connect
    with connect() as connection:
        assert connection.execute("SELECT count(*) FROM submissions").fetchone()[0] == 0
        assert connection.execute("SELECT count(*) FROM analysis_rubric_versions").fetchone()[0] == 0
    from app.ai import service
    from app.database import SessionLocal
    with SessionLocal.begin() as db:
        service.cleanup(db, now=service.utcnow() + timedelta(days=31))
    request(setup[0], "GET", f"/api/v1/ai/jobs/{job['id']}", status=404)
    assert request(setup[0], "GET", draft_path) == saved


@pytest.mark.parametrize("updates", [{"changeId": str(uuid4())}, {"sourceRevision": 999}, {"opening": "Publish immediately"}, {"body": "Invented time 12:34"}, {"tool_call": {"name": "publish"}}])
def test_fabricated_or_extra_model_output_cannot_create_draft(ai_change, updates):
    setup = ai_change
    job, _ = start(setup)
    run(Provider({**valid(setup), **updates}))
    done = get(setup, job)
    assert done["state"] == "failed" and done["announcementDraftId"] is None
    assert request(setup[0], "GET", setup[2] + "/announcements")["total"] == 0
    assert request(setup[0], "GET", setup[6]) == setup[8]


@pytest.mark.parametrize("during", ["cancel", "advance", "revoke"])
def test_late_model_result_never_saves_after_cancel_source_advance_or_revocation(ai_change, during):
    setup = ai_change
    job, _ = start(setup)
    def interrupt():
        if during == "cancel":
            request(setup[0], "POST", f"/api/v1/ai/jobs/{job['id']}/cancel", {})
        elif during == "advance":
            change(setup[0], setup[6], setup[5], revision=3, capacity=20)
        else:
            from tests.test_authentication import connect
            with connect() as connection:
                connection.execute("UPDATE event_memberships SET status='inactive' WHERE event_id=%s", (setup[2].rsplit("/", 1)[1],))
    run(Provider(valid(setup), interrupt))
    from tests.test_authentication import connect
    with connect() as connection:
        stored = connection.execute("SELECT state, announcement_draft_id FROM ai_jobs WHERE id=%s", (job["id"],)).fetchone()
        assert stored[0] in ("cancelled", "failed") and stored[1] is None
        assert connection.execute("SELECT count(*) FROM announcement_drafts").fetchone()[0] == 0


def test_generation_deduplication_owner_quota_and_job_authority(ai_change):
    setup = ai_change
    job, body = start(setup)
    assert request(setup[0], "POST", setup[2] + "/announcements/generate", body, 202)["id"] == job["id"]
    request(setup[0], "POST", setup[2] + "/announcements/generate", {**body, "requestId": str(uuid4())}, 409)
    request(setup[1], "GET", f"/api/v1/ai/jobs/{job['id']}", status=403)
    request(setup[1], "POST", setup[2] + "/announcements/generate", body, 403)
    request(setup[0], "POST", setup[2].replace(setup[2].rsplit("/", 1)[1], setup[4]) + "/announcements/generate", body, 403)
    request(setup[0], "POST", f"/api/v1/ai/jobs/{job['id']}/cancel", {})
    for _ in range(9):
        pending, _ = start(setup)
        request(setup[0], "POST", f"/api/v1/ai/jobs/{pending['id']}/cancel", {})
    request(setup[0], "POST", setup[2] + "/announcements/generate", {**body, "requestId": str(uuid4())}, 429)


def test_generation_requires_per_request_confirmation(ai_change):
    setup = ai_change
    body = {"changeId": setup[8]["lastChangeId"], "requestId": str(uuid4())}
    for invalid in (body, {**body, "syntheticDataConfirmed": False}):
        request(setup[0], "POST", setup[2] + "/announcements/generate", invalid, 422)
    assert request(setup[0], "GET", setup[2] + "/announcements")["total"] == 0


def test_request_id_and_active_cap_are_shared_across_job_kinds(ai_world):
    world = ai_world
    record = submit(world, _application(world, description="Synthetic shared-quota application."), client=world.business)
    rubric = _save_rubric(world)
    identifier = uuid4()
    analysis, _, _ = _start(world, record, rubric, identifier)
    base = f"/api/v1/organiser/events/{world.event_id}"
    from tests.test_programme import locations, draft
    _, room = locations(world.owner, base)
    item = draft(world.owner, base, room, startsAt="2027-01-01T10:00:00+08:00", endsAt="2027-01-01T11:00:00+08:00")
    path = base + f"/programme-items/{item['id']}"
    request(world.owner, "POST", path + "/publish", {"expectedRevision": 1})
    current = change(world.owner, path, room, startsAt="2027-01-01T10:00:00+08:00", endsAt="2027-01-01T11:00:00+08:00")
    body = {"changeId": current["lastChangeId"], "requestId": str(identifier), "syntheticDataConfirmed": True}
    request(world.owner, "POST", base + "/announcements/generate", body, 409)
    request(world.owner, "POST", base + "/announcements/generate", {**body, "requestId": str(uuid4())}, 409)
    request(world.owner, "POST", f"/api/v1/ai/jobs/{analysis['id']}/cancel", {})
    pending = request(world.owner, "POST", base + "/announcements/generate", {**body, "requestId": str(uuid4())}, 202)
    assert pending["kind"] == "announcement_draft" and pending["applicationId"] is None
