# Replan after cancellations

| Field | Value |
| --- | --- |
| Stable capability ID | `replan-after-cancellations` |
| Covered stories | [F03-US03](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Attendee; [phase 4, order 12](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of this revision and dependent contracts |
| Review / run record | Pending independent draft review and later implementation records |

Follow the [standard](../README.md). This contract lets an attendee compare and explicitly choose a replacement itinerary after a published cancellation. A replacement is a private proposal; no accepted plan changes automatically.

## Product outcome, users and scope

An attendee whose accepted plan contains a cancelled activity can request a feasible replacement based on current published items and their preferences. They can compare the old accepted plan with a validated candidate, save a draft and explicitly accept a new version. The old plan, including its cancelled item and historical facts, remains visible until owner action. There is no reservation or automatic notification beyond the separate [change notification contract](../programme/notify-affected-attendees.md).

## Use cases and user interface

From a changed accepted plan or notification, the owner sees the cancelled activity, previous and current facts, and the impact on their day. They request replanning, monitor the job, then compare old and proposed timelines, changed activities, reasons, hard-constraint results and any unknowns. An infeasible result explains why no valid replacement is available. A failed/cancelled job offers manual editing. Acceptance requires an explicit current-version confirmation with accessible warnings.

## Inputs, outputs and functional contract

Inputs are an authorized owner, accepted itinerary version, immutable programme-change ID and old/new facts, current published programme revisions, current preferences/constraints and optional owner request. Output is a validated feasible private replacement draft, or infeasible/failure status. A proposed replacement references current same-event activities and records source revisions; its comparison identifies retained, removed and added items without erasing historical facts. Accepting it creates a new accepted version only after current facts, plan version and constraints are rechecked. A stale, invalid or failed request preserves the prior accepted plan and produces no unsolicited change notifications or publication.

## Constraints, security and non-functional requirements

Apply RD03, RD04 and RD07; [SEC01–06, SEC08 and SEC10](../../docs/security.md). The AI result is never authority for acceptance or programme changes. Programme cancellation facts come from the committed change record, not model inference. Validation-before-display and minimum outbound data apply. Provider failure, quota and cancellation keep manual editing available. Job limits and provider/data policy remain pending. Current accepted-plan read must distinguish changed current facts from the old planned facts.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| replan-after-cancellations-AC01 | Given a cancelled activity in an owner's accepted plan, when the owner opens it, then the old planned facts and current cancellation are distinguishable and the cancelled item remains visible until owner action. | F03-US03; RD04 | Historic/current comparison |
| replan-after-cancellations-AC02 | Given a replan request, when a feasible result completes, then the owner sees a private old/new comparison, sources and current hard-constraint result before any acceptance. | F03-US03; RD03-04; SEC04-05 | Valid candidate review |
| replan-after-cancellations-AC03 | Given no feasible replacement, when the task completes, then the user sees infeasibility and blocking constraints; accepted state stays unchanged. | F03-US03; RD03; SEC05 | Infeasible case |
| replan-after-cancellations-AC04 | Given a valid proposal, when the owner explicitly accepts against current plan/programme/preference revisions, then a new accepted version persists and the older version remains identifiable. | F03-US03; RD03-04; SEC05-06 | Acceptance and history |
| replan-after-cancellations-AC05 | Given stale plan facts, another edit, fabricated output or invalid constraints, when display/acceptance is attempted, then the proposal is rejected or marked stale and no accepted data is overwritten. | F03-US03; SEC04-05 | Race/fabrication/state preservation |
| replan-after-cancellations-AC06 | Given wrong-user access, injected programme text, cancellation, timeout, quota or provider failure, when a replan task runs, then private access and job boundaries hold and manual planning remains usable without an accepted-plan change. | F03-US03; RD07; SEC01-03, SEC08, SEC10 | Adverse AI/security cases |

## External interfaces and dependencies

Requires [programme changes](../programme/change-published-activities.md) with immutable old/new facts, [accepted plans/preferences](manage-preferences-and-itineraries.md), [AI itinerary validation](generate-feasible-itineraries.md), and [AI task monitoring](../shared/monitor-and-recover-ai-tasks.md). It returns comparison, draft, infeasible or failed status; new accepted versions follow the planning owner contract. Exact cross-contract revision and result shapes require review before Ready.

## Decisions and approval

| Decision | Options / proposed direction | Decision owner | Blocks what? | Resolution |
| --- | --- | --- | --- | --- |
| RAC-01 | Programme-change/plan comparison and version contract | Programme and planning contract owners with human product owner | Ready/integration | Pending |
| RAC-02 | Constraint/buffer and unknown accessibility semantics | Human product owner | Ready/feasibility checks | Pending; D08 |
| RAC-03 | Provider, outbound fields, timeout/quota/retention | Human product/security owners | Ready/AI integration | Pending; D06/D08 |

## Verification and evidence

AC01–AC06 remain unexecuted test-design scenarios. Evidence must include old/new fact integrity, stale acceptance, wrong-owner denial, provider failure and real producer integration. Protected baseline, implementation snapshot, independent reviews, human teammate review and environment evidence are pending under the [agent workflow](../../workflow/agents/README.md).

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft; AC01–AC06 allocated | Approval and verification pending |
