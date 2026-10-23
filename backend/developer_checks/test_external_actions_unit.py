"""Developer-owned pure checks for external-action arithmetic and URL boundaries."""
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.external_actions.schemas import ProposalInput
from app.external_actions import service


def _payload(*, amount="205", currency="SGD", basis="10", quantity=100, source_quantity=100):
    source_id, snapshot_id, offer_id = uuid4(), uuid4(), uuid4()
    source = {"sourceId": str(source_id), "searchResultUrl": "https://printer.example.test/quote",
        "requestedUrl": "https://printer.example.test/quote", "finalUrl": "https://printer.example.test/quote",
        "retrievedAt": "2026-10-23T00:00:00Z"}
    snapshot = {"id": snapshot_id, "revision": 1, "request": {"quantity": source_quantity}, "sources": [source]}
    offer = {"id": str(offer_id), "supplierName": "Synthetic Printer", "productDescription": "Flyer Pack",
        "evidenceByField": [{"sourceId": str(source_id)}],
        "listedPrice": {"amountMinorUnits": amount, "currency": currency, "quantityBasis": basis}}
    body = ProposalInput.model_validate({"participationId": str(uuid4()), "actionType": "purchase_cart",
        "shortlistId": str(uuid4()), "expectedShortlistRevision": 2,
        "items": [{"snapshotId": str(snapshot_id), "offerId": str(offer_id), "quantity": quantity}]})
    return service._build_payload(body, {"items": [{"snapshot": snapshot, "offer": offer}]},
                                  datetime(2026, 10, 23, tzinfo=timezone.utc))


def test_exact_sgd_subtotal_and_quantity_mismatch_remain_source_bound():
    known = _payload()
    assert known["items"][0]["estimatedItemSubtotalMinorUnits"] == "2050"
    assert known["items"][0]["estimatedCurrency"] == "SGD"
    mismatch = _payload(quantity=1)
    assert mismatch["items"][0]["estimatedItemSubtotalMinorUnits"] is None
    assert mismatch["items"][0]["unknownReason"] == "quantity_mismatch"


def test_unknown_unsupported_and_overflow_prices_are_not_fabricated():
    unknown = _payload(amount=None, currency=None, basis=None)
    assert unknown["items"][0]["estimatedItemSubtotalMinorUnits"] is None
    assert unknown["items"][0]["unknownReason"] == "source_price_unknown"
    non_sgd = _payload(currency="USD")
    assert non_sgd["items"][0]["unknownReason"] == "source_price_unknown"
    overflow = _payload(amount="999999999999999999", basis="1")
    assert overflow["items"][0]["estimatedItemSubtotalMinorUnits"] is None
    assert overflow["items"][0]["unknownReason"] == "arithmetic_overflow"


@pytest.mark.parametrize("url,allowed", [
    ("https://printer.example.test/quote", True),
    ("http://printer.example.test/quote", False),
    ("https://u:p@printer.example.test/quote", False),
    ("https://127.0.0.1/quote", False),
    ("https://127.0x0.0.1/quote", False),
    ("https://localhost/quote", False),
    ("https://supplier.internal/quote", False),
])
def test_lexical_destination_check_does_not_require_network(url, allowed):
    assert service._safe_source_url(url) is allowed


def test_sandbox_simulator_has_only_fixed_local_success():
    assert service.simulate({"arbitrary": "untrusted text"}) == ("simulated", None)
