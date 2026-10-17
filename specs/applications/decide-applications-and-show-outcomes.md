# Decide applications and show outcomes

| Field | Value |
| --- | --- |
| Stable capability ID | decide-applications-and-show-outcomes |
| Covered stories | F04-US01, F06-US02; [catalogue](../../docs/UserStoriesAndFeatures.md); criteria below |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Event organisers deciding submitted applications; active business members viewing their own outcome and setup. [2 - Manual journeys](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending: human product/contract owner; no approval recorded |
| Review / run record | Pending: independent draft review and test scenarios |

## Product outcome, users and scope

An authorised organiser reviews a frozen submission, accepts or rejects it once with a reason, and may provide a booth assignment and setup instructions. A business member sees only its own decision and published setup details. A decision does not publish a programme item. Speaker workflows are excluded.

## Use cases and user interface

Show the frozen submitted revision and current decision state, a clear accept/reject confirmation, conflict feedback when another decision wins, and applicant-facing status, shared reason and available setup details. Do not expose other applicants or organiser-only review evidence.

## Inputs, outputs and functional contract

Inputs: submission ID, expected submitted revision, decision outcome and reason; for accepted participation, booth assignment and setup instructions with their own revision. Outputs: one durable decision, current application status, attributable audit outcome, and applicant-safe reason/setup view. A stale or decided request returns conflict plus current state without a second outcome.

## Constraints, security and non-functional requirements

RD01, RD02, RD06; SEC01, SEC02, SEC11, SEC13. Decision and state transition are atomic. Submitted content is immutable. Applicant reasons cannot reveal competitors. Business membership, not organiser membership, grants private setup access. See [accepted decisions](../../docs/project.md#accepted-review-decisions) and [security rules](../../docs/security.md). Accessibility and delivery obligations follow the [development workflow](../../workflow/README.md); exact measurable bounds remain pending where listed below.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rule trace | Planned verification |
| --- | --- | --- | --- |
| decide-applications-and-show-outcomes-AC01 | An authorised organiser reads only submitted applications for its event and decides an undecided submission at the expected submitted revision, recording one reason and audit outcome. | F04-US01, F06-US02; RD01, RD02, RD06 | Pending: independent positive/adverse scenario |
| decide-applications-and-show-outcomes-AC02 | An active member of the applicant business sees its own status, any reason approved for sharing, and booth/setup details once assigned; unrelated businesses cannot see them. | F04-US01, F06-US02; RD01, RD02, RD06; SEC02, SEC13 | Pending: independent positive/adverse scenario |
| decide-applications-and-show-outcomes-AC03 | Competing, repeated or stale decisions return conflict and current state after the first succeeds; exactly one outcome and audit decision remain, with submitted content/revision unchanged. | F04-US01, F06-US02; RD02; SEC11, SEC13 | Pending: independent positive/adverse scenario |
| decide-applications-and-show-outcomes-AC04 | A draft application, wrong-event organiser or unauthorised actor cannot be decided; the application and participation state remain unchanged. | F04-US01, F06-US02; RD01, RD02, RD06 | Pending: independent positive/adverse scenario |
| decide-applications-and-show-outcomes-AC05 | Applicant-facing reason and setup responses never disclose another submission, duplicate evidence or organiser-private notes. | F04-US01, F06-US02; RD01, RD02, RD06 | Pending: independent positive/adverse scenario |
| decide-applications-and-show-outcomes-AC06 | Invalid booth/setup updates or a storage failure do not leave a partial assignment or contradictory decision state. | F04-US01, F06-US02; RD01, RD02, RD06 | Pending: independent positive/adverse scenario |

## External interfaces and dependencies

Requires frozen submission contract and event organiser authorisation. Decision-to-participation projection and assignment visibility are cross-domain contracts requiring human agreement. Setup may be absent until assigned; absence must be shown, not fabricated. Shared logical contracts and ownership boundaries are in [architecture](../../docs/architecture.md); they are design proposals until reviewed. Producer and consumer versions, data shape details and compatibility must be agreed before Ready.

## Decisions and approval

| Decision | Owner and blocking status | Resolution |
| --- | --- | --- |
| decide-applications-and-show-outcomes-D01: Decision-to-participation projection, booth assignment authority and fields, reason-sharing policy, and setup publication point; human product/contract owner; blocks Ready. | Human product/contract authority; blocks Ready or the affected scope | Pending |

## Verification and evidence

Independent test design, adequacy review, protected baseline, implementation snapshot, integration and security checks are pending under the [agent workflow](../../workflow/agents/README.md). No application behaviour, persistence, provider integration or deployment has been verified. AI role coverage and environment separation remain release gates where applicable.

| Criterion | Evidence | Status |
| --- | --- | --- |
| decide-applications-and-show-outcomes-AC01 | Pending | Not verified |
| decide-applications-and-show-outcomes-AC02 | Pending | Not verified |
| decide-applications-and-show-outcomes-AC03 | Pending | Not verified |
| decide-applications-and-show-outcomes-AC04 | Pending | Not verified |
| decide-applications-and-show-outcomes-AC05 | Pending | Not verified |
| decide-applications-and-show-outcomes-AC06 | Pending | Not verified |

## Revision history

| Revision / date | Change | Approval and evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft from F04-US01, F06-US02 and current RD/SEC rules | Product approval and verification pending |
