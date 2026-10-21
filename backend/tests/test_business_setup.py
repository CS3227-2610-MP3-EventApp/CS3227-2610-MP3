"""Independent booth/setup r1 acceptance through HTTP and real PostgreSQL."""
from copy import deepcopy
from datetime import datetime
from uuid import uuid4

import pytest
from psycopg import sql

from tests.test_business_applications import (
    migrated_database, clean_database, password_hash, world,
    connect, concurrent, create, open_event, own_path,
    reject_writes, request, submit, success,
)


def organiser(record, event=None):
    return f"/api/v1/organiser/events/{event or record['eventId']}/participations/{record['participationId']}/setup"


def business(record):
    return f"/api/v1/business/participations/{record['participationId']}/setup"


def body(**overrides):
    return {"expectedRevision":1,"boothLabel":" Synthetic A1 ","setupInstructions":" Synthetic private setup instructions ",**overrides}


def rows():
    with connect() as connection:
        tables=[r[0] for r in connection.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")]
        return {name:[r[0] for r in connection.execute(sql.SQL("SELECT to_jsonb(t) FROM {} t ORDER BY to_jsonb(t)::text").format(sql.Identifier(name)))] for name in tables}


def unchanged_domains(before):
    after=rows()
    for table in before:
        if table not in {"participation_setup","audit_events"}:
            assert after[table] == before[table], table


def problem(response,status,code):
    assert response.status_code == status,response.text
    assert response.headers.get("cache-control") == "no-store"
    assert response.headers.get("content-type","").startswith("application/problem+json")
    value=response.json()
    assert value["status"] == status and value["code"] == code
    if status in {401,403,404}: assert "currentRevision" not in value
    assert "Synthetic private" not in response.text and "psycopg" not in response.text
    return value


def accept(world,record,actor=None):
    frozen=submit(world,record,client=actor)
    owner=world.oa if record["eventId"] == world.a else world.ob
    return success(request(owner,"POST",f"/api/v1/organiser/events/{record['eventId']}/applications/{record['id']}/decision",json={"expectedRevision":frozen["revision"],"outcome":"accepted","reason":None}))


@pytest.fixture
def accepted(world):
    open_event(world)
    return accept(world,create(world))


def test_empty_reads_have_no_side_effect_then_publish_update_clear_and_reconnect(world,accepted):
    success(request(world.x,"PUT",f"/api/v1/business/participations/{accepted['participationId']}/preparation",json={"expectedRevision":1,"tasks":[{"title":"Existing private preparation","status":"done","dueDate":None}],"budget":{"currency":"SGD","lines":[]}}))
    before=rows()
    empty={"participationId":accepted["participationId"],"eventId":accepted["eventId"],"revision":1,"boothLabel":None,"setupInstructions":None,"updatedAt":None}
    assert success(world.oa.get(organiser(accepted))) == empty
    assert success(world.x.get(business(accepted))) == empty
    assert rows() == before
    for revision,label,instructions in [(1," A1 "," Setup at 08:00 "),(2,"A1","Setup at 08:00"),(3,None," "),(4,"",None)]:
        value=success(request(world.oa,"PUT",organiser(accepted),json=body(expectedRevision=revision,boothLabel=label,setupInstructions=instructions)))
        assert set(value) == set(empty)
        assert value["revision"] == revision+1
        assert value["boothLabel"] == ((label or "").strip() or None)
        assert value["setupInstructions"] == ((instructions or "").strip() or None)
        assert datetime.fromisoformat(value["updatedAt"].replace("Z","+00:00")).utcoffset().total_seconds() == 0
        assert success(world.x.get(business(accepted))) == value
        assert success(world.oa.get(organiser(accepted))) == value
    unchanged_domains(before)
    assert success(world.x.get(own_path(accepted))) == accepted


def test_first_and_existing_save_races_have_one_winner_and_attributable_audit(world,accepted):
    route=organiser(accepted)
    for revision in [1,2]:
        before={r["id"] for r in rows()["audit_events"]}
        responses=concurrent(world,world.oa,[("PUT",route,body(expectedRevision=revision,boothLabel="A")),("PUT",route,body(expectedRevision=revision,boothLabel="B"))])
        assert sorted(r.status_code for r in responses) == [200,409]
        winner=next(r.json() for r in responses if r.status_code == 200)
        assert winner["revision"] == revision+1
        assert success(world.x.get(business(accepted))) == winner
        conflict=problem(next(r for r in responses if r.status_code == 409),409,"revision_conflict")
        # Optional current revision is only visible to this normally authorised caller.
        if "currentRevision" in conflict: assert conflict["currentRevision"] == revision+1
        audits=[r for r in rows()["audit_events"] if r["id"] not in before and r["outcome"] == "success"]
        assert len(audits) == 1
        assert audits[0]["action"] == "setup_save" and audits[0]["user_id"] == world.oa_id
        assert audits[0]["resource_id"] == accepted["participationId"] and audits[0]["resource_revision"] == revision+1
        assert audits[0]["occurred_at"] and "Synthetic private" not in str(audits)


@pytest.mark.parametrize("field,value",[("expectedRevision",0),("expectedRevision",True),("expectedRevision",1.0),("expectedRevision","1"),
    ("boothLabel",12),("boothLabel",False),("boothLabel","😀"*101),("setupInstructions",[]),("setupInstructions","😀"*5001),
    ("revision",2),("participationId",str(uuid4()))])
def test_strict_validation_preserves_saved_setup_and_other_domains(world,accepted,field,value):
    route=organiser(accepted)
    saved=success(request(world.oa,"PUT",route,json=body()))
    before=rows()
    invalid=body(expectedRevision=2);invalid[field]=value
    problem(request(world.oa,"PUT",route,json=invalid),422,"validation_error")
    assert success(world.x.get(business(accepted))) == saved
    unchanged_domains(before)


def test_unicode_limits_required_fields_origin_and_audit_failure(world,accepted):
    route=organiser(accepted)
    saved=success(request(world.oa,"PUT",route,json=body(boothLabel="😀"*100,setupInstructions="😀"*5000)))
    for field in ["boothLabel","setupInstructions","expectedRevision"]:
        invalid=body(expectedRevision=2);invalid.pop(field)
        problem(request(world.oa,"PUT",route,json=invalid),422,"validation_error")
    for headers in [{},{"Origin":"https://untrusted.example.test"}]:
        problem(world.oa.put(route,json=body(expectedRevision=2),headers=headers),403,"forbidden")
    problem(world.oa.get(organiser(accepted).replace(accepted["participationId"],"invalid-id")),422,"validation_error")
    with reject_writes("audit_events"):
        response=request(world.oa,"PUT",route,json=body(expectedRevision=2,boothLabel=None,setupInstructions=None))
        assert response.status_code in {500,503}
        problem(response,response.status_code,"internal_error" if response.status_code == 500 else "service_unavailable")
    assert success(world.x.get(business(accepted))) == saved


def test_first_save_audit_failure_preserves_virtual_empty_and_creates_no_row(world,accepted):
    before=rows()
    with reject_writes("audit_events"):
        failed=request(world.oa,"PUT",organiser(accepted),json=body())
        assert failed.status_code in {500,503}
        problem(failed,failed.status_code,"internal_error" if failed.status_code == 500 else "service_unavailable")
    after=rows()
    assert after.get("participation_setup",[]) == before.get("participation_setup",[])
    assert [r for r in after["audit_events"] if r["outcome"] == "success"] == [r for r in before["audit_events"] if r["outcome"] == "success"]
    value=success(world.oa.get(organiser(accepted)))
    assert value["revision"] == 1 and value["updatedAt"] is None and value["boothLabel"] is None and value["setupInstructions"] is None
    unchanged_domains(before)


def test_current_authority_and_no_cross_domain_access(world,accepted):
    route=organiser(accepted)
    saved=success(request(world.oa,"PUT",route,json=body()))
    for actor,status,code in [(world.anonymous,401,"unauthenticated"),(world.x,403,"forbidden"),(world.attendee,403,"forbidden"),(world.ob,403,"forbidden")]:
        problem(actor.get(route),status,code)
        problem(request(actor,"PUT",route,json=body(expectedRevision=2)),status,code)
    problem(world.oa.get(organiser(accepted,event=world.b)),403,"forbidden")
    foreign=problem(world.y.get(business(accepted)),404,"not_found")
    missing=problem(world.y.get(f"/api/v1/business/participations/{uuid4()}/setup"),404,"not_found")
    assert {k:v for k,v in foreign.items() if k != "instance"} == {k:v for k,v in missing.items() if k != "instance"}
    assert "currentRevision" not in foreign
    response=request(world.x,"PUT",business(accepted),json=body(expectedRevision=2))
    assert response.status_code in {403,405} and response.headers.get("cache-control") == "no-store"
    problem(world.oa.get(f"/api/v1/business/participations/{accepted['participationId']}/preparation"),403,"forbidden")
    with connect() as connection: connection.execute("UPDATE event_memberships SET status='inactive' WHERE user_id=%s",(world.oa_id,))
    problem(world.oa.get(route),403,"forbidden")
    problem(request(world.oa,"PUT",route,json=body(expectedRevision=2)),403,"forbidden")
    with connect() as connection: connection.execute("UPDATE event_memberships SET status='active' WHERE user_id=%s",(world.oa_id,))
    with connect() as connection: connection.execute("UPDATE business_memberships SET status='inactive' WHERE user_id=%s",(world.xuser,))
    problem(world.x.get(business(accepted)),403,"forbidden")
    with connect() as connection: connection.execute("UPDATE business_memberships SET status='active' WHERE user_id=%s",(world.xuser,))
    with connect() as connection: connection.execute("UPDATE password_credentials SET must_change_password=true WHERE user_id=%s",(world.oa_id,))
    problem(world.oa.get(route),403,"password_change_required")
    problem(request(world.oa,"PUT",route,json=body(expectedRevision=2)),403,"password_change_required")
    with connect() as connection: connection.execute("UPDATE password_credentials SET must_change_password=true WHERE user_id=%s",(world.xuser,))
    problem(world.x.get(business(accepted)),403,"password_change_required")
    with connect() as connection: connection.execute("UPDATE password_credentials SET must_change_password=false WHERE user_id=%s",(world.xuser,))
    assert success(world.x.get(business(accepted))) == saved


def test_nonaccepted_targets_empty_business_view_and_organiser_denial(world):
    open_event(world)
    record=create(world)
    for state in ["draft","submitted","rejected"]:
        problem(world.oa.get(organiser(record)),404,"not_found")
        problem(request(world.oa,"PUT",organiser(record),json=body()),404,"not_found")
        value=success(world.x.get(business(record)))
        assert value["boothLabel"] is None and value["setupInstructions"] is None and value["revision"] == 1
        if state == "draft": record=submit(world,record)
        elif state == "submitted": record=success(request(world.oa,"POST",f"/api/v1/organiser/events/{world.a}/applications/{record['id']}/decision",json={"expectedRevision":record["revision"],"outcome":"rejected","reason":"Synthetic refusal"}))


def test_same_business_two_events_and_duplicate_labels_are_independent(world,accepted):
    first=success(request(world.oa,"PUT",organiser(accepted),json=body(boothLabel="A1")))
    open_event(world,event=world.b,organiser=world.ob)
    second=accept(world,create(world,event=world.b))
    other=accept(world,create(world,business=world.yid,client=world.y),actor=world.y)
    for record,owner,viewer in [(second,world.ob,world.x),(other,world.oa,world.y)]:
        saved=success(request(owner,"PUT",organiser(record),json=body(boothLabel="A1")))
        assert success(viewer.get(business(record))) == saved
        assert success(world.x.get(business(accepted))) == first
    problem(world.oa.get(organiser(second,event=world.a)),404,"not_found")
