"""Independent populated 0005 -> 0006 preservation acceptance test."""
import os
from pathlib import Path
import subprocess
import sys

from psycopg import sql

from tests.test_ai_analysis import (
    ai_world, _application, _save_rubric, _start, _raw_report, FakeProvider, _worker,
)
from tests.test_business_applications import (
    clean_database, migrated_database, connect, submit,
)
from tests.test_programme import request, locations, draft


BACKEND = Path(__file__).resolve().parents[1]


def test_disruption_upgrade_preserves_populated_programme_and_application_ai(ai_world, monkeypatch):
    world = ai_world
    base = f"/api/v1/organiser/events/{world.event_id}"
    _, room = locations(world.owner, base)
    item = draft(world.owner, base, room, startsAt="2027-01-01T10:00:00+08:00", endsAt="2027-01-01T11:00:00+08:00")
    published = request(world.owner, "POST", base + f"/programme-items/{item['id']}/publish", {"expectedRevision": 1})
    description = "Invented populated pre-disruption migration application."
    submitted = submit(world, _application(world, description=description), client=world.business)
    rubric = _save_rubric(world)
    completed, _, _ = _start(world, submitted, rubric)
    assert _worker(monkeypatch, FakeProvider(_raw_report(description)))
    queued, _, _ = _start(world, submitted, rubric)
    assert queued["state"] == "pending"
    # All records originate from existing public producer APIs and the real
    # worker. No F02 or domain-table fixture writes establish the old data.
    tables = (
        "users", "password_credentials", "sessions", "businesses", "business_memberships",
        "events", "event_memberships", "audit_events", "application_approvals",
        "event_participations", "submissions", "application_settings", "application_decisions",
        "venues", "rooms", "programme_items", "programme_item_revisions",
        "analysis_rubric_versions", "ai_jobs", "ai_reports", "ai_provider_attempts",
    )
    environment = {**os.environ, "DATABASE_URL": os.environ["TEST_DATABASE_URL"]}
    def migration(direction, revision):
        result = subprocess.run([sys.executable, "-m", "alembic", direction, revision], cwd=BACKEND,
                                env=environment, capture_output=True, text=True)
        assert result.returncode == 0, result.stdout + result.stderr
    migration("downgrade", "20261021_0005")
    try:
        with connect() as connection:
            assert {row[0] for row in connection.execute("SELECT version_num FROM alembic_version").fetchall()} == {
                "20261021_0005", "20261021_f02",
            }
            columns = {table: [row[0] for row in connection.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=%s ORDER BY ordinal_position", (table,))]
                for table in tables}
            def rows(table):
                projection = sql.SQL(", ").join(map(sql.Identifier, columns[table]))
                return connection.execute(sql.SQL("SELECT {} FROM {} ORDER BY 1").format(projection, sql.Identifier(table))).fetchall()
            before = {table: rows(table) for table in tables}
            assert before["programme_item_revisions"] and before["ai_reports"] and before["ai_provider_attempts"]
            states = connection.execute("SELECT id,state FROM ai_jobs ORDER BY id").fetchall()
            assert {str(identifier): state for identifier, state in states} == {completed["id"]: "completed", queued["id"]: "pending"}
        migration("upgrade", "20261021_0006")
        with connect() as connection:
            for table in tables:
                projection = sql.SQL(", ").join(map(sql.Identifier, columns[table]))
                after = connection.execute(sql.SQL("SELECT {} FROM {} ORDER BY 1").format(projection, sql.Identifier(table))).fetchall()
                assert after == before[table], table
            assert connection.execute("SELECT DISTINCT kind FROM ai_jobs").fetchall() == [("application_analysis",)]
            assert connection.execute("SELECT count(*) FROM ai_jobs WHERE source_change_id IS NOT NULL OR announcement_draft_id IS NOT NULL").fetchone()[0] == 0
    finally:
        # Restore the migrated test schema even if the preservation assertions
        # fail, so later guarded modules receive the intended current head.
        migration("upgrade", "head")
    assert request(world.owner, "GET", f"/api/v1/ai/jobs/{queued['id']}")["state"] == "pending"
    done = request(world.owner, "GET", f"/api/v1/ai/jobs/{completed['id']}")
    assert done["state"] == "completed" and done["report"]["payload"]["findings"]
    assert request(world.attendee, "GET", f"/api/v1/attendee/events/{world.event_id}/programme/{item['id']}")["revision"] == published["revision"]
