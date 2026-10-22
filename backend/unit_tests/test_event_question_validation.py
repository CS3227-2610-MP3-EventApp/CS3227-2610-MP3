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
