from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator, model_validator
from typing import Annotated


def uuid_value(value):
    if isinstance(value, UUID):
        return value
    if isinstance(value, str):
        return UUID(value)
    raise ValueError("Invalid identifier")


Identifier = Annotated[UUID, BeforeValidator(uuid_value)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class AnalysisCriterion(Input):
    id: str = Field(pattern=r"^[a-z][a-z0-9-]{0,39}$")
    title: str = Field(min_length=1, max_length=100)
    instructions: str = Field(min_length=1, max_length=1000)

    @field_validator("title", "instructions")
    @classmethod
    def trimmed(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class AnalysisRubric(Input):
    eventId: UUID
    revision: int
    criteria: list[AnalysisCriterion]


class ReplaceAnalysisRubric(Input):
    expectedRevision: int = Field(ge=0)
    criteria: list[AnalysisCriterion] = Field(min_length=1, max_length=10)

    @field_validator("criteria")
    @classmethod
    def unique_ids(cls, values):
        if len({item.id for item in values}) != len(values):
            raise ValueError("criterion IDs must be unique")
        return values


class CreateAnalysis(Input):
    requestId: Identifier
    expectedRubricRevision: int = Field(ge=1)
    expectedSubmittedRevision: int = Field(ge=1)
    dataSharingConfirmed: Annotated[bool | None, Field(strict=True)] = None
    syntheticDataConfirmed: Literal[True] | None = None

    @field_validator("syntheticDataConfirmed", mode="before")
    @classmethod
    def strict_legacy_ack(cls,value):
        if value is not True: raise ValueError("Explicit acknowledgement required")
        return value

    @model_validator(mode="after")
    def acknowledgement(self):
        if (self.dataSharingConfirmed is True) == (self.syntheticDataConfirmed is True):
            raise ValueError("Provide one explicit data-sharing acknowledgement")
        return self



class AnalysisEvidence(Input):
    sourceLabel: str
    field: Literal["participantType", "description"]
    quote: str = Field(min_length=1, max_length=500)

    @field_validator("quote")
    @classmethod
    def quote_not_blank(cls, value):
        if not value.strip():
            raise ValueError("quote must not be blank")
        return value


class AnalysisFinding(Input):
    criterionId: str
    status: Literal["supported", "concern", "insufficient_evidence"]
    explanation: str = Field(min_length=1, max_length=2000)
    evidence: list[AnalysisEvidence] = Field(max_length=10)

    @field_validator("explanation")
    @classmethod
    def explanation_not_blank(cls, value):
        if not value.strip():
            raise ValueError("explanation must not be blank")
        return value


class AnalysisDuplicateFlag(Input):
    sourceLabel: str
    explanation: str = Field(min_length=1, max_length=2000)
    evidence: list[AnalysisEvidence] = Field(min_length=1, max_length=10)

    @field_validator("explanation")
    @classmethod
    def explanation_not_blank(cls, value):
        if not value.strip():
            raise ValueError("explanation must not be blank")
        return value


class AnalysisPayload(Input):
    findings: list[AnalysisFinding]
    duplicateFlags: list[AnalysisDuplicateFlag] = Field(max_length=5)


class AnalysisComparison(Input):
    applicationId: Identifier
    sourceRevision: int
    sourceLabel: str
    similarity: float


class AnalysisReport(Input):
    id: UUID
    createdAt: datetime
    sourceRevision: int
    rubricRevision: int
    comparisonRevisions: list[AnalysisComparison]
    stale: bool
    payload: AnalysisPayload


class AnalysisJob(Input):
    id: UUID
    eventId: UUID
    applicationId: UUID
    state: Literal["pending", "running", "completed", "failed", "cancelled"]
    createdAt: datetime
    updatedAt: datetime
    completedAt: datetime | None
    failureCode: str | None
    providerMayHaveRun: bool
    report: AnalysisReport | None


class AnalysisHistory(Input):
    items: list[AnalysisReport]
    total: int
    limit: int
    offset: int
    latestJob: AnalysisJob | None


class AnalysisProblem(BaseModel):
    type: Literal["about:blank"] = "about:blank"
    title: str
    status: int
    detail: str
    instance: str
    code: str
    fieldErrors: list[dict[str, str]] | None = None
