"""Developer-owned supplier validation checks; excluded from the protected baseline."""
import json
import time
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


def test_delivery_for_another_product_in_same_quote_is_kept_unknown():
    page = ("Invented Printer offers Flyer Pack. Flyer Pack SGD 2.05 per 10 units. "
        "Snack Box delivery 1 day.")
    raw, research = fixture(page)
    value = json.loads(raw)
    value["offers"][0]["deliveryEstimate"] = "1 day"
    offer = validate_extraction(json.dumps(value), research)["offers"][0]
    assert offer["listedPrice"]["amountMinorUnits"] == "205"
    assert offer["deliveryEstimate"] is None
    assert any(item["field"] == "deliveryEstimate" for item in offer["unknownFields"])


def test_delivery_for_product_variant_is_not_attributed_to_base_product():
    page = ("Invented Printer offers Flyer Pack. Flyer Pack SGD 2.05 per 10 units. "
        "Flyer Pack Deluxe delivery 1 day.")
    raw, research = fixture(page)
    value = json.loads(raw)
    value["offers"][0]["deliveryEstimate"] = "1 day"
    offer = validate_extraction(json.dumps(value), research)["offers"][0]
    assert offer["listedPrice"]["amountMinorUnits"] == "205"
    assert offer["deliveryEstimate"] is None
    assert any(item["field"] == "deliveryEstimate" for item in offer["unknownFields"])


def test_delivery_for_another_product_after_delivery_keyword_is_kept_unknown():
    page = ("Invented Printer offers Flyer Pack. Flyer Pack SGD 2.05 per 10 units. "
        "Delivery for Poster Pack: 1 day.")
    raw, research = fixture(page)
    value = json.loads(raw)
    value["offers"][0]["deliveryEstimate"] = "1 day"
    offer = validate_extraction(json.dumps(value), research)["offers"][0]
    assert offer["listedPrice"]["amountMinorUnits"] == "205"
    assert offer["deliveryEstimate"] is None
    assert any(item["field"] == "deliveryEstimate" for item in offer["unknownFields"])


def test_delivery_label_cannot_attribute_a_following_product_subject():
    page = ("Invented Printer offers Flyer Pack. Flyer Pack SGD 2.05 per 10 units. "
        "Delivery: Poster Pack ships in 1 day.")
    raw, research = fixture(page)
    value = json.loads(raw)
    value["offers"][0]["deliveryEstimate"] = "1 day"
    offer = validate_extraction(json.dumps(value), research)["offers"][0]
    assert offer["listedPrice"]["amountMinorUnits"] == "205"
    assert offer["deliveryEstimate"] is None
    assert any(item["field"] == "deliveryEstimate" for item in offer["unknownFields"])


def test_delivery_for_competing_product_after_selected_product_clause_is_unknown():
    page = ("Invented Printer offers Flyer Pack. Flyer Pack SGD 2.05 per 10 units. "
        "Flyer Pack 5 days, Poster Pack ships in 1 day.")
    raw, research = fixture(page)
    value = json.loads(raw)
    value["offers"][0]["deliveryEstimate"] = "1 day"
    offer = validate_extraction(json.dumps(value), research)["offers"][0]
    assert offer["listedPrice"]["amountMinorUnits"] == "205"
    assert offer["deliveryEstimate"] is None
    assert any(item["field"] == "deliveryEstimate" for item in offer["unknownFields"])


def test_generic_delivery_label_cannot_override_parenthetical_product_qualifier():
    page = ("Invented Printer offers Flyer Pack. Flyer Pack SGD 2.05 per 10 units. "
        "Delivery: 1 day (Poster Pack only).")
    raw, research = fixture(page)
    value = json.loads(raw)
    value["offers"][0]["deliveryEstimate"] = "1 day"
    offer = validate_extraction(json.dumps(value), research)["offers"][0]
    assert offer["listedPrice"]["amountMinorUnits"] == "205"
    assert offer["deliveryEstimate"] is None
    assert any(item["field"] == "deliveryEstimate" for item in offer["unknownFields"])


def test_selected_product_subject_cannot_override_parenthetical_product_qualifier():
    page = ("Invented Printer offers Flyer Pack. Flyer Pack SGD 2.05 per 10 units. "
        "Flyer Pack delivery 1 day (Poster Pack only).")
    raw, research = fixture(page)
    value = json.loads(raw)
    value["offers"][0]["deliveryEstimate"] = "1 day"
    offer = validate_extraction(json.dumps(value), research)["offers"][0]
    assert offer["listedPrice"]["amountMinorUnits"] == "205"
    assert offer["deliveryEstimate"] is None
    assert any(item["field"] == "deliveryEstimate" for item in offer["unknownFields"])


def test_generic_delivery_label_cannot_override_trailing_product_qualifier():
    page = ("Invented Printer offers Flyer Pack. Flyer Pack SGD 2.05 per 10 units. "
        "Delivery: 1 day, only for Poster Pack.")
    raw, research = fixture(page)
    value = json.loads(raw)
    value["offers"][0]["deliveryEstimate"] = "1 day"
    offer = validate_extraction(json.dumps(value), research)["offers"][0]
    assert offer["listedPrice"]["amountMinorUnits"] == "205"
    assert offer["deliveryEstimate"] is None
    assert any(item["field"] == "deliveryEstimate" for item in offer["unknownFields"])


def test_generic_delivery_label_cannot_split_conflicting_qualifier_across_dash_and_parentheses():
    page = ("Invented Printer offers Flyer Pack. Flyer Pack SGD 2.05 per 10 units. "
        "Delivery: 1 day — Poster Pack only (for other items).")
    raw, research = fixture(page)
    value = json.loads(raw)
    value["offers"][0]["deliveryEstimate"] = "1 day"
    offer = validate_extraction(json.dumps(value), research)["offers"][0]
    assert offer["listedPrice"]["amountMinorUnits"] == "205"
    assert offer["deliveryEstimate"] is None
    assert any(item["field"] == "deliveryEstimate" for item in offer["unknownFields"])


def test_selected_product_subject_cannot_override_colon_trailing_product_qualifier():
    page = ("Invented Printer offers Flyer Pack. Flyer Pack SGD 2.05 per 10 units. "
        "Flyer Pack delivery 1 day: Poster Pack only.")
    raw, research = fixture(page)
    value = json.loads(raw)
    value["offers"][0]["deliveryEstimate"] = "1 day"
    offer = validate_extraction(json.dumps(value), research)["offers"][0]
    assert offer["listedPrice"]["amountMinorUnits"] == "205"
    assert offer["deliveryEstimate"] is None
    assert any(item["field"] == "deliveryEstimate" for item in offer["unknownFields"])


def test_selected_product_subject_cannot_override_slash_trailing_product_qualifier():
    page = ("Invented Printer offers Flyer Pack. Flyer Pack SGD 2.05 per 10 units. "
        "Flyer Pack delivery 1 day / Poster Pack only.")
    raw, research = fixture(page)
    value = json.loads(raw)
    value["offers"][0]["deliveryEstimate"] = "1 day"
    offer = validate_extraction(json.dumps(value), research)["offers"][0]
    assert offer["listedPrice"]["amountMinorUnits"] == "205"
    assert offer["deliveryEstimate"] is None
    assert any(item["field"] == "deliveryEstimate" for item in offer["unknownFields"])


def test_delivery_subject_from_prior_comma_clause_does_not_ground_estimate():
    page = ("Invented Printer offers Flyer Pack. Flyer Pack SGD 2.05 per 10 units. "
        "Flyer Pack delivery 5 days, Poster Pack 1 day.")
    raw, research = fixture(page)
    value = json.loads(raw)
    value["offers"][0]["deliveryEstimate"] = "1 day"
    offer = validate_extraction(json.dumps(value), research)["offers"][0]
    assert offer["listedPrice"]["amountMinorUnits"] == "205"
    assert offer["deliveryEstimate"] is None
    assert any(item["field"] == "deliveryEstimate" for item in offer["unknownFields"])


def test_selected_product_subject_before_shipping_verb_is_grounded():
    page = ("Invented Printer offers Flyer Pack. Flyer Pack SGD 2.05 per 10 units. "
        "Flyer Pack ships in 3 days.")
    raw, research = fixture(page)
    value = json.loads(raw)
    offer = validate_extraction(json.dumps(value), research)["offers"][0]
    assert offer["listedPrice"]["amountMinorUnits"] == "205"
    assert offer["deliveryEstimate"] == "3 days"


def test_delivery_estimate_preserves_source_casing():
    page = "Invented Printer offers Flyer Pack with delivery 3 days. SGD 2.05 per 10 units."
    raw, research = fixture(page)
    value = json.loads(raw)
    value["offers"][0]["deliveryEstimate"] = "3 DAYS"
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


def test_identity_only_offer_is_kept_as_listing_only_and_partial():
    raw, research = fixture("Invented Printer offers Flyer Pack. Contact us for prices.")
    result = validate_extraction(raw, research)
    assert result["status"] == "partial"
    offer = result["offers"][0]
    assert offer["listedPrice"] == {"amountMinorUnits": None, "currency": None, "unitLabel": None, "quantityBasis": None}
    assert offer["estimatedItemSubtotalMinorUnits"] is None and offer["estimatedCurrency"] is None
    assert offer["deliveryEstimate"] is None
    assert {item["field"] for item in offer["unknownFields"]} >= {"listedPrice", "deliveryEstimate"}
    assert {item["field"] for item in offer["evidenceByField"]} == {"supplierName", "productDescription"}


def test_identity_unsupported_offer_still_invalid():
    raw, research = fixture("Another Supplier sells other things.")
    with pytest.raises(ValueError, match="invalid_output"):
        validate_extraction(raw, research)


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


def test_supplier_prompt_includes_useful_partial_offers_without_weakening_evidence():
    import json

    from app.supplier_research.service import messages

    source_id = str(uuid4())
    research = {
        "request": {"category": "printing", "brief": "flyers", "quantity": 100,
            "deliveryArea": "Singapore East", "neededBy": None, "dataSharingConfirmed": True},
        "sources": [{"sourceId": source_id, "excerpt": "Invented Printer offers Flyer Pack. Delivery 3 days."}],
    }
    system, user = messages(research)
    user_payload = json.loads(user["content"])

    prompt = system["content"]
    assert "Prefer a partial grounded offer over omitting it because other fields are unknown" in prompt
    assert "do not omit an offer solely because its price is unavailable" in prompt
    assert "A listed-price quote must include the exact context that names this supplier and" in prompt
    assert "For a deliveryEstimate quote, include the exact context that names the supplier and product" in prompt
    assert "Copy each evidenceQuote directly as an exact contiguous substring" in prompt
    assert "The server checks literal substring inclusion" in prompt
    assert "do not cite only the bare delivery phrase" in prompt
    assert "For deliveryEstimate, evidenceQuote must repeat the entire sentence" in prompt
    assert "A sentence naming a different product as the delivery subject cannot support this offer" in prompt
    assert "Preserve the exact capitalization of the delivery wording" in prompt
    assert "A separate product mention elsewhere in the quote does not establish an unparsed delivery subject" in prompt
    assert "that identity and exact delivery may form a useful offer even when price is null" in prompt
    assert user_payload["request"] == {
        "category": "printing", "brief": "flyers", "quantity": 100,
        "deliveryArea": "Singapore East", "neededBy": None,
    }
    assert user_payload["sources"] == [{"sourceId": source_id, "pageText": research["sources"][0]["excerpt"]}]


def test_supplier_search_query_targets_product_prices_and_delivery():
    from app.supplier_research.service import _query

    query = _query({
        "category": "printing", "quantity": 100, "deliveryArea": "Singapore East",
        "brief": "A4 colour flyers", "neededBy": "2027-01-01",
    }).casefold()

    assert "product" in query
    assert "price list" in query
    assert "delivery" in query
    assert "100" in query and "singapore east" in query and "a4 colour flyers" in query
    assert "2027-01-01" in query


def _identity_fixture(name, product, page):
    raw, research = fixture(page)
    data = json.loads(raw)
    data["offers"][0]["supplierName"] = name
    data["offers"][0]["productDescription"] = product
    return json.dumps(data), research


@pytest.mark.parametrize("name,product", [
    ("Invented Printer $5", "Flyer Pack"),
    ("Invented Printer", "Flyer Pack SGD 2.80"),
    ("Invented Printer", "Flyer Pack S$2"),
    ("Invented Printer", "Flyer Pack 2.80 SGD"),
])
def test_price_in_identity_is_rejected(name, product):
    raw, research = _identity_fixture(name, product, f"{name} offers {product}. SGD 2.05 per 10 units. Delivery 3 days.")
    with pytest.raises(ValueError, match="invalid_output"):
        validate_extraction(raw, research)


@pytest.mark.parametrize("name", [
    "Invented Printer +65 9123 4567", "Invented Printer 91234567", "Invented Printer www.invented.example",
    "Invented Printer https://invented.example", "Invented Printer sales@invented.example"])
def test_contact_details_in_identity_are_rejected(name):
    raw, research = _identity_fixture(name, "Flyer Pack", f"{name} offers Flyer Pack. SGD 2.05 per 10 units. Delivery 3 days.")
    with pytest.raises(ValueError, match="invalid_output"):
        validate_extraction(raw, research)


def test_one_character_identity_is_rejected_even_with_price_offer():
    page = "A offers Flyer Pack. SGD 2.05 per 10 units. Delivery 3 days."
    raw, research = _identity_fixture("A", "Flyer Pack", page)
    with pytest.raises(ValueError, match="invalid_output"):
        validate_extraction(raw, research)


def test_model_unknown_field_reasons_are_never_echoed():
    page = "Invented Printer offers Flyer Pack. SGD 2.05 per 10 units. Delivery 3 days."
    raw, research = fixture(page)
    data = json.loads(raw)
    data["offers"][0]["unknownFields"] = [
        {"field": "shipping", "reason": "Call 91234567 or visit www.evil.example"},
        {"field": "deliveryEstimate", "reason": "model delivery text"},
        {"field": "notAllowed", "reason": "other"}]
    result = validate_extraction(json.dumps(data), research)
    unknown = result["offers"][0]["unknownFields"]
    assert "shipping" in [item["field"] for item in unknown]
    assert "notAllowed" not in [item["field"] for item in unknown]
    assert all("model delivery text" != item["reason"] for item in unknown)
    assert "91234567" not in json.dumps(result) and "evil" not in json.dumps(result)


# r5/D07 repair helpers and per-offer rejection
from app.supplier_research.service import _repair_name, _repair_quote


def test_repair_quote_snaps_whitespace_to_exact_page_span():
    page = "Intro. Invented  Printer offers\nFlyer Pack. More."
    assert _repair_quote("Invented Printer offers Flyer Pack.", page) == "Invented  Printer offers\nFlyer Pack."
    assert _repair_quote("Invented Printer offers Flyer Pack.", "Invented Printer offers Flyer Pack.") \
        == "Invented Printer offers Flyer Pack."


def test_repair_quote_never_invents_text():
    page = "Invented Printer offers Flyer Pack."
    assert _repair_quote("Invented Printer sells Flyer Pack.", page) == "Invented Printer sells Flyer Pack."
    assert _repair_quote("   ", page) == "   "


@pytest.mark.parametrize("name,expected", [
    ("Invented Printer Ltd", "Invented Printer"), ("Invented Printer Pte. Ltd.", "Invented Printer"),
    ("invented printer, LLC", "invented printer"), ("Invented Printer Co", "Invented Printer"),
    ("Invented Printer Limited", "Invented Printer"), ("Invented Printer Inc.", "Invented Printer"),
    ("Invented Printer Corp", "Invented Printer Corp"), ("Other Printer Ltd", "Other Printer Ltd"),
    ("Invented Printer", "Invented Printer")])
def test_repair_name_only_drops_trailing_corporate_suffix(name, expected):
    assert _repair_name(name, ["Invented Printer offers Flyer Pack."], allow_suffix=True) == expected


def test_repair_name_without_quotes_is_unchanged():
    assert _repair_name("Invented Printer Ltd", []) == "Invented Printer Ltd"


def test_repair_name_snaps_whitespace_to_quoted_span():
    assert _repair_name("Flyer Pack", ["Printer offers  Flyer\nPack."]) == "Flyer Pack"
    assert _repair_name("Flyer Pack", ["Printer offers Flyer\tPack."]) == "Flyer Pack"


def test_repair_quote_gap_and_bounds():
    assert _repair_quote("A B", "A \t B") == "A \t B"
    assert _repair_quote("A B", "A\r\n  B") == "A\r\n  B"
    assert _repair_quote("A B", "A\n\nB") == "A B"
    assert _repair_quote("A B", "A\u00a0B") == "A B"
    assert _repair_quote("Z B", "A  B") == "Z B"
    many = " ".join(f"w{i}" for i in range(61))
    assert _repair_quote(many, many.replace(" ", "  ")) == many
    ok = " ".join(f"w{i}" for i in range(60))
    assert _repair_quote(ok, ok.replace(" ", "  ")) == ok.replace(" ", "  ")
    long_tokens = " ".join(["x" * 30] * 40)
    assert _repair_quote(long_tokens, long_tokens.replace(" ", "  ")) == long_tokens


def test_repair_quote_pathological_page_is_fast():
    page = "a " * (512 * 1024)
    quote = " ".join(["a"] * 59 + ["b"])
    started = time.monotonic()
    assert _repair_quote(quote, page) == quote
    assert time.monotonic() - started < 1.5


def test_repair_name_suffix_only_for_supplier_name_and_word_boundaries():
    quotes = ["Invented Printer offers Flyer Pack."]
    assert _repair_name("Flyer Pack Ltd", quotes) == "Flyer Pack Ltd"
    assert _repair_name("Flyer Pack Ltd", quotes, allow_suffix=True) == "Flyer Pack"
    assert _repair_name("Invent Ltd", quotes, allow_suffix=True) == "Invent Ltd"
    assert _repair_name("Printer Pte.\nLtd.", quotes, allow_suffix=True) == "Printer"
    assert _repair_name("Invented  Printer Ltd", quotes, allow_suffix=True) == "Invented Printer"


def test_rejected_offer_still_lists_source_with_saved_offer_as_failure():
    page = "Invented Printer offers Flyer Pack. SGD 2.05 per 10 units. Delivery 3 days."
    raw, research = fixture(page)
    data = json.loads(raw)
    bad = json.loads(raw)["offers"][0]
    for citation in bad["evidenceByField"]:
        citation["evidenceQuote"] = "Fabricated claim not on the page."
    data["offers"].insert(0, bad)
    result = validate_extraction(json.dumps(data), research)
    assert len(result["offers"]) == 1
    assert result["status"] == "partial"
    assert result["sourceFailures"] == [{"sourceId": research["sources"][0]["sourceId"], "code": "fetch_failed",
        "displayMessage": "An offer from this source could not be verified and was omitted."}]


def test_bad_offer_is_dropped_with_safe_source_failure_and_forged_source_fails_all():
    page = "Invented Printer offers Flyer Pack. SGD 2.05 per 10 units. Delivery 3 days."
    raw, research = fixture(page)
    data = json.loads(raw)
    bad = json.loads(raw)["offers"][0]
    other = str(uuid4())
    research["sources"].append({"sourceId": other})
    research["pageById"][other] = "Other page."
    for citation in bad["evidenceByField"]:
        citation["sourceId"] = other
        citation["evidenceQuote"] = "Fabricated claim not on the page."
    data["offers"].append(bad)
    result = validate_extraction(json.dumps(data), research)
    assert len(result["offers"]) == 1 and result["status"] == "partial"
    assert [f["code"] for f in result["sourceFailures"]] == ["fetch_failed"]
    assert "Fabricated" not in json.dumps(result)
    data["offers"][1]["evidenceByField"][0]["sourceId"] = str(uuid4())
    with pytest.raises(ValueError, match="invalid_output"):
        validate_extraction(json.dumps(data), research)
