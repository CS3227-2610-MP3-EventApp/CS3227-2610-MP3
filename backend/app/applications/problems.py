from http import HTTPStatus

from fastapi import Request
from fastapi.responses import JSONResponse

from app.auth.problems import ERRORS


DOMAIN_ERRORS = {
    **ERRORS,
    "not_found": (404, "Resource not found."),
    "method_not_allowed": (405, "Method not allowed."),
    "application_exists": (409, "Application already exists."),
    "revision_conflict": (409, "Application revision changed."),
    "application_submitted": (409, "Application has already been submitted."),
    "event_revision_conflict": (409, "Event settings changed."),
    "applications_closed": (409, "Applications are closed for this event."),
    "eligibility_retired": (410, "Business eligibility approvals are no longer used."),
    "application_decided": (409, "Application already has a decision."),
}
FIELDS = {"businessId", "eventId", "participantType", "description", "requestedSpace", "contactName", "contactEmail", "expectedRevision", "applicationsOpen", "outcome", "reason"}


class ApplicationError(Exception):
    def __init__(self, code: str, current_application=None):
        self.code = code
        self.current_application = current_application


def is_application_path(path: str) -> bool:
    if path == "/api/v1/business" or path.startswith("/api/v1/business/"):
        return True
    if path == "/api/v1/organiser/events":
        return True
    parts = path.split("/")
    return (len(parts) >= 7 and parts[:5] == ["", "api", "v1", "organiser", "events"]
            and parts[6] in {"applications", "application-settings", "business-approvals", "business-directory"})


def problem_response(request: Request, code: str, errors=None, current_application=None) -> JSONResponse:
    status, detail = DOMAIN_ERRORS[code]
    body = {"type": "about:blank", "title": HTTPStatus(status).phrase, "status": status,
            "detail": detail, "instance": request.url.path, "code": code}
    if code == "validation_error":
        fields = set()
        for error in errors or []:
            location = error.get("loc", ())
            name = location[1] if len(location) > 1 else "request"
            fields.add(name if name in FIELDS and error.get("type") != "extra_forbidden" else "request")
        body["fieldErrors"] = [{"field": field, "code": "invalid"} for field in sorted(fields or {"request"})]
    if current_application is not None:
        body["currentApplication"] = current_application.model_dump(mode="json")
    return JSONResponse(status_code=status, media_type="application/problem+json",
                        headers={"Cache-Control": "no-store"}, content=body)
