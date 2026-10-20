# Organiser programme: local testing and attendee API handoff

Contract: [programme revision 6](../specs/programme/create-and-publish-programme.md). This guide describes the intended test flows; actual passing evidence and remaining checks belong in the [run record](../workflow/agents/runs/2026-10-20-organiser-programme.md).

## Start locally

Follow [DeveloperGuide](DeveloperGuide.md) to start PostgreSQL, apply `uv run alembic upgrade head` in `backend/`, then run FastAPI and the frontend separately. New programme tables require the latest migration before using the screens. Do not reset an existing development database or use it for automated tests.

Use the existing trusted bootstrap CLI to create an event and assign an organiser; the guide gives synthetic examples. Replace the initial organiser password when prompted by the application. Ensure the event dates include the programme times you will enter. There is no event-creation UI in this slice.

## Organiser browser flows

1. Sign in using the Organiser tab; open Programme Management. Only assigned events should appear. An account with no active event membership must not enter the workspace.
2. Select an event. Create a venue with a name/address, then a room in that venue with capacity 30. Leave accessibility notes empty: this means unknown, not confirmed accessible.
3. Create a draft workshop in that room, inside the event's dates, capacity 30 and price 0 SGD cents. Save, select it again and refresh: the draft should persist and remain private.
4. Try capacity 31, a negative price, missing title and an end time before the start. Expect actionable errors and no accepted invalid changes. Two otherwise valid items may overlap in the same room.
5. Validate a draft. This must not publish or increment its revision. Open publication confirmation and cancel: nothing should publish. Confirm publication: the item becomes read-only with a new revision.
6. Try editing/deleting that published item or changing its room/venue. Expect rejection. An unused room can be deleted; a referenced room cannot. Delete a different draft only after explicit confirmation; cancelling deletion preserves it.
7. Open the same draft in two tabs. Save an edit in the first, then save/publish the old revision in the second. Expect a conflict and an explicit reload/review step, not silent overwrite.
8. Switch events while editing. Selected item, unsaved inputs and old field errors must clear. Check both appearance modes and keyboard operation. Displayed times must use the selected event's timezone, even when your computer uses another timezone.

## Attendee teammate handoff

Attendee screens are not supplied by this branch. Use the generated frontend types from `api-schema.d.ts` and the FastAPI OpenAPI document, not manually duplicated DTOs.

With a separately signed-in attendee session, call:

- `GET /api/v1/attendee/events`
- `GET /api/v1/attendee/events/{event_id}/programme?q=workshop&type=workshop&date=2027-01-01&limit=50&offset=0`
- `GET /api/v1/attendee/events/{event_id}/programme/{item_id}`

Lists return `{items,total,limit,offset}`. Filters combine with AND. Title search is literal and case-insensitive; date means the item's start date in its published event timezone. Ordering is start instant then ID. Default limit is 50, maximum 100.

An event with no published items is absent; its programme read returns 404. A draft ID returns 404 even in an otherwise visible event. Published details contain frozen item, event, venue and room facts, not organiser audit identity or private drafts. Business/organiser sessions cannot substitute for attendee authority.

`PublishedProgramme` includes `id`, `eventId`, `revision`, `state`, `title`, `type`, `startsAt`, `endsAt`, `capacity`, `priceMinorUnits`, `currency`, `accessibilityDetails`, `publishedAt`, and nested `event`, `venue`, `room`. IDs are UUIDs; output instants are UTC ISO strings. Preserve item IDs/revisions for later planning integration. Prices are nonnegative integer SGD cents, not floating-point dollars.

## Automated and lifecycle checks

Use only the guarded test database and commands in DeveloperGuide/the run record. The suite may truncate synthetic test records; never run it against your development or production database. Do not run two database suites concurrently against the same test target.

For restart evidence, create fresh synthetic records, note their IDs, restart FastAPI and the PostgreSQL container without removing its volume, and retrieve the same records. A client refresh or reseeded fixture alone is not restart evidence. Actual deployed organiser/attendee UI integration and production isolation remain separate release checks.
