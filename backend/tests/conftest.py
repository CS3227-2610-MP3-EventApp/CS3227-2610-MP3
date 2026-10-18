from __future__ import annotations

import os

import pytest
from sqlalchemy.engine import URL, make_url


def _database_identity(value: str) -> tuple[str | None, str, int, str | None]:
    url: URL = make_url(value)
    host = (url.host or "localhost").lower()
    if host in {"localhost", "127.0.0.1", "::1"}:
        host = "loopback"
    return (
        url.get_backend_name(),
        host,
        url.port or 5432,
        url.database,
    )


def pytest_sessionstart(session: pytest.Session) -> None:
    test_url = os.getenv("TEST_DATABASE_URL")
    if not test_url:
        raise pytest.UsageError("TEST_DATABASE_URL is required; tests never use DATABASE_URL")
    development_url = os.getenv("DATABASE_URL")
    if not development_url:
        raise pytest.UsageError("DATABASE_URL is required to prove test database separation")

    try:
        test_identity = _database_identity(test_url)
    except Exception as exc:
        raise pytest.UsageError("TEST_DATABASE_URL must be a valid database URL") from exc
    try:
        development_identity = _database_identity(development_url)
    except Exception as exc:
        raise pytest.UsageError("DATABASE_URL must be a valid database URL") from exc

    if test_identity == development_identity:
        raise pytest.UsageError("TEST_DATABASE_URL must not resolve to the development database")

    if test_identity[0] != "postgresql":
        raise pytest.UsageError("TEST_DATABASE_URL must use PostgreSQL")

    # Application imports during tests must see only the independently validated test target.
    os.environ["DATABASE_URL"] = test_url

