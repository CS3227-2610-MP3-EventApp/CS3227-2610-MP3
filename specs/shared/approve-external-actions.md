# Approve external actions

| Field | Value |
| --- | --- |
| Stable capability ID | approve-external-actions |
| Covered stories | [F10-US03](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 2 / Ready; independent executable test baseline gate pending |
| Product roles / roadmap | Business participant sandbox contract; organiser compatibility only. [Phase 3](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Isaac approved Phase 3 defaults and then exact revision 2 on 2026-10-23, replying "yes please start implementing and finishing the phase" to the exact-revision approval request. Implementation follows the independent test-baseline gate. |
| Review / run record | [Draft analysis, independent reviews and scenario findings](../../logs/isaac/2026-10-23-f09-phase3-approval-contract.md); executable test plan/baseline and implementation run pending |

Sources: [standard](../README.md), catalogue, [RD01/RD07 and project action levels](../../docs/project.md#ai-service-and-permitted-actions), [security](../../docs/security.md), and [architecture](../../docs/architecture.md).

## Product outcome, users and scope

An active business member creates an immutable typed proposal revision from a saved supplier shortlist/source snapshot, approves its exact revision and receives a persisted sandbox receipt. Phase 3 delivers the shared approval service/API and proposal registry, not the Phase 4 proposal editor. Supported simulated actions are quotation request and purchase/cart proposal. They cause no network request, seller contact, order, booking or payment. The receipt is labelled `simulated`, never successful external execution.

The organiser quotation-email consumer is deferred. This Draft defines compatibility expectations for the shared envelope only; it does not enable organiser execution, choose an email provider or approve email destinations. Shared-state announcement publication remains outside this capability. AI may help create draft content but cannot approve, execute, cancel or modify a proposal.

## Use cases and user interface

Show action type, seller identity/source, exact items and quantities, known prices or explicit unknowns, source timestamp/revision, proposal revision, approval expiry and simulation status. A quotation-request email entered by a user is labelled unverified and is never sent in this phase. Edits create a new immutable revision and require new approval. The user can cancel before execution and later inspect the persisted receipt.

## Inputs, outputs and functional contract

### Phase 3 business contract (proposed interface; exact r2 approval pending)

The proposed v1 HTTP surface is:

| Route | Typed request and response |
| --- | --- |
| `POST /api/v1/business/action-proposals` | `{participationId, actionType, shortlistId, expectedShortlistRevision, items:[{snapshotId, offerId, quantity}], recipientEmail?, requestText?}`. Returns `201` with immutable revision, server-selected seller/source, digest, timestamps and state. Creator/business derive from authenticated session and authorized participation. |
| `GET /api/v1/business/action-proposals?limit=20&offset=0` and `GET /api/v1/business/action-proposals/{proposalId}` | List limit is 1..100, offset is a non-negative integer; returns `{items,total,limit,offset}` with creator-owned summaries. Detail returns full immutable revision, approval and receipt history. |
| `POST /api/v1/business/action-proposals/{proposalId}/revisions` | Same typed payload plus `expectedProposalRevision` and `expectedShortlistRevision`; returns `201` with next immutable revision. |
| `POST /api/v1/business/action-proposals/{proposalId}/approvals` | `{proposalRevision}`; server binds actor, latest revision, digest and expiry; returns `201` approval metadata and `expiresAt`. |
| `POST /api/v1/business/action-proposals/{proposalId}/cancel` | `{expectedProposalRevision}`; returns `200` cancelled state, invalidating all approvals for that revision, or `409` if execution was claimed. |
| `POST /api/v1/business/action-approvals/{approvalId}/execute` | `{idempotencyKey}`; returns `200` with unique persisted receipt. Replay after current authorization returns the same receipt. |

`actionType` is `quotation_request` or `purchase_cart`. Each proposal contains one seller only; mixed seller identities are rejected and require separate proposals. Supplier evidence has no global seller ID, so seller identity is the exact source-derived `supplierName` from one selected snapshot; all selected offers must carry the same exact name and source origin. Seller identity/source cannot be overridden. Each item has integer `quantity` 1..1,000,000; at least one and at most 100 items are required; duplicate offer references are rejected. `recipientEmail` and `requestText` are allowed only for `quotation_request`; response metadata sets `recipientVerification:"unverified"` when an email is present; email is at most 254 characters, one syntactically valid address, no CR/LF, user-entered and unverified. Request text is trimmed, at most 1,000 Unicode code points. Unknown fields are rejected. The execution `idempotencyKey` is a UUID unique per creator across revisions; reuse on a different revision returns `409 idempotency_conflict`. A different key submitted for a revision that already has a claim returns the same existing receipt.

Proposal detail/list response includes `{proposalId, proposalRevision, creatorId, businessId, participationId, actionType, mode:"simulation", recipientVerification:"unverified"|null, payload, shortlistId, shortlistRevision, payloadDigest, state, createdAt, updatedAt, approvals[], executionReceipt|null}`. Each approval is `{approvalId, proposalRevision, approvedBy, approvedAt, expiresAt, payloadDigest, state}` with state `valid|expired|cancelled|consumed`. Receipt is `{executionId, proposalRevision, approvalId, actorId, idempotencyKey, startedAt, completedAt, outcome, reasonCode?}` with outcome `simulated|failed|uncertain`; no provider reference exists. Receipt is retrieved in proposal detail. Proposal state is `open|cancelled|simulated|failed|uncertain`. A public API cannot request a failed/uncertain outcome; these terminal states can arise only from an internal failure and may be exercised only through a controlled internal test adapter. Amounts are decimal strings of integer minor units in `SGD`, from 0 through 999999999999999999. Checked multiplication overflow is unknown. Unknown amount is `null` with a server-owned reason (`source_price_unknown`, `quantity_mismatch`, `arithmetic_overflow`); caller/model reasons are rejected. Revision 2 has no user-estimate field.

Errors use a safe envelope: `401 unauthenticated`; non-disclosing `404 not_found` for inaccessible/private/missing resources; `409 revision_conflict`, `stale_source`, `expired`, `cancelled`, `execution_claimed` or `idempotency_conflict`; `422 validation_error`; `429 quota_exceeded` where limits apply; `503 service_unavailable` for storage/audit failure, with no committed claim or receipt. First execution, after current actor/creator authorization, checks latest proposal revision, exact shortlist ID/revision, snapshot revision 1, offer/source IDs, non-deleted source, source authorization and freshness. Supplier refresh creates a separate immutable snapshot; it does not supersede a selected source. A deleted source or changed shortlist CAS revision invalidates unclaimed approval. A newer proposal revision makes every unclaimed approval for the prior revision unusable. If an execution claim already exists, after current authorization replay returns the same immutable receipt regardless of TTL/source age; it does not recheck first-execution conditions or execute again.

A next revision references a stable proposal ID and expected current revision. No operation edits or deletes an existing revision.

Each proposal is a strict tagged union: `quotation_request` or `purchase_cart`. It identifies the business, creator, seller, saved shortlist/snapshot and offer references, line items and positive integer quantities. A quotation request may include user-entered email and request text; the email is unverified text only. A cart may include known offer prices. Items must reference offers in the selected snapshot. The server derives source identity, revision and retrieval time from the supplier module's authorised read interface; client-supplied source timestamps, source identities or digests cannot refresh or replace them. This service never writes supplier-owned tables.

Known prices/subtotals use non-negative integer minor units encoded as decimal strings in `SGD`. Unknown prices use `null` plus a fixed server-owned reason; user/model reasons and estimates are not accepted. A subtotal is derived only when proposal quantity equals the snapshot's original `request.quantity` and the saved offer supports exact arithmetic; otherwise subtotal is unknown with `quantity_mismatch` or `source_price_unknown`. The service does not extrapolate a pack price. No floating-point, negative, or unsupported-currency values are accepted. The bounded DTO above is proposed for exact r2 approval.

Proposal revisions are immutable and scope-bound; a new revision cannot change creator, business or participation. Supplier evidence must be authorized for the creator, selected at the expected shortlist CAS revision, and no more than 24 hours old at creation, approval and first execution; exactly 24 hours old is fresh. Deleted snapshots/offers or shortlist revision changes invalidate all unclaimed approvals. Supplier refresh creates a separate immutable snapshot and does not supersede an existing snapshot. No accepted participation state is required, but supplier source/shortlist ownership checks remain. The server computes a canonical digest over action type, business scope, participation, seller, proposal revision, exact payload, shortlist ID/revision, snapshot ID/revision, offer IDs and server-derived source IDs/revisions. Approval binds authenticated actor, proposal revision, digest and server timestamps. Approval is valid for 15 minutes; execution requires `now < expiresAt`, so equality is expired. Execution rechecks active membership, same approving actor, latest proposal revision, digest and source freshness.

Each proposal revision permits at most one execution claim across approvals. After creator/membership authorization, replay returns the same state/receipt even if approval expired or evidence is stale; it never performs a new action. First execution requires unexpired approval and fresh sources. Cancellation and claim serialize; cancellation before a claim permanently closes that revision and invalidates all approvals; no new approval or execution is allowed for a cancelled revision. The local simulation claim and receipt commit atomically: rollback leaves no claim/outcome, and a committed claim has a durable receipt. A claimed `failed` or `uncertain` outcome is terminal and cannot be rerun through the same or new approval. This phase performs no network action; no public stuck-claim or retry control exists.

A successful simulation stores one durable receipt with stable ID, actor, proposal/approval/revision, timestamps and `simulated` outcome. The receipt and minimal success audit entry commit atomically. The service does not resolve DNS, fetch, follow redirects, send email or contact sellers. Seller URLs are evidence only. Reject non-HTTPS schemes, URL credentials, localhost, private/internal numeric address forms, and localhost/private/internal suffixes using lexical checks only; this does not establish DNS/public reachability or seller trust. A user-entered email is unverified and is not a destination.

Proposal revisions, approvals and receipts remain private history, with no automatic cleanup and no public deletion API in this phase. Any future cleanup requires a separate approved policy. Audit records include actor, action/resource/revision, time, outcome and minimal reason code; they exclude full payloads and secrets.

## Constraints, security and non-functional requirements

[SEC01–SEC03, SEC06–SEC12](../../docs/security.md) and RD01/RD07 apply. The authenticated server identity is authoritative; client actor IDs, digests, totals, source timestamps and expiry are untrusted. Current active membership is checked on create, read, approve, cancel and execute. This Draft specifies creator-private records and no accepted-participation prerequisite, while preserving supplier source ownership/eligibility checks. Creator-private visibility is an approved Phase 3 default consistent with the approved creator-private supplier evidence contract; it is scoped to this capability and does not change RD01 generally. Unrelated users cannot inspect proposal, approval, source or receipt details.

Retrieved seller names, descriptions, URLs and request text are untrusted data and cannot change instructions or permissions. The service makes no DNS lookup or network request in Phase 3. Failed/denied/stale/cancelled actions preserve proposal/source records and create no simulation receipt unless an execution claim was committed. Simulation status is distinct from provider success. Phase 3 defaults approved by Isaac on 2026-10-23: business sandbox only, no editor/live/organiser runtime, 15-minute approval, 24-hour source freshness, same approving actor, one execution per proposal revision across approvals, cancellation before execution, terminal no-rerun outcomes, and retained history without automatic cleanup/public delete. Exact revision 2 and added validation/interface details remain pending.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| approve-external-actions-AC01 | An active business member can create and review API metadata for a typed quotation-request or purchase-cart proposal revision sourced from a saved shortlist/snapshot, including exact seller/source, items, positive quantities, known integer-SGD minor-unit prices or explicit unknowns, source time/revision, creator and expiry. Phase 3 has no UI; response metadata labels simulation mode and any user-entered email as unverified. | F10-US03; RD01; SEC01/02/06 | Valid synthetic source-backed proposal, unknown price and unverified-email presentation |
| approve-external-actions-AC02 | Approval binds authenticated actor, business, action type, proposal revision, canonical exact-payload digest and source revisions for 15 minutes; changing any bound field requires a new revision and approval. | F10-US03; SEC01/07 | Mutate payload/source and attempt execution with old approval |
| approve-external-actions-AC03 | First execution rejects inactive/revoked membership, wrong actor, cancelled/expired approval, `now == expiresAt`, stale/deleted source, changed/latest proposal revision mismatch, shortlist CAS mismatch, digest mismatch or unsupported action without a new receipt or source/proposal mutation. After current creator/membership authorization, replay of a prior claim returns its unchanged receipt despite later expiry or stale evidence. | F10-US03; SEC01/07/09 | First-execution boundary and equality checks; replay after expiry/staleness; revocation check |
| approve-external-actions-AC04 | One proposal revision has at most one execution claim across approvals; replays/concurrent attempts return its existing state/receipt. Cancellation succeeds only before execution claim and races atomically with execution. | F10-US03; SEC07/11 | Second approval for same revision; concurrent execute/cancel |
| approve-external-actions-AC05 | Execution stores a durable `simulated` receipt and causes no DNS, network, email, order, booking or payment effect. Claimed failed/uncertain outcomes are terminal and cannot be rerun, including under a new approval. | F10-US03; SEC06/10/11 | Inspect outbound calls and persisted receipt; replay terminal outcomes |
| approve-external-actions-AC06 | Proposal, approval, cancellation and execution attempts create attributable minimal audit records; private detail is inaccessible to unrelated users; history has no automatic cleanup or public deletion API in this phase. | F10-US03; SEC01/02/11 | Wrong-owner/inactive read, audit minimisation and persistence check |

## External interfaces and dependencies

Consumes [workspace access](access-authorised-workspaces.md), [supplier research/shortlist](../business-preparation/compare-suppliers.md), and optionally [AI drafts](monitor-and-recover-ai-tasks.md). Supplier data is read through an authorized supplier-owned interface; this capability does not write supplier tables. The Phase 4 [procurement proposal consumer](../business-preparation/review-procurement-proposals.md) may add its editor after its own approval. The [organiser quotation-email consumer](../venue-research/request-venue-quotations.md) is deferred and requires separate provider, verified-recipient, delivery and reconciliation approval. [Architecture](../../docs/architecture.md#feature-schemas) lists logical references only; this Draft does not approve physical schema, migration or table ownership.

## Decisions and approval

| Decision | Options / proposed direction | Owner | Blocks | Resolution |
| --- | --- | --- | --- | --- |
| E-01 | Supported live versus sandbox actions and provider allowlist. | Isaac / product-security owner | Ready for live execution | Phase 3 business simulations only, with no network or commerce, approved 2026-10-23. Organiser execution and provider allowlist are deferred. |
| E-02 | Approval expiry, destination policy and source verification. | Isaac / product-security owner | Ready for Phase 3; future live destination execution | 15-minute TTL, same approver, 24-hour source freshness and server source rechecks approved as Phase 3 defaults 2026-10-23. No network destination is used. Future live destination policy remains deferred. |
| E-03 | Uncertain-outcome handling, retention and audit visibility. | Isaac / product-operations owner | Ready for Phase 3; future live reconciliation | Retained private history, no automatic cleanup/public delete, minimal audit and terminal no-rerun outcomes approved as defaults 2026-10-23. No public reconciliation path is in Phase 3. |
| E-04 | Amount/currency precision and spending policy. | Isaac / product-finance owner | Ready for Phase 3; any real purchase | Phase 3 accepts source-backed SGD integer minor units or unknown; simulation cannot spend. Real spending policy is deferred. |

## Verification and evidence

Exact revision 2 is approved by Isaac on 2026-10-23. Independent executable test design/review and protected baseline precede implementation; persistence/restart checks, implementation reviews and human teammate review remain pending. All criteria are unverified. Provider integration is outside Phase 3. Earlier pending-approval annotations in the proposed interface describe its drafting history; the exact contract is now approved.

| Criterion | Evidence | Status |
| --- | --- | --- |
| approve-external-actions-AC01 | Pending | Not verified |
| approve-external-actions-AC02 | Pending | Not verified |
| approve-external-actions-AC03 | Pending | Not verified |
| approve-external-actions-AC04 | Pending | Not verified |
| approve-external-actions-AC05 | Pending | Not verified |
| approve-external-actions-AC06 | Pending | Not verified |

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft | Approval and verification pending |
| 2 / 2026-10-23 | Narrowed to the business sandbox approval service/API and immutable proposal registry; specified typed source-backed payload, API operations, lifecycle, authorization, freshness, expiry, deduplication, cancellation, retention, audit and deferred consumers. | Phase 3 defaults approved by Isaac; exact r2 approval pending. Physical ownership remains for implementation planning; all verification pending. |
