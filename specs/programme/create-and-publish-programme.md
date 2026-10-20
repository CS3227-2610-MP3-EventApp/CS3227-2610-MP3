# Create and publish an event programme

| Field | Value |
| --- | --- |
| Stable capability ID | create-and-publish-programme |
| Covered stories | [F01-US01, F01-US02, F01-US03, F04-US03](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 8 / Draft; successor path of `specs/F01-published-programme.md` revision 4 |
| Product roles / roadmap | Organiser and attendee; [phase 1](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Yik Bing approved the revision-7 attendee read-contract proposal, attendee scope and fixture-backed frontend progression on 2026-10-20; revision 8 records that approval without changing the read contract. Full shared capability and producer-contributor agreement remain pending. |
| Review / run record | See [browsing preparation session](../../logs/yikbing/2026-10-20-programme-browsing-preparation.md) for actual handoffs and bounded task record |

Follow the [specification standard](../README.md). This draft uses the catalogue, project decisions RD01–RD07, [security rules](../../docs/security.md), [architecture design draft](../../docs/architecture.md) (updated 2026-10-19), and the legacy F01 draft revision 4. Proposed physical schema details are not approved product rules.

## Product outcome, users and scope

An authorised organiser prepares event venues, rooms and programme items, validates each item, then explicitly publishes a revision. A signed-in attendee can browse visible events and current published item details. An event is visible to attendees only when it contains at least one published item. Organiser and business accounts do not use this attendee browsing journey (P-05/P-07). The programme supplies authoritative facts to later planning and change capabilities. Venue booking, reservations, ticket sales, recommendations, personal itineraries and post-publication changes are outside this boundary. Same-room concurrency, including booths, is permitted; item capacity is a declared per-item limit, not available inventory or aggregate room occupancy.

This is a manual organiser-to-attendee journey and data source for later role AI. It requires the shared SDD, protected-test, security and online-environment gates in [project context](../../docs/project.md#mandatory-completion-gates); it does not itself satisfy every-role LLM coverage.

## Use cases and user interface

Organisers can enter and review a venue, room and draft item; see field-level validation; and explicitly publish a valid revision with a visible outcome. The editor shows current revision and prevents a stale publish from masquerading as success. Attendees can browse published events/items, search item titles, filter by type/date and inspect detail. An empty result is distinguishable from a failed load. Private drafts and audit records remain absent from attendee views. Times display in the event timezone; controls and errors need accessible labels, keyboard operation and visible focus.

## Inputs, outputs and functional contract

Venue input includes event reference, name, address and accessibility details; room input includes parent venue, name, positive maximum capacity and accessibility details. Item input includes event, room, title, type, start/end instants, positive integer capacity, nonnegative price in currency minor units, currency, accessibility details, state and expected revision on updates/publication. Required versus optional producer accessibility fields and write field lengths remain decisions. SGD-only pricing and five activity labels are requester-approved under P-09/P-10; producer compatibility and proposed lowercase wire tokens still require shared-contract review. The server resolves event/room/venue relationships and current actor permissions rather than trusting client claims.

Successful writes return stable IDs, current revision/state and stored facts. Publication makes one validated item revision visible to attendees, and creates attributable audit evidence. `PublishedProgramme v1` supplies event/item IDs, state, revision, times, room, price/currency, capacity and accessibility evidence to authorised consumers. Event timezone makes display unambiguous. Drafts never enter attendee list/search/detail results. A published item referenced by later plans remains identifiable; [programme changes](change-published-activities.md) owns revisions/cancellation after publication.

### Attendee browsing contract refinement (revisions 6–7)

Accepted on 2026-10-20 by Yik Bing for this task: only attendee accounts use this browsing journey; an event is discoverable only while it has at least one published activity; a date filter includes an activity on every event-local calendar date it overlaps. Attendees do not require organiser EventMembership. Every browse/search/detail request resolves current server identity; browser role state grants no permission. These decisions do not approve the complete programme contract or another role's write workflow.

Date membership uses the activity interval `[startsAt, endsAt)` against the selected event-local calendar day: an activity ending exactly at midnight does not overlap the following day. Compute day boundaries in the event's IANA timezone; do not assume every local day lasts 24 hours. UTC offset-aware instants remain authoritative for storage and transport; display uses event timezone.

The following wire details are **proposed for affected-contributor review**, not adopted policy or implementation evidence:

- Reads under `/api/v1/programme`: `GET /events`, `GET /events/{eventId}/items`, `GET /events/{eventId}/items/{itemId}`. JSON camelCase; generated OpenAPI types; cookie identity and structured problems reuse shared conventions.
- Event summary: `id,title,timezone,startsAt,endsAt,revision`. Published item summary/detail: `id,eventId,eventTimezone,title,type,startsAt,endsAt,revision,state,room,priceMinorUnits,currency,capacity,accessibilityDetails`; nested room/venue contain only agreed published display fields and stable IDs. Exact nested shapes, nullable accessibility semantics and remaining producer field bounds and exact contract agreement remain P-02/P-08 blockers. No membership/contact/credential/creator/internal validation/audit/private business fields are returned.
- Item queries: optional trimmed title `q` (maximum 200 characters; blank means no title restriction), literal case-insensitive substring (not wildcard syntax); exact `type`; `date` as `YYYY-MM-DD`. Combine filters with AND inside the requested event; malformed/unknown type/query gives 422. Initial vocabulary is recorded in P-09; exact comparison is proposed below for P-08 approval.
- Proposed bounded pagination: `limit` default 20, range 1–100; nonnegative `offset` default 0; `{items,limit,offset,hasMore}` with no totals/facets in this slice. Apply visibility and filters before pagination. Events order by start instant then UUID; items by start instant then UUID. Stable ordering applies to a static dataset; pages are fresh reads and do not promise a cross-request snapshot under concurrent publication. Event-list filtering beyond visibility is excluded from this proposal.
- Missing/invalid/expired/revoked session: shared 401 `unauthenticated`; wrong role: 403 `forbidden`; mandatory password change uses shared guard semantics. Hidden/unknown event, draft/unknown item and mismatched event/item pair share 404 `not_found` without resource facts. Invalid input: 422 `validation_error`; storage unavailable: 503 `service_unavailable`. Safe structured errors and `Cache-Control: no-store` apply to successful and failed browsing reads. Exact problem details require P-08 agreement.
- UI exposes loading, empty/no-match, failed-load/retry, forbidden and unavailable-detail states distinctly. Event/filter changes cannot be overwritten by a late response for an older selection. Clear protected programme content on logout, account change or 401 and suppress in-flight responses from the prior identity. Preserve valid filters on retry; do not display a failed request as a successful empty result. No latency budget is implied.

### Proposed PublishedProgramme v1 read contract (revision 7)

This section defines the revision-7 read-contract proposal, accepted by Yik Bing for the attendee consumer on 2026-10-20. It is not full shared-capability approval. P-09/P-10 below record Yik Bing's separate vocabulary/currency decisions. The programme contributor must agree producer compatibility and ownership before dependent development. These browse response shapes do not finalize organiser write inputs. Future cancellation/change readers retain RD04; this initial `state:published` projection must not be used to hide references in accepted plans when the later change capability is integrated.

#### Routes and representations

| Method / path (prefix `/api/v1/programme`) | Query keys | 200 response |
| --- | --- | --- |
| GET `/events` | `limit,offset` | EventPage |
| GET `/events/{eventId}/items` | `q,type,date,limit,offset` | ItemPage |
| GET `/events/{eventId}/items/{itemId}` | None | PublishedItem |

Every object has exactly the properties listed below; all properties are required, with null permitted only where explicitly stated. No arbitrary ORM fields, HTML, memberships, personal contact details, private notes or audit data. Text renders as plain text, never interpreted markup. UUIDs use canonical lowercase hyphenated strings; revisions/capacity/price/offsets are JSON integers, not strings. Timestamps serialize in UTC ISO 8601 with `Z`; event timezone is the authoritative IANA display/date-filter zone. Detail and item-list entries use the same PublishedItem shape. EventPage and ItemPage contain exactly `{items,limit,offset,hasMore}`; items is the route-specific array, limit/offset echo validated effective values, hasMore is boolean. An empty or beyond-last page returns 200 with `items:[]` and `hasMore:false`.

| Representation | Exact properties and proposed constraints |
| --- | --- |
| EventSummary | `id:UUID,title:string(1–200),timezone:IANA string(1–100),startsAt:UTC timestamp,endsAt:UTC timestamp,revision:integer(1–2147483647)`; end follows start |
| PublishedItem | `id:UUID,eventId:UUID,eventTimezone:IANA string(1–100),title:string(1–200),type:ActivityType,startsAt:UTC timestamp,endsAt:UTC timestamp,revision:integer(1–2147483647),state:"published",room:Room,priceMinorUnits:integer(0–9007199254740991),currency:"SGD",capacity:integer(1–2147483647),accessibilityDetails:string(1–2000) or null`; end follows start; declared capacity is not ticket inventory |
| Room | `id:UUID,name:string(1–200),accessibilityDetails:string(1–2000) or null,venue:Venue` |
| Venue | `id:UUID,name:string(1–200),address:string(1–500),accessibilityDetails:string(1–2000) or null` |
| ActivityType | Exactly `talk,workshop,booth,performance,other`; labels Talk, Workshop, Booth, Performance, Other |

Text lengths count Unicode code points. Producer display fields are trimmed and nonempty; no empty-string accessibility sentinel. Null accessibility means unknown, displayed as “Accessibility information not provided”; descriptive text is evidence, not a guarantee of suitability. Preserve room, venue and activity accessibility separately. Producer compatibility with proposed bounds remains P-02/P-08; do not silently truncate legacy data. SGD has 100 minor units per displayed dollar for this contract: `0` is “Free”, `1250` is “SGD 12.50”; totals/conversion/payment are outside scope.

#### Query and consistency rules

- Authentication and role/password gate precede request syntax checks and resource lookup. Authorized syntactically valid requests then apply event/item visibility. Storage failure may produce 503 while resolving identity or data; do not fabricate an authorization or absence result when storage cannot be read.
- Unknown or repeated query keys, including identical duplicates, return 422. Blank values fail except `q`; detail accepts no query keys. Path IDs must be syntactically UUID strings (case-insensitive input, canonical output); malformed IDs return 422 after identity/role checks. Valid but hidden/unknown IDs or mismatched event/item pair return the same 404 problem.
- Query integer grammar is one or more ASCII digits, with no sign, whitespace, fraction or exponent. `limit` default 20, range 1–100; `offset` default 0, range 0–2147483647; leading zeros are allowed and echoed as numeric values. Reject overflow before programme/resource database work, after the identity/role/password gate.
- `q` is Unicode-whitespace trimmed, at most 200 code points after trimming; empty means no search. Match a literal substring of the title after applying locale-independent Unicode casefold to both strings. No wildcard, accent removal or additional Unicode normalization: `STRASSE` matches `Straße`; composed and decomposed accents need not match. `%`, `_`, quotes and backslashes are literal text. Matching does not search descriptions, room names or event titles. Casefold may expand characters; the input bound applies before folding. The Unicode casefold data version must be pinned in the later test baseline/runtime contract so upgrades cannot silently change matching.
- `type` is an exact lowercase ActivityType token; an unknown token returns generic 422 without listing private data. `date` is a valid zero-padded Gregorian `YYYY-MM-DD` in years 0001–9998; invalid/boundary-overflow input returns generic 422. Event-local midnight conversion must preserve the accepted half-open overlap rule; an unrepresentable day boundary returns safe 422 rather than 500. No date-range input in this slice.
- Combine item filters with AND; scope to selected visible event. Sort by start instant ascending then canonical UUID string ascending. Both lists use the same sorting rule. Apply visibility/filtering before offset/limit and compute hasMore from permitted matching rows only. No totals, facets or separate type-lookup endpoint. Static records yield deterministic pages; concurrent publication can change later pages and provides no cross-request snapshot guarantee. Each individual response must derive visibility, projected published facts and hasMore from a consistent committed view; no mixture of unpublished and published revisions.

#### Error examples and safe response policy

Errors use `application/problem+json` with exactly `type,title,status,detail,instance,code`; `instance` is request path without query. Never include submitted values, credential/session material, database details, stack traces or hidden resource facts. All browse success/error responses carry `Cache-Control: no-store`. Ordinary framework 404/405 handling outside these three declared GET operations is not expanded by this contract.

| HTTP | code | Exact detail |
| --- | --- | --- |
| 401 | unauthenticated | Authentication required. |
| 403 | forbidden | Access is not permitted. |
| 403 | password_change_required | Password change required. |
| 404 | not_found | Resource not found. |
| 422 | validation_error | Request validation failed. |
| 500 | internal_error | Request could not be completed. |
| 503 | service_unavailable | Request could not be completed. |

`type` is `about:blank`; `title` is the HTTP reason phrase, e.g. `Not Found`. Example for a hidden or nonexistent item (synthetic path):

```json
{"type":"about:blank","title":"Not Found","status":404,"detail":"Resource not found.","instance":"/api/v1/programme/events/00000000-0000-4000-8000-000000000001/items/00000000-0000-4000-8000-000000000002","code":"not_found"}
```

Successful item-list example (all identifiers synthetic; the date filter `2026-10-21` includes this Singapore overnight activity):

```json
{"items":[{"id":"00000000-0000-4000-8000-000000000002","eventId":"00000000-0000-4000-8000-000000000001","eventTimezone":"Asia/Singapore","title":"Evening workshop","type":"workshop","startsAt":"2026-10-20T15:30:00Z","endsAt":"2026-10-20T17:00:00Z","revision":1,"state":"published","room":{"id":"00000000-0000-4000-8000-000000000003","name":"Room A","accessibilityDetails":null,"venue":{"id":"00000000-0000-4000-8000-000000000004","name":"Demo Hall","address":"1 Example Road","accessibilityDetails":"Step-free main entrance"}},"priceMinorUnits":1250,"currency":"SGD","capacity":30,"accessibilityDetails":null}],"limit":20,"offset":0,"hasMore":false}
```

`eventTimezone` equals the parent event's IANA timezone, so direct item URLs display and interpret dates correctly without scanning event-list pages. The example renders 23:30 on 20 October to 01:00 on 21 October in Asia/Singapore.

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
| create-and-publish-programme-AC11 | Every attendee browse/search/detail request resolves current server identity, permits only attendees, and requires no organiser membership; absent/invalid/revoked/expired sessions and forged browser role state cannot grant access. | F01-US03; P-01/P-07; SEC01/02 | Direct cookie/role matrix and next-request expiry/revocation; no protected payload |
| create-and-publish-programme-AC12 | Event lists include only events containing a published item. Hidden events/draft items remain absent from list, search, detail and any metadata; mismatched event/item IDs reveal no private facts. Exact absent-error equivalence follows P-08. | F01-US03; P-05; SEC02 | Mixed visible/draft-only/empty events, guessed IDs and raw response inspection |
| create-and-publish-programme-AC13 | A date-filtered item list includes each published activity overlapping the selected event-local day using half-open activity/day intervals, including overnight activity and excluding an activity ending at that day's start. | F01-US03; P-06 | UTC/local midnight, browser timezone mismatch, DST day boundaries |
| create-and-publish-programme-AC14 | Search/filter combinations, static ordering, pagination and safe summary/detail/error shapes follow the exact P-08 contract once agreed; no unpublished facts affect returned content or metadata. | F01-US03; SEC02 | Positive and negative title/type/date/page boundaries; safe field allowlist; pending wire approval |
| create-and-publish-programme-AC15 | Loading, empty and failed requests have distinguishable UI states; late responses cannot replace the selected event/filter or restore content after logout/account change/401. | F01-US03; SEC01/02 | Deferred-response and identity-change UI scenarios; keyboard/focus checks |
| create-and-publish-programme-AC16 | Successful, denied, invalid and failed browsing reads preserve programme facts, revisions and publication state and create no booking, bookmark or accepted itinerary; permitted session bookkeeping is excluded from this invariant. | F01-US03; SEC01/02 | Before/after database checks across read outcomes |
## External interfaces and dependencies

Depends on `CurrentActor v1` and produces `PublishedProgramme v1` as described in [architecture](../../docs/architecture.md#contracts-for-independent-development). Interface error semantics need distinction among unauthenticated, forbidden, invalid, absent and revision conflict. Consumers must receive current authoritative revision; API path and physical schema names are implementation choices. [Workspace access](../shared/access-authorised-workspaces.md) defines actor scope. Later change, planning and notification contracts consume published IDs and revisions. Compatibility/migration evidence is required once real data exists.

## Decisions and approval

| Decision | Options / proposed direction | Owner | Blocks | Resolution |
| --- | --- | --- | --- | --- |
| P-01 | Identity/provisioning and guest versus signed-in browsing | Shared identity/product owners | No longer blocks the sign-in direction; downstream integration still required | Resolved by access revision 3 / CurrentActor v1 A-03 and project D05: attendee browsing requires sign-in. Authentication capability remains In review; no programme integration is claimed. |
| P-02 | Accessibility input minimum, producer field bounds and accessible UI checks | Product/programme contributor | Ready and validation tests | Read projection proposed above; initial type/currency choices recorded in P-09/P-10; producer compatibility and write validation remain pending |
| P-03 | Post-publication edit boundary and stale revision semantics; read errors tracked in P-08 | Product/contract human owners | Ready and affected producer/consumer contract | Event visibility resolved by P-05; remaining edit/stale semantics pending and coordinated with programme changes |
| P-04 | Hosting, persistence and development/production separation | Delivery human owner | Online verification | Pending |
| P-05 | Event is attendee-visible iff it has at least one published activity; empty and draft-only events stay hidden | Yik Bing (attendee task); producer contributor to review shared contract | Exact producer/read contract still requires contributor agreement | Yik Bing approved 2026-10-20 in this chat; no event publication flag is invented |
| P-06 | Include an activity on every event-local date it overlaps; use half-open intervals | Yik Bing | Wire agreement and verification remain | Yik Bing approved overlap direction 2026-10-20; midnight/DST interpretation is explicit above for review |
| P-07 | This browsing journey permits attendee accounts only | Yik Bing; shared security/producer contributors review integration | Shared-contract review remains | Yik Bing approved 2026-10-20; does not alter organiser management/business permissions |
| P-08 | Proposed read paths, field projections, title/type/date queries, ordering/pages, no-store/errors and UI recovery above | Yik Bing and affected programme contributor (Dylan to confirm assignment) | Ready, executable assertions and consumer/producer integration | Revision-7 read contract accepted by Yik Bing 2026-10-20 ("this sounds alright", followed by explicit attendee scope/fixture-workflow confirmation and instruction to proceed). Contributor agreement, shared producer readiness and full capability approval remain pending; frontend acceptance tests against synthetic responses are authorized. |
| P-09 | Initial ActivityType values talk/workshop/booth/performance/other | Yik Bing; programme contributor reviews producer compatibility | Shared publication contract agreement | Yik Bing approved the five displayed types 2026-10-20; lowercase wire tokens specified for review |
| P-10 | Initial programme prices use SGD only; free price is zero | Yik Bing; programme contributor reviews producer compatibility | Shared publication contract agreement | Yik Bing approved 2026-10-20; no currency conversion/payments introduced |
## Verification and evidence

Independent test design/review, baseline, task/run record and implementation snapshot are pending under the [agent workflow](../../workflow/agents/README.md). All criteria are unverified. AC06 and AC09 require later lifecycle and deployed checks; no local validator can substitute for them. Legacy revision-4 documentation review applied to that revision only; revision 5 review does not approve later revisions. Revision-6 handoffs and revision-7 independent Draft/scenario reviews are separately recorded in the linked session; neither establishes full product/contract approval, executable test adequacy or runtime verification. Human teammate review and session-summary correctness verification remain pending.

## Revision history

| Revision / date | Change and ID mapping | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-14 | Initial F01 draft | Approval pending |
| 2 / 2026-10-15 | Aligned accepted RD decisions | Approval pending |
| 3 / 2026-10-15 | Added venue/room and filter scope | Approval pending |
| 4 / 2026-10-17 | Accepted same-room concurrency clarification; F01-AC01–09 retained | Draft; historical documentation review only |
| 5 / 2026-10-18 | Moved F01 aggregate into approved programme category; made F04-US03 validation boundary explicit with new AC10; retained F01-AC01–09; removed task plan | Human approval and independent review of revision 5 pending |
| 6 / 2026-10-20 | Refined F01-US03 with accepted sign-in reference and Yik Bing event visibility/date overlap/attendee-only choices; proposed browse wire contract; retained all old IDs and added AC11–16 | Draft; full human/contributor approval pending; planned scenarios only, no implementation/tests/baseline |
| 7 / 2026-10-20 | Made proposed P-08 read wire contract concrete with exact projections, bounds, Unicode search, query grammar, errors and synthetic examples; recorded P-09/P-10 requester choices; all AC IDs retained | Draft; exact contract and contributor approval pending; no implementation/tests/baseline |
| 8 / 2026-10-20 | Recorded Yik Bing acceptance of unchanged revision-7 attendee read contract and authorization to begin independent fixture-backed frontend test design | No behaviour/AC changes; full capability remains Draft; producer agreement and runtime/integration evidence pending |
