"""Independent F10 business infrastructure tests; trusted seeded jobs are not creation/LLM evidence."""
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4, UUID

import psycopg
from psycopg.types.json import Jsonb
import pytest

from tests.test_business_applications import (
    migrated_database, clean_database, password_hash, world,
    connect, concurrent, request, success, open_event, create, submit, reject_writes,
)

KEYS={"id","eventId","participationId","state","createdAt","updatedAt","completedAt","failureCode","providerMayHaveRun","draft"}


def path(job): return f"/api/v1/ai/jobs/{job}"


def problem(response,status,code):
    assert response.status_code == status,response.text
    assert response.headers.get("cache-control") == "no-store"
    assert response.headers.get("content-type","").startswith("application/problem+json")
    value=response.json()
    assert value["code"] == code and value["status"] == status
    assert not {"draft","report","currentRevision","participationId"} & value.keys()
    assert "PRIVATE-JOB" not in response.text and "psycopg" not in response.text
    return value


def seed(world,record,state="pending",**overrides):
    """Trusted synthetic persistence fixture: no production creation bypass endpoint."""
    now=datetime.now(timezone.utc)
    values={"id":str(uuid4()),"owner_id":world.xuser,"event_id":record["eventId"],"business_participation_id":record["participationId"],
        "workflow":"preparation","application_id":None,"source_revision":None,"rubric_revision":None,
        "request_id":str(uuid4()),"comparison_revisions":Jsonb([]),"state":state,"failure_code":None,
        "provider_may_have_run":False,"created_at":now,"updated_at":now,"completed_at":now if state in {"failed","cancelled","completed"} else None,
        "deadline_at":now+timedelta(seconds=180),"lease_until":now+timedelta(seconds=120) if state == "running" else None,"dispatch_at":None,**overrides}
    from psycopg import sql
    with connect() as connection:
        connection.execute(sql.SQL("INSERT INTO ai_jobs ({}) VALUES ({})").format(sql.SQL(",").join(map(sql.Identifier,values)),sql.SQL(",").join(sql.Placeholder() for _ in values)),list(values.values()))
    return values["id"]


def stored(job):
    with connect() as connection:
        row=connection.execute("SELECT to_jsonb(j) FROM ai_jobs j WHERE id=%s",(job,)).fetchone()
        return row[0] if row else None


def witnesses():
    with connect() as connection:
        return {table:[r[0] for r in connection.execute(f"SELECT to_jsonb(t) FROM {table} t ORDER BY to_jsonb(t)::text")] for table in ["submissions","application_decisions","event_participations","preparation_documents","participation_setup"]}


@pytest.fixture
def participation(world):
    open_event(world)
    record=create(world)
    success(request(world.x,"PUT",f"/api/v1/business/participations/{record['participationId']}/preparation",json={"expectedRevision":1,"tasks":[{"title":"PRIVATE-JOB-MANUAL-WITNESS","status":"done","dueDate":None}],"budget":{"currency":"SGD","lines":[]}}))
    return record


@pytest.mark.parametrize("method",["GET","POST"])
def test_business_missing_job_uses_shared_dispatch_not_organiser_only_gate(world,method):
    missing=str(uuid4())
    problem(request(world.x,method,path(missing)+("/cancel" if method == "POST" else "")),404,"not_found")


@pytest.mark.parametrize("state",["pending","running","failed","cancelled"])
def test_business_envelope_exact_and_fresh_read_persists(world,participation,state):
    job=seed(world,participation,state,failure_code="worker_interrupted" if state == "failed" else None)
    value=success(world.x.get(path(job)))
    assert set(value) == KEYS
    assert value["id"] == job and value["eventId"] == participation["eventId"] and value["participationId"] == participation["participationId"]
    assert value["state"] == state and value["draft"] is None
    assert success(world.x.get(path(job))) == value


def test_role_owner_workflow_and_current_membership_privacy(world,participation):
    job=seed(world,participation)
    before=stored(job)
    for actor,status,code in [(world.anonymous,401,"unauthenticated"),(world.attendee,403,"forbidden"),(world.oa,404,"not_found"),(world.y,404,"not_found")]:
        for method,suffix in [("GET",""),("POST","/cancel")]:
            problem(request(actor,method,path(job)+suffix),status,code)
    foreign=problem(world.y.get(path(job)),404,"not_found")
    absent=problem(world.y.get(path(uuid4())),404,"not_found")
    assert {k:v for k,v in foreign.items() if k != "instance"} == {k:v for k,v in absent.items() if k != "instance"}
    assert stored(job) == before
    with connect() as connection: connection.execute("UPDATE business_memberships SET status='inactive' WHERE user_id=%s",(world.xuser,))
    problem(world.x.get(path(job)),403,"forbidden")
    problem(request(world.x,"POST",path(job)+"/cancel"),403,"forbidden")
    with connect() as connection: connection.execute("UPDATE business_memberships SET status='active' WHERE user_id=%s",(world.xuser,))
    with connect() as connection: connection.execute("UPDATE password_credentials SET must_change_password=true WHERE user_id=%s",(world.xuser,))
    problem(world.x.get(path(job)),403,"password_change_required")
    problem(request(world.x,"POST",path(job)+"/cancel"),403,"password_change_required")
    assert stored(job) == before


def test_same_business_owner_membership_does_not_grant_another_requesters_job(world,participation):
    job=seed(world,participation)
    with connect() as connection:
        connection.execute("INSERT INTO business_memberships(id,business_id,user_id,membership_role,status) VALUES(%s,%s,%s,'owner','active')",(str(uuid4()),world.xid,world.yuser))
    before=stored(job)
    problem(world.y.get(path(job)),404,"not_found")
    problem(request(world.y,"POST",path(job)+"/cancel"),404,"not_found")
    assert stored(job) == before


def test_target_business_revocation_is_denied_despite_other_active_owner_membership(world,participation):
    job=seed(world,participation)
    with connect() as connection:
        connection.execute("INSERT INTO business_memberships(id,business_id,user_id,membership_role,status) VALUES(%s,%s,%s,'owner','active')",(str(uuid4()),world.yid,world.xuser))
        connection.execute("UPDATE business_memberships SET status='inactive' WHERE user_id=%s AND business_id=%s",(world.xuser,world.xid))
    before=stored(job);domains=witnesses()
    # Global business workspace access still succeeds; only target authority was revoked.
    actor=success(world.x.get("/api/v1/auth/me"))
    assert any(m["businessId"] == world.yid and m["status"] == "active" and m["role"] == "owner" for m in actor["businessMemberships"])
    problem(world.x.get(path(job)),404,"not_found")
    problem(request(world.x,"POST",path(job)+"/cancel"),404,"not_found")
    assert stored(job) == before and witnesses() == domains


@pytest.mark.parametrize("state",["pending","running"])
def test_concurrent_cancel_returns_one_canonical_terminal_and_one_success_audit(world,participation,state):
    job=seed(world,participation,state)
    before=witnesses()
    with connect() as connection: audit_before={r[0] for r in connection.execute("SELECT id FROM audit_events")}
    responses=concurrent(world,world.x,[("POST",path(job)+"/cancel",{}),("POST",path(job)+"/cancel",{})])
    first,second=[success(r) for r in responses]
    assert first == second and first["state"] == "cancelled" and first["draft"] is None
    assert success(world.x.get(path(job))) == first
    with connect() as connection:
        audits=[r[0] for r in connection.execute("SELECT to_jsonb(a) FROM audit_events a WHERE resource_id=%s AND outcome='success'",(job,)) if UUID(r[0]["id"]) not in audit_before]
        assert len(audits) == 1 and audits[0]["user_id"] == world.xuser
        assert connection.execute("SELECT count(*) FROM ai_provider_attempts WHERE job_id=%s",(job,)).fetchone()[0] == 0
    assert witnesses() == before


@pytest.mark.parametrize("state,dispatched",[("pending",False),("running",False),("running",True),("cancelled",True),("failed",False)])
def test_cancel_is_terminal_idempotent_audited_and_preserves_manual_data(world,participation,state,dispatched):
    now=datetime.now(timezone.utc)
    job=seed(world,participation,state,dispatch_at=now if dispatched else None,provider_may_have_run=dispatched)
    before=witnesses()
    with connect() as connection: audit_before={r[0] for r in connection.execute("SELECT id FROM audit_events")}
    value=success(request(world.x,"POST",path(job)+"/cancel"))
    assert value["state"] == ("cancelled" if state in {"pending","running"} else state)
    assert value["providerMayHaveRun"] is dispatched and value["draft"] is None
    assert success(request(world.x,"POST",path(job)+"/cancel")) == value
    assert witnesses() == before
    with connect() as connection:
        audits=[r[0] for r in connection.execute("SELECT to_jsonb(a) FROM audit_events a") if UUID(r[0]["id"]) not in audit_before]
        assert len(audits) == (1 if state in {"pending","running"} else 0)
        if audits:
            assert audits[0]["user_id"] == world.xuser and audits[0]["resource_id"] == job and audits[0]["outcome"] == "success"
            assert "PRIVATE-JOB" not in str(audits)
        assert connection.execute("SELECT count(*) FROM ai_provider_attempts WHERE job_id=%s",(job,)).fetchone()[0] == 0


def test_cancel_origin_malformed_id_and_audit_failure_preserve_job(world,participation):
    job=seed(world,participation)
    before=stored(job)
    for headers in [{},{"Origin":"https://untrusted.example.test"}]:
        problem(world.x.post(path(job)+"/cancel",headers=headers),403,"forbidden")
    problem(world.x.get(path("not-a-uuid")),422,"validation_error")
    with reject_writes("audit_events"):
        failed=request(world.x,"POST",path(job)+"/cancel")
        assert failed.status_code in {500,503}
        assert failed.headers.get("cache-control") == "no-store"
    assert stored(job) == before


def test_mismatched_stored_participation_event_or_owner_cannot_authorize(world,participation):
    for overrides in [{"event_id":world.b},{"owner_id":world.yuser}]:
        job=seed(world,participation,**overrides)
        actor=world.y if "owner_id" in overrides else world.x
        before=stored(job)
        problem(actor.get(path(job)),404,"not_found")
        problem(request(actor,"POST",path(job)+"/cancel"),404,"not_found")
        assert stored(job) == before


def test_analysis_worker_does_not_claim_or_fail_business_pending_job(world,participation):
    job=seed(world,participation)
    before=stored(job)
    from app.ai import worker
    assert worker._claim() is None
    assert stored(job) == before


def test_recovery_and_inclusive_cleanup_preserve_domain_records(world,participation):
    now=datetime.now(timezone.utc)
    pending=seed(world,participation)
    running=seed(world,participation,"running",lease_until=now-timedelta(seconds=1),provider_may_have_run=True,dispatch_at=now-timedelta(seconds=10))
    expired=seed(world,participation,"failed",created_at=now-timedelta(days=30))
    retained=seed(world,participation,"cancelled",created_at=now-timedelta(days=30)+timedelta(microseconds=1))
    before=witnesses()
    from app.ai import service
    from app.database import SessionLocal
    with SessionLocal.begin() as db:
        service.recovery(db,now=now)
        service.cleanup(db,now=now)
    assert stored(pending)["state"] == "pending"
    assert stored(running)["state"] == "failed" and stored(running)["failure_code"] == "worker_interrupted"
    assert stored(running)["provider_may_have_run"] is True
    assert stored(expired) is None and stored(retained) is not None
    problem(world.x.get(path(expired)),404,"not_found")
    assert witnesses() == before
    with connect() as connection: assert connection.execute("SELECT count(*) FROM ai_provider_attempts").fetchone()[0] == 0


@pytest.mark.parametrize("contenders",[1,2])
def test_common_dispatch_gate_counts_business_attempts_for_analysis(world,participation,monkeypatch,contenders):
    # Existing analysis dispatch seam records attempts but never sends provider HTTP.
    monkeypatch.setenv("AI_ENABLED","true");monkeypatch.setenv("AI_SYNTHETIC_ONLY","true")
    monkeypatch.setenv("AI_SYNTHETIC_EVENT_IDS",f'["{world.a}"]')
    monkeypatch.setenv("SOCLAAS_API_KEY","synthetic-not-a-real-key");monkeypatch.setenv("SOCLAAS_MODEL","synthetic-model")
    monkeypatch.setenv("SOCLAAS_REQUESTS_PER_MINUTE","30")
    source=submit(world,participation)
    analyses=[seed(world,source,"running",workflow="analysis",business_participation_id=None,owner_id=world.oa_id,application_id=source["id"],source_revision=source["frozenSubmittedContentRevision"],rubric_revision=1) for _ in range(contenders)]
    business_job=seed(world,participation,"running")
    with connect() as connection:
        for _ in range(29): connection.execute("INSERT INTO ai_provider_attempts(id,job_id,attempted_at) VALUES(%s,%s,%s)",(str(uuid4()),business_job,datetime.now(timezone.utc)))
    from app.ai import worker
    with ThreadPoolExecutor(max_workers=contenders) as pool:
        results=list(pool.map(lambda job:worker._dispatch(UUID(job)),analyses))
    assert sum(results) == 1
    winner=analyses[results.index(True)]
    assert worker._dispatch(UUID(winner)) is False
    assert stored(winner)["failure_code"] == "provider_rate_limited"
    with connect() as connection: assert connection.execute("SELECT count(*) FROM ai_provider_attempts").fetchone()[0] == 30


def test_workflow_schema_rejects_unknown_and_mixed_or_incomplete_context(world,participation):
    for overrides in [{"workflow":"unknown"},{"workflow":"analysis"},{"application_id":str(uuid4())},{"source_revision":1},{"rubric_revision":1}]:
        with pytest.raises((psycopg.errors.CheckViolation,psycopg.errors.ForeignKeyViolation)):
            seed(world,participation,**overrides)


def test_cancel_preserves_populated_setup_decision_and_preparation(world,participation):
    frozen=submit(world,participation)
    success(request(world.oa,"POST",f"/api/v1/organiser/events/{world.a}/applications/{participation['id']}/decision",json={"expectedRevision":frozen["revision"],"outcome":"accepted","reason":None}))
    success(request(world.oa,"PUT",f"/api/v1/organiser/events/{world.a}/participations/{participation['participationId']}/setup",json={"expectedRevision":1,"boothLabel":"PRIVATE-JOB-BOOTH","setupInstructions":"PRIVATE-JOB-SETUP"}))
    job=seed(world,participation)
    before=witnesses()
    assert success(request(world.x,"POST",path(job)+"/cancel"))["state"] == "cancelled"
    assert witnesses() == before


@pytest.mark.parametrize("method",["GET","POST"])
@pytest.mark.parametrize("role,target",[("organiser","existing"),("organiser","missing"),("business","missing")])
def test_mandatory_password_precedes_shared_job_lookup_for_both_roles(world,participation,method,role,target):
    if role == "organiser":
        frozen=submit(world,participation)
        job=seed(world,frozen,workflow="analysis",business_participation_id=None,owner_id=world.oa_id,
            application_id=frozen["id"],source_revision=frozen["frozenSubmittedContentRevision"],rubric_revision=1)
        actor,user=world.oa,world.oa_id
    else:
        job=seed(world,participation)
        actor,user=world.x,world.xuser
    before=stored(job);domains=witnesses()
    with connect() as connection:
        connection.execute("UPDATE password_credentials SET must_change_password=true WHERE user_id=%s",(user,))
    requested=job if target == "existing" else str(uuid4())
    problem(request(actor,method,path(requested)+("/cancel" if method == "POST" else "")),403,"password_change_required")
    assert stored(job) == before and witnesses() == domains


def test_legacy_analysis_insert_without_workflow_defaults_to_analysis(world,participation):
    frozen=submit(world,participation)
    job=str(uuid4());now=datetime.now(timezone.utc)
    with connect() as connection:
        connection.execute("INSERT INTO ai_jobs(id,owner_id,event_id,application_id,request_id,source_revision,rubric_revision,comparison_revisions,state,failure_code,provider_may_have_run,created_at,updated_at,deadline_at) VALUES(%s,%s,%s,%s,%s,%s,1,%s,'pending',NULL,false,%s,%s,%s)",
            (job,world.oa_id,world.a,frozen["id"],str(uuid4()),frozen["frozenSubmittedContentRevision"],Jsonb([]),now,now,now+timedelta(seconds=180)))
    assert stored(job)["workflow"] == "analysis" and stored(job)["business_participation_id"] is None
    value=success(world.oa.get(path(job)))
    assert set(value) == {"id","eventId","applicationId","state","createdAt","updatedAt","completedAt","failureCode","providerMayHaveRun","report"}
    assert value["applicationId"] == frozen["id"] and value["report"] is None
