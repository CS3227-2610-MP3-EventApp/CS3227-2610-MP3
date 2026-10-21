"""Independent US03 r3 acceptance: public HTTP, real guarded PostgreSQL."""
from copy import deepcopy
from uuid import uuid4

import pytest
from psycopg import sql

from tests.test_business_applications import (
    migrated_database, clean_database, password_hash, world,
    connect, concurrent, create, domain_state, open_event, own_path,
    reject_writes, request, submit, success, content,
)


def path(record):
    return f"/api/v1/business/participations/{record['participationId']}/preparation"


def document(**overrides):
    return {"expectedRevision": 1, "tasks": [{"title": "Synthetic display", "status": "not_started", "dueDate": "2027-01-01"}],
            "budget": {"currency": "SGD", "lines": [line()]}, **overrides}


def line(**overrides):
    return {"description": "Synthetic prints", "quantity": 3, "unitPriceMinorUnits": 125,
            "priceBasis": "estimate", "quotationBasis": None, **overrides}


def editable(saved):
    return {"expectedRevision": saved["revision"], "tasks": deepcopy(saved["tasks"]),
            "budget": {"currency": saved["budget"]["currency"], "lines": deepcopy(saved["budget"]["lines"])}}


def error(response, status, code):
    assert response.status_code == status, response.text
    assert response.headers.get("cache-control") == "no-store"
    assert response.headers.get("content-type", "").startswith("application/problem+json")
    value = response.json()
    assert value["code"] == code and value["status"] == status
    assert "Synthetic display" not in response.text and "psycopg" not in response.text
    return value


def persisted_rows():
    with connect() as connection:
        tables = [row[0] for row in connection.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")]
        return {table: [row[0] for row in connection.execute(sql.SQL("SELECT to_jsonb(t) FROM {} t ORDER BY to_jsonb(t)::text").format(sql.Identifier(table)))] for table in tables}


@pytest.fixture
def participation(world):
    open_event(world)
    return create(world)


def test_virtual_get_is_read_only_and_full_replacement_survives_fresh_connection(world, participation):
    route = path(participation)
    before = persisted_rows()
    empty = success(world.x.get(route))
    assert empty == {"participationId": participation["participationId"], "revision": 1, "tasks": [],
                     "budget": {"currency": "SGD", "lines": [], "knownSubtotalMinorUnits": "0", "totalMinorUnits": "0", "isComplete": True}}
    assert success(world.x.get(route)) == empty
    assert persisted_rows() == before
    saved = success(request(world.x, "PUT", route, json=document()))
    assert saved["revision"] == 2 and saved["budget"]["totalMinorUnits"] == "375"
    assert saved["tasks"][0]["title"] == "Synthetic display"
    assert success(world.x.get(route)) == saved
    update = editable(saved)
    update["tasks"][0]["status"] = "done"
    update["budget"]["lines"][0].update(unitPriceMinorUnits=0, priceBasis="quotation", quotationBasis="Synthetic written quote")
    updated = success(request(world.x, "PUT", route, json=update))
    assert updated["tasks"][0]["status"] == "done" and updated["budget"]["totalMinorUnits"] == "0"
    update = editable(updated)
    update["tasks"][0]["status"] = "not_started"
    reopened = success(request(world.x, "PUT", route, json=update))
    assert reopened["tasks"][0]["status"] == "not_started"
    deleted = success(request(world.x, "PUT", route, json=document(expectedRevision=reopened["revision"], tasks=[], budget={"currency": "SGD", "lines": []})))
    assert deleted["tasks"] == [] and deleted["budget"]["lines"] == []
    assert deleted["budget"]["totalMinorUnits"] == "0"
    assert success(world.x.get(own_path(participation))) == participation


def test_exact_maximum_and_unknown_are_distinct_from_zero(world, participation):
    route = path(participation)
    body = document(tasks=[{"title": f"Task {n}", "status": "done", "dueDate": None} for n in range(200)],
                    budget={"currency": "SGD", "lines": [line(quantity=1000000, unitPriceMinorUnits=100000000000) for _ in range(200)]})
    saved = success(request(world.x, "PUT", route, json=body))
    assert saved["budget"]["totalMinorUnits"] == "20000000000000000000"
    assert saved["budget"]["knownSubtotalMinorUnits"] == "20000000000000000000"
    odd = document(expectedRevision=2, budget={"currency":"SGD", "lines":[line(quantity=1000000,unitPriceMinorUnits=100000000000) for _ in range(199)] + [line(quantity=1,unitPriceMinorUnits=1)]})
    assert success(request(world.x,"PUT",route,json=odd))["budget"]["totalMinorUnits"] == "19900000000000000001"
    body = document(expectedRevision=3, budget={"currency": "SGD", "lines": [line(unitPriceMinorUnits=None, priceBasis="unknown"), line(unitPriceMinorUnits=0), line()]})
    saved = success(request(world.x, "PUT", route, json=body))
    assert saved["budget"]["knownSubtotalMinorUnits"] == "375"
    assert saved["budget"]["totalMinorUnits"] is None and saved["budget"]["isComplete"] is False


@pytest.mark.parametrize("field,value", [("quantity", 0), ("quantity",1000001), ("quantity",True), ("quantity",1.5), ("quantity","1"),
    ("unitPriceMinorUnits",-1), ("unitPriceMinorUnits",100000000001), ("unitPriceMinorUnits",False), ("unitPriceMinorUnits",0.5),
    ("priceBasis","quotation"), ("quotationBasis","unexpected"), ("description"," ")])
def test_invalid_line_preserves_entire_saved_document(world, participation, field, value):
    route = path(participation)
    saved = success(request(world.x,"PUT",route,json=document()))
    body = editable(saved)
    body["tasks"][0]["title"] = "Would change if nonatomic"
    body["budget"]["lines"][0][field] = value
    error(request(world.x,"PUT",route,json=body),422,"validation_error")
    assert success(world.x.get(route)) == saved


@pytest.mark.parametrize("mutation", ["currency", "tasks_cap", "lines_cap", "server_total", "revision_bool", "revision_float", "unknown", "duplicate", "foreign"])
def test_invalid_document_and_ids_preserve_state(world, participation, mutation):
    route = path(participation)
    saved = success(request(world.x,"PUT",route,json=document()))
    body = editable(saved)
    if mutation == "currency": body["budget"]["currency"] = "USD"
    elif mutation == "tasks_cap": body["tasks"] = [{"title":"Task","status":"done","dueDate":None}] * 201
    elif mutation == "lines_cap": body["budget"]["lines"] = [line()] * 201
    elif mutation == "server_total": body["budget"]["totalMinorUnits"] = "1"
    elif mutation == "revision_bool": body["expectedRevision"] = True
    elif mutation == "revision_float": body["expectedRevision"] = 2.0
    elif mutation == "unknown": body["participationId"] = participation["participationId"]
    elif mutation == "duplicate": body["tasks"] *= 2
    elif mutation == "foreign": body["tasks"][0]["id"] = str(uuid4())
    error(request(world.x,"PUT",route,json=body),422,"validation_error")
    assert success(world.x.get(route)) == saved


def test_current_authority_origin_and_private_errors(world, participation):
    route = path(participation)
    saved = success(request(world.x,"PUT",route,json=document()))
    for actor,status,code in [(world.anonymous,401,"unauthenticated"),(world.attendee,403,"forbidden"),(world.oa,403,"forbidden"),(world.y,404,"not_found")]:
        error(actor.get(route),status,code)
        error(request(actor,"PUT",route,json=document()),status,code)
    missing = error(world.y.get(route),404,"not_found")
    absent = error(world.y.get(f"/api/v1/business/participations/{uuid4()}/preparation"),404,"not_found")
    assert {k:v for k,v in missing.items() if k != "instance"} == {k:v for k,v in absent.items() if k != "instance"}
    for headers in [{}, {"Origin":"https://untrusted.example.test"}]:
        error(world.x.put(route,json=editable(saved),headers=headers),403,"forbidden")
    with connect() as connection:
        connection.execute("UPDATE business_memberships SET status='inactive' WHERE user_id=%s",(world.xuser,))
    error(world.x.get(route),403,"forbidden")
    error(request(world.x,"PUT",route,json=editable(saved)),403,"forbidden")
    with connect() as connection:
        connection.execute("UPDATE business_memberships SET status='active' WHERE user_id=%s",(world.xuser,))
    assert success(world.x.get(route)) == saved
    with connect() as connection:
        connection.execute("UPDATE password_credentials SET must_change_password=true WHERE user_id=%s",(world.xuser,))
    error(world.x.get(route),403,"password_change_required")
    error(request(world.x,"PUT",route,json=editable(saved)),403,"password_change_required")


def test_first_save_concurrency_and_failed_audit_are_atomic(world, participation):
    route = path(participation)
    responses = concurrent(world,world.x,[("PUT",route,document()),("PUT",route,document(tasks=[]))])
    assert sorted(r.status_code for r in responses) == [200,409]
    saved = success(world.x.get(route))
    assert saved["revision"] == 2
    assert saved == next(r.json() for r in responses if r.status_code == 200)
    assert error(request(world.x,"PUT",route,json=document()),409,"revision_conflict")["currentRevision"] == 2
    assert success(world.x.get(route)) == saved
    with reject_writes("audit_events"):
        failed = request(world.x,"PUT",route,json=document(expectedRevision=2,tasks=[]))
        assert failed.status_code in {500,503}
        error(failed,failed.status_code,"service_unavailable" if failed.status_code == 503 else "internal_error")
    assert success(world.x.get(route)) == saved


def test_actual_foreign_task_and_line_ids_never_move_between_documents(world, participation):
    route = path(participation)
    target = success(request(world.x,"PUT",route,json=document()))
    open_event(world,event=world.b,organiser=world.ob)
    same_business = create(world,event=world.b)
    other_business = create(world,business=world.yid,client=world.y)
    sources = [(same_business,world.x),(other_business,world.y)]
    for record,actor in sources:
        source_route = path(record)
        source = success(request(actor,"PUT",source_route,json=document()))
        for collection in ["tasks","lines"]:
            body = editable(target)
            if collection == "tasks": body["tasks"][0]["id"] = source["tasks"][0]["id"]
            else: body["budget"]["lines"][0]["id"] = source["budget"]["lines"][0]["id"]
            error(request(world.x,"PUT",route,json=body),422,"validation_error")
            assert success(world.x.get(route)) == target
            assert success(actor.get(source_route)) == source


def test_existing_save_concurrency_has_one_winner(world, participation):
    route = path(participation)
    success(request(world.x,"PUT",route,json=document()))
    before = {row["id"] for row in persisted_rows()["audit_events"]}
    responses = concurrent(world,world.x,[("PUT",route,document(expectedRevision=2,tasks=[])),("PUT",route,document(expectedRevision=2))])
    assert sorted(r.status_code for r in responses) == [200,409]
    winner = next(r.json() for r in responses if r.status_code == 200)
    assert winner["revision"] == 3
    assert success(world.x.get(route)) == winner
    audits = [row for row in persisted_rows()["audit_events"] if row["id"] not in before and row["outcome"] == "success"]
    assert len(audits) == 1
    audit = audits[0]
    assert audit["user_id"] == world.xuser
    assert audit["resource_id"] == participation["participationId"] and audit["resource_revision"] == 3
    assert audit["occurred_at"]
    assert "Synthetic display" not in str(audit) and "Synthetic prints" not in str(audit)


@pytest.mark.parametrize("price,basis",[(None,"estimate"),(None,"quotation"),(1,"unknown")])
def test_price_basis_combinations_are_strict_and_atomic(world,participation,price,basis):
    route=path(participation)
    saved=success(request(world.x,"PUT",route,json=document()))
    body=document(expectedRevision=2,budget={"currency":"SGD","lines":[line(unitPriceMinorUnits=price,priceBasis=basis,quotationBasis="Quote" if basis == "quotation" else None)]})
    error(request(world.x,"PUT",route,json=body),422,"validation_error")
    assert success(world.x.get(route)) == saved


def test_application_mutation_and_decision_do_not_change_manual_preparation(world, participation):
    route = path(participation)
    saved = success(request(world.x,"PUT",route,json=document()))
    edited = success(request(world.x,"PUT",own_path(participation),json={"expectedRevision":1,**content(participantType="vendor")}))
    submitted = submit(world,edited)
    assert success(world.x.get(route)) == saved
    response = request(world.oa,"POST",f"/api/v1/organiser/events/{world.a}/applications/{participation['id']}/decision",json={"expectedRevision":submitted["revision"],"outcome":"rejected","reason":"Synthetic decision"})
    success(response)
    assert success(world.x.get(route)) == saved
    changed = success(request(world.x,"PUT",route,json=document(expectedRevision=2,tasks=[])))
    assert changed["revision"] == 3
