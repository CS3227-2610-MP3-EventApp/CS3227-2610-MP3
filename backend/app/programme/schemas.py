from datetime import datetime, timezone
from typing import Annotated, Generic, Literal, TypeVar
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, StrictInt

from app.auth.schemas import Problem


ItemType = Literal["talk", "workshop", "panel", "booth", "performance", "other"]
ItemState = Literal["draft", "published", "cancelled"]
PositiveInt = Annotated[StrictInt, Field(ge=1, le=2147483647)]
ExpectedRevision = Annotated[StrictInt, Field(ge=1)]
Price = Annotated[StrictInt, Field(ge=0, le=2147483647)]


def trimmed(value):
    if not isinstance(value, str):
        raise ValueError("Text is required")
    return value.strip()


def accessibility(value):
    if value is None:
        return None
    return trimmed(value) or None


def instant(value):
    if not isinstance(value, str):
        raise ValueError("An ISO instant with an explicit offset is required")
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise ValueError("An ISO instant with an explicit offset is required") from None
    if result.tzinfo is None or result.utcoffset() is None:
        raise ValueError("An explicit offset is required")
    return result.astimezone(timezone.utc)


Name = Annotated[str, BeforeValidator(trimmed), Field(min_length=1, max_length=200)]
Accessibility = Annotated[Annotated[str, Field(max_length=2000)] | None, BeforeValidator(accessibility)]
Instant = Annotated[datetime, BeforeValidator(instant)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RevisionRequest(Input):
    expectedRevision: ExpectedRevision


class VenueFields(Input):
    name: Name
    address: Annotated[str, BeforeValidator(trimmed), Field(min_length=1, max_length=500)]
    accessibilityDetails: Accessibility = None


class VenueReplacement(VenueFields):
    expectedRevision: ExpectedRevision


class RoomFields(Input):
    name: Name
    maxCapacity: PositiveInt
    accessibilityDetails: Accessibility = None


class RoomReplacement(RoomFields):
    expectedRevision: ExpectedRevision


class ItemFields(Input):
    roomId: UUID
    title: Name
    type: ItemType
    startsAt: Instant
    endsAt: Instant
    capacity: PositiveInt
    priceMinorUnits: Price
    currency: Literal["SGD"]
    accessibilityDetails: Accessibility = None


class ItemReplacement(ItemFields):
    expectedRevision: ExpectedRevision


class EventFacts(BaseModel):
    id: UUID
    title: str
    timezone: str
    startsAt: datetime
    endsAt: datetime


class EventSummary(EventFacts):
    revision: int


class VenueFacts(BaseModel):
    id: UUID
    name: str
    address: str
    accessibilityDetails: str | None


class RoomFacts(BaseModel):
    id: UUID
    name: str
    maxCapacity: int
    accessibilityDetails: str | None


class Record(BaseModel):
    id: UUID
    eventId: UUID
    revision: int
    createdAt: datetime
    updatedAt: datetime


class Venue(Record, VenueFacts):
    pass


class Room(Record, RoomFacts):
    venueId: UUID


class ProgrammeItem(Record):
    roomId: UUID
    title: str
    type: ItemType
    startsAt: datetime
    endsAt: datetime
    capacity: int
    priceMinorUnits: int
    currency: Literal["SGD"]
    accessibilityDetails: str | None
    state: ItemState
    publishedAt: datetime | None
    lastChangeId: UUID | None = None
    cancelledAt: datetime | None = None
    cancellationReason: str | None = None


class PublishedProgramme(BaseModel):
    id: UUID
    eventId: UUID
    revision: int
    state: Literal["published", "cancelled"]
    title: str
    type: ItemType
    startsAt: datetime
    endsAt: datetime
    capacity: int
    priceMinorUnits: int
    currency: Literal["SGD"]
    accessibilityDetails: str | None
    publishedAt: datetime
    lastChangeId: UUID | None = None
    cancelledAt: datetime | None = None
    cancellationReason: str | None = None
    event: EventFacts
    venue: VenueFacts
    room: RoomFacts


class ValidationResult(BaseModel):
    itemId: UUID
    revision: int
    valid: bool
    errors: dict[str, list[str]]


class PublicationAudit(BaseModel):
    itemId: UUID
    revision: int
    actorUserId: UUID
    action: Literal["programme_publish"] = "programme_publish"
    occurredAt: datetime
    outcome: Literal["success"] = "success"


T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int


class ProgrammeProblem(Problem):
    errors: dict[str, list[str]] | None = None
