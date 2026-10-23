# Change published activities

| Field | Value |
| --- | --- |
| Stable capability ID | change-published-activities |
| Covered stories | [F05-US01](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 2 / Draft |
| Product roles / roadmap | Organiser and attendee reader; [phase 4](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of exact revision 2 and `ProgrammeChanged v1` |
| Review / run record | Partial implementation, test and independent review evidence in the [F05 run record](../../workflow/agents/runs/2026-10-21-organiser-disruptions.md); F02 integration and human approval pending |

Sources: [standard](../README.md), catalogue, [RD04/RD05](../../docs/project.md#accepted-review-decisions), [security](../../docs/security.md), [architecture](../../docs/architecture.md) updated 2026-10-21, and the published item contract in [create and publish programme](create-and-publish-programme.md). Per the orchestrator's task brief, the user approved the implementation plan; that plan approval is separate from approval of this exact specification revision and its contracts, which remains pending.

## Product outcome, users and scope

An event organiser revises or cancels a published activity with explicit confirmation. Attendees and downstream consumers see current facts while each committed change retains immutable old/new facts, actor and revisions. Publication of announcements and recipient delivery are separate [announcement](draft-and-publish-disruption-announcements.md) and [notification](notify-affected-attendees.md) contracts. A cancelled activity remains identifiable for accepted plans; change does not silently replace anyone's plan. Room sharing remains permitted and room capacity is checked per item.

## Use cases and user interface

The organiser sees current item facts/revision, edits the complete published field set or selects cancellation, reviews the exact before/after facts and confirms. A correction reason is optional for a change. Cancellation requires a non-empty reason of 1–1000 characters; the reason remains visible in organiser change lists and history. Success shows the committed change and current state; stale revisions display the latest facts for a new review. Attendee programme and plan views show current facts or cancellation with an indication of changes since planning. Failure does not imply the change occurred. Fields/errors and confirmation are accessible.

## Inputs, outputs and functional contract

All routes below are under `/api/v1`. Every edit submits all `ItemFields` (`roomId`, `title`, `type`, `startsAt`, `endsAt`, `capacity`, `priceMinorUnits`, `currency`, and `accessibilityDetails`), `expectedRevision`, and `confirmed: true`; `reason` is optional and length 1–1000 when supplied. `POST /organiser/events/{event_id}/programme-items/{item_id}/changes` returns the committed `ProgrammeItem` with `lastChangeId`; immutable change rows are returned only by history. `POST /organiser/events/{event_id}/programme-items/{item_id}/cancel` requires `expectedRevision`, `confirmed: true`, and a 1–1000-character reason, and returns the `ProgrammeItem` with `lastChangeId`. `GET /organiser/events/{event_id}/programme-items/{item_id}/changes` returns `{items,total,limit,offset}`, ordered by descending `toRevision` then stable ID (latest first); `limit` defaults to 50 and is 1–100, and `offset` defaults to 0 and is 0–2147483647. A change row records stable change ID, event/item IDs, unique `toRevision`, `fromRevision`, type, complete immutable old/new facts, optional reason, actor, commit time, and `recipientSnapshotStatus`. When the F02 integration is disabled, a successful change records `recipientSnapshotStatus: "blocked_f02"` and cannot claim notifications were selected or delivered. If F02 planning is enabled but the real accepted-itinerary provider/commit lock is unavailable, the change returns `503 f02_integration_pending` and changes no programme/history/audit state. There is no fake or success-shaped empty recipient snapshot. Cancellation is a terminal published state for this slice; later edits to the cancelled item are rejected. Required programme fields, same-event room relation, event bounds and per-item capacity remain governed by [publication](create-and-publish-programme.md); concurrent same-room activity remains valid. The item update, one change-history row and successful audit commit atomically. Each item revision can have at most one change row; a retry with stale `expectedRevision` cannot create a duplicate transition. A committed change with `blocked_f02` is not notification delivery; later delivery needs the real F02 accepted-itinerary query and same-event serialization with acceptance. A rejected or failed request leaves item, history, recipient outcome and accepted plans unchanged.

## Constraints, security and non-functional requirements

[SEC01, SEC02, SEC06, SEC07 and SEC11](../../docs/security.md) apply. Human confirmation of the concrete change and server authority are mandatory; AI can draft but cannot publish on its own. The item update, immutable change facts and attributable audit must commit consistently. Stale or concurrent requests cannot overwrite newer facts. Event items in accepted plans are retained as cancelled/changed rather than cascade-deleted (RD04). Cancellation terminality and exact-revision approval remain pending.

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
| C-01 | Full editable published field set, 1–1000-character cancellation reason retained in lists, and cancellation terminality | Product human owner | Ready | Proposed in revision 2; exact revision approval pending |
| C-02 | Atomic recipient selection race contract with plan acceptance | Product/contract human owners | F05 integration | F02 is absent: flag disabled mode as `blocked_f02`; if enabled without the real provider/lock, fail the change with 503; no placeholder recipient source is acceptable |
| C-03 | History visibility and retention | Product/privacy human owner | Ready | Event organiser history and attendee-safe facts proposed; retention remains pending |

## Verification and evidence

Local implementation, independently designed protected acceptance tests, RED/GREEN regressions and behaviour/security reviews are recorded in [the F05 run](../../workflow/agents/runs/2026-10-21-organiser-disruptions.md). They cover historical snapshots, current-only reads, rollback, final cancellation, stale writes and authority revocation. This is partial local evidence, not full criterion sign-off: the real F02 recipient/acceptance race integration, manual browser/restart, deployed environment and human teammate review remain pending.

## Project gates

This manual change capability does not claim an LLM capability: organiser disruption drafting is specified separately, while attendee and business LLM requirements remain with their respective stories. Actual specialist handoffs, protected baselines and local implementation/review evidence are linked above; exact-written-revision human approval and teammate review remain pending. Production online delivery with separate development/production data and credentials is not established; see [project completion gates](../../docs/project.md#mandatory-completion-gates).

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft | Approval and verification pending |
| 2 / 2026-10-21 | Specified full-field changes, explicit before/after confirmation, reason rules, item-revision uniqueness, atomic audit, and HTTP/history pagination contract; separated plan approval from exact spec approval | Plan approval is reported in the orchestrator's task brief; human approval of exact revision 2 and shared `ProgrammeChanged v1` remains pending; F02 recipient integration is blocked on its real accepted-itinerary contract |
