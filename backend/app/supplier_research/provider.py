"""Fixed-endpoint Tavily search adapter. Search results are URL discovery only."""
import json
import threading
import time

import httpx

from app.settings import Settings


SEARCH_URL = "https://api.tavily.com/search"


class TavilySearch:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings()

    def search(self, *, query: str, deadline: float | None = None) -> dict:
        key = self.settings.tavily_api_key
        if key is None:
            raise RuntimeError("search_unavailable")
        body = {
            "api_key": key.get_secret_value(),
            "query": query,
            "auto_parameters": False,
            "topic": "general",
            "search_depth": "basic",
            "country": "singapore",
            "include_answer": False,
            "include_raw_content": False,
            "max_results": 3,
        }
        started = time.monotonic()
        request_deadline = started + 10.0 if deadline is None else min(started + 10.0, deadline)
        timeout = request_deadline - started
        if timeout <= 0:
            raise RuntimeError("search_unavailable")
        try:
            with httpx.Client(timeout=httpx.Timeout(timeout), follow_redirects=False, trust_env=False) as client:
                # Read a bounded streaming response and enforce a wall-clock cap
                # even if the peer keeps the connection alive by trickling bytes.
                timer = threading.Timer(timeout, client.close)
                timer.daemon = True
                timer.start()
                try:
                    with client.stream("POST", SEARCH_URL, json=body,
                            headers={"Accept": "application/json", "Accept-Encoding": "identity"}) as response:
                        response.raise_for_status()
                        if response.headers.get("content-encoding", "identity").lower() not in {"", "identity"}:
                            raise RuntimeError("search_unavailable")
                        chunks, size = [], 0
                        for chunk in response.iter_raw():
                            if time.monotonic() >= request_deadline:
                                raise RuntimeError("search_unavailable")
                            size += len(chunk)
                            if size > 100_000:
                                raise RuntimeError("search_unavailable")
                            chunks.append(chunk)
                    value = json.loads(b"".join(chunks))
                    if time.monotonic() >= request_deadline:
                        raise RuntimeError("search_unavailable")
                finally:
                    timer.cancel()
        except (httpx.HTTPError, ValueError):
            raise RuntimeError("search_unavailable") from None
        if not isinstance(value, dict) or not isinstance(value.get("results"), list):
            raise RuntimeError("search_unavailable")
        return value
