"""Production entrypoint: the API plus the built frontend on one origin.

The session cookie is SameSite=Lax, so the SPA and /api must share an origin.
Run with `uvicorn app.web:app`; local development keeps using `app.main:app`.
"""
import os
from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.main import app

DIST = Path(os.environ.get("FRONTEND_DIST", "/app/frontend/dist")).resolve()

if DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404)
        target = (DIST / path).resolve()
        if path and DIST in target.parents and target.is_file():
            return FileResponse(target)
        return FileResponse(DIST / "index.html")
