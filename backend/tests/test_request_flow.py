"""Independent approved r4 request/settings and r2 decision HTTP acceptance."""
from datetime import datetime, timedelta, timezone
import hashlib
import json
import subprocess
import sys
from uuid import uuid4

from fastapi.testclient import TestClient
import psycopg
import pytest

from tests.test_business_applications import (
    AUTH_TABLES, BACKEND, CONTENT_KEYS, DOMAIN_TABLES, ORIGIN, PASSWORD,
    clean_database, connect, concurrent, content, create, domain_state, migrate,
    migrated_database, open_event, own_path, password_hash, problem, reject_writes,
    request, reset_schema, seed_organiser, submit, success, success_audits,
    table_rows, world,
)


SUMMARY_KEYS = {"eventId", "title", "timezone", "startsAt", "endsAt", "eventRevision", "applicationsOpen", "settingsRevision"}


def settings_path(world):
    return f"/api/v1/organiser/events/{world.a}/application-settings"


def close(world):
    current = success(world.oa.get(settings_path(world)))
    return success(request(world.oa, "PUT", settings_path(world), json={"expectedRevision": current["revision"], "applicationsOpen": False}))


def decision_path(world, record, event=None):
    return f"/api/v1/organiser/events/{event or world.a}/applications/{record['id']}/decision"


def decide(world, record, outcome="accepted", reason=None, **overrides):
    return request(world.oa, "POST", decision_path(world, record), json={"expectedRevision": record["revision"], "outcome": outcome, "reason": reason, **overrides})


def test_virtual_closed_settings_and_assigned_named_summary_are_read_only(world):
    # REQ01/02: first assertion is meaningful missing endpoint, no new model imports.
    before = {name: table_rows(name) for name in AUTH_TABLES | {"application_approvals", "submissions", "event_participations"}}
    summaries = success(world.oa.get("/api/v1/organiser/events"))
    assert len(summaries) == 1 and set(summaries[0]) == SUMMARY_KEYS
    assert summaries[0] == {"eventId": world.a, "title": "Synthetic organiser-a", "timezone": "Asia/Singapore", "startsAt": "2027-01-01T01:00:00Z", "endsAt": "2027-01-01T10:00:00Z", "eventRevision": 1, "applicationsOpen": False, "settingsRevision": 1}
    assert success(world.oa.get(settings_path(world))) == {"eventId": world.a, "applicationsOpen": False, "revision": 1}
    assert not table_rows("application_settings")
    assert {name: table_rows(name) for name in before} == before
    for client, status, code in [(world.anonymous, 401, "unauthenticated"), (world.x, 403, "forbidden"), (world.attendee, 403, "forbidden")]:
        problem(client.get("/api/v1/organiser/events"), status, code)
    with connect() as connection:
        connection.execute("UPDATE event_memberships SET status='inactive' WHERE user_id=%s", (world.oa_id,))
    assert success(world.oa.get("/api/v1/organiser/events")) == []


@pytest.mark.parametrize("body", [
    {}, {"expectedRevision": 1}, {"applicationsOpen": True},
    {"expectedRevision": True, "applicationsOpen": True},
    {"expectedRevision": "1", "applicationsOpen": True},
    {"expectedRevision": 0, "applicationsOpen": True},
    {"expectedRevision": 1, "applicationsOpen": "true"},
    {"expectedRevision": 1, "applicationsOpen": 1},
    {"expectedRevision": 1, "applicationsOpen": None},
])
def test_settings_strict_validation_preserves_default_and_metadata(world, body):
    before, audits = domain_state(), table_rows("audit_events")
    events = table_rows("events")
    problem(request(world.oa, "PUT", settings_path(world), json=body), 422, "validation_error")
    assert domain_state() == before and table_rows("audit_events") == audits and table_rows("events") == events


def test_settings_replay_cas_and_close_do_not_change_programme_metadata(world):
    events = table_rows("events")
    assert success(request(world.oa, "PUT", settings_path(world), json={"expectedRevision": 1, "applicationsOpen": False})) == {"eventId": world.a, "applicationsOpen": False, "revision": 1}
    assert success_audits() == []
    opened = open_event(world)
    before = domain_state()
    problem(request(world.oa, "PUT", settings_path(world), json={"expectedRevision": 1, "applicationsOpen": False}), 409, "event_revision_conflict")
    assert domain_state() == before
    assert close(world) == {"eventId": world.a, "applicationsOpen": False, "revision": 3}
    assert opened["revision"] == 2 and table_rows("events") == events
    audits = success_audits()
    assert {(row["action"], str(row["resource_id"]), row["resource_revision"]) for row in audits} == {("application_settings_update", world.a, 2), ("application_settings_update", world.a, 3)}


def test_closed_unknown_context_is_indistinguishable_but_own_draft_edit_survives(world):
    # REQ04: closed event cannot be enumerated by new-create errors.
    responses = [request(world.x, "POST", "/api/v1/business/applications", json={"businessId": world.xid, "eventId": event, **content()}) for event in [world.a, str(uuid4())]]
    assert problem(responses[0], 404, "not_found") == problem(responses[1], 404, "not_found")
    open_event(world)
    record = create(world)
    assert record["businessName"] == "business-x" and record["eventTitle"] == "Synthetic organiser-a" and record["decision"] is None
    close(world)
    before, audits = domain_state(), success_audits()
    own_events = success(world.x.get("/api/v1/business/application-events", params={"businessId": world.xid}))
    assert len(own_events) == 1 and own_events[0]["applicationId"] == record["id"] and own_events[0]["applicationsOpen"] is False
    assert success(world.y.get("/api/v1/business/application-events", params={"businessId": world.yid})) == []
    problem(request(world.y, "POST", "/api/v1/business/applications", json={"businessId": world.yid, "eventId": world.a, **content()}), 404, "not_found")
    problem(request(world.x, "POST", own_path(record) + "/submit", json={"expectedRevision": 1}), 409, "applications_closed")
    problem(request(world.x, "POST", "/api/v1/business/applications", json={"businessId": world.xid, "eventId": world.a, **content()}), 409, "application_exists")
    assert domain_state() == before and success_audits() == audits
    edited = success(request(world.x, "PUT", own_path(record), json={"expectedRevision": 1, **content(description="Edited while applications are closed")}))
    assert edited["revision"] == 2 and edited["status"] == "draft"
    problem(request(world.x, "POST", own_path(record) + "/submit", json={"expectedRevision": 1}), 409, "revision_conflict")
    assert success(world.x.get(own_path(record))) == edited


@pytest.mark.parametrize("method", ["GET", "POST"])
def test_retired_eligibility_checks_authority_and_never_creates_grants(world, method):
    path = f"/api/v1/organiser/events/{world.a}/business-approvals"
    before, audits = domain_state(), table_rows("audit_events")
    args = {"json": {"businessId": world.xid}} if method == "POST" else {}
    problem(request(world.oa, method, path, **args), 410, "eligibility_retired")
    for client, status, code in [(world.anonymous, 401, "unauthenticated"), (world.x, 403, "forbidden"), (world.ob, 403, "forbidden")]:
        problem(request(client, method, path, **args), status, code)
    if method == "POST":
        problem(request(world.oa, method, path, headers={}, **args), 403, "forbidden")
    assert domain_state() == before and table_rows("audit_events") == audits


@pytest.mark.parametrize("operation", ["create", "submit"])
def test_close_and_business_write_serialize_as_one_complete_order(world, operation):
    open_event(world)
    record = create(world) if operation == "submit" else None
    # Both actors use separate actual sessions but arrive at the same barrier.
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    barrier = Barrier(2)
    def perform(client, method, path, body):
        with TestClient(world.app, raise_server_exceptions=False) as current:
            current.cookies.set("eventapp_session", client.cookies["eventapp_session"])
            barrier.wait(timeout=10)
            return request(current, method, path, json=body)
    path = own_path(record) + "/submit" if record else "/api/v1/business/applications"
    body = {"expectedRevision": 1} if record else {"businessId": world.xid, "eventId": world.a, **content()}
    with ThreadPoolExecutor(max_workers=2) as pool:
        closing = pool.submit(perform, world.oa, "PUT", settings_path(world), {"expectedRevision": 2, "applicationsOpen": False})
        writing = pool.submit(perform, world.x, "POST", path, body)
        closed, written = closing.result(), writing.result()
    assert success(closed)["applicationsOpen"] is False
    if written.status_code in {200, 201}:
        saved = success(written, 200 if record else 201)
        assert saved["status"] == ("submitted" if record else "draft")
        assert len(table_rows("submissions")) == len(table_rows("event_participations")) == 1
        assert saved["decision"] is None
    else:
        problem(written, 409 if record else 404, "applications_closed" if record else "not_found")
        assert len(table_rows("submissions")) == (1 if record else 0)
    # Once closure is authoritative, fresh writes cannot subsequently enter.
    if record and written.status_code == 200:
        problem(request(world.x, "POST", path, json=body), 409, "application_submitted")
    elif not record and written.status_code == 201:
        problem(request(world.y, "POST", path, json={"businessId": world.yid, "eventId": world.a, **content()}), 404, "not_found")
    else:
        problem(request(world.x, "POST", path, json=body), 409 if record else 404, "applications_closed" if record else "not_found")


@pytest.mark.parametrize("outcome,reason,expected", [("accepted", None, None), ("accepted", "  ", None), ("accepted", " Approved  ", "Approved"), ("rejected", "  Space requirements cannot be met.  ", "Space requirements cannot be met.")])
def test_once_only_decision_is_applicant_visible_and_preserves_frozen_state(world, outcome, reason, expected):
    open_event(world)
    draft = create(world)
    edited = success(request(world.x, "PUT", own_path(draft), json={"expectedRevision": 1, **content(description="Submitted second saved revision")}))
    frozen = submit(world, edited)
    close(world)
    participations = table_rows("event_participations")
    decided = success(decide(world, frozen, outcome, reason))
    assert decided["status"] == outcome and decided["revision"] == 4
    assert set(decided["decision"]) == {"outcome", "reason", "decidedAt"}
    assert decided["decision"]["outcome"] == outcome and decided["decision"]["reason"] == expected
    assert datetime.fromisoformat(decided["decision"]["decidedAt"].replace("Z", "+00:00")).utcoffset() == timedelta(0)
    assert {key: decided[key] for key in ["content", "submittedAt", "frozenSubmittedContentRevision", "participationId"]} == {key: frozen[key] for key in ["content", "submittedAt", "frozenSubmittedContentRevision", "participationId"]}
    assert decided["frozenSubmittedContentRevision"] == 2 and table_rows("event_participations") == participations
    assert success(world.x.get(own_path(draft))) == decided
    assert success(world.oa.get(f"/api/v1/organiser/events/{world.a}/applications")) == [decided]
    before, audits = domain_state(), success_audits()
    retry = decide(world, frozen, "rejected", "A second attempt must not overwrite")
    assert problem(retry, 409, "application_decided")["currentApplication"] == decided
    assert domain_state() == before and success_audits() == audits
    assert len(table_rows("application_decisions")) == 1
    entries = [row for row in audits if row["action"] == "application_decide"]
    assert len(entries) == 1 and entries[0]["user_id"] == world.oa_id and str(entries[0]["resource_id"]) == decided["id"] and entries[0]["resource_revision"] == 4
    problem(world.y.get(own_path(draft)), 404, "not_found")
    for method, path, body in [("PUT", own_path(draft), {"expectedRevision": 4, **content()}), ("POST", own_path(draft) + "/submit", {"expectedRevision": 4})]:
        problem(request(world.x, method, path, json=body), 409, "application_submitted")
    code = "import json,sys; from app.main import app; from fastapi.testclient import TestClient; d=json.load(sys.stdin); c=TestClient(app); c.cookies.set('eventapp_session',d['cookie']); r=c.get(d['path']); print(json.dumps({'status':r.status_code,'body':r.json()}))"
    observed = subprocess.run([sys.executable, "-c", code], cwd=BACKEND, input=json.dumps({"cookie": world.x.cookies["eventapp_session"], "path": own_path(draft)}), text=True, capture_output=True)
    assert observed.returncode == 0, observed.stderr
    assert json.loads(observed.stdout.strip().splitlines()[-1]) == {"status": 200, "body": decided}


@pytest.mark.parametrize("outcome,reason", [("rejected", None), ("rejected", ""), ("rejected", "  "), ("rejected", "x" * 1001), ("accepted", "x" * 1001), ("accepted", 1), ("rejected", {})])
def test_decision_reason_invalid_boundaries_preserve_all_state(world, outcome, reason):
    open_event(world)
    frozen = submit(world, create(world))
    before, audits = domain_state(), success_audits()
    body = problem(decide(world, frozen, outcome, reason), 422, "validation_error")
    assert {field["field"] for field in body["fieldErrors"]} == {"reason"}
    assert domain_state() == before and success_audits() == audits


@pytest.mark.parametrize("outcome,size", [("accepted", 1), ("accepted", 1000), ("rejected", 1), ("rejected", 1000)])
def test_decision_reason_trimmed_exact_boundaries(world, outcome, size):
    open_event(world)
    frozen = submit(world, create(world))
    assert success(decide(world, frozen, outcome, "  " + "x" * size + "  "))["decision"]["reason"] == "x" * size


def test_acceptance_can_omit_optional_reason(world):
    open_event(world)
    frozen = submit(world, create(world))
    response = request(world.oa, "POST", decision_path(world, frozen), json={"expectedRevision": frozen["revision"], "outcome": "accepted"})
    assert success(response)["decision"]["reason"] is None


@pytest.mark.parametrize("body", [{}, {"expectedRevision": 2, "outcome": "rejected"}, {"expectedRevision": True, "outcome": "accepted"}, {"expectedRevision": "2", "outcome": "accepted"}, {"expectedRevision": 0, "outcome": "accepted"}, {"expectedRevision": 2, "outcome": "approved"}, {"expectedRevision": 2, "outcome": "accepted", "decidedBy": "PRIVATE-AUTHORITY"}])
def test_decision_rejects_missing_type_and_client_authority_fields(world, body):
    open_event(world)
    frozen = submit(world, create(world))
    before, audits = domain_state(), success_audits()
    response = request(world.oa, "POST", decision_path(world, frozen), json=body)
    problem(response, 422, "validation_error")
    assert "PRIVATE-AUTHORITY" not in response.text and "decidedBy" not in response.text
    assert domain_state() == before and success_audits() == audits


def test_decision_permissions_draft_absent_and_foreign_targets_never_expose_conflicts(world):
    open_event(world)
    draft = create(world)
    path = decision_path(world, draft)
    body = {"expectedRevision": 1, "outcome": "accepted"}
    problem(request(world.oa, "POST", path, json=body), 404, "not_found")
    frozen = submit(world, draft)
    before = domain_state()
    for client, status, code in [(world.anonymous, 401, "unauthenticated"), (world.x, 403, "forbidden"), (world.attendee, 403, "forbidden"), (world.ob, 403, "forbidden")]:
        response = request(client, "POST", path, json=body)
        assert "currentApplication" not in problem(response, status, code)
        assert all(marker not in response.text for marker in content().values())
    foreign = request(world.ob, "POST", decision_path(world, frozen, world.b), json=body)
    absent = request(world.ob, "POST", decision_path(world, {"id": str(uuid4())}, world.b), json=body)
    one, two = problem(foreign, 404, "not_found"), problem(absent, 404, "not_found")
    assert {key: value for key, value in one.items() if key != "instance"} == {key: value for key, value in two.items() if key != "instance"}
    with connect() as connection:
        connection.execute("UPDATE event_memberships SET status='inactive' WHERE user_id=%s", (world.oa_id,))
    problem(decide(world, frozen), 403, "forbidden")
    assert domain_state() == before


@pytest.mark.parametrize("other", ["accepted", "rejected"])
def test_decision_record_cas_and_competing_outcomes_have_one_winner(world, other):
    open_event(world)
    frozen = submit(world, create(world))
    before = domain_state()
    stale = decide(world, frozen, expectedRevision=frozen["frozenSubmittedContentRevision"])
    assert problem(stale, 409, "revision_conflict")["currentApplication"] == frozen
    assert domain_state() == before
    path = decision_path(world, frozen)
    responses = concurrent(world, world.oa, [("POST", path, {"expectedRevision": 2, "outcome": outcome, "reason": "Applicant-safe decision"}) for outcome in ["accepted", other]])
    assert sorted(response.status_code for response in responses) == [200, 409]
    winner = success(next(response for response in responses if response.status_code == 200))
    loser = next(response for response in responses if response.status_code == 409)
    assert problem(loser, 409, "application_decided")["currentApplication"] == winner
    assert winner["revision"] == 3 and winner["frozenSubmittedContentRevision"] == 1
    assert winner["content"] == frozen["content"] and winner["submittedAt"] == frozen["submittedAt"]
    assert len(table_rows("application_decisions")) == len([row for row in success_audits() if row["action"] == "application_decide"]) == 1


@pytest.mark.parametrize("table,event", [("application_decisions", "INSERT"), ("submissions", "UPDATE"), ("audit_events", "INSERT")])
def test_decision_domain_and_audit_failures_roll_back_and_allow_later_success(world, table, event, caplog):
    open_event(world)
    frozen = submit(world, create(world))
    before, audits = domain_state(), success_audits()
    with reject_writes(table, event):
        response = decide(world, frozen, "rejected", "PRIVATE-REASON-NOT-LOGGED")
        problem(response, 503, "service_unavailable")
    assert domain_state() == before and success_audits() == audits
    assert "synthetic private write rejection" not in caplog.text + response.text
    assert "PRIVATE-REASON-NOT-LOGGED" not in caplog.text + json.dumps(table_rows("audit_events"))
    assert success(decide(world, frozen))["status"] == "accepted"


def test_decision_origin_rejection_and_reason_plaintext_privacy(world, caplog):
    open_event(world)
    frozen = submit(world, create(world))
    before, audits = domain_state(), table_rows("audit_events")
    for origin in [None, "null", "https://attacker.invalid"]:
        problem(request(world.oa, "POST", decision_path(world, frozen), json={"expectedRevision": 2, "outcome": "accepted"}, headers={} if origin is None else {"Origin": origin}), 403, "forbidden")
    assert domain_state() == before and table_rows("audit_events") == audits
    reason = "<script>PRIVATE-DECISION-REASON</script>"
    decided = success(decide(world, frozen, "rejected", reason))
    assert decided["decision"]["reason"] == reason
    assert reason not in caplog.text + json.dumps(table_rows("audit_events"))
    response = world.y.get(own_path(frozen))
    problem(response, 404, "not_found")
    assert reason not in response.text


@pytest.mark.parametrize("body,code,detail,fields", [
    ({"currentPassword": PASSWORD, "newPassword": PASSWORD}, "password_unchanged", "The new password must be different from your current password.", None),
    ({"currentPassword": "Wrong-Synthetic-Password", "newPassword": "Replacement-Synthetic-Password"}, "current_password_incorrect", "The current password is incorrect.", None),
    ({"currentPassword": "Wrong-Synthetic-Password", "newPassword": "Wrong-Synthetic-Password"}, "current_password_incorrect", "The current password is incorrect.", None),
    ({"currentPassword": PASSWORD}, "validation_error", "Request validation failed.", [{"field": "newPassword", "code": "required"}]),
    ({"currentPassword": PASSWORD, "newPassword": ""}, "validation_error", "Request validation failed.", [{"field": "newPassword", "code": "required"}]),
    ({"currentPassword": PASSWORD, "newPassword": "x" * 7}, "validation_error", "Request validation failed.", [{"field": "newPassword", "code": "password_length"}]),
    ({"currentPassword": PASSWORD, "newPassword": "x" * 129}, "validation_error", "Request validation failed.", [{"field": "newPassword", "code": "password_length"}]),
    ({"currentPassword": PASSWORD, "newPassword": "Replacement-Synthetic-Password", "PRIVATE-FIELD": "PRIVATE-SECRET"}, "validation_error", "Request validation failed.", [{"field": "request", "code": "invalid"}]),
])
def test_password_rejections_give_safe_specific_reasons_without_credential_or_session_change(world, body, code, detail, fields, caplog):
    with connect() as connection:
        connection.execute("UPDATE password_credentials SET must_change_password=true WHERE user_id=%s", (world.oa_id,))
        credentials = connection.execute("SELECT to_jsonb(c) FROM password_credentials c ORDER BY user_id").fetchall()
        sessions = connection.execute("SELECT id,token_hash,expires_at,revoked_at FROM sessions ORDER BY id").fetchall()
    cookie = world.oa.cookies["eventapp_session"]
    response = request(world.oa, "POST", "/api/v1/auth/change-password", json=body)
    from tests.test_authentication import problem as auth_problem
    observed = auth_problem(response, 422, code)
    assert observed["detail"] == detail
    if fields is not None:
        assert observed["fieldErrors"] == fields
    else:
        assert "fieldErrors" not in observed
    assert "set-cookie" not in response.headers and world.oa.cookies["eventapp_session"] == cookie
    with connect() as connection:
        assert connection.execute("SELECT to_jsonb(c) FROM password_credentials c ORDER BY user_id").fetchall() == credentials
        assert connection.execute("SELECT id,token_hash,expires_at,revoked_at FROM sessions ORDER BY id").fetchall() == sessions
    assert world.oa.get("/api/v1/auth/me").json()["mustChangePassword"] is True
    problem(world.oa.get(settings_path(world)), 403, "password_change_required")
    for marker in [PASSWORD, "PRIVATE-SECRET", "PRIVATE-FIELD", cookie]:
        assert marker not in response.text + caplog.text + json.dumps(table_rows("audit_events"))


def test_authenticated_only_password_error_reasons_do_not_replace_login_or_origin_privacy(world):
    path = "/api/v1/auth/change-password"
    same = {"currentPassword": PASSWORD, "newPassword": PASSWORD}
    from tests.test_authentication import problem as auth_problem
    auth_problem(request(world.anonymous, "POST", path, json=same), 401, "unauthenticated")
    before = table_rows("password_credentials"), table_rows("sessions"), table_rows("audit_events")
    auth_problem(request(world.oa, "POST", path, json=same, headers={}), 403, "forbidden")
    assert (table_rows("password_credentials"), table_rows("sessions"), table_rows("audit_events")) == before
    responses = [request(world.anonymous, "POST", "/api/v1/auth/login", json={"identifier": identifier, "password": password, "role": role}) for identifier, password, role in [("unknown-synthetic", PASSWORD, "business"), ("business-x", "Wrong-Synthetic-Password", "business"), ("business-x", PASSWORD, "organiser")]]
    bodies = [auth_problem(response, 401, "invalid_credentials") for response in responses]
    assert bodies[0] == bodies[1] == bodies[2]


@pytest.mark.parametrize("endpoint,changes,removed,expected", [
    ("login", {}, "identifier", [{"field": "identifier", "code": "required"}]),
    ("login", {"identifier": ""}, None, [{"field": "identifier", "code": "required"}]),
    ("login", {"password": "x" * 7}, None, [{"field": "password", "code": "password_length"}]),
    ("login", {"password": 42}, None, [{"field": "password", "code": "invalid"}]),
    ("register/attendee", {}, "email", [{"field": "email", "code": "required"}]),
    ("register/attendee", {"displayName": ""}, None, [{"field": "displayName", "code": "required"}]),
    ("register/attendee", {"email": "invalid"}, None, [{"field": "email", "code": "invalid"}]),
    ("register/attendee", {"password": "x" * 129}, None, [{"field": "password", "code": "password_length"}]),
    ("register/attendee", {"PRIVATE-FIELD": "PRIVATE-SECRET"}, None, [{"field": "request", "code": "invalid"}]),
])
def test_auth_validation_has_precise_fixed_field_codes_without_partial_or_secret_effects(world, endpoint, changes, removed, expected, caplog):
    base = {"identifier": "unknown", "password": PASSWORD, "role": "attendee"} if endpoint == "login" else {"username": "fresh-synthetic", "email": "fresh@example.test", "displayName": "Fresh Synthetic", "password": PASSWORD}
    base.update(changes)
    if removed:
        base.pop(removed)
    tables = AUTH_TABLES | DOMAIN_TABLES
    before = {table: table_rows(table) for table in tables}
    response = request(world.anonymous, "POST", "/api/v1/auth/" + endpoint, json=base)
    from tests.test_authentication import problem as auth_problem
    assert auth_problem(response, 422, "validation_error")["fieldErrors"] == expected
    assert "set-cookie" not in response.headers
    assert {table: table_rows(table) for table in tables} == before
    assert all(value not in response.text + caplog.text for value in [PASSWORD, "PRIVATE-FIELD", "PRIVATE-SECRET"])


@pytest.mark.parametrize("kind", ["auth", "settings", "decision"])
def test_malformed_json_new_mutations_use_fixed_request_error_without_writes(world, kind):
    if kind == "decision":
        open_event(world)
        frozen = submit(world, create(world))
        actor, method, path = world.oa, "POST", decision_path(world, frozen)
    elif kind == "settings":
        actor, method, path = world.oa, "PUT", settings_path(world)
    else:
        actor, method, path = world.anonymous, "POST", "/api/v1/auth/login"
    before = {table: table_rows(table) for table in AUTH_TABLES | DOMAIN_TABLES}
    response = request(actor, method, path, content='{ "PRIVATE-MALFORMED":', headers={**ORIGIN, "Content-Type": "application/json"})
    if kind == "auth":
        from tests.test_authentication import problem as auth_problem
        body = auth_problem(response, 422, "validation_error")
    else:
        body = problem(response, 422, "validation_error")
    assert body["fieldErrors"] == [{"field": "request", "code": "invalid"}]
    assert "PRIVATE-MALFORMED" not in response.text
    assert {table: table_rows(table) for table in AUTH_TABLES | DOMAIN_TABLES} == before


def test_new_settings_and_decision_malformed_ids_and_unassigned_targets_are_safe(world):
    before = domain_state()
    malformed = request(world.oa, "PUT", "/api/v1/organiser/events/not-a-uuid/application-settings", json={"expectedRevision": 1, "applicationsOpen": True})
    assert {item["field"] for item in problem(malformed, 422, "validation_error")["fieldErrors"]} <= {"eventId", "request"}
    unknown = request(world.oa, "PUT", f"/api/v1/organiser/events/{uuid4()}/application-settings", json={"expectedRevision": 1, "applicationsOpen": True})
    problem(unknown, 403, "forbidden")
    invalid = request(world.oa, "POST", f"/api/v1/organiser/events/{world.a}/applications/not-a-uuid/decision", json={"expectedRevision": 1, "outcome": "accepted"})
    assert {item["field"] for item in problem(invalid, 422, "validation_error")["fieldErrors"]} <= {"request"}
    assert domain_state() == before


def test_latest_schema_enforces_settings_and_decision_constraints(world):
    from tests.test_business_applications import assert_current_schema
    assert_current_schema()
    with connect() as connection:
        columns = connection.execute("SELECT column_name,is_nullable,column_default FROM information_schema.columns WHERE table_name='application_settings'").fetchall()
        assert any(name == "applications_open" and nullable == "NO" and default and "false" in default for name, nullable, default in columns)
        for statement, params in [
            ("INSERT INTO application_settings(event_id,applications_open,revision) VALUES(%s,false,0)", (world.a,)),
            ("INSERT INTO application_settings(event_id,applications_open,revision) VALUES(%s,NULL,1)", (world.a,)),
            ("INSERT INTO application_settings(event_id,applications_open,revision) VALUES(%s,false,1)", (str(uuid4()),)),
        ]:
            with pytest.raises(psycopg.IntegrityError):
                connection.execute(statement, params)
    open_event(world)
    frozen = submit(world, create(world))
    accepted = success(decide(world, frozen))
    before = domain_state()
    with connect() as connection:
        for statement, params in [
            ("UPDATE application_decisions SET outcome='invalid' WHERE submission_id=%s", (frozen["id"],)),
            ("UPDATE application_decisions SET outcome='rejected',reason=NULL WHERE submission_id=%s", (frozen["id"],)),
            ("UPDATE application_decisions SET reason=%s WHERE submission_id=%s", ("x" * 1001, frozen["id"])),
            ("UPDATE application_decisions SET expected_record_revision=0 WHERE submission_id=%s", (frozen["id"],)),
            ("UPDATE application_decisions SET frozen_content_revision=0 WHERE submission_id=%s", (frozen["id"],)),
            ("UPDATE application_decisions SET submission_id=%s WHERE submission_id=%s", (str(uuid4()), frozen["id"])),
            ("UPDATE application_decisions SET decided_by_user_id=%s WHERE submission_id=%s", (str(uuid4()), frozen["id"])),
        ]:
            with pytest.raises(psycopg.IntegrityError):
                connection.execute(statement, params)
        with pytest.raises(psycopg.IntegrityError):
            connection.execute("INSERT INTO application_decisions(id,submission_id,outcome,reason,decided_by_user_id,decided_at,expected_record_revision,frozen_content_revision) SELECT %s,submission_id,outcome,reason,decided_by_user_id,decided_at,expected_record_revision,frozen_content_revision FROM application_decisions WHERE submission_id=%s", (str(uuid4()), frozen["id"]))
    assert domain_state() == before and accepted["decision"] is not None


def test_additive_upgrade_preserves_legacy_grants_drafts_frozen_records_and_sessions(password_hash):
    # REQ10: seed exact historical schema, not new services/models or reseeded API state.
    reset_schema()
    migrate("20261020_0003")
    org, event = seed_organiser("legacy-organiser", password_hash)
    owner, business, participation, draft_id, frozen_participation, frozen_id = [str(uuid4()) for _ in range(6)]
    now, token = datetime.now(timezone.utc), "Synthetic-upgrade-session-" + str(uuid4())
    with connect() as connection:
        connection.execute("INSERT INTO users(id,username,email,display_name,role,created_at,updated_at) VALUES(%s,'legacy-owner','legacy@example.test','Legacy Owner','business',%s,%s)", (owner, now, now))
        connection.execute("INSERT INTO password_credentials(user_id,password_hash,must_change_password,updated_at) VALUES(%s,%s,false,%s)", (owner, password_hash, now))
        connection.execute("INSERT INTO businesses(id,name,normalized_name,revision,created_at,updated_at) VALUES(%s,'Legacy Studio','legacy studio',1,%s,%s)", (business, now, now))
        connection.execute("INSERT INTO business_memberships(id,user_id,business_id,membership_role,status) VALUES(%s,%s,%s,'owner','active')", (str(uuid4()), owner, business))
        second_event = str(uuid4())
        connection.execute("INSERT INTO events SELECT %s,title,timezone,starts_at,ends_at,revision,created_at,updated_at FROM events WHERE id=%s", (second_event, event))
        for current_event, current_participation in [(event, participation), (second_event, frozen_participation)]:
            connection.execute("INSERT INTO application_approvals(id,event_id,business_id,approved_by,approved_at) VALUES(%s,%s,%s,%s,%s)", (str(uuid4()), current_event, business, org, now))
            connection.execute("INSERT INTO event_participations(id,event_id,business_id,participant_type,revision) VALUES(%s,%s,%s,'exhibitor',1)", (current_participation, current_event, business))
        connection.execute("INSERT INTO submissions(id,participation_id,content,status,revision) VALUES(%s,%s,%s::json,'draft',1)", (draft_id, participation, json.dumps(content())))
        connection.execute("INSERT INTO submissions(id,participation_id,content,status,revision,frozen_content,frozen_submitted_content_revision,submitted_by_user_id,submitted_at) VALUES(%s,%s,%s::json,'submitted',4,%s::json,3,%s,%s)", (frozen_id, frozen_participation, json.dumps(content()), json.dumps(content()), owner, now))
        connection.execute("INSERT INTO sessions(id,user_id,token_hash,created_at,last_used_at,expires_at) VALUES(%s,%s,%s,%s,%s,%s)", (str(uuid4()), owner, hashlib.sha256(token.encode()).hexdigest(), now, now, now + timedelta(days=7)))
    old_names = AUTH_TABLES | {"application_approvals", "event_participations", "submissions"}
    before = {table: table_rows(table) for table in old_names}
    migrate()
    assert {table: table_rows(table) for table in old_names} == before
    assert table_rows("application_decisions") == []
    from tests.test_business_applications import assert_current_schema
    assert_current_schema()
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as restored:
        restored.cookies.set("eventapp_session", token)
        discovery = success(restored.get("/api/v1/business/application-events", params={"businessId": business}))
        assert len(discovery) == 2 and all(event["applicationsOpen"] is False and event["settingsRevision"] == 1 for event in discovery)
        records = success(restored.get("/api/v1/business/applications", params={"businessId": business}))
        assert {record["status"] for record in records} == {"draft", "submitted"}
        assert all(record["decision"] is None for record in records)
        frozen = next(record for record in records if record["id"] == frozen_id)
        assert frozen["revision"] == 4 and frozen["frozenSubmittedContentRevision"] == 3 and frozen["content"] == content()
        problem(request(restored, "POST", f"/api/v1/business/applications/{draft_id}/submit", json={"expectedRevision": 1}), 409, "applications_closed")
