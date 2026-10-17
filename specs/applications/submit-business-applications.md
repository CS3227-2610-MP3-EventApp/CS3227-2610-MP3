# Submit business applications

| Field | Value |
| --- | --- |
| Stable capability ID | submit-business-applications |
| Covered stories | F06-US01; [catalogue](../../docs/UserStoriesAndFeatures.md); criteria below |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Active business members; event organisers receive submitted applications. [2 - Manual journeys](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending: human product/contract owner; no approval recorded |
| Review / run record | Pending: independent draft review and test scenarios |

## Product outcome, users and scope

A business member creates an event-specific exhibitor or vendor profile and application, edits its draft, and explicitly submits it for organiser review. The business workspace remains usable while a decision is pending. Speaker submissions, withdrawal, resubmission and reconsideration are excluded.

## Use cases and user interface

Show draft fields and validation errors, a review-before-submit state, an explicit submit control, and a read-only submitted view with status. Do not imply that submission reserves a booth.

## Inputs, outputs and functional contract

Inputs: authorised business and event participation IDs, participant type, description, requested space, contact fields, draft revision and submit intent. Outputs: private draft with revision; on submit, immutable submitted content, submitted-content revision, timestamp and submitted status. Organisers can read only submitted applications for their assigned event through the submission contract. Contact fields remain private to permitted reviewers.

## Constraints, security and non-functional requirements

RD01, RD02; SEC01, SEC02, SEC11, SEC13. Business membership applies across its events; event participation identifies the specific application. Submission freezes content and its revision. Draft content is not visible to organisers. All rejected writes preserve the prior application and create no submission. See [accepted decisions](../../docs/project.md#accepted-review-decisions) and [security rules](../../docs/security.md). Accessibility and delivery obligations follow the [development workflow](../../workflow/README.md); exact measurable bounds remain pending where listed below.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rule trace | Planned verification |
| --- | --- | --- | --- |
| submit-business-applications-AC01 | An active member creates and edits an application draft for its own event participation; reopening returns the saved fields and revision. | F06-US01; RD01, RD02 | Pending: independent positive/adverse scenario |
| submit-business-applications-AC02 | Explicit submission of a valid draft creates one frozen submitted snapshot and exposes it to an organiser assigned to that event; concurrent submit requests cannot create another snapshot or change its content/revision. | F06-US01; RD01, RD02; SEC13 | Pending: independent positive/adverse scenario |
| submit-business-applications-AC03 | An inactive or unrelated business member, other-event organiser or unauthenticated user cannot read or write the draft; denied requests change no application data. | F06-US01; RD01, RD02 | Pending: independent positive/adverse scenario |
| submit-business-applications-AC04 | Edits, withdrawal and repeated submission after submission are rejected without changing frozen content or its submitted revision. | F06-US01; RD01, RD02 | Pending: independent positive/adverse scenario |
| submit-business-applications-AC05 | Missing or invalid required fields and stale draft revisions are rejected with field/conflict feedback; the prior draft and submission state remain intact. | F06-US01; RD01, RD02 | Pending: independent positive/adverse scenario |

## External interfaces and dependencies

Requires authorised business context and event participation. Produces frozen submission ID/content/revision/status for application review and AI analysis. Exact profile/contact field bounds, member roles and retention need human decisions. Shared logical contracts and ownership boundaries are in [architecture](../../docs/architecture.md); they are design proposals until reviewed. Producer and consumer versions, data shape details and compatibility must be agreed before Ready.

## Decisions and approval

| Decision | Owner and blocking status | Resolution |
| --- | --- | --- |
| submit-business-applications-D01: Required application fields, field bounds, initial business member roles and contact retention; human product/contract owner; blocks Ready. | Human product/contract authority; blocks Ready or the affected scope | Pending |

## Verification and evidence

Independent test design, adequacy review, protected baseline, implementation snapshot, integration and security checks are pending under the [agent workflow](../../workflow/agents/README.md). No application behaviour, persistence, provider integration or deployment has been verified. AI role coverage and environment separation remain release gates where applicable.

| Criterion | Evidence | Status |
| --- | --- | --- |
| submit-business-applications-AC01 | Pending | Not verified |
| submit-business-applications-AC02 | Pending | Not verified |
| submit-business-applications-AC03 | Pending | Not verified |
| submit-business-applications-AC04 | Pending | Not verified |
| submit-business-applications-AC05 | Pending | Not verified |

## Revision history

| Revision / date | Change | Approval and evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft from F06-US01 and current RD/SEC rules | Product approval and verification pending |
