# Promotional concepts

Phase 1 covers F09-US01 under [promotional concepts revision 3](../specs/business-preparation/draft-promotional-concepts.md). The [run record](../workflow/agents/runs/2026-10-22-f09-phase1.md) records actual results and outstanding reviews; this guide is not a completion claim.

Apply the latest backend migrations, then start the API, frontend and the existing AI worker (`uv run python -m app.ai.worker`). Select **Promotional concepts** from the Business workspace. Select a business and an existing participation. Application acceptance is not required. Other members, including another owner of the same business, cannot open your creator-private concepts or jobs.

Review the brief disclosure and select event or published setup facts before choosing **Generate concepts**. The configured SoCLaaS provider receives only your brief and the selected values. User text is not automatically scrubbed. Normal development real-data calls require `AI_ENABLED`, `AI_REAL_DATA_ENABLED`, the operator event allowlist and the explicit request acknowledgement. A dedicated synthetic-only environment uses the existing synthetic opt-in/allowlist instead. Production calls stay disabled. Keys remain backend-only; never use a `VITE_` variable or commit `.env`.

Use **Refresh status** to retrieve progress. Cancel queued/running work where necessary; an already-dispatched request may still use provider quota, but its late result cannot be saved after cancellation. Every successful generation saves a separate concept. A failed request must preserve earlier drafts. An uncertain request is checked through history rather than automatically replayed.

Edit poster text, freebie names/descriptions and layout notes, then choose **Save draft**. Reopen the draft or refresh the page to check persistence. Creative text, including edits, remains unverified. Sourced facts are displayed separately with current, stale or unavailable status. **Refresh selected facts** explicitly refreshes selected fields using current revisions. Old unavailable source values must not be returned. Save creative edits before fact refresh.

**Delete draft** requires confirmation and the exact saved revision. Deleted concepts must disappear from detail/history and old job results. Saved concepts remain until deletion; terminal jobs expire after 30 days. Local deletion cannot delete provider copies, and provider retention remains unverified. This capability does not publish content, research suppliers, send email, buy goods or spend money.

## Automated checks

Use the documented isolated test database environment from [DeveloperGuide](DeveloperGuide.md). From `backend/`, run `uv run pytest tests/test_promotional_concepts.py`, then `uv run pytest tests unit_tests developer_checks`. On Windows, use the documented virtual-environment `PYTHONPATH` if migration subprocesses need it. Do not run two backend suites concurrently against the disposable database.

From `frontend/`, use `npm.cmd test -- tests/promotional-concepts.test.tsx`, then `npm.cmd test` and `npm.cmd run build`. The documented Node compatibility flag is `NODE_OPTIONS=--no-experimental-webstorage` when needed. On other platforms use `npm`.

Run the protected-baseline guard using the exact SHA and full path set in the run record. The acceptance cases use synthetic fixtures and a controlled provider seam; they do not prove live generation, provider retention, real browser accessibility or process-restart durability. Record live-provider, fresh-data/restart, migration preservation and independent behaviour/security observations separately. Required teammate review and session-summary verification remain human gates.
