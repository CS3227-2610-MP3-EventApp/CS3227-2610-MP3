from http import HTTPStatus

from fastapi import Request
from fastapi.responses import JSONResponse


ERRORS = {
    "invalid_credentials": (401, "Invalid credentials."),
    "unauthenticated": (401, "Authentication required."),
    "forbidden": (403, "Access is not permitted."),
    "password_change_required": (403, "Password change required."),
    "registration_conflict": (409, "Registration could not be completed."),
    "validation_error": (422, "Request validation failed."),
    "internal_error": (500, "Request could not be completed."),
    "service_unavailable": (503, "Request could not be completed."),
}


class AuthProblem(Exception):
    def __init__(self, code: str):
        self.code = code


def problem_response(request: Request, code: str) -> JSONResponse:
    status, detail = ERRORS[code]
    return JSONResponse(status_code=status, media_type="application/problem+json", headers={"Cache-Control": "no-store"}, content={
        "type": "about:blank", "title": HTTPStatus(status).phrase, "status": status,
        "detail": detail, "instance": request.url.path, "code": code,
    })
