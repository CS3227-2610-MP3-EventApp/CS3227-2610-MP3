"""Developer-owned checks for the shared worker cleanup path; no database or provider requests."""
from contextlib import contextmanager
import sys

from app.ai import worker


def test_cleanup_flag_recovers_and_expires_organiser_and_attendee_jobs(monkeypatch):
    calls = []

    @contextmanager
    def begin():
        yield "session"

    monkeypatch.setattr(worker.SessionLocal, "begin", begin)
    for name, module in (("organiser", worker.service), ("attendee", worker.attendee_service)):
        for action in ("recovery", "cleanup"):
            monkeypatch.setattr(module, action, lambda db, name=name, action=action: calls.append((name, action)))
    monkeypatch.setattr(sys, "argv", ["worker", "--cleanup"])
    worker.main()
    assert calls == [("organiser", "recovery"), ("organiser", "cleanup"), ("attendee", "recovery"), ("attendee", "cleanup")]
