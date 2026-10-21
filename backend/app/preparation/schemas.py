from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator, model_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, populate_by_name=True)


def calendar_date(value):
    if value is None or isinstance(value, date):
        return value
    if not isinstance(value, str):
        raise ValueError("Invalid date")
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError("Invalid date") from exc
    if parsed.isoformat() != value:
        raise ValueError("Invalid date")
    return parsed


PreparationDate = Annotated[date | None, Field(default=None)]


def uuid_value(value):
    if value is None or isinstance(value, UUID):
        return value
    if not isinstance(value, str):
        raise ValueError("Invalid identifier")
    try:
        return UUID(value)
    except ValueError as exc:
        raise ValueError("Invalid identifier") from exc


OptionalIdentifier = Annotated[UUID | None, BeforeValidator(uuid_value)]


class TaskInput(Input):
    id: OptionalIdentifier = None
    title: Annotated[str, Field(min_length=1, max_length=160)]
    status: Literal["not_started", "in_progress", "done"]
    dueDate: PreparationDate

    @field_validator("title", mode="before")
    @classmethod
    def trimmed_title(cls, value):
        if not isinstance(value, str):
            raise ValueError("Invalid title")
        value = value.strip()
        if not value:
            raise ValueError("Invalid title")
        return value

    @field_validator("dueDate", mode="before")
    @classmethod
    def parse_due_date(cls, value):
        return calendar_date(value)


class BudgetLineInput(Input):
    id: OptionalIdentifier = None
    description: Annotated[str, Field(min_length=1, max_length=160)]
    quantity: Annotated[int, Field(strict=True, ge=1, le=1_000_000)]
    unitPriceMinorUnits: Annotated[int | None, Field(strict=True, ge=0, le=100_000_000_000)]
    priceBasis: Literal["unknown", "estimate", "quotation"]
    quotationBasis: Annotated[str | None, Field(default=None, max_length=500)]

    @field_validator("description", mode="before")
    @classmethod
    def trimmed_description(cls, value):
        if not isinstance(value, str):
            raise ValueError("Invalid description")
        value = value.strip()
        if not value:
            raise ValueError("Invalid description")
        return value

    @field_validator("quotationBasis", mode="before")
    @classmethod
    def trimmed_quote_basis(cls, value):
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


class BudgetInput(Input):
    currency: Literal["SGD"]
    lines: Annotated[list[BudgetLineInput], Field(max_length=200)]


class ReplacePreparation(Input):
    expectedRevision: Annotated[int, Field(strict=True, ge=1)]
    tasks: Annotated[list[TaskInput], Field(max_length=200)]
    budget: BudgetInput


class TaskView(BaseModel):
    id: UUID
    title: str
    status: Literal["not_started", "in_progress", "done"]
    dueDate: date | None


class BudgetLineView(BaseModel):
    id: UUID
    description: str
    quantity: int
    unitPriceMinorUnits: int | None
    priceBasis: Literal["unknown", "estimate", "quotation"]
    quotationBasis: str | None


class BudgetView(BaseModel):
    currency: Literal["SGD"]
    lines: list[BudgetLineView]
    totalMinorUnits: str | None
    knownSubtotalMinorUnits: str
    isComplete: bool


class PreparationView(BaseModel):
    participationId: UUID
    revision: int
    tasks: list[TaskView]
    budget: BudgetView


class PreparationProblem(BaseModel):
    type: Literal["about:blank"] = "about:blank"
    title: str
    status: int
    detail: str
    instance: str
    code: str
    fieldErrors: list[dict[str, str]] | None = None
    currentRevision: Annotated[int, Field(ge=1)] | None = None
