# Request venue quotations

| Field | Value |
| --- | --- |
| Stable capability ID | request-venue-quotations |
| Covered stories | F08-US02; [catalogue](../../docs/UserStoriesAndFeatures.md); criteria below |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Authorised event organisers. [5 - Further capabilities](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending: human product/contract owner; no approval recorded |
| Review / run record | Pending: independent draft review and test scenarios |

## Product outcome, users and scope

An organiser generates or manually prepares a venue quotation email draft, verifies recipient evidence, previews exact address and content, and explicitly approves one-time sending. This does not negotiate, book or process replies unattended.

## Use cases and user interface

Show recipient source, exact email preview and revisions, approval expiry, send state and uncertain outcome. Edited content or destination requires a fresh approval.

## Inputs, outputs and functional contract

Inputs: event/venue reference, sourced recipient, quotation requirements, optional edited email draft, exact payload revision and organiser approval. Outputs: an editable generated email draft or explicit generation failure with manual drafting still available; then a saved draft, bound approval, one send attempt or explicit failed/unknown outcome with audit and provider reference where available.

## Constraints, security and non-functional requirements

RD07; SEC01, SEC03, SEC06-11. Server checks destination and approval freshness at execution. Retry cannot assume exactly-once delivery; unknown outcomes require reconciliation. See [accepted decisions](../../docs/project.md#accepted-review-decisions) and [security rules](../../docs/security.md). Accessibility and delivery obligations follow the [development workflow](../../workflow/README.md); exact measurable bounds remain pending where listed below.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rule trace | Planned verification |
| --- | --- | --- | --- |
| request-venue-quotations-AC01 | An authorised organiser can generate an editable quotation email draft from permitted venue facts and requirements or write one manually, then save and preview the exact recipient and content with recipient-source evidence. | F08-US02; RD07; SEC04, SEC06 | Pending: independent positive/adverse scenario |
| request-venue-quotations-AC02 | Approval binds the organiser, recipient, content, resource revisions and expiry; any change or expiry blocks send until reapproved. | F08-US02; RD07 | Pending: independent positive/adverse scenario |
| request-venue-quotations-AC03 | Wrong-event or unauthorised actors cannot approve or send; denied requests create no send. | F08-US02; RD07 | Pending: independent positive/adverse scenario |
| request-venue-quotations-AC04 | A permitted approved action has one recorded execution outcome; repeated/concurrent requests and uncertain provider delivery do not trigger a blind second send. Unknown delivery remains pending reconciliation. | F08-US02; RD07; SEC07 | Pending: independent positive/adverse scenario |
| request-venue-quotations-AC05 | Provider failure or uncertain delivery displays failed/unknown status with reconciliation path and does not falsely claim success. | F08-US02; RD07 | Pending: independent positive/adverse scenario |
| request-venue-quotations-AC06 | Unsafe recipient/source or injection in venue content cannot redirect the email or bypass approval. | F08-US02; RD07 | Pending: independent positive/adverse scenario |
| request-venue-quotations-AC07 | Generation failure, malformed content or injected venue instructions cannot produce an approved or sent email; manual drafting and previously saved drafts remain available. | F08-US02; RD07; SEC03, SEC04, SEC10 | Pending: provider/adverse scenario |

## External interfaces and dependencies

Requires venue comparison/source evidence and approved external-action capability. Email provider/sandbox, sender identity, recipient policy, approval expiry and reconciliation process need human approval. Shared logical contracts and ownership boundaries are in [architecture](../../docs/architecture.md); they are design proposals until reviewed. Producer and consumer versions, data shape details and compatibility must be agreed before Ready.

## Decisions and approval

| Decision | Owner and blocking status | Resolution |
| --- | --- | --- |
| request-venue-quotations-D01: Email provider, sender/recipient verification, exact approval expiry, rate limits and unknown-outcome reconciliation; human product/security owner; blocks Ready. | Human product/contract authority; blocks Ready or the affected scope | Pending |

## Verification and evidence

Independent test design, adequacy review, protected baseline, implementation snapshot, integration and security checks are pending under the [agent workflow](../../workflow/agents/README.md). No application behaviour, persistence, provider integration or deployment has been verified. AI role coverage and environment separation remain release gates where applicable.

| Criterion | Evidence | Status |
| --- | --- | --- |
| request-venue-quotations-AC01 | Pending | Not verified |
| request-venue-quotations-AC02 | Pending | Not verified |
| request-venue-quotations-AC03 | Pending | Not verified |
| request-venue-quotations-AC04 | Pending | Not verified |
| request-venue-quotations-AC05 | Pending | Not verified |
| request-venue-quotations-AC06 | Pending | Not verified |
| request-venue-quotations-AC07 | Pending | Not verified |

## Revision history

| Revision / date | Change | Approval and evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft from F08-US02 and current RD/SEC rules | Product approval and verification pending |
