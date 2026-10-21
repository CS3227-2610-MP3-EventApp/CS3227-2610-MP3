"""Bounded, tool-free SoCLaaS transport. No request/response bodies are logged."""
import asyncio
import json
from datetime import datetime, timezone
from threading import Lock

import httpx

from app.settings import Settings

BASE_URL = "https://soclaas-api.comp.nus.edu.sg/v1"


class ProviderFailure(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


class SoCLaaSProvider:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings()
        self._verified = False
        self._verification_lock = Lock()

    def _enabled(self):
        settings = self.settings
        if (settings.environment == "production" or not settings.ai_enabled
                or not settings.ai_synthetic_only or not settings.soclaas_api_key):
            raise ProviderFailure("configuration")

    async def _request(self, path: str, body: dict | None = None, deadline: datetime | None = None):
        self._enabled()
        key = self.settings.soclaas_api_key.get_secret_value()
        remaining = 60.0 if deadline is None else min(60.0, (deadline - datetime.now(timezone.utc)).total_seconds())
        if remaining <= 0:
            raise ProviderFailure("job_timeout")
        try:
            async with asyncio.timeout(remaining):
                async with httpx.AsyncClient(timeout=remaining, follow_redirects=False, trust_env=False) as client:
                    async with client.stream("GET" if body is None else "POST", BASE_URL + path,
                                             headers={"Authorization": f"Bearer {key}"}, json=body) as response:
                        response.raise_for_status()
                        chunks = bytearray()
                        async for chunk in response.aiter_bytes():
                            chunks.extend(chunk)
                            if len(chunks) > 262_144:
                                raise ProviderFailure("invalid_output")
                        return json.loads(chunks)
        except (TimeoutError, httpx.TimeoutException):
            raise ProviderFailure("timeout") from None
        except (ValueError, UnicodeError):
            raise ProviderFailure("invalid_output") from None

    def models(self, deadline: datetime | None = None) -> list[str]:
        document = asyncio.run(self._request("/models", deadline=deadline))
        if not isinstance(document, dict) or not isinstance(document.get("data"), list):
            raise ProviderFailure("invalid_output")
        return [item["id"] for item in document["data"]
                if isinstance(item, dict) and isinstance(item.get("id"), str)]

    def verify_model(self, deadline: datetime | None = None):
        remaining = 60.0 if deadline is None else min(60.0, (deadline - datetime.now(timezone.utc)).total_seconds())
        if not self._verification_lock.acquire(timeout=max(0, remaining)):
            raise ProviderFailure("timeout")
        try:
            if not self._verified:
                if not self.settings.soclaas_model or self.settings.soclaas_model not in self.models(deadline):
                    raise ProviderFailure("configuration")
                self._verified = True
        finally:
            self._verification_lock.release()

    def complete(self, messages: list[dict[str, str]], *, deadline: datetime | None = None) -> str:
        self._enabled()
        if sum(len(message["content"]) for message in messages) > 40_000:
            raise ProviderFailure("oversized_input")
        self.verify_model(deadline)
        document = asyncio.run(self._request("/chat/completions", {
            "model": self.settings.soclaas_model, "messages": messages,
            "max_tokens": 4000, "temperature": 0.2,
        }, deadline=deadline))
        if not isinstance(document, dict):
            raise ProviderFailure("invalid_output")
        choices = document.get("choices")
        if not isinstance(choices, list) or len(choices) != 1 or not isinstance(choices[0], dict):
            raise ProviderFailure("invalid_output")
        choice = choices[0]
        message = choice.get("message")
        if not isinstance(message, dict) or choice.get("finish_reason") == "length" or message.get("tool_calls") or message.get("function_call"):
            raise ProviderFailure("invalid_output")
        content = message.get("content")
        if not isinstance(content, str) or not content or len(content) > 40_000:
            raise ProviderFailure("invalid_output")
        return content
