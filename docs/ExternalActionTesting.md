# Business sandbox action approval

Phase 3 implements [approve-external-actions revision 2](../specs/shared/approve-external-actions.md). It is an API/service foundation for Phase 4; the business procurement editor is described below. Organiser email integration is not included. All execution outcomes refer to simulations. No seller is contacted and no order, booking or payment is made.

## API walkthrough

Use a signed-in business creator with a saved supplier snapshot and selected shortlist. Application acceptance is unnecessary. Supply the current shortlist ID/revision and selected snapshot/offer IDs; another creator's sources are inaccessible. Sources older than 24 hours cannot be used for a new approval or first execution.

1. `POST /api/v1/business/action-proposals` with `participationId`, `actionType` (`quotation_request` or `purchase_cart`), `shortlistId`, `expectedShortlistRevision` and `items:[{snapshotId,offerId,quantity}]`. Only quotation requests may include `recipientEmail` and `requestText`. Email is unverified and never sent. Save the returned proposal ID/revision and inspect its exact payload and digest.
2. To edit, `POST /api/v1/business/action-proposals/{proposalId}/revisions` with the typed payload and `expectedProposalRevision`. This creates immutable history; prior unexecuted approvals become unusable.
3. `POST /api/v1/business/action-proposals/{proposalId}/approvals` with `{proposalRevision}`. Review the returned actor, digest and 15-minute expiry. Creation alone grants no approval.
4. `POST /api/v1/business/action-approvals/{approvalId}/execute` with `{idempotencyKey:"<fresh UUID>"}`. The current approving creator and current source/revision/expiry checks are required before first execution. Retain the receipt; it is explicitly `simulated`.
5. Retry returns the stored receipt. Replaying an existing receipt still requires current access but does not perform another action or require fresh evidence. Reusing a committed key for another proposal revision conflicts.
6. Before execution, `POST /api/v1/business/action-proposals/{proposalId}/cancel` with `{expectedProposalRevision}` closes that revision across all approvals. Cancellation cannot undo an existing receipt.

Use `GET /api/v1/business/action-proposals?limit=20&offset=0` for private history and `GET /api/v1/business/action-proposals/{proposalId}` for details. Mutations require the application's trusted Origin and authenticated cookie; responses are no-store. No public deletion or reconciliation endpoint is supplied. A failed/uncertain result is retained and never automatically rerun. There is no public option to choose simulation outcomes.

Unknown prices remain unknown. Exact source-backed SGD arithmetic is an estimate, not a quotation or a delivered total; shipping, tax and availability remain qualified by evidence. Informational destination validation does not establish supplier trust or current availability.

## Automated verification

Acceptance: `backend/tests/test_external_actions.py`; [independent test plan](../workflow/agents/test-plans/2026-10-23-f09-phase3.md); [run/baseline/evidence](../workflow/agents/runs/2026-10-23-f09-phase3.md).

From `backend/`, use Python 3.12 and the existing guarded, isolated synthetic test database. `DATABASE_URL` must identify development separately; `TEST_DATABASE_URL` must identify the dedicated synthetic test target and `EVENTAPP_ALLOW_TEST_DB_RESET=true` must be explicit. Never point resettable tests at development or production. Do not print environment credentials. Run database suites serially because fixtures reset the isolated database.

Focused: `.venv\Scripts\python.exe -m pytest tests/test_external_actions.py -q`.

Regression: `.venv\Scripts\python.exe -m pytest tests unit_tests developer_checks -q`.

Controlled internal test seams provide deterministic server time and failed/uncertain simulation outcomes. The source producer uses synthetic search/page/model adapters; these tests do not establish live provider reliability. Tests exercise real API authentication, PostgreSQL transactions, concurrency and retained history. See the run record for actual results and remaining human/deployment gates; this guide alone is not evidence of passing behavior.

## Phase 4 procurement proposal editor (F09-US03)

[review-procurement-proposals revision 15](../specs/business-preparation/review-procurement-proposals.md) adds the business UI at `/business/procurement-proposals?participationId=<id>`, linked from **Supplier research** as **Procurement proposals from this shortlist**. It consumes the API above; it does not change it.

1. Choose **Purchase/cart proposal** or **Quotation request** and select saved shortlist entries. Entries from one research snapshot can be combined; other snapshots are disabled until the selection is cleared. Unknown-price entries stay selectable. The quantity is the researched quantity.
2. Quotation requests accept an optional unverified recipient email and request text. They are private simulation data, never sent and never stored in the browser.
3. **Create proposal**, then **Open proposal** to review the server-derived seller, source URLs (inert text), quantities and estimates. A complete total appears only when every line is known; otherwise a **Known-items subtotal** with the unknown line count, or a statement that all prices are unknown.
4. **Revise proposal** creates a new immutable revision (earlier approvals stop applying). **Approve proposal** asks for confirmation and shows the server expiry; it does not simulate. **Simulate approved proposal** is a separate action that records a sandbox receipt. **Cancel proposal** is final.
5. Before Simulate, the page stores a localStorage marker holding only actor, proposal and revision IDs. If the result is lost or unrecognised, the marker keeps Approve and Simulate disabled for that revision across tabs and reloads; create a new revision to continue. Signing out clears markers. Failed or uncertain receipts are final and offer no retry.

Checks: from `frontend/`, `npx vitest run tests/acceptance/procurement-proposals.test.tsx src/procurement`, then `npm test` and `npm run build`. The acceptance file uses a synthetic fake server; real-backend behaviour is covered by `backend/tests/test_external_actions.py` and the manual journey recorded in the specification's verification section.
