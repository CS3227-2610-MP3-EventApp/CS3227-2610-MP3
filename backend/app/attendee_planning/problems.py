from http import HTTPStatus

from fastapi import Request
from fastapi.responses import JSONResponse


class PlanningProblem(Exception):
    def __init__(self, status=409, code="stale_revision", issues=None, errors=None):
        self.status, self.code, self.issues, self.errors = status, code, issues, errors


def validation_problem(errors):
    from app.programme.problems import field_errors
    return PlanningProblem(422, "validation_error", errors=field_errors(errors))


def problem_response(request: Request, exc: PlanningProblem):
    details = {"stale_revision": "Planning changed. Refresh before trying again.",
               "stale_programme": "Programme information changed. Review the current activities.",
               "constraint_violation": "Review the itinerary's blocking constraints.",
               "not_found": "The requested planning resource was not found.",
               "forbidden": "Access is not permitted."}
    body = {"type": "about:blank", "title": HTTPStatus(exc.status).phrase,
            "status": exc.status, "detail": details.get(exc.code, "The request could not be completed."),
            "instance": request.url.path, "code": exc.code}
    if exc.issues is not None:
        body["issues"] = [issue.model_dump(mode="json") for issue in exc.issues]
    if exc.errors is not None:
        body["errors"] = exc.errors
    return JSONResponse(status_code=exc.status, content=body, media_type="application/problem+json",
                        headers={"Cache-Control": "no-store"})
