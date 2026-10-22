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
orgname="supplierorg"+uuid4().hex[:12]
bizname="supplierbiz"+uuid4().hex[:12]
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
        pid=application["participationId"];collection=f"/business/participations/{pid}/supplier-research"
        request={"requestId":str(uuid4()),"category":"printing","brief":"Compare Singapore A4 colour flyer printing suppliers. Extract only public product listing prices and explicit delivery constraints. Missing price or fees stay unknown. This is research only; do not contact suppliers or order anything.","quantity":100,"deliveryArea":"Singapore East","neededBy":"2027-01-01","dataSharingConfirmed":True}
        job=call(biz,"POST",collection,request,202)
        diagnostic = """import contextlib,httpx
from app.ai.worker import run_once
from app.supplier_research import service as suppliers
from app.supplier_research.schemas import Extraction
validate=suppliers.validate_extraction
def checked(raw,research):
 try:return validate(raw,research)
 except ValueError:
  try:
   parsed=Extraction.model_validate_json(raw)
   print('EXTRACTION_DIAGNOSTIC schema_valid',flush=True)
   for offer in parsed.offers:
    quote_ok=all(c.evidenceQuote in research['pageById'].get(str(c.sourceId),'') for c in offer.evidenceByField)
    identity_ok=all(any(c.field==field and value.casefold() in c.evidenceQuote.casefold() for c in offer.evidenceByField) for field,value in [('supplierName',offer.supplierName),('productDescription',offer.productDescription)])
    print('EXTRACTION_DIAGNOSTIC quotes_identity_delivery_price',quote_ok,identity_ok,offer.deliveryEstimate is not None,offer.listedPrice.amountMinorUnits is not None,flush=True)
  except Exception as exc:
   if hasattr(exc,'errors'):
    print('EXTRACTION_DIAGNOSTIC schema_errors',[(item['loc'],item['type']) for item in exc.errors(include_input=False)][:10],flush=True)
   else:print('EXTRACTION_DIAGNOSTIC type',type(exc).__name__,flush=True)
  raise
suppliers.validate_extraction=checked
original=httpx.Client.stream
@contextlib.contextmanager
def stream(self,*args,**kwargs):
 try:
  with original(self,*args,**kwargs) as response:
   print('SEARCH_HTTP_STATUS',response.status_code,flush=True)
   yield response
 except Exception as exc:
  print('SEARCH_EXCEPTION_TYPE',type(exc).__name__,flush=True)
  raise
httpx.Client.stream=stream
run_once()
"""
        result=subprocess.run([sys.executable,"-c",diagnostic],capture_output=True,timeout=185)
        for line in result.stdout.decode(errors="replace").splitlines():
            if line.startswith(("SEARCH_HTTP_STATUS ","SEARCH_EXCEPTION_TYPE ","EXTRACTION_DIAGNOSTIC ")):print(line,flush=True)
        for line in result.stderr.decode(errors="replace").splitlines():
            if line.startswith("AI provider attempt failed ("):print(line,flush=True)
        assert result.returncode==0,"Worker failed"
        job=call(biz,"GET",f"/ai/jobs/{job['id']}")
        assert job["state"]=="completed",("Real sourced research did not complete",job["failureCode"])
        snapshot=job["snapshot"];assert snapshot["offers"] and snapshot["sources"]
        assert snapshot["revision"]==1 and all(s["provider"]=="tavily_page_fetch" for s in snapshot["sources"])
        path=f"/business/supplier-research/{snapshot['id']}"
        short=f"/business/participations/{pid}/supplier-shortlist"
        refs=[{"snapshotId":snapshot["id"],"offerId":snapshot["offers"][0]["id"]}]
        saved=call(biz,"PUT",short,{"expectedRevision":1,"selectedOffers":refs})
        assert saved["revision"]==2 and saved["selectedOffers"]==refs
        call(biz,"PUT",short,{"expectedRevision":1,"selectedOffers":[]},409)
        call(biz,"DELETE",path+"?expectedRevision=1",status=409)
        assert org.get(base+"/api/v1"+path).status_code in (403,404)
        stop();start()
        assert call(biz,"GET",path)==snapshot
        assert call(biz,"GET",short)==saved
        assert call(biz,"GET",f"/ai/jobs/{job['id']}")["snapshot"]==snapshot
        cleared=call(biz,"PUT",short,{"expectedRevision":2,"selectedOffers":[]})
        assert cleared["revision"]==3
        call(biz,"DELETE",path+"?expectedRevision=1",status=204)
        assert call(biz,"GET",f"/ai/jobs/{job['id']}")["snapshot"] is None
        assert call(biz,"GET",collection)["total"]==0
        with engine.connect() as db:
            audits=db.execute(text("SELECT action,resource_revision,outcome FROM audit_events WHERE resource_id=:id"),{"id":snapshot["id"]}).all()
        assert audits,"Missing attributable research audit"
        print("PASS fresh unaccepted participation -> real Tavily + checked pages + SoCLaaS -> shortlist -> API/worker restart -> clear/delete/no resurrection",flush=True)
        print("PASS exact snapshot/source provenance, shortlist CAS/in-use protection and attributable audit records",flush=True)

finally:
    stop()
