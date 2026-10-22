# Organiser AI application analysis: local testing

This guide accompanies F04-US02 and the organiser job-control slice of F10-US02. Implementation and verification evidence are recorded in the [run record](../workflow/agents/runs/2026-10-21-organiser-ai-analysis.md); pending checks there are not passing claims. Use a dedicated event containing invented records only.

## Start and configure

Follow [DeveloperGuide](DeveloperGuide.md) to start PostgreSQL, migrate with `uv run alembic upgrade head`, start FastAPI, provision an organiser/event and start the frontend. Compose defaults to development port 5432; Dylan's existing running development container currently binds 5434. Check `docker compose ps` and match `DATABASE_URL` to that binding. The separate disposable test database uses 5433.

Add these settings to your ignored `backend/.env`, filling the key and exact accessible model locally:

```dotenv
AI_ENABLED=true
AI_SYNTHETIC_ONLY=true
AI_SYNTHETIC_EVENT_IDS=["22222222-2222-4222-8222-222222222222"]
SOCLAAS_API_KEY=<your-local-key>
SOCLAAS_MODEL=<exact-accessible-model-id>
SOCLAAS_REQUESTS_PER_MINUTE=30
```

Only allowlist a dedicated event with invented application descriptions and rubric instructions. Excluding contact columns cannot remove personal information embedded in free text. Restart FastAPI after changing configuration. Production calls remain disabled.

From `backend/`, inspect accessible models and verify the selected model:

```sh
uv run python -m app.ai.doctor
```

After selecting a model, a deliberate fixed invented-data probe is available:

```sh
uv run python -m app.ai.doctor --probe
```

The probe incurs provider usage. Keep the key local; do not put it in screenshots, chat, command arguments or Git. Missing/invalid configuration should produce a safe failure, not a secret-bearing traceback.

Start the durable worker in another terminal from `backend/`:

```sh
uv run python -m app.ai.worker
```

The API queues jobs; this separate process executes them. The 180-second job deadline includes queue time, so start the worker before requesting analysis. `--once` processes a single available job for troubleshooting. Do not run multiple backend test suites against the disposable database concurrently.

## Browser flows

1. Sign in as the assigned organiser, open Application Reviews and open applications for the dedicated event. Register two invented businesses using `.test` addresses, then submit their applications through the existing Business workflow if no submissions exist. Use similar invented descriptions for a possible-text-match example and a different description for a nonmatch.
2. Open AI application analysis, inspect the starter criteria, edit and save the rubric. A first save creates revision 1. A second save creates an immutable new revision.
3. Choose a frozen submitted application, select Analyse application and explicitly confirm that the event contains invented data. Start the job. Observe pending/running and the validated result or safe failure. Manual application review remains available.
4. Inspect each criterion's status, explanation and quoted evidence, source/rubric revisions and comparison references. Possible matches are limited text-overlap signals. The model does not approve or reject applicants. Existing application decisions should be unchanged.
5. Save a changed rubric and reload history. The previous report keeps its original facts and shows stale status. Generating a new report uses the newly saved rubric.
6. Use two tabs to edit the same rubric revision. Save the first, then save the second. Expect a conflict and preserve the second tab's unsaved edits until you explicitly reload.
7. Start then cancel a job. Before dispatch, no provider attempt should occur. After dispatch is claimed, the UI warns that provider usage may already have occurred; a late result is discarded. Repeated cancellation returns the current terminal state.
8. Stop the worker, queue a job, then restart the worker: a pending job remains durable. An overdue running job becomes an actionable interrupted failure and is not automatically replayed. Already completed results remain available.
9. Try an event absent from `AI_SYNTHETIC_EVENT_IDS`, omit the invented-data confirmation, or use another role/account. Expect server denial without provider transmission. Sign out and refresh: authentication is required.
10. Check both themes and keyboard focus, rubric labels, confirmation controls, status announcements and narrow screens. Record manual observations separately from automated component tests.

## Limits and cleanup

Each owner may create ten jobs per UTC day and have one active job. Failed/cancelled accepted jobs still count; replaying the same request ID does not create a second job or consume another application quota slot. Workers use at most two concurrent analysis requests each; the PostgreSQL gate limits analysis dispatch attempts, including retries, across workers. Initial model discovery adds one control request per worker process, and doctor checks make additional API requests. Leave headroom below the actual key's request limit; provider budgets and 429 responses remain authoritative.

Terminal jobs and reports expire after 30 days. Explicit cleanup preserves application records, decisions, rubric versions and content-free audits:

```sh
uv run python -m app.ai.worker --cleanup
```

Automated fake-provider tests validate application behavior and PostgreSQL persistence. Only a successful deliberate SoCLaaS probe establishes live-provider connectivity; neither establishes lecturer acceptance, semantic correctness or production privacy approval.

## 2026-10-22 data-sharing refinement

The current UI uses a normal confirmation disclosure and Start analysis; it no longer asks for an invented-data pledge. For explicitly authorized development real-data use, set AI_ENABLED=true, AI_SYNTHETIC_ONLY=false, AI_REAL_DATA_ENABLED=true and AI_ALLOWED_EVENT_IDS to the exact event UUID list in both API and worker processes. Keep key/model backend-only. Use the root-safe Python3.12 worker command in [DeveloperGuide](DeveloperGuide.md). Contacts remain excluded, but free text can contain personal data; provider retention is unverified and local deletion does not delete provider copies. Production deployment/calls remain disabled. Earlier synthetic-only steps above are retained historical configuration; the current refinement supersedes their UI confirmation instruction.
