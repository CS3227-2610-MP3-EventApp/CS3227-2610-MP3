# Supplier research

Phase 2 implements F09-US02 under [compare-suppliers revision 3](../specs/business-preparation/compare-suppliers.md) and shared AI-task revision 6. Actual checks, review findings and remaining gates belong in the [run record](../workflow/agents/runs/2026-10-22-f09-phase2.md).

Apply backend migrations and start the API, frontend and existing AI worker (`uv run python -m app.ai.worker`). Open **Supplier research** in the Business workspace and select an owned participation. Application acceptance is not required. Comparisons, jobs and shortlist belong only to their creator, including within the same business.

Configure `TAVILY_API_KEY`, `SOCLAAS_API_KEY` and `SOCLAAS_MODEL` in ignored `backend/.env`. Never put keys in a `VITE_` variable, source, screenshots or logs. Development needs the existing explicit AI opt-in/event allowlist and per-request sharing confirmation. Production calls remain disabled. Synthetic checks use separate invented records and process-local synthetic allowlisting.

Read the disclosure, choose printing, snacks or freebies, and enter a brief, quantity, coarse Singapore delivery area and optional needed-by date. Do not enter contacts or a street address; free text is not automatically scrubbed. **Research suppliers** queues one Tavily Basic discovery request, independently retrieves up to three public pages within five total retrieval attempts, and uses SoCLaaS to extract evidence. Search snippets cannot ground an offer. Use **Refresh status** or **Cancel job**; cancellation cannot undo a request already sent or its possible provider charge.

Inspect field quotes, source host, retrieval time, listed currency/quantity basis, unknowns and qualifications. Prices and exact SGD item subtotals are estimates, not quotations. Shipping, tax and fees are excluded from subtotals. Unsupported currency precision or ambiguous product/price association remains unknown; no FX conversion occurs. Sources older than 24 hours are marked stale. A source link does not establish seller identity, safety, suitability, inventory or reliability.

Select offers and **Save shortlist**. Saved revisions prevent lost updates; reload saved state to resolve a conflict. Refreshing research creates a new immutable comparison and preserves prior selections. Clear a comparison's selections and save before deleting it. Deletion requires confirmation; old jobs cannot resurrect deleted comparisons. Saved evidence and shortlist remain until deleted, while jobs expire after 30 days. Local deletion does not promise provider-side deletion. No supplier contact, email, cart, order, approval or payment occurs in Phase 2.

Uncertain writes are reconciled with saved server state rather than automatically replayed. Existing evidence and manual preparation remain available after source/provider failures. Access loss clears private UI state. Use **Reload saved state** after uncertainty or a stale/deleted resource.

## Checks

Use the isolated database environment in [DeveloperGuide](DeveloperGuide.md); never run concurrent resetting suites against the same test database. From `backend/`, run `uv run pytest tests/test_supplier_research.py`, then `uv run pytest tests unit_tests developer_checks`. Set `PYTHONPATH` to the backend directory plus its virtual-environment site-packages where required on Windows.

From `frontend/`, run `npm.cmd test -- tests/supplier-research.test.tsx src/supplierResearch`, `npm.cmd test`, and `npm.cmd run build`. Use `NODE_OPTIONS=--no-experimental-webstorage` for the documented Node compatibility case; other platforms use `npm`.

The immutable baseline and protected paths are recorded in the run record. Synthetic acceptance tests do not establish real source/provider behaviour or deployed socket safety. Developer checks additionally exercise concrete numeric-peer/TLS and watchdog seams. `tools/supplier-http-smoke.py` checks actual providers, fresh synthetic HTTP records, migration preservation, restart persistence, CAS and deletion. `tools/supplier-browser-smoke.mjs` checks an isolated Chrome journey. These scripts make real bounded research/model calls with configured keys; run deliberately. Human review, accessibility assessment, provider retention and online production isolation remain separate gates.

## Pinned model

The configured text model is `qwen3.6:35b`, selected from the live SoCLaaS catalogue after a deliberate three-candidate synthetic extraction check under the existing timeout/output limits. It was the only tested candidate to return validated extraction within those limits. `qwen3.8:27b` timed out and `gemma4:26b` failed validation. This small task probe is not a universal quality benchmark. Keep the explicit identifier in `SOCLAAS_MODEL`; the adapter verifies availability and never silently switches to `default` or another model. Model selection does not relax schema, source, privacy or arithmetic checks. `tools/supplier-model-probe.py` deliberately makes real provider calls with fixed invented text.

DB-dependent developer checks must run together with tests/test_supplier_research.py (or the full tests directory) so its protected conftest separation guard initializes before application imports. Do not run those DB-dependent files alone against the development configuration.
