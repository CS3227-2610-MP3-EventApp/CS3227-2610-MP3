"""Developer-owned transport checks; no database or real provider requests."""
import httpx
import pytest

from app.ai.provider import BASE_URL, ProviderFailure, SoCLaaSProvider
from app.settings import Settings


def settings(**overrides):
    return Settings(**{
        "database_url": "postgresql+psycopg://eventapp:eventapp@127.0.0.1:1/eventapp",
        "environment": "test", "ai_enabled": True, "ai_synthetic_only": True,
        "soclaas_api_key": "synthetic-only-key", "soclaas_model": "synthetic-model",
        **overrides,
    })


def transport(monkeypatch, completion=None, status=200):
    requests, options = [], []
    original = httpx.AsyncClient

    def respond(request):
        requests.append(request)
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json={"data": [{"id": "synthetic-model"}]})
        return httpx.Response(status, json=completion or {"choices": [{"finish_reason": "stop", "message": {"content": '{"findings":[],"duplicateFlags":[]}'}}]})

    def client(**kwargs):
        options.append(kwargs)
        return original(transport=httpx.MockTransport(respond), **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", client)
    return requests, options


def test_transport_uses_only_fixed_host_and_bounded_tool_free_request(monkeypatch):
    import json
    requests, options = transport(monkeypatch)
    provider = SoCLaaSProvider(settings())
    messages = [{"role": "user", "content": "Invented example"}]
    assert provider.complete(messages) == '{"findings":[],"duplicateFlags":[]}'
    assert [str(request.url) for request in requests] == [BASE_URL + "/models", BASE_URL + "/chat/completions"]
    assert all(request.headers["authorization"] == "Bearer synthetic-only-key" for request in requests)
    assert all(option["trust_env"] is False and option["follow_redirects"] is False for option in options)
    body = json.loads(requests[-1].content)
    assert body == {"model": "synthetic-model", "messages": messages, "max_tokens": 4000, "temperature": 0.2}
    provider.complete(messages)
    assert len([request for request in requests if request.url.path.endswith("/models")]) == 1


@pytest.mark.parametrize("overrides", [{"ai_enabled": False}, {"ai_synthetic_only": False}, {"soclaas_api_key": None}, {"environment": "production", "trusted_origins": ["https://example.test"]}])
def test_disabled_or_production_transport_never_sends(monkeypatch, overrides):
    requests, _ = transport(monkeypatch)
    with pytest.raises(ProviderFailure, match="configuration"):
        SoCLaaSProvider(settings(**overrides)).complete([{"role": "user", "content": "Invented"}])
    assert not requests


def test_oversize_prompt_fails_before_any_outbound_call(monkeypatch):
    requests, _ = transport(monkeypatch)
    with pytest.raises(ProviderFailure, match="oversized_input"):
        SoCLaaSProvider(settings()).complete([{"role": "user", "content": "x" * 40_001}])
    assert not requests


@pytest.mark.parametrize("choice", [
    {"finish_reason": "length", "message": {"content": "{}"}},
    {"message": {"content": "{}", "tool_calls": [{"function": {"name": "decide"}}]}},
    {"message": {"content": "{}", "function_call": {"name": "decide"}}},
    {"message": {"content": "x" * 40_001}},
    {"message": {"content": None}},
])
def test_invalid_or_tool_bearing_completions_fail_closed(monkeypatch, choice):
    transport(monkeypatch, {"choices": [choice]})
    with pytest.raises(ProviderFailure, match="invalid_output"):
        SoCLaaSProvider(settings()).complete([{"role": "user", "content": "Invented"}])


def test_model_unavailable_fails_before_chat_request(monkeypatch):
    requests, _ = transport(monkeypatch)
    with pytest.raises(ProviderFailure, match="configuration"):
        SoCLaaSProvider(settings(soclaas_model="unavailable-model")).complete([{"role": "user", "content": "Invented"}])
    assert len(requests) == 1 and requests[0].url.path.endswith("/models")


def test_http_failure_is_available_for_worker_classification_without_body_logging(monkeypatch, caplog):
    transport(monkeypatch, status=429)
    with pytest.raises(httpx.HTTPStatusError) as failure:
        SoCLaaSProvider(settings()).complete([{"role": "user", "content": "Invented"}])
    assert failure.value.response.status_code == 429
    assert "synthetic-only-key" not in caplog.text


def test_expired_job_deadline_prevents_any_provider_request(monkeypatch):
    from datetime import datetime, timedelta, timezone
    requests, _ = transport(monkeypatch)
    with pytest.raises(ProviderFailure, match="job_timeout"):
        SoCLaaSProvider(settings()).complete([{"role": "user", "content": "Invented"}],
            deadline=datetime.now(timezone.utc) - timedelta(seconds=1))
    assert not requests


def test_remaining_job_budget_caps_model_and_completion_requests(monkeypatch):
    from datetime import datetime, timedelta, timezone
    _, options = transport(monkeypatch)
    SoCLaaSProvider(settings()).complete([{"role": "user", "content": "Invented"}],
        deadline=datetime.now(timezone.utc) + timedelta(seconds=0.5))
    assert len(options) == 2
    assert all(0 < option["timeout"] <= 0.5 for option in options)
