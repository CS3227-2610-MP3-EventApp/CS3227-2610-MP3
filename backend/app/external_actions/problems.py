from http import HTTPStatus

from fastapi import Request
from fastapi.responses import JSONResponse


ERRORS = {
    "not_found": (404, "Resource not found."),
    "method_not_allowed": (405, "Method not allowed."),
    "validation_error": (422, "Request validation failed."),
    "revision_conflict": (409, "The proposal revision changed."),
    "stale_source": (409, "Supplier evidence is no longer current."),
    "expired": (409, "The approval has expired."),
    "cancelled": (409, "The proposal was cancelled."),
    "execution_claimed": (409, "The proposal revision has already been claimed."),
    "idempotency_conflict": (409, "The idempotency key was already used."),
    "service_unavailable": (503, "Request could not be completed."),
    "unauthenticated": (401, "Authentication required."),
    "forbidden": (403, "Access is not permitted."),
    "password_change_required": (403, "Password change is required."),
    "internal_error": (500, "Request could not be completed."),
}


class ActionError(Exception):
    def __init__(self, code: str):
        self.code = code


def problem_response(request: Request, code: str):
    status, detail = ERRORS.get(code, ERRORS["service_unavailable"])
    return JSONResponse(status_code=status, media_type="application/problem+json",
        headers={"Cache-Control": "no-store"}, content={"type": "about:blank",
        "title": HTTPStatus(status).phrase, "status": status, "detail": detail,
        "instance": request.url.path, "code": code})
