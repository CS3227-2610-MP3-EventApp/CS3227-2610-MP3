# Test Business preparation and AI drafts locally

F06-US03 covers persisted manual tasks/budgets; F06-US04 adds private editable AI drafts and explicitly confirmed, selected append-only adoption. Booth/setup supplies current organiser facts. Follow the numbered sections in order. Commands use **Git Bash on Windows**, matching [Business application testing](BusinessApplicationsTesting.md). Do not paste these shell commands into PowerShell.

Contracts: [manual preparation r4](../specs/business-preparation/manage-preparation-tasks-and-budgets.md), [setup v1](../specs/business-preparation/assign-booths-and-publish-setup-details.md), [AI preparation r3](../specs/business-preparation/generate-preparation-drafts.md), and [shared business jobs r3](../specs/shared/monitor-and-recover-ai-tasks.md). [Phase 5 evidence](../workflow/agents/runs/2026-10-22-preparation-drafts-implementation.md) distinguishes actual checks from pending independent/human/browser review. These instructions do not mark those gates complete.

## 1. Prepare dependencies and databases

Start Docker Desktop. Prerequisites are Python3.12, uv, and Node.js ^20.19.0 or >=22.12.0; see [DeveloperGuide](DeveloperGuide.md). From the repository root:

```bash
docker compose --profile test up -d db test-db
docker compose exec db pg_isready -U eventapp -d eventapp
docker compose exec test-db pg_isready -U eventapp_test -d eventapp_test
cd backend
uv sync
export DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
uv run alembic upgrade head
```

Repeat readiness commands until both databases accept connections. Development uses5432; disposable automated tests use5433. Migrations are additive. Never reset the retained development database or use it as TEST_DATABASE_URL.

In another terminal, from the repository root:

```bash
cd frontend
npm ci
```

If dependencies are already installed and current, installation need not be repeated.

## 2. Provision a local demonstration event and organiser

In the first terminal, still in backend/:

```bash
EVENT_ID="$(uv run python -c 'import uuid; print(uuid.uuid4())')"
ORG_USERNAME="prep-org-$(date +%s)"
uv run python -m app.auth.bootstrap event \
  --id "$EVENT_ID" \
  --title 'Singapore Design and Makers Fair 2027' \
  --timezone Asia/Singapore \
  --starts-at 2027-01-01T09:00:00+08:00 \
  --ends-at 2027-01-01T18:00:00+08:00
uv run python -m app.auth.bootstrap organiser \
  --username "$ORG_USERNAME" \
  --email "${ORG_USERNAME}@example.test" \
  --display-name 'Avery Tan' \
  --event-id "$EVENT_ID"
echo "Organiser username: $ORG_USERNAME"
echo "Event ID: $EVENT_ID"
```

Enter and remember an initial password at the hidden prompts. Copy the printed event UUID for the worker terminal later. Use only invented records throughout this event, including application contacts, setup, needs, selected tasks and budget descriptions. An allowlisted event is not automatic anonymisation.

## 3. Start the API and website with AI disabled

In the same backend terminal (which retains EVENT_ID):

```bash
export AI_ENABLED=false
uv run uvicorn app.main:app --reload --host 127.0.0.1
```

Leave it running. In the frontend terminal:

```bash
npm run dev
```

Open http://localhost:5173. If Vite chooses another port because5173 is occupied, stop and free5173 or configure trusted origins deliberately; the examples assume5173. Use separate browser profiles or normal/incognito windows for organiser and Business, because a profile shares a session cookie.

## 4. Verify application, setup and manual preparation

1. Sign in as the provisioned organiser and replace its initial password when prompted. Open **Application Reviews**, select **Singapore Design and Makers Fair 2027**, turn on **Accepting applications**, **Save application settings**, then **Confirm settings**.
2. In the separate Business session, create an invented Business account. Open **Applications**, select the event, enter invented application/contact fields, **Save draft**, **Review submission**, and **Submit application**. The [application guide](BusinessApplicationsTesting.md#website-journey-to-verify) gives the detailed submission/decision checks.
3. As organiser, open the submitted application, **Approve application**, then **Confirm approval**. In its setup section, enter a recognisable booth label and instructions, then **Save setup**. Confirm the Business cannot see the new draft yet. Choose the separate **Publish setup**, review the saved revision, and confirm publication. Only then should the Business see those details. Later draft saves retain the last published version until you publish again. AI generation itself does not require acceptance or an assigned booth; this accepted example tests the complete setup-dependent journey.
4. As Business, open **Preparation & Budget**, select this participation, add a task such as `Prepare display table`, set **Spending limit (SGD)** to100, and optionally **Add item** under **Cost breakdown**, with quantity3 and unit price SGD1.23. A category such as Printing is optional. Save. Expect estimated spend SGD3.69 and remaining budget SGD96.31. A limit can also be saved with no breakdown items. Reload: task, line and total remain. Note the original row counts/content.
5. Open **AI Preparation Draft** from the Business home. Choose the same Business, event and existing participation. Expect current authoritative setup facts, the manual context choices, an invented-data notice and **Open Preparation & Budget**. That page has **Back to AI preparation**, returning to the same context and warning if edits are unsaved.
6. Enter a preparation request, for example `Prepare a display table and printed handouts for the market`. This is what **Needs** means. No invented-data checkbox is required. The button is disabled until needs and an existing participation are present, or while a job is already active. Generate while AI remains disabled: expect no successful draft and a safe outcome message (the UI may report that it checked request history). The manual-preparation link must remain usable. Reopen manual preparation and verify its original contents are unchanged.

If no participation is available, create/save an application for that event first. Selecting an event alone does not create participation or preparation records.

## 5. Enable the bounded real-provider check

This makes real provider requests and consumes provider usage. Keep API keys local in ignored backend/.env; never put them in Git, screenshots, chat or command arguments. Configure these backend-only fields there, using your actual accessible model:

```dotenv
SOCLAAS_API_KEY=<your-local-key>
SOCLAAS_MODEL=<exact-accessible-model-id>
```

Stop the API with Ctrl+C in its terminal. In that same terminal, still in backend/ and retaining the EVENT_ID from section2:

```bash
export ENVIRONMENT=development
export AI_ENABLED=true
export AI_SYNTHETIC_ONLY=false
export AI_REAL_DATA_ENABLED=true
export AI_ALLOWED_EVENT_IDS="[\"$EVENT_ID\"]"
export SOCLAAS_REQUESTS_PER_MINUTE=30
uv run python -m app.ai.doctor
uv run uvicorn app.main:app --reload --host 127.0.0.1
```

Expect doctor to validate the configured model. If it fails, correct the local configuration before proceeding; do not expose its credentials. The provider endpoint is fixed by the existing adapter. Do not enable production or allowlist real-data events.

Open a third terminal from the repository root for the worker. Replace the placeholder below with the printed UUID from section2; do not generate another UUID:

```bash
cd backend
export DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
export EVENT_ID='PASTE_THE_EVENT_UUID_FROM_SECTION_2'
export ENVIRONMENT=development
export AI_ENABLED=true
export AI_SYNTHETIC_ONLY=false
export AI_REAL_DATA_ENABLED=true
export AI_ALLOWED_EVENT_IDS="[\"$EVENT_ID\"]"
export SOCLAAS_REQUESTS_PER_MINUTE=30
uv run --python 3.12 python -m app.ai.worker
```

Leave API, frontend and worker running in their separate terminals. The worker shares the queue with organiser AI; use a local development environment without unrelated queued work. A missing worker leaves jobs pending. API and worker must use the same event allowlist/key/model/database.

### If the worker says No module named app

The worker belongs to **F06-US04**, not F09. Run it inside backend/ using the command above. From the repository root, this alternative selects the directory and Python version explicitly (set the same database/AI/event variables first):

```bash
export DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
uv --directory backend run --python 3.12 python -m app.ai.worker
```

A Python3.13 path indicates the wrong project/interpreter was selected. `uv --directory backend run --python 3.12 python -c "import app.ai.worker; print('Worker import OK')"` verifies imports without processing a job. A missing DATABASE_URL must be configured in that terminal or ignored backend/.env; shell variables from another terminal are not inherited. Provider keys stay in backend/.env, not command arguments. A running worker alone does not enable AI: both API and worker must have matching opt-in, allowed event UUID and provider configuration. Restart both after configuration changes.

Real-data use here remains development-only. Event/setup/needs/selected preparation text reaches the provider; account contact fields are excluded. App records have30day job/draft retention. Provider retention is unverified, and clearing the local database does not delete provider-held copies. Production deployment is not enabled by these commands.

## 6. Verify generation, editing and adoption in the website

1. Return to **AI Preparation Draft**. Enter `Suggest two display tasks and two material estimates for a community market; no suppliers or external actions.` Select only the manual task you intend to share, Review the AI-sharing disclosure. Clicking **Generate preparation draft** acknowledges that only the displayed event/setup facts, your needs and selected preparation details will be sent, then creates a job. Use **Refresh job status** until it completes or gives a safe failure. Output is variable; exact task wording/prices are not assertions.
2. Expect authoritative event/setup facts separately from suggested tasks and cost items. Known generated prices must be **estimate**; absent prices must remain **unknown**, not zero or quotations. Review task semantics yourself: exact structured source validation does not prove every suggestion is sensible.
3. Change a suggested task title to an invented reviewed title and **Save draft**. Reload and expect the edit to persist. Open manual preparation separately: original rows must be unchanged.
4. For an arithmetic check, edit a draft line to quantity3 and unit price1.23: expect3.69. Clear its price: expect unknown/incomplete. Set price0: expect a known zero estimate. Save before adoption; unsaved edits disable adoption preview. Restore any content you want to retain.
5. Select one **Select task** and one **Select cost item** in the private draft. These are different from **Share task context** / **Share budget context**, which control outbound source context. Choose **Adopt selected items**. In **Confirm preparation adoption**, inspect selected content, target and revisions. **Cancel**: manual preparation must remain unchanged.
6. Preview again, then **Confirm adoption**. Expect one appended task and one appended cost item, existing items/order preserved, and adoption metadata. Reload: copies and adoption state persist. Repeating adoption must not add duplicates; adopted drafts are read-only.
7. Generate a fresh draft for a separate stale-source case. Before adopting it, edit/save manual preparation in another tab, or have the organiser publish revised setup. Saving an organiser-only setup draft by itself must not invalidate AI sources. Adoption must fail as stale and preserve the newer manual data. Review/regenerate using current facts rather than silently adopting.
8. For cancellation, generate a fresh request and choose **Cancel** while pending/running. The terminal state must prevent a later draft from being published. A request already dispatched may have incurred provider usage. Manual preparation remains intact. If completion wins before your click, repeat with another request or stop the worker briefly to observe pending cancellation; do not count an unobserved race as a pass.
9. Restart the API against the same database, without reseeding. Reload the Business session and check saved manual rows, draft edits and adoption metadata. This checks storage across API restart; database restart is a separate check.
10. Sign out and revisit the protected URL; private input/draft content must disappear. Another Business or an organiser must not read the first requester's private draft. Direct server-scope denials are exercised by the automated acceptance cases below.

For keyboard and accessibility: traverse controls with Tab/Shift+Tab, use keyboard activation, check visible focus and dialog cancellation/focus return. Check320 CSS-pixel width and actual400% browser zoom, light/dark themes and Chrome+NVDA. Observe whether focus/pageshow conceals private input during authority checks and restores same-scope unsaved input only after access is confirmed. Record results, not inferred passes. The implementation session's browser helper failed initialization, so these manual checks remain particularly important.

## 7. Run automated acceptance and unit checks

Run reset suites sequentially, never against development storage. Stop the live demonstration worker first to avoid unrelated background provider requests. In a fresh Git Bash terminal from the repository root:

```bash
cd backend
export DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
export TEST_DATABASE_URL='postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test'
export EVENTAPP_ALLOW_TEST_DB_RESET=true
uv run python -m pytest tests/test_business_jobs.py tests/test_preparation_drafts.py tests/test_ai_analysis.py -q
uv run python -m unittest discover -s developer_checks -v
```

At the recorded Phase5 snapshot, the earlier snapshot had111 acceptance cases and5 developer-owned checks; the refinement adds tests, so current totals may be higher. Run `uv run python -m pytest tests/test_business_refinements.py -q` as well for limits, registration, own profile and save/publish separation. These acceptance cases use fake provider seams with real isolated PostgreSQL, covering authorization, stale writes/sources, malformed/injected output, exact arithmetic, cancellation, quotas/retry, rollback, retention and manual preservation. They do not establish live provider integration.

From a separate terminal at the repository root:

```bash
cd frontend
export NODE_OPTIONS='--no-experimental-webstorage'
npm test
npm run build
```

The earlier snapshot had321 tests; current refinements add cases. Expect the entire current suite and build to pass. The existing bundle-size warning is nonfatal. For just Phase5 UI, use `npm test -- tests/preparation-drafts.test.tsx` (25cases at the earlier snapshot). The independently designed acceptance baseline has one explicitly approved fixture type annotation recorded in [DRAFTS-TCR-03](../workflow/agents/runs/2026-10-22-preparation-drafts-fixture-types-tcr.md); its independent review remains pending.

For the full backend regression suite, use the same guarded environment and `uv run python -m pytest tests unit_tests -q`. Earlier full execution passed414/415 before the placeholder-job repair; all111 affected cases passed afterward. Do not treat that history as a newly executed full415-case pass. Future test counts can change; investigate failures instead of editing expectations to fit code.

## 8. Run the self-contained live HTTP/provider smoke

This is optional if you performed the live website journey, but gives reproducible actual-provider and restart evidence. Keep Docker databases running and backend/.env key/model configured. Stop other workers and ensure no unrelated pending/running AI jobs exist; leave8765 free. From the repository root in Git Bash on Windows:

```bash
backend/.venv/Scripts/python.exe tools/phase5-http-smoke.py
```

The helper applies additive migrations, compares existing-column fingerprints, creates new invented event/accounts, opts in only within its process for that event, starts its own API on8765, dispatches a real provider job, edits/adopts selected items, restarts its owned API and reads persisted records. It stops its API afterward and leaves invented development records in place. It refuses unrelated active queue work. It does not automate the browser or expose reusable login credentials.

Expect two PASS messages: migration/current-column preservation with the starting schema revision, and the complete real HTTP/provider/adoption/API-restart journey. A run starting at0010 proves current migration idempotence/preservation, not an original populated0009-to0010 upgrade witness. Record a provider error as a failed check, not a reason to weaken output validation.

## 9. Finish and record observations

Stop the worker and API with Ctrl+C. In the API terminal set `export AI_ENABLED=false` before restarting for ordinary manual work. Close the dedicated worker terminal so its inherited AI opt-in cannot keep running; do not persist the temporary event allowlist/AI enablement into shared configuration. The frontend may remain running for manual preparation.

Record date, specification revision3, staged diff/commit under test, commands, actual results and manual observations in the [Phase5 session log](../logs/isaac/2026-10-22-f06-phase-5-drafts.md) or a new dated session log. Human teammate/security review, browser accessibility, human log verification and online delivery remain distinct from passing local tests.

## Refinement checks added on2026-10-22

- Duplicate registration identifies the conflicting username/email/business-name field without echoing existing account data. Login stays generic.
- New Business application contact fields start with the signed-in owner's name/email and remain editable; existing saved/dirty contacts are preserved.
- Dates such as2027-01-01T01:00:00Z display01 Jan2027 09:00 in Asia/Singapore; underlying API values remain ISO.
- Setup draft saves remain organiser-only; publication is a separate explicit action. AI sees only published setup.
- Overall spending limit and optional categorized cost items persist; adopting AI items preserves the limit and existing items.
- Twenty checklist tasks use compact desktop rows and reflow on narrow screens, including long titles/dates. Each manual-context checkbox occupies its own row.
- Scroll down, leave the window and return: authority revalidates silently in the background (master SILENT-TCR-01), so the page stays visible at the same position with same-scope unsaved input intact. Revoked access must still purge private content once the check answers.
- Known local helper-event titles were renamed without deleting records. Future helpers use realistic event titles. `tools/rename_demo_events.py` dry-runs exact-name matches; `--apply` updates only those matches and advances metadata revisions.
