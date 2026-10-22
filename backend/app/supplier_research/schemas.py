from datetime import date, datetime
from typing import Annotated, Literal
import re
import unicodedata
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator, model_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


def _text(value, maximum, *, allow_empty=False):
    if not isinstance(value, str):
        raise ValueError("Expected text")
    value = value.strip()
    if (not allow_empty and not value) or len(value) > maximum:
        raise ValueError("Text length is outside the permitted range")
    if any(unicodedata.category(char) == "Cc" and char not in "\n\r\t" for char in value):
        raise ValueError("Control characters are not allowed")
    return value


def _uuid(value):
    if isinstance(value, UUID):
        return value
    if isinstance(value, str):
        try:
            return UUID(value)
        except ValueError as exc:
            raise ValueError("Invalid identifier") from exc
    raise ValueError("Invalid identifier")


def _date(value):
    if value is None or isinstance(value, date):
        return value
    if isinstance(value, str):
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise ValueError("Expected an ISO calendar date")
        try:
            return date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("Invalid date") from exc
    raise ValueError("Invalid date")


Identifier = Annotated[UUID, BeforeValidator(_uuid)]
DateInput = Annotated[date, BeforeValidator(_date)]
Amount = Annotated[str, Field(pattern=r"^(0|[1-9][0-9]{0,17})$")]
QuantityBasis = Annotated[str, Field(pattern=r"^[1-9][0-9]{0,6}$")]
Category = Literal["printing", "snacks", "freebies"]
EvidenceField = Literal[
    "supplierName", "productDescription", "listedPrice.amountMinorUnits",
    "listedPrice.currency", "listedPrice.unitLabel", "listedPrice.quantityBasis",
    "deliveryEstimate", "minimumOrderQuantity", "availability", "qualifications",
]


class CreateSupplierResearch(Input):
    requestId: Identifier
    category: Category
    brief: Annotated[str, Field(min_length=1, max_length=1000)]
    quantity: Annotated[int, Field(strict=True, ge=1, le=1_000_000)]
    deliveryArea: Annotated[str, Field(min_length=1, max_length=100)]
    neededBy: DateInput | None = None
    dataSharingConfirmed: Literal[True]

    @field_validator("dataSharingConfirmed", mode="before")
    @classmethod
    def require_explicit_true(cls, value):
        if value is not True:
            raise ValueError("Explicit data-sharing confirmation is required")
        return value

    @field_validator("brief", mode="before")
    @classmethod
    def trim_brief(cls, value):
        return _text(value, 1000)

    @field_validator("deliveryArea", mode="before")
    @classmethod
    def coarse_area_only(cls, value):
        value = _text(value, 100)
        if ("@" in value or len(re.findall(r"\d", value)) >= 4
                or re.search(r"(?i)\b(?:street|road|avenue|drive|lane|block|unit)\b", value)):
            raise ValueError("Use a coarse Singapore delivery area without contact or street details")
        return value


class Evidence(Input):
    field: EvidenceField
    sourceId: Identifier
    evidenceQuote: Annotated[str, Field(min_length=1, max_length=1000,
        description="Exact contiguous text copied verbatim from the source; include nearby supplier, product, and value context where available.")]
    sourceLocator: Annotated[str | None, Field(max_length=200)]

    @field_validator("evidenceQuote", mode="before")
    @classmethod
    def quote_text(cls, value):
        return _text(value, 1000)

    @field_validator("sourceLocator", mode="before")
    @classmethod
    def locator_text(cls, value):
        return None if value is None else _text(value, 200)


class RawListedPrice(Input):
    amountMinorUnits: Annotated[Amount | None, Field(
        description="Integer minor currency units (for example, SGD 2.80 is 280); fractional minor units, ambiguous ranges, and unconfirmed price tiers are unknown.")]
    currency: Annotated[str | None, Field(min_length=3, max_length=3, pattern=r"^[A-Z]{3}$")]
    unitLabel: Annotated[str | None, Field(max_length=100)]
    quantityBasis: QuantityBasis | None

    @field_validator("unitLabel", mode="before")
    @classmethod
    def unit_text(cls, value):
        return None if value is None else _text(value, 100)

    @field_validator("quantityBasis")
    @classmethod
    def bounded_quantity_basis(cls, value):
        if value is not None and int(value) > 1_000_000:
            raise ValueError("Quantity basis exceeds the supported maximum")
        return value


class UnknownField(Input):
    field: Annotated[str, Field(min_length=1, max_length=80)]
    reason: Annotated[str, Field(min_length=1, max_length=300)]

    @field_validator("field", "reason", mode="before")
    @classmethod
    def clean(cls, value, info):
        return _text(value, 80 if info.field_name == "field" else 300)


class RawOffer(Input):
    supplierName: Annotated[str, Field(min_length=1, max_length=160)]
    productDescription: Annotated[str, Field(min_length=1, max_length=300)]
    evidenceByField: Annotated[list[Evidence], Field(min_length=1, max_length=30)]
    listedPrice: RawListedPrice
    deliveryEstimate: Annotated[str | None, Field(max_length=300,
        description="Exact contiguous substring copied verbatim from fetched source text; do not paraphrase.")]
    minimumOrderQuantity: Annotated[int | None, Field(strict=True, ge=1, le=1_000_000)]
    availability: Annotated[str | None, Field(max_length=200)]
    unknownFields: Annotated[list[UnknownField], Field(max_length=20)]
    qualifications: Annotated[list[Annotated[str, Field(min_length=1, max_length=500)]], Field(max_length=10)]

    @field_validator("supplierName", "productDescription", mode="before")
    @classmethod
    def clean_identity(cls, value, info):
        return _text(value, 160 if info.field_name == "supplierName" else 300)

    @field_validator("deliveryEstimate", "availability", mode="before")
    @classmethod
    def clean_optional(cls, value, info):
        maximum = 300 if info.field_name == "deliveryEstimate" else 200
        return None if value is None else _text(value, maximum)

    @field_validator("qualifications")
    @classmethod
    def clean_qualifications(cls, values):
        return [_text(value, 500) for value in values]

    @model_validator(mode="after")
    def unique_evidence(self):
        keys = [(item.field, item.sourceId) for item in self.evidenceByField]
        if len(keys) != len(set(keys)):
            raise ValueError("Evidence fields must be unique per source")
        return self


class Extraction(Input):
    offers: Annotated[list[RawOffer], Field(min_length=1, max_length=3)]


class SupplierEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid")
    field: EvidenceField
    sourceId: UUID
    evidenceQuote: str
    sourceLocator: str | None


class SupplierUnknownField(BaseModel):
    model_config = ConfigDict(extra="forbid")
    field: str
    reason: str


class SupplierOffer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    supplierName: str
    productDescription: str
    evidenceByField: list[SupplierEvidence]
    listedPrice: RawListedPrice
    estimatedItemSubtotalMinorUnits: str | None
    estimatedCurrency: Literal["SGD"] | None
    deliveryEstimate: str | None
    minimumOrderQuantity: int | None
    availability: str | None
    unknownFields: list[SupplierUnknownField]
    qualifications: list[str]


class SourceFailure(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sourceId: UUID
    code: Literal["unsafe_destination", "fetch_failed", "unsupported_content", "too_large"]
    displayMessage: str


class ResearchSource(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sourceId: UUID
    searchResultUrl: str
    requestedUrl: str
    finalUrl: str
    provider: Literal["tavily_page_fetch"] = "tavily_page_fetch"
    retrievedAt: datetime
    isStale: bool
    excerpt: str


class SupplierResearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: Category
    brief: str
    quantity: int
    deliveryArea: str
    neededBy: date | None


class SupplierResearchSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    participationId: UUID
    revision: Literal[1] = 1
    createdAt: datetime
    status: Literal["complete", "partial"]
    request: SupplierResearchRequest
    offers: Annotated[list[SupplierOffer], Field(min_length=1, max_length=3)]
    sources: list[ResearchSource]
    sourceFailures: list[SourceFailure]
    isStale: bool


class SupplierSelection(Input):
    snapshotId: Identifier
    offerId: Identifier


class ReplaceShortlist(Input):
    expectedRevision: Annotated[int, Field(strict=True, ge=1)]
    selectedOffers: Annotated[list[SupplierSelection], Field(max_length=100)]

    @field_validator("selectedOffers")
    @classmethod
    def unique_pairs(cls, values):
        pairs = [(item.snapshotId, item.offerId) for item in values]
        if len(pairs) != len(set(pairs)):
            raise ValueError("Duplicate offer selection")
        return values


class ShortlistView(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID | None
    participationId: UUID
    revision: int
    createdAt: datetime | None
    updatedAt: datetime | None
    selectedOffers: list[SupplierSelection]


class SupplierResearchHistory(BaseModel):
    model_config = ConfigDict(extra="forbid")
    items: list[SupplierResearchSnapshot]
    total: int
    limit: int
    offset: int
    latestJob: "BusinessSupplierResearchJob | None"


class BusinessSupplierResearchJob(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    eventId: UUID
    participationId: UUID
    state: Literal["pending", "running", "completed", "failed", "cancelled"]
    createdAt: datetime
    updatedAt: datetime
    completedAt: datetime | None
    failureCode: str | None
    providerMayHaveRun: bool
    snapshot: SupplierResearchSnapshot | None


SupplierResearchHistory.model_rebuild()
