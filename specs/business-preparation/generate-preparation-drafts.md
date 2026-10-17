# Generate preparation drafts

| Field | Value |
| --- | --- |
| Stable capability ID | generate-preparation-drafts |
| Covered stories | F06-US04; [catalogue](../../docs/UserStoriesAndFeatures.md); criteria below |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Active business members. [3 - AI for every role](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending: human product/contract owner; no approval recorded |
| Review / run record | Pending: independent draft review and test scenarios |

## Product outcome, users and scope

A member requests an AI preparation draft based on permitted event facts, assigned booth/setup information and its own business needs. The editable draft contains tasks and labelled cost estimates; it does not place orders, accept a budget or replace manual records.

## Use cases and user interface

Show source event/setup facts, editable suggested tasks and estimates, deterministic totals, missing information and validation failures. Keep the manual checklist and budget available throughout.

## Inputs, outputs and functional contract

Inputs: participation ID, member request, permitted published event/setup facts and relevant private preparation context. Outputs: owned validated draft with task descriptions, quantities, unit-price estimates, currency, source/provenance and calculated totals, or an explicit inability/failure result.

## Constraints, security and non-functional requirements

RD01, RD07; SEC01-04, SEC06, SEC08, SEC10. Outbound data is minimised. Event/vendor descriptions are untrusted. Estimates are not quotations. No accepted record changes without explicit confirmation and fresh validation. See [accepted decisions](../../docs/project.md#accepted-review-decisions) and [security rules](../../docs/security.md). Accessibility and delivery obligations follow the [development workflow](../../workflow/README.md); exact measurable bounds remain pending where listed below.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rule trace | Planned verification |
| --- | --- | --- | --- |
| generate-preparation-drafts-AC01 | An authorised member receives a private editable draft based on the current permitted participation and published setup facts; costs are clearly labelled estimates. | F06-US04; RD01, RD07 | Pending: independent positive/adverse scenario |
| generate-preparation-drafts-AC02 | Displayed line and overall totals match deterministic quantity-by-unit-price arithmetic; invalid model arithmetic is corrected or rejected before display. | F06-US04; RD01, RD07 | Pending: independent positive/adverse scenario |
| generate-preparation-drafts-AC03 | A member may save/edit its draft without silently replacing an existing checklist or budget; accepted data remains unchanged until an explicit authorised action. | F06-US04; RD01, RD07 | Pending: independent positive/adverse scenario |
| generate-preparation-drafts-AC04 | Another business, inactive member or event organiser without business membership cannot request, see or adopt the draft. | F06-US04; RD01, RD07 | Pending: independent positive/adverse scenario |
| generate-preparation-drafts-AC05 | Prompt injection, fabricated setup facts, stale references or malformed output cannot appear as validated recommendations or trigger purchases. | F06-US04; RD01, RD07 | Pending: independent positive/adverse scenario |
| generate-preparation-drafts-AC06 | Timeout, quota, cancellation and provider failure show a bounded result and leave manual preparation and accepted data usable. | F06-US04; RD01, RD07 | Pending: independent positive/adverse scenario |

## External interfaces and dependencies

Requires BusinessContext, manual preparation and AI task monitoring. Provider, source allowlist, estimate policy, quotas, retention and accepted-budget replacement semantics remain human decisions. Shared logical contracts and ownership boundaries are in [architecture](../../docs/architecture.md); they are design proposals until reviewed. Producer and consumer versions, data shape details and compatibility must be agreed before Ready.

## Decisions and approval

| Decision | Owner and blocking status | Resolution |
| --- | --- | --- |
| generate-preparation-drafts-D01: Provider/privacy/retention, permitted outbound fields, supported currencies, estimate sources and budget adoption semantics; human product/contract owner; blocks Ready. | Human product/contract authority; blocks Ready or the affected scope | Pending |

## Verification and evidence

Independent test design, adequacy review, protected baseline, implementation snapshot, integration and security checks are pending under the [agent workflow](../../workflow/agents/README.md). No application behaviour, persistence, provider integration or deployment has been verified. AI role coverage and environment separation remain release gates where applicable.

| Criterion | Evidence | Status |
| --- | --- | --- |
| generate-preparation-drafts-AC01 | Pending | Not verified |
| generate-preparation-drafts-AC02 | Pending | Not verified |
| generate-preparation-drafts-AC03 | Pending | Not verified |
| generate-preparation-drafts-AC04 | Pending | Not verified |
| generate-preparation-drafts-AC05 | Pending | Not verified |
| generate-preparation-drafts-AC06 | Pending | Not verified |

## Revision history

| Revision / date | Change | Approval and evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft from F06-US04 and current RD/SEC rules | Product approval and verification pending |
