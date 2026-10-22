from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, StrictStr, field_validator

Constraint = Literal["overlap", "budget", "accessibility"]


class GenerateItinerary(BaseModel):
    model_config = ConfigDict(extra="forbid")
    requestId: UUID
    preferenceRevision: Annotated[StrictInt, Field(ge=0)]
    confirmSynthetic: StrictBool

    @field_validator("confirmSynthetic")
    @classmethod
    def must_confirm(cls, value):
        if value is not True:
            raise ValueError("Synthetic data must be confirmed")
        return value


class ItineraryJobView(BaseModel):
    id: UUID
    eventId: UUID
    state: Literal["pending", "running", "completed", "failed", "cancelled"]
    createdAt: datetime
    updatedAt: datetime
    completedAt: datetime | None
    failureCode: str | None
    providerMayHaveRun: bool
    result: dict | None


class ModelItem(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    itemId: UUID
    itemRevision: StrictInt
    startsAt: datetime
    endsAt: datetime
    reason: StrictStr = Field(max_length=500)


class ModelBlocking(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    constraint: Constraint
    detail: StrictStr = Field(max_length=500)


class ModelFeasible(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    outcome: Literal["feasible"]
    items: Annotated[list[ModelItem], Field(min_length=1, max_length=100)]


class ModelInfeasible(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    outcome: Literal["infeasible"]
    blockingConstraints: Annotated[list[ModelBlocking], Field(min_length=1, max_length=10)]


QuestionField = Literal["title", "type", "startsAt", "endsAt", "room", "venueName", "venueAddress", "price",
                        "capacity", "accessibility", "state", "cancellationReason"]
UnknownReason = Literal["insufficient_evidence", "conflicting_evidence", "out_of_scope"]


class AskQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    requestId: UUID
    question: Annotated[StrictStr, Field(max_length=2000)]


class QuestionJobView(BaseModel):
    id: UUID
    eventId: UUID
    state: Literal["pending", "running", "completed", "failed", "cancelled"]
    createdAt: datetime
    updatedAt: datetime
    completedAt: datetime | None
    failureCode: str | None
    providerMayHaveRun: bool
    question: str
    stale: bool
    result: dict | None


class RawClaim(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    itemId: UUID
    itemRevision: StrictInt
    field: QuestionField
    value: StrictStr | StrictInt | None


class RawAnswered(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    outcome: Literal["answered"]
    summary: StrictStr | None
    claims: Annotated[list[RawClaim], Field(min_length=1, max_length=20)]


class RawUnknown(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    outcome: Literal["unknown"]
    reason: UnknownReason
