"""Independent F06 revision-4 acceptance tests: real HTTP/auth and guarded PostgreSQL.

No unfinished domain module is imported by fixtures. Synthetic trusted provisioning
uses the approved auth schema; every F06 action crosses its public API boundary.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from contextlib import ExitStack, contextmanager
from datetime import datetime, timedelta, timezone
import hashlib
from http import HTTPStatus
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
from threading import Barrier
from types import SimpleNamespace
from uuid import UUID, uuid4

from argon2 import PasswordHasher
from fastapi.testclient import TestClient
import psycopg
from psycopg import sql
import pytest
from sqlalchemy.engine import make_url

from tests.reset_guard import require_synthetic_reset_target

BACKEND = Path(__file__).resolve().parents[1]
ORIGIN = {"Origin": "http://localhost:5173"}
PASSWORD = "Synthetic-Business-Password-123"
AUTH_TABLES = {"users", "password_credentials", "sessions", "businesses", "business_memberships", "events", "event_memberships", "audit_events"}
LEGACY_DOMAIN_TABLES = {"application_approvals", "event_participations", "submissions"}
DOMAIN_TABLES = LEGACY_DOMAIN_TABLES | {"application_settings", "application_decisions"}
ACTIONS = {"application_settings_update", "application_decide", "application_create", "application_edit", "application_submit"}
CONTENT_KEYS = {"participantType", "description", "requestedSpace", "contactName", "contactEmail"}
APPLICATION_KEYS = {"id", "businessId", "businessName", "eventId", "eventTitle", "participationId", "status", "revision", "content", "frozenSubmittedContentRevision", "submittedAt", "decision"}
DETAILS = {"unauthenticated": "Authentication required.", "forbidden": "Access is not permitted.", "password_change_required": "Password change required.", "not_found": "Resource not found.", "application_exists": "Application already exists.", "revision_conflict": "Application revision changed.", "application_submitted": "Application has already been submitted.", "validation_error": "Request validation failed.", "service_unavailable": "Request could not be completed.", "internal_error": "Request could not be completed.", "method_not_allowed": "Method not allowed.", "applications_closed": "Applications are closed for this event.", "event_revision_conflict": "Event settings changed.", "eligibility_retired": "Business eligibility approvals are no longer used.", "application_decided": "Application already has a decision."}


def connect():
    value = require_synthetic_reset_target()
    return psycopg.connect(make_url(value).set(drivername="postgresql").render_as_string(hide_password=False), autocommit=True)


def migrate(revision="head"):
    require_synthetic_reset_target()
    result = subprocess.run([sys.executable, "-m", "alembic", "upgrade", revision], cwd=BACKEND, capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr


@pytest.fixture(scope="module", autouse=True)
def migrated_database():
    migrate()


@pytest.fixture(autouse=True)
def clean_database(migrated_database):
    with connect() as connection:
        connection.execute("TRUNCATE audit_events, sessions, event_memberships, business_memberships, password_credentials, users, businesses, events CASCADE")


@pytest.fixture(scope="module")
def password_hash():
    return PasswordHasher().hash(PASSWORD)


def request(client, method, path, **kwargs):
    if method.upper() not in {"GET", "HEAD", "OPTIONS"}:
        kwargs.setdefault("headers", ORIGIN)
    return client.request(method, path, **kwargs)


def success(response, status=200):
    assert response.status_code == status, response.text
    assert response.headers.get("content-type", "").startswith("application/json")
    assert response.headers.get("cache-control") == "no-store"
    return response.json()


def problem(response, status, code):
    assert response.status_code == status, response.text
    assert response.headers.get("content-type", "").startswith("application/problem+json")
    assert response.headers.get("cache-control") == "no-store"
    body = response.json()
    expected = {"type", "title", "status", "detail", "instance", "code"}
    if status == 422:
        expected.add("fieldErrors")
        fields = body["fieldErrors"]
        assert fields and fields == sorted(fields, key=lambda item: item["field"])
        assert len({item["field"] for item in fields}) == len(fields)
        assert all(set(item) == {"field", "code"} and item["code"] == "invalid" for item in fields)
        assert {item["field"] for item in fields} <= CONTENT_KEYS | {"businessId", "eventId", "expectedRevision", "applicationsOpen", "outcome", "reason", "request"}
    if "currentApplication" in body:
        assert status == 409 and response.request.url.path.endswith("/decision")
        expected.add("currentApplication")
    assert set(body) == expected
    assert body["type"] == "about:blank" and body["title"] == HTTPStatus(status).phrase
    assert body["status"] == status and body["code"] == code and body["detail"] == DETAILS[code]
    assert body["instance"] == response.request.url.path
    return body


def content(**overrides):
    return {"participantType": "exhibitor", "description": "PRIVATE-DESCRIPTION-X", "requestedSpace": "PRIVATE-SPACE-X", "contactName": "PRIVATE-CONTACT-X", "contactEmail": "private-contact-x@example.test", **overrides}


def normalised(value):
    return {key: (item.strip().casefold() if key == "contactEmail" else item.strip() if key != "participantType" else item) for key, item in value.items()}


def application(value, business, event, expected_content, status="draft", revision=1):
    assert set(value) == APPLICATION_KEYS
    for key in ["id", "businessId", "eventId", "participationId"]:
        UUID(value[key])
    assert value["businessId"] == business and value["eventId"] == event
    assert value["status"] == status and value["revision"] == revision
    assert isinstance(value["businessName"], str) and value["businessName"]
    assert isinstance(value["eventTitle"], str) and value["eventTitle"]
    if status in {"draft", "submitted"}:
        assert value["decision"] is None
    assert set(value["content"]) == CONTENT_KEYS and value["content"] == normalised(expected_content)
    if status == "draft":
        assert value["submittedAt"] is None and value["frozenSubmittedContentRevision"] is None
    else:
        assert value["frozenSubmittedContentRevision"] == revision - 1
        stamp = datetime.fromisoformat(value["submittedAt"].replace("Z", "+00:00"))
        assert stamp.utcoffset() == timedelta(0)
    return value


def table_rows(table):
    assert table in AUTH_TABLES | DOMAIN_TABLES
    with connect() as connection:
        return [row[0] for row in connection.execute(sql.SQL("SELECT to_jsonb(t) FROM {} t ORDER BY to_jsonb(t)::text").format(sql.Identifier(table)))]


def domain_state():
    return {table: table_rows(table) for table in sorted(DOMAIN_TABLES)}


def success_audits():
    return [row for row in table_rows("audit_events") if row["action"] in ACTIONS and row["outcome"] == "success"]


def seed_organiser(label, verifier):
    """Trusted synthetic provisioning fixture; not a substitute for auth CLI tests."""
    user, event, now = str(uuid4()), str(uuid4()), datetime.now(timezone.utc)
    with connect() as connection:
        connection.execute("INSERT INTO users(id,username,email,display_name,role,created_at,updated_at) VALUES(%s,%s,%s,%s,'organiser',%s,%s)", (user, label, label + "@example.test", label, now, now))
        connection.execute("INSERT INTO password_credentials(user_id,password_hash,must_change_password,updated_at) VALUES(%s,%s,false,%s)", (user, verifier, now))
        connection.execute("INSERT INTO events(id,title,timezone,starts_at,ends_at,revision,created_at,updated_at) VALUES(%s,%s,'Asia/Singapore',%s,%s,1,%s,%s)", (event, "Synthetic " + label, datetime(2027, 1, 1, 1, tzinfo=timezone.utc), datetime(2027, 1, 1, 10, tzinfo=timezone.utc), now, now))
        connection.execute("INSERT INTO event_memberships(id,user_id,event_id,role,status) VALUES(%s,%s,%s,'organiser','active')", (str(uuid4()), user, event))
    return user, event


@pytest.fixture
def world(password_hash):
    from app.main import app
    with ExitStack() as stack:
        def client():
            return stack.enter_context(TestClient(app, raise_server_exceptions=False))
        x, y, attendee, oa, ob, anonymous = [client() for _ in range(6)]
        actors = []
        for current, label in [(x, "business-x"), (y, "business-y")]:
            response = current.post("/api/v1/auth/register/business", json={"username": label, "email": label + "@example.test", "displayName": label, "password": PASSWORD, "businessName": label}, headers=ORIGIN)
            assert response.status_code == 201, response.text
            actors.append(response.json())
        response = attendee.post("/api/v1/auth/register/attendee", json={"username": "attendee-x", "email": "attendee-x@example.test", "displayName": "Attendee", "password": PASSWORD}, headers=ORIGIN)
        assert response.status_code == 201, response.text
        oa_id, a = seed_organiser("organiser-a", password_hash)
        ob_id, b = seed_organiser("organiser-b", password_hash)
        for current, label in [(oa, "organiser-a"), (ob, "organiser-b")]:
            response = current.post("/api/v1/auth/login", json={"identifier": label, "password": PASSWORD, "role": "organiser"}, headers=ORIGIN)
            assert response.status_code == 200, response.text
        yield SimpleNamespace(app=app, x=x, y=y, attendee=attendee, oa=oa, ob=ob, anonymous=anonymous, xid=actors[0]["businessMemberships"][0]["businessId"], yid=actors[1]["businessMemberships"][0]["businessId"], xuser=actors[0]["id"], yuser=actors[1]["id"], oa_id=oa_id, ob_id=ob_id, a=a, b=b)


def open_event(world, event=None, business=None, organiser=None):
    # Business selector retained only for legacy callers; settings are event-wide.
    current = organiser or world.oa
    path = f"/api/v1/organiser/events/{event or world.a}/application-settings"
    settings = success(current.get(path))
    return success(request(current, "PUT", path, json={"expectedRevision": settings["revision"], "applicationsOpen": True}))


def create(world, event=None, business=None, client=None, **overrides):
    return success(request(client or world.x, "POST", "/api/v1/business/applications", json={"businessId": business or world.xid, "eventId": event or world.a, **content(**overrides)}), 201)


def own_path(record):
    return f"/api/v1/business/applications/{record['id']}"


def submit(world, record, client=None):
    return success(request(client or world.x, "POST", own_path(record) + "/submit", json={"expectedRevision": record["revision"]}))


def concurrent(world, cookie_client, operations):
    barrier = Barrier(len(operations))
    token = cookie_client.cookies["eventapp_session"]
    def run(operation):
        with TestClient(world.app, raise_server_exceptions=False) as contender:
            contender.cookies.set("eventapp_session", token)
            barrier.wait(timeout=10)
            method, path, body = operation
            return request(contender, method, path, json=body)
    with ThreadPoolExecutor(max_workers=len(operations)) as executor:
        return list(executor.map(run, operations))


@contextmanager
def reject_writes(table, event="INSERT"):
    assert table in DOMAIN_TABLES | {"audit_events"} and event in {"INSERT", "UPDATE"}
    with connect() as connection:
        connection.execute("CREATE FUNCTION acceptance_reject_business_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic private write rejection'; END $$")
        connection.execute(sql.SQL("CREATE TRIGGER acceptance_reject_business_write BEFORE {} ON {} FOR EACH ROW EXECUTE FUNCTION acceptance_reject_business_write()").format(sql.SQL(event), sql.Identifier(table)))
    try:
        yield
    finally:
        with connect() as connection:
            connection.execute(sql.SQL("DROP TRIGGER acceptance_reject_business_write ON {}").format(sql.Identifier(table)))
            connection.execute("DROP FUNCTION acceptance_reject_business_write()")


def test_open_event_discovery_and_current_replay_have_no_application_side_effect(world):
    route = f"/api/v1/organiser/events/{world.a}/application-settings"
    before = domain_state()
    assert success(world.oa.get(route)) == {"eventId": world.a, "applicationsOpen": False, "revision": 1}
    assert success(world.x.get("/api/v1/business/application-events", params={"businessId": world.xid})) == []
    assert domain_state() == before
    settings = open_event(world)
    assert settings == {"eventId": world.a, "applicationsOpen": True, "revision": 2}
    before, audits = domain_state(), success_audits()
    assert success(request(world.oa, "PUT", route, json={"expectedRevision": 2, "applicationsOpen": True})) == settings
    events = success(world.x.get("/api/v1/business/application-events", params={"businessId": world.xid}))
    assert len(events) == 1 and set(events[0]) == {"eventId", "title", "timezone", "startsAt", "endsAt", "eventRevision", "applicationsOpen", "settingsRevision", "applicationId"}
    assert events[0]["eventId"] == world.a and events[0]["applicationId"] is None and events[0]["eventRevision"] == 1
    assert events[0]["applicationsOpen"] is True and events[0]["settingsRevision"] == 2
    assert success(world.y.get("/api/v1/business/application-events", params={"businessId": world.yid})) == events
    assert success(world.x.get("/api/v1/business/applications", params={"businessId": world.xid})) == []
    assert domain_state() == before and success_audits() == audits
    assert not before["event_participations"] and not before["submissions"] and not before["application_approvals"]
    closed = request(world.x, "POST", "/api/v1/business/applications", json={"businessId": world.xid, "eventId": world.b, **content()})
    problem(closed, 404, "not_found")
    assert domain_state() == before


def test_concurrent_settings_have_one_change_one_success_audit(world):
    route = f"/api/v1/organiser/events/{world.a}/application-settings"
    responses = concurrent(world, world.oa, [("PUT", route, {"expectedRevision": 1, "applicationsOpen": True})] * 2)
    assert sorted(item.status_code for item in responses) == [200, 409]
    assert success(next(item for item in responses if item.status_code == 200))["revision"] == 2
    problem(next(item for item in responses if item.status_code == 409), 409, "event_revision_conflict")
    assert not table_rows("application_approvals")
    audits = success_audits()
    assert len(audits) == 1 and audits[0]["action"] == "application_settings_update" and audits[0]["resource_revision"] == 2
    assert str(audits[0]["resource_id"]) == world.a


def test_settings_scope_roles_validation_and_current_organiser_membership(world):
    settings = open_event(world)
    before = domain_state()
    route = f"/api/v1/organiser/events/{world.a}/application-settings"
    for client, status, code in [(world.anonymous, 401, "unauthenticated"), (world.x, 403, "forbidden"), (world.attendee, 403, "forbidden"), (world.ob, 403, "forbidden")]:
        problem(request(client, "PUT", route, json={"expectedRevision": 2, "applicationsOpen": False}), status, code)
        problem(client.get(route), status, code)
    problem(request(world.oa, "PUT", route, json={"expectedRevision": 2, "applicationsOpen": False, "PRIVATE-AUTHORITY": "private-marker"}), 422, "validation_error")
    with connect() as connection:
        connection.execute("UPDATE event_memberships SET status='inactive' WHERE user_id=%s AND event_id=%s", (world.oa_id, world.a))
    problem(world.oa.get(route), 403, "forbidden")
    problem(request(world.oa, "PUT", route, json={"expectedRevision": 2, "applicationsOpen": False}), 403, "forbidden")
    assert domain_state() == before and settings["revision"] == 2


def test_create_reopen_normalized_complete_content_across_two_events(world):
    # APP-S02 / AC01/06.
    open_event(world)
    open_event(world, world.b, organiser=world.ob)
    original = content(description="  Private  complete draft  ", requestedSpace="  Two tables  ", contactName="  Contact  Person  ", contactEmail="  PRIVATE-CONTACT-X@EXAMPLE.TEST  ")
    record = create(world, **original)
    application(record, world.xid, world.a, original)
    second = create(world, world.b, participantType="vendor")
    application(second, world.xid, world.b, content(participantType="vendor"))
    token = world.x.cookies["eventapp_session"]
    with TestClient(world.app, raise_server_exceptions=False) as reopened:
        reopened.cookies.set("eventapp_session", token)
        assert success(reopened.get(own_path(record))) == record
    records = success(world.x.get("/api/v1/business/applications", params={"businessId": world.xid}))
    assert records == sorted([record, second], key=lambda item: (item["eventId"], item["id"]))
    events = success(world.x.get("/api/v1/business/application-events", params={"businessId": world.xid}))
    assert [item["eventId"] for item in events] == sorted([world.a, world.b])
    assert {item["applicationId"] for item in events} == {record["id"], second["id"]}
    assert len(table_rows("event_participations")) == len(table_rows("submissions")) == 2


def test_private_owner_and_organiser_read_write_boundaries(world):
    # APP-S03 / AC03/06: organiser's own event still cannot reveal a draft.
    open_event(world)
    record = create(world)
    before = domain_state()
    for client, status, code in [(world.anonymous, 401, "unauthenticated"), (world.attendee, 403, "forbidden"), (world.oa, 403, "forbidden"), (world.y, 404, "not_found")]:
        responses = [client.get(own_path(record)), request(client, "PUT", own_path(record), json={"expectedRevision": 1, **content()}), request(client, "POST", own_path(record) + "/submit", json={"expectedRevision": 1})]
        for response in responses:
            problem(response, status, code)
            assert all(marker not in response.text for marker in content().values())
    foreign = problem(world.y.get(own_path(record)), 404, "not_found")
    absent = problem(world.y.get(f"/api/v1/business/applications/{uuid4()}"), 404, "not_found")
    assert {key: value for key, value in foreign.items() if key != "instance"} == {key: value for key, value in absent.items() if key != "instance"}
    assert success(world.oa.get(f"/api/v1/organiser/events/{world.a}/applications")) == []
    problem(world.oa.get(f"/api/v1/organiser/events/{world.a}/applications/{record['id']}"), 404, "not_found")
    problem(world.ob.get(f"/api/v1/organiser/events/{world.a}/applications"), 403, "forbidden")
    problem(world.x.get("/api/v1/business/applications", params={"businessId": world.yid}), 404, "not_found")
    problem(request(world.x, "POST", "/api/v1/business/applications", json={"businessId": world.yid, "eventId": world.a, **content()}), 404, "not_found")
    assert domain_state() == before


def test_inactive_owner_and_mandatory_change_cannot_use_cached_scope(world):
    # APP-S03/11 / AC03/08.
    open_event(world)
    record = create(world)
    before = domain_state()
    with connect() as connection:
        connection.execute("UPDATE business_memberships SET status='inactive' WHERE user_id=%s", (world.xuser,))
    for response in [world.x.get(own_path(record)), world.x.get("/api/v1/business/applications", params={"businessId": world.xid}), world.x.get("/api/v1/business/application-events", params={"businessId": world.xid}), request(world.x, "PUT", own_path(record), json={"expectedRevision": 1, **content()}), request(world.x, "POST", own_path(record) + "/submit", json={"expectedRevision": 1})]:
        problem(response, 403, "forbidden")
    assert world.x.get("/api/v1/auth/me").json()["businessMemberships"] == []
    with connect() as connection:
        connection.execute("UPDATE password_credentials SET must_change_password=true WHERE user_id=%s", (world.oa_id,))
    problem(request(world.oa, "PUT", f"/api/v1/organiser/events/{world.a}/application-settings", json={"expectedRevision": 2, "applicationsOpen": False}), 403, "password_change_required")
    assert domain_state() == before


def test_active_workspace_does_not_expose_an_inactive_other_business(world):
    # APP-S03 / AC03: valid workspace first, then invisible target404.
    open_event(world, business=world.yid)
    other = create(world, business=world.yid, client=world.y, description="OTHER-BUSINESS-PRIVATE")
    with connect() as connection:
        connection.execute("INSERT INTO business_memberships(id,user_id,business_id,membership_role,status) VALUES(%s,%s,%s,'owner','inactive')", (str(uuid4()), world.xuser, world.yid))
    before = domain_state()
    response = world.x.get(own_path(other))
    problem(response, 404, "not_found")
    assert "OTHER-BUSINESS-PRIVATE" not in response.text and domain_state() == before


@pytest.mark.parametrize("inactive_target_membership", [False, True])
@pytest.mark.parametrize("route_kind", ["events", "list", "create"])
def test_foreign_absent_business_selectors_are_identical_404_after_workspace_check(world, route_kind, inactive_target_membership):
    # APP-TCR-02 / APP-S03/13 / AC03/06/08: target existence must stay hidden
    # once the actor has a valid active workspace; global workspace loss is403.
    open_event(world, business=world.yid)
    create(world, business=world.yid, client=world.y, description="OTHER-BUSINESS-PRIVATE")
    if inactive_target_membership:
        with connect() as connection:
            connection.execute("INSERT INTO business_memberships(id,user_id,business_id,membership_role,status) VALUES(%s,%s,%s,'owner','inactive')", (str(uuid4()), world.xuser, world.yid))
    absent = str(uuid4())
    before, successful = domain_state(), success_audits()
    audit_ids = {row["id"] for row in table_rows("audit_events")}

    def select_business(target):
        if route_kind == "create":
            return request(world.x, "POST", "/api/v1/business/applications", json={"businessId": target, "eventId": world.a, **content()})
        path = "/api/v1/business/application-events" if route_kind == "events" else "/api/v1/business/applications"
        return world.x.get(path, params={"businessId": target})

    foreign = problem(select_business(world.yid), 404, "not_found")
    missing = problem(select_business(absent), 404, "not_found")
    assert foreign == missing
    assert world.yid not in json.dumps(foreign) and absent not in json.dumps(missing)
    assert domain_state() == before and success_audits() == successful

    # Remove the actor's only active workspace; optional target membership is
    # still inactive. Now the approved global403 must precede target lookup.
    with connect() as connection:
        connection.execute("UPDATE business_memberships SET status='inactive' WHERE user_id=%s AND business_id=%s", (world.xuser, world.xid))
    for target in [world.yid, absent]:
        problem(select_business(target), 403, "forbidden")
    assert domain_state() == before and success_audits() == successful
    added_audits = [row for row in table_rows("audit_events") if row["id"] not in audit_ids]
    assert all(row["resource_id"] in {None, world.xid, world.xuser} for row in added_audits)
    captured = json.dumps(added_audits) + json.dumps(foreign) + json.dumps(missing)
    for marker in [world.yid, "OTHER-BUSINESS-PRIVATE", *content().values()]:
        assert marker not in captured


@pytest.mark.parametrize("field,minimum,maximum", [("description", 1, 5000), ("requestedSpace", 1, 500), ("contactName", 1, 100)])
def test_content_text_boundaries_use_complete_drafts(world, field, minimum, maximum):
    # APP-S04 / AC05: exact endpoints and one outside each bound.
    open_event(world)
    record = create(world, **{field: "x" * minimum})
    updated = success(request(world.x, "PUT", own_path(record), json={"expectedRevision": 1, **content(**{field: "x" * maximum})}))
    application(updated, world.xid, world.a, content(**{field: "x" * maximum}), revision=2)
    for invalid in ["", "   ", "x" * (maximum + 1)]:
        before = domain_state()
        response = request(world.x, "PUT", own_path(record), json={"expectedRevision": 2, **content(**{field: invalid})})
        problem(response, 422, "validation_error")
        assert domain_state() == before


def test_email_254_boundary_normalization_and_255_rejection(world):
    # APP-S04 / AC05.
    open_event(world)
    email = "l" * 64 + "@" + "a" * 63 + "." + "b" * 63 + "." + "c" * 61
    assert len(email) == 254
    record = create(world, contactEmail=email.upper())
    assert record["content"]["contactEmail"] == email
    before = domain_state()
    problem(request(world.x, "PUT", own_path(record), json={"expectedRevision": 1, **content(contactEmail=email + "c")}), 422, "validation_error")
    assert domain_state() == before


@pytest.mark.parametrize("field,value", [("description", None), ("description", 123), ("requestedSpace", 2), ("contactName", []), ("contactEmail", "invalid"), ("participantType", "speaker"), ("participantType", True)])
def test_invalid_complete_content_does_not_create_partial_records(world, field, value):
    # APP-S04 / AC05.
    open_event(world)
    before = domain_state()
    response = request(world.x, "POST", "/api/v1/business/applications", json={"businessId": world.xid, "eventId": world.a, **content(**{field: value})})
    problem(response, 422, "validation_error")
    assert domain_state() == before


def test_missing_extra_malformed_fields_and_server_authority_are_safe(world, caplog):
    # APP-S04/13 / AC05/08.
    open_event(world)
    base = {"businessId": world.xid, "eventId": world.a, **content()}
    before, audits = domain_state(), table_rows("audit_events")
    for field in sorted(CONTENT_KEYS | {"businessId", "eventId"}):
        invalid = dict(base)
        invalid.pop(field)
        problem(request(world.x, "POST", "/api/v1/business/applications", json=invalid), 422, "validation_error")
    for field in ["role", "participationId", "status", "id", "frozenSubmittedContentRevision", "submittedAt", "submittedBy", "PRIVATE-UNKNOWN-KEY"]:
        response = request(world.x, "POST", "/api/v1/business/applications", json={**base, field: "PRIVATE-INPUT-VALUE"})
        body = problem(response, 422, "validation_error")
        assert {item["field"] for item in body["fieldErrors"]} == {"request"}
        assert "PRIVATE-INPUT-VALUE" not in response.text and "PRIVATE-UNKNOWN-KEY" not in response.text
    problem(request(world.x, "POST", "/api/v1/business/applications", content="{", headers={**ORIGIN, "Content-Type": "application/json"}), 422, "validation_error")
    assert domain_state() == before and table_rows("audit_events") == audits
    captured = caplog.text + json.dumps(table_rows("audit_events"))
    assert all(marker not in captured for marker in [*content().values(), "PRIVATE-INPUT-VALUE", "PRIVATE-UNKNOWN-KEY"])


def test_replacement_and_submit_reject_missing_extra_authority_without_writes(world, caplog):
    # APP-S04/13 / AC05/08: strict schemas at each mutation, not create only.
    open_event(world)
    record = create(world)
    before, audits = domain_state(), table_rows("audit_events")
    replacement = {"expectedRevision": 1, **content()}
    missing = dict(replacement)
    missing.pop("description")
    attempts = [("PUT", own_path(record), missing), ("PUT", own_path(record), content()), ("PUT", own_path(record), {**replacement, "businessId": world.yid}), ("PUT", own_path(record), {**replacement, "submittedAt": "PRIVATE-INPUT-VALUE"}), ("POST", own_path(record) + "/submit", {}), ("POST", own_path(record) + "/submit", {"expectedRevision": 1, "status": "submitted"}), ("POST", own_path(record) + "/submit", {"expectedRevision": 1, "PRIVATE-UNKNOWN-KEY": "PRIVATE-INPUT-VALUE"})]
    for method, path, body in attempts:
        response = request(world.x, method, path, json=body)
        problem(response, 422, "validation_error")
        assert "PRIVATE-INPUT-VALUE" not in response.text and "PRIVATE-UNKNOWN-KEY" not in response.text
        assert domain_state() == before and table_rows("audit_events") == audits
    captured = caplog.text + json.dumps(table_rows("audit_events"))
    assert all(marker not in captured for marker in [*content().values(), "PRIVATE-INPUT-VALUE", "PRIVATE-UNKNOWN-KEY"])


@pytest.mark.parametrize("revision", [0, -1, True, "1", 1.5, None])
def test_revision_requires_strict_positive_integer(world, revision):
    # APP-S04/05 / AC05.
    open_event(world)
    record = create(world)
    before = domain_state()
    problem(request(world.x, "PUT", own_path(record), json={"expectedRevision": revision, **content()}), 422, "validation_error")
    problem(request(world.x, "POST", own_path(record) + "/submit", json={"expectedRevision": revision}), 422, "validation_error")
    assert domain_state() == before


def test_edit_cas_type_coordination_and_identical_content_revision(world):
    # APP-S05 / AC01/05.
    open_event(world)
    record = create(world)
    changed = content(participantType="vendor", description="Changed complete version")
    edited = success(request(world.x, "PUT", own_path(record), json={"expectedRevision": 1, **changed}))
    application(edited, world.xid, world.a, changed, revision=2)
    participation = table_rows("event_participations")[0]
    assert participation["participant_type"] == "vendor" and participation["revision"] == 2
    repeated = success(request(world.x, "PUT", own_path(record), json={"expectedRevision": 2, **changed}))
    application(repeated, world.xid, world.a, changed, revision=3)
    assert table_rows("event_participations")[0]["revision"] == 2
    before = domain_state()
    problem(request(world.x, "PUT", own_path(record), json={"expectedRevision": 1, **content()}), 409, "revision_conflict")
    problem(request(world.x, "POST", own_path(record) + "/submit", json={"expectedRevision": 1}), 409, "revision_conflict")
    assert success(world.x.get(own_path(record))) == repeated and domain_state() == before


def test_edited_content_submission_binds_actual_revision_and_exact_audit_actors(world):
    # APP-S05/08/13 / AC02/07: hardcoded frozen revision1 must fail.
    settings = open_event(world)
    record = create(world)
    changed = content(participantType="vendor", description="Saved third content revision")
    edited = success(request(world.x, "PUT", own_path(record), json={"expectedRevision": 1, **changed}))
    edited = success(request(world.x, "PUT", own_path(record), json={"expectedRevision": 2, **changed}))
    draft_storage = table_rows("submissions")[0]
    frozen = submit(world, edited)
    application(frozen, world.xid, world.a, changed, "submitted", 4)
    assert success(world.oa.get(f"/api/v1/organiser/events/{world.a}/applications/{record['id']}")) == frozen
    audits = success_audits()
    assert {(row["action"], row["user_id"], row["resource_id"], row["resource_revision"]) for row in audits} == {
        ("application_settings_update", world.oa_id, world.a, 2),
        ("application_create", world.xuser, record["id"], 1),
        ("application_edit", world.xuser, record["id"], 2),
        ("application_edit", world.xuser, record["id"], 3),
        ("application_submit", world.xuser, record["id"], 4),
    }
    assert len(audits) == 5
    # The storage contract permits implementation-selected submitter column name.
    # Resolve the required users FK, then assert its persisted actor value.
    with connect() as connection:
        submitter_columns = [row[0] for row in connection.execute("SELECT a.attname FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey) WHERE c.conrelid='submissions'::regclass AND c.contype='f' AND c.confrelid='users'::regclass")]
    assert submitter_columns
    stored = table_rows("submissions")[0]
    populated_on_submission = [column for column in submitter_columns if draft_storage[column] is None and stored[column] is not None]
    assert populated_on_submission and all(stored[column] == world.xuser for column in populated_on_submission)


def test_private_discovery_lists_and_submitted_contacts_recheck_current_authority(world):
    # APP-S03/13 / AC03/06/08: submitted privacy is distinct from draft privacy.
    open_event(world)
    frozen = submit(world, create(world))
    before = domain_state()
    for client, status, code in [(world.anonymous, 401, "unauthenticated"), (world.attendee, 403, "forbidden"), (world.oa, 403, "forbidden"), (world.y, 404, "not_found")]:
        for path in ["/api/v1/business/application-events", "/api/v1/business/applications"]:
            response = client.get(path, params={"businessId": world.xid})
            problem(response, status, code)
            assert all(marker not in response.text for marker in content().values())
        detail = client.get(own_path(frozen))
        problem(detail, 404 if client is world.y else status, "not_found" if client is world.y else code)
        assert all(marker not in detail.text for marker in content().values())
    with connect() as connection:
        connection.execute("UPDATE event_memberships SET status='inactive' WHERE user_id=%s AND event_id=%s", (world.oa_id, world.a))
    for path in [f"/api/v1/organiser/events/{world.a}/applications", f"/api/v1/organiser/events/{world.a}/applications/{frozen['id']}"]:
        response = world.oa.get(path)
        problem(response, 403, "forbidden")
        assert all(marker not in response.text for marker in content().values())
    with connect() as connection:
        connection.execute("UPDATE business_memberships SET status='inactive' WHERE user_id=%s", (world.xuser,))
    for path in ["/api/v1/business/application-events", "/api/v1/business/applications"]:
        problem(world.x.get(path, params={"businessId": world.xid}), 403, "forbidden")
    problem(world.x.get(own_path(frozen)), 403, "forbidden")
    assert domain_state() == before


def test_concurrent_and_repeated_create_has_one_atomic_winner(world):
    # APP-S06 / AC01/07.
    open_event(world)
    body = {"businessId": world.xid, "eventId": world.a, **content()}
    responses = concurrent(world, world.x, [("POST", "/api/v1/business/applications", body)] * 2)
    assert sorted(item.status_code for item in responses) == [201, 409]
    loser = next(item for item in responses if item.status_code == 409)
    problem(loser, 409, "application_exists")
    assert len(table_rows("event_participations")) == len(table_rows("submissions")) == 1
    before = domain_state()
    problem(request(world.x, "POST", "/api/v1/business/applications", json=body), 409, "application_exists")
    assert domain_state() == before
    assert len([row for row in success_audits() if row["action"] == "application_create"]) == 1


def test_concurrent_edits_have_one_complete_winning_version(world):
    # APP-S07 / AC05.
    open_event(world)
    record = create(world)
    choices = [content(description="Winner A", requestedSpace="Space A"), content(description="Winner B", requestedSpace="Space B")]
    responses = concurrent(world, world.x, [("PUT", own_path(record), {"expectedRevision": 1, **value}) for value in choices])
    assert sorted(item.status_code for item in responses) == [200, 409]
    winner = success(next(item for item in responses if item.status_code == 200))
    problem(next(item for item in responses if item.status_code == 409), 409, "revision_conflict")
    assert winner["content"] in choices and winner["revision"] == 2
    assert success(world.x.get(own_path(record))) == winner
    assert len([row for row in success_audits() if row["action"] == "application_edit"]) == 1


def test_explicit_submit_freezes_content_and_scoped_organiser_projection(world):
    # APP-S08 / AC02/03/04.
    open_event(world)
    record = create(world)
    submitted = submit(world, record)
    application(submitted, world.xid, world.a, content(), "submitted", 2)
    assert success(world.x.get(own_path(record))) == submitted
    route = f"/api/v1/organiser/events/{world.a}/applications"
    assert success(world.oa.get(route)) == [submitted]
    assert success(world.oa.get(route + "/" + record["id"])) == submitted
    problem(world.ob.get(f"/api/v1/organiser/events/{world.b}/applications/{record['id']}"), 404, "not_found")
    problem(world.ob.get(route + "/" + record["id"]), 403, "forbidden")
    assert set(submitted) == APPLICATION_KEYS and submitted["status"] == "submitted"
    assert submitted["decision"] is None and not {"booth", "accepted", "setup"} & set(submitted)
    audits = [row for row in success_audits() if row["resource_id"] == record["id"]]
    assert {(row["action"], row["resource_revision"]) for row in audits} == {("application_create", 1), ("application_submit", 2)}


def test_post_submit_edits_retries_and_unsupported_routes_preserve_snapshot(world):
    # APP-S09 / AC04/08; submitted-state rejection precedes stale-version feedback.
    open_event(world)
    record = create(world)
    frozen = submit(world, record)
    before = domain_state()
    for revision in [1, 2]:
        problem(request(world.x, "PUT", own_path(record), json={"expectedRevision": revision, **content(description="Prohibited edit")}), 409, "application_submitted")
        problem(request(world.x, "POST", own_path(record) + "/submit", json={"expectedRevision": revision}), 409, "application_submitted")
    for method, path in [("DELETE", own_path(record)), ("POST", own_path(record) + "/withdraw")]:
        response = request(world.x, method, path)
        assert response.status_code in {404, 405}
        problem(response, response.status_code, "not_found" if response.status_code == 404 else "method_not_allowed")
    assert success(world.x.get(own_path(record))) == frozen and domain_state() == before


@pytest.mark.parametrize("other", ["submit", "edit"])
def test_submit_submit_and_edit_submit_compare_and_set(world, other):
    # APP-S10 / AC02/05/07.
    open_event(world)
    record = create(world)
    operations = [("POST", own_path(record) + "/submit", {"expectedRevision": 1})]
    operations.append(("POST", own_path(record) + "/submit", {"expectedRevision": 1}) if other == "submit" else ("PUT", own_path(record), {"expectedRevision": 1, **content(description="Concurrent changed version")}))
    responses = concurrent(world, world.x, operations)
    assert sorted(item.status_code for item in responses) == [200, 409]
    winner = success(next(item for item in responses if item.status_code == 200))
    loser = next(item for item in responses if item.status_code == 409)
    problem(loser, 409, "application_submitted" if winner["status"] == "submitted" else "revision_conflict")
    assert winner["revision"] == 2 and success(world.x.get(own_path(record))) == winner
    if winner["status"] == "submitted":
        assert winner["content"] == content() and winner["frozenSubmittedContentRevision"] == 1
    else:
        assert winner["content"]["description"] == "Concurrent changed version" and winner["submittedAt"] is None
    assert len([row for row in success_audits() if row["action"] in {"application_submit", "application_edit"}]) == 1


@pytest.mark.parametrize("table", ["event_participations", "submissions", "audit_events"])
def test_create_domain_and_audit_failures_roll_back_all_state(world, table, caplog):
    # APP-S11 / AC07: required audit failure cannot leave participation orphan.
    open_event(world)
    before, audits = domain_state(), success_audits()
    with reject_writes(table):
        response = request(world.x, "POST", "/api/v1/business/applications", json={"businessId": world.xid, "eventId": world.a, **content()})
        problem(response, 503, "service_unavailable")
    assert domain_state() == before and success_audits() == audits
    assert "synthetic private write rejection" not in response.text + caplog.text
    assert create(world)["revision"] == 1


@pytest.mark.parametrize("operation", ["settings", "edit", "submit"])
def test_required_audit_failure_rolls_back_each_sensitive_mutation(world, operation, caplog):
    # APP-S11/13 / AC07/08; failure-path audit rejection preserves original503.
    record = None
    if operation != "settings":
        open_event(world)
        record = create(world)
    before, audits = domain_state(), success_audits()
    with reject_writes("audit_events"):
        if operation == "settings":
            response = request(world.oa, "PUT", f"/api/v1/organiser/events/{world.a}/application-settings", json={"expectedRevision": 1, "applicationsOpen": True})
        elif operation == "edit":
            response = request(world.x, "PUT", own_path(record), json={"expectedRevision": 1, **content(participantType="vendor")})
        else:
            response = request(world.x, "POST", own_path(record) + "/submit", json={"expectedRevision": 1})
        problem(response, 503, "service_unavailable")
    assert domain_state() == before and success_audits() == audits
    assert "synthetic private write rejection" not in response.text + caplog.text


def test_submission_update_failure_keeps_draft_and_frozen_fields_unchanged(world):
    # APP-S11 / AC02/07, direct storage failure distinct from audit failure.
    open_event(world)
    record = create(world)
    before, audits = domain_state(), success_audits()
    with reject_writes("submissions", "UPDATE"):
        response = request(world.x, "POST", own_path(record) + "/submit", json={"expectedRevision": 1})
        problem(response, 503, "service_unavailable")
    assert domain_state() == before and success_audits() == audits
    assert success(world.x.get(own_path(record))) == record


@pytest.mark.parametrize("operation,table,event", [("settings", "application_settings", "INSERT"), ("edit", "event_participations", "UPDATE")])
def test_grant_insert_and_type_update_failures_roll_back_atomic_mutation(world, operation, table, event):
    # APP-S11 / AC07: failure at producer-owned table, not only audit insertion.
    record = None
    if operation == "edit":
        open_event(world)
        record = create(world)
    before, audits = domain_state(), success_audits()
    with reject_writes(table, event):
        if operation == "settings":
            response = request(world.oa, "PUT", f"/api/v1/organiser/events/{world.a}/application-settings", json={"expectedRevision": 1, "applicationsOpen": True})
        else:
            response = request(world.x, "PUT", own_path(record), json={"expectedRevision": 1, **content(participantType="vendor")})
        problem(response, 503, "service_unavailable")
    assert domain_state() == before and success_audits() == audits


def test_credentialed_cors_preflight_allows_trusted_put_not_hostile_origin(world):
    # APP-S13 / AC08: browser CORS is additional to server Origin enforcement.
    path = f"/api/v1/business/applications/{uuid4()}"
    trusted = world.anonymous.options(path, headers={**ORIGIN, "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type"})
    assert trusted.status_code == 200
    assert trusted.headers.get("access-control-allow-origin") == ORIGIN["Origin"]
    assert trusted.headers.get("access-control-allow-credentials") == "true"
    assert "PUT" in trusted.headers.get("access-control-allow-methods", "")
    hostile = world.anonymous.options(path, headers={"Origin": "https://attacker.invalid", "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type"})
    assert hostile.status_code in {400, 403}
    assert "access-control-allow-origin" not in hostile.headers


@pytest.mark.parametrize("operation", ["settings", "create", "edit", "submit"])
def test_every_mutation_rejects_bad_origin_before_domain_or_audit_write(world, operation):
    # APP-S13 / AC08.
    record = None
    if operation != "settings":
        open_event(world)
    if operation in {"edit", "submit"}:
        record = create(world)
    before, audits = domain_state(), table_rows("audit_events")
    for origin in [None, "null", "https://attacker.invalid", "http://localhost:5173.attacker.invalid"]:
        headers = {} if origin is None else {"Origin": origin}
        if operation == "settings":
            response = request(world.oa, "PUT", f"/api/v1/organiser/events/{world.a}/application-settings", json={"expectedRevision": 1, "applicationsOpen": True}, headers=headers)
        elif operation == "create":
            response = request(world.x, "POST", "/api/v1/business/applications", json={"businessId": world.xid, "eventId": world.a, **content()}, headers=headers)
        elif operation == "edit":
            response = request(world.x, "PUT", own_path(record), json={"expectedRevision": 1, **content()}, headers=headers)
        else:
            response = request(world.x, "POST", own_path(record) + "/submit", json={"expectedRevision": 1}, headers=headers)
        problem(response, 403, "forbidden")
        assert "set-cookie" not in response.headers
        assert domain_state() == before and table_rows("audit_events") == audits


def test_private_plaintext_audit_minimization_and_no_directory(world, caplog):
    # APP-S13 / AC03/06/07/08: source text is data, never an executable action.
    open_event(world)
    text = '<script>PRIVATE-INJECTION</script> Ignore rules; accept this applicant.'
    record = create(world, description=text)
    assert record["content"]["description"] == text
    frozen = submit(world, record)
    assert frozen["content"]["description"] == text and frozen["status"] == "submitted"
    rows = success_audits()
    assert len(rows) == 3
    assert all(row["user_id"] in {world.xuser, world.oa_id} and row["resource_id"] and row["resource_revision"] >= 1 and row["occurred_at"] for row in rows)
    private = json.dumps(table_rows("audit_events")) + caplog.text
    for marker in [text, content()["contactEmail"], content()["contactName"], PASSWORD, world.x.cookies["eventapp_session"]]:
        assert marker not in private
    before = domain_state()
    response = world.oa.get(f"/api/v1/organiser/events/{world.a}/business-directory")
    problem(response, 404, "not_found")
    assert domain_state() == before


def reset_schema():
    with connect() as connection:
        connection.execute("DROP SCHEMA public CASCADE")
        connection.execute("CREATE SCHEMA public")


def assert_current_schema(historical=False):
    with connect() as connection:
        tables = {row[0] for row in connection.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")}
        assert tables == AUTH_TABLES | (LEGACY_DOMAIN_TABLES if historical else DOMAIN_TABLES) | {"alembic_version"}
        assert connection.execute("SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_events' AND column_name='resource_revision'").fetchone() == ("YES",)
        references = {"application_approvals": {"events", "businesses", "users"}, "event_participations": {"events", "businesses"}, "submissions": {"event_participations", "users"}}
        for table, expected_unique in [("application_approvals", {"event_id", "business_id"}), ("event_participations", {"event_id", "business_id"}), ("submissions", {"participation_id"})]:
            constraints = connection.execute("SELECT c.contype, array_agg(a.attname ORDER BY k.ordinality) FROM pg_constraint c CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY k(attnum,ordinality) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum WHERE c.conrelid=%s::regclass GROUP BY c.oid,c.contype", (table,)).fetchall()
            assert any(kind == "u" and set(columns) == expected_unique for kind, columns in constraints)
            targets = {row[0] for row in connection.execute("SELECT confrelid::regclass::text FROM pg_constraint WHERE conrelid=%s::regclass AND contype='f'", (table,))}
            assert references[table] <= targets
            assert any(kind == "p" and columns == ["id"] for kind, columns in constraints)
            assert connection.execute("SELECT count(*) FROM pg_constraint WHERE conrelid=%s::regclass AND contype='c'", (table,)).fetchone()[0] >= (0 if table == "application_approvals" else 1)


def test_real_schema_rejects_invalid_revision_state_type_and_foreign_keys(world):
    # APP-S12 / AC08: observe enforced constraints, not only catalog names.
    open_event(world)
    record = create(world)
    before = domain_state()
    invalid = [
        ("UPDATE event_participations SET revision=0 WHERE id=%s", record["participationId"]),
        ("UPDATE event_participations SET participant_type='speaker' WHERE id=%s", record["participationId"]),
        ("UPDATE submissions SET revision=0 WHERE id=%s", record["id"]),
        ("UPDATE submissions SET status='accepted' WHERE id=%s", record["id"]),
        ("UPDATE submissions SET status='submitted' WHERE id=%s", record["id"]),
        ("UPDATE submissions SET participation_id='00000000-0000-4000-8000-000000000000' WHERE id=%s", record["id"]),
    ]
    for statement, value in invalid:
        with connect() as connection:
            with pytest.raises(psycopg.IntegrityError):
                connection.execute(statement, (value,))
    with connect() as connection:
        audit_id = connection.execute("SELECT id FROM audit_events ORDER BY occurred_at LIMIT 1").fetchone()[0]
        with pytest.raises(psycopg.IntegrityError):
            connection.execute("UPDATE audit_events SET resource_revision=0 WHERE id=%s", (audit_id,))
    assert domain_state() == before


def test_fresh_full_head_schema_preserves_historical_migration_scope():
    # APP-S12 / AC08, APP-TCR-01 replacement full-head coverage.
    reset_schema()
    migrate("20261020_0003")
    assert_current_schema(historical=True)
    migrate()
    assert_current_schema()
    heads = subprocess.run([sys.executable, "-m", "alembic", "heads"], cwd=BACKEND, capture_output=True, text=True)
    assert heads.returncode == 0 and len([line for line in heads.stdout.splitlines() if "(head)" in line]) == 1


def test_auth_to_head_upgrade_preserves_all_original_auth_records(password_hash):
    # APP-S12 / AC08: seed before upgrade through the historical auth schema,
    # not a newly migrated ORM, then restore a real cookie session after upgrade.
    reset_schema()
    migrate("20261019_0002")
    org, event = seed_organiser("upgrade-organiser", password_hash)
    owner, business, membership, session = [str(uuid4()) for _ in range(4)]
    now, token = datetime.now(timezone.utc), secrets.token_urlsafe(32)
    with connect() as connection:
        connection.execute("INSERT INTO users(id,username,email,display_name,role,created_at,updated_at) VALUES(%s,'upgrade-owner','upgrade-owner@example.test','Upgrade Owner','business',%s,%s)", (owner, now, now))
        connection.execute("INSERT INTO password_credentials(user_id,password_hash,must_change_password,updated_at) VALUES(%s,%s,false,%s)", (owner, password_hash, now))
        connection.execute("INSERT INTO businesses(id,name,normalized_name,revision,created_at,updated_at) VALUES(%s,'Upgrade Business','upgrade business',1,%s,%s)", (business, now, now))
        connection.execute("INSERT INTO business_memberships(id,user_id,business_id,membership_role,status) VALUES(%s,%s,%s,'owner','active')", (membership, owner, business))
        connection.execute("INSERT INTO sessions(id,user_id,token_hash,created_at,last_used_at,expires_at,revoked_at) VALUES(%s,%s,%s,%s,%s,%s,NULL)", (session, owner, hashlib.sha256(token.encode()).hexdigest(), now, now, now + timedelta(days=7)))
        connection.execute("INSERT INTO audit_events(id,user_id,action,resource_id,outcome,occurred_at) VALUES(%s,%s,'registration',%s,'success',%s)", (str(uuid4()), owner, owner, now))
    before = {table: table_rows(table) for table in AUTH_TABLES}
    migrate("20261020_0003")
    assert_current_schema(historical=True)
    migrate()
    assert_current_schema()
    for table, expected in before.items():
        actual = table_rows(table)
        if table == "audit_events":
            assert all(row.get("resource_revision") is None for row in actual)
            actual = [{key: value for key, value in row.items() if key != "resource_revision"} for row in actual]
        assert actual == expected
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as restored:
        restored.cookies.set("eventapp_session", token)
        response = restored.get("/api/v1/auth/me")
        assert response.status_code == 200 and response.json()["id"] == owner
        assert response.json()["businessMemberships"][0]["businessId"] == business


def test_application_and_cookie_survive_fresh_api_process(world):
    # APP-S12 / AC01/08; new interpreter/connection, no reseeding or mock service.
    open_event(world)
    frozen = submit(world, create(world))
    code = "import json,sys; from fastapi.testclient import TestClient; from app.main import app; data=json.load(sys.stdin); c=TestClient(app,raise_server_exceptions=False); c.cookies.set('eventapp_session',data['token']); r=c.get(data['path']); print(json.dumps({'status':r.status_code,'body':r.json(),'cache':r.headers.get('cache-control')}))"
    result = subprocess.run([sys.executable, "-c", code], cwd=BACKEND, input=json.dumps({"token": world.x.cookies["eventapp_session"], "path": own_path(frozen)}), capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    observed = json.loads(result.stdout.strip().splitlines()[-1])
    assert observed == {"status": 200, "body": frozen, "cache": "no-store"}
