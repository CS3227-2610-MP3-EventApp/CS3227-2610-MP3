from datetime import datetime
from typing import Annotated, Literal
import unicodedata
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator, model_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


def clean_text(value: str, *, maximum: int, allow_empty: bool = False) -> str:
    if not isinstance(value, str):
        raise ValueError("Text must be a string")
    value = value.strip()
    if (not allow_empty and not value) or len(value) > maximum:
        raise ValueError("Text is outside its allowed length")
    if any(unicodedata.category(char) == "Cc" and char not in "\n\r\t" for char in value):
        raise ValueError("Control characters are not allowed")
    return value


def identifier(value):
    if isinstance(value, UUID):
        return value
    if isinstance(value, str):
        try:
            return UUID(value)
        except ValueError as exc:
            raise ValueError("Invalid identifier") from exc
    raise ValueError("Invalid identifier")


Identifier = Annotated[UUID, BeforeValidator(identifier)]
Brief = Annotated[str, Field(min_length=1, max_length=2000)]
Creative = Annotated[str, Field(min_length=1, max_length=4000)]


class CreatePromotionalConcept(Input):
    requestId: Identifier
    expectedEventRevision: Annotated[int, Field(strict=True, ge=1)]
    expectedSetupRevision: Annotated[int | None, Field(strict=True, ge=1)]
    brief: Brief
    factFields: Annotated[list[Literal[
        "event.title", "event.startsAt", "event.endsAt", "event.timezone",
        "setup.boothLabel", "setup.setupInstructions"]], Field(max_length=6)]
    dataSharingConfirmed: Literal[True]

    @field_validator("dataSharingConfirmed", mode="before")
    @classmethod
    def require_true_boolean(cls, value):
        if value is not True:
            raise ValueError("Explicit data-sharing confirmation is required")
        return value

    @field_validator("brief", mode="before")
    @classmethod
    def trim_brief(cls, value):
        return clean_text(value, maximum=2000)

    @field_validator("factFields")
    @classmethod
    def unique_fields(cls, values):
        if len(set(values)) != len(values):
            raise ValueError("Fact fields must be unique")
        return values


class Freebie(Input):
    name: Annotated[str, Field(min_length=1, max_length=120)]
    description: Annotated[str, Field(min_length=1, max_length=500)]

    @field_validator("name", "description", mode="before")
    @classmethod
    def trim(cls, value, info):
        return clean_text(value, maximum=120 if info.field_name == "name" else 500)


class PromotionalCreative(Input):
    posterCopySuggestions: Annotated[list[Creative], Field(max_length=5)]
    freebieConcepts: Annotated[list[Freebie], Field(max_length=10)]
    layoutBrief: Annotated[str, Field(min_length=1, max_length=4000)]

    @field_validator("posterCopySuggestions")
    @classmethod
    def validate_copy(cls, values):
        if len(values) > 5:
            raise ValueError("Too many poster suggestions")
        return [clean_text(value, maximum=4000) for value in values]

    @field_validator("layoutBrief")
    @classmethod
    def validate_layout(cls, value):
        return clean_text(value, maximum=4000, allow_empty=True)

    @model_validator(mode="after")
    def provider_minimum(self):
        if not self.posterCopySuggestions or not self.freebieConcepts or not self.layoutBrief:
            raise ValueError("Generated suggestions must contain all three creative sections")
        return self


class ReplacePromotionalConcept(Input):
    expectedRevision: Annotated[int, Field(strict=True, ge=1)]
    posterCopySuggestions: Annotated[list[Creative], Field(max_length=5)]
    freebieConcepts: Annotated[list[Freebie], Field(max_length=10)]
    layoutBrief: Annotated[str, Field(max_length=4000)]

    @field_validator("posterCopySuggestions")
    @classmethod
    def validate_copy(cls, values):
        return [clean_text(value, maximum=4000) for value in values]

    @field_validator("layoutBrief")
    @classmethod
    def validate_layout(cls, value):
        return clean_text(value, maximum=4000, allow_empty=True)


class FactField(BaseModel):
    model_config = ConfigDict(extra="forbid")
    field: str
    value: str | None
    observedRevision: int


class RefreshPromotionalFacts(Input):
    expectedRevision: Annotated[int, Field(strict=True, ge=1)]
    expectedEventRevision: Annotated[int, Field(strict=True, ge=1)]
    expectedSetupRevision: Annotated[int | None, Field(strict=True, ge=1)]
    factFields: Annotated[list[Literal[
        "event.title", "event.startsAt", "event.endsAt", "event.timezone",
        "setup.boothLabel", "setup.setupInstructions"]], Field(max_length=6)]

    @field_validator("factFields")
    @classmethod
    def unique_fields(cls, values):
        if len(set(values)) != len(values):
            raise ValueError("Fact fields must be unique")
        return values


class SourceFact(BaseModel):
    field: str
    value: str | None
    observedRevision: int
    currentRevision: int | None
    status: Literal["current", "stale", "unavailable"]


class PromotionalConceptView(BaseModel):
    id: UUID
    participationId: UUID
    revision: int
    sourceRevisions: dict[str, int | None]
    factFields: list[str]
    sourceFacts: list[SourceFact]
    posterCopySuggestions: list[str]
    freebieConcepts: list[Freebie]
    layoutBrief: str
    createdAt: datetime
    updatedAt: datetime


class BusinessPromotionalConceptJob(BaseModel):
    id: UUID
    eventId: UUID
    participationId: UUID
    state: Literal["pending", "running", "completed", "failed", "cancelled"]
    createdAt: datetime
    updatedAt: datetime
    completedAt: datetime | None
    failureCode: str | None
    providerMayHaveRun: bool
    concept: PromotionalConceptView | None


class PromotionalConceptHistory(BaseModel):
    items: list[PromotionalConceptView]
    total: int
    limit: int
    offset: int
    latestJob: BusinessPromotionalConceptJob | None


class PromotionalProblem(BaseModel):
    type: Literal["about:blank"] = "about:blank"
    title: str
    status: int
    detail: str
    instance: str
    code: str
