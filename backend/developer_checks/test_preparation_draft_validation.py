"""Developer-owned supplemental checks; outside the acceptance baseline."""
import json
import unittest
from app.preparation_drafts.schemas import ReplacePreparationDraft, CreatePreparationDraft
from app.preparation_drafts.service import validate_generated, _budget

FACTS = {"event": {"title": "Invented", "startsAt": "2027-01-01T01:00:00Z", "endsAt": "2027-01-01T09:00:00Z", "timezone": "Asia/Singapore"}, "setup": {"boothLabel": None, "setupInstructions": None}}

class DraftValidationChecks(unittest.TestCase):
    def test_maximum_aggregate_stays_exact_and_unknown_is_distinct(self):
        lines = [{"quantity": 1000000, "unitPriceMinorUnits": 100000000000}] * 200
        self.assertEqual(_budget(lines)["totalMinorUnits"], "20000000000000000000")
        self.assertIsNone(_budget(lines + [{"quantity": 1, "unitPriceMinorUnits": None}])["totalMinorUnits"])
        self.assertEqual(_budget([])["totalMinorUnits"], "0")

    def test_generated_rows_get_server_controlled_defaults(self):
        value = validate_generated(json.dumps({"sourceFacts": FACTS, "tasks": [{"title": "  Invented display  "}], "lines": [{"description": "Invented zero", "quantity": 1, "unitPriceMinorUnits": 0}]}), {"sourceFacts": FACTS})
        self.assertEqual(value["tasks"], [{"title": "Invented display", "status": "not_started", "dueDate": None}])
        self.assertEqual(value["lines"][0]["priceBasis"], "estimate")

    def test_edit_rejects_noncanonical_dates(self):
        for value in ["2027-02-29", "20270101", "2027-01-01T00:00:00Z"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                ReplacePreparationDraft.model_validate_json(json.dumps({"expectedRevision": 1, "tasks": [{"title": "Invented", "status": "done", "dueDate": value}], "budget": {"currency": "SGD", "lines": []}}))

    def test_model_cannot_supply_actions_or_totals(self):
        for extra in [{"actions": ["publish"]}, {"totalMinorUnits": "0"}]:
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                validate_generated(json.dumps({"sourceFacts": FACTS, "tasks": [], "lines": [], **extra}), {"sourceFacts": FACTS})

    def test_synthetic_acknowledgement_cannot_be_numeric(self):
        from uuid import uuid4
        body = {"requestId": str(uuid4()), "expectedPreparationRevision": 1, "expectedSetupRevision": 1, "expectedEventRevision": 1, "needs": "Invented", "selectedTaskIds": [], "selectedLineIds": [], "syntheticDataConfirmed": 1}
        with self.assertRaises(ValueError):
            CreatePreparationDraft.model_validate_json(json.dumps(body))

    def test_settings_validation_does_not_echo_provider_secret(self):
        from app.settings import Settings
        from pydantic import ValidationError
        marker = "provider-secret-must-never-appear"
        with self.assertRaises(ValidationError) as raised:
            Settings(database_url=None, soclaas_api_key=marker)
        self.assertNotIn(marker, str(raised.exception))
