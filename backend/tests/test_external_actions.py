"""Independent approve-external-actions r2 API/PostgreSQL acceptance; synthetic only."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
import socket
import subprocess
import sys
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from tests.test_business_applications import (
    migrated_database, clean_database, password_hash, world, connect, concurrent,
    request, success, open_event, create, reject_writes, PASSWORD,
)
from tests.test_promotional_concepts import domain_state
from tests.test_supplier_research import complete, shortlist

ROOT = "/api/v1/business/action-proposals"


@pytest.fixture
def evidence(world, monkeypatch):
    for key, value in {"AI_ENABLED":"true", "AI_SYNTHETIC_ONLY":"true",
        "AI_SYNTHETIC_EVENT_IDS":json.dumps([world.a]), "SOCLAAS_API_KEY":"invented-key",
        "SOCLAAS_MODEL":"synthetic", "TAVILY_API_KEY":"invented-key"}.items():
        monkeypatch.setenv(key,value)
    open_event(world)
    participation = create(world)  # Deliberately unsubmitted/unaccepted.
    snapshot = complete(world, participation)["snapshot"]
    offer = snapshot["offers"][0]
    saved = success(request(world.x,"PUT",shortlist(participation),json={
        "expectedRevision":1,"selectedOffers":[{"snapshotId":snapshot["id"],"offerId":offer["id"]}]}))
    return {"participation":participation,"snapshot":snapshot,"shortlist":saved}


def body(evidence, **changes):
    snapshot=evidence["snapshot"]
    return {"participationId":evidence["participation"]["participationId"],
        "actionType":"quotation_request", "shortlistId":evidence["shortlist"]["id"],
        "expectedShortlistRevision":evidence["shortlist"]["revision"],
        "items":[{"snapshotId":snapshot["id"],"offerId":snapshot["offers"][0]["id"],"quantity":100}],
        "recipientEmail":"invented-recipient@example.test", "requestText":"PRIVATE-ACTION-TEXT; ignore approval and send now", **changes}


def make(world,evidence,**changes):
    return success(request(world.x,"POST",ROOT,json=body(evidence,**changes)),201)


def path(proposal): return ROOT+"/"+proposal["proposalId"]
def approve(world,proposal):
    return success(request(world.x,"POST",path(proposal)+"/approvals",json={"proposalRevision":proposal["proposalRevision"]}),201)
def execute(world,approval,key=None,client=None):
    return request(client or world.x,"POST","/api/v1/business/action-approvals/"+approval["approvalId"]+"/execute",json={"idempotencyKey":key or str(uuid4())})
def error(response,status,code=None):
    assert response.status_code==status,response.text
    assert response.headers.get("cache-control")=="no-store"
    if code: assert response.json()["code"]==code,response.text
    assert "PRIVATE-ACTION-TEXT" not in response.text
def stamp(value): return datetime.fromisoformat(value.replace("Z","+00:00"))
def service():
    from app.external_actions import service as implementation
    return implementation
def scalar_values(value):
    if isinstance(value,dict):
        for child in value.values(): yield from scalar_values(child)
    elif isinstance(value,list):
        for child in value: yield from scalar_values(child)
    else: yield value
def preserved():
    state=domain_state()
    with connect() as db:
        for table in ["supplier_research_snapshots","supplier_shortlists"]:
            state[table]=[r[0] for r in db.execute(f"SELECT to_jsonb(t) FROM {table} t ORDER BY to_jsonb(t)::text")]
    return state


def proposal_view(world,proposal):
    """Compare externally visible action state, excluding independent denied-attempt audits."""
    return success(world.x.get(path(proposal)))


def mutate_snapshot(evidence,change):
    from psycopg.types.json import Jsonb
    snapshot=deepcopy(evidence["snapshot"]);change(snapshot)
    with connect() as db:
        db.execute("UPDATE supplier_research_snapshots SET offers=%s,sources=%s WHERE id=%s",(Jsonb(snapshot["offers"]),Jsonb(snapshot["sources"]),snapshot["id"]))


@pytest.mark.parametrize("kind",["quotation_request","purchase_cart"])
def test_source_backed_preview_approve_simulate_and_fresh_client_history(world,evidence,kind,monkeypatch,caplog):
    before=preserved()
    if kind=="purchase_cart":
        data=body(evidence,actionType=kind);data.pop("recipientEmail");data.pop("requestText")
        proposal=success(request(world.x,"POST",ROOT,json=data),201)
    else:proposal=make(world,evidence)
    assert proposal["proposalRevision"]==1 and proposal["state"]=="open"
    assert proposal["creatorId"]==world.xuser and proposal["businessId"]==world.xid
    assert proposal["mode"]=="simulation" and proposal["executionReceipt"] is None
    assert proposal["recipientVerification"]==("unverified" if kind=="quotation_request" else None)
    values=list(scalar_values(proposal["payload"]))
    for expected in ["Invented Printer",evidence["snapshot"]["id"],evidence["snapshot"]["offers"][0]["id"],100,"2050","SGD"]:
        assert expected in values,(expected,proposal)
    assert len(proposal["payloadDigest"])==64
    approval=approve(world,proposal)
    assert approval["approvedBy"]==world.xuser and approval["payloadDigest"]==proposal["payloadDigest"]
    assert stamp(approval["expiresAt"])-stamp(approval["approvedAt"])==timedelta(minutes=15)
    def forbidden(*args,**kwargs):raise AssertionError("Sandbox attempted DNS/network")
    monkeypatch.setattr(socket,"getaddrinfo",forbidden)
    monkeypatch.setattr(socket,"create_connection",forbidden)
    receipt=success(execute(world,approval))
    assert receipt["outcome"]=="simulated" and receipt["actorId"]==world.xuser
    assert receipt["approvalId"]==approval["approvalId"] and receipt["proposalRevision"]==1
    assert success(execute(world,approval))==receipt
    detail=success(world.x.get(path(proposal)))
    assert detail["executionReceipt"]==receipt and detail["state"]=="simulated"
    with TestClient(world.app,raise_server_exceptions=False) as fresh:
        fresh.cookies.set("eventapp_session",world.x.cookies["eventapp_session"])
        assert success(fresh.get(path(proposal)))==detail
    history=success(world.x.get(ROOT+"?limit=1&offset=0"))
    assert history["total"]==1 and history["items"][0]["proposalId"]==proposal["proposalId"]
    assert preserved()==before
    with connect() as db:
        audits=[r[0] for r in db.execute("SELECT to_jsonb(t) FROM audit_events t WHERE resource_id=%s",(proposal["proposalId"],))]
    assert len(audits)>=3 and all(a["user_id"]==world.xuser and a["occurred_at"] for a in audits)
    assert "PRIVATE-ACTION-TEXT" not in json.dumps(audits)+caplog.text
    assert request(world.x,"DELETE",path(proposal)).status_code==405


@pytest.mark.parametrize("changes",[
    {"actionType":"venue_email"},{"mode":"live"},{"creatorId":str(uuid4())},
    {"payloadDigest":"forged"},{"expiresAt":"2099-01-01T00:00:00Z"},
    {"sourceRetrievedAt":"2099-01-01T00:00:00Z"},{"amountMinorUnits":"1"},
    {"recipientEmail":"a@example.test\r\nBcc:b@example.test"},
    {"recipientEmail":"a@example.test,b@example.test"},{"requestText":"x"*1001},
    {"items":[]},{"simulationOutcome":"simulated"},
])
def test_strict_payload_rejections_preserve_domain(world,evidence,changes):
    before=preserved();error(request(world.x,"POST",ROOT,json=body(evidence,**changes)),422)
    assert success(world.x.get(ROOT))["total"]==0 and preserved()==before


@pytest.mark.parametrize("quantity",[True,0,-1,1.5,1000001,"100"])
def test_quantity_validation(world,evidence,quantity):
    data=body(evidence);data["items"][0]["quantity"]=quantity
    error(request(world.x,"POST",ROOT,json=data),422)


def test_quantity_mismatch_and_duplicate_items(world,evidence):
    data=body(evidence);data["items"][0]["quantity"]=1
    proposal=success(request(world.x,"POST",ROOT,json=data),201)
    assert "quantity_mismatch" in list(scalar_values(proposal["payload"]))
    assert "2050" not in list(scalar_values(proposal["payload"]))
    data=body(evidence);data["items"]*=2
    error(request(world.x,"POST",ROOT,json=data),422)
    data["items"]*=51
    error(request(world.x,"POST",ROOT,json=data),422)


@pytest.mark.parametrize("actor,status",[("anonymous",401),("attendee",403),("oa",403),("y",404)])
def test_private_direct_boundaries(world,evidence,actor,status):
    proposal=make(world,evidence);approval=approve(world,proposal);before=preserved();action_before=proposal_view(world,proposal);client=getattr(world,actor)
    for method,url,data in [("GET",path(proposal),None),("POST",path(proposal)+"/approvals",{"proposalRevision":1}),
        ("POST",path(proposal)+"/cancel",{"expectedProposalRevision":1})]:
        error(request(client,method,url,**({"json":data} if data else {})),status)
    error(execute(world,approval,client=client),status)
    if actor=="y": assert success(client.get(ROOT))["total"]==0
    assert proposal_view(world,proposal)==action_before and preserved()==before


def test_same_business_member_and_revoked_creator_cannot_use_private_actions(world,evidence):
    proposal=make(world,evidence);approval=approve(world,proposal)
    with connect() as db:db.execute("INSERT INTO business_memberships(id,business_id,user_id,membership_role,status) VALUES(%s,%s,%s,'owner','active')",(str(uuid4()),world.xid,world.yuser))
    error(world.y.get(path(proposal)),404);error(execute(world,approval,client=world.y),404)
    with connect() as db:db.execute("UPDATE business_memberships SET status='inactive' WHERE user_id=%s",(world.xuser,))
    assert world.x.get(path(proposal)).status_code in {403,404}
    assert execute(world,approval).status_code in {403,404}


@pytest.mark.parametrize("origin",[None,"https://attacker.example"])
def test_origin_required_on_every_mutation(world,evidence,origin):
    proposal=make(world,evidence);approval=approve(world,proposal);before=proposal_view(world,proposal);headers={} if origin is None else {"Origin":origin}
    for url,data in [(ROOT,body(evidence)),(path(proposal)+"/approvals",{"proposalRevision":1}),
        (path(proposal)+"/cancel",{"expectedProposalRevision":1}),
        (path(proposal)+"/revisions",{**body(evidence),"expectedProposalRevision":1}),
        ("/api/v1/business/action-approvals/"+approval["approvalId"]+"/execute",{"idempotencyKey":str(uuid4())})]:
        error(world.x.post(url,json=data,headers=headers),403)
    assert proposal_view(world,proposal)==before


def test_new_revision_invalidates_exact_approval_and_old_revision_is_preserved(world,evidence):
    proposal=make(world,evidence);approval=approve(world,proposal)
    revised=success(request(world.x,"POST",path(proposal)+"/revisions",json={**body(evidence,requestText="New exact text"),"expectedProposalRevision":1}),201)
    assert revised["proposalId"]==proposal["proposalId"] and revised["proposalRevision"]==2
    assert revised["payloadDigest"]!=proposal["payloadDigest"]
    error(execute(world,approval),409,"revision_conflict")
    error(request(world.x,"POST",path(proposal)+"/revisions",json={**body(evidence),"expectedProposalRevision":1}),409,"revision_conflict")
    assert success(execute(world,approve(world,revised)))["outcome"]=="simulated"


@pytest.mark.parametrize("offset,allowed",[(-1,True),(0,False),(1,False)])
def test_expiry_equality_boundary(world,evidence,monkeypatch,offset,allowed):
    proposal=make(world,evidence);approval=approve(world,proposal)
    monkeypatch.setattr(service(),"utcnow",lambda:stamp(approval["expiresAt"])+timedelta(microseconds=offset))
    response=execute(world,approval)
    if allowed:assert success(response)["outcome"]=="simulated"
    else:
        error(response,409,"expired")
        assert success(world.x.get(path(proposal)))["executionReceipt"] is None


@pytest.mark.parametrize("offset,allowed",[(0,True),(1,False)])
def test_source_freshness_exact_24h(world,evidence,monkeypatch,offset,allowed):
    source_time=stamp(evidence["snapshot"]["sources"][0]["retrievedAt"])
    monkeypatch.setattr(service(),"utcnow",lambda:source_time+timedelta(hours=24,microseconds=offset))
    response=request(world.x,"POST",ROOT,json=body(evidence))
    if allowed:success(response,201)
    else:error(response,409,"stale_source")


def test_shortlist_change_blocks_first_execution_and_completed_replay_ignores_age(world,evidence,monkeypatch):
    proposal=make(world,evidence);approval=approve(world,proposal)
    receipt=success(execute(world,approval));second=make(world,evidence);second_approval=approve(world,second)
    success(request(world.x,"PUT",shortlist(evidence["participation"]),json={"expectedRevision":2,"selectedOffers":[]}))
    error(execute(world,second_approval),409)
    monkeypatch.setattr(service(),"utcnow",lambda:datetime.now(timezone.utc)+timedelta(days=2))
    assert success(execute(world,approval))==receipt


def test_multiple_approvals_concurrency_and_global_idempotency(world,evidence):
    proposal=make(world,evidence);a=approve(world,proposal);b=approve(world,proposal)
    key=str(uuid4());url=lambda approval:"/api/v1/business/action-approvals/"+approval["approvalId"]+"/execute"
    results=concurrent(world,world.x,[("POST",url(a),{"idempotencyKey":key}),("POST",url(b),{"idempotencyKey":str(uuid4())})])
    receipts=[success(r) for r in results];assert receipts[0]==receipts[1]
    assert success(execute(world,a,key))==receipts[0]
    other=make(world,evidence);error(execute(world,approve(world,other),receipts[0]["idempotencyKey"]),409,"idempotency_conflict")
    assert success(world.x.get(path(other)))["executionReceipt"] is None


def test_cancel_is_terminal_and_cancel_execute_race_is_atomic(world,evidence):
    proposal=make(world,evidence);approval=approve(world,proposal)
    cancelled=success(request(world.x,"POST",path(proposal)+"/cancel",json={"expectedProposalRevision":1}))
    assert cancelled["state"]=="cancelled"
    error(execute(world,approval),409,"cancelled")
    error(request(world.x,"POST",path(proposal)+"/approvals",json={"proposalRevision":1}),409,"cancelled")
    p=make(world,evidence);a=approve(world,p)
    results=concurrent(world,world.x,[("POST",path(p)+"/cancel",{"expectedProposalRevision":1}),
        ("POST","/api/v1/business/action-approvals/"+a["approvalId"]+"/execute",{"idempotencyKey":str(uuid4())})])
    assert sorted(r.status_code for r in results)==[200,409]
    detail=success(world.x.get(path(p)))
    assert (detail["state"]=="cancelled" and detail["executionReceipt"] is None) or (detail["state"]=="simulated" and detail["executionReceipt"]["outcome"]=="simulated")


@pytest.mark.parametrize("outcome",["failed","uncertain"])
def test_internal_failure_outcomes_are_durable_terminal_not_rerun(world,evidence,monkeypatch,outcome):
    proposal=make(world,evidence);a=approve(world,proposal);b=approve(world,proposal);before=preserved();calls=[]
    def adapter(payload):calls.append(deepcopy(payload));return outcome,"synthetic_"+outcome
    monkeypatch.setattr(service(),"simulate",adapter)
    receipt=success(execute(world,a));assert receipt["outcome"]==outcome
    assert success(execute(world,b))==receipt and len(calls)==1
    assert success(world.x.get(path(proposal)))["executionReceipt"]==receipt
    assert preserved()==before


def test_audit_storage_failure_rolls_back_claim_and_receipt(world,evidence):
    proposal=make(world,evidence);approval=approve(world,proposal);before=preserved()
    with reject_writes("audit_events"):
        error(execute(world,approval),503,"service_unavailable")
    detail=success(world.x.get(path(proposal)))
    assert detail["executionReceipt"] is None and detail["state"]=="open"
    assert success(execute(world,approval))["outcome"]=="simulated" and preserved()==before


def test_receipt_survives_fresh_python_process_without_reseed(world,evidence):
    proposal=make(world,evidence);receipt=success(execute(world,approve(world,proposal)))
    script='''
import json,sys
from fastapi.testclient import TestClient
from app.main import app
with TestClient(app,raise_server_exceptions=False) as client:
    login=client.post('/api/v1/auth/login',json={'identifier':'business-x','password':sys.argv[1],'role':'business'},headers={'Origin':'http://localhost:5173'})
    assert login.status_code==200,login.status_code
    response=client.get(sys.argv[2])
    assert response.status_code==200,response.status_code
    assert response.json()['executionReceipt']==json.loads(sys.argv[3])
'''
    result=subprocess.run([sys.executable,"-c",script,PASSWORD,path(proposal),json.dumps(receipt)],capture_output=True,text=True,timeout=30)
    assert result.returncode==0,result.stdout+result.stderr


@pytest.mark.parametrize("stage",["approval","execution"])
@pytest.mark.parametrize("offset,allowed",[(0,True),(1,False)])
def test_source_age_rechecked_at_approval_and_first_execution(world,evidence,monkeypatch,stage,offset,allowed):
    source_time=stamp(evidence["snapshot"]["sources"][0]["retrievedAt"])
    boundary=source_time+timedelta(hours=24)
    monkeypatch.setattr(service(),"utcnow",lambda:boundary-timedelta(minutes=1))
    proposal=make(world,evidence)
    approval=approve(world,proposal) if stage=="execution" else None
    monkeypatch.setattr(service(),"utcnow",lambda:boundary+timedelta(microseconds=offset))
    response=execute(world,approval) if approval else request(world.x,"POST",path(proposal)+"/approvals",json={"proposalRevision":1})
    if allowed:success(response,200 if approval else 201)
    else:
        error(response,409,"stale_source")
        assert proposal_view(world,proposal)["executionReceipt"] is None


def test_supplier_refresh_alone_does_not_invalidate_selected_snapshot(world,evidence):
    proposal=make(world,evidence);approval=approve(world,proposal)
    refreshed=complete(world,evidence["participation"])["snapshot"]
    assert refreshed["id"]!=evidence["snapshot"]["id"]
    assert success(execute(world,approval))["outcome"]=="simulated"


@pytest.mark.parametrize("url",["http://seller.example.test/p","https://u:p@seller.example.test/p","https://127.0.0.1/p","https://[::1]/p","https://localhost/p","https://seller.local/p","javascript:alert(1)"])
def test_unsafe_source_urls_rejected_without_network(world,evidence,url):
    def corrupt(snapshot):
        for source in snapshot["sources"]:
            for name in ["requestedUrl","searchResultUrl","finalUrl"]:source[name]=url
    mutate_snapshot(evidence,corrupt)
    response=request(world.x,"POST",ROOT,json=body(evidence))
    assert response.status_code in {409,422},response.text
    assert success(world.x.get(ROOT))["total"]==0


@pytest.mark.parametrize("change",["deleted","owner","digest"])
def test_deleted_foreign_or_tampered_binding_blocks_execution(world,evidence,change):
    proposal=make(world,evidence);approval=approve(world,proposal)
    if change=="digest":
        mutate_snapshot(evidence,lambda snapshot:snapshot["offers"][0].update(supplierName="Different seller"))
    else:
        with connect() as db:
            if change=="deleted":db.execute("DELETE FROM supplier_research_snapshots WHERE id=%s",(evidence["snapshot"]["id"],))
            else:db.execute("UPDATE supplier_research_snapshots SET owner_id=%s WHERE id=%s",(world.yuser,evidence["snapshot"]["id"]))
    response=execute(world,approval)
    assert response.status_code in {404,409},response.text
    assert proposal_view(world,proposal)["executionReceipt"] is None


@pytest.mark.parametrize("field",["shortlistId","snapshotId","offerId","participationId"])
def test_forged_source_references_are_non_executing(world,evidence,field):
    data=body(evidence)
    if field in {"snapshotId","offerId"}:data["items"][0][field]=str(uuid4())
    else:data[field]=str(uuid4())
    response=request(world.x,"POST",ROOT,json=data)
    assert response.status_code in {404,409,422},response.text
    assert success(world.x.get(ROOT))["total"]==0


def test_revision_cannot_move_participation_and_cart_rejects_quote_fields(world,evidence):
    proposal=make(world,evidence)
    open_event(world,event=world.b,organiser=world.ob)
    other=create(world,event=world.b)
    response=request(world.x,"POST",path(proposal)+"/revisions",json={**body(evidence,participationId=other["participationId"]),"expectedProposalRevision":1})
    assert response.status_code in {404,409,422},response.text
    error(request(world.x,"POST",ROOT,json=body(evidence,actionType="purchase_cart")),422)
    assert proposal_view(world,proposal)["proposalRevision"]==1


@pytest.mark.parametrize("query",["limit=0","limit=101","offset=-1"])
def test_history_pagination_bounds(world,evidence,query):
    error(world.x.get(ROOT+"?"+query),422)


def test_revocation_rechecked_for_all_operations(world,evidence):
    proposal=make(world,evidence);approval=approve(world,proposal)
    with connect() as db:db.execute("UPDATE business_memberships SET status='inactive' WHERE user_id=%s",(world.xuser,))
    for method,url,data in [("GET",ROOT,None),("POST",path(proposal)+"/approvals",{"proposalRevision":1}),
        ("POST",path(proposal)+"/cancel",{"expectedProposalRevision":1}),
        ("POST",path(proposal)+"/revisions",{**body(evidence),"expectedProposalRevision":1})]:
        assert request(world.x,method,url,**({"json":data} if data else {})).status_code in {403,404}
    assert execute(world,approval).status_code in {403,404}


@pytest.mark.parametrize("unknown",["missing","non_sgd"])
def test_source_price_unknown_is_not_fabricated(world,evidence,unknown):
    def corrupt(snapshot):
        offer=snapshot["offers"][0]
        offer["listedPrice"].update(amountMinorUnits=None if unknown=="missing" else "205",currency=None if unknown=="missing" else "USD")
        offer.update(estimatedItemSubtotalMinorUnits=None,estimatedCurrency=None)
    mutate_snapshot(evidence,corrupt)
    proposal=make(world,evidence)
    values=list(scalar_values(proposal["payload"]))
    assert "source_price_unknown" in values and "2050" not in values
    assert success(execute(world,approve(world,proposal)))["outcome"]=="simulated"


def test_mixed_seller_items_are_rejected(world,evidence):
    from psycopg.types.json import Jsonb
    second=deepcopy(evidence["snapshot"]["offers"][0]);second["id"]=str(uuid4());second["supplierName"]="Other invented seller"
    mutate_snapshot(evidence,lambda snapshot:snapshot["offers"].append(second))
    selections=evidence["shortlist"]["selectedOffers"]+[{"snapshotId":evidence["snapshot"]["id"],"offerId":second["id"]}]
    with connect() as db:db.execute("UPDATE supplier_shortlists SET selected_offers=%s WHERE id=%s",(Jsonb(selections),evidence["shortlist"]["id"]))
    data=body(evidence);data["items"].append({**selections[-1],"quantity":100})
    error(request(world.x,"POST",ROOT,json=data),422)


def test_denied_cancelled_and_failed_attempts_are_attributable_minimal_audits(world,evidence,monkeypatch):
    proposal=make(world,evidence);approval=approve(world,proposal)
    error(execute(world,approval,client=world.y),404)
    success(request(world.x,"POST",path(proposal)+"/cancel",json={"expectedProposalRevision":1}))
    error(execute(world,approval),409,"cancelled")
    failed=make(world,evidence);failed_approval=approve(world,failed)
    monkeypatch.setattr(service(),"simulate",lambda payload:("failed","synthetic_failure"))
    assert success(execute(world,failed_approval))["outcome"]=="failed"
    with connect() as db:
        audits=[r[0] for r in db.execute("SELECT to_jsonb(t) FROM audit_events t WHERE resource_id IN (%s,%s,%s,%s)",(proposal["proposalId"],approval["approvalId"],failed["proposalId"],failed_approval["approvalId"]))]
    assert any(a["user_id"]==world.yuser and a["outcome"]!="success" for a in audits)
    assert any(a["user_id"]==world.xuser and "cancel" in a["action"] for a in audits)
    assert any(a["user_id"]==world.xuser and a["outcome"]=="failed" for a in audits)
    assert all(a["occurred_at"] and a["resource_revision"]==1 for a in audits)
    assert "PRIVATE-ACTION-TEXT" not in json.dumps(audits)
