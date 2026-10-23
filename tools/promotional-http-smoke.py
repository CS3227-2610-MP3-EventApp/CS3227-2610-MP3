"""Fresh synthetic HTTP/live-provider/restart evidence; never print credentials or content."""
import contextlib
import io
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import time
from unittest.mock import patch
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT / "backend")
sys.path.insert(0, str(ROOT / "backend"))
os.environ["DATABASE_URL"] = "postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp"
event_id = str(uuid4())
os.environ.update(AI_ENABLED="true", AI_SYNTHETIC_ONLY="true", AI_REAL_DATA_ENABLED="false", AI_SYNTHETIC_EVENT_IDS=json.dumps([event_id]))
import httpx
from sqlalchemy import inspect, text
from app.database import engine

with engine.connect() as db:
    tables = list(db.execute(text("select tablename from pg_tables where schemaname='public' and tablename <> 'alembic_version'")).scalars())
    columns = {t: [c["name"] for c in inspect(db).get_columns(t)] for t in tables}
    def fingerprints(conn):
        return {t: conn.execute(text('SELECT md5(COALESCE(string_agg(row_to_json(t)::text, :empty ORDER BY row_to_json(t)::text), :empty)) FROM (SELECT ' + ','.join('"'+c+'"' for c in columns[t]) + ' FROM "'+t+'") t'), {"empty":""}).scalar() for t in tables}
    before = fingerprints(db)
    assert db.execute(text("select count(*) from ai_jobs where state in ('pending','running')")).scalar() == 0, "Unrelated active work; refusing dispatch"
subprocess.run([sys.executable,"-m","alembic","upgrade","head"],check=True,capture_output=True)
with engine.connect() as db:
    assert fingerprints(db)==before, "Migration changed retained rows"
print("PASS additive migration preserved retained-row fingerprints",flush=True)

from app.auth import bootstrap
password=secrets.token_urlsafe(24)
orgname="promoorg"+uuid4().hex[:12]
bizname="promobiz"+uuid4().hex[:12]
for args in [["event","--id",event_id,"--title","Invented craft fair","--timezone","Asia/Singapore","--starts-at","2027-01-01T09:00:00+08:00","--ends-at","2027-01-01T18:00:00+08:00"],["organiser","--username",orgname,"--email",orgname+"@example.test","--display-name","Invented organiser","--event-id",event_id]]:
    with patch.object(sys,"argv",["bootstrap"]+args),patch("getpass.getpass",return_value=password),contextlib.redirect_stdout(io.StringIO()):
        assert bootstrap.main()==0
with socket.socket() as probe:
    probe.bind(("127.0.0.1",0));port=probe.getsockname()[1]
base=f"http://127.0.0.1:{port}"
server=None
def start():
    global server
    server=subprocess.Popen([sys.executable,"-m","uvicorn","app.main:app","--host","127.0.0.1","--port",str(port)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    for _ in range(100):
        assert server.poll() is None,"Owned server did not start"
        try:
            if httpx.get(base+"/api/v1/health/ready",timeout=1).status_code==200:return
        except httpx.HTTPError:pass
        time.sleep(.1)
    raise RuntimeError("Readiness timed out")
def stop():
    global server
    if server:
        server.terminate();server.wait(timeout=10);server=None
def call(client,method,path,body=None,status=200):
    response=client.request(method,base+"/api/v1"+path,json=body)
    assert response.status_code==status,(method,path,response.status_code)
    assert response.headers.get("cache-control")=="no-store"
    return response.json() if status!=204 else None
try:
    start()
    with httpx.Client(headers={"Origin":"http://localhost:5173"}) as org,httpx.Client(headers={"Origin":"http://localhost:5173"}) as biz:
        call(org,"POST","/auth/login",{"identifier":orgname,"password":password,"role":"organiser"})
        call(org,"POST","/auth/change-password",{"currentPassword":password,"newPassword":secrets.token_urlsafe(24)})
        call(biz,"POST","/auth/register/business",{"username":bizname,"email":bizname+"@example.test","displayName":"Invented owner","businessName":"Invented "+bizname,"password":secrets.token_urlsafe(24)},201)
        actor=call(biz,"GET","/auth/me");business_id=actor["businessMemberships"][0]["businessId"]
        call(org,"PUT",f"/organiser/events/{event_id}/application-settings",{"expectedRevision":1,"applicationsOpen":True})
        application=call(biz,"POST","/business/applications",{"businessId":business_id,"eventId":event_id,"participantType":"exhibitor","description":"Invented display","requestedSpace":"Invented table","contactName":"Invented contact","contactEmail":"invented@example.test"},201)
        pid=application["participationId"];collection=f"/business/participations/{pid}/promotional-concepts"
        request={"requestId":str(uuid4()),"expectedEventRevision":1,"expectedSetupRevision":None,"brief":"Invented demonstration. Suggest poster copy, a sticker freebie concept and a layout brief. Keep all prose creative and unverified; no external actions.","factFields":["event.title"],"dataSharingConfirmed":True}
        job=call(biz,"POST",collection,request,202)
        # A separate worker process performs the real configured-provider request.
        result=subprocess.run([sys.executable,"-m","app.ai.worker","--once"],capture_output=True,timeout=185)
        assert result.returncode==0,"Worker failed"
        job=call(biz,"GET",f"/ai/jobs/{job['id']}")
        assert job["state"]=="completed",("Real provider generation did not complete",job["failureCode"])
        concept=job["concept"];assert concept["posterCopySuggestions"] and concept["freebieConcepts"] and concept["layoutBrief"]
        assert concept["sourceFacts"][0]["value"]=="Invented craft fair"
        path=f"/business/promotional-concepts/{concept['id']}"
        edited=call(biz,"PUT",path,{"expectedRevision":concept["revision"],"posterCopySuggestions":["Invented manually reviewed concept"],"freebieConcepts":concept["freebieConcepts"],"layoutBrief":concept["layoutBrief"]})
        assert edited["revision"]==2
        call(biz,"PUT",path,{"expectedRevision":1,"posterCopySuggestions":edited["posterCopySuggestions"],"freebieConcepts":edited["freebieConcepts"],"layoutBrief":edited["layoutBrief"]},409)
        denied=org.get(base+"/api/v1"+path);assert denied.status_code in (403,404)
        stop();start()
        assert call(biz,"GET",path)==edited
        assert call(biz,"GET",collection)["items"][0]==edited
        assert call(biz,"GET",f"/ai/jobs/{job['id']}")["concept"]==edited
        call(biz,"DELETE",path+"?expectedRevision=2",status=204)
        assert call(biz,"GET",f"/ai/jobs/{job['id']}")["concept"] is None
        assert call(biz,"GET",collection)["total"]==0
        with engine.connect() as db:
            audits=db.execute(text("SELECT action,resource_revision,outcome FROM audit_events WHERE resource_id=:id"),{"id":concept["id"]}).all()
        assert ("promotional_concept_create",1,"success") in audits
        assert ("promotional_concept_edit",2,"success") in audits
        assert ("promotional_concept_delete",2,"success") in audits
        assert any(revision==1 and outcome=="conflict" for _,revision,outcome in audits)
        print("PASS fresh unaccepted participation -> real SoCLaaS -> edit -> API/worker restart persistence -> delete/no resurrection",flush=True)
        print("PASS attributable exact-resource/revision success and stale-write conflict audit records",flush=True)
finally:
    stop()
