# Notify affected attendees

| Field | Value |
| --- | --- |
| Stable capability ID | notify-affected-attendees |
| Covered stories | [F05-US02](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap | Attendee, organiser trigger; [phase 4](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of revision 1 and recipient contract |
| Review / run record | Pending |

Sources: [standard](../README.md), catalogue, [RD04/RD05](../../docs/project.md#accepted-review-decisions), [security](../../docs/security.md), [architecture design draft](../../docs/architecture.md) updated 2026-10-17.

## Product outcome, users and scope

When a published activity changes, only attendees whose accepted itinerary contains that activity at the change commit boundary receive one in-app notice per change. Each notice states verified historical change facts and links to current programme facts. Drafts and bookmarks alone do not qualify. Email/push and business-specific disruption views are excluded. The notice does not alter or replace accepted plans.

## Use cases and user interface

An affected attendee sees an unread notice, opens old/new time, room or cancellation facts, follows a link to current item state, and marks it read. If later changes occurred, historical facts remain distinct from current facts. An unaffected attendee sees no notice. Empty inbox and delivery failure are distinguishable. Read state and messages are accessible and owner-private.

## Inputs, outputs and functional contract

Input is a committed `ProgrammeChanged v1` change and a consistent snapshot of accepted itinerary membership at that commit. Output is a fixed recipient set with one recipient/change notification each, referencing change ID, observed accepted-plan revision, immutable old/new facts, delivery/read state and creation time. Later plan edits, delivery retries or another change cannot alter the original recipient set. Mark-read changes only the recipient's notice. The attendee sees historical facts plus separately labelled current facts; a delayed delivery never asserts historical facts as current.

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

## External interfaces and dependencies

Consumes [programme changes](change-published-activities.md), `ProgrammeChanged v1`, and accepted itinerary revision membership from [planning](../attendee-planning/manage-preferences-and-itineraries.md). The programme-change/recipient commit contract must be agreed jointly with those producers. List/detail/read-state response and error semantics need versioned review; physical queue/storage design is outside this spec.

## Decisions and approval

| Decision | Options / proposed direction | Owner | Blocks | Resolution |
| --- | --- | --- | --- | --- |
| N-01 | Exact recipient/plan acceptance commit ordering contract | Product/contract human owners | Ready and integration | Pending; RD05 outcome fixed |
| N-02 | Notice wording, retention, retry/latency expectations | Product/privacy human owner | Ready | Pending |
| N-03 | Audit access for organiser versus recipient | Product/security human owner | Ready | Pending |

## Verification and evidence

Independent test design/baseline/reviews and integrated concurrency, delayed delivery and lifecycle checks are pending. All criteria remain unverified. Human teammate and online environment checks remain pending.

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft | Approval and verification pending |
