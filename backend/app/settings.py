from typing import Literal
from urllib.parse import urlsplit
import re

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    environment: Literal["development", "test", "production"] = "development"
    trusted_origins: list[str] = Field(default_factory=lambda: [
        "http://localhost:5173", "http://127.0.0.1:5173",
    ])

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
