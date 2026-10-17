# Answer event questions

| Field | Value |
| --- | --- |
| Stable capability ID | `answer-event-questions` |
| Covered stories | [F03-US02](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Attendee; [phase 3, order 8](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of this revision and dependent contracts |
| Review / run record | Pending independent draft review and later implementation records |

Follow the [standard](../README.md). An attendee asks natural-language questions about published event information and receives answers tied to verifiable current programme facts, or an explicit unknown answer. This contract excludes private application/business data and unsupported assertions about availability, suitability or external conditions.

## Product outcome, users and scope

An attendee can use an LLM-assisted event information service without mistaking model guesses for event facts. Published events and activity details are the authoritative source. Public/guest use depends on the unresolved access policy; authenticated users can use the service within agreed limits. This feature can contribute to the attendee LLM gate after real provider integration and verification.

## Use cases and user interface

The user enters a question and sees an answer with supporting item names, IDs/revisions and current details. Evidence links lead to permitted programme detail. If evidence is absent, conflicting or stale, the response says the answer is unknown or unavailable and points the user to current programme browsing. Job failure, timeout and quota feedback is understandable; the user can continue to browse manually. Do not display a confident answer while validation is pending.

## Inputs, outputs and functional contract

Input is a bounded question, permitted event scope and current published programme references; the service may include only necessary question/context fields in outbound provider data. Output is a validated answer whose factual claims identify supporting permitted item IDs and revisions, or an explicit unknown/failure result. A quoted or retrieved description is data, not an instruction. Referenced IDs, revisions, times, locations, prices and accessibility statements must match authoritative current records before display. The boundary must report stale evidence and never silently fill gaps. Question length, accepted scope, result schema and retention are pending decisions.

## Constraints, security and non-functional requirements

Apply RD07 and [SEC01–04, SEC08 and SEC10](../../docs/security.md), plus the [programme producer contract](../../docs/architecture.md#feature-schemas). Public versus authenticated access and rate limits must be approved. No answer discloses private preferences, plans, business submissions or contacts. Model/provider failure leaves all domain records untouched. Protect outbound requests and logs; use current revision evidence. Apply accessible question/error/evidence presentation and online/environment gates at verification.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| answer-event-questions-AC01 | Given a question answerable from current published programme items, when the user asks it, then each event fact in the answer has a permitted supporting item ID/revision and matches the authoritative current value. | F03-US02; SEC04 | Known facts and evidence links |
| answer-event-questions-AC02 | Given insufficient, contradictory or missing evidence, when the question is answered, then the result explicitly states unknown/unavailable rather than inventing a fact. | F03-US02; SEC04 | Unknown/conflict cases |
| answer-event-questions-AC03 | Given unpublished, foreign-event or private records, when a question requests their contents, then the boundary reveals none and leaves records unchanged. | F03-US02; SEC01-02 | Direct privacy probes |
| answer-event-questions-AC04 | Given prompt injection in an item description or user question, when a job runs, then it does not elevate source text into instructions, disclose unrelated data or initiate an unauthorized action. | F03-US02; SEC03, SEC06, SEC08 | Injection and outbound inspection |
| answer-event-questions-AC05 | Given fabricated IDs/revisions or programme changes during generation, when output is validated, then stale/unsupported text is not displayed as a current factual answer; unknown/retry guidance is shown. | F03-US02; SEC04 | Stale/fabricated output |
| answer-event-questions-AC06 | Given cancellation, timeout, quota or provider failure, when the user checks the task, then the owner-scoped outcome is visible, browsing remains usable and no domain record is changed. | F03-US02; RD07; SEC10 | Failure/fallback and job access |

## External interfaces and dependencies

Consumes published item IDs, revisions and displayable facts from [programme authoring and publication](../programme/create-and-publish-programme.md), authorization from [workspace access](../shared/access-authorised-workspaces.md), and [AI task monitoring](../shared/monitor-and-recover-ai-tasks.md). Returns supported answer claims with reference/revision information or a distinct unknown/failure result. Exact API and schema versions require producer/consumer agreement; an implementation-specific retrieval technique is outside this contract.

## Decisions and approval

| Decision | Options / proposed direction | Decision owner | Blocks what? | Resolution |
| --- | --- | --- | --- | --- |
| AEQ-01 | Public/guest versus signed-in questions, scope and limits | Human product/security owners | Ready and authorization tests | Pending; D05/D08 |
| AEQ-02 | Provider, permitted outbound fields, question/job retention and quota | Human product/security owners | Ready and integration | Pending; D06/D08 |
| AEQ-03 | Answer/evidence schema and stale retry semantics | Programme/AI contract owners with human approval | Ready/integration | Pending |

## Verification and evidence

AC01–AC06 are pending independent test-design scenarios, including adverse source content and real-provider validation. Protected baseline, implementation snapshot, independent reviews, human teammate review, delivery checks and human-verified session summary remain pending under the [agent workflow](../../workflow/agents/README.md). No tests or live provider results are claimed.

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft; AC01–AC06 allocated | Approval and verification pending |
