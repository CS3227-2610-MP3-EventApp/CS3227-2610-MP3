from http import HTTPStatus

from fastapi import Request
from fastapi.responses import JSONResponse


class ProgrammeProblem(Exception):
    def __init__(self, status=409, code="conflict", detail="The requested change conflicts with the current programme.", errors=None):
        self.status, self.code, self.detail, self.errors = status, code, detail, errors


def field_errors(errors):
    result = {}
    for error in errors:
        location = error.get("loc", ())
        key = ".".join(str(part) for part in location if part not in ("body", "query", "path")) or "request"
        result.setdefault(key, []).append("Invalid or missing value.")
    return result


def problem_response(request: Request, exc: ProgrammeProblem):
    body = {"type": "about:blank", "title": HTTPStatus(exc.status).phrase, "status": exc.status,
            "detail": exc.detail, "instance": request.url.path, "code": exc.code}
    if exc.errors is not None:
        body["errors"] = exc.errors
    return JSONResponse(status_code=exc.status, media_type="application/problem+json", headers={"Cache-Control": "no-store"}, content=body)


def invalid(errors):
    return ProgrammeProblem(422, "validation_error", "Request validation failed.", errors)


def missing():
    return ProgrammeProblem(404, "not_found", "The requested programme resource was not found.")
