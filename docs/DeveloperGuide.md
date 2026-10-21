# EventApp developer guide

## Shared development agents

Capability specifications live under root `specs/`. Read the [spec definition, standard and index](../specs/README.md); draft from [the canonical template](../specs/TEMPLATE.md). Both draft and finalized specs stay there, with approval and evidence recorded in the document. Project planning, security and architecture live under docs/; [workflow/](../workflow/README.md) contains the development process.

Invoke `$draft-spec` to create a new capability spec from a story or refine an existing Draft. The [repository skill](../.agents/skills/draft-spec/SKILL.md) stops with a Draft and human questions; it does not audit finalized specs, verify implementation or synchronize specs with code. For example: `Use $draft-spec to refine specs/programme/create-and-publish-programme.md and surface its blocking product decisions.`

Open the repository root in Codex or Claude Code and follow [AGENTS.md](../AGENTS.md). All teammates use [the same six roles and workflow](../workflow/agents/README.md); assignments differ by story, approved scope, and file ownership. Start a new session after fetching configuration changes and verify actual role discovery/delegation. Do not mistake role files for evidence that agents ran.

Start with [the canonical story catalogue](UserStoriesAndFeatures.md) and the ordered roadmap in [project context](project.md), then read [security rules](security.md), [schema/contracts](architecture.md) and the relevant scoped specification. Product-role columns describe users; implementation and review responsibilities are assigned per task. Resolve blockers before dependent development. Use independently reviewed test cases and the approved immutable baseline; developers cannot weaken them. See the workflow for dispute handling and baseline checks.

## Evidence and assignment logs

Maintain [logs/](../logs/README.md) for summaries of all development prompts/interactions, including corrections, delegated work, checks and limitations. AI drafts are fact-checked against available evidence and then verified by their human owner. Pending human verification stays explicit. Historical backfills do not claim unavailable conversations.

## Current implementation status

The repository contains a React role-entry/workspace UI and FastAPI/PostgreSQL authentication: attendee/business registration, shared login/logout, cookie sessions, password replacement, CLI organiser/event provisioning and reusable role/membership guards. Business application submission/review/decisions, organiser programme management and the organiser invented-data AI-analysis slice have backend integrations. Preparation, itinerary, other-role AI and online deployment remain separate. See [Business application website and API testing](BusinessApplicationsTesting.md), [programme testing](ProgrammeTesting.md) and [AI analysis testing](AIAnalysisTesting.md) for local flows and their distinct evidence. Human/NVDA review remains pending. Apply additive migrations with `alembic upgrade head`; never reset retained development data to enable a feature.

## Run locally

Prerequisites: Python 3.12, [uv](https://docs.astral.sh/uv/), Docker Desktop, and Node.js `^20.19.0` or `>=22.12.0`. Use separate terminals. The Docker commands below work in PowerShell, bash and zsh. Start the database and backend first; Vite proxies API requests to `127.0.0.1:8000` and will report proxy errors until the backend is running.

### 1. Start PostgreSQL and the backend

In Terminal 1, from the repository root, start PostgreSQL. Repeat the readiness command until it reports that PostgreSQL is accepting connections:

```powershell
docker compose up -d db
docker compose exec db pg_isready -U eventapp -d eventapp
```

Then, in the same terminal, use the commands for your shell.

PowerShell:

```powershell
Set-Location backend
uv sync
$env:DATABASE_URL = "postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp"
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1
```

macOS/Linux (bash/zsh):

```sh
cd backend
uv sync
export DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1
```

Keep this terminal open. In Terminal 2, wait until Uvicorn reports that startup is complete, then check API and database readiness.

PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health/ready
```

macOS/Linux (bash/zsh):

```sh
curl --fail --silent --show-error http://127.0.0.1:8000/api/v1/health/ready
```

Continue in Terminal 2 only after the response reports `status: ready`. From the repository root, start the frontend.

PowerShell:

```powershell
Set-Location frontend
npm ci
npm run dev
```

macOS/Linux (bash/zsh):

```sh
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173/`. Once the backend is running, these complete API URLs can be opened directly:

- Liveness: `http://127.0.0.1:8000/api/v1/health/live`
- Database readiness: `http://127.0.0.1:8000/api/v1/health/ready`
- OpenAPI document: `http://127.0.0.1:8000/api/v1/openapi.json`

The default trusted origins are `http://localhost:5173` and `http://127.0.0.1:5173`. If Vite uses a different port, configure that exact origin in `TRUSTED_ORIGINS` before starting the backend.

To stop the app, press Ctrl+C in the frontend and backend terminals, then run `docker compose stop db` from the repository root if you also want to stop PostgreSQL. Stopping the container preserves its named development data volume.

### Provision an organiser for manual testing

Attendees and business owners can register through the frontend. Organisers cannot self-register; provision one with the trusted CLI after PostgreSQL is running and the migrations are applied. Use a third terminal from the repository root. The CLI connects directly to PostgreSQL, so set the same development `DATABASE_URL` used by FastAPI in this terminal too; shell environment variables do not carry over between terminals.

PowerShell:

```powershell
Set-Location backend
$env:DATABASE_URL = "postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp"
uv run python -m app.auth.bootstrap event --id 22222222-2222-4222-8222-222222222222 --title "Development Event" --timezone Asia/Singapore --starts-at 2027-01-01T09:00:00+08:00 --ends-at 2027-01-01T18:00:00+08:00
uv run python -m app.auth.bootstrap organiser --username dev-organiser --email organiser@example.test --display-name "Development Organiser" --event-id 22222222-2222-4222-8222-222222222222
```

macOS/Linux (bash/zsh):

```sh
cd backend
export DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
uv run python -m app.auth.bootstrap event --id 22222222-2222-4222-8222-222222222222 --title 'Development Event' --timezone Asia/Singapore --starts-at 2027-01-01T09:00:00+08:00 --ends-at 2027-01-01T18:00:00+08:00
uv run python -m app.auth.bootstrap organiser --username dev-organiser --email organiser@example.test --display-name 'Development Organiser' --event-id 22222222-2222-4222-8222-222222222222
```

What the commands do:

- **Project folder and runtime:** `Set-Location backend` (PowerShell) or `cd backend` (bash/zsh) enters the backend project. `uv run` uses its Python environment to run the provisioning tool.
- **Database connection:** `DATABASE_URL` tells the CLI to use your local development database on port 5432, not the disposable test database on port 5433.
- **Event seed:** The `event` command creates a sample event. `--id` gives it a unique ID; `--title`, `--timezone`, `--starts-at`, and `--ends-at` set its name, timezone, and start/end times. The timestamps include the UTC offset.
- **Organiser seed:** The `organiser` command creates an organiser account and grants it access to the event named by `--event-id`. That value must match the event's `--id`. The username, email, and display name identify the account.
- **Password and repeats:** For a new account, the CLI asks for an initial password twice in hidden prompts. The organiser must change it at first sign-in. Repeating a matching command does not reset the password or reactivate an inactive membership. Use synthetic details only.

After provisioning succeeds, run the backend with the same development database URL (Compose defaults to port 5432; check your actual container binding), and open the frontend URL printed by Vite. Select the **Organiser** tab, enter `dev-organiser` or `organiser@example.test` and its initial password. Replace that password on the required page before entering the workspace. Application Reviews provides assigned events, open/closed application settings and one-time approval/rejection. Programme Management is available, and AI Application Analysis requires the dedicated invented-data setup described below.

### Run automated tests

Backend tests use a separate synthetic database on port 5433. Do not run the backend test suite while manually using this test database: the suite resets its schema. From the repository root, start the test database:

```powershell
docker compose --profile test up -d test-db
docker compose --profile test exec test-db pg_isready -U eventapp_test -d eventapp_test
```

Repeat the readiness command until PostgreSQL reports that it is accepting connections. Then, in the same terminal, use the commands for your shell.

PowerShell:

```powershell
Set-Location backend
uv sync
$env:DATABASE_URL = "postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp"
$env:TEST_DATABASE_URL = "postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test"
$env:EVENTAPP_ALLOW_TEST_DB_RESET = "true"
uv run pytest
```

macOS/Linux (bash/zsh):

```sh
cd backend
uv sync
export DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
export TEST_DATABASE_URL='postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test'
export EVENTAPP_ALLOW_TEST_DB_RESET=true
uv run pytest
```

`DATABASE_URL` identifies the development database; the test harness validates that it differs from `TEST_DATABASE_URL`, then directs application connections to the test target. The reset flag permits migration tests to recreate only the synthetic local `eventapp_test` schema. Never point `TEST_DATABASE_URL` at development or production data.

For frontend checks, use another terminal from the repository root. PowerShell:

```powershell
Set-Location frontend
npm ci
npm test
npm run build
npm audit
```

### One-command automated verification (PowerShell)

With Docker Desktop running and dependencies already installed, run this from the repository root:

```powershell
.\tools\verify.ps1
```

It starts the disposable test database, runs every backend test, then runs every frontend test and the production frontend build. It sets the documented Node 26 compatibility option only for the test process and restores your environment variables afterwards. The test database on port 5433 may be reset; it never uses the development database on port 5432. To run only the frontend checks, use `./tools/verify.ps1 -FrontendOnly`.

The verifier checks each command's exit code and reports failure if any test suite or the build fails, even when later stages pass. It restores the original terminal directory and environment afterwards. The storage compatibility flag is enabled only when the installed Node version supports it. Avoid running multiple backend suites against the same disposable database at once: their reset fixtures intentionally recreate and truncate synthetic tables.

#### PowerShell execution-policy guidance

If PowerShell says that script execution is disabled, use this one-time invocation:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\verify.ps1
```

**Benefit:** it permits this single PowerShell process to run the checked-out verifier without changing the machine or user execution policy. **Risk:** `Bypass` does not isolate or restrict the script; it can do anything your current Windows account can do. Review `tools/verify.ps1`, use it only from a trusted repository revision, and do not paste an untrusted script path into this command.

The verifier itself starts Docker's disposable `test-db` service and resets its synthetic `eventapp_test` schema on port 5433. This is intentional for repeatable tests, but any data in that database can be removed. It is safe for the documented test container; never point `TEST_DATABASE_URL` at a development, shared, or production database. Docker Desktop must be running. The script runs tests and a frontend build but does not commit, push, deploy, or change the development database on port 5432.

For a persistent, per-user setting that permits locally created or downloaded-and-unblocked scripts, use `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. **Trade-off:** this is more convenient, but it broadens the set of scripts your user account may execute. It still does not make unreviewed repository scripts safe, so the one-time invocation above is the recommended default for this verifier.

macOS/Linux (bash/zsh):

```sh
cd frontend
npm ci
npm test
npm run build
npm audit
```

Historical presentation evidence is recorded in the [role-entry run record](../workflow/agents/runs/2026-10-18-preview-role-entry.md). The [authentication run record](../workflow/agents/runs/2026-10-19-shared-authentication.md) records the current contract, protected tests, implementation and remaining review limitations. Shared guards require integration into each future domain endpoint. For detailed role-by-role manual flows, see [authentication manual testing](AuthenticationTesting.md).

Configuration supports `ENVIRONMENT` (`development`, `test`, `production`) and `TRUSTED_ORIGINS` (a JSON array of exact frontend origins). Outside development, cookies require HTTPS; production requires explicit HTTPS trusted origins. Keep environment files, credentials and database URLs out of Git. Do not reuse the disposable test database for normal accounts.

Generate API artifacts after API changes from `backend/` with `uv run python -m app.export_openapi`, then from `frontend/` run `npm run api:types`. Commit the OpenAPI document and generated declarations together. Re-run the backend and frontend suites before claiming verification. Only delivered application cards are enabled for Business/organiser; other domain cards remain previews until their own capabilities are implemented.

The first organiser programme slice is governed by [programme revision 6](../specs/programme/create-and-publish-programme.md). Apply its additive migration before using Programme Management; existing authentication records must be preserved. See [programme testing and attendee API handoff](ProgrammeTesting.md) for local flows, publication boundaries and consumer integration. The [run record](../workflow/agents/runs/2026-10-20-organiser-programme.md) records actual implementation/verification status; this guide is not a passing-test claim.

### Organiser AI analysis

The organiser analysis slice uses the existing Application Reviews page for immutable rubrics, explicitly confirmed analysis requests, durable job state/cancellation and validated evidence reports. It does not record decisions. See [AIAnalysisTesting](AIAnalysisTesting.md) for local SoCLaaS configuration, model checks, the separate Python worker, browser flows and cleanup. AI is disabled by default; live requests require a dedicated allowlisted invented-data event and explicit development/test opt-in. Production processing remains disabled pending privacy approval.

Apply additive migrations before starting the API/worker. Keep `SOCLAAS_API_KEY` only in the ignored backend runtime environment; never a `VITE_` variable. `uv run python -m app.ai.doctor` lists accessible models; `--probe` deliberately spends provider usage on a fixed invented example. `uv run python -m app.ai.worker` executes queued jobs, and `--cleanup` expires terminal jobs/reports after 30 days. Ordinary automated tests use injected fake providers. Provider transport unit tests live outside the protected acceptance baseline at `backend/unit_tests`; run `uv run pytest tests unit_tests` with the existing isolated test-database environment for the combined check. The [AI run record](../workflow/agents/runs/2026-10-21-organiser-ai-analysis.md) separates automated, live-provider, browser and pending human evidence.

## Delivery evidence to maintain

Document deployment/recovery steps and the online application URL when hosting is implemented. Keep development and production databases, credentials and configuration separate; production model/database credentials stay server-side. Record client-bundle/log secret checks and deployed synthetic smoke journeys for all three workspaces, including each role's real LLM integration and manual fallback. Link revision-specific evidence to the release gates in project context. This slice does not provide password recovery, email verification, rate limiting or a production deployment.

### Run all automated tests in Git Bash (Windows)

With Docker Desktop running, execute this block from the repository root. Dependencies must already be installed (`uv sync` in `backend/` and `npm ci` in `frontend/` for first-time setup).

```bash
docker compose --profile test up -d test-db

until docker compose --profile test exec -T test-db pg_isready \
  -U eventapp_test -d eventapp_test; do sleep 1; done

# All backend tests
(
  cd backend
  export DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
  export TEST_DATABASE_URL='postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test'
  export EVENTAPP_ALLOW_TEST_DB_RESET=true
  export PYTHONPATH="$(pwd -W)/.venv/Lib/site-packages"
  uv run pytest -q
)

# All frontend tests
(
  cd frontend
  NODE_OPTIONS=--no-experimental-webstorage npm test
)
```

At the 2026-10-21 request-flow baseline, these suites contain195 backend and173 frontend cases; counts may increase with future changes. The suites run separately so frontend tests still run if backend tests fail. Subshells keep directory/environment changes local. Only the disposable test database on5433 is reset; development data on5432 is not used by tests. The PYTHONPATH and Node26 settings address the Windows runtime issues noted below. Automated suites do not execute the separate Chrome/NVDA/manual accessibility checks.

### Windows test runtime notes

If the legacy migration subprocess uses a base Python without the virtual environment packages, set `$env:PYTHONPATH = (Resolve-Path '.venv/Lib/site-packages').Path` from `backend/` before `uv run pytest`. For Node 26 jsdom tests, set `$env:NODE_OPTIONS = '--no-experimental-webstorage'` in the frontend test terminal. These are process-local compatibility settings, not changes to the protected test runner.

Approved request-flow amendment: [submit r4](../specs/applications/submit-business-applications.md), [decision r2](../specs/applications/decide-applications-and-show-outcomes.md), auth/UI r4 replace known-ID grants with open-event applications and actionable safe errors. See [current checks and limitations](../workflow/agents/runs/2026-10-21-open-participation-requests.md) before treating the amendment as verified.
