from __future__ import annotations

import os

from sqlalchemy.engine import make_url


def require_synthetic_reset_target() -> str:
    value = os.getenv("TEST_DATABASE_URL", "")
    try:
        url = make_url(value)
    except Exception as exc:
        raise RuntimeError("refusing reset: invalid TEST_DATABASE_URL") from exc

    host = (url.host or "").lower()
    if host == "localhost":
        host = "127.0.0.1"
    exact_target = (
        url.drivername == "postgresql+psycopg"
        and host == "127.0.0.1"
        and url.port == 5433
        and url.database == "eventapp_test"
        and url.username == "eventapp_test"
    )
    if not exact_target:
        raise RuntimeError("refusing reset: TEST_DATABASE_URL is not the synthetic local test target")
    if os.getenv("EVENTAPP_ALLOW_TEST_DB_RESET") != "true":
        raise RuntimeError("refusing reset: EVENTAPP_ALLOW_TEST_DB_RESET=true is required")
    return value
