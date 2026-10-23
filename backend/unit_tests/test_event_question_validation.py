"""Developer-owned checks for event-question cleaning and summary screening; no database or provider."""
import pytest

from app.ai.service import AIError
from app.attendee_ai import questions

GROUNDED = (["Starts at 15:30", 500], ["Evening workshop 42"])


def summary(text):
    return questions._summary(text, *GROUNDED)


def test_cleaning_normalises_after_hidden_characters_are_removed():
    assert questions.clean_question("e\u200b\u0301 open?") == "\u00e9 open?"
    assert questions.clean_question("  What \t\n time\u202e?  ") == "What time?"


@pytest.mark.parametrize("raw", ["", "   ", "\u200b\u202e", "q" * 301])
def test_cleaning_rejects_empty_and_overlong_questions(raw):
    with pytest.raises(AIError):
        questions.clean_question(raw)


@pytest.mark.parametrize("text", [
    "The workshop is free of charge.", "It costs 500 at the evening workshop 42.", "Starts at 15:30 in Room A (north).",
])
def test_plain_grounded_summaries_are_kept(text):
    assert summary(text) == text


@pytest.mark.parametrize("text", [
    "Visit evil.example.com now", "hxxp evil[.]com", "[click](evil.example)", "javascript:alert", "//evil.example",
    "data:text/html", "mail me at a\uff20b.com", "see https://evil.example", "see www.evil.test", "a &lt;b&gt;",
    "<b>bold</b>", "use `code`", "path C:\temp",
    "It costs 600", "Roman \u2162 session", "half \u00bd price", "circled \u2460 slot", "superscript \u00b2",
    "bell\x07 char", "x" * 301, "", "   ",
])
def test_evasive_or_ungrounded_summaries_are_withheld(text):
    assert summary(text) is None


def test_summary_may_use_event_local_times_but_not_iso_timestamps():
    local = ["01 Jan 2027, 10:00"]
    assert questions._summary("test1 starts at 10:00 on 01 Jan 2027", [], ["test1"], local) == "test1 starts at 10:00 on 01 Jan 2027"
    assert questions._summary("test1 starts at 2027-01-01T02:00:00+00:00", ["2027-01-01T02:00:00+00:00"], ["test1"], local) is None
    assert questions._summary("test1 starts at 11:00", [], ["test1"], local) is None


def _fact():
    from datetime import datetime, timezone
    from uuid import uuid4

    from app.programme.schemas import PublishedProgramme

    when = datetime(2027, 1, 1, 2, 0, tzinfo=timezone.utc)
    return PublishedProgramme.model_validate({
        "id": str(uuid4()), "eventId": str(uuid4()), "revision": 2, "state": "published", "title": "test1",
        "type": "talk", "startsAt": when.isoformat(), "endsAt": when.replace(hour=3).isoformat(), "capacity": 5,
        "priceMinorUnits": 0, "currency": "SGD", "accessibilityDetails": None, "publishedAt": when.isoformat(),
        "event": {"id": str(uuid4()), "title": "E", "timezone": "Asia/Singapore", "startsAt": when.isoformat(),
                  "endsAt": when.isoformat()},
        "venue": {"id": str(uuid4()), "name": "V", "address": "A", "accessibilityDetails": None},
        "room": {"id": str(uuid4()), "name": "R", "maxCapacity": 5, "accessibilityDetails": None}})


def _answer(fact, field, value):
    import json
    return json.dumps({"outcome": "answered", "summary": None,
                       "claims": [{"itemId": str(fact.id), "itemRevision": fact.revision, "field": field, "value": value}]})


def test_local_time_claims_are_verified_and_normalised_to_the_real_instant():
    fact = _fact()
    result = questions.validate_output(_answer(fact, "startsAtLocal", "01 Jan 2027, 10:00"), [fact])
    assert result["claims"][0]["field"] == "startsAt" and result["claims"][0]["value"] == fact.startsAt.isoformat()
    assert questions.validate_output(_answer(fact, "endsAtLocal", "01 Jan 2027, 11:00"), [fact])["claims"][0]["field"] == "endsAt"
    for wrong in ("01 Jan 2027, 11:00", "01 Jan 2027, 10:01", "tomorrow", None, 10):
        with pytest.raises(ValueError):
            questions.validate_output(_answer(fact, "startsAtLocal", wrong), [fact])


def test_record_key_names_are_accepted_as_claim_fields_and_still_verified():
    fact = _fact()
    result = questions.validate_output(_answer(fact, "priceMinorUnits", 0), [fact])
    assert (result["claims"][0]["field"], result["claims"][0]["value"]) == ("price", 0)
    result = questions.validate_output(_answer(fact, "accessibilityDetails", None), [fact])
    assert (result["claims"][0]["field"], result["claims"][0]["value"]) == ("accessibility", None)
    for field, wrong in (("priceMinorUnits", 1000), ("priceMinorUnits", "0"), ("accessibilityDetails", "ramp")):
        with pytest.raises(ValueError):
            questions.validate_output(_answer(fact, field, wrong), [fact])


def test_price_text_matches_the_programme_page_and_grounds_summary_digits():
    assert questions.price_text(0) == "Free" and questions.price_text(1000) == "SGD 10.00" and questions.price_text(1250) == "SGD 12.50"
    assert questions._summary("test1 costs SGD 10.00", [1000], ["test1"], ["SGD 10.00"]) == "test1 costs SGD 10.00"
    assert questions._summary("test1 costs SGD 11.00", [1000], ["test1"], ["SGD 10.00"]) is None


def test_other_record_style_field_names_are_verified_like_the_real_fields():
    fact = _fact()
    ok = [("priceText", "Free"), ("roomName", "R"), ("venue", "V"), ("address", "A"), ("start", "01 Jan 2027, 10:00"),
          ("endTime", "01 Jan 2027, 11:00")]
    for field, value in ok:
        assert questions.validate_output(_answer(fact, field, value), [fact])["outcome"] == "answered", field
    bad = [("priceText", "SGD 10.00"), ("priceText", 0), ("roomName", "Other"), ("venue", None), ("start", "10:00"),
           ("endTime", "01 Jan 2027, 12:00")]
    for field, value in bad:
        with pytest.raises(ValueError):
            questions.validate_output(_answer(fact, field, value), [fact])
