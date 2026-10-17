# Draft promotional concepts

| Field | Value |
| --- | --- |
| Stable capability ID | draft-promotional-concepts |
| Covered stories | F09-US01; [catalogue](../../docs/UserStoriesAndFeatures.md); criteria below |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Active business members. [5 - Further capabilities](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending: human product/contract owner; no approval recorded |
| Review / run record | Pending: independent draft review and test scenarios |

## Product outcome, users and scope

A business requests and edits AI poster copy, freebie concepts and a layout brief for its event participation. Generated text remains a private draft. Image generation and print-ready export are outside this contract.

## Use cases and user interface

Show editable copy and layout brief, source context, uncertainty or unsupported claims, and failure feedback. Do not label a draft as publish-ready or approved marketing.

## Inputs, outputs and functional contract

Inputs: member request, permitted business/event facts and constraints. Outputs: owned editable copy and concept draft with source references where factual claims depend on event information; no publication or order.

## Constraints, security and non-functional requirements

RD01, RD07; SEC01-04, SEC06, SEC08, SEC10. Untrusted source text cannot command the system. Factual event claims must match current authorised facts; failures preserve existing drafts. See [accepted decisions](../../docs/project.md#accepted-review-decisions) and [security rules](../../docs/security.md). Accessibility and delivery obligations follow the [development workflow](../../workflow/README.md); exact measurable bounds remain pending where listed below.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rule trace | Planned verification |
| --- | --- | --- | --- |
| draft-promotional-concepts-AC01 | An authorised member creates and edits a private promotional concept for its own participation. | F09-US01; RD01, RD07 | Pending: independent positive/adverse scenario |
| draft-promotional-concepts-AC02 | Generated factual event claims match current permitted records before display as factual copy; unsupported claims are rejected. Creative concepts are visibly suggestions, not event facts. | F09-US01; RD07; SEC04 | Pending: independent positive/adverse scenario |
| draft-promotional-concepts-AC03 | Unrelated or inactive members cannot read or change the concept; denied requests preserve it. | F09-US01; RD01, RD07 | Pending: independent positive/adverse scenario |
| draft-promotional-concepts-AC04 | Injection, fabricated facts and malformed output are not displayed as validated copy. | F09-US01; RD01, RD07 | Pending: independent positive/adverse scenario |
| draft-promotional-concepts-AC05 | Failure, cancellation or quota exhaustion leaves earlier drafts and manual editing available. | F09-US01; RD01, RD07 | Pending: independent positive/adverse scenario |

## External interfaces and dependencies

Requires BusinessContext and AI task monitoring. Provider, content boundaries, retention and permitted outbound fields need human agreement. Shared logical contracts and ownership boundaries are in [architecture](../../docs/architecture.md); they are design proposals until reviewed. Producer and consumer versions, data shape details and compatibility must be agreed before Ready.

## Decisions and approval

| Decision | Owner and blocking status | Resolution |
| --- | --- | --- |
| draft-promotional-concepts-D01: Provider, claims/content policy, retention, outbound fields and approval point for publication; human product owner; blocks Ready. | Human product/contract authority; blocks Ready or the affected scope | Pending |

## Verification and evidence

Independent test design, adequacy review, protected baseline, implementation snapshot, integration and security checks are pending under the [agent workflow](../../workflow/agents/README.md). No application behaviour, persistence, provider integration or deployment has been verified. AI role coverage and environment separation remain release gates where applicable.

| Criterion | Evidence | Status |
| --- | --- | --- |
| draft-promotional-concepts-AC01 | Pending | Not verified |
| draft-promotional-concepts-AC02 | Pending | Not verified |
| draft-promotional-concepts-AC03 | Pending | Not verified |
| draft-promotional-concepts-AC04 | Pending | Not verified |
| draft-promotional-concepts-AC05 | Pending | Not verified |

## Revision history

| Revision / date | Change | Approval and evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft from F09-US01 and current RD/SEC rules | Product approval and verification pending |
