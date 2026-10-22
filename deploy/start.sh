#!/bin/sh
# Single-container start for the free tier: migrate, run the AI worker, serve the API.
set -eu

# Neon/Render hand out postgresql://; SQLAlchemy needs the psycopg driver named.
case "$DATABASE_URL" in
  postgresql://*) DATABASE_URL="postgresql+psycopg://${DATABASE_URL#postgresql://}" ;;
  postgres://*)   DATABASE_URL="postgresql+psycopg://${DATABASE_URL#postgres://}" ;;
esac
export DATABASE_URL

alembic upgrade head

python -m app.ai.worker &
exec uvicorn app.web:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips="*"
