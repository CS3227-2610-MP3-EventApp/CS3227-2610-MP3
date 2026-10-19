# Backend foundation test plan

Status: Approved baseline `80d8ac2`; corrected snapshot independently approved for replacement freeze, full SHA pending post-commit
Feature/story IDs: `run-backend-with-postgresql`, AC01–AC09
Approved specification/contract revisions: `run-backend-with-postgresql` revision 2 at `d2ef875`
Designer identity: `/root/backend_foundation_tests`; independent reviewers: `/root/backend_spec_behaviour_review` and `/root/backend_spec_security_review`
Baseline commit: the full SHA will be recorded in the separate implementation run record immediately after this exact approved snapshot is committed; protected paths are defined below
Full-suite command: `cd backend && TEST_DATABASE_URL='postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test' DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp' EVENTAPP_ALLOW_TEST_DB_RESET='true' uv run pytest`

## Cases

| Test ID | Criteria | Level and observable behaviour | Executable evidence / pre-implementation result |
| --- | --- | --- | --- |
| BF-01 | AC02 | HTTP integration: liveness returns its exact response while a patched SQLAlchemy connection entry point rejects any database access. | `tests/test_health.py::test_live_is_database_independent`; red until `app.main` exists. |
| BF-02 | AC03 | Real PostgreSQL integration: readiness returns its exact successful response; an engine-boundary observer proves every connection uses the validated `TEST_DATABASE_URL`, which the harness forces into runtime `DATABASE_URL` before app import. | `tests/test_health.py::test_ready_queries_reachable_approved_test_postgresql`; requires running `test-db`; red until app exists. |
| BF-03 | AC04 | HTTP failure/security: separate forced connection and query-execution failures return the exact five-field 503 problem contract and omit distinctive passwords, hosts, exception classes, function names, paths and traceback markers from responses and captured logs. | Two redaction tests in `tests/test_health.py`; red until app exists. |
| BF-04 | AC05 | HTTP contract: OpenAPI is parseable and contains exactly the three foundation paths with GET only. | `tests/test_health.py::test_openapi_describes_foundation_endpoints`; red until app exists. |
| BF-05 | AC06/09 | Configuration: the harness requires and validates original `DATABASE_URL` against `TEST_DATABASE_URL`, then overwrites runtime `DATABASE_URL`; sentinel-enabled child pytest processes prove missing setting, equal target, and credential/loopback-alias cases fail before app or Psycopg import. Runtime settings independently fail without `DATABASE_URL`. | `tests/test_configuration.py`; startup guards and forced-target assertion pass before implementation; settings test is red until app exists. |
| BF-06 | AC06/08 | Compose integration/configuration: parse `docker compose config --format json` and require only explicit long-form port objects for `db`/`test-db`, exact `127.0.0.1` host IPs, correct ports, databases and test profile. A tracked-content scanner rejects key files/material, token shapes and non-allowlisted database credentials. | `tests/test_configuration.py`; scanner passes and Compose is red until its file exists. Placeholder-value production rejection is N/A because revision 2 permits no environment selector. |
| BF-07 | AC07 | Real PostgreSQL migration: only after exact scheme/loopback/port/database/user validation and explicit `EVENTAPP_ALLOW_TEST_DB_RESET=true`, recreate the synthetic test schema, upgrade from empty, and assert `alembic_version` is the only public table. A child-process matrix rejects missing opt-in, remote host, wrong scheme, port, database and user before importing Psycopg. | `tests/test_migrations.py`; reset rejection passes; integration requires running `test-db` and is red before implementation. |
| BF-08 | AC08 | Documentation contract: the developer guide contains every exact approved startup, migration and test command plus the explicit synthetic-reset opt-in required before the destructive migration acceptance test. | `tests/test_configuration.py::test_documentation_contains_exact_foundation_workflow`; red until docs are updated. |
| BF-09 | AC01/08 | Clean dependency install and declared Python support; run `uv sync --locked` on Python 3.12, then start Uvicorn on loopback and follow the documented workflow. | Dependency lock is executable; process/listener and clean-checkout procedure remain manual because a test must not leave a server running. |

All fixtures are local synthetic values. Rejected startup cases perform no database access. Successful readiness and migration cases may modify only the dedicated `eventapp_test` database after the session guard proves it differs from the configured development target.

## Adequacy and limitations

- Pre-implementation execution on Python 3.12.1 collected 16 tests: seven safety/scanner cases passed and nine failed for the expected missing production app, Compose, documentation, Alembic, or unavailable test PostgreSQL. This is meaningful red evidence, not implementation verification.
- Success and failure paths cover liveness, readiness, OpenAPI, configuration, documentation and migrations. State-preservation applies only to the empty migration: no product tables may appear.
- Roles, authorization, private data, stale writes, retries, AI, accessibility and product persistence are N/A because revision 2 explicitly creates no product behaviour or UI.
- Readiness failure tests use SQLAlchemy connection/execution boundary patches; BF-02 and BF-07 separately require real PostgreSQL so mocks cannot establish integration success.
- Clean-checkout command following, Uvicorn listener inspection at `127.0.0.1`, Python 3.12 execution and stopping the database while observing liveness are manual/deferred. Parsed Compose configuration proves declared binding, not an actual listener.
- Independent behaviour and security reviewers approved the test adequacy and safeguards for baseline freeze. Runtime, PostgreSQL, migration and implementation evidence remain pending.

## Test change control

On 2026-10-19, the developer reported that BF-06 used plain `docker compose config`, which correctly excludes the inactive profiled `test-db` service, while the test then required that service to be present. The test owner reproduced both Compose outputs and classified this as a test defect rather than an implementation or specification defect. The test now passes `--profile test` to configuration rendering; every service, profile, database and loopback-port assertion is unchanged. The focused test passed. A feasible full run passed 14/16; only the two real PostgreSQL cases failed because Docker Desktop/test PostgreSQL was unavailable. `/root/backend_spec_behaviour_review` approved the classification and correction from the reproduced outputs, with independent Docker execution limited by its sandbox. `/root/backend_spec_security_review` approved the security coverage and independently ran the focused test (`1 passed`). The corrected snapshot is approved for replacement freeze; record its full SHA after commit and preserve baseline `80d8ac2` in the run record.

## Proposed protected baseline

Protect `backend/tests/`, `backend/pyproject.toml`, `backend/uv.lock`, this test plan, and `tools/check_test_baseline.py`. The baseline guard cannot accept absent paths, so the mandatory whole-diff review below must explicitly check for creation or modification of alternative test configuration, plugins and CI selection, including `backend/conftest.py`, `backend/pytest.ini`, `backend/tox.ini`, `backend/setup.cfg`, and `.github/workflows/`.

After review, record the full baseline SHA before development and run:

```text
python tools/check_test_baseline.py --baseline <full-sha> --paths backend/tests backend/pyproject.toml backend/uv.lock workflow/agents/runs/2026-10-18-backend-foundation-test-plan.md tools/check_test_baseline.py
git diff <full-sha> -- . ':(exclude)backend/tests/**' ':(exclude)backend/pyproject.toml' ':(exclude)backend/uv.lock' ':(exclude)workflow/agents/runs/2026-10-18-backend-foundation-test-plan.md'
```

The second command is a required human-readable review of every non-baseline change for discovery bypasses, especially alternate pytest configuration, plugins, environment hooks and CI commands; the baseline guard alone cannot detect all indirect test weakening.
