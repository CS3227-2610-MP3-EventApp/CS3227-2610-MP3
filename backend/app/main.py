import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.database import engine


logger = logging.getLogger(__name__)
app = FastAPI(title="EventApp API", openapi_url=None)


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
