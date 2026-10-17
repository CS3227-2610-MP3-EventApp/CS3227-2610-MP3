# Analyse applications with AI

| Field | Value |
| --- | --- |
| Stable capability ID | analyse-applications-with-ai |
| Covered stories | F04-US02; [catalogue](../../docs/UserStoriesAndFeatures.md); criteria below |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Authorised event organisers. [3 - AI for every role](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending: human product/contract owner; no approval recorded |
| Review / run record | Pending: independent draft review and test scenarios |

## Product outcome, users and scope

An organiser requests a rubric-based AI report for a frozen submitted application. The report provides criterion-level evidence, unknowns and possible same-event duplicate flags for human review. It never decides or labels fraud. Applicants never see comparison evidence.

## Use cases and user interface

Show the report's submission and rubric versions, criterion findings with cited evidence, unknowns and duplicate flags, and a visible stale label when the current rubric changes. Show validation/provider failures without a persuasive unvalidated report.

## Inputs, outputs and functional contract

Inputs: authorised event/submission ID, immutable submitted-content revision and current immutable rubric version, with only permitted same-event submitted comparisons. Outputs: private validated report with exact source IDs/versions, evidence and limits, or explicit failure/unknown status. No decision side effect.

## Constraints, security and non-functional requirements

RD02, RD06, RD07; SEC01-04, SEC08, SEC10, SEC13. Submission text is untrusted. Comparison excludes drafts and other events. A newer rubric makes saved reports visibly stale; regeneration is needed for current assessment. Manual decisions remain possible. See [accepted decisions](../../docs/project.md#accepted-review-decisions) and [security rules](../../docs/security.md). Accessibility and delivery obligations follow the [development workflow](../../workflow/README.md); exact measurable bounds remain pending where listed below.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rule trace | Planned verification |
| --- | --- | --- | --- |
| analyse-applications-with-ai-AC01 | An organiser requests analysis of a submitted application for its event and receives a validated report tied to the exact submitted and rubric versions with evidence for each criterion. | F04-US02; RD02, RD06, RD07 | Pending: independent positive/adverse scenario |
| analyse-applications-with-ai-AC02 | A newer applicable rubric marks the existing report stale; the old report keeps its provenance and is not displayed as a current assessment. | F04-US02; RD02, RD06, RD07 | Pending: independent positive/adverse scenario |
| analyse-applications-with-ai-AC03 | Private drafts and other-event submissions are excluded from duplicate comparison, and organiser-only comparison evidence never enters applicant responses. | F04-US02; RD02, RD06, RD07 | Pending: independent positive/adverse scenario |
| analyse-applications-with-ai-AC04 | Injected instructions in submitted content cannot change rubric, access scope, permissions or decision state. | F04-US02; RD02, RD06, RD07 | Pending: independent positive/adverse scenario |
| analyse-applications-with-ai-AC05 | Malformed, fabricated, contradictory or ungrounded output is rejected as a valid report; prior decisions and reports remain intact. | F04-US02; RD02, RD06, RD07 | Pending: independent positive/adverse scenario |
| analyse-applications-with-ai-AC06 | Wrong-user job/report access, quota exhaustion, timeout, cancellation and provider failure have bounded visible outcomes; manual review remains available. | F04-US02; RD02, RD06, RD07 | Pending: independent positive/adverse scenario |

## External interfaces and dependencies

Requires frozen submissions, versioned rubric and AI task monitoring. Exact rubric schema, permitted model fields, provider/retention and duplicate threshold are human decisions. Shared logical contracts and ownership boundaries are in [architecture](../../docs/architecture.md); they are design proposals until reviewed. Producer and consumer versions, data shape details and compatibility must be agreed before Ready.

## Decisions and approval

| Decision | Owner and blocking status | Resolution |
| --- | --- | --- |
| analyse-applications-with-ai-D01: Rubric content/version policy, provider and outbound fields, duplicate threshold, limits and retention; human product/contract owner; blocks Ready. | Human product/contract authority; blocks Ready or the affected scope | Pending |

## Verification and evidence

Independent test design, adequacy review, protected baseline, implementation snapshot, integration and security checks are pending under the [agent workflow](../../workflow/agents/README.md). No application behaviour, persistence, provider integration or deployment has been verified. AI role coverage and environment separation remain release gates where applicable.

| Criterion | Evidence | Status |
| --- | --- | --- |
| analyse-applications-with-ai-AC01 | Pending | Not verified |
| analyse-applications-with-ai-AC02 | Pending | Not verified |
| analyse-applications-with-ai-AC03 | Pending | Not verified |
| analyse-applications-with-ai-AC04 | Pending | Not verified |
| analyse-applications-with-ai-AC05 | Pending | Not verified |
| analyse-applications-with-ai-AC06 | Pending | Not verified |

## Revision history

| Revision / date | Change | Approval and evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft from F04-US02 and current RD/SEC rules | Product approval and verification pending |
