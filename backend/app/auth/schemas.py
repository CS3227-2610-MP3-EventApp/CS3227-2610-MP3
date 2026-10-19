from email.headerregistry import Address
from email.errors import HeaderParseError
import re
from typing import Annotated, Literal
import unicodedata
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, SecretStr, model_validator


Role = Literal["attendee", "organiser", "business"]


def text_value(value) -> str:
    if not isinstance(value, str):
        raise ValueError("Text is required")
    return value


def username(value: str) -> str:
    value = text_value(value).strip()
    if not re.fullmatch(r"[A-Za-z0-9_.-]{3,32}", value, flags=re.ASCII):
        raise ValueError("Invalid username")
    return value.lower()


def email(value: str) -> str:
    value = text_value(value).strip().casefold()
    if len(value) > 254 or any(c.isspace() or ord(c) < 32 for c in value):
        raise ValueError("Invalid email")
    try:
        address = Address(addr_spec=value)
        if not address.username or not address.domain or "." not in address.domain:
            raise ValueError("Invalid email")
        if address.addr_spec.casefold() != value:
            raise ValueError("Invalid email")
        if any(not label or label.startswith("-") or label.endswith("-")
               or not re.fullmatch(r"[\w-]+", label) for label in address.domain.split(".")):
            raise ValueError("Invalid email")
    except (ValueError, IndexError, HeaderParseError) as exc:
        raise ValueError("Invalid email") from exc
    return value


def business_name(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", text_value(value)).split())


Username = Annotated[str, BeforeValidator(username)]
Email = Annotated[str, BeforeValidator(email)]
DisplayName = Annotated[str, BeforeValidator(lambda v: text_value(v).strip()), Field(min_length=1, max_length=100)]
Password = Annotated[SecretStr, Field(min_length=8, max_length=128)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class AttendeeRegistration(Input):
    username: Username
    email: Email
    displayName: DisplayName
    password: Password


class BusinessRegistration(AttendeeRegistration):
    businessName: Annotated[str, BeforeValidator(business_name), Field(min_length=1, max_length=160)]


class LoginRequest(Input):
    identifier: Annotated[str, Field(min_length=1, max_length=254)]
    password: Password
    role: Role


class PasswordChangeRequest(Input):
    currentPassword: Password
    newPassword: Password

    @model_validator(mode="after")
    def require_replacement(self):
        if self.currentPassword == self.newPassword:
            raise ValueError("A different password is required")
        return self


class EventMembershipActor(BaseModel):
    eventId: UUID
    role: Literal["organiser"] = "organiser"
    status: Literal["active"] = "active"


class BusinessMembershipActor(BaseModel):
    businessId: UUID
    businessName: str
    role: Literal["owner"] = "owner"
    status: Literal["active"] = "active"


class CurrentActor(BaseModel):
    id: UUID
    username: str
    displayName: str
    role: Role
    mustChangePassword: bool
    eventMemberships: list[EventMembershipActor]
    businessMemberships: list[BusinessMembershipActor]


class Problem(BaseModel):
    type: Literal["about:blank"] = "about:blank"
    title: str
    status: int
    detail: str
    instance: str
    code: str
