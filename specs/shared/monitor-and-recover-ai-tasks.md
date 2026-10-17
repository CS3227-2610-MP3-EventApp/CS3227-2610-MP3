# Monitor and recover AI tasks

| Field | Value |
| --- | --- |
| Stable capability ID | monitor-and-recover-ai-tasks |
| Covered stories | [F10-US02](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap | Attendee, organiser, business participant; [phase 3](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of revision 1 and AI/provider boundary |
| Review / run record | Pending |

Sources: [standard](../README.md), catalogue, [RD07](../../docs/project.md#accepted-review-decisions), [security](../../docs/security.md), and [architecture design draft](../../docs/architecture.md) updated 2026-10-17.

## Product outcome, users and scope

Every role can request its authorised AI workflow, see its own task status, inspect validated results or an actionable failure, cancel ongoing work, and continue manually. This shared contract governs task ownership, visibility, limits and recovery; domain specs own what a valid itinerary, analysis or preparation draft contains. It does not grant AI permission to change accepted or shared state. It supports but does not itself satisfy the real LLM feature required for each role.

## Use cases and user interface

The user starts a role task, sees pending/running/progress/completed/failed/cancelled or equivalent clear states, and can open only their authorised result. Cancellation acknowledges whether work stopped or an already executed action needs separate reconciliation. Timeout, provider failure, invalid output and quota denial are understandable, without leaking private prompts or provider secrets. Manual itinerary planning, application review/announcement authoring and business checklist/budget work remain available. Status and error messages are accessible and distinguish a retryable task from one requiring user correction.

## Inputs, outputs and functional contract

Inputs are authenticated actor, permitted workflow type, event/business scope and workflow-specific parameters. Server-resolved scope bounds source reads and tool actions. A task response includes stable job ID, owner, workflow kind, state, creation/update/completion times, bounded progress indication and safe failure category. A completed result is a validated typed artifact with provenance and observed source revisions (`DraftArtifact v1`); malformed or fabricated facts never appear as valid results. Cancellation requests target the actor's job and return current state. Accepted domain data stays separate from drafts and survives failure or cancellation.

## Constraints, security and non-functional requirements

[SEC01, SEC03, SEC04, SEC06, SEC08, SEC10 and SEC12](../../docs/security.md) apply; external actions additionally require [SEC07](../../docs/security.md). Treat retrieved content as data, minimise outbound fields and redact logs. Server-enforced timeout, rate/usage quotas and tool bounds must stop further work once exceeded. Cancellation prevents subsequent task steps where possible; it cannot undo an already executed external action. State changes and result access must be owner/resource authorised even if a job ID is known. Exact provider, allowed fields, limit values, retention and progress vocabulary are pending.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| monitor-and-recover-ai-tasks-AC01 | An authorised role request returns a durable owned job ID and visible current state/progress; only permitted inputs/resources are used. | F10-US02; RD07; SEC01/08 | Each-role synthetic workflow, outbound inspection |
| monitor-and-recover-ai-tasks-AC02 | Owner can retrieve a completed result only after schema/fact/source-revision validation; malformed, fabricated or stale output is not displayed as valid. | F10-US02; SEC04 | Inject bad references/schema and inspect result |
| monitor-and-recover-ai-tasks-AC03 | Another user, inactive member or wrong-scope actor cannot list, inspect, cancel or obtain artifacts for the job, and denial does not alter it. | F10-US02; SEC01/02 | Direct job boundary matrix |
| monitor-and-recover-ai-tasks-AC04 | Owner cancellation stops subsequent task work at the defined cancellable boundary and reports its actual terminal or reconciliation state without erasing accepted data. | F10-US02; RD07; SEC10 | Cancel before next step and after external outcome boundary |
| monitor-and-recover-ai-tasks-AC05 | Timeout, provider error, invalid output and quota/rate exhaustion produce distinct safe outcomes, enforce configured limits and leave accepted domain records and manual workflows usable. | F10-US02; SEC04/10 | Controlled failures, before/after accepted state |
| monitor-and-recover-ai-tasks-AC06 | Untrusted source instructions cannot enlarge permissions, tool scope, recipients or outbound fields; attempted injection produces no prohibited side effect. | F10-US02; SEC03/06/08 | Inject application/web text; inspect actions/outbound |
| monitor-and-recover-ai-tasks-AC07 | Task state/results remain coherent across app/storage restart and later read; expired/retained records follow the approved retention policy without exposing private content. | F10-US02; RD07 | Restart and retention lifecycle after policy approval |

## External interfaces and dependencies

Consumes [workspace access](access-authorised-workspaces.md) and `CurrentActor v1`; produces owner-scoped task state and `DraftArtifact v1` per [architecture](../../docs/architecture.md#contracts-for-independent-development). Domain AI capabilities define artifact schemas and fresh acceptance validation. The approval contract in [external actions](approve-external-actions.md) governs any external write. Error categories, state transitions, retention and compatibility versions must be agreed before Ready.

## Decisions and approval

| Decision | Options / proposed direction | Owner | Blocks | Resolution |
| --- | --- | --- | --- | --- |
| J-01 | Model provider, permitted outbound fields, consent/retention | Product/privacy human owner | Ready for AI features | Pending (D06) |
| J-02 | Timeout, rate/quota/tool bounds and progress semantics | Product/security human owner | Ready and limit tests | Pending (D08) |
| J-03 | Job/artifact retention, cancel boundary and post-action reconciliation state | Product/contract human owner | Ready | Pending |

## Verification and evidence

Independent test design/review, protected baseline, selected-provider integration for each role, restart, adversarial security checks and online environment checks are pending. All criteria are unverified. Provider fixtures alone cannot satisfy the role LLM gate; later evidence must name the actual integration and revisions. Human teammate review and summary verification remain pending.

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft | Approval and verification pending |
