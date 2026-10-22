import json
from uuid import uuid4

import pytest

from app.disruptions.ai import messages, validate


def facts():
    return {
        "changeId": uuid4(),
        "toRevision": 4,
        "changeType": "updated",
        "oldFacts": {"title": "Old title"},
        "newFacts": {"title": "New title"},
    }


def test_messages_make_current_revision_explicit():
    source = facts()
    rendered = messages(source)
    request = json.loads(rendered[1]["content"])

    assert request["requiredOutput"] == {
        "changeId": str(source["changeId"]),
        "sourceRevision": source["toRevision"],
    }
    assert request["programmeChangeFacts"]["toRevision"] == source["toRevision"]


def test_validation_rejects_predecessor_revision():
    source = facts()
    output = {
        "changeId": str(source["changeId"]),
        "sourceRevision": 3,
        "opening": "update",
        "closing": "thanks",
    }

    with pytest.raises(ValueError, match="invalid_output"):
        validate(json.dumps(output), source)
