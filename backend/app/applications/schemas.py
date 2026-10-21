from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator

from app.auth.schemas import Email, text_value


def uuid_value(value):
    if isinstance(value, UUID):
        return value
    if not isinstance(value, str):
        raise ValueError("Invalid identifier")
    return UUID(value)


Identifier = Annotated[UUID, BeforeValidator(uuid_value)]
Revision = Annotated[int, Field(strict=True, ge=1)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class ApplicationContent(Input):
    participantType: Literal["exhibitor", "vendor"]
    description: Annotated[str, BeforeValidator(lambda v: text_value(v).strip()), Field(min_length=1, max_length=5000)]
    requestedSpace: Annotated[str, BeforeValidator(lambda v: text_value(v).strip()), Field(min_length=1, max_length=500)]
    contactName: Annotated[str, BeforeValidator(lambda v: text_value(v).strip()), Field(min_length=1, max_length=100)]
    contactEmail: Email


class ApprovalRequest(Input):
    businessId: Identifier


class CreateApplication(ApplicationContent):
    businessId: Identifier
    eventId: Identifier


class ReplaceApplication(ApplicationContent):
    expectedRevision: Revision


class SubmitApplication(Input):
    expectedRevision: Revision


class UpdateApplicationSettings(Input):
    expectedRevision: Revision
    applicationsOpen: bool


class DecideApplication(Input):
    expectedRevision: Revision
    outcome: Literal["accepted", "rejected"]
    reason: str | None = Field(default=None, validate_default=True)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value, info):
        value = value.strip() if value is not None else None
        if value is not None and len(value) > 1000:
            raise ValueError("Invalid reason")
        if info.data.get("outcome") == "rejected" and not value:
            raise ValueError("A rejection reason is required")
        return value or None


class ApplicationSettings(BaseModel):
    eventId: UUID
    applicationsOpen: bool
    revision: int


class ApplicationEligibility(BaseModel):
    id: UUID
    eventId: UUID
    businessId: UUID
    approvedAt: datetime


class ApplicationEvent(BaseModel):
    eventId: UUID
    title: str
    timezone: str
    startsAt: datetime
    endsAt: datetime
    eventRevision: int
    applicationsOpen: bool
    settingsRevision: int
    applicationId: UUID | None


class OrganiserEventSummary(BaseModel):
    eventId: UUID
    title: str
    timezone: str
    startsAt: datetime
    endsAt: datetime
    eventRevision: int
    applicationsOpen: bool
    settingsRevision: int


class Decision(BaseModel):
    outcome: Literal["accepted", "rejected"]
    reason: str | None
    decidedAt: datetime


class BusinessApplication(BaseModel):
    id: UUID
    businessId: UUID
    businessName: str
    eventId: UUID
    eventTitle: str
    participationId: UUID
    status: Literal["draft", "submitted", "accepted", "rejected"]
    revision: int
    content: ApplicationContent
    frozenSubmittedContentRevision: int | None
    submittedAt: datetime | None
    decision: Decision | None


class FieldError(BaseModel):
    field: str
    code: Literal["invalid"] = "invalid"


class ApplicationProblem(BaseModel):
    type: Literal["about:blank"] = "about:blank"
    title: str
    status: int
    detail: str
    instance: str
    code: str
    fieldErrors: list[FieldError] | None = None
    currentApplication: BusinessApplication | None = None
