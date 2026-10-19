import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.auth.problems import AuthProblem, problem_response
from app.auth.routes import router
from app.database import engine
from app.settings import Settings


logger = logging.getLogger(__name__)
app = FastAPI(title="EventApp API", openapi_url=None)
settings = Settings()
app.include_router(router)
app.add_middleware(CORSMiddleware, allow_origins=settings.trusted_origins,
                   allow_credentials=True, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])


@app.exception_handler(AuthProblem)
async def auth_problem(request: Request, exc: AuthProblem):
    return problem_response(request, exc.code)


@app.exception_handler(RequestValidationError)
async def invalid_request(request: Request, exc: RequestValidationError):
    return problem_response(request, "validation_error")


@app.exception_handler(SQLAlchemyError)
async def storage_failure(request: Request, exc: SQLAlchemyError):
    return problem_response(request, "service_unavailable")


@app.exception_handler(Exception)
async def unexpected_failure(request: Request, exc: Exception):
    return problem_response(request, "internal_error")


@app.middleware("http")
async def auth_boundary(request: Request, call_next):
    if request.url.path.startswith("/api/v1/auth/"):
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
