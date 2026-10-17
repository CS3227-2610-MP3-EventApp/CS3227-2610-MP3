# Compare suppliers for event materials

| Field | Value |
| --- | --- |
| Stable capability ID | compare-suppliers |
| Covered stories | F09-US02; [catalogue](../../docs/UserStoriesAndFeatures.md); criteria below |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Active business members. [5 - Further capabilities](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending: human product/contract owner; no approval recorded |
| Review / run record | Pending: independent draft review and test scenarios |

## Product outcome, users and scope

A business researches printers, snacks and freebie suppliers and compares sourced estimates and delivery constraints. Results form a shortlist, not a safety guarantee, quotation or purchase.

## Use cases and user interface

Show source links, retrieval times, quantities, estimated prices, delivery constraints, missing values and uncertainty. Let members inspect alternatives and retain a private shortlist.

## Inputs, outputs and functional contract

Inputs: participation, item category, quantity, budget and delivery requirements. Outputs: bounded private comparison with source URL/provider/time, estimated cost and gaps; no order or external message.

## Constraints, security and non-functional requirements

RD01, RD07; SEC01-04, SEC08-10. External pages are untrusted; unsafe destinations are blocked. Estimates are not quotations and seller trust is not guaranteed. See [accepted decisions](../../docs/project.md#accepted-review-decisions) and [security rules](../../docs/security.md). Accessibility and delivery obligations follow the [development workflow](../../workflow/README.md); exact measurable bounds remain pending where listed below.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rule trace | Planned verification |
| --- | --- | --- | --- |
| compare-suppliers-AC01 | An authorised member gets a saved comparison of permitted supplier results with sources, retrieval time, price basis and delivery constraints. | F09-US02; RD01, RD07 | Pending: independent positive/adverse scenario |
| compare-suppliers-AC02 | Unavailable prices or delivery claims remain unknown; estimates are not labelled as confirmed quotes. | F09-US02; RD01, RD07 | Pending: independent positive/adverse scenario |
| compare-suppliers-AC03 | Unsafe links, redirects to private/internal destinations and injected page instructions cannot gain tool authority or be presented as trusted sellers. | F09-US02; RD01, RD07 | Pending: independent positive/adverse scenario |
| compare-suppliers-AC04 | Other businesses cannot access the shortlist; denied requests cause no private-data disclosure or modification. | F09-US02; RD01, RD07 | Pending: independent positive/adverse scenario |
| compare-suppliers-AC05 | Provider failure, timeout, quota or invalid results yield an explicit failure/partial status and preserve prior results and manual work. | F09-US02; RD01, RD07 | Pending: independent positive/adverse scenario |

## External interfaces and dependencies

Requires business access and AI task monitoring; later proposals may consume sourced items. Search provider, source policy, costs, retention and quantity/currency semantics need agreement. Shared logical contracts and ownership boundaries are in [architecture](../../docs/architecture.md); they are design proposals until reviewed. Producer and consumer versions, data shape details and compatibility must be agreed before Ready.

## Decisions and approval

| Decision | Owner and blocking status | Resolution |
| --- | --- | --- |
| compare-suppliers-D01: Search/source provider and allowlist, destination policy, cost limits, retention and freshness threshold; human product/security owner; blocks Ready. | Human product/contract authority; blocks Ready or the affected scope | Pending |

## Verification and evidence

Independent test design, adequacy review, protected baseline, implementation snapshot, integration and security checks are pending under the [agent workflow](../../workflow/agents/README.md). No application behaviour, persistence, provider integration or deployment has been verified. AI role coverage and environment separation remain release gates where applicable.

| Criterion | Evidence | Status |
| --- | --- | --- |
| compare-suppliers-AC01 | Pending | Not verified |
| compare-suppliers-AC02 | Pending | Not verified |
| compare-suppliers-AC03 | Pending | Not verified |
| compare-suppliers-AC04 | Pending | Not verified |
| compare-suppliers-AC05 | Pending | Not verified |

## Revision history

| Revision / date | Change | Approval and evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft from F09-US02 and current RD/SEC rules | Product approval and verification pending |
