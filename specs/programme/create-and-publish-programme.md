# Create and publish an event programme

| Field | Value |
| --- | --- |
| Stable capability ID | create-and-publish-programme |
| Covered stories | [F01-US01, F01-US02, F01-US03, F04-US03](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 6 / In progress; successor path of `specs/F01-published-programme.md` revision 4 |
| Product roles / roadmap | Organiser and attendee; [phase 1](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Dylan approved exact written revision 6, including API shapes, validation bounds and pagination/filter rules, by replying “yes” on 2026-10-20; see linked run/session records |
| Review / run record | [Reviews, protected baseline and implementation handoffs](../../workflow/agents/runs/2026-10-20-organiser-programme.md) |

Follow the [specification standard](../README.md). Sources: current catalogue and roadmap, accepted RD01–RD07, [security rules](../../docs/security.md), [architecture](../../docs/architecture.md) updated 2026-10-19, [access revision 3](../shared/access-authorised-workspaces.md), legacy F01 revision 4 and Dylan's 2026-10-20 programme implementation plan. Dylan subsequently approved the exact written revision 6, including its wire shapes and bounds. No implementation or verification is claimed by that approval.

## Product outcome, users and scope

An authorised organiser prepares event venues, rooms and programme items, validates each item, then explicitly publishes a revision. An attendee can browse published events and current item details. The programme supplies authoritative facts to later planning and change capabilities. Venue booking, reservations, ticket sales, recommendations, personal itineraries and post-publication changes are outside this boundary. Same-room concurrency, including booths, is permitted; item capacity is a declared per-item limit, not available inventory or aggregate room occupancy.

This is a manual organiser-to-attendee journey and data source for later role AI. It requires the shared SDD, protected-test, security and online-environment gates in [project context](../../docs/project.md#mandatory-completion-gates); it does not itself satisfy every-role LLM coverage.

This delivery slice includes the organiser UI and attendee read API, not attendee browsing screens. F01-US03's full UI and deployed journey remain the attendee teammate's integration responsibility. Dylan owns the organiser implementation task; this does not reassign other teammates' stories. Event creation remains the existing trusted CLI. Application review, AI, notifications, ticketing and published-item edits/cancellation are excluded.

## Use cases and user interface

Organisers select a permitted event, manage its venues/rooms, save complete drafts, inspect validation and confirm publication. The current revision is visible; stale requests require reload/review, never a false success. Published items are read-only. Permitted deletion requires confirmation. The existing organiser home enables Programme Management; other unimplemented cards remain previews. Loading, empty, server failure and field errors are distinct. Preserve current light/dark modes and font sizing, labelled controls, keyboard operation and visible focus.

Times display and edit in the selected event's IANA timezone, not the browser's implicit timezone. Nonexistent or ambiguous local times require correction or an explicit offset choice before submission. Attendee consumers can browse published events/items, search titles, filter type/date and inspect details; private drafts and audit records remain absent.

## Inputs, outputs and functional contract

### Approved request and response shapes

All bodies are JSON with camelCase keys; IDs are UUID strings and output instants are UTC ISO 8601 strings. Input instants require an explicit offset. Unknown body keys are rejected. The server owns IDs, state, timestamps, event scope and revision; clients cannot set them except the explicit references below.

| Shape | Fields and bounds |
| --- | --- |
| EventSummary | `id`, `title`, `timezone`, `startsAt`, `endsAt`, `revision`; read-only existing event facts |
| VenueFields | Required trimmed `name` (1–200 characters), `address` (1–500); optional `accessibilityDetails` (null or text up to 2000) |
| RoomFields | Required trimmed `name` (1–200), integer `maxCapacity` (1–2147483647); optional `accessibilityDetails` |
| ItemFields | Required `roomId`, trimmed `title` (1–200), `type`, `startsAt`, `endsAt`, integer `capacity` (1–2147483647), integer `priceMinorUnits` (0–2147483647), `currency` exactly `SGD`; optional `accessibilityDetails` |
| Venue | VenueFields plus `id`, `eventId`, `revision`, `createdAt`, `updatedAt` |
| Room | RoomFields plus `id`, `eventId`, `venueId`, `revision`, `createdAt`, `updatedAt` |
| ProgrammeItem | ItemFields plus `id`, `eventId`, `state` (`draft` or `published`), `revision`, `createdAt`, `updatedAt`, nullable `publishedAt` |

`type` is exactly `talk`, `workshop`, `panel`, `booth`, `performance` or `other`. Booleans and fractional JSON numbers are not valid integers. Blank accessibility text normalizes to null; null means unknown, never accessible. All free text is plain text, not executable HTML. Draft saves require complete valid fields. The server resolves event/room/venue relationships and current actor authority.

Create starts at revision 1. PATCH is a complete replacement of the editable field set, plus required positive integer `expectedRevision`; omitted optional accessibility details clear to null. A successful update increments revision by one, including a same-value replacement. DELETE bodies contain only `expectedRevision`. Validation and publication bodies contain only `expectedRevision`. Missing or invalid expectedRevision returns `422`. Revision/state checks occur at mutation time.

Successful writes return stable IDs, current revision/state and stored facts. Publication makes one validated item revision visible to attendees, and creates attributable audit evidence. `PublishedProgramme v1` supplies event/item IDs, state, revision, times, room, price/currency, capacity and accessibility evidence to authorised consumers. Event timezone makes display unambiguous. Drafts never enter public list/search/detail results. A published item referenced by later plans remains identifiable; [programme changes](change-published-activities.md) owns revisions/cancellation after publication.

Publication increments the item's revision once and returns that published ProgrammeItem. Its snapshot freezes all published facts, including event title/timezone/dates and venue/room facts. `PublishedProgramme v1` is `{id,eventId,revision,state:"published",title,type,startsAt,endsAt,capacity,priceMinorUnits,currency,accessibilityDetails,publishedAt,event:{id,title,timezone,startsAt,endsAt},venue:{id,name,address,accessibilityDetails},room:{id,name,maxCapacity,accessibilityDetails}}`. Actor/audit data is excluded. No standalone event-publication switch exists: an event is attendee-visible iff it has a published item; its EventSummary is returned. This slice cannot revise published facts.

## Constraints, security and non-functional requirements

[SEC01, SEC02, SEC11 and SEC12](../../docs/security.md) govern permissions, visibility, audit and environment separation. Room and item must belong to the same event; end must follow start; item capacity must not exceed its room maximum. Another item in the same room and time is not a rejection reason. Rejected, stale and failed writes preserve prior stored facts and publication state; a publish outcome and audit record must agree. Persistent facts must survive the relevant restart/storage lifecycle. No latency target is approved yet.

Item start/end must lie inclusively within event bounds (`event.startsAt <= startsAt < endsAt <= event.endsAt`). Reducing room capacity below any referencing draft capacity is rejected. A venue or room referenced by a published item cannot be edited. Delete is allowed only for drafts and unused rooms/venues: a room referenced by any item, or a venue containing any room, cannot be deleted. Parent reassignment and cross-event moves are excluded. Published items cannot be edited, deleted or republished.

Concurrent publication, item writes and parent edits/deletions must have an outcome consistent with a serial order: no successful publication may commit invalid capacity/relationships or mutable published location facts. Two publications of one draft produce exactly one snapshot and success audit; the loser receives `409`. Publication snapshot, state transition and attributable success audit commit together; storage failure rolls them all back. Rejected attempts must never create a publication-success record. Minimal denied/failed/retried action audit evidence may be recorded separately without modifying domain facts or storing request text/secrets.

Every protected request rechecks current membership and mandatory password replacement through existing identity dependencies. Mutations require the configured trusted Origin, including DELETE and validation POST. Existing cookie semantics apply unchanged. No submitted actor/role/event-membership fields grant authority. Additive migrations preserve existing users, credentials, sessions, events, memberships and authentication audit records; do not recreate the event store.

## Acceptance criteria and story traceability

Legacy IDs are retained exactly; the revisions below clarify scope without implying revision 4 approval.

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| F01-AC01 | Given organiser authority for event A, creation of its venue/room and an item draft returns their stored event-scoped IDs, fields and draft state. | F01-US01; SEC01 | UI and direct read of fresh synthetic records |
| F01-AC02 | Unauthenticated users, attendees and organisers assigned only to B cannot create, edit or publish A's records; denial leaves domain state unchanged. | F01-US01/02; SEC01 | Direct server reads/writes across identities; before/after comparison |
| F01-AC03 | Missing fields, invalid enum/currency, out-of-bounds fields, noninteger/nonpositive capacity, negative price, end at/before start, times outside event bounds, excess room capacity and wrong-event references are rejected without partial writes. Same-room overlap alone is accepted; optional accessibility remains unknown when absent. | F01-US01/02, F04-US03 | Boundary, event timezone and cross-event cases |
| F01-AC04 | An authorised organiser explicitly publishes a valid draft revision, even with a concurrent same-room item; attendee detail displays the exact published title, times, room, type, price, currency, capacity and accessibility details. | F01-US02/03, F04-US03 | Publish and compare stored versus attendee facts |
| F01-AC05 | Event/item browse, title search and type/date filters yield only matching published facts for the event; draft IDs fail direct attendee detail access. | F01-US03; SEC02 | Mixed draft/published events and items |
| F01-AC06 | Fresh programme records and publication state remain retrievable through the intended interface after application and relevant storage restart. | F01-US01/02 | Lifecycle persistence check |
| F01-AC07 | Invalid/stale updates, deletes/publications or storage failure leave previous facts and publication state intact. Published items reject edit/delete/republication; published locations reject edits; referenced locations reject deletion and invalid capacity reductions fail. Concurrent parent changes/publication cannot bypass these guarantees. | F01-US01/02, F04-US03 | Expected-revision, safe deletion, competing writes and controlled transaction failure |
| F01-AC08 | Publication has an attributable actor, item/revision, time and outcome audit record; attendee audit reads are denied. | F01-US02; SEC11 | Audit inspection and denied direct read |
| F01-AC09 | In an online environment, separate organiser and attendee sessions can create/publish and then browse newly stored synthetic facts. | F01-US01–03; SEC12 | Deployed journey; environment separation checked separately |
| create-and-publish-programme-AC10 | Given a draft and expected revision, validation reports current validity and field findings without changing it. Publication independently revalidates and refuses missing/invalid required fields, relationships, event bounds and per-item capacity; no aggregate occupancy restriction is applied. UI displays findings and requires explicit publication confirmation. | F04-US03 | Validation response, changed-parent and publish boundary |

## External interfaces and dependencies

Depends on `CurrentActor v1` in access revision 3 and produces the above approved `PublishedProgramme v1`. Later planning/change/notification consumers retain item IDs/revisions. Physical storage remains an architecture concern; regenerate reviewed OpenAPI and committed TypeScript types together rather than hand-maintaining consumer DTOs.

### Approved HTTP contract

All paths begin `/api/v1`. Let `O=/organiser/events/{event_id}` and `A=/attendee/events/{event_id}`. Resource IDs are UUID path parameters; IDs and parent references must resolve within that event.

| Method / path | Request and success |
| --- | --- |
| GET `/organiser/events` | Permitted events, ordered `startsAt,id`, paginated |
| GET / POST `O/venues` | Paginated Venue list / VenueFields -> `201` Venue |
| PATCH / DELETE `O/venues/{venue_id}` | VenueFields + expectedRevision -> `200` Venue / expectedRevision -> `204` |
| POST `O/venues/{venue_id}/rooms` | RoomFields -> `201` Room |
| GET `O/rooms` | Paginated Room list, optional `venueId` filter |
| PATCH / DELETE `O/rooms/{room_id}` | RoomFields + expectedRevision -> `200` Room / expectedRevision -> `204` |
| GET / POST `O/programme-items` | Paginated ProgrammeItem list / ItemFields -> `201` ProgrammeItem |
| GET / PATCH / DELETE `O/programme-items/{item_id}` | `200` ProgrammeItem / ItemFields + expectedRevision -> `200` ProgrammeItem / expectedRevision -> `204` |
| POST `O/programme-items/{item_id}/validate` | expectedRevision -> `200` `{itemId,revision,valid,errors}`; errors is field-to-message-array map; no write |
| POST `O/programme-items/{item_id}/publish` | expectedRevision -> `200` published ProgrammeItem |
| GET `O/programme-items/{item_id}/publication` | `200` `{itemId,revision,actorUserId,action:"programme_publish",occurredAt,outcome:"success"}`; `404` if unpublished |
| GET `/attendee/events` | Visible EventSummary list, ordered `startsAt,id`, paginated |
| GET `A/programme` | Paginated PublishedProgramme list; optional `q`, `type`, `date` |
| GET `A/programme/{item_id}` | `200` PublishedProgramme; drafts/absent items `404` |

GET list responses are `{items,total,limit,offset}` with limit default 50, range 1–100; offset default 0, range 0–2147483647. Venue/room ordering is name then ID; item ordering is startsAt then ID. Filters precede pagination; total is the matching count. `q` is trimmed literal case-insensitive title substring, up to 200 characters (empty means no filter; `%` and `_` are not wildcard operators). `type` uses the item enum; `date` is valid `YYYY-MM-DD` and matches the item's start date in the published event timezone, including cross-midnight items only on their start date. Filters combine with AND. Attendee event-scoped reads conceal events without published items with `404`. Organiser item list optionally accepts `state=draft|published`; omission returns both.

The publication endpoint above is the only new audit-read surface, organiser/event-scoped; there is no general audit browser. Attendees and business accounts receive `403` for organiser endpoints. Authenticated organisers outside the event receive `403`; an authorised event member receives `404` for absent or cross-event resource IDs. Unauthenticated sessions receive `401`; mandatory replacement retains the existing password-change denial. Structured problems retain `{type,title,status,detail,instance,code}`; programme input failures add `errors` (field -> array of safe messages). Use `422` for malformed/invalid fields, `409` for stale revision or forbidden lifecycle/reference/capacity changes, and `503` for database unavailability. Do not echo SQL, raw bodies or secrets. A stale validation request returns `409`, not stale findings. Existing authentication response bodies remain unchanged.

## Decisions and approval

| Decision | Options / proposed direction | Owner | Blocks | Resolution |
| --- | --- | --- | --- | --- |
| P-01 | Existing one-role cookie identity, trusted CLI events/organisers, signed-in attendee browsing | Dylan / access contract owners | No new identity decision | Reuse access revision 3; no public guests or organiser registration |
| P-02 | Complete drafts, optional unknown accessibility, SGD integer cents, six item types, event bounds, overlap allowed | Dylan | Resolved | Exact written revision 6 approved by Dylan on 2026-10-20 |
| P-03 | Published read-only/parent locks, safe deletion, expected revisions, atomic snapshot/audit | Dylan / affected contract owners | Resolved for selected slice | Exact written revision 6 approved by Dylan on 2026-10-20 |
| P-04 | Hosting, persistence and development/production separation | Delivery human owner | Online verification | Pending |
| P-05 | Bounds, DTOs, event visibility, pagination/filter semantics, publication audit read and same-value revision increment | Dylan / attendee contract owner | Resolved for selected slice | Exact written revision 6 approved by Dylan on 2026-10-20; attendee consumer integration remains a separate handoff |

## Verification and evidence

Exact written revision 6 is human-approved. Executable test adequacy review, baseline and implementation snapshot are separate gates under the [agent workflow](../../workflow/agents/README.md). All revision-6 criteria remain unverified. AC06 requires lifecycle evidence; AC09 and attendee UI completion remain deferred to integration/deployment, not counted as passing. Legacy reviews apply only to their original revisions. Revision 6 was drafted by the delegated analyst, with independent planned-scenario analysis and behaviour/security Draft reviews finding no blocking written contradiction. See the linked run record for test design, reviews, baseline and implementation evidence as work proceeds. Human teammate review and session-summary correctness verification remain pending.

## Revision history

| Revision / date | Change and ID mapping | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-14 | Initial F01 draft | Approval pending |
| 2 / 2026-10-15 | Aligned accepted RD decisions | Approval pending |
| 3 / 2026-10-15 | Added venue/room and filter scope | Approval pending |
| 4 / 2026-10-17 | Accepted same-room concurrency clarification; F01-AC01–09 retained | Draft; historical documentation review only |
| 5 / 2026-10-18 | Moved F01 aggregate into approved programme category; made F04-US03 validation boundary explicit with new AC10; retained F01-AC01–09; removed task plan | Human approval and independent review of revision 5 pending |
| 6 / 2026-10-20 | Refined selected first organiser slice and attendee read API; complete drafts, SGD/types/accessibility, event bounds, safe deletion/read-only publication, revisions, concurrency and explicit HTTP/DTO/filter contracts; all AC IDs retained | Initially Draft; exact written revision subsequently approved by Dylan. Baseline/implementation evidence tracked separately; earlier evidence does not verify revision 6 |
