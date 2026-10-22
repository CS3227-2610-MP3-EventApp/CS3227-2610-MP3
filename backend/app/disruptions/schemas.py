from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BeforeValidator, Field, StrictBool, field_validator

from app.programme.schemas import ExpectedRevision, Input, ItemFields, PublishedProgramme, trimmed


Reason = Annotated[str, BeforeValidator(trimmed), Field(min_length=1, max_length=1000)]
Body = Annotated[str, BeforeValidator(trimmed), Field(min_length=1, max_length=3000)]


class Confirmation(Input):
    expectedRevision: ExpectedRevision
    confirmed: StrictBool

    @field_validator("confirmed")
    @classmethod
    def explicit_confirmation(cls, value):
        if value is not True:
            raise ValueError("Explicit confirmation is required")
        return value


class ChangeRequest(ItemFields, Confirmation):
    reason: Reason | None = None


class CancelRequest(Confirmation):
    reason: Reason


class CreateDraft(Input):
    changeId: UUID
    body: Body


class EditDraft(Input):
    expectedRevision: ExpectedRevision
    body: Body


class PreviewRequest(Input):
    expectedRevision: ExpectedRevision


class PublishRequest(Input):
    previewId: UUID


class Change(Input):
    id: UUID
    eventId: UUID
    itemId: UUID
    fromRevision: int
    toRevision: int
    oldFacts: PublishedProgramme
    newFacts: PublishedProgramme
    changeType: Literal["updated", "cancelled"]
    reason: str | None
    actorUserId: UUID
    occurredAt: datetime
    recipientSnapshotStatus: Literal["blocked_f02", "snapshotted"]


class AnnouncementSourceFacts(Input):
    changeId: UUID
    itemId: UUID
    fromRevision: int
    toRevision: int
    changeType: Literal["updated", "cancelled"]
    reason: str | None
    oldFacts: PublishedProgramme
    newFacts: PublishedProgramme


class Announcement(Input):
    id: UUID
    eventId: UUID
    changeId: UUID
    body: str
    revision: int
    state: Literal["draft", "published"]
    createdAt: datetime
    updatedAt: datetime
    publishedAt: datetime | None
    sourceFacts: AnnouncementSourceFacts


class Notification(Input):
    id: UUID
    eventId: UUID
    itemId: UUID
    readAt: datetime | None
    createdAt: datetime
    change: AnnouncementSourceFacts


class Preview(Input):
    previewId: UUID
    announcementId: UUID
    revision: int
    body: str
    expiresAt: datetime
