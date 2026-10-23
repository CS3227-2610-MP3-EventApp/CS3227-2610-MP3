# F09 Phase 3 handoff (approve external actions)

Prepared 2026-10-23 by the Phase 2 session for a different agent continuing the F09 plan. Owner: Isaac. This is a handoff record, not a specification, approval or test baseline.

## Delivery table

| Phase | Spec to develop | Status at handoff | Deliverable and completion boundary |
| --- | --- | --- | --- |
| 1 | [Draft promotional concepts](../../../specs/business-preparation/draft-promotional-concepts.md) - **F09-US01** | Done, committed `11272d3` (baseline `2226e54`, `6eaeb91`) | Generate poster copy, freebie concepts and layout briefs; save and edit private drafts. Validate factual event claims and preserve drafts on AI failure. |
| 2 | [Compare suppliers](../../../specs/business-preparation/compare-suppliers.md) - **F09-US02** | Done. Revisions 4 and 5 approved by Isaac 2026-10-23. Committed `9d043fc`, `a2243e5`, `fdd1477` | Research printers, snacks and freebie suppliers; save comparisons and shortlists with source links, retrieval times, quantities, estimated prices, delivery constraints and unknowns. Live success about 9/12 runs (model-dependent). |
| 3 | [Approve external actions](../../../specs/shared/approve-external-actions.md) - **F10-US03 dependency** | **Next. Not started.** Spec is revision 1, status Draft, human approval pending | Deliver the business sandbox approval contract: exact payload/recipient, actor and revision binding, expiry, permission rechecks, duplicate prevention and recorded outcomes. Coordinate this shared spec with its organiser consumer. |
| 4 | [Review procurement proposals](../../../specs/business-preparation/review-procurement-proposals.md) - **F09-US03** | Not started; depends on Phase 3 and on the Phase 2 shortlist | Save both quotation-request and purchase/cart drafts, review exact details, then approve and execute a clearly labelled simulation using Phase 3. |
| 5 | Integrated F09 verification - existing specs | Not started | Demonstrate concepts -> sourced supplier shortlist -> saved proposal -> exact approval -> simulated outcome. Verify privacy, stale sources/approvals, failures, cancellation, persistence and human review across the journey. |

## Starting point for Phase 3

- Branch `itzxitzx/basic-business-features`; HEAD at handoff is `fdd1477`. Untracked `soclaas_api_reference.txt` is intentionally not committed.
- Read first: `AGENTS.md`/custom instructions, `workflow/README.md`, `specs/README.md`, `specs/shared/approve-external-actions.md` (AC01-AC06, F10-US03), `docs/security.md` (SEC01, 02, 06, 07, 09, 10, 11), `docs/project.md` (RD07 action levels), `docs/architecture.md` (shared contracts), and `specs/shared/monitor-and-recover-ai-tasks.md` (names this spec as the governing contract for any external write).
- The spec is shared: its other consumer is the organiser (venue email, F10-US03; see also `specs/programme/draft-and-publish-disruption-announcements.md`, which requires this approval contract before any automated external send). Phase 3 scope is the **business sandbox subset** only. Check the organiser consumer before changing shared contract fields, and do not write another module's tables directly.
- Phase 4 will consume the approval contract for quotation-request and purchase/cart simulations, so keep the payload binding generic (exact payload, recipient/seller, items, quantities, amount, currency, source revisions, actor, expiry).
- Phase 2 surfaces to reuse or respect: owner-private supplier shortlist (`supplier_shortlists`, `SupplierShortlist v1` with revision CAS), job/AI gate and worker conventions in `backend/app/ai/`, migration chain after `0014`, access checks via `_authority`-style creator-ownership plus active business membership.
- No real email, order or payment may occur. Every outcome must be clearly labelled simulated.

## Required process (from repo instructions)

1. Specification analyst/draft-spec skill: refine the Draft spec (revision, scope, interfaces), list unresolved product/architecture decisions and **ask Isaac** to decide. Do not edit approved or non-Draft specs without a new revision and approval.
2. Independent test designer: acceptance tests and fixtures before implementation; developer must not edit protected tests. Faulty tests go through `workflow/agents/templates/test-change-request.md`.
3. Developer implements plus developer-owned unit checks.
4. Independent behaviour and security reviews (authorization, privacy, AI safety/grounding, injection, approval boundaries). Reviewers do not implement.
5. Update specs, docs and a `logs/isaac/` summary; commit when the phase is complete.

## Practical notes learned in Phase 2

- Custom role models (e.g. `claude-sonnet-5-5`) were unavailable; general-purpose agents were used with role instructions. Record this honestly.
- DB tests need env: `DATABASE_URL` (from `backend/.env`, never print), `TEST_DATABASE_URL=postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test`, `EVENTAPP_ALLOW_TEST_DB_RESET=true`, `PYTHONPATH` = backend dir; run from `backend/` with `.venv\Scripts\python.exe -m pytest tests unit_tests developer_checks`. Full run takes about 10 minutes. Developer DB checks must run together with `tests/` so the protected conftest guard initialises first.
- Frontend: `NODE_OPTIONS=--no-experimental-webstorage`, `npm.cmd test`, `npm.cmd run build` in `frontend/`.
- Real-provider smoke scripts (`tools/supplier-http-smoke.py`, `tools/supplier-browser-smoke.mjs`) make real bounded calls and need ports 8000, 5173, 9224 free.

## Open items carried forward

- Human verification of the Phase 1 and Phase 2 logs is pending.
- Deferred supplier-extraction improvements (model re-ask repair, span-based server derivation, JSON-LD pre-extraction, page ranking, curated sources, "no supported offers" UI) need a new specification revision and approval.
- Residual Low/Medium security items from the Phase 2 review: short names may match inside longer words; unrelated same-page text could be combined as a product name.
