# Create and publish an event programme

| Field | Value |
| --- | --- |
| Stable capability ID | create-and-publish-programme |
| Covered stories | [F01-US01, F01-US02, F01-US03, F04-US03](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 5 / Draft; successor path of `specs/F01-published-programme.md` revision 4 |
| Product roles / roadmap | Organiser and attendee; [phase 1](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of revision 5 and interface contracts |
| Review / run record | Pending independent draft review and task record |

Follow the [specification standard](../README.md). This draft uses the catalogue, project decisions RD01–RD07, [security rules](../../docs/security.md), [architecture design draft](../../docs/architecture.md) (updated 2026-10-17), and the legacy F01 draft revision 4. Proposed physical schema details are not approved product rules.

## Product outcome, users and scope

An authorised organiser prepares event venues, rooms and programme items, validates each item, then explicitly publishes a revision. An attendee can browse published events and current item details. The programme supplies authoritative facts to later planning and change capabilities. Venue booking, reservations, ticket sales, recommendations, personal itineraries and post-publication changes are outside this boundary. Same-room concurrency, including booths, is permitted; item capacity is a declared per-item limit, not available inventory or aggregate room occupancy.

This is a manual organiser-to-attendee journey and data source for later role AI. It requires the shared SDD, protected-test, security and online-environment gates in [project context](../../docs/project.md#mandatory-completion-gates); it does not itself satisfy every-role LLM coverage.

## Use cases and user interface

Organisers can enter and review a venue, room and draft item; see field-level validation; and explicitly publish a valid revision with a visible outcome. The editor shows current revision and prevents a stale publish from masquerading as success. Attendees can browse published events/items, search item titles, filter by type/date and inspect detail. An empty result is distinguishable from a failed load. Private drafts and audit records remain absent from attendee views. Times display in the event timezone; controls and errors need accessible labels, keyboard operation and visible focus.

## Inputs, outputs and functional contract

Venue input includes event reference, name, address and accessibility details; room input includes parent venue, name, positive maximum capacity and accessibility details. Item input includes event, room, title, type, start/end instants, positive integer capacity, nonnegative price in currency minor units, currency, accessibility details, state and expected revision on updates/publication. Required versus optional accessibility fields, field lengths, supported currencies and item-type vocabulary remain decisions. The server resolves event/room/venue relationships and current actor permissions rather than trusting client claims.

Successful writes return stable IDs, current revision/state and stored facts. Publication makes one validated item revision visible to attendees, and creates attributable audit evidence. `PublishedProgramme v1` supplies event/item IDs, state, revision, times, room, price/currency, capacity and accessibility evidence to authorised consumers. Event timezone makes display unambiguous. Drafts never enter public list/search/detail results. A published item referenced by later plans remains identifiable; [programme changes](change-published-activities.md) owns revisions/cancellation after publication.

## Constraints, security and non-functional requirements

[SEC01, SEC02, SEC11 and SEC12](../../docs/security.md) govern permissions, visibility, audit and environment separation. Room and item must belong to the same event; end must follow start; item capacity must not exceed its room maximum. Another item in the same room and time is not a rejection reason. Rejected, stale and failed writes preserve prior stored facts and publication state; a publish outcome and audit record must agree. Persistent facts must survive the relevant restart/storage lifecycle. No latency target is approved yet.

## Acceptance criteria and story traceability

Legacy IDs are retained exactly; the revisions below clarify scope without implying revision 4 approval.

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| F01-AC01 | Given organiser authority for event A, creation of its venue/room and an item draft returns their stored event-scoped IDs, fields and draft state. | F01-US01; SEC01 | UI and direct read of fresh synthetic records |
| F01-AC02 | Unauthenticated users, attendees and organisers assigned only to B cannot create, edit or publish A's records; denial leaves domain state unchanged. | F01-US01/02; SEC01 | Direct server reads/writes across identities; before/after comparison |
| F01-AC03 | Missing required fields, end at/before start, negative price, noninteger/nonpositive item capacity, excess over room maximum and wrong-event room/venue are rejected without partial writes. Same-room overlap alone is accepted. | F01-US01/02, F04-US03 | Boundary and cross-event references; concurrent room case |
| F01-AC04 | An authorised organiser explicitly publishes a valid draft revision, even with a concurrent same-room item; attendee detail displays the exact published title, times, room, type, price, currency, capacity and accessibility details. | F01-US02/03, F04-US03 | Publish and compare stored versus attendee facts |
| F01-AC05 | Event/item browse, title search and type/date filters yield only matching published facts for the event; draft IDs fail direct attendee detail access. | F01-US03; SEC02 | Mixed draft/published events and items |
| F01-AC06 | Fresh programme records and publication state remain retrievable through the intended interface after application and relevant storage restart. | F01-US01/02 | Lifecycle persistence check |
| F01-AC07 | Invalid/stale update or storage failure yields an actionable error and leaves the previous item and publication state intact. | F01-US02, F04-US03 | Expected-revision and controlled failure checks |
| F01-AC08 | Publication has an attributable actor, item/revision, time and outcome audit record; attendee audit reads are denied. | F01-US02; SEC11 | Audit inspection and denied direct read |
| F01-AC09 | In an online environment, separate organiser and attendee sessions can create/publish and then browse newly stored synthetic facts. | F01-US01–03; SEC12 | Deployed journey; environment separation checked separately |
| create-and-publish-programme-AC10 | Given an item draft with current validation findings, publication is refused until all required field, relationship and per-item capacity checks pass, while no room-wide occupancy restriction is applied. | F04-US03 | Item validation response and publish boundary |

## External interfaces and dependencies

Depends on `CurrentActor v1` and produces `PublishedProgramme v1` as described in [architecture](../../docs/architecture.md#contracts-for-independent-development). Interface error semantics need distinction among unauthenticated, forbidden, invalid, absent and revision conflict. Consumers must receive current authoritative revision; API path and physical schema names are implementation choices. [Workspace access](../shared/access-authorised-workspaces.md) defines actor scope. Later change, planning and notification contracts consume published IDs and revisions. Compatibility/migration evidence is required once real data exists.

## Decisions and approval

| Decision | Options / proposed direction | Owner | Blocks | Resolution |
| --- | --- | --- | --- | --- |
| P-01 | Identity/provisioning and guest versus signed-in published browsing | Product/security human owner | Ready and visibility contract | Pending |
| P-02 | Accessibility field minimum, supported currencies/item types, field bounds and accessible UI checks | Product human owner | Ready and validation tests | Pending |
| P-03 | Exact event visibility, post-publication edit boundary, API errors and stale revision semantics | Product/contract human owners | Ready and consumer contract | Pending |
| P-04 | Hosting, persistence and development/production separation | Delivery human owner | Online verification | Pending |

## Verification and evidence

Independent test design/review, baseline, task/run record and implementation snapshot are pending under the [agent workflow](../../workflow/agents/README.md). All criteria are unverified. AC06 and AC09 require later lifecycle and deployed checks; no local validator can substitute for them. Legacy revision-4 documentation review applied to that revision only; revision 5 has no independent review yet. Human teammate review and session-summary correctness verification remain pending.

## Revision history

| Revision / date | Change and ID mapping | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-14 | Initial F01 draft | Approval pending |
| 2 / 2026-10-15 | Aligned accepted RD decisions | Approval pending |
| 3 / 2026-10-15 | Added venue/room and filter scope | Approval pending |
| 4 / 2026-10-17 | Accepted same-room concurrency clarification; F01-AC01–09 retained | Draft; historical documentation review only |
| 5 / 2026-10-18 | Moved F01 aggregate into approved programme category; made F04-US03 validation boundary explicit with new AC10; retained F01-AC01–09; removed task plan | Human approval and independent review of revision 5 pending |
