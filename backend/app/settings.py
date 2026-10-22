from typing import Literal
from urllib.parse import urlsplit
import re
import json
from uuid import UUID

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    environment: Literal["development", "test", "production"] = "development"
    trusted_origins: list[str] = Field(default_factory=lambda: [
        "http://localhost:5173", "http://127.0.0.1:5173",
    ])
    ai_enabled: bool = False
    f02_planning_enabled: bool = False
    ai_synthetic_only: bool = False
    ai_synthetic_event_ids: str = "[]"
    soclaas_api_key: SecretStr | None = None
    soclaas_model: str | None = None
    soclaas_requests_per_minute: int = Field(default=30, ge=1, le=90)

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def validate_origins(self):
        if self.environment == "production" and "trusted_origins" not in self.model_fields_set:
            raise ValueError("Production requires explicit trusted origins")
        if not self.trusted_origins:
            raise ValueError("Trusted origins cannot be empty")
        for origin in self.trusted_origins:
            parsed = urlsplit(origin)
            if (parsed.scheme not in {"http", "https"} or not parsed.hostname
                    or parsed.username is not None or parsed.password is not None
                    or parsed.path or parsed.query or parsed.fragment or "*" in origin
                    or any(c.isspace() for c in origin)
                    or not re.fullmatch(r"https?://(?:\[[0-9a-fA-F:]+\]|[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?)(?::[0-9]{1,5})?", origin)):
                raise ValueError("Trusted origins must be exact HTTP origins")
            parsed.port  # Reject invalid port syntax.
            if self.environment == "production" and parsed.scheme != "https":
                raise ValueError("Production origins require HTTPS")
        return self

    @property
    def synthetic_event_ids(self) -> set[UUID]:
        try:
            values = json.loads(self.ai_synthetic_event_ids)
            if not isinstance(values, list):
                raise ValueError
            return {UUID(value) for value in values}
        except (ValueError, TypeError, AttributeError) as exc:
            raise ValueError("AI_SYNTHETIC_EVENT_IDS must be a JSON UUID list") from exc
