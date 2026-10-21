# Run the backend with PostgreSQL

| Field | Value |
| --- | --- |
| Stable capability ID | run-backend-with-postgresql |
| Covered stories | N/A: technical foundation for later capabilities; it implements no catalogue user story |
| Specification revision / status | 2 / In review |
| Product roles / roadmap | No product role; [phase 0 foundation](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Requesting teammate approved this bounded foundation and safe local defaults in the latest scope instruction |
| Review / run record | [Implementation and multi-agent evidence](../../workflow/agents/runs/2026-10-18-backend-foundation.md); [2026-10-20 isolated development workflow](../../workflow/agents/runs/2026-10-20-foundation-follow-through.md) passed; human review and fresh-machine setup remain pending |

This Draft follows the [specification standard](../README.md), [development workflow](../../workflow/README.md), [agent workflow](../../workflow/agents/README.md) and applicable environment-separation rules in [security](../../docs/security.md). It establishes only a runnable technical backend foundation.

## Product outcome, users and scope

Developers can install, migrate, run and test a Python 3.12 FastAPI service connected to PostgreSQL. PostgreSQL runs locally through Docker Compose. The service uses Pydantic settings, synchronous SQLAlchemy 2 and Alembic and exposes process-liveness, database-readiness and OpenAPI endpoints.

This capability creates no product tables or behavior. Authentication, roles, product schema, programme features, frontend integration, deployment, AI, rate limiting, audit and any production-readiness claim are explicitly excluded.

## Use cases and user interface

This capability has no end-user interface. A developer starts PostgreSQL, installs the locked backend dependencies, applies the empty foundation migration and starts FastAPI. A local observer or infrastructure check can distinguish a running process from a process that can reach its configured database.

The backend documentation must provide these commands from the repository root or clearly state the required working directory:

```text
docker compose up -d db
docker compose --profile test up -d test-db
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1
export TEST_DATABASE_URL='postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test'
uv run pytest
```

Equivalent command names are not assumed; these exact workflows must remain valid unless a later approved revision replaces them. The Uvicorn command is local development only and makes no production-serving claim.

## Inputs, outputs and functional contract

The service exposes:

- `GET /api/v1/health/live`: checks process liveness without opening or querying a database connection; returns HTTP `200` and `{"status":"live"}` while the request process is running.
- `GET /api/v1/health/ready`: executes `SELECT 1` through the configured synchronous SQLAlchemy engine. Success returns HTTP `200` and `{"status":"ready"}`. Connection or query failure returns HTTP `503` with `application/problem+json` containing RFC 9457-style `type`, `title`, `status`, `detail` and `instance` fields, without credentials or internal connection details.
- `GET /api/v1/openapi.json`: returns the FastAPI OpenAPI document for the running service.

Pydantic settings obtains the running application's database connection from `DATABASE_URL`. Tests do not consume or fall back to that setting; they require `TEST_DATABASE_URL` as described below. No real password, connection URL or other secret is committed. A committed example may contain an obviously non-secret local placeholder only.

Docker Compose publishes each PostgreSQL development/test port on `127.0.0.1` only, never all host interfaces. Any committed Compose credentials are obvious development-only placeholders. If an environment selector exists, production selection must reject those placeholder values rather than silently using them.

Tests use only `TEST_DATABASE_URL`, which must identify a dedicated synthetic test database distinct from `DATABASE_URL` and the development database. Test startup fails closed before database access when `TEST_DATABASE_URL` is absent, equal to `DATABASE_URL`, or otherwise resolves to the configured development database. Tests never fall back to `DATABASE_URL`.

The initial Alembic upgrade establishes migration history but declares no product schema. After upgrading an empty database, the only application-created table is `alembic_version`; there are no user, role, programme, audit, AI or other product tables.

## Constraints, security and non-functional requirements

[SEC08 and SEC12](../../docs/security.md) apply to secret handling and environment configuration. Readiness failures use a generic server-error problem category and are observable without disclosing credentials, database URL, driver details or stack trace in either the response or captured application logs. Liveness remains independent of database availability so the two endpoints have distinct operational meaning.

The Docker Compose database is a local development dependency, not evidence of production deployment. This Draft defines no production credentials, hosting, availability target, connection-pool tuning, backup, monitoring or deployment procedure.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| run-backend-with-postgresql-AC01 | On Python 3.12, the documented `uv sync` and loopback-bound FastAPI development command start the service with its declared locked dependencies. | Technical foundation; SEC12 | Clean environment setup, process start and listener inspection |
| run-backend-with-postgresql-AC02 | `GET /api/v1/health/live` returns `200` with `{"status":"live"}` when PostgreSQL is available or unavailable and performs no database query. | Technical foundation | Connected/disconnected database plus query-spy observation |
| run-backend-with-postgresql-AC03 | With reachable PostgreSQL, readiness executes `SELECT 1` and returns `200` with `{"status":"ready"}`. | Technical foundation | Real PostgreSQL integration request |
| run-backend-with-postgresql-AC04 | With PostgreSQL unreachable or the readiness query failing, readiness returns `503 application/problem+json` in a generic server-error category; both response and captured logs omit credentials, database URL, driver details and stack trace. | SEC08/12 | Connection/query failure with explicit response and captured-log redaction assertions |
| run-backend-with-postgresql-AC05 | `GET /api/v1/openapi.json` returns a valid OpenAPI document describing the running foundation endpoints. | Technical foundation | Parse response and inspect registered paths |
| run-backend-with-postgresql-AC06 | Runtime configuration is read from `DATABASE_URL`; tracked files contain no real secret, Compose database ports bind only `127.0.0.1`, and any environment selector rejects development placeholder credentials for production. | SEC08/12 | Configuration/secret scan, listener inspection and production-selector rejection |
| run-backend-with-postgresql-AC07 | Applying `uv run alembic upgrade head` to an empty PostgreSQL database succeeds and leaves only `alembic_version`, with no product table. | Technical foundation | Empty-database migration and catalogue inspection |
| run-backend-with-postgresql-AC08 | The documented Docker Compose start, migration and test commands execute from their stated working directories without undocumented setup steps. Tests use a dedicated synthetic database through distinct `TEST_DATABASE_URL`. | Technical foundation; SEC12 | Follow documentation in a clean checkout and inspect test database target |
| run-backend-with-postgresql-AC09 | Test startup fails before database access when `TEST_DATABASE_URL` is missing, matches `DATABASE_URL` or resolves to the development database; it never falls back to the development URL. | SEC08/12 | Missing/equal/dev-alias URL matrix with database-access spy |

## External interfaces and dependencies

The public boundary is limited to the three `GET` endpoints above. Runtime dependencies are Python 3.12, FastAPI, Pydantic settings, synchronous SQLAlchemy 2, Alembic, a PostgreSQL driver, `uv`, Docker Compose and PostgreSQL. Later capabilities may add migrations and routes only through their own approved specifications and reviewed migration history.

## Decisions and approval

| Decision | Approved direction | Owner | Blocks | Resolution |
| --- | --- | --- | --- | --- |
| FOUNDATION-01 | Python 3.12 FastAPI, Pydantic settings, synchronous SQLAlchemy 2, Alembic and loopback-only PostgreSQL via Docker Compose | Requesting teammate | None for revision 2 drafting | Approved in latest scope instruction |
| FOUNDATION-02 | Three exact foundation endpoints and database-independent liveness/database-backed readiness semantics | Requesting teammate | None for revision 2 drafting | Approved in latest scope instruction |
| FOUNDATION-03 | Separate `DATABASE_URL`/fail-closed `TEST_DATABASE_URL`, no committed secret, and an initial migration containing no product tables | Requesting teammate | None for revision 2 drafting | Approved in latest scope instruction |
| FOUNDATION-04 | Authentication, product behavior, frontend integration, deployment, AI, rate limiting, audit and production claims excluded | Requesting teammate | Prevents scope expansion | Approved in latest scope instruction |

## Verification and evidence

Revision 2 is implemented at `e3535964bf759589ed9d76fed168af842382692b`. The replacement protected baseline, all 16 backend tests, real test-PostgreSQL readiness and empty migration, loopback HTTP smoke, compilation, migration-head check, and independent behaviour/security reviews pass. A local PostgreSQL process already occupying port 5432 prevented a clean run of the documented development Compose service; the isolated test database and backend ran on port 5433. Human teammate review remains pending, so the capability stays In review. No production readiness is claimed.

## Revision history

Evidence update, 2026-10-20 (no contract/status/revision change): at `1249e012c9df348e9d9a6fe1144a1f8ddde77ac2`, the independent behaviour verifier completed the previously missing clean empty-development-database workflow using a verified-absent isolated Compose project and retained the existing development volume untouched. Python 3.12.15 dependency sync, approved current-head migrations, exact loopback reload Uvicorn command, real live/ready/OpenAPI requests and listener checks passed. Current head includes the separately approved auth tables; the historical foundation-only schema expectation remains scoped to its original migration. Services started by the check were stopped. This reused the checkout/venv and does not establish fresh-machine installation, required human review or production delivery. Exact evidence and scope are in the follow-through run above; historical results remain tied to their original snapshots.

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial minimal FastAPI/PostgreSQL technical foundation Draft | Bounded behaviour approved by requesting teammate; independent review, tests and implementation evidence pending |
| 2 / 2026-10-18 | Added loopback-only local listeners, dedicated fail-closed test database configuration, explicit response/log redaction and development-placeholder safeguards; added AC09 | Safe local defaults approved by requesting teammate; independent behaviour/security specification reviews passed; executable evidence pending |
