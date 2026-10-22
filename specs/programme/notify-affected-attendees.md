# Notify affected attendees

| Field | Value |
| --- | --- |
| Stable capability ID | notify-affected-attendees |
| Covered stories | [F05-US02](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 2 / Draft |
| Product roles / roadmap | Attendee, organiser trigger; [phase 4](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of exact revision 2 and recipient contract |
| Review / run record | Partial implementation, test and independent review evidence in the [F05 run record](../../workflow/agents/runs/2026-10-21-organiser-disruptions.md); real F02 integration and human approval pending |

Sources: [standard](../README.md), catalogue, [RD04/RD05](../../docs/project.md#accepted-review-decisions), [security](../../docs/security.md), [architecture](../../docs/architecture.md) updated 2026-10-21, and the attendee itinerary Draft at [manage preferences and itineraries](../attendee-planning/manage-preferences-and-itineraries.md). Per the orchestrator's task brief, the user approved the implementation plan; that plan approval is separate from approval of this exact specification revision and its contracts, which remains pending.

## Product outcome, users and scope

When a published activity changes, only attendees whose accepted itinerary contains that activity at the change commit boundary receive one in-app notice per change. The recipient source must be the real accepted-itinerary membership query from the F02 capability, serialized with acceptance for that event; a missing F02 producer is a blocking dependency, never an empty recipient set. Initial configuration has `f02_planning_enabled=false`; while false, changes record `recipientSnapshotStatus="blocked_f02"`. If F02 planning is enabled without the real recipient provider and same-event commit lock, change and notification operations fail closed. Notification routes return `503 f02_integration_pending`; they must not report successful delivery or imply that no one was affected. No F02 tables or substitute recipient source are introduced by this capability. Each notice states verified historical change facts and links to current programme facts. Drafts and bookmarks alone do not qualify. Email/push and business-specific disruption views are excluded. The notice does not alter or replace accepted plans.

## Use cases and user interface

An affected attendee sees an unread notice, opens old/new time, room or cancellation facts, follows a link to current item state, and marks it read. If later changes occurred, historical facts remain distinct from current facts. An unaffected attendee sees no notice only after a valid recipient query has run. A true empty inbox is distinguishable from the service-unavailable state. Read state and messages are accessible and owner-private.

## Inputs, outputs and functional contract

Input is a committed `ProgrammeChanged v1` change plus a consistent snapshot from the actual F02 accepted-itinerary query at the programme-change commit boundary. Programme mutation and recipient snapshot must serialize with acceptance on the same event lock/transaction boundary. Output is a fixed recipient set with one recipient/change notification each, referencing change ID, observed accepted-plan revision, immutable old/new facts, delivery/read state and creation time. Later plan edits, delivery retries or another change cannot alter the original recipient set. Mark-read changes only the recipient's notice. The attendee sees historical facts plus separately labelled current facts; delayed delivery never asserts historical facts as current. Proposed global attendee endpoints are `GET /api/v1/attendee/notifications` (paginated), `GET /api/v1/attendee/notifications/{notification_id}`, and `POST /api/v1/attendee/notifications/{notification_id}/read`. Until the actual recipient contract is available, every notification route returns `503 f02_integration_pending` with no success-shaped empty list or write. A notification row must be persisted only after a real recipient set is selected; no placeholder or fake F02 tables are permitted. List pagination defaults to limit 50/offset 0, with limit 1–100 and non-negative offset.

## Constraints, security and non-functional requirements

[SEC01, SEC02 and SEC11](../../docs/security.md) apply. Recipient selection must be consistent with concurrent plan acceptance and the programme change commit (RD05). Dedupe is by recipient/change ID; retries use persisted recipients. Denied mark-read or delivery failure preserves recipient/read state except an accurate failure record. Retention and delivery time limits remain pending, with no implied push/email permission.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| notify-affected-attendees-AC01 | At change commit, an attendee with the item in an accepted itinerary is included once and receives a private in-app notice with change ID, old/new facts and source revision. | F05-US02; RD04/05 | Accepted-plan fixture and notice read |
| notify-affected-attendees-AC02 | A bookmark-only, draft-only or unrelated attendee is not selected; direct list/detail access cannot reveal another recipient's notice. | F05-US02; RD05; SEC01/02 | Mixed fixtures and wrong-owner reads |
| notify-affected-attendees-AC03 | Concurrent plan acceptance and change have one consistent recipient outcome based on commit ordering; later plan edits and retries do not retarget or duplicate the notice. | F05-US02; RD05 | Controlled race, later edit and retry |
| notify-affected-attendees-AC04 | Two changes before delayed delivery create distinct historical notices, each linking to separately identified current facts. | F05-US02; RD04/05 | Two updates and delayed processing |
| notify-affected-attendees-AC05 | Owner can mark a notice read; wrong owner and failed/stale operations leave other notice state unchanged. | F05-US02; SEC01 | Mark-read and denied direct writes |
| notify-affected-attendees-AC06 | A delivery failure remains visible/retryable under the agreed policy without losing fixed recipients or duplicating successful delivery. | F05-US02; RD05 | Controlled delivery failure/retry |
| notify-affected-attendees-AC07 | If `f02_planning_enabled=false`, or the actual F02 accepted-itinerary query/same-event commit lock is unavailable, the API reports `503 f02_integration_pending`; it does not return a success-shaped empty inbox, create placeholder recipients, or claim delivery. | F05-US02; RD05; SEC11 | Disabled flag and missing-provider scaffold; no-side-effect comparison |

## External interfaces and dependencies

Consumes [programme changes](change-published-activities.md), `ProgrammeChanged v1`, and accepted itinerary revision membership from [planning](../attendee-planning/manage-preferences-and-itineraries.md). The programme-change/recipient commit contract must be agreed jointly with those producers. List/detail/read-state response and error semantics need versioned review; physical queue/storage design is outside this spec.

## Decisions and approval

| Decision | Options / proposed direction | Owner | Blocks | Resolution |
| --- | --- | --- | --- | --- |
| N-01 | Exact accepted-itinerary membership query and same-event serialization with plan acceptance | F02 and F05 product/contract owners | Ready and integration | Blocking: F02 is absent and initially disabled; use `f02_integration_pending`, never infer an empty recipient set, until an accepted real provider exists |
| N-02 | Notice wording, retention, retry/latency expectations | Product/privacy human owner | Ready | Pending |
| N-03 | Audit access for organiser versus recipient | Product/security human owner | Ready | Pending |

## Verification and evidence

The explicit disabled/missing-F02 rejection gate, notification persistence/routes/UI and independent protected tests/reviews are recorded in [the F05 run](../../workflow/agents/runs/2026-10-21-organiser-disruptions.md). The real F02 producer is absent: recipient selection, acceptance/change concurrency, actual private delivery/read lifecycle and full criterion verification remain blocked. No fabricated recipient set or successful empty inbox substitutes for integration. Human teammate and online environment checks remain pending.

## Project gates

This notice capability does not itself provide an LLM feature; attendee AI remains scoped to its itinerary and event-question stories, organiser AI to the separate announcement capability, and business AI to business preparation. Actual specialist handoffs, reviewed baselines and bounded gate/security evidence are linked above, not completion of RD05. Real F02 integration, exact-written-revision approval, online deployment with separate development/production data and credentials and human teammate review remain pending under the [project completion gates](../../docs/project.md#mandatory-completion-gates).

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft | Approval and verification pending |
| 2 / 2026-10-21 | Made real F02 accepted-plan query and same-event acceptance lock an explicit hard dependency; disallowed fake empty delivery and F02 tables; specified safe 503 scaffold and pagination | Plan approval is reported in the orchestrator's task brief; exact revision 2 approval pending; delivery remains blocked on an accepted and implemented F02 recipient contract |
