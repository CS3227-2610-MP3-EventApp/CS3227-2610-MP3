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
        ["uv", "run", "alembic", "upgrade", "20261019_0002"],
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

    assert {row[0] for row in tables} == {"alembic_version", "users", "password_credentials", "sessions", "businesses", "business_memberships", "events", "event_memberships", "audit_events"}


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

