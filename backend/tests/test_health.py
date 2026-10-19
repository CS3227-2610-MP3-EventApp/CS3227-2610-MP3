from __future__ import annotations

import logging
import os

from fastapi.testclient import TestClient
from sqlalchemy import Connection
from sqlalchemy.engine import Engine, make_url


def _client() -> TestClient:
    from app.main import app

    return TestClient(app, raise_server_exceptions=False)


def test_live_is_database_independent(monkeypatch) -> None:
    def reject_database_access(*args, **kwargs):
        raise AssertionError("liveness must not open or query a database connection")

    monkeypatch.setattr(Engine, "connect", reject_database_access)

    response = _client().get("/api/v1/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "live"}


def test_ready_queries_reachable_approved_test_postgresql(monkeypatch) -> None:
    observed_urls = []
    connect = Engine.connect

    def observe_connection(engine, *args, **kwargs):
        observed_urls.append(engine.url)
        return connect(engine, *args, **kwargs)

    monkeypatch.setattr(Engine, "connect", observe_connection)
    response = _client().get("/api/v1/health/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}
    assert observed_urls
    assert all(url == make_url(os.environ["TEST_DATABASE_URL"]) for url in observed_urls)


def _assert_redacted_problem(response, caplog, markers: tuple[str, ...]) -> None:
    assert response.status_code == 503
    assert response.headers["content-type"].startswith("application/problem+json")
    problem = response.json()
    assert set(problem) == {"type", "title", "status", "detail", "instance"}
    assert problem["status"] == 503
    assert problem["instance"] == "/api/v1/health/ready"
    assert all(isinstance(problem[field], str) and problem[field] for field in ("type", "title", "detail"))
    exposed = (response.text + "\n" + caplog.text).lower()
    assert all(marker.lower() not in exposed for marker in markers)


def test_ready_connection_failure_is_generic_and_redacted(monkeypatch, caplog) -> None:
    markers = (
        "connection-password-z9x8",
        "connection-host.invalid",
        "SyntheticConnectionFailure",
        "fail_connection_at_boundary",
        "/synthetic/connection/path.py",
        "traceback",
    )

    class SyntheticConnectionFailure(RuntimeError):
        pass

    def fail_connection_at_boundary(*args, **kwargs):
        raise SyntheticConnectionFailure(
            "postgresql+psycopg://eventapp_test:connection-password-z9x8@connection-host.invalid:5433/eventapp_test /synthetic/connection/path.py"
        )

    monkeypatch.setattr(Engine, "connect", fail_connection_at_boundary)
    with caplog.at_level(logging.ERROR):
        response = _client().get("/api/v1/health/ready")
    _assert_redacted_problem(response, caplog, markers)


def test_ready_query_failure_is_generic_and_redacted(monkeypatch, caplog) -> None:
    markers = (
        "query-password-q7w6",
        "query-host.invalid",
        "SyntheticQueryFailure",
        "fail_query_execution",
        "/synthetic/query/path.py",
        "traceback",
    )

    class SyntheticQueryFailure(RuntimeError):
        pass

    def fail_query_execution(*args, **kwargs):
        raise SyntheticQueryFailure(
            "postgresql+psycopg://eventapp_test:query-password-q7w6@query-host.invalid:5433/eventapp_test /synthetic/query/path.py"
        )

    monkeypatch.setattr(Connection, "execute", fail_query_execution)
    with caplog.at_level(logging.ERROR):
        response = _client().get("/api/v1/health/ready")
    _assert_redacted_problem(response, caplog, markers)


def test_openapi_describes_foundation_endpoints() -> None:
    response = _client().get("/api/v1/openapi.json")

    assert response.status_code == 200
    document = response.json()
    assert document["openapi"].startswith("3.")
    foundation_paths = {
        "/api/v1/health/live",
        "/api/v1/health/ready",
        "/api/v1/openapi.json",
    }
    assert foundation_paths <= set(document["paths"])
    assert all(set(document["paths"][path]) == {"get"} for path in foundation_paths)
    assert {f"/api/v1/auth/{path}" for path in ("register/attendee", "register/business", "login", "logout", "me", "change-password")} <= set(document["paths"])

