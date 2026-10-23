"""User-reviewed refinement scenarios; new public-boundary acceptance cases."""
from uuid import uuid4
import pytest
from tests.test_business_applications import migrated_database, clean_database, password_hash, world, connect, create, open_event, request, success
from tests.test_business_setup import accepted, organiser, business
from tests.test_business_preparation import document, path

@pytest.mark.parametrize("field", ["username", "email"])
def test_duplicate_registration_explains_fixed_conflicting_field_without_values(world, field):
    with connect() as db:
        username, email = db.execute("select username,email from users where id=%s", (success(world.x.get("/api/v1/auth/me"))["id"],)).fetchone()
        before = db.execute("select count(*) from users").fetchone()[0]
    unique = uuid4().hex
    body = {"username": unique, "email": unique + "@example.test", "displayName": "Market owner", "password": "Example-Password-123"}
    body[field] = username if field == "username" else email
    response = request(world.x, "POST", "/api/v1/auth/register/attendee", json=body)
    assert response.status_code == 409
    assert {"field": field, "code": "already_exists"} in response.json()["fieldErrors"]
    assert body[field] not in response.text
    with connect() as db:
        assert db.execute("select count(*) from users").fetchone()[0] == before


def test_own_contact_profile_is_authenticated_and_no_store(world):
    value = success(world.x.get("/api/v1/auth/contact-profile"))
    assert set(value) == {"displayName", "email"}
    assert value["displayName"] == success(world.x.get("/api/v1/auth/me"))["displayName"]
    assert "@" in value["email"]
    assert world.x.get("/api/v1/auth/contact-profile").headers["cache-control"] == "no-store"


def test_setup_save_is_private_until_explicit_publish_and_later_draft_preserves_publication(world, accepted):
    route = organiser(accepted)
    initial = success(world.x.get(business(accepted)))
    saved = success(request(world.oa, "PUT", route, json={"expectedRevision": 1, "boothLabel": "A12", "setupInstructions": "Arrive at nine"}))
    assert success(world.x.get(business(accepted))) == initial
    assert saved["publishedRevision"] == 1
    success(request(world.oa, "POST", route + "/publish", json={"expectedRevision": saved["revision"]}))
    published = success(world.x.get(business(accepted)))
    assert published["boothLabel"] == "A12" and published["revision"] == 2
    success(request(world.oa, "PUT", route, json={"expectedRevision": saved["revision"], "boothLabel": "B20", "setupInstructions": "Unpublished update"}))
    assert success(world.x.get(business(accepted))) == published
    assert request(world.oa, "POST", route + "/publish", json={"expectedRevision": saved["revision"]}).status_code == 409
    assert success(world.x.get(business(accepted))) == published


def test_spending_limit_and_optional_category_breakdown_have_exact_remaining_and_preserve_legacy_limit(world):
    open_event(world); record = create(world)
    body = document(); body["budget"]["overallLimitMinorUnits"] = 5000; body["budget"]["lines"][0]["category"] = "Printing"
    saved = success(request(world.x, "PUT", path(record), json=body))
    assert saved["budget"]["overallLimitMinorUnits"] == 5000
    assert saved["budget"]["remainingMinorUnits"] == "4625"
    assert saved["budget"]["lines"][0]["category"] == "Printing"
    legacy = {"expectedRevision": saved["revision"], "tasks": [], "budget": {"currency": "SGD", "lines": []}}
    updated = success(request(world.x, "PUT", path(record), json=legacy))
    assert updated["budget"]["overallLimitMinorUnits"] == 5000
    assert updated["budget"]["remainingMinorUnits"] == "5000"

@pytest.mark.parametrize("limit", [True, 1.5, "100", -1, 100000000001])
def test_invalid_limit_preserves_manual_document(world, limit):
    open_event(world); record = create(world); before = success(world.x.get(path(record)))
    body = document(); body["budget"]["overallLimitMinorUnits"] = limit
    assert request(world.x, "PUT", path(record), json=body).status_code == 422
    assert success(world.x.get(path(record))) == before


@pytest.fixture
def real_data_mode(world, monkeypatch):
    import json
    for name,value in {"AI_ENABLED":"true","AI_SYNTHETIC_ONLY":"false","AI_REAL_DATA_ENABLED":"true","AI_ALLOWED_EVENT_IDS":json.dumps([world.a]),"SOCLAAS_API_KEY":"test-key","SOCLAAS_MODEL":"test-model"}.items(): monkeypatch.setenv(name,value)


def draft_request(preparation_revision=1, setup_revision=1):
    return {"requestId":str(uuid4()),"expectedPreparationRevision":preparation_revision,"expectedSetupRevision":setup_revision,"expectedEventRevision":1,"needs":"Prepare a market display","selectedTaskIds":[],"selectedLineIds":[],"dataSharingConfirmed":True}


def test_real_data_mode_requires_explicit_operator_optin_and_excludes_contacts(world, real_data_mode, monkeypatch):
    from tests.test_preparation_drafts import Fake, output
    from app.ai.worker import run_once
    open_event(world);record=create(world)
    route=f"/api/v1/business/participations/{record['participationId']}/preparation-drafts"
    monkeypatch.setenv("AI_REAL_DATA_ENABLED","false")
    assert request(world.x,"POST",route,json=draft_request()).status_code == 503
    monkeypatch.setenv("AI_REAL_DATA_ENABLED","true")
    job=success(request(world.x,"POST",route,json=draft_request()),202)
    provider=Fake(output(world,record));assert run_once(provider=provider)
    completed=success(world.x.get(f"/api/v1/ai/jobs/{job['id']}"))
    assert completed["state"] == "completed"
    import json
    sent=json.dumps(provider.calls)
    assert "contactEmail" not in sent and "contactName" not in sent and record["businessId"] not in sent


@pytest.mark.parametrize("publish",[False,True])
def test_only_published_setup_changes_invalidate_inflight_ai(world,accepted,real_data_mode,publish):
    from tests.test_preparation_drafts import Fake, output
    from app.ai.worker import run_once
    route=f"/api/v1/business/participations/{accepted['participationId']}/preparation-drafts"
    job=success(request(world.x,"POST",route,json=draft_request()),202)
    def change():
        saved=success(request(world.oa,"PUT",organiser(accepted),json={"expectedRevision":1,"boothLabel":"New booth","setupInstructions":"New draft"}))
        if publish: success(request(world.oa,"POST",organiser(accepted)+"/publish",json={"expectedRevision":saved["revision"]}))
    assert run_once(provider=Fake(output(world,accepted),change))
    result=success(world.x.get(f"/api/v1/ai/jobs/{job['id']}"))
    assert result["state"] == ("failed" if publish else "completed")
    if publish: assert result["failureCode"] == "source_changed" and result["draft"] is None


def test_adoption_preserves_spending_limit_and_exact_remaining(world,real_data_mode):
    from tests.test_preparation_drafts import Fake, output, adoption
    from app.ai.worker import run_once
    open_event(world);record=create(world)
    manual=success(request(world.x,"PUT",path(record),json={"expectedRevision":1,"tasks":[],"budget":{"currency":"SGD","overallLimitMinorUnits":5000,"lines":[]}}))
    collection=f"/api/v1/business/participations/{record['participationId']}/preparation-drafts"
    job=success(request(world.x,"POST",collection,json=draft_request(preparation_revision=2)),202)
    payload=output(world,record);payload["lines"]=[{"description":"Display materials","quantity":3,"unitPriceMinorUnits":125}]
    assert run_once(provider=Fake(payload))
    draft=success(world.x.get(f"/api/v1/ai/jobs/{job['id']}"))["draft"]
    result=success(request(world.x,"POST",f"/api/v1/business/preparation-drafts/{draft['id']}/adopt",json=adoption(draft)))
    assert result["preparation"]["budget"]["overallLimitMinorUnits"] == 5000
    assert result["preparation"]["budget"]["remainingMinorUnits"] == "4625"
