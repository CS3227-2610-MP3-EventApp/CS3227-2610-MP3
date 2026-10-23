"""Supplemental invented-data HTTP/provider/restart check; never prints credentials."""
import contextlib
import io
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import time
from unittest.mock import patch
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
os.chdir(BACKEND)
sys.path.insert(0, str(BACKEND))
os.environ["DATABASE_URL"] = "postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp"
event_id = str(uuid4())
os.environ.update(AI_ENABLED="true", AI_SYNTHETIC_ONLY="true", AI_SYNTHETIC_EVENT_IDS=json.dumps([event_id]))
import httpx
from sqlalchemy import inspect, text
from app.database import engine

# Additive migration on retained development storage; compare every existing table.
with engine.connect() as db:
    tables = list(db.execute(text("select tablename from pg_tables where schemaname='public' and tablename <> 'alembic_version'" )).scalars())
    columns = {name: [column["name"] for column in inspect(db).get_columns(name)] for name in tables}
    prior_version = db.execute(text("select version_num from alembic_version")).scalar()
    def fingerprints(connection):
        return {name: connection.execute(text('SELECT md5(COALESCE(string_agg(row_to_json(t)::text, :empty ORDER BY row_to_json(t)::text), :empty)) FROM (SELECT ' + ','.join('"' + column + '"' for column in columns[name]) + ' FROM "' + name + '") t'), {"empty": ""}).scalar() for name in tables}
    before = fingerprints(db)
subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True, capture_output=True)
with engine.connect() as db:
    assert fingerprints(db) == before, "Migration changed retained domain rows"
    assert db.execute(text("select count(*) from ai_jobs where state in ('pending','running')")).scalar() == 0, "Unrelated active work: refuse provider dispatch"
print("PASS migration check preserves existing column fingerprints; starting revision " + prior_version, flush=True)
from app.auth import bootstrap
password = secrets.token_urlsafe(24)
orgname = "p5org" + uuid4().hex[:16]
bizname = "p5biz" + uuid4().hex[:16]
for args in [["event", "--id", event_id, "--title", "Community Arts and Crafts Fair 2027", "--timezone", "Asia/Singapore", "--starts-at", "2027-01-01T09:00:00+08:00", "--ends-at", "2027-01-01T18:00:00+08:00"], ["organiser", "--username", orgname, "--email", orgname + "@example.test", "--display-name", "Invented organiser", "--event-id", event_id]]:
    with patch.object(sys, "argv", ["bootstrap"] + args), patch("getpass.getpass", return_value=password), contextlib.redirect_stdout(io.StringIO()):
        assert bootstrap.main() == 0

server = None
port = 8765
base = f"http://127.0.0.1:{port}"
def start_server():
    global server
    server = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(port)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(100):
        if server.poll() is not None: raise RuntimeError("Owned HTTP server did not start")
        try:
            if httpx.get(base + "/api/v1/health/ready", timeout=1).status_code == 200: return
        except httpx.HTTPError: pass
        time.sleep(.1)
    raise RuntimeError("Owned HTTP server readiness timeout")
def stop_server():
    global server
    if server is not None:
        server.terminate(); server.wait(timeout=10); server = None

def call(client, method, path, body=None, status=200):
    response = client.request(method, base + "/api/v1" + path, json=body)
    assert response.status_code == status, (method, path, response.status_code, response.json().get("code"))
    assert response.headers.get("cache-control") == "no-store"
    return response.json()
try:
    start_server()
    with httpx.Client(headers={"Origin": "http://localhost:5173"}) as org, httpx.Client(headers={"Origin": "http://localhost:5173"}) as biz:
        call(org, "POST", "/auth/login", {"identifier": orgname, "password": password, "role": "organiser"})
        changed = secrets.token_urlsafe(24)
        call(org, "POST", "/auth/change-password", {"currentPassword": password, "newPassword": changed})
        call(biz, "POST", "/auth/register/business", { "username": bizname, "email": bizname + "@example.test", "displayName": "Invented owner", "businessName": "Invented " + bizname, "password": secrets.token_urlsafe(24)}, 201)
        actor = call(biz, "GET", "/auth/me")
        business_id = actor["businessMemberships"][0]["businessId"]
        call(org, "PUT", f"/organiser/events/{event_id}/application-settings", {"expectedRevision": 1, "applicationsOpen": True})
        application = call(biz, "POST", "/business/applications", {"businessId": business_id, "eventId": event_id, "participantType": "exhibitor", "description": "Invented display", "requestedSpace": "One invented table", "contactName": "Invented contact", "contactEmail": "invented@example.test"}, 201)
        application = call(biz, "POST", f"/business/applications/{application['id']}/submit", {"expectedRevision": application["revision"]})
        call(org, "POST", f"/organiser/events/{event_id}/applications/{application['id']}/decision", {"expectedRevision": application["revision"], "outcome": "accepted", "reason": None})
        pid = application["participationId"]
        setup = call(org, "PUT", f"/organiser/events/{event_id}/participations/{pid}/setup", {"expectedRevision": 1, "boothLabel": "INVENTED-A1", "setupInstructions": "Invented setup at nine"})
        assert call(biz, "GET", f"/business/participations/{pid}/setup")["boothLabel"] is None
        call(org, "POST", f"/organiser/events/{event_id}/participations/{pid}/setup/publish", {"expectedRevision": setup["revision"]})
        manual_path = f"/business/participations/{pid}/preparation"
        manual = call(biz, "PUT", manual_path, {"expectedRevision": 1, "tasks": [{"title": "Invented retained task", "status": "not_started", "dueDate": None}], "budget": {"currency": "SGD", "overallLimitMinorUnits": 50000, "lines": []}})
        job = call(biz, "POST", f"/business/participations/{pid}/preparation-drafts", {"requestId": str(uuid4()), "expectedPreparationRevision": manual["revision"], "expectedSetupRevision": setup["revision"], "expectedEventRevision": 1, "needs": "Invented demonstration only. Suggest two display tasks and two material estimates. No suppliers, orders or external actions.", "selectedTaskIds": [manual["tasks"][0]["id"]], "selectedLineIds": [], "syntheticDataConfirmed": True}, 202)
        worker = subprocess.run([sys.executable, "-m", "app.ai.worker", "--once"], capture_output=True, timeout=185)
        assert worker.returncode == 0, "Worker process failed"
        job = call(biz, "GET", f"/ai/jobs/{job['id']}")
        if job["state"] != "completed":
            for line in worker.stderr.decode("utf-8",errors="replace").splitlines():
                if line.startswith("AI provider attempt failed ("): print(line)
        assert job["state"] == "completed", ("Live provider did not produce valid draft", job["failureCode"])
        draft = job["draft"]
        assert draft["tasks"] and draft["budget"]["lines"], "Live provider omitted tasks or estimates"
        assert call(biz, "GET", manual_path) == manual
        draft["tasks"][0]["title"] = "Invented reviewed display task"
        draft_path = f"/business/preparation-drafts/{draft['id']}"
        draft = call(biz, "PUT", draft_path, {"expectedRevision": draft["revision"], "tasks": draft["tasks"], "budget": {"currency": "SGD", "lines": draft["budget"]["lines"]}})
        assert call(biz, "GET", manual_path) == manual
        adopted = call(biz, "POST", draft_path + "/adopt", {"expectedDraftRevision": draft["revision"], "expectedPreparationRevision": manual["revision"], "expectedSetupRevision": setup["revision"], "expectedEventRevision": 1, "taskIndexes": [0], "lineIndexes": [0]})
        assert adopted["preparation"]["budget"]["overallLimitMinorUnits"] == 50000
        assert adopted["preparation"]["tasks"][0] == manual["tasks"][0]
        assert len(adopted["preparation"]["tasks"]) == 2 and len(adopted["preparation"]["budget"]["lines"]) == 1
        call(org, "GET", draft_path, status=403)
        stop_server(); start_server()
        assert call(biz, "GET", manual_path) == adopted["preparation"]
        assert call(biz, "GET", draft_path) == adopted["draft"]
        print("PASS real HTTP application -> accepted setup -> manual -> actual provider -> draft edit -> selected append -> API restart persistence", flush=True)
finally:
    stop_server()
