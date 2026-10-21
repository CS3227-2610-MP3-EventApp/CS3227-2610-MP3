"""Independent revision-3 API acceptance tests against guarded, real PostgreSQL."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import hashlib
import importlib
import json
import os
from pathlib import Path
import subprocess
import sys
from uuid import UUID, uuid4

from fastapi import Depends
from fastapi.testclient import TestClient
import psycopg
import pytest
from sqlalchemy.engine import make_url

from tests.reset_guard import require_synthetic_reset_target

BACKEND = Path(__file__).resolve().parents[1]
ORIGIN = {"Origin": "http://localhost:5173"}
TABLES = {"users", "password_credentials", "sessions", "businesses", "business_memberships", "events", "event_memberships", "audit_events"}
PASSWORD = "Synthetic-Password-123"


def connect():
    value = require_synthetic_reset_target()
    return psycopg.connect(make_url(value).set(drivername="postgresql").render_as_string(hide_password=False), autocommit=True)


@pytest.fixture(scope="module", autouse=True)
def migrated_database():
    require_synthetic_reset_target()
    result = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=BACKEND, capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr


@pytest.fixture(autouse=True)
def clean_database(migrated_database):
    with connect() as connection:
        present = {row[0] for row in connection.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")}
        if TABLES <= present:
            connection.execute("TRUNCATE audit_events, sessions, event_memberships, business_memberships, password_credentials, users, businesses, events CASCADE")


@pytest.fixture
def client():
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as value:
        yield value


def payload(**overrides):
    return {"username": "synthetic", "email": "synthetic@example.test", "displayName": "Synthetic Person", "password": PASSWORD, **overrides}


def register(client, kind="attendee", **overrides):
    body = payload(**overrides)
    if kind == "business":
        body.setdefault("businessName", "Synthetic Studio")
    response = client.post(f"/api/v1/auth/register/{kind}", json=body, headers=ORIGIN)
    assert response.status_code == 201, response.text
    return response


def login(client, identifier="synthetic", password=PASSWORD, role="attendee"):
    return client.post("/api/v1/auth/login", json={"identifier": identifier, "password": password, "role": role}, headers=ORIGIN)


def problem(response, status, code):
    assert response.status_code == status, response.text
    assert response.headers["content-type"].startswith("application/problem+json")
    body = response.json()
    expected = {"type", "title", "status", "detail", "instance", "code"}
    if code == "validation_error":
        expected.add("fieldErrors")
        fields = body["fieldErrors"]
        assert fields and fields == sorted(fields, key=lambda item: (item["field"], item["code"]))
        assert len({(item["field"], item["code"]) for item in fields}) == len(fields)
        assert all(set(item) == {"field", "code"} and item["code"] in {"required", "password_length", "invalid"} for item in fields)
        assert {item["field"] for item in fields} <= {"username", "email", "displayName", "password", "businessName", "identifier", "role", "currentPassword", "newPassword", "request"}
    assert set(body) == expected
    assert body["type"] == "about:blank" and body["status"] == status and body["code"] == code
    assert body["instance"] == response.request.url.path
    assert response.headers.get("cache-control") == "no-store"
    return body


def counts():
    with connect() as connection:
        return {table: connection.execute(f"SELECT count(*) FROM {table}").fetchone()[0] for table in TABLES - {"audit_events", "sessions"}}


def test_registration_actor_cookie_and_persisted_password_are_safe(client, caplog):
    response = register(client)
    actor = response.json()
    assert set(actor) == {"id", "username", "displayName", "role", "mustChangePassword", "eventMemberships", "businessMemberships"}
    UUID(actor["id"])
    assert actor == {**actor, "username": "synthetic", "displayName": "Synthetic Person", "role": "attendee", "mustChangePassword": False, "eventMemberships": [], "businessMemberships": []}
    cookie = response.headers["set-cookie"].lower()
    assert "eventapp_session=" in cookie and "httponly" in cookie and "samesite=lax" in cookie and "path=/" in cookie
    token = client.cookies["eventapp_session"]
    assert len(token) >= 43
    with connect() as connection:
        stored_hash = connection.execute("SELECT password_hash FROM password_credentials WHERE user_id=%s", (actor["id"],)).fetchone()[0]
        session = connection.execute("SELECT token_hash,created_at,expires_at FROM sessions WHERE user_id=%s", (actor["id"],)).fetchone()
    assert stored_hash.startswith("$argon2id$") and PASSWORD not in stored_hash
    assert session[0] == hashlib.sha256(token.encode()).hexdigest() and session[0] != token
    assert abs((session[2] - session[1]).total_seconds() - 7 * 86400) < 2
    assert PASSWORD not in response.text + caplog.text
    assert "synthetic@example.test" not in response.text + caplog.text
    assert token not in caplog.text
    assert client.get("/api/v1/auth/me").json() == actor


def test_business_registration_is_atomic_and_owner_only(client):
    actor = register(client, "business").json()
    memberships = actor["businessMemberships"]
    assert len(memberships) == 1
    assert memberships[0]["businessName"] == "Synthetic Studio" and memberships[0]["role"] == "owner" and memberships[0]["status"] == "active"
    assert actor["eventMemberships"] == [] and actor["role"] == "business"
    state = counts()
    assert state["users"] == state["password_credentials"] == state["businesses"] == state["business_memberships"] == 1
    assert state["event_memberships"] == 0


@pytest.mark.parametrize("overrides", [
    {"username": " SYNTHETIC "}, {"email": " SYNTHETIC@EXAMPLE.TEST "},
    {"businessName": "  SYNTHETIC   STUDIO  ", "username": "other", "email": "other@example.test"},
])
def test_normalized_duplicate_registration_preserves_all_records(client, overrides):
    register(client, "business")
    before = counts()
    response = client.post("/api/v1/auth/register/business", json=payload(**{"businessName": "Synthetic Studio", **overrides}), headers=ORIGIN)
    problem(response, 409, "registration_conflict")
    assert "synthetic@example.test" not in response.text.lower()
    assert counts() == before


@pytest.mark.parametrize("kind,extra", [("attendee", {"role": "organiser"}), ("attendee", {"businessId": str(uuid4())}), ("business", {"businessId": str(uuid4())}), ("business", {"membershipRole": "admin"})])
def test_registration_rejects_privilege_or_existing_business_injection(client, kind, extra):
    body = payload(**extra)
    if kind == "business": body["businessName"] = "Synthetic Studio"
    response = client.post(f"/api/v1/auth/register/{kind}", json=body, headers=ORIGIN)
    problem(response, 422, "validation_error")
    assert all(value == 0 for value in counts().values())


@pytest.mark.parametrize("field,value", [("username", "ab"), ("email", "invalid"), ("password", "1234567"), ("displayName", "   ")])
def test_invalid_registration_never_creates_partial_records(client, field, value):
    response = client.post("/api/v1/auth/register/attendee", json=payload(**{field: value}), headers=ORIGIN)
    problem(response, 422, "validation_error")
    assert PASSWORD not in response.text
    assert all(value == 0 for value in counts().values())


def test_exact_minimum_and_case_insensitive_login_identifiers(client):
    register(client, username="AbC", password="12345678")
    for identifier in [" abc ", " SYNTHETIC@EXAMPLE.TEST "]:
        assert login(client, identifier, "12345678").status_code == 200


def test_login_failure_is_identical_for_unknown_wrong_password_and_wrong_role(client, caplog):
    register(client)
    responses = [login(client, "unknown"), login(client, password="Wrong-Password-123"), login(client, role="organiser")]
    bodies = [problem(response, 401, "invalid_credentials") for response in responses]
    assert bodies[0] == bodies[1] == bodies[2]
    assert all("set-cookie" not in response.headers for response in responses)
    assert PASSWORD not in caplog.text and "Wrong-Password-123" not in caplog.text


@pytest.mark.parametrize("origin", [None, "null", "https://attacker.invalid", "http://localhost:5173.attacker.invalid"])
def test_mutating_auth_rejects_missing_or_untrusted_origin_before_side_effect(client, origin):
    headers = {} if origin is None else {"Origin": origin}
    response = client.post("/api/v1/auth/register/attendee", json=payload(), headers=headers)
    problem(response, 403, "forbidden")
    assert "set-cookie" not in response.headers
    assert all(value == 0 for value in counts().values())


def test_logout_revokes_copied_cookie_and_me_ignores_forged_role(client):
    register(client)
    token = client.cookies["eventapp_session"]
    response = client.post("/api/v1/auth/logout", headers=ORIGIN)
    assert response.status_code == 204
    from app.main import app
    with TestClient(app) as replay:
        replay.cookies.set("eventapp_session", token)
        problem(replay.get("/api/v1/auth/me", headers={"X-Role": "organiser"}), 401, "unauthenticated")
    problem(client.get("/api/v1/auth/me"), 401, "unauthenticated")


def test_server_expiry_cannot_be_extended_by_activity(client):
    register(client)
    with connect() as connection:
        connection.execute("UPDATE sessions SET expires_at=%s", (datetime.now(timezone.utc) - timedelta(seconds=1),))
    problem(client.get("/api/v1/auth/me"), 401, "unauthenticated")


def test_concurrent_duplicate_business_registration_has_one_complete_winner(client):
    from app.main import app
    def submit(_):
        with TestClient(app, raise_server_exceptions=False) as contender:
            return contender.post("/api/v1/auth/register/business", json=payload(businessName="Race Studio"), headers=ORIGIN)
    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(submit, range(2)))
    assert sorted(response.status_code for response in responses) == [201, 409]
    state = counts()
    assert state["users"] == state["password_credentials"] == state["businesses"] == state["business_memberships"] == 1


def test_business_transaction_rolls_back_after_database_membership_failure(client):
    with connect() as connection:
        present = {row[0] for row in connection.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")}
        assert TABLES <= present, "authentication migration is absent"
        connection.execute("CREATE FUNCTION reject_test_membership() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic membership rejection'; END $$")
        connection.execute("CREATE TRIGGER reject_test_membership BEFORE INSERT ON business_memberships FOR EACH ROW EXECUTE FUNCTION reject_test_membership()")
    try:
        response = client.post("/api/v1/auth/register/business", json=payload(businessName="Rollback Studio"), headers=ORIGIN)
        problem(response, 503, "service_unavailable")
        assert "synthetic membership rejection" not in response.text
        assert all(value == 0 for value in counts().values())
        assert "set-cookie" not in response.headers
    finally:
        with connect() as connection:
            connection.execute("DROP TRIGGER reject_test_membership ON business_memberships")
            connection.execute("DROP FUNCTION reject_test_membership()")


def bootstrap(args, password=PASSWORD):
    # In-process CLI entry in a new interpreter; intercept only interactive getpass.
    code = "import getpass,runpy,sys; getpass.getpass=lambda prompt='': sys.stdin.readline().rstrip('\\n'); sys.argv=['app.auth.bootstrap',*sys.argv[1:]]; runpy.run_module('app.auth.bootstrap',run_name='__main__')"
    return subprocess.run([sys.executable, "-c", code, *args], cwd=BACKEND, input=password + "\n" + password + "\n", text=True, capture_output=True)


def seed_organiser():
    event = str(uuid4())
    event_args = ["event", "--id", event, "--title", "Synthetic Event", "--timezone", "Asia/Singapore", "--starts-at", "2027-01-01T09:00:00+08:00", "--ends-at", "2027-01-01T18:00:00+08:00"]
    result = bootstrap(event_args)
    assert result.returncode == 0, result.stdout + result.stderr
    args = ["organiser", "--username", "seed-organiser", "--email", "seed@example.test", "--display-name", "Seed Organiser", "--event-id", event]
    result = bootstrap(args)
    assert result.returncode == 0, result.stdout + result.stderr
    assert PASSWORD not in result.stdout + result.stderr
    return event, event_args, args


def test_cli_seeding_is_idempotent_does_not_reset_password_or_reactivate_membership(client):
    event, event_args, organiser_args = seed_organiser()
    before = counts()
    with connect() as connection:
        before_hash = connection.execute("SELECT password_hash FROM password_credentials").fetchone()[0]
        connection.execute("UPDATE event_memberships SET status='inactive' WHERE event_id=%s", (event,))
    assert bootstrap(event_args).returncode == bootstrap(organiser_args, "Different-Password-123").returncode == 0
    assert counts() == before
    with connect() as connection:
        assert connection.execute("SELECT password_hash FROM password_credentials").fetchone()[0] == before_hash
        assert connection.execute("SELECT status FROM event_memberships").fetchone()[0] == "inactive"
    failed = bootstrap([*organiser_args[:-1], str(uuid4())])
    assert failed.returncode != 0
    assert counts() == before


def protected_routes():
    from app.main import app
    dependencies = importlib.import_module("app.auth.dependencies")
    if not any(getattr(route, "path", None) == "/_acceptance/workspace" for route in app.routes):
        @app.get("/_acceptance/workspace", include_in_schema=False)
        def workspace(actor=Depends(dependencies.require_workspace("organiser"))):
            return {"allowed": True}
        @app.get("/_acceptance/events/{event_id}", include_in_schema=False)
        def event(event_id: UUID, actor=Depends(dependencies.require_event_membership)):
            return {"allowed": True}
        @app.get("/_acceptance/businesses/{business_id}", include_in_schema=False)
        def business(business_id: UUID, actor=Depends(dependencies.require_business_membership)):
            return {"allowed": True}


def test_mandatory_change_rotates_current_cookie_revokes_other_sessions_and_old_password(client):
    event, _, _ = seed_organiser()
    assert login(client, "seed-organiser", role="organiser").status_code == 200
    assert client.get("/api/v1/auth/me").json()["mustChangePassword"] is True
    protected_routes()
    problem(client.get("/_acceptance/workspace"), 403, "password_change_required")
    problem(client.get(f"/_acceptance/events/{event}"), 403, "password_change_required")
    from app.main import app
    with TestClient(app) as other:
        assert login(other, "seed-organiser", role="organiser").status_code == 200
        previous = client.cookies["eventapp_session"]
        with connect() as connection:
            original_expiry = connection.execute("SELECT expires_at FROM sessions WHERE token_hash=%s", (hashlib.sha256(previous.encode()).hexdigest(),)).fetchone()[0]
        invalid = client.post("/api/v1/auth/change-password", json={"currentPassword": "Wrong-Password", "newPassword": "Replacement-123"}, headers=ORIGIN)
        assert problem(invalid, 422, "current_password_incorrect")["detail"] == "The current password is incorrect."
        assert other.get("/api/v1/auth/me").status_code == 200
        response = client.post("/api/v1/auth/change-password", json={"currentPassword": PASSWORD, "newPassword": "Replacement-123"}, headers=ORIGIN)
        assert response.status_code == 200 and response.json()["mustChangePassword"] is False
        assert client.cookies["eventapp_session"] != previous
        with connect() as connection:
            current_expiry = connection.execute("SELECT expires_at FROM sessions WHERE token_hash=%s", (hashlib.sha256(client.cookies["eventapp_session"].encode()).hexdigest(),)).fetchone()[0]
        assert current_expiry == original_expiry
        problem(other.get("/api/v1/auth/me"), 401, "unauthenticated")
        other.cookies.clear(); other.cookies.set("eventapp_session", previous)
        problem(other.get("/api/v1/auth/me"), 401, "unauthenticated")
    assert login(client, "seed-organiser", role="organiser").status_code == 401
    assert login(client, "seed-organiser", "Replacement-123", "organiser").status_code == 200
    assert client.get("/_acceptance/workspace").status_code == 200


def test_same_password_is_not_a_mandatory_initial_password_replacement(client):
    seed_organiser()
    assert login(client, "seed-organiser", role="organiser").status_code == 200
    token = client.cookies["eventapp_session"]
    with connect() as connection:
        credential_before = connection.execute("SELECT password_hash,must_change_password,updated_at FROM password_credentials").fetchone()
        sessions_before = connection.execute("SELECT token_hash,expires_at,revoked_at FROM sessions ORDER BY id").fetchall()
    assert credential_before[1] is True
    response = client.post("/api/v1/auth/change-password", json={"currentPassword": PASSWORD, "newPassword": PASSWORD}, headers=ORIGIN)
    assert problem(response, 422, "password_unchanged")["detail"] == "The new password must be different from your current password."
    assert PASSWORD not in response.text and "set-cookie" not in response.headers
    assert client.cookies["eventapp_session"] == token
    with connect() as connection:
        assert connection.execute("SELECT password_hash,must_change_password,updated_at FROM password_credentials").fetchone() == credential_before
        assert connection.execute("SELECT token_hash,expires_at,revoked_at FROM sessions ORDER BY id").fetchall() == sessions_before
    assert client.get("/api/v1/auth/me").json()["mustChangePassword"] is True
    protected_routes()
    problem(client.get("/_acceptance/workspace"), 403, "password_change_required")


def test_event_membership_is_revalidated_on_next_request_and_me(client):
    event, _, _ = seed_organiser()
    assert login(client, "seed-organiser", role="organiser").status_code == 200
    assert client.post("/api/v1/auth/change-password", json={"currentPassword": PASSWORD, "newPassword": "Replacement-123"}, headers=ORIGIN).status_code == 200
    protected_routes()
    assert client.get(f"/_acceptance/events/{event}").status_code == 200
    problem(client.get(f"/_acceptance/events/{uuid4()}"), 403, "forbidden")
    with connect() as connection:
        connection.execute("UPDATE event_memberships SET status='inactive' WHERE event_id=%s", (event,))
    problem(client.get(f"/_acceptance/events/{event}"), 403, "forbidden")
    problem(client.get("/_acceptance/workspace"), 403, "forbidden")
    assert client.get("/api/v1/auth/me").json()["eventMemberships"] == []


def test_business_membership_revalidation_and_wrong_business_denial(client):
    actor = register(client, "business").json()
    protected_routes()
    business = actor["businessMemberships"][0]["businessId"]
    assert client.get(f"/_acceptance/businesses/{business}").status_code == 200
    problem(client.get(f"/_acceptance/businesses/{uuid4()}"), 403, "forbidden")
    with connect() as connection:
        connection.execute("UPDATE business_memberships SET status='inactive' WHERE business_id=%s", (business,))
    problem(client.get(f"/_acceptance/businesses/{business}"), 403, "forbidden")
    assert client.get("/api/v1/auth/me").json()["businessMemberships"] == []


@pytest.mark.parametrize("endpoint", ["login", "logout", "change-password"])
@pytest.mark.parametrize("origin", [None, "null", "https://attacker.invalid"])
def test_all_existing_session_mutations_reject_untrusted_origin_without_changes(client, endpoint, origin):
    register(client)
    token = client.cookies["eventapp_session"]
    before = counts()
    with connect() as connection:
        sessions_before = connection.execute("SELECT token_hash,expires_at,revoked_at FROM sessions ORDER BY id").fetchall()
        hash_before = connection.execute("SELECT password_hash FROM password_credentials").fetchone()[0]
    body = {"identifier": "synthetic", "password": PASSWORD, "role": "attendee"} if endpoint == "login" else {"currentPassword": PASSWORD, "newPassword": "Replacement-123"} if endpoint == "change-password" else None
    response = client.post(f"/api/v1/auth/{endpoint}", json=body, headers={} if origin is None else {"Origin": origin})
    problem(response, 403, "forbidden")
    assert "set-cookie" not in response.headers and client.cookies["eventapp_session"] == token
    assert counts() == before
    with connect() as connection:
        assert connection.execute("SELECT token_hash,expires_at,revoked_at FROM sessions ORDER BY id").fetchall() == sessions_before
        assert connection.execute("SELECT password_hash FROM password_credentials").fetchone()[0] == hash_before
    assert client.get("/api/v1/auth/me").status_code == 200


@pytest.mark.parametrize("length,status", [(128, 201), (129, 422)])
def test_registration_password_upper_boundary_never_truncates(client, length, status):
    password = "x" * length
    response = client.post("/api/v1/auth/register/attendee", json=payload(password=password), headers=ORIGIN)
    assert response.status_code == status
    if status == 201:
        assert login(client, password=password).status_code == 200
        assert login(client, password=password[:-1]).status_code == 401
    else:
        problem(response, 422, "validation_error")
        assert password not in response.text
        assert all(value == 0 for value in counts().values())


@pytest.mark.parametrize("length,status", [(7, 422), (128, 200), (129, 422)])
def test_password_change_bounds_and_secret_free_validation(client, length, status):
    register(client)
    replacement = "q" * length
    response = client.post("/api/v1/auth/change-password", json={"currentPassword": PASSWORD, "newPassword": replacement}, headers=ORIGIN)
    assert response.status_code == status
    assert PASSWORD not in response.text and replacement not in response.text
    if status == 422:
        problem(response, 422, "validation_error")
        assert login(client).status_code == 200
    else:
        assert login(client, password=replacement).status_code == 200


def test_no_public_organiser_registration_and_cli_cannot_upgrade_existing_attendee(client):
    response = client.post("/api/v1/auth/register/organiser", json=payload(), headers=ORIGIN)
    assert response.status_code in {404, 405}
    register(client)
    event, _, _ = seed_organiser()
    before = counts()
    collision = bootstrap(["organiser", "--username", "synthetic", "--email", "synthetic@example.test", "--display-name", "Escalation", "--event-id", event])
    assert collision.returncode != 0 and counts() == before
    assert client.get("/api/v1/auth/me").json()["role"] == "attendee"


@pytest.mark.parametrize("environment,origin", [("test", "http://localhost:5173"), ("production", "https://eventapp.example.test")])
def test_cookie_is_secure_outside_development_in_fresh_process(environment, origin):
    code = "\n".join([
        "import json", "from fastapi.testclient import TestClient", "from app.main import app",
        "with TestClient(app,base_url='https://eventapp.example.test') as client:",
        f" response=client.post('/api/v1/auth/register/attendee',json={payload()!r},headers={{'Origin':{origin!r}}})",
        " print(json.dumps({'status':response.status_code,'cookie':response.headers.get('set-cookie','')}))",
    ])
    result = subprocess.run([sys.executable, "-c", code], cwd=BACKEND, env={**os.environ, "ENVIRONMENT": environment, "TRUSTED_ORIGINS": json.dumps([origin])}, text=True, capture_output=True)
    assert result.returncode == 0, result.stderr
    output = json.loads(result.stdout.strip().splitlines()[-1])
    assert output["status"] == 201
    assert "; secure" in output["cookie"].lower() and "domain=" not in output["cookie"].lower()


def test_sensitive_successes_write_minimal_attributable_audits(client, caplog):
    registered = register(client).json()
    response = client.post("/api/v1/auth/change-password", json={"currentPassword": PASSWORD, "newPassword": "Replacement-123"}, headers=ORIGIN)
    assert response.status_code == 200
    assert client.post("/api/v1/auth/logout", headers=ORIGIN).status_code == 204
    seed_organiser()
    with connect() as connection:
        rows = connection.execute("SELECT user_id,action,resource_id,outcome,occurred_at FROM audit_events ORDER BY occurred_at").fetchall()
    assert len(rows) >= 4
    attributable = [row for row in rows if str(row[0]) == registered["id"]]
    assert len(attributable) >= 3
    assert {"registration", "password_change", "logout"} <= {row[1] for row in attributable}
    assert all(row[1] and row[3] and row[4] is not None for row in rows)
    exposed = repr(rows) + caplog.text
    for marker in [PASSWORD, "Replacement-123", "synthetic@example.test", "seed@example.test"]:
        assert marker not in exposed


def test_shared_dependencies_deny_unauthenticated_and_wrong_role_without_mutation(client):
    # Public dependency contract is exercised through test-only routes, never fake actors.
    protected_routes()
    problem(client.get("/_acceptance/workspace"), 401, "unauthenticated")
    register(client)
    before = counts()
    problem(client.get("/_acceptance/workspace"), 403, "forbidden")
    problem(client.get(f"/_acceptance/events/{uuid4()}"), 403, "forbidden")
    problem(client.get(f"/_acceptance/businesses/{uuid4()}"), 403, "forbidden")
    assert counts() == before


def test_denied_duplicate_registration_has_redacted_audit_without_account_mutation(client, caplog):
    register(client)
    before = counts()
    with connect() as connection:
        credential_before = connection.execute("SELECT password_hash,must_change_password,updated_at FROM password_credentials").fetchall()
        sessions_before = connection.execute("SELECT token_hash,expires_at,revoked_at FROM sessions ORDER BY id").fetchall()
    response = client.post("/api/v1/auth/register/attendee", json=payload(), headers=ORIGIN)
    problem(response, 409, "registration_conflict")
    assert counts() == before
    assert "set-cookie" not in response.headers
    with connect() as connection:
        assert connection.execute("SELECT password_hash,must_change_password,updated_at FROM password_credentials").fetchall() == credential_before
        assert connection.execute("SELECT token_hash,expires_at,revoked_at FROM sessions ORDER BY id").fetchall() == sessions_before
        denied = connection.execute("SELECT user_id,action,resource_id,outcome,occurred_at FROM audit_events WHERE action='registration' AND outcome='denied'").fetchall()
    assert len(denied) == 1
    assert denied[0][4] is not None
    for marker in [PASSWORD, "synthetic@example.test"]:
        assert marker not in repr(denied) + response.text + caplog.text


def test_denied_missing_event_organiser_provision_has_redacted_audit(client):
    before = counts()
    result = bootstrap(["organiser", "--username", "denied-organiser", "--email", "denied@example.test", "--display-name", "Denied Organiser", "--event-id", str(uuid4())])
    assert result.returncode != 0
    assert counts() == before
    with connect() as connection:
        denied = connection.execute("SELECT user_id,action,resource_id,outcome,occurred_at FROM audit_events WHERE action='organiser_provision' AND outcome='denied'").fetchall()
    assert len(denied) == 1
    assert denied[0][0] is None and denied[0][4] is not None
    for marker in [PASSWORD, "denied@example.test", "Denied Organiser"]:
        assert marker not in repr(denied) + result.stdout + result.stderr
