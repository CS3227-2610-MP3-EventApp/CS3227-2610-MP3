# EventApp developer guide

For a guided demonstration, follow the [three-role user walkthrough](UserGuide.md#three-role-smoke-walkthrough). Historical stage-specific testing guides are in [the archive](archive/README.md).

## Shared development agents

Capability specifications live under root `specs/`. Read the [spec definition, standard and index](../specs/README.md); draft from [the canonical template](../specs/TEMPLATE.md). Both draft and finalized specs stay there, with approval and evidence recorded in the document. Project planning, security and architecture live under docs/; [workflow/](../workflow/README.md) contains the development process.

Invoke `$draft-spec` to create a new capability spec from a story or refine an existing Draft. The [repository skill](../.agents/skills/draft-spec/SKILL.md) stops with a Draft and human questions; it does not audit finalized specs, verify implementation or synchronize specs with code. For example: `Use $draft-spec to refine specs/programme/create-and-publish-programme.md and surface its blocking product decisions.`

Open the repository root in Codex or Claude Code and follow [AGENTS.md](../AGENTS.md). All teammates use [the same six roles and workflow](../workflow/agents/README.md); assignments differ by story, approved scope, and file ownership. Start a new session after fetching configuration changes and verify actual role discovery/delegation. Do not mistake role files for evidence that agents ran.

Start with [the canonical story catalogue](UserStoriesAndFeatures.md) and the ordered roadmap in [project context](project.md), then read [security rules](security.md), [schema/contracts](architecture.md) and the relevant scoped specification. Product-role columns describe users; implementation and review responsibilities are assigned per task. Resolve blockers before dependent development. Use independently reviewed test cases and the approved immutable baseline; developers cannot weaken them. See the workflow for dispute handling and baseline checks.

## Evidence and assignment logs

Maintain [logs/](../logs/README.md) for summaries of all development prompts/interactions, including corrections, delegated work, checks and limitations. AI drafts are fact-checked against available evidence and then verified by their human owner. Pending human verification stays explicit. Historical backfills do not claim unavailable conversations.

## Current implementation status

The repository contains a React role-entry/workspace UI and FastAPI/PostgreSQL authentication: attendee/business registration, shared login/logout, cookie sessions, password replacement, CLI organiser/event provisioning and reusable role/membership guards. Business application submission/review/decisions, organiser programme management and the organiser invented-data AI-analysis slice have backend integrations. Manual preparation, booth/setup and the bounded business AI-draft slice are also implemented for local review; attendee browsing, manual plans, AI itineraries and event questions also have backend integrations; online application delivery remains a separate evidence gate. See [Business preparation and AI draft testing](archive/BusinessPreparationTesting.md) for the step-by-step F06 preparation journey. See [Business application website and API testing](archive/BusinessApplicationsTesting.md), [programme testing](archive/ProgrammeTesting.md) and [AI analysis testing](archive/AIAnalysisTesting.md) for local flows and their distinct evidence. Human/NVDA review remains pending. Apply additive migrations with `alembic upgrade head`; never reset retained development data to enable a feature.

## Run locally

### Prerequisites for Windows, Linux and macOS

| Requirement | Windows | Linux / macOS |
| --- | --- | --- |
| Source and shell | Git, local checkout, PowerShell | Git, local checkout, bash/zsh |
| Python | Python 3.12 and uv on PATH | Python 3.12 and uv on PATH |
| JavaScript | Node.js `^20.19.0` or `>=22.12.0`, with npm | Same version range |
| Database runtime | Docker Desktop running, Compose v2 | macOS: Docker Desktop; Linux: Docker Engine and Compose v2, daemon accessible to your user |
| Browser and ports | Modern browser; ports 5432, 8000, 5173 free; 5433 for tests | Same |
| Optional live AI | SoCLaaS key and accessible model; Tavily key for supplier research | Same |

Check `git --version`, `uv --version`, `uv python find 3.12`, `node --version`, `npm --version`, `docker compose version` and `docker info` before continuing. If Python 3.12 is missing, run `uv python install 3.12`. These instructions assume the tools are installed; uv installation instructions are at https://docs.astral.sh/uv/. Run each terminal from the repository root unless instructed otherwise. Shell environment variables do not carry into another terminal.

The F05 branch adds published programme changes/cancellation and manual/AI-assisted announcements. Apply migration `20261021_0006` before running it. Follow [F05 testing and teammate handoff](archive/DisruptionsTesting.md) for the new flows and the explicit F02 notification integration gate. Itinerary notifications are not complete merely because their tables and screens exist.

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
uv run python -m app.auth.bootstrap event --id 22222222-2222-4222-8222-222222222222 --title "Singapore Makers Weekend 2027" --timezone Asia/Singapore --starts-at 2027-03-06T10:00:00+08:00 --ends-at 2027-03-07T18:00:00+08:00
uv run python -m app.auth.bootstrap organiser --username smoke-organiser --email smoke-organiser@example.test --display-name "Jordan Lim" --event-id 22222222-2222-4222-8222-222222222222
```

macOS/Linux (bash/zsh):

```sh
cd backend
export DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
uv run python -m app.auth.bootstrap event --id 22222222-2222-4222-8222-222222222222 --title 'Singapore Makers Weekend 2027' --timezone Asia/Singapore --starts-at 2027-03-06T10:00:00+08:00 --ends-at 2027-03-07T18:00:00+08:00
uv run python -m app.auth.bootstrap organiser --username smoke-organiser --email smoke-organiser@example.test --display-name 'Jordan Lim' --event-id 22222222-2222-4222-8222-222222222222
```

What the commands do:

- **Project folder and runtime:** `Set-Location backend` (PowerShell) or `cd backend` (bash/zsh) enters the backend project. `uv run` uses its Python environment to run the provisioning tool.
- **Database connection:** `DATABASE_URL` tells the CLI to use your local development database on port 5432, not the disposable test database on port 5433.
- **Event seed:** The `event` command creates a sample event. `--id` gives it a unique ID; `--title`, `--timezone`, `--starts-at`, and `--ends-at` set its name, timezone, and start/end times. The timestamps include the UTC offset.
- **Organiser seed:** The `organiser` command creates an organiser account and grants it access to the event named by `--event-id`. That value must match the event's `--id`. The username, email, and display name identify the account.
- **Password and repeats:** For a new account, the CLI asks for an initial password twice in hidden prompts. The organiser must change it at first sign-in. Repeating a matching command does not reset the password or reactivate an inactive membership. Use synthetic details only.

After provisioning succeeds, make sure the backend is running with the same development database URL (Compose defaults to port 5432; check your actual container binding), and open the frontend URL printed by Vite. Select the **Organiser** tab, enter `smoke-organiser` or `smoke-organiser@example.test` as the username/email, enter the initial password you just set, and select **Log in**. On the required password-change page, enter that initial password as the current password, then enter and confirm a different new password (8–128 characters). After a successful change, the app opens the organiser workspace. Application Reviews provides named assigned events, explicitly confirmed open/closed settings and one-time submitted-application approval/rejection. Programme Management and attendee Explore programme are available. AI Application Analysis and attendee AI itinerary suggestions require the dedicated synthetic-data setup and safeguards described below. Business preparation, promotional concepts, supplier research and procurement proposals are available to business owners and use the AI configuration described in the business sections below.

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

Historical presentation evidence is recorded in the [role-entry run record](../workflow/agents/runs/2026-10-18-preview-role-entry.md). The [authentication run record](../workflow/agents/runs/2026-10-19-shared-authentication.md) records the current contract, protected tests, implementation and remaining review limitations. Shared guards require integration into each future domain endpoint. For detailed role-by-role manual flows, see [authentication manual testing](archive/AuthenticationTesting.md).

Configuration supports `ENVIRONMENT` (`development`, `test`, `production`) and `TRUSTED_ORIGINS` (a JSON array of exact frontend origins). Outside development, cookies require HTTPS; production requires explicit HTTPS trusted origins. Keep environment files, credentials and database URLs out of Git. Do not reuse the disposable test database for normal accounts.

Generate API artifacts after API changes from `backend/` with `uv run python -m app.export_openapi`, then from `frontend/` run `npm run api:types`. Commit the OpenAPI document and generated declarations together. Re-run the backend and frontend suites before claiming verification. Only delivered application cards are enabled for Business/organiser; other domain cards remain previews until their own capabilities are implemented.

The first organiser programme slice is governed by [programme revision 6](../specs/programme/create-and-publish-programme.md). Apply its additive migration before using Programme Management; existing authentication records must be preserved. See [programme testing and attendee API handoff](archive/ProgrammeTesting.md) for local flows, publication boundaries and consumer integration. The [run record](../workflow/agents/runs/2026-10-20-organiser-programme.md) records actual implementation/verification status; this guide is not a passing-test claim.

### Organiser AI analysis

The organiser analysis slice uses the existing Application Reviews page for immutable rubrics, explicitly confirmed analysis requests, durable job state/cancellation and validated evidence reports. It does not record decisions. See [AIAnalysisTesting](archive/AIAnalysisTesting.md) for local SoCLaaS configuration, model checks, the separate Python worker, browser flows and cleanup. AI is disabled by default; live requests require a dedicated allowlisted invented-data event and explicit development/test opt-in. Production processing remains disabled pending privacy approval.

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

## Attendee producer integration

Attendee browsing uses `/api/v1/attendee/events` and `/api/v1/attendee/events/{event_id}/programme[/{item_id}]`, with generated OpenAPI schema aliases, sibling event/venue/room facts and total-based pagination. Date filtering uses the event-local start date, including overnight activities. See the [integration session](../logs/yikbing/2026-10-21-attendee-integration.md) for exact checks and remaining review/delivery gates. The [historical consumer record](../workflow/agents/runs/2026-10-20-browsing-implementation.md) describes the earlier fixture-only implementation, not the current integration.

Attendee AI itinerary generation is exposed through `/api/v1/attendee/events/{event_id}/itinerary-generations` and `/api/v1/attendee/ai/jobs/{job_id}`. It creates owner-scoped background jobs in additive attendee-AI tables, validates suggestions against published programme revisions and attendee preferences, and never changes planning state until the attendee explicitly saves a current result. The worker enforces the synthetic-event allowlist (the current UI has no invented-data checkbox), daily limits, cancellation/failure states and provider-output validation; stale results cannot be saved. The attendee AI tests and review record in `backend/tests/test_attendee_ai_itineraries.py` and `workflow/agents/runs/2026-10-22-attendee-ai-itineraries-review.md` are the primary implementation evidence.

## 2026-10-23 master merge: migration renumbering

The business migrations now run after master's attendee/disruption chain as `20261023_0020` (preparation) through `20261023_0029` (external actions). A development or test database last upgraded on the pre-merge business branch is stamped with a retired revision ID and must be recreated: drop and recreate its `public` schema (synthetic local data only), then run `uv run alembic upgrade head`. Never do this against shared or real data.

## 2026-10-22 Business refinements

Apply additive migration `20261023_0025` (formerly 0011) for separate setup publication and nullable overall spending limits. Current own contact-profile endpoint does not expand CurrentActor. See [BusinessPreparationTesting](archive/BusinessPreparationTesting.md) for updated actual steps and real-data opt-in. From the repository root, set DATABASE_URL then use `uv --directory backend run --python 3.12 python -m app.ai.worker`; running outside backend without selecting its directory causes No module named app and may select Python3.13. Both API and worker need matching AI_ENABLED, AI_REAL_DATA_ENABLED, AI_ALLOWED_EVENT_IDS and backend key/model configuration. Production calls remain disabled. No provider retention or deletion guarantee is inferred from local cleanup.

## Supplier research configuration

Phase 2 adds backend-only `TAVILY_API_KEY` alongside configured SoCLaaS settings. Keep the value in ignored `backend/.env`; `.env.example` contains only the variable name. Apply migration `20261023_0028` (formerly 0014) and run the existing worker. Production AI remains disabled. Supplier requests use the existing development opt-in/event allowlist, explicit disclosure, shared owner quota and active-job controls. [SupplierResearchTesting](archive/SupplierResearchTesting.md) records scoped commands, real-call smoke scripts and verification limits.

## Configure AI for the three-role demo

Provision the event above first. For the User Guide demo, choose initial Organizer password `SmokeOrganiser-Init-2027` at both hidden CLI prompts; replace it with `SmokeOrganiser-Live-2027` on first login. These are public local-demo examples. Reuse existing accounts with their current passwords on repeat runs; preserve retained development data.

From the repository root, create the ignored configuration file **only if absent**.

PowerShell:

```powershell
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
```

Linux/macOS (bash/zsh):

```sh
if [ ! -f backend/.env ]; then cp backend/.env.example backend/.env; fi
```

Edit `backend/.env` locally. Replace conflicting older settings, retain the correct local database binding, and fill in your personal key and accessible model. Placeholders below are not runnable credentials.

```dotenv
DATABASE_URL=postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp
ENVIRONMENT=development
AI_ENABLED=true
AI_SYNTHETIC_ONLY=true
AI_REAL_DATA_ENABLED=false
AI_SYNTHETIC_EVENT_IDS=["22222222-2222-4222-8222-222222222222"]
SOCLAAS_API_KEY=<your-local-SoCLaaS-key>
SOCLAAS_MODEL=<exact-accessible-model-id>
SOCLAAS_REQUESTS_PER_MINUTE=30
# Only supplier research needs this additional key:
TAVILY_API_KEY=<your-local-Tavily-key>
```

Use only invented records in this allowlisted event. If you provisioned another event, replace its UUID. This configuration works for **all three roles**: Attendee AI specifically requires synthetic mode and `AI_SYNTHETIC_EVENT_IDS`; Organizer/Business resolve the same list when real-data mode is off. The development real-data configuration in earlier Business notes alone will not enable Attendee AI. Current screens show sharing notices rather than an invented-data checkbox. Production calls remain disabled. Never expose keys in frontend variables, screenshots or command arguments.

From `backend/`, either shell can check accessible models:

```sh
uv run --python 3.12 python -m app.ai.doctor
```

Set `SOCLAAS_MODEL` to an exact accessible identifier. The optional `uv run --python 3.12 python -m app.ai.doctor --probe` sends a fixed invented example and consumes provider usage. A probe is not evidence that each feature works.

Restart the API after configuration changes. In a **third terminal**, from the repository root, start the shared worker.

PowerShell:

```powershell
Set-Location backend
uv run --python 3.12 python -m app.ai.worker
```

Linux/macOS (bash/zsh):

```sh
cd backend
uv run --python 3.12 python -m app.ai.worker
```

Keep API, frontend and worker running separately. If you configured API settings in its shell instead of `.env`, repeat them in the worker shell. The shared worker handles Organizer/Business jobs and calls the Attendee worker when no shared-table job is claimed; there is no separate Attendee worker command to start. `--once` processes at most one job and exits. Ctrl+C stops the worker; `docker compose stop db` preserves the database volume.

### AI troubleshooting

| Symptom | Check / recovery |
| --- | --- |
| Job stays pending | Start worker before generation; API and worker must use the same database and configuration |
| Attendee unavailable but Business works | For this synthetic demo set `AI_SYNTHETIC_ONLY=true`, `AI_REAL_DATA_ENABLED=false`, and allowlist the exact UUID in `AI_SYNTHETIC_EVENT_IDS` |
| Model/authentication error | Check doctor and local key/model configuration; record bounded failure codes without provider payloads or secrets |
| Rate limit / daily quota | Wait for the applicable reset; failed/cancelled accepted jobs may count, so avoid blind retries |
| Stale output / conflict | Reload and review current source, rubric or preference revisions before generating/saving again |
| Proxy/origin error | Start API first; match Vite's exact origin in `TRUSTED_ORIGINS`, then restart API |
| Missing migration revision | Check branch/database history; do not reset shared or retained data |

Use the [User Guide walkthrough](UserGuide.md#three-role-smoke-walkthrough) to exercise each real LLM path. Record actual job IDs, revisions and outcomes separately from fake-provider tests. Safe failures verify fallback behavior, not LLM success. Provider retention is unverified and local cleanup does not delete provider copies.

## LLM implementation diagrams

These diagrams explain the inspected code, not proposed features or completed release gates. Mermaid renders on GitHub and in Markdown previews with Mermaid support. The UML view shows selected persisted fields and logical references, not every database column or ORM relationship.

### UML: role-specific AI data

```mermaid
classDiagram
    class AnalysisJob {
        UUID id
        UUID owner_id
        UUID event_id
        string workflow
        string kind
        string state
        int source_revision
        int rubric_revision
        JSON source_snapshot
    }
    class AnalysisRubricVersion {
        UUID event_id
        int revision
        JSON criteria
    }
    class AnalysisReport {
        UUID job_id
        int source_revision
        int rubric_revision
        JSON payload
    }
    class PreparationDraft {
        UUID job_id
        UUID participation_id
        int revision
        JSON source_facts
        JSON tasks
        JSON budget_lines
    }
    class ItineraryJob {
        UUID id
        UUID owner_id
        UUID event_id
        string workflow
        int preference_revision
        string state
        JSON result
    }
    class PlanningState {
        UUID user_id
        UUID event_id
        int preference_revision
    }
    AnalysisRubricVersion "1" <-- "0..*" AnalysisJob : event and rubric revision
    AnalysisJob "1" --> "0..1" AnalysisReport : Organizer analysis
    AnalysisJob "1" --> "0..1" PreparationDraft : Business preparation
    PlanningState "0..1" <-- "0..*" ItineraryJob : owner event and preference revision
```

`AnalysisJob` maps to **ai_jobs**. Organizer jobs use `workflow=analysis` and `kind=application_analysis` or `announcement_draft`; Business jobs use `workflow=preparation`, `promotional` or `supplier_research`. The separate `ItineraryJob` maps to **attendee_ai_jobs**, with `workflow=itinerary` or `question`. It is not a subclass of AnalysisJob. Rubric/planning arrows are logical revision references, not declared foreign keys; default preference revision 0 can exist without a planning row. The rubric arrow applies only to application-analysis jobs.

Sources: [shared AI models](../backend/app/ai/models.py), [draft models](../backend/app/preparation_drafts/models.py), [attendee AI models](../backend/app/attendee_ai/models.py), [planning models](../backend/app/attendee_planning/models.py).

### Organizer LLM: application analysis

Prerequisites: active event Organizer, frozen submitted application, saved rubric, configured provider/event and worker. The model receives rubric and bounded labelled participant-type/description sources. Contacts, business identity, requested space, decisions and unrelated applications are excluded from the prompt. Free text can still contain private information; use synthetic demo text.

```mermaid
sequenceDiagram
    actor O as Organizer
    participant UI as ApplicationAnalysis UI
    participant API as Analysis API
    participant DB as PostgreSQL
    participant W as Shared worker
    participant LLM as SoCLaaS
    O->>UI: Save rubric; confirm Start analysis
    UI->>API: Request with source and rubric revisions
    API->>DB: Authorize, check quota/idempotency, queue job
    API-->>UI: 202 and owned job
    W->>DB: Claim, recheck authority, read frozen sources
    W->>LLM: Bounded sources and rubric
    LLM-->>W: Structured findings and exact quotes
    W->>W: Validate schema, criteria and source evidence
    alt Valid and job still running/authorized
        W->>DB: Save report and completed state
    else Invalid, cancelled, overdue or revoked
        W->>DB: Preserve cancellation or record failure; no report
    end
    UI->>API: Poll status and retrieve history
    API-->>UI: Owned state and validated report
    O->>UI: Interpret report; decide separately
```

```mermaid
flowchart TD
    O[Organizer selects application and saved rubric] --> G{Authority and configuration valid?}
    G -->|No| E[Error; manual review remains]
    G -->|Yes| J[Queue owned analysis job]
    J --> W[Worker rechecks and calls LLM]
    W --> V{Schema and source quotes valid?}
    V -->|No| F[Failed; application unchanged]
    V -->|Yes| C{Still running and authorized?}
    C -->|No| D[Discard output]
    C -->|Yes| P[Private revision-bound report]
    P --> H[Human reviews and separately decides]
```

A newer rubric marks old reports stale. Exact-quote validation establishes traceability, not semantic accuracy. AI never accepts/rejects. See [spec](../specs/applications/analyse-applications-with-ai.md), [service](../backend/app/ai/service.py), [worker](../backend/app/ai/worker.py) and [UI](../frontend/src/applications/ApplicationAnalysis.tsx).

### Business LLM: preparation draft and selected adoption

Prerequisites: active Business owner, eligible participation, current preparation/setup context, explicit context selection, configured event/provider and worker. Only published setup facts and selected tasks/costs are shared. Generation creates a private draft; it does not replace manual preparation or purchase anything.

```mermaid
sequenceDiagram
    actor B as Business owner
    participant UI as PreparationDrafts UI
    participant API as Draft API
    participant DB as PostgreSQL
    participant W as Shared worker
    participant LLM as SoCLaaS
    B->>UI: Enter needs; select context; Generate
    UI->>API: Request revision-bound selected context
    API->>DB: Check owner, eligibility, revisions and quota; queue snapshot
    API-->>UI: Pending preparation job
    W->>DB: Claim preparation workflow; recheck context
    W->>LLM: Needs, published facts and selected tasks/costs
    LLM-->>W: Structured task and budget suggestions
    W->>W: Validate schema and source facts
    W->>DB: Recheck and save private draft on success
    UI->>API: Poll status and read owned draft
    API-->>UI: Draft or actionable failure
    B->>UI: Edit/save; select items; confirm adoption
    UI->>API: Adopt at expected revisions
    API->>DB: Recheck and append selected items once
    API-->>UI: Updated preparation revision
```

```mermaid
flowchart TD
    B[Owner selects participation and context] --> G{Authority and revisions valid?}
    G -->|No| E[Reject; manual data unchanged]
    G -->|Yes| Q[Queue preparation snapshot]
    Q --> W[Worker rechecks and calls LLM]
    W --> V{Valid output and still current/running?}
    V -->|No| F[Failure or discard; preparation unchanged]
    V -->|Yes| P[Private editable draft]
    P --> H[Human reviews and saves edits]
    H --> A{Selected adoption confirmed?}
    A -->|No| P
    A -->|Yes| C{Ownership and expected revisions valid?}
    C -->|No| E
    C -->|Yes| S[Append selected items once]
```

Costs remain estimates or unknown, not quotations. Repeated adoption does not duplicate items; stale sources require review. See [spec](../specs/business-preparation/generate-preparation-drafts.md), [service](../backend/app/preparation_drafts/service.py), [worker](../backend/app/ai/worker.py) and [UI](../frontend/src/preparationDrafts/PreparationDrafts.tsx).

### Attendee LLM: feasible itinerary generation

Prerequisites: authenticated Attendee, published activities, saved demo preferences, synthetic-event configuration and worker. The model receives permitted activity facts and interests/budget/break preferences. Account identity and accessibility preference data are excluded; accessibility checks stay server-side. A model infeasibility claim is not independently proven; manual planning remains available.

```mermaid
sequenceDiagram
    actor A as Attendee
    participant UI as ItineraryAI UI
    participant API as Attendee API
    participant DB as PostgreSQL
    participant W as Attendee worker via shared worker
    participant LLM as SoCLaaS
    A->>UI: Save preferences; Generate AI itinerary
    UI->>API: Request with preference revision
    API->>DB: Check attendee, event, revision, idempotency and quota
    API-->>UI: 202 and owned attendee job
    W->>DB: Claim attendee job; read published facts and preferences
    W->>LLM: Allowed activities and permitted preferences
    LLM-->>W: Feasible items or infeasible constraints
    W->>W: Validate IDs, revisions, times, schema and constraints
    W->>DB: Commit only while authorized/running
    UI->>API: Poll and compare current source/preference revisions
    API-->>UI: Result or stale/failure state
    A->>UI: Review; explicitly Save as draft
    UI->>API: Save via planning API with revision tokens
    API->>DB: Recheck current facts and save private draft
    A->>UI: Explicitly Accept itinerary
    UI->>API: Accept via planning API
    API->>DB: Revalidate and create accepted version
```

```mermaid
flowchart TD
    A[Attendee saves preferences] --> G{Synthetic event and provider valid?}
    G -->|No| E[Unavailable; manual planning remains]
    G -->|Yes| Q[Queue attendee itinerary job]
    Q --> W[Worker calls LLM with permitted facts]
    W --> V{Valid output and still authorized/running?}
    V -->|No| F[Failure or discard; plans unchanged]
    V -->|Yes| O{Feasible?}
    O -->|No| I[Show blocking constraints]
    O -->|Yes| C{Preference and programme revisions current?}
    C -->|No| T[Stale; cannot save suggestion]
    C -->|Yes| R[Human reviews]
    R --> S[Explicit Save as draft and server recheck]
    S --> H[Explicit Accept and server recheck]
    H --> P[New accepted version; preserve history]
```

See [spec](../specs/attendee-planning/generate-feasible-itineraries.md), [service](../backend/app/attendee_ai/service.py), [worker](../backend/app/attendee_ai/worker.py) and [UI](../frontend/src/attendee-planning/ItineraryAI.tsx). Event questions reuse attendee jobs with `workflow=question`; [questions.py](../backend/app/attendee_ai/questions.py) validates proposed claims and fills values from authoritative programme records. Verified facts are separate from any unverified AI summary. Questions never alter the programme or plans.

### Shared trust and failure boundaries

Inputs and model text are untrusted. The model has no database-write, email, order, payment or shell tools. APIs enforce role, membership, ownership, Origin and revisions; workers recheck authority/state at dispatch and persistence. Cancellation after dispatch may consume provider quota but must not commit late output. See [security rules](security.md) and relevant specs for exact bounds and outstanding gates. Fake-provider tests, diagrams and historical screenshots are not live-provider or production evidence.
