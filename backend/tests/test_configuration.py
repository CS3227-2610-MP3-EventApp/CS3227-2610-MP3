from __future__ import annotations

import os
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

from tests.scan_tracked_secrets import scan


BACKEND = Path(__file__).resolve().parents[1]
REPOSITORY = BACKEND.parent
TEST_URL = "postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test"
DEVELOPMENT_URL = "postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp"


@pytest.mark.parametrize(
    ("test_url", "development_url", "expected"),
    [
        (None, DEVELOPMENT_URL, "TEST_DATABASE_URL is required"),
        (TEST_URL, None, "DATABASE_URL is required to prove test database separation"),
        (DEVELOPMENT_URL, DEVELOPMENT_URL, "must not resolve to the development database"),
        (
            "postgresql+psycopg://different:different@localhost:5432/eventapp",
            DEVELOPMENT_URL,
            "must not resolve to the development database",
        ),
    ],
)
def test_test_database_guard_fails_before_collection(
    test_url: str | None, development_url: str | None, expected: str
) -> None:
    environment = os.environ.copy()
    if development_url is None:
        environment.pop("DATABASE_URL", None)
    else:
        environment["DATABASE_URL"] = development_url
    if test_url is None:
        environment.pop("TEST_DATABASE_URL", None)
    else:
        environment["TEST_DATABASE_URL"] = test_url

    result = subprocess.run(
        [sys.executable, "-m", "pytest", "-p", "tests.startup_sentinel", "--collect-only", "-q"],
        cwd=BACKEND,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode != 0
    assert expected in result.stdout + result.stderr
    assert "forbidden module" not in result.stdout + result.stderr


def test_application_database_url_is_forced_to_validated_test_target() -> None:
    assert os.environ["DATABASE_URL"] == os.environ["TEST_DATABASE_URL"]


def test_runtime_settings_require_database_url(monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    from app.settings import Settings

    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_compose_uses_loopback_ports_and_distinct_databases() -> None:
    assert shutil.which("docker"), "Docker is required to validate Compose"
    result = subprocess.run(
        ["docker", "compose", "--profile", "test", "config", "--format", "json"],
        cwd=REPOSITORY,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    services = json.loads(result.stdout)["services"]
    expected = {"db": ("5432", None), "test-db": ("5433", ["test"])}
    for name, (published, profile) in expected.items():
        service = services[name]
        assert service.get("profiles") == profile if profile else not service.get("profiles")
        assert service["environment"]["POSTGRES_DB"] == ("eventapp_test" if name == "test-db" else "eventapp")
        assert service["ports"] == [
            {"mode": "ingress", "target": 5432, "published": published, "protocol": "tcp", "host_ip": "127.0.0.1"}
        ]


def test_documentation_contains_exact_foundation_workflow() -> None:
    documentation = (REPOSITORY / "docs" / "DeveloperGuide.md").read_text()
    commands = (
        "docker compose up -d db",
        "docker compose --profile test up -d test-db",
        "cd backend",
        "uv sync",
        "uv run alembic upgrade head",
        "uv run uvicorn app.main:app --reload --host 127.0.0.1",
        "export TEST_DATABASE_URL=",
        "export EVENTAPP_ALLOW_TEST_DB_RESET=true",
        "uv run pytest",
    )

    for command in commands:
        assert command in documentation


def test_tracked_content_contains_no_non_placeholder_secret() -> None:
    assert scan(REPOSITORY) == []

