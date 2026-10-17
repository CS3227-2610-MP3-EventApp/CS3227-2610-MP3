# Change published activities

| Field | Value |
| --- | --- |
| Stable capability ID | change-published-activities |
| Covered stories | [F05-US01](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap | Organiser and attendee reader; [phase 4](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of revision 1 and `ProgrammeChanged v1` |
| Review / run record | Pending |

Sources: [standard](../README.md), catalogue, [RD04/RD05](../../docs/project.md#accepted-review-decisions), [security](../../docs/security.md), [architecture design draft](../../docs/architecture.md) updated 2026-10-17.

## Product outcome, users and scope

An event organiser revises or cancels a published activity with explicit confirmation. Attendees and downstream consumers see current facts while each committed change retains immutable old/new facts, actor and revisions. Publication of announcements and recipient delivery are separate [announcement](draft-and-publish-disruption-announcements.md) and [notification](notify-affected-attendees.md) contracts. A cancelled activity remains identifiable for accepted plans; change does not silently replace anyone's plan. Room sharing remains permitted and room capacity is checked per item.

## Use cases and user interface

The organiser sees current item facts/revision, edits eligible fields or selects cancellation, reviews a before/after preview and confirms. Success shows the committed change and current state; stale revisions display the latest facts for review. Attendee programme and plan views show current time, room or cancellation with an indication of changes since planning. Failure does not imply the change occurred. Fields/errors and confirmation are accessible.

## Inputs, outputs and functional contract

Input is actor, event/item ID, expected published revision, proposed changed facts or cancellation, and explicit confirmation. Required programme fields, same-event room relation and per-item capacity remain governed by [publication](create-and-publish-programme.md). Successful output is updated item/revision and a stable change ID with immutable `from_revision`, `to_revision`, old/new facts, change type, actor and commit time (`ProgrammeChanged v1`). Change history is ordered by revisions; two subsequent changes retain both historical transitions. Notification recipient selection at commit is defined in [notification](notify-affected-attendees.md). A rejected or failed request returns current/rejection state and leaves item, change history, recipient set and audit outcome consistent.

## Constraints, security and non-functional requirements

[SEC01, SEC02, SEC06, SEC07 and SEC11](../../docs/security.md) apply. Human confirmation of the concrete change and server authority are mandatory; AI can draft but cannot publish on its own. The item update, immutable change facts and attributable audit must commit consistently. Stale or concurrent requests cannot overwrite newer facts. Event items in accepted plans are retained as cancelled/changed rather than cascade-deleted (RD04). Exact editable fields and correction policy are pending.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| change-published-activities-AC01 | An authorised organiser confirms a valid change against current revision; the item shows new facts and a change ID preserves exact prior/new facts and revisions. | F05-US01; RD04 | Update and compare history/current reads |
| change-published-activities-AC02 | The same organiser can cancel a published item; current and accepted-plan reads show cancellation while the referenced item and old facts remain available. | F05-US01; RD04 | Cancel item referenced by plan |
| change-published-activities-AC03 | Invalid fields, wrong-event room, excess per-item capacity, stale revision, absent confirmation or unauthorised actor fail without changing item, history, recipient set or accepted plans. Same-room overlap alone does not fail. | F05-US01; SEC01/07 | Boundary, concurrency and before/after checks |
| change-published-activities-AC04 | Two successive confirmed changes preserve two distinct immutable transitions; a delayed consumer can identify each historical change and current facts without mistaking an intermediate state for current. | F05-US01; RD04 | Two updates before consumer read |
| change-published-activities-AC05 | A committed change has attributable actor, item/revision, time and outcome; protected history/audit reads deny unrelated actors. | F05-US01; SEC02/11 | Audit and denied direct read |
| change-published-activities-AC06 | A controlled persistence failure yields no partial item/change/recipient publication and reports failure accurately. | F05-US01; RD04/05 | Transaction failure and state comparison |

## External interfaces and dependencies

Consumes `PublishedProgramme v1` and [workspace access](../shared/access-authorised-workspaces.md); produces `ProgrammeChanged v1` as described in [architecture](../../docs/architecture.md#contracts-for-independent-development). [Notifications](notify-affected-attendees.md) consume stable change ID and commit-time recipient set; [planning](../attendee-planning/manage-preferences-and-itineraries.md) consumes current facts and change indicators. Event/item revisions and immutable old/new facts must remain compatible across consumers and upgrades.

## Decisions and approval

| Decision | Options / proposed direction | Owner | Blocks | Resolution |
| --- | --- | --- | --- | --- |
| C-01 | Editable published fields and cancellation/correction semantics | Product human owner | Ready | Pending |
| C-02 | Atomic recipient selection race contract with plan acceptance | Product/contract human owners | F05 integration | Pending (RD05 must hold) |
| C-03 | History visibility and retention | Product/privacy human owner | Ready | Pending |

## Verification and evidence

Independent test plan/baseline/reviews and real producer-consumer integration are pending. AC04 and AC06 require historical and failure checks; no criterion is verified. Deployed environment and human teammate review remain pending.

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft | Approval and verification pending |
