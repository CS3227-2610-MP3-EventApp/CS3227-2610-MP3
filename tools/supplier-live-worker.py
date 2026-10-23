"""Real worker with failure-only, temporary synthetic-source diagnostics.

For the invented-data smoke scripts only. Never use with real user requests.
Credentials are never part of the captured extraction inputs or output.
"""
import json
import os
from pathlib import Path
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT / "backend")
sys.path.insert(0, str(ROOT / "backend"))
from app.ai.worker import run_once
from app.ai.models import AnalysisJob
from app.database import SessionLocal
from app.settings import Settings
from app.supplier_research import service
from sqlalchemy import select

settings = Settings()
if settings.environment != "development" or not settings.ai_synthetic_only or settings.ai_real_data_enabled:
    raise SystemExit("Diagnostic worker requires explicit synthetic development mode.")
with SessionLocal() as db:
    active = db.scalars(select(AnalysisJob).where(AnalysisJob.state.in_(["pending", "running"]))).all()
    if (len(active) != 1 or active[0].state != "pending" or active[0].workflow != "supplier_research"
            or active[0].event_id not in settings.synthetic_event_ids):
        raise SystemExit("Refusing to process unrelated or ambiguous active work.")

validate = service.validate_extraction
def diagnostic(raw, research):
    try:
        return validate(raw, research)
    except ValueError:
        target = Path(tempfile.mkdtemp(prefix="eventapp-supplier-debug-")) / "failed.json"
        target.write_text(json.dumps({"raw":raw,"research":research}), encoding="utf-8")
        print("SYNTHETIC_DEBUG_FILE", target, flush=True)
        raise
service.validate_extraction = diagnostic
run_once()
