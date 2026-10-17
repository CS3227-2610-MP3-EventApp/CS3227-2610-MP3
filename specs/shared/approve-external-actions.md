# Approve external actions

| Field | Value |
| --- | --- |
| Stable capability ID | approve-external-actions |
| Covered stories | [F10-US03](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap | Organiser and business participant; [phase 5](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of revision 1, supported actions and provider rules |
| Review / run record | Pending |

Sources: [standard](../README.md), catalogue, [RD07 and project action levels](../../docs/project.md#ai-service-and-permitted-actions), [security](../../docs/security.md), and [architecture design draft](../../docs/architecture.md) updated 2026-10-17.

## Product outcome, users and scope

An authorised person previews a concrete proposed external action, approves its exact destination and payload for a limited time, and sees one attributable execution outcome. This applies to organiser venue quotation email and business quotation/procurement proposal demonstrations; action-specific specs define permitted content and provider integration. Real orders, payments, bookings and unattended negotiation are excluded. Draft creation alone is not approval. Shared-state announcement publication is also subject to human concrete-action controls in its own contract.

## Use cases and user interface

An authorised actor reviews recipient/seller source, exact message or item/quantity/amount/currency, relevant resource revisions and expiry. Edits require a new preview/approval. On execution, the user sees succeeded, failed or uncertain-needs-reconciliation, with safe provider reference if available. Retry cannot silently duplicate an uncertain write. Expired, stale and revoked permission states explain why approval is unusable. The preview and outcome are accessible and clear about simulation versus live sending.

## Inputs, outputs and functional contract

Proposal input is action type, actor, resource IDs/revisions, exact destination, payload, amount/currency where relevant, source evidence and expiry. Approval binds actor, proposal identity, exact payload/destination and observed revisions. Execution is a separate authorised request that rechecks current membership, revisions, destination policy and approval validity. Output includes stable proposal/approval/execution IDs, state, timestamps, outcome and safe provider reference. A changed proposal creates a new approval need; repeated or concurrent execution of one approval yields one external effect or a reconciliation state. An uncertain provider outcome is not automatically retried.

## Constraints, security and non-functional requirements

[SEC01, SEC06–SEC11 and SEC12](../../docs/security.md) apply. External destinations and redirects must satisfy server policy; provenance and uncertainty remain visible. The model may propose a draft but never approve or execute it. Approval expiry, provider allowlist, supported amount/currency rules, audit visibility and idempotency/reconciliation contract remain human decisions. Failed/denied execution preserves accepted domain state and avoids a prohibited external side effect; an uncertain outcome is explicitly investigated before any further attempt.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| approve-external-actions-AC01 | An authorised organiser/business actor can preview a supported action with exact destination, content/items, amount/currency where relevant, source revisions and expiry before approval. | F10-US03; SEC06/07 | Venue email and sandbox business proposal fixtures |
| approve-external-actions-AC02 | Approval binds that actor and exact payload/destination/revisions; edited recipient, text, item, quantity, amount or currency requires fresh approval. | F10-US03; SEC07 | Mutate each bound field and attempt execution |
| approve-external-actions-AC03 | Expired approval, revoked membership, stale resource, wrong actor, unsupported action or unsafe destination fails at the execution boundary with no external effect or domain change. | F10-US03; SEC01/07/09 | Direct bypass, redirect and stale tests |
| approve-external-actions-AC04 | Approved execution yields one recorded outcome; repeated/concurrent calls cannot duplicate a successful external write. | F10-US03; SEC07/11 | Same approval with concurrent/retry calls |
| approve-external-actions-AC05 | Provider failure or uncertain acknowledgement produces a distinct failure/reconciliation status; no blind retry occurs and prior accepted data remains intact. | F10-US03; SEC10/11 | Controlled timeout/ambiguous result |
| approve-external-actions-AC06 | Sensitive approval and execution attempts produce attributable minimal audit records; unrelated users cannot inspect private proposal, approval or execution details. | F10-US03; SEC01/02/11 | Audit and wrong-owner access |

## External interfaces and dependencies

Consumes [workspace access](access-authorised-workspaces.md), action-specific domain contracts, and optionally [AI drafts](monitor-and-recover-ai-tasks.md). The proposal/approval/execution states and result categories must be versioned with venue quotation and business proposal consumers. [Architecture](../../docs/architecture.md#feature-schemas) provides proposed logical references, not approved physical storage. Live provider execution requires its own reviewed destination and reconciliation contract.

## Decisions and approval

| Decision | Options / proposed direction | Owner | Blocks | Resolution |
| --- | --- | --- | --- | --- |
| E-01 | Supported live versus sandbox actions and provider allowlist | Product/security human owner | Ready for execution | Pending (D07) |
| E-02 | Approval expiry, destination policy and source verification | Product/security human owner | Ready | Pending |
| E-03 | Uncertain-outcome reconciliation, retention and audit visibility | Product/operations human owner | Ready for live sends | Pending |
| E-04 | Amount/currency precision, spending policy for future commerce | Product/finance human owner | Any real purchase; deferred | Pending |

## Verification and evidence

Independent test design/review, protected baseline, provider integration, uncertain-outcome exercise, deployed environment separation and human teammate review are pending. All criteria are unverified. Sandbox approval evidence must be labelled as simulated and cannot establish live sending or commerce.

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft | Approval and verification pending |
