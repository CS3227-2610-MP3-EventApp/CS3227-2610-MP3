# Publish and browse an event programme

Status: Draft
Feature ID: F01
Story IDs: F01-US01, F01-US02, F01-US03 (see the [canonical catalogue](../../../docs/UserStoriesAndFeatures.md))
Specification revision: 4
Task/run record: Pending; assign bounded tasks and file ownership when work starts
Independent review and human product/contract approval: Pending; record actual identities and scope in the run record
Approval record: Pending

## Purpose and scope

An authorised organiser creates venues, rooms, and draft programme items for their event and explicitly publishes valid items. An attendee can browse, filter, search, and read the published details. This is the proposed first complete journey through identity, server permissions, storage, UI and deployment.

Includes event-scoped organiser access, venue and room creation, draft and published item states, programme browsing, title search, type/date filters, and factual fields needed by later itinerary planning. Excludes complex venue booking, AI, submissions, personal itineraries, notifications, ordering and external research.

Multiple activities, including different booths, may run concurrently in the same room. Sharing a room or overlapping in time is not by itself a publication error. Per-item duration, capacity and same-event relationship checks still apply. Attendee itinerary overlap warnings belong to F02 and do not prohibit programme publication. Room occupancy aggregation or booth-layout limits require separate agreed rules; this slice does not infer them from summed activity capacities.

Assignment requirement mapping: F01 provides separate organiser and attendee workflows, shared persistence, role-based access control, and the authoritative programme data used by later role-specific AI features. The criteria below remain a draft project specification rather than course-mandated feature details.

Accepted cross-feature decisions RD03/RD04 require stable programme revisions and a read contract that later supports change indicators and cancellation visibility. F01 does not implement itineraries or notifications; [RD01–RD07](../project.md#accepted-review-decisions) constrain dependent features without granting blanket F01 approval.

## Required behavior

Applicable rules: [SEC01, SEC02, SEC11 and SEC12](../security.md).

| ID | Observable acceptance criterion | Planned evidence |
| --- | --- | --- |
| F01-AC01 | An organiser authorised for event A can create a venue and room for A, then create a draft item containing title, start and end, that room, capacity, price and currency, and accessibility details. | Valid venue, room, and item creation through UI and server; retrieve stored values |
| F01-AC02 | An unauthenticated user, attendee, or organiser assigned only to event B cannot create, edit or publish an item in A. Denied requests leave stored data unchanged. | Direct server calls for each role and cross-event case; compare data before and after |
| F01-AC03 | The server rejects end at or before start, missing required fields, negative price, non-integer or non-positive capacity, and rooms outside the event or capacity above the room limit. | Field boundary checks and cross-event room reference |
| F01-AC04 | An authorised organiser can publish a valid draft, including when another activity occupies the same room at an overlapping time; a read through the attendee interface shows the exact stored title, times, room, price, currency, capacity and accessibility details. | Publish two concurrent same-room activities and inspect UI plus server response; retain AC03 validation checks |
| F01-AC05 | The attendee catalogue, title search, and type/date filters return only matching published items in the requested event. Drafts remain inaccessible through list, search, filters, and direct detail requests. | Mixed draft and published data, title/type/date and wrong-event filters, and direct draft ID requests |
| F01-AC06 | Newly created synthetic programme data remains retrievable with its publication state after restarting the application and its relevant storage lifecycle. | Write fresh record, restart, retrieve through intended interface |
| F01-AC07 | Invalid updates and storage failures return a useful error without partially changing or publishing the item. | Invalid update and controlled storage failure; verify retained record |
| F01-AC08 | Publication records who published which item and revision, when, and the outcome. Attendees cannot read private audit records. | Audit inspection and denied attendee audit request |
| F01-AC09 | The deployed application supports organiser creation and publication followed by attendee reading in separate sessions with synthetic data. | Delivery smoke check outside the development setup |

## Proposed contracts

Event: stable ID, timezone and organiser memberships. Room: stable ID, event ID and maximum capacity. Programme item: stable ID, event ID, title, start and end instants, room ID, capacity, price represented without floating-point rounding, currency, accessibility details, publication state and revision.

The server resolves event ownership through stored relationships, not a client-supplied role. Store unambiguous timestamps and display them in the event timezone. Capacity describes a programme limit, not remaining inventory or a reservation. Consumers receive current facts and revision; F05 later preserves immutable old/new change facts and cancellation state rather than deleting referenced items (RD04). All field types, state transitions and error responses need a shared contract review before implementation.

## Blocking decisions

- D02: Choose identity and deployment providers. The assignment constraints, shared repository and checkout, Python/FastAPI, TypeScript/React, and PostgreSQL planning baseline are confirmed.
- D04 and D05: Assign reviewers and choose organiser provisioning and event membership.
- Decide whether published browsing requires attendee login or permits guests; draft privacy applies in both cases.
- Define minimum accessibility fields, supported currency, maximum field lengths and accessible UI checks.
- Define edits after publication and concurrency behavior. Recommended first slice: published items are immutable; later changes belong to F05. Approval pending.

## Tasks

- [ ] Resolve blockers, map the rubric and record approval.
- [ ] Inspect repository and agree on identity, entity, timestamp and error contracts.
- [ ] Independently design/review acceptance and security tests, then record protected paths, approved baseline and commands before application implementation.
- [ ] Implement organiser venue, room, and draft-item creation with server validation and permission checks.
- [ ] Implement publication and its audit record atomically.
- [ ] Implement published catalogue, title search, type/date filters, and detail view.
- [ ] Verify success, rejection, boundaries, failures, restart and delivery.
- [ ] Obtain independent permission and persistence review; investigate findings.
- [ ] Update evidence, inspect the diff and prepare the team's agreed delivery artifact.

## Evidence and handoff

Implementation revision: None
Specification revision tested: None
Reviews actually performed: Independent attendee, organiser and business documentation review plus coordinating review, 2026-10-15, of the pre-update pack. Revision 3 has document consistency/link checks only; no implementation review or new independent review of these edits.

All F01-AC01 through F01-AC09 remain not verified. The planned checks above are not test results. Replace this statement with criterion-specific evidence when implementation begins.

## Change history

| Revision | Date | Change and approval |
| --- | --- | --- |
| 1 | 2026-10-14 | First journey drafted from the product idea; approval pending |
| 2 | 2026-10-15 | Aligned dependencies and review record with accepted RD01–RD07; detailed F01 approval and implementation still pending |
| 3 | 2026-10-15 | Aligned the draft criteria with the canonical venue/room creation and type/date filtering stories; approval remains pending |
| 4 | 2026-10-17 | Allow concurrent same-room activities under the user's clarified rule; preserve criterion IDs and draft status, with task-based coordination and pre-implementation test gates |
