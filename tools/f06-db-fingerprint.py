"""Read-only domain fingerprints for local additive-migration checks; no row payload output.

Run with backend venv Python from backend, an explicit retained development URL,
and backend on PYTHONPATH. Compare pre/post hashes before adding new fixtures.
"""
import hashlib
import json

from sqlalchemy import create_engine, text

from app.settings import Settings


engine = create_engine(Settings().database_url)
with engine.connect() as connection:
    tables = connection.execute(text(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    )).scalars().all()
    hashes = {}
    for name in tables:
        if name == "alembic_version":
            continue
        # Identifier comes only from PostgreSQL catalogue, still quote it correctly.
        quoted = engine.dialect.identifier_preparer.quote(name)
        rows = connection.execute(text(
            f"SELECT to_jsonb(t) FROM {quoted} t ORDER BY to_jsonb(t)::text"
        )).scalars().all()
        serialized = json.dumps(rows, sort_keys=True, default=str).encode()
        hashes[name] = hashlib.sha256(serialized).hexdigest()
    print(json.dumps(hashes, sort_keys=True))
