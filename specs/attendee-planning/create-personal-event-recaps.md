# Create personal event recaps

| Field | Value |
| --- | --- |
| Stable capability ID | `create-personal-event-recaps` |
| Covered stories | [F03-US04](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Attendee; [phase 5, order 14](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of this revision and dependent contracts |
| Review / run record | Pending independent draft review and later implementation records |

Follow the [standard](../README.md). An attendee explicitly marks activities as attended and creates a private recap distinguishing those marks from activities merely planned. EventApp must not infer attendance from an itinerary, location or check-in that this contract does not provide.

## Product outcome, users and scope

The owner can mark or unmark attendance for their event activities and request an AI-assisted recap grounded in their authorized plan and explicit markers. The recap is a private draft for review, not a public post or independently verified attendance certificate. It can contribute to the attendee LLM feature set, but no provider integration is claimed here.

## Use cases and user interface

The attendee views past and current planned activities, explicitly records which they attended, then requests a recap. The draft labels planned versus self-marked attended events, cites the supporting plan/marker facts and permits review/edit where agreed. Missing markers mean unconfirmed, not attended. A cancelled, stale, failed or infeasible job has a clear outcome, and existing markers/plans remain usable. Visible labels and controls meet accessibility requirements.

## Inputs, outputs and functional contract

Inputs are an authenticated owner, event and activity IDs from their plan/history, marker state, plan and programme revisions, and optional recap scope. Outputs are persisted owner-scoped attendance markers and a validated private recap draft whose activity IDs, factual details and planned/attended labels match current authorized records and explicit markers. The recap may include user-authored text if separately accepted; it must not assert unmarked attendance. Failed generation does not overwrite markers, plans or a previously accepted recap. Marker eligibility, edits, retention and recap schema require decisions.

## Constraints, security and non-functional requirements

Apply RD04, RD07 and [SEC01–06, SEC08 and SEC10](../../docs/security.md). Marker ownership is server-enforced. Plan and programme text is untrusted input to the model. Validate output schema, item IDs/revisions and claimed marker status before display. Send minimum permitted personal data to the provider; provider/consent policy remains unresolved. No automatic publication or sharing. Keep core manual plan and marker operation available when AI fails.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| create-personal-event-recaps-AC01 | Given an authorized owner and eligible activity, when they explicitly mark or unmark attendance, then the private marker persists and is visible only to that owner. | F03-US04; SEC01-02 | Marker persistence and ownership |
| create-personal-event-recaps-AC02 | Given a plan with some explicit markers, when a recap is generated, then planned and self-marked attended activities are distinguished and no unmarked activity is asserted attended. | F03-US04; SEC04 | Mixed marker fixture |
| create-personal-event-recaps-AC03 | Given a validated recap, when the owner opens it, then referenced activity facts and planned/attended labels match permitted plan, programme revisions and markers; unsupported claims are absent or marked unknown. | F03-US04; RD04; SEC04 | Grounding/stale facts |
| create-personal-event-recaps-AC04 | Given fabricated output or injection in a programme description, when generation runs, then the result is not shown as validated and no private data is disclosed or shared externally beyond agreed permitted fields. | F03-US04; SEC03-04, SEC08 | Injection/fabrication/outbound checks |
| create-personal-event-recaps-AC05 | Given wrong-owner access, cancellation, timeout, quota or provider failure, when the operation ends, then access/status boundaries hold and existing markers, plans and prior recap state are unchanged; manual marking remains usable. | F03-US04; RD07; SEC01, SEC10 | Adverse and fallback checks |

## External interfaces and dependencies

Consumes private [itinerary versions](manage-preferences-and-itineraries.md), [programme facts and changes](../programme/change-published-activities.md), [workspace authorization](../shared/access-authorised-workspaces.md), and [AI task status](../shared/monitor-and-recover-ai-tasks.md). Exposes owner-scoped marker state and recap draft with referenced revisions. The current [architecture](../../docs/architecture.md) lacks a marker/recap domain contract; define it without making a generic AI artifact the sole authoritative marker record.

## Decisions and approval

| Decision | Options / proposed direction | Decision owner | Blocks what? | Resolution |
| --- | --- | --- | --- | --- |
| CPR-01 | Marker eligibility (planned-only or any attended event item), edit/retention semantics | Human product owner | Ready and data contract | Pending |
| CPR-02 | Recap provider, outbound personal fields, consent/retention | Human product/security owners | Ready and AI integration | Pending; D06 |
| CPR-03 | Recap editing/sharing scope and version shape | Human product/contract owners | Ready and UI/tests | Pending; public sharing excluded unless approved |

## Verification and evidence

AC01–AC05 are unexecuted scenarios for independent test design. Evidence must include marker persistence, false-attendance prevention, model grounding, owner denial and provider failure; baseline, snapshot, reviews, human teammate review and environment checks remain pending under the [agent workflow](../../workflow/agents/README.md).

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft; AC01–AC05 allocated | Approval and verification pending |
