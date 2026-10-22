from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, StrictBool, StrictInt, model_validator

from app.auth.schemas import Problem
from app.programme.schemas import PublishedProgramme, trimmed


Revision = Annotated[StrictInt, Field(ge=0)]
PositiveRevision = Annotated[StrictInt, Field(ge=1)]
Money = Annotated[StrictInt, Field(ge=0, le=2147483647)]
IssueCode = Literal["overlap", "minimum_gap", "budget_exceeded", "accessibility_unconfirmed", "stale_programme", "stale_preferences", "empty_itinerary"]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class StateCommand(Input):
    expectedStateRevision: Revision


class PreferenceValues(BaseModel):
    interests: Annotated[str, BeforeValidator(trimmed), Field(max_length=1000)] = ""
    budgetMinorUnits: Money | None = None
    currency: Literal["SGD"] = "SGD"
    accessibilityNeeds: Annotated[str, BeforeValidator(trimmed), Field(max_length=2000)] = ""
    minimumGapMinutes: Annotated[StrictInt, Field(ge=0, le=1440)] = 0


class PreferenceCommand(StateCommand, PreferenceValues):
    pass


class Preferences(PreferenceValues):
    revision: Revision


class DraftInput(Input):
    programmeItemId: UUID
    observedProgrammeRevision: PositiveRevision
    accessibilityConfirmed: StrictBool


class DraftCommand(StateCommand):
    expectedPreferenceRevision: Revision
    items: Annotated[list[DraftInput], Field(max_length=500)]

    @model_validator(mode="after")
    def unique_items(self):
        if len({item.programmeItemId for item in self.items}) != len(self.items):
            raise ValueError("Duplicate programme items are not permitted")
        return self


class AcceptCommand(StateCommand):
    expectedDraftRevision: Revision
    expectedPreferenceRevision: Revision


class Issue(BaseModel):
    code: IssueCode
    itemIds: list[UUID]


class Validation(BaseModel):
    valid: bool
    totalMinorUnits: int
    currency: Literal["SGD"] = "SGD"
    issues: list[Issue]


class DraftItem(BaseModel):
    programmeItemId: UUID
    observedProgrammeRevision: int
    accessibilityConfirmed: bool
    currentItem: PublishedProgramme
    currentProgrammeRevision: int
    changed: bool


class Draft(BaseModel):
    revision: Revision
    preferenceRevision: Revision
    items: list[DraftItem]
    validation: Validation


class AcceptedSummary(BaseModel):
    id: UUID
    version: int
    acceptedAt: datetime


class PlanningState(BaseModel):
    eventId: UUID
    stateRevision: Revision
    preferences: Preferences
    bookmarks: list[UUID]
    draft: Draft
    acceptedVersions: list[AcceptedSummary]
    currentAcceptedVersionId: UUID | None


class AcceptedItem(BaseModel):
    programmeItemId: UUID
    observedProgrammeRevision: int
    accessibilityConfirmed: bool
    acceptedItem: PublishedProgramme
    currentItem: PublishedProgramme | None
    changed: bool


class AcceptedDetail(BaseModel):
    id: UUID
    eventId: UUID
    version: int
    draftRevision: int
    preferenceRevision: int
    acceptedAt: datetime
    preferencesSnapshot: PreferenceValues
    totalMinorUnits: int
    currency: Literal["SGD"] = "SGD"
    items: list[AcceptedItem]
    needsAttention: bool


class PlanningProblemBody(Problem):
    errors: dict[str, list[str]] | None = None
    issues: list[Issue] | None = None
