# EventApp developer guide

## Shared development agents

Capability specifications live under root `specs/`. Read the [spec definition, standard and index](../specs/README.md); draft from [the canonical template](../specs/TEMPLATE.md). Both draft and finalized specs stay there, with approval and evidence recorded in the document. Project planning, security and architecture live under docs/; [workflow/](../workflow/README.md) contains the development process.

Invoke `$draft-spec` to create a new capability spec from a story or refine an existing Draft. The [repository skill](../.agents/skills/draft-spec/SKILL.md) stops with a Draft and human questions; it does not audit finalized specs, verify implementation or synchronize specs with code. For example: `Use $draft-spec to refine specs/programme/create-and-publish-programme.md and surface its blocking product decisions.`

Open the repository root in Codex or Claude Code and follow [AGENTS.md](../AGENTS.md). All teammates use [the same six roles and workflow](../workflow/agents/README.md); assignments differ by story, approved scope, and file ownership. Start a new session after fetching configuration changes and verify actual role discovery/delegation. Do not mistake role files for evidence that agents ran.

Start with [the canonical story catalogue](UserStoriesAndFeatures.md) and the ordered roadmap in [project context](project.md), then read [security rules](security.md), [schema/contracts](architecture.md) and the relevant scoped specification. Product-role columns describe users; implementation and review responsibilities are assigned per task. Resolve blockers before dependent development. Use independently reviewed test cases and the approved immutable baseline; developers cannot weaken them. See the workflow for dispute handling and baseline checks.

## Evidence and assignment logs

Maintain [logs/](../logs/README.md) for summaries of all development prompts/interactions, including corrections, delegated work, checks and limitations. AI drafts are fact-checked against available evidence and then verified by their human owner. Pending human verification stays explicit. Historical backfills do not claim unavailable conversations.

## Current implementation status

The repository contains a React role-entry/workspace UI and FastAPI/PostgreSQL authentication: attendee/business registration, shared login/logout, cookie sessions, password replacement, CLI organiser/event provisioning and reusable role/membership guards. Programme, application, itinerary and AI actions remain previews or later capabilities; online deployment is separate.

Use Node.js `^20.19.0` or `>=22.12.0`, then run:

```sh
cd frontend
npm ci
npm run dev
```

The local URL is printed by Vite. Verify the frontend with:

```sh
npm test
npm run build
npm audit
```

Historical presentation evidence is recorded in the [role-entry run record](../workflow/agents/runs/2026-10-18-preview-role-entry.md). The [authentication run record](../workflow/agents/runs/2026-10-19-shared-authentication.md) records the current contract, protected tests, implementation and remaining review limitations. Shared guards require integration into each future domain endpoint.

## Backend foundation

Install Python 3.12, [uv](https://docs.astral.sh/uv/) and Docker Desktop. From the repository root, start the development database:

```sh
docker compose up -d db
cd backend
uv sync
export DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1
```

The API is available only on the local machine. Check liveness at `http://127.0.0.1:8000/api/v1/health/live`, database readiness at `http://127.0.0.1:8000/api/v1/health/ready`, and OpenAPI at `http://127.0.0.1:8000/api/v1/openapi.json`.

Tests use a separate synthetic PostgreSQL database. From the repository root:

```sh
docker compose --profile test up -d test-db
cd backend
uv sync
export DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
export TEST_DATABASE_URL='postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test'
export EVENTAPP_ALLOW_TEST_DB_RESET=true
uv run pytest
```

The reset flag permits the migration test to recreate only the synthetic local `eventapp_test` schema. Never point `TEST_DATABASE_URL` at development or production data.

## Shared authentication development

On the shared-authentication branch, apply migrations using `uv run alembic upgrade head` before starting FastAPI. Start the frontend separately with `npm run dev` in `frontend/`; Vite proxies `/api` to `http://127.0.0.1:8000` so the browser uses same-origin cookies. Use the frontend on `http://localhost:5173` or `http://127.0.0.1:5173` with the default development trusted origins. The database, backend and frontend remain separate processes.

Configuration adds `ENVIRONMENT` (`development`, `test`, `production`) and `TRUSTED_ORIGINS` (a JSON array of exact frontend origins). Outside development cookies require HTTPS; production requires explicit HTTPS trusted origins. Keep environment files, credentials and database URLs out of Git. Do not reuse the disposable test database for normal accounts.

Create an event and its organiser from `backend/`, replacing the example identifiers and dates with your synthetic development data:

```sh
uv run python -m app.auth.bootstrap event --id 22222222-2222-4222-8222-222222222222 --title 'Development Event' --timezone Asia/Singapore --starts-at 2027-01-01T09:00:00+08:00 --ends-at 2027-01-01T18:00:00+08:00
uv run python -m app.auth.bootstrap organiser --username dev-organiser --email organiser@example.test --display-name 'Development Organiser' --event-id 22222222-2222-4222-8222-222222222222
```

The organiser command prompts for a password rather than taking it in shell arguments. Repeating a matching seed does not reset its password or reactivate an inactive membership. Organisers must change the initial password after login. Attendees and business owners register through the frontend; business registration creates a new business and initial owner together. An email and username each identify one account across all roles.

Manual flows after launching both servers:

1. Register an attendee, refresh its workspace, sign out and verify a direct workspace URL requires login.
2. Register a business owner and verify the business workspace opens; a duplicate email/username/business name is rejected.
3. Use an account under the wrong role tab and verify the same generic rejection as an incorrect password.
4. Log in as the seeded organiser, replace the initial password, refresh and verify access to the organiser workspace. The initial password must no longer work.
5. Inspect browser cookies: `eventapp_session` is HttpOnly/SameSite=Lax; browser storage contains no identity or token. Appearance preference remains in local storage.

Generate API artifacts after API changes from `backend/` with `uv run python -m app.export_openapi`, then from `frontend/` run `npm run api:types`. Commit the OpenAPI document and generated declarations together. Re-run the backend and frontend suites before claiming verification. Domain cards remain previews until their own capabilities are implemented.

## Delivery evidence to maintain

Document deployment/recovery steps and the online application URL when hosting is implemented. Keep development and production databases, credentials and configuration separate; production model/database credentials stay server-side. Record client-bundle/log secret checks and deployed synthetic smoke journeys for all three workspaces, including each role's real LLM integration and manual fallback. Link revision-specific evidence to the release gates in project context. This slice does not provide password recovery, email verification, rate limiting or a production deployment.
