import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException

from app.auth.problems import AuthProblem, problem_response
from app.auth.routes import router
from app.ai.routes import router as ai_router
from app.ai.service import AIError, problem_response as ai_problem_response
from app.applications.routes import router as application_router
from app.applications.problems import ApplicationError, is_application_path, problem_response as application_problem_response
from app.programme.problems import ProgrammeProblem, field_errors, invalid, problem_response as programme_problem_response
from app.programme.routes import router as programme_router
from app.database import engine
from app.settings import Settings


logger = logging.getLogger(__name__)
app = FastAPI(title="EventApp API", openapi_url=None)
settings = Settings()
app.include_router(router)
app.include_router(application_router)
app.include_router(programme_router)
app.include_router(ai_router)
app.add_middleware(CORSMiddleware, allow_origins=settings.trusted_origins,
                   allow_credentials=True, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"], allow_headers=["Content-Type"])


@app.exception_handler(ApplicationError)
async def application_problem(request: Request, exc: ApplicationError):
    return application_problem_response(request, exc.code, current_application=exc.current_application)


@app.exception_handler(AIError)
async def ai_problem(request: Request, exc: AIError):
    return ai_problem_response(request, exc.code)


@app.exception_handler(HTTPException)
async def http_problem(request: Request, exc: HTTPException):
    if is_application_path(request.url.path) and exc.status_code in {404, 405}:
        return application_problem_response(request, "not_found" if exc.status_code == 404 else "method_not_allowed")
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=exc.headers)


@app.exception_handler(AuthProblem)
async def auth_problem(request: Request, exc: AuthProblem):
    return problem_response(request, exc.code)


@app.exception_handler(RequestValidationError)
async def invalid_request(request: Request, exc: RequestValidationError):
    if "/analysis" in request.url.path or request.url.path.endswith("analysis-rubric"):
        return ai_problem_response(request, "validation_error")
    if is_application_path(request.url.path):
        return application_problem_response(request, "validation_error", exc.errors())
    if request.url.path.startswith(("/api/v1/organiser/", "/api/v1/attendee/")):
        return programme_problem_response(request, invalid(field_errors(exc.errors())))
    return problem_response(request, "validation_error", exc.errors())


@app.exception_handler(ProgrammeProblem)
async def programme_problem(request: Request, exc: ProgrammeProblem):
    return programme_problem_response(request, exc)


@app.exception_handler(SQLAlchemyError)
async def storage_failure(request: Request, exc: SQLAlchemyError):
    return problem_response(request, "service_unavailable")


@app.exception_handler(Exception)
async def unexpected_failure(request: Request, exc: Exception):
    return problem_response(request, "internal_error")


@app.middleware("http")
async def auth_boundary(request: Request, call_next):
    if request.url.path.startswith(("/api/v1/auth/", "/api/v1/organiser/", "/api/v1/attendee/", "/api/v1/ai/")) or is_application_path(request.url.path):
        if request.method not in {"GET", "HEAD", "OPTIONS"} and request.headers.get("origin") not in settings.trusted_origins:
            return problem_response(request, "forbidden")
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response
    return await call_next(request)


@app.get("/api/v1/health/live")
def live() -> dict[str, str]:
    return {"status": "live"}


@app.get("/api/v1/health/ready")
def ready(request: Request):
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        logger.error("Database readiness check failed")
        return JSONResponse(
            status_code=503,
            media_type="application/problem+json",
            content={
                "type": "about:blank",
                "title": "Service Unavailable",
                "status": 503,
                "detail": "The service is not ready.",
                "instance": request.url.path,
            },
        )
    return {"status": "ready"}


@app.get("/api/v1/openapi.json", include_in_schema=True)
def openapi_document():
    return app.openapi()
