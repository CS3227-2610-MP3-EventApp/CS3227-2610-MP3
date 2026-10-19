from __future__ import annotations

import re
import subprocess
from pathlib import Path
from urllib.parse import urlsplit


DATABASE_URL = re.compile(r"postgresql(?:\+psycopg)?://[^\s'\"`<>]+")
TOKEN_PATTERNS = (
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"gh[pousr]_[A-Za-z0-9]{30,}"),
)
ALLOWED_LOCAL_DATABASES = {
    ("eventapp", "eventapp", "eventapp"),
    ("eventapp_test", "eventapp_test", "eventapp_test"),
}
ALLOWED_TEST_PASSWORDS = {
    "connection-password-z9x8",
    "different",
    "eventapp",
    "eventapp_test",
    "query-password-q7w6",
}
DATABASE_FIXTURE_FILES = {
    "backend/tests/test_configuration.py",
    "backend/tests/test_health.py",
    "backend/tests/test_migrations.py",
}


def scan(repository: Path) -> list[str]:
    paths = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
        cwd=repository,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.splitlines()
    findings: list[str] = []
    private_key_marker = "-----BEGIN " + "PRIVATE KEY-----"

    for relative in paths:
        path = repository / relative
        if not path.is_file():
            continue
        if path.name == ".env" or path.suffix.lower() in {".pem", ".key", ".p12", ".pfx"}:
            findings.append(f"{relative}: secret-bearing filename is tracked")
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if private_key_marker in text:
            findings.append(f"{relative}: private key material")
        for pattern in TOKEN_PATTERNS:
            if pattern.search(text):
                findings.append(f"{relative}: token-shaped content")
        for match in DATABASE_URL.finditer(text):
            parsed = urlsplit(match.group())
            identity = (parsed.username, parsed.password, parsed.path.lstrip("/"))
            fixture_secret = (
                relative in DATABASE_FIXTURE_FILES
                and parsed.password in ALLOWED_TEST_PASSWORDS
            )
            local = (parsed.hostname or "").lower() in {"127.0.0.1", "localhost"}
            if not fixture_secret and (not local or identity not in ALLOWED_LOCAL_DATABASES):
                findings.append(f"{relative}: non-placeholder database credential")
    return findings
