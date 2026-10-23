from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator, model_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


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


def calendar_date(value):
    if value is None or isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            parsed = date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("Invalid date") from exc
        if parsed.isoformat() == value:
            return parsed
    raise ValueError("Invalid date")


OptionalDate = Annotated[date | None, BeforeValidator(calendar_date)]


def normalize_needs(value):
    if not isinstance(value, str):
        raise ValueError("Invalid needs")
    return value.strip()


Needs = Annotated[str, BeforeValidator(normalize_needs), Field(min_length=1, max_length=2000)]
SelectionIds = Annotated[list[Identifier], Field(max_length=200)]


class CreatePreparationDraft(Input):
    requestId: Identifier
    expectedPreparationRevision: Annotated[int, Field(strict=True, ge=1)]
    expectedSetupRevision: Annotated[int, Field(strict=True, ge=1)]
    expectedEventRevision: Annotated[int, Field(strict=True, ge=1)]
    needs: Needs
    selectedTaskIds: SelectionIds
    selectedLineIds: SelectionIds
    dataSharingConfirmed: Annotated[bool | None, Field(strict=True)] = None
    syntheticDataConfirmed: Literal[True] | None = None

    @field_validator("syntheticDataConfirmed", mode="before")
    @classmethod
    def explicit_confirmation(cls, value):
        if value is not True:
            raise ValueError("Explicit confirmation is required")
        return value

    @model_validator(mode="after")
    def unique_selections(self):
        if (self.dataSharingConfirmed is True) == (self.syntheticDataConfirmed is True):
            raise ValueError("Confirm AI data sharing")
        if len(set(self.selectedTaskIds)) != len(self.selectedTaskIds):
            raise ValueError("Duplicate task selection")
        if len(set(self.selectedLineIds)) != len(self.selectedLineIds):
            raise ValueError("Duplicate line selection")
        return self


class EventSourceFacts(Input):
    title: str
    startsAt: str
    endsAt: str
    timezone: str


class SetupSourceFacts(Input):
    boothLabel: str | None
    setupInstructions: str | None


class SourceFacts(Input):
    event: EventSourceFacts
    setup: SetupSourceFacts


class GeneratedTask(Input):
    title: Annotated[str, Field(min_length=1, max_length=160)]

    @field_validator("title", mode="before")
    @classmethod
    def trim(cls, value):
        if not isinstance(value, str):
            raise ValueError("Invalid title")
        value = value.strip()
        if not value:
            raise ValueError("Invalid title")
        return value


class GeneratedLine(Input):
    description: Annotated[str, Field(min_length=1, max_length=160)]
    quantity: Annotated[int, Field(strict=True, ge=1, le=1_000_000)]
    unitPriceMinorUnits: Annotated[int | None, Field(strict=True, ge=0, le=100_000_000_000)]

    @field_validator("description", mode="before")
    @classmethod
    def trim(cls, value):
        if not isinstance(value, str):
            raise ValueError("Invalid description")
        value = value.strip()
        if not value:
            raise ValueError("Invalid description")
        return value


class PreparationGenerationOutput(Input):
    sourceFacts: SourceFacts
    tasks: Annotated[list[GeneratedTask], Field(max_length=20)]
    lines: Annotated[list[GeneratedLine], Field(max_length=20)]


class DraftTaskInput(Input):
    title: Annotated[str, Field(min_length=1, max_length=160)]
    status: Literal["not_started", "in_progress", "done"]
    dueDate: OptionalDate

    @field_validator("title", mode="before")
    @classmethod
    def trim(cls, value):
        if not isinstance(value, str):
            raise ValueError("Invalid title")
        value = value.strip()
        if not value:
            raise ValueError("Invalid title")
        return value


class DraftLineInput(Input):
    category: Annotated[str | None, Field(max_length=80)] = None

    @field_validator("category", mode="before")
    @classmethod
    def category_text(cls, value):
        if value is None: return None
        if not isinstance(value,str) or not value.strip(): raise ValueError("Invalid category")
        return value.strip()

    description: Annotated[str, Field(min_length=1, max_length=160)]
    quantity: Annotated[int, Field(strict=True, ge=1, le=1_000_000)]
    unitPriceMinorUnits: Annotated[int | None, Field(strict=True, ge=0, le=100_000_000_000)]
    priceBasis: Literal["unknown", "estimate", "quotation"]
    quotationBasis: Annotated[str | None, Field(max_length=500)]

    @field_validator("description", mode="before")
    @classmethod
    def trim_description(cls, value):
        if not isinstance(value, str):
            raise ValueError("Invalid description")
        value = value.strip()
        if not value:
            raise ValueError("Invalid description")
        return value

    @field_validator("quotationBasis", mode="before")
    @classmethod
    def trim_basis(cls, value):
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("Invalid quotation basis")
        return value.strip()

    @model_validator(mode="after")
    def valid_price_basis(self):
        if self.unitPriceMinorUnits is None and self.priceBasis != "unknown":
            raise ValueError("Unknown prices require the unknown basis")
        if self.unitPriceMinorUnits is not None and self.priceBasis == "unknown":
            raise ValueError("Known prices require an estimate or quotation")
        if self.priceBasis == "quotation":
            if not self.quotationBasis:
                raise ValueError("A quotation requires its basis")
        elif self.quotationBasis is not None:
            raise ValueError("Only quotations have a quotation basis")
        return self


class DraftBudgetInput(Input):
    currency: Literal["SGD"]
    lines: Annotated[list[DraftLineInput], Field(max_length=200)]


class ReplacePreparationDraft(Input):
    expectedRevision: Annotated[int, Field(strict=True, ge=1)]
    tasks: Annotated[list[DraftTaskInput], Field(max_length=200)]
    budget: DraftBudgetInput


class PreparationDraftView(BaseModel):
    id: UUID
    jobId: UUID
    participationId: UUID
    revision: int
    sourceRevisions: dict[str, int]
    sourceFacts: SourceFacts
    tasks: list[DraftTaskInput]
    budget: dict
    createdAt: datetime
    adoptedAt: datetime | None
    adoptedPreparationRevision: int | None


class BusinessPreparationJob(BaseModel):
    id: UUID
    eventId: UUID
    participationId: UUID
    state: Literal["pending", "running", "completed", "failed", "cancelled"]
    createdAt: datetime
    updatedAt: datetime
    completedAt: datetime | None
    failureCode: str | None
    providerMayHaveRun: bool
    draft: PreparationDraftView | None


class PreparationDraftHistory(BaseModel):
    items: list[PreparationDraftView]
    total: int
    limit: int
    offset: int
    latestJob: BusinessPreparationJob | None


class AdoptPreparationDraft(Input):
    expectedDraftRevision: Annotated[int, Field(strict=True, ge=1)]
    expectedPreparationRevision: Annotated[int, Field(strict=True, ge=1)]
    expectedSetupRevision: Annotated[int, Field(strict=True, ge=1)]
    expectedEventRevision: Annotated[int, Field(strict=True, ge=1)]
    taskIndexes: Annotated[list[Annotated[int, Field(strict=True, ge=0)]], Field(max_length=200)]
    lineIndexes: Annotated[list[Annotated[int, Field(strict=True, ge=0)]], Field(max_length=200)]

    @model_validator(mode="after")
    def valid_selection(self):
        if not self.taskIndexes and not self.lineIndexes:
            raise ValueError("Select at least one item")
        if len(set(self.taskIndexes)) != len(self.taskIndexes) or len(set(self.lineIndexes)) != len(self.lineIndexes):
            raise ValueError("Duplicate selected index")
        return self


from app.preparation.schemas import PreparationView


class AdoptionResult(BaseModel):
    draft: PreparationDraftView
    preparation: PreparationView
