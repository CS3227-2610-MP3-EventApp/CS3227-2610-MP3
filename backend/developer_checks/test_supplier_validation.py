"""Developer-owned supplier validation checks; excluded from the protected baseline."""
import json
from uuid import uuid4

import pytest

from app.supplier_research.service import validate_extraction

from tests.test_business_applications import clean_database, migrated_database, password_hash, world, connect
from tests.test_supplier_research import (context, start, jobpath, request, success,
    Search, Fetch, Extract)


def fixture(page, *, quantity=100, minimum_order=None):
    source_id = uuid4()
    identity = "Invented Printer offers Flyer Pack."
    fields = ["supplierName", "productDescription", "listedPrice.amountMinorUnits",
        "listedPrice.currency", "listedPrice.unitLabel", "listedPrice.quantityBasis", "deliveryEstimate"]
    if minimum_order is not None:
        fields.append("minimumOrderQuantity")
    evidence = [{"field": field, "sourceId": str(source_id), "evidenceQuote": page,
        "sourceLocator": None} for field in fields]
    offer = {"supplierName": "Invented Printer", "productDescription": "Flyer Pack",
        "evidenceByField": evidence,
        "listedPrice": {"amountMinorUnits": "205", "currency": "SGD", "unitLabel": "pack", "quantityBasis": "10"},
        "deliveryEstimate": "3 days", "minimumOrderQuantity": minimum_order,
        "availability": None, "unknownFields": [], "qualifications": []}
    raw = json.dumps({"offers": [offer]})
    return raw, {"request": {"quantity": quantity}, "sources": [{"sourceId": str(source_id)}],
        "pageById": {str(source_id): page}, "sourceFailures": []}


def test_competing_product_prices_do_not_ground_selected_offer_price():
    page = ("Invented Printer offers Flyer Pack and Poster Pack. "
        "Flyer Pack SGD 2.05 per 10 units; Poster Pack SGD 5.00 per 10 units. Delivery 3 days.")
    raw, research = fixture(page)
    result = validate_extraction(raw, research)
    offer = result["offers"][0]
    assert offer["listedPrice"]["amountMinorUnits"] is None
    assert offer["estimatedItemSubtotalMinorUnits"] is None
    assert any(item["field"] == "listedPrice" for item in offer["unknownFields"])


def test_requested_quantity_below_grounded_minimum_has_no_subtotal():
    page = "Invented Printer offers Flyer Pack. SGD 2.05 per 10 units. Minimum order 250 units. Delivery 3 days."
    raw, research = fixture(page, quantity=100, minimum_order=250)
    result = validate_extraction(raw, research)
    offer = result["offers"][0]
    assert offer["minimumOrderQuantity"] == 250
    assert offer["listedPrice"]["amountMinorUnits"] == "205"
    assert offer["estimatedItemSubtotalMinorUnits"] is None
    assert any(item["field"] == "estimatedItemSubtotalMinorUnits" for item in offer["unknownFields"])


def test_delivery_for_another_product_is_kept_unknown():
    page = ("Invented Printer offers Flyer Pack. Flyer Pack SGD 2.05 per 10 units. "
        "Poster Pack delivery 1 day.")
    raw, research = fixture(page)
    value = json.loads(raw)
    value["offers"][0]["deliveryEstimate"] = "1 day"
    for evidence in value["offers"][0]["evidenceByField"]:
        if evidence["field"] == "deliveryEstimate":
            evidence["evidenceQuote"] = "Poster Pack delivery 1 day."
    offer = validate_extraction(json.dumps(value), research)["offers"][0]
    assert offer["listedPrice"]["amountMinorUnits"] == "205"
    assert offer["deliveryEstimate"] is None
    assert any(item["field"] == "deliveryEstimate" for item in offer["unknownFields"])


def test_price_currency_must_have_supported_minor_unit_precision():
    page = "Invented Printer offers Flyer Pack. JPY 205 per 10 units. Delivery 3 days."
    raw, research = fixture(page)
    value = json.loads(raw)
    value["offers"][0]["listedPrice"].update(amountMinorUnits="205", currency="JPY")
    result = validate_extraction(json.dumps(value), research)
    offer = result["offers"][0]
    assert offer["listedPrice"]["amountMinorUnits"] is None
    assert offer["estimatedItemSubtotalMinorUnits"] is None


def test_unsupported_price_precision_and_grouping_are_not_partially_parsed():
    from app.supplier_research.service import _money_in_text
    assert _money_in_text("SGD 2.055") == []
    assert _money_in_text("SGD 1,000.00") == []
    assert _money_in_text("SGD 2.05 per 10.5 units") == [("205", "SGD", None)]
    assert _money_in_text("From SGD 2.05") == []
    assert _money_in_text("SGD 2.05–3.00") == []
    assert _money_in_text("NOTSGD2.05") == []


def test_supplier_failure_codes_keep_safe_specific_results():
    from app.ai.worker import _supplier_failure
    assert _supplier_failure("invalid_output") == "invalid_output"
    assert _supplier_failure("fetch_failed") == "fetch_failed"
    assert _supplier_failure("quota_exceeded") == "quota_exceeded"
    assert _supplier_failure("job_timeout") == "timed_out"
    assert _supplier_failure("provider_auth_failed") == "provider_unavailable"


def test_unused_retrieved_source_is_visible_as_partial_gap():
    raw, research = fixture("Invented Printer offers Flyer Pack. SGD 2.05 per 10 units. Delivery 3 days.")
    unused_id = uuid4()
    unused_text = "Another Supplier has unrelated merchandise."
    research["sources"].append({"sourceId": str(unused_id)})
    research["pageById"][str(unused_id)] = unused_text
    result = validate_extraction(raw, research)
    assert result["status"] == "partial"
    assert result["sourceFailures"] == [{"sourceId": str(unused_id), "code": "fetch_failed",
        "displayMessage": "This retrieved source did not establish a useful supported offer."}]


@pytest.mark.parametrize("action", ["cancel", "revoke"])
def test_retrieval_cancel_or_revocation_prevents_model_dispatch(clean_database, world, context, action):
    job = start(world, context)

    def change_authority():
        if action == "cancel":
            success(request(world.x, "POST", jobpath(job) + "/cancel"))
        else:
            with connect() as connection:
                connection.execute("UPDATE business_memberships SET status='inactive' WHERE user_id=%s", (world.xuser,))

    search, fetch, extract = Search(), Fetch(callback=change_authority), Extract()
    from app.ai import worker
    assert worker.run_once(provider=extract, supplier_search=search, supplier_fetcher=fetch)
    assert len(search.calls) == len(fetch.calls) == 1
    assert extract.calls == []
    with connect() as connection:
        attempts = connection.execute("SELECT count(*) FROM ai_provider_attempts WHERE job_id=%s", (job["id"],)).fetchone()[0]
        snapshots = connection.execute("SELECT count(*) FROM supplier_research_snapshots WHERE job_id=%s", (job["id"],)).fetchone()[0]
        state, failure = connection.execute("SELECT state,failure_code FROM ai_jobs WHERE id=%s", (job["id"],)).fetchone()
    assert attempts == snapshots == 0
    assert (state, failure) == (("cancelled", "cancelled") if action == "cancel" else ("failed", "access_revoked"))


def test_supplier_search_does_not_consume_soclaas_attempt_before_extraction(clean_database, world, context, monkeypatch):
    job = start(world, context)
    from app.ai import worker
    real_dispatch, phases = worker._dispatch, []

    def observe(job_id, *, record_attempt=True):
        phases.append(record_attempt)
        return real_dispatch(job_id, record_attempt=record_attempt)

    monkeypatch.setattr(worker, "_dispatch", observe)
    assert worker.run_once(provider=Extract(), supplier_search=Search(), supplier_fetcher=Fetch())
    assert phases == [False, True]
    with connect() as connection:
        attempts = connection.execute("SELECT count(*) FROM ai_provider_attempts WHERE job_id=%s", (job["id"],)).fetchone()[0]
    assert attempts == 1


def test_tavily_profile_is_explicit_and_bounded_streaming(monkeypatch):
    from app.settings import Settings
    from app.supplier_research.provider import TavilySearch

    class Response:
        status_code = 200
        headers = {"content-length": "15", "content-encoding": "identity"}
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def raise_for_status(self): pass
        def iter_raw(self): yield b'{"results": []}'

    captured = {}
    class Client:
        def __init__(self, **kwargs): captured["client"] = kwargs
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def stream(self, method, url, **kwargs):
            captured.update(method=method, url=url, request=kwargs)
            return Response()
        def close(self): pass

    monkeypatch.setattr("app.supplier_research.provider.httpx.Client", Client)
    settings = Settings(_env_file=None,
        database_url="postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp",
        tavily_api_key="synthetic-key")
    assert TavilySearch(settings).search(query="synthetic query")["results"] == []
    body = captured["request"]["json"]
    assert captured["method"] == "POST"
    assert captured["url"] == "https://api.tavily.com/search"
    assert captured["client"]["trust_env"] is False
    assert body["search_depth"] == "basic" and body["auto_parameters"] is False
    assert body["max_results"] == 3 and body["include_raw_content"] is False
    assert captured["request"]["headers"]["Accept-Encoding"] == "identity"
    assert body["api_key"] == "synthetic-key"
