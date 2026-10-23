from http import HTTPStatus

from fastapi import Request
from fastapi.responses import JSONResponse


ERRORS = {
    "invalid_credentials": (401, "Invalid credentials."),
    "unauthenticated": (401, "Authentication required."),
    "forbidden": (403, "Access is not permitted."),
    "password_change_required": (403, "Password change required."),
    "registration_conflict": (409, "An account already exists with this username or email, or the business name is already registered."),
    "validation_error": (422, "Request validation failed."),
    "current_password_incorrect": (422, "The current password is incorrect."),
    "password_unchanged": (422, "The new password must be different from your current password."),
    "internal_error": (500, "Request could not be completed."),
    "service_unavailable": (503, "Request could not be completed."),
}


class AuthProblem(Exception):
    def __init__(self, code: str, fields=None):
        self.code = code
        self.fields = fields or []


def problem_response(request: Request, code: str, errors=None) -> JSONResponse:
    status, detail = ERRORS[code]
    body = {
        "type": "about:blank", "title": HTTPStatus(status).phrase, "status": status,
        "detail": detail, "instance": request.url.path, "code": code,
    }
    if code == "registration_conflict" and errors:
        body["fieldErrors"] = [{"field": field, "code": "already_exists"} for field in sorted(set(errors)) if field in {"username", "email", "businessName"}]
    if code == "validation_error":
        accepted = {"username", "email", "displayName", "password", "businessName", "identifier", "role", "currentPassword", "newPassword"}
        password_fields = {"password", "currentPassword", "newPassword"}
        fields = set()
        for error in errors or []:
            location = error.get("loc", ())
            field = location[1] if len(location) > 1 else "request"
            if field not in accepted or error.get("type") == "extra_forbidden":
                field = "request"
            value = error.get("input")
            field_code = "invalid"
            if field != "request":
                if error.get("type") == "missing" or value == "":
                    field_code = "required"
                elif field in password_fields and isinstance(value, str) and not 8 <= len(value) <= 128:
                    field_code = "password_length"
            fields.add((field, field_code))
        body["fieldErrors"] = [{"field": field, "code": field_code} for field, field_code in sorted(fields or {("request", "invalid")})]
    return JSONResponse(status_code=status, media_type="application/problem+json", headers={"Cache-Control": "no-store"}, content=body)
