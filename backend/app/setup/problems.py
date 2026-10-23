from http import HTTPStatus

from fastapi import Request
from fastapi.responses import JSONResponse


ERRORS = {
    "not_found": (404, "Resource not found."),
    "forbidden": (403, "Access is not permitted."),
    "method_not_allowed": (405, "Method not allowed."),
    "validation_error": (422, "Request validation failed."),
    "revision_conflict": (409, "Setup details changed."),
}
FIELDS = {"expectedRevision", "boothLabel", "setupInstructions"}


class SetupError(Exception):
    def __init__(self, code: str, *, fields: set[str] | None = None, current_revision: int | None = None):
        self.code = code
        self.fields = fields
        self.current_revision = current_revision


def is_setup_path(path: str) -> bool:
    return (path.endswith("/setup") or path.endswith("/setup/publish")) and (
        path.startswith("/api/v1/business/participations/") or
        path.startswith("/api/v1/organiser/events/") and "/participations/" in path)


def problem_response(request: Request, code: str, errors=None, fields=None,
                     current_revision: int | None = None) -> JSONResponse:
    status, detail = ERRORS[code]
    body = {"type": "about:blank", "title": HTTPStatus(status).phrase, "status": status,
            "detail": detail, "instance": request.url.path, "code": code}
    if code == "validation_error":
        safe = set(fields or ())
        for error in errors or []:
            for part in error.get("loc", ())[1:]:
                if isinstance(part, str) and part in FIELDS:
                    safe.add(part)
        body["fieldErrors"] = [{"field": field, "code": "invalid"} for field in sorted(safe or {"request"})]
    if code == "revision_conflict" and current_revision is not None:
        body["currentRevision"] = current_revision
    return JSONResponse(status_code=status, media_type="application/problem+json",
                        headers={"Cache-Control": "no-store"}, content=body)
