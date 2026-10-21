from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


def nullable_text(value):
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("Text must be a string or null")
    return value.strip() or None


BoothLabel = Annotated[str | None, BeforeValidator(nullable_text)]
SetupInstructions = Annotated[str | None, BeforeValidator(nullable_text)]
Revision = Annotated[int, Field(strict=True, ge=1)]


class SaveSetup(Input):
    expectedRevision: Revision
    boothLabel: BoothLabel
    setupInstructions: SetupInstructions

    @field_validator("boothLabel")
    @classmethod
    def booth_label_length(cls, value):
        if value is not None and len(value) > 100:
            raise ValueError("Text exceeds maximum length")
        return value

    @field_validator("setupInstructions")
    @classmethod
    def setup_instructions_length(cls, value):
        if value is not None and len(value) > 5000:
            raise ValueError("Text exceeds maximum length")
        return value


class SetupDetails(BaseModel):
    participationId: UUID
    eventId: UUID
    revision: int
    boothLabel: str | None
    setupInstructions: str | None
    updatedAt: datetime | None


class SetupProblem(BaseModel):
    type: Literal["about:blank"] = "about:blank"
    title: str
    status: int
    detail: str
    instance: str
    code: str
    fieldErrors: list[dict[str, str]] | None = None
    currentRevision: int | None = None
