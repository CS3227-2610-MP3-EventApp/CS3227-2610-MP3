from __future__ import annotations

import os
import subprocess
from pathlib import Path

import psycopg
from sqlalchemy.engine import make_url

from tests.reset_guard import require_synthetic_reset_target


BACKEND = Path(__file__).resolve().parents[1]


def _psycopg_url() -> str:
    return make_url(os.environ["TEST_DATABASE_URL"]).set(drivername="postgresql").render_as_string(
        hide_password=False
    )


def test_empty_database_upgrade_creates_authentication_tables() -> None:
    require_synthetic_reset_target()
    database_url = _psycopg_url()
    with psycopg.connect(database_url, autocommit=True) as connection:
        connection.execute("DROP SCHEMA public CASCADE")
        connection.execute("CREATE SCHEMA public")

    result = subprocess.run(
        ["uv", "run", "alembic", "upgrade", "head"],
        cwd=BACKEND,
        env={**os.environ, "DATABASE_URL": os.environ["TEST_DATABASE_URL"]},
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr

    with psycopg.connect(database_url) as connection:
        tables = connection.execute(
            "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"
        ).fetchall()

    assert {row[0] for row in tables} == {"alembic_version", "users", "password_credentials", "sessions", "businesses", "business_memberships", "events", "event_memberships", "audit_events", "venues", "rooms", "programme_items", "programme_item_revisions"}


def test_programme_upgrade_preserves_existing_authentication_records() -> None:
    from uuid import uuid4
    from tests.test_authentication import bootstrap, connect, PASSWORD, login, payload, ORIGIN
    from fastapi.testclient import TestClient
    require_synthetic_reset_target()
    with psycopg.connect(_psycopg_url(), autocommit=True) as connection:
        connection.execute("DROP SCHEMA public CASCADE")
        connection.execute("CREATE SCHEMA public")
    environment = {**os.environ, "DATABASE_URL": os.environ["TEST_DATABASE_URL"]}
    old = subprocess.run(["uv", "run", "alembic", "upgrade", "20261019_0002"], cwd=BACKEND, env=environment, capture_output=True, text=True)
    assert old.returncode == 0, old.stdout + old.stderr
    event = str(uuid4())
    result = bootstrap(["event", "--id", event, "--title", "Preserved event", "--timezone", "Asia/Singapore", "--starts-at", "2027-01-01T09:00:00+08:00", "--ends-at", "2027-01-01T18:00:00+08:00"])
    assert result.returncode == 0, result.stderr
    result = bootstrap(["organiser", "--username", "preserved-organiser", "--email", "preserved@example.test", "--display-name", "Preserved", "--event-id", event])
    assert result.returncode == 0, result.stderr
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as business_client:
        registered = business_client.post("/api/v1/auth/register/business", json=payload(username="preserved-business", email="preserved-business@example.test", businessName="Preserved business"), headers=ORIGIN)
        assert registered.status_code == 201, registered.text
    with TestClient(app, raise_server_exceptions=False) as client:
        assert login(client, "preserved-organiser", PASSWORD, "organiser").status_code == 200
        cookie = dict(client.cookies)
        with connect() as connection:
            before = {table: connection.execute(f"SELECT row_to_json(t)::text FROM {table} t ORDER BY row_to_json(t)::text").fetchall() for table in ("users", "password_credentials", "sessions", "businesses", "business_memberships", "events", "event_memberships", "audit_events")}
        upgraded = subprocess.run(["uv", "run", "alembic", "upgrade", "head"], cwd=BACKEND, env=environment, capture_output=True, text=True)
        assert upgraded.returncode == 0, upgraded.stdout + upgraded.stderr
        with connect() as connection:
            after = {table: connection.execute(f"SELECT row_to_json(t)::text FROM {table} t ORDER BY row_to_json(t)::text").fetchall() for table in before}
        assert after == before
        client.cookies.update(cookie)
        actor = client.get("/api/v1/auth/me")
        assert actor.status_code == 200 and actor.json()["username"] == "preserved-organiser"


def test_reset_guard_rejects_unsafe_targets_before_database_import() -> None:
    cases = (
        ({}, "EVENTAPP_ALLOW_TEST_DB_RESET=true is required"),
        ({"EVENTAPP_ALLOW_TEST_DB_RESET": "false"}, "EVENTAPP_ALLOW_TEST_DB_RESET=true is required"),
        ({"TEST_DATABASE_URL": "postgresql+psycopg://eventapp_test:eventapp_test@db.example:5433/eventapp_test"}, "not the synthetic local test target"),
        ({"TEST_DATABASE_URL": "postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5432/eventapp_test"}, "not the synthetic local test target"),
        ({"TEST_DATABASE_URL": "postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp"}, "not the synthetic local test target"),
        ({"TEST_DATABASE_URL": "postgresql+psycopg://eventapp:eventapp_test@127.0.0.1:5433/eventapp_test"}, "not the synthetic local test target"),
        ({"TEST_DATABASE_URL": "postgresql://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test"}, "not the synthetic local test target"),
    )
    for overrides, expected in cases:
        environment = {**os.environ, "EVENTAPP_ALLOW_TEST_DB_RESET": "true", **overrides}
        if not overrides:
            environment.pop("EVENTAPP_ALLOW_TEST_DB_RESET", None)
        result = subprocess.run(
            ["python", "-c", "from tests.reset_guard import require_synthetic_reset_target; require_synthetic_reset_target()"],
            cwd=BACKEND,
            env=environment,
            capture_output=True,
            text=True,
            check=False,
        )
        assert result.returncode != 0
        assert expected in result.stderr
        assert "psycopg" not in result.stderr.lower()

