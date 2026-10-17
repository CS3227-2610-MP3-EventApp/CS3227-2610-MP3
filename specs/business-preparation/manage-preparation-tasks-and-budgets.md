# Manage preparation tasks and budgets

| Field | Value |
| --- | --- |
| Stable capability ID | manage-preparation-tasks-and-budgets |
| Covered stories | F06-US03; [catalogue](../../docs/UserStoriesAndFeatures.md); criteria below |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Active members of a participating business. [2 - Manual journeys](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending: human product/contract owner; no approval recorded |
| Review / run record | Pending: independent draft review and test scenarios |

## Product outcome, users and scope

A business maintains event-specific checklist tasks and a manual budget with quantities, unit prices, currency and calculated totals. Estimates and confirmed quotations are distinguishable. Orders and payments are excluded.

## Use cases and user interface

Show editable tasks, quantities, prices and labels for estimate versus quotation; display calculated line and overall totals, currency, validation and save errors. Missing prices remain visibly unknown rather than zero.

## Inputs, outputs and functional contract

Inputs: participation ID; task title/status/due date; budget line description, quantity, nonnegative unit price in minor units, currency, and estimate/quotation basis. Outputs: private persisted checklist and budget revisions, deterministic line totals and summed total, with unknown/incomplete lines identified. No AI provider is required.

## Constraints, security and non-functional requirements

RD01, RD07; SEC01, SEC02, SEC10. Only active members of the owning business may access its preparation. Organisers do not gain budget access from event membership. Invalid or failed writes preserve previous totals and tasks. See [accepted decisions](../../docs/project.md#accepted-review-decisions) and [security rules](../../docs/security.md). Accessibility and delivery obligations follow the [development workflow](../../workflow/README.md); exact measurable bounds remain pending where listed below.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rule trace | Planned verification |
| --- | --- | --- | --- |
| manage-preparation-tasks-and-budgets-AC01 | An authorised business member creates, edits and reopens checklist tasks and budget lines for its event participation. | F06-US03; RD01, RD07 | Pending: independent positive/adverse scenario |
| manage-preparation-tasks-and-budgets-AC02 | For valid quantities and unit prices, displayed line and overall totals equal deterministic minor-unit arithmetic in the stated currency. | F06-US03; RD01, RD07 | Pending: independent positive/adverse scenario |
| manage-preparation-tasks-and-budgets-AC03 | An estimated price is labelled as an estimate; a quotation is identified as such only when its basis is recorded; unknown prices are not silently treated as confirmed zero. | F06-US03; RD01, RD07 | Pending: independent positive/adverse scenario |
| manage-preparation-tasks-and-budgets-AC04 | Unrelated or inactive business members and event organisers without business membership cannot list, read or change private preparation; denied requests preserve state. | F06-US03; RD01, RD07 | Pending: independent positive/adverse scenario |
| manage-preparation-tasks-and-budgets-AC05 | Negative, noninteger or out-of-range quantities/prices, mixed unsupported currencies and stale revisions are rejected without changing saved lines or totals. | F06-US03; RD01, RD07 | Pending: independent positive/adverse scenario |
| manage-preparation-tasks-and-budgets-AC06 | Manual checklist and budget operations remain usable when AI is unavailable. | F06-US03; RD01, RD07 | Pending: independent positive/adverse scenario |

## External interfaces and dependencies

Requires BusinessContext and event participation. Produces manual preparation data for AI draft assistance. Supported currencies, quantity/price bounds and treatment of tax/shipping need human agreement before Ready. Shared logical contracts and ownership boundaries are in [architecture](../../docs/architecture.md); they are design proposals until reviewed. Producer and consumer versions, data shape details and compatibility must be agreed before Ready.

## Decisions and approval

| Decision | Owner and blocking status | Resolution |
| --- | --- | --- |
| manage-preparation-tasks-and-budgets-D01: Supported currency, quantity and price limits, tax/shipping semantics, quotation evidence, and budget acceptance/versioning; human product/contract owner; blocks affected Ready scope. | Human product/contract authority; blocks Ready or the affected scope | Pending |

## Verification and evidence

Independent test design, adequacy review, protected baseline, implementation snapshot, integration and security checks are pending under the [agent workflow](../../workflow/agents/README.md). No application behaviour, persistence, provider integration or deployment has been verified. AI role coverage and environment separation remain release gates where applicable.

| Criterion | Evidence | Status |
| --- | --- | --- |
| manage-preparation-tasks-and-budgets-AC01 | Pending | Not verified |
| manage-preparation-tasks-and-budgets-AC02 | Pending | Not verified |
| manage-preparation-tasks-and-budgets-AC03 | Pending | Not verified |
| manage-preparation-tasks-and-budgets-AC04 | Pending | Not verified |
| manage-preparation-tasks-and-budgets-AC05 | Pending | Not verified |
| manage-preparation-tasks-and-budgets-AC06 | Pending | Not verified |

## Revision history

| Revision / date | Change | Approval and evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft from F06-US03 and current RD/SEC rules | Product approval and verification pending |
