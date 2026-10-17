# Manage preferences and itineraries

| Field | Value |
| --- | --- |
| Stable capability ID | `manage-preferences-and-itineraries` |
| Covered stories | [F02-US02 and F02-US01](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Attendee; [phase 2, order 4](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of this revision and dependent contracts |
| Review / run record | Pending independent draft review and later implementation records |

Follow the [specification standard](../README.md). This contract covers an attendee's private, event-specific preferences, bookmarks and versioned itinerary. It does not reserve places, sell tickets, infer venue availability or decide unapproved constraint policy.

## Product outcome, users and scope

An authenticated attendee can express interests and constraints, bookmark published activities, prepare a chronological plan and explicitly accept a valid version. The owner alone can read or change private planning data. Published programme facts come from [create and publish programme](../programme/create-and-publish-programme.md); [role-based workspace access](../shared/access-authorised-workspaces.md) supplies identity and ownership enforcement. The manual journey remains available during AI failure (RD07). This contract supplies the planning foundation for the attendee LLM journey; it does not itself satisfy the LLM requirement.

## Use cases and user interface

The attendee views and edits event preferences, adds or removes bookmarks, and adds or removes activities in a draft plan. The plan shows activities in chronological order with current time, location, price and accessibility facts, any changes since planning, and visible overlap or other hard-constraint warnings. Missing accessibility information is shown as unknown. A conflicting manual draft remains saveable, but the accept control reports each blocking reason and cannot accept it. Acceptance is an explicit action; prior accepted versions remain identifiable. Forms expose understandable validation and keyboard-accessible controls.

## Inputs, outputs and functional contract

Inputs are an authenticated attendee and event, published activity IDs in that event, preference values (interests, budget amount/currency, accessibility needs, breaks, and explicit hard/soft designation), draft edits, and an expected plan revision for conflicting writes. The exact supported currencies, bounds and preference vocabulary remain decisions below. Outputs are owner-scoped preference/bookmark representations, a chronological draft with warnings and observed programme revisions, or an accepted itinerary version with the current validated item facts. Preference and draft changes persist. Accepting a plan creates a new accepted version and does not erase older accepted versions. An invalid, stale, unauthorized or failed write leaves the prior persisted preference, bookmark and itinerary state unchanged except an authorized failure/audit record. Event and activity IDs must match; authoritative programme data is never rewritten by planning.

## Constraints, security and non-functional requirements

Apply RD03, RD04 and RD07 in [project decisions](../../docs/project.md#accepted-review-decisions), [SEC01, SEC02, SEC05, SEC10 and SEC11](../../docs/security.md), and [attendee ownership and revision contracts](../../docs/architecture.md#required-relationship-rules). Hard constraints require deterministic validation at acceptance using current programme facts and current preferences. A later programme change can flag an accepted plan but never silently replace it; cancelled entries remain visible until the owner removes or replaces them. Unknown accessibility details cannot be presented as confirmed suitability. Apply the project accessibility and online/environment evidence gates during verification, without claiming deployment here.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| manage-preferences-and-itineraries-AC01 | Given an authorized attendee, when they save or revise event interests, budget, accessibility and break preferences, then only that owner can retrieve the persisted values and hard/soft designation. | F02-US02; SEC01-02 | Save, retrieve and cross-user denial |
| manage-preferences-and-itineraries-AC02 | Given a published same-event activity, when the owner adds or removes its bookmark, then the owner sees the persisted set without duplicates; cross-event or unauthorized requests disclose no private records and change none. | F02-US01; SEC01-02 | Duplicate, ownership and event-boundary cases |
| manage-preferences-and-itineraries-AC03 | Given a draft plan, when the owner adds or removes an activity, then the saved plan reads chronologically with current facts and visible warnings for overlapping times, regardless of room; an overlapping draft remains saveable. | F02-US01; RD03-04; SEC05 | Overlap, ordering and persistence |
| manage-preferences-and-itineraries-AC04 | Given a draft with a violated hard constraint or unknown required accessibility suitability, when acceptance is requested, then blocking reasons are shown and the accepted version and side effects are unchanged. | F02-US01-02; RD03; SEC05 | Constraint boundary and state comparison |
| manage-preferences-and-itineraries-AC05 | Given a current valid draft, when its owner explicitly accepts it, then a new accepted version persists with the checked programme and preference revisions; prior accepted versions remain identifiable. | F02-US01; RD03-04 | Acceptance and revision retrieval |
| manage-preferences-and-itineraries-AC06 | Given a stale plan, changed programme item, cancellation or concurrent edit, when acceptance or a revision-checked write is requested, then the request reports current facts or a conflict without overwriting accepted state; a cancelled accepted entry remains visible until owner action. | F02-US01-02; RD04; SEC05 | Stale/concurrent/cancellation cases |
| manage-preferences-and-itineraries-AC07 | Given AI unavailability, when the attendee uses preferences, bookmarks or the manual draft, then those operations remain available and existing accepted data remains intact. | F02-US01-02; RD07; SEC10 | Provider-failure manual path |

## External interfaces and dependencies

The planning boundary accepts event/activity IDs plus the authenticated owner, returns owner-scoped preferences, bookmarks and plan versions, and reports invalid input, missing/foreign activities, forbidden access, stale revision and hard-constraint failures distinctly. It consumes published item ID/revision, time, location, price, accessibility and cancellation state from the [programme contract](../programme/create-and-publish-programme.md), and the [change contract](../programme/change-published-activities.md) once available. It supplies draft/accepted versions to [AI itinerary drafts](generate-feasible-itineraries.md) and accepted-plan membership to [change notifications](../programme/notify-affected-attendees.md). Physical schema and exact API route names remain in architecture/implementation, subject to reviewed producer-consumer contracts.

## Decisions and approval

| Decision | Options / proposed direction | Decision owner | Blocks what? | Resolution |
| --- | --- | --- | --- | --- |
| MAP-01 | Hard constraint semantics, time/travel/break buffers and unknown accessibility handling; retain RD03 rules while resolving details | Human product owner with affected contributors | Ready and acceptance validation | Pending; [D08](../../docs/project.md#decisions-before-implementation) |
| MAP-02 | Supported currency, budget limits, preference vocabulary and retention | Human product owner | Ready for affected fields | Pending |
| MAP-03 | Exact planning API shape and revision compatibility with programme consumers | Contract owners and human product owner | Ready/integration | Pending |

## Verification and evidence

All AC01–AC07 are unexecuted scenarios for independent test design, including restart persistence, server-boundary denial, stale writes and manual fallback. Protected baseline, commands, contract revisions, implementation snapshot, independent behaviour/security reviews, human teammate review and online/environment evidence: pending. No implementation verification or product approval is claimed. See [agent workflow](../../workflow/agents/README.md) and [session logs](../../logs/README.md).

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft; AC01–AC07 allocated | Approval and verification pending |
