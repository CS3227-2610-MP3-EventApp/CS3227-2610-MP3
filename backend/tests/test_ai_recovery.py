"""Supplemental durable-job recovery tests; added coverage, pending baseline freeze."""
from datetime import timedelta
from uuid import uuid4

import pytest

pytest_plugins = ("tests.test_ai_analysis",)

from app.ai import service
from app.database import SessionLocal
from app.auth.models import utcnow
from tests.test_ai_analysis import (
    FakeProvider,
    _application,
    _decide,
    _get_job,
    _raw_report,
    _save_rubric,
    _start,
    _worker,
    connect,
    request,
    submit,
    success,
    table_rows,
)
from tests.test_business_applications import domain_state, reject_writes


def _report_count(job_id):
    with connect() as connection:
        return connection.execute("SELECT count(*) FROM ai_reports WHERE job_id=%s", (job_id,)).fetchone()[0]


def test_expired_running_lease_fails_once_without_provider_replay(ai_world, monkeypatch):
    world = ai_world
    record = submit(world, _application(world, description="Synthetic interrupted worker fixture."), client=world.business)
    rubric = _save_rubric(world)
    job, _, _ = _start(world, record, rubric)
    now = utcnow()
    with connect() as connection:
        connection.execute(
            "UPDATE ai_jobs SET state='running', lease_until=%s, deadline_at=%s, "
            "dispatch_at=%s, provider_may_have_run=true WHERE id=%s",
            (now - timedelta(seconds=1), now + timedelta(minutes=1), now - timedelta(seconds=30), job["id"]),
        )
        connection.execute(
            "INSERT INTO ai_provider_attempts(id, job_id, attempted_at) VALUES(%s,%s,%s)",
            (uuid4(), job["id"], now - timedelta(seconds=30)),
        )

    provider = FakeProvider(_raw_report(record["content"]["description"]))
    from app.ai import worker

    assert worker.run_once(provider=provider) is False
    assert worker.run_once(provider=provider) is False
    assert provider.calls == []
    stored = _get_job(world, job["id"])
    assert stored["state"] == "failed" and stored["failureCode"] == "worker_interrupted"
    assert stored["providerMayHaveRun"] is True
    assert _report_count(job["id"]) == 0
    with connect() as connection:
        dispatch_at = connection.execute("SELECT dispatch_at FROM ai_jobs WHERE id=%s", (job["id"],)).fetchone()[0]
        attempts = connection.execute("SELECT count(*) FROM ai_provider_attempts WHERE job_id=%s", (job["id"],)).fetchone()[0]
    assert dispatch_at is not None and attempts == 1


def test_cleanup_removes_expired_terminal_jobs_and_reports_only(ai_world, monkeypatch):
    world = ai_world
    description = "Synthetic retained application fixture."
    record = submit(world, _application(world, description=description), client=world.business)
    decided = _decide(world, record, "rejected", "Synthetic decision preserved by cleanup.")
    rubric = _save_rubric(world)

    completed_job, _, _ = _start(world, decided, rubric)
    assert _worker(monkeypatch, FakeProvider(_raw_report(description)))
    cancelled_job, _, _ = _start(world, decided, rubric)
    success(request(world.owner, "POST", f"/api/v1/ai/jobs/{cancelled_job['id']}/cancel", json={}))
    failed_job, _, _ = _start(world, decided, rubric)
    assert _worker(monkeypatch, FakeProvider("not valid json"))
    boundary_job, _, _ = _start(world, decided, rubric)
    success(request(world.owner, "POST", f"/api/v1/ai/jobs/{boundary_job['id']}/cancel", json={}))
    job_ids = [completed_job["id"], cancelled_job["id"], failed_job["id"], boundary_job["id"]]
    before_domain = domain_state()
    before_audit = table_rows("audit_events")
    cleanup_now = utcnow()
    with connect() as connection:
        before_rubrics = connection.execute(
            "SELECT to_jsonb(t) FROM analysis_rubric_versions t ORDER BY revision"
        ).fetchall()
        old = cleanup_now - timedelta(days=31)
        for job_id in job_ids[:3]:
            connection.execute("UPDATE ai_jobs SET created_at=%s WHERE id=%s", (old, job_id))
            connection.execute("UPDATE ai_reports SET created_at=%s WHERE job_id=%s", (old, job_id))
        # The inclusive cleanup cutoff must remove a terminal row exactly 30 days old.
        connection.execute("UPDATE ai_jobs SET created_at=%s WHERE id=%s",
                           (cleanup_now - timedelta(days=30), boundary_job["id"]))

    with SessionLocal.begin() as db:
        service.cleanup(db, now=cleanup_now)
    with SessionLocal.begin() as db:
        service.cleanup(db, now=cleanup_now)

    with connect() as connection:
        remaining = connection.execute(
            "SELECT count(*) FROM ai_jobs WHERE id = ANY(%s)", (job_ids,),
        ).fetchone()[0]
        reports = connection.execute(
            "SELECT count(*) FROM ai_reports WHERE job_id = ANY(%s)", (job_ids,),
        ).fetchone()[0]
        after_rubrics = connection.execute(
            "SELECT to_jsonb(t) FROM analysis_rubric_versions t ORDER BY revision"
        ).fetchall()
    assert remaining == reports == 0
    assert after_rubrics == before_rubrics
    assert domain_state() == before_domain
    assert table_rows("audit_events") == before_audit
    for job_id in job_ids:
        response = request(world.owner, "GET", f"/api/v1/ai/jobs/{job_id}")
        assert response.status_code == 404


def test_provider_return_past_deadline_cannot_commit_report(ai_world, monkeypatch):
    world = ai_world
    description = "Synthetic provider response after deadline."
    record = submit(world, _application(world, description=description), client=world.business)
    rubric = _save_rubric(world)
    job, _, _ = _start(world, record, rubric)

    class LateProvider(FakeProvider):
        def complete(self, messages):
            self.calls.append(messages)
            with connect() as connection:
                connection.execute(
                    "UPDATE ai_jobs SET deadline_at=%s WHERE id=%s",
                    (utcnow() - timedelta(seconds=1), job["id"]),
                )
            return _raw_report(description)

    provider = LateProvider()
    assert _worker(monkeypatch, provider)
    assert len(provider.calls) == 1
    final = _get_job(world, job["id"])
    assert final["state"] == "failed" and final["failureCode"] == "job_timeout"
    assert final["report"] is None and _report_count(job["id"]) == 0


def test_initial_job_read_never_pairs_stale_pending_state_with_new_report(ai_world, monkeypatch):
    world = ai_world
    description = "Synthetic stale-read race fixture."
    record = submit(world, _application(world, description=description), client=world.business)
    rubric = _save_rubric(world)
    job, _, _ = _start(world, record, rubric)
    provider = FakeProvider(_raw_report(description))
    original_authority_check = service.require_authority
    worker_ran = False

    def complete_between_job_select_and_report_read(db, owner_id, event_id):
        nonlocal worker_ran
        if not worker_ran:
            worker_ran = True
            assert _worker(monkeypatch, provider)
        return original_authority_check(db, owner_id, event_id)

    monkeypatch.setattr(service, "require_authority", complete_between_job_select_and_report_read)
    first_read = success(request(world.owner, "GET", f"/api/v1/ai/jobs/{job['id']}"))
    assert first_read["state"] == "pending" and first_read["report"] is None
    monkeypatch.setattr(service, "require_authority", original_authority_check)
    second_read = _get_job(world, job["id"])
    assert second_read["state"] == "completed" and second_read["report"] is not None


def test_audit_failure_rolls_back_report_and_completion(ai_world, monkeypatch):
    world = ai_world
    description = "Synthetic audit rollback fixture."
    record = submit(world, _application(world, description=description), client=world.business)
    rubric = _save_rubric(world)
    job, _, _ = _start(world, record, rubric)
    before_domain = domain_state()
    before_audit = table_rows("audit_events")

    with reject_writes("audit_events"):
        provider = FakeProvider(_raw_report(description))
        assert _worker(monkeypatch, provider)
        assert len(provider.calls) == 1

    final = _get_job(world, job["id"])
    assert final["state"] == "failed" and final["report"] is None
    assert _report_count(job["id"]) == 0
    assert domain_state() == before_domain
    assert table_rows("audit_events") == before_audit
