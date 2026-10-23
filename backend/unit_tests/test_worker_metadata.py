"""The standalone worker must register every table that ai_jobs references (regression: NoReferencedTableError)."""
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]


def test_worker_entry_point_registers_ai_job_foreign_key_targets():
    # A fresh interpreter mirrors `python -m app.ai.worker`, which never imports the API routes.
    script = ("import app.ai.worker\n"
              "from sqlalchemy.orm import configure_mappers\n"
              "from app.database import Base\n"
              "configure_mappers()\n"
              "jobs = Base.metadata.tables['ai_jobs']\n"
              "missing = sorted({fk.column.table.name for fk in jobs.foreign_keys})\n"
              "print(missing)\n")
    result = subprocess.run([sys.executable, "-c", script], cwd=BACKEND, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    assert "programme_changes" in result.stdout and "announcement_drafts" in result.stdout
