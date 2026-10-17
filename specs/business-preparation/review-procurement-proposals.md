# Review procurement proposals

| Field | Value |
| --- | --- |
| Stable capability ID | review-procurement-proposals |
| Covered stories | F09-US03; [catalogue](../../docs/UserStoriesAndFeatures.md); criteria below |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Active business members. [5 - Further capabilities](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending: human product/contract owner; no approval recorded |
| Review / run record | Pending: independent draft review and test scenarios |

## Product outcome, users and scope

A member saves a quotation-request draft or a purchase/cart proposal draft, reviews exact recipient/seller, items, quantities and estimated amount, and may approve a simulated action. The two draft types remain distinguishable. Real orders and payments are excluded.

## Use cases and user interface

Show full proposal details, estimate versus quote labels, source/destination evidence, expiry and a clear simulated-approval result. Changes after approval require renewed review.

## Inputs, outputs and functional contract

Inputs: owned draft type (quotation request or purchase/cart proposal), recipient or seller, item IDs/descriptions, quantities, amount/currency, resource revisions and explicit approval. Outputs: a versioned private quotation-request draft or purchase/cart draft, bound approval and simulated execution outcome/audit; no real commerce.

## Constraints, security and non-functional requirements

RD01, RD07; SEC01, SEC06-07, SEC09-11. Approval binds exact payload and actor; stale, expired or changed details invalidate it. Uncertain outcomes require reconciliation, never blind duplicate execution. See [accepted decisions](../../docs/project.md#accepted-review-decisions) and [security rules](../../docs/security.md). Accessibility and delivery obligations follow the [development workflow](../../workflow/README.md); exact measurable bounds remain pending where listed below.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rule trace | Planned verification |
| --- | --- | --- | --- |
| review-procurement-proposals-AC01 | An authorised member saves and reviews either a quotation-request draft or a purchase/cart proposal draft, with its type and exact recipient/seller, items, quantities, amount and currency visible before simulated approval. | F09-US03; RD01, RD07; SEC06 | Pending: independent positive/adverse scenario |
| review-procurement-proposals-AC02 | Approval of one exact revision records the actor and bound payload; changed, expired or stale proposals require new approval. | F09-US03; RD01, RD07 | Pending: independent positive/adverse scenario |
| review-procurement-proposals-AC03 | Unrelated or inactive business members cannot view or approve proposals; denied requests create no approval or execution. | F09-US03; RD01, RD07 | Pending: independent positive/adverse scenario |
| review-procurement-proposals-AC04 | Repeated or concurrent simulated execution cannot create two successful outcomes for one approved action. | F09-US03; RD01, RD07 | Pending: independent positive/adverse scenario |
| review-procurement-proposals-AC05 | Unsafe destinations or unsupported seller evidence are rejected, and uncertain outcomes are marked for reconciliation rather than reported as success. | F09-US03; RD01, RD07 | Pending: independent positive/adverse scenario |
| review-procurement-proposals-AC06 | No path in this capability places a real order or transfers money. | F09-US03; RD01, RD07 | Pending: independent positive/adverse scenario |

## External interfaces and dependencies

Requires approved external-action capability and supplier evidence where used. Scope is sandbox demonstration; provider, cancellation, fulfilment and spending policies remain unresolved for real commerce. Shared logical contracts and ownership boundaries are in [architecture](../../docs/architecture.md); they are design proposals until reviewed. Producer and consumer versions, data shape details and compatibility must be agreed before Ready.

## Decisions and approval

| Decision | Owner and blocking status | Resolution |
| --- | --- | --- |
| review-procurement-proposals-D01: Sandbox action semantics, approval expiry, destination policy and future real-commerce scope; human product/security owner; blocks Ready. | Human product/contract authority; blocks Ready or the affected scope | Pending |

## Verification and evidence

Independent test design, adequacy review, protected baseline, implementation snapshot, integration and security checks are pending under the [agent workflow](../../workflow/agents/README.md). No application behaviour, persistence, provider integration or deployment has been verified. AI role coverage and environment separation remain release gates where applicable.

| Criterion | Evidence | Status |
| --- | --- | --- |
| review-procurement-proposals-AC01 | Pending | Not verified |
| review-procurement-proposals-AC02 | Pending | Not verified |
| review-procurement-proposals-AC03 | Pending | Not verified |
| review-procurement-proposals-AC04 | Pending | Not verified |
| review-procurement-proposals-AC05 | Pending | Not verified |
| review-procurement-proposals-AC06 | Pending | Not verified |

## Revision history

| Revision / date | Change | Approval and evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft from F09-US03 and current RD/SEC rules | Product approval and verification pending |
