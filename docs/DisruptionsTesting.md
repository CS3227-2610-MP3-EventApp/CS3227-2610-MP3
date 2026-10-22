# F05 local testing and F02 handoff

## Start

Use the [developer guide](DeveloperGuide.md) to start PostgreSQL, FastAPI and Vite and provision an organiser/event. Check `docker compose ps`: the development container's published host port must match `DATABASE_URL` in each backend terminal. Committed Compose defaults to 5432; a locally overridden mapping such as 5434 requires that port in the URL. Do not paste secrets or use the test database for retained development data.

From `backend/`, with the correct ignored `.env` or exported database URL:

```sh
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1
```

For AI assistance, use the existing [SoCLaaS configuration](AIAnalysisTesting.md), an allowlisted event containing only invented data, and another backend terminal with the same environment:

```sh
uv run python -m app.ai.worker
```

The worker may be quiet while waiting. Manual announcements need no provider key or worker.

## Organiser: change and cancel

1. Log in as an assigned organiser. Open Programme Management, select the event, create a venue/room and a complete activity, then publish it.
2. Open **Edit published activity**. Change the title, time within event dates, room, capacity, SGD price or accessibility notes. Review before/after facts and confirm. The item revision advances; history retains both versions.
3. Try negative/three-decimal prices, capacity above the room's capacity and times outside the event. Expect validation, not a saved revision. Same-room overlap is allowed.
4. Open the same item in two tabs. Save a change in one and try submitting the old revision in the other. Expect a conflict; reload/review before retrying. Submitting unchanged facts must not add history.
5. Cancel with a nonblank reason, explicitly confirm, and verify the cancelled badge/reason. Further edits, repeat cancellation and hard deletion must be unavailable/rejected. Referenced locations remain protected.
6. If a request fails with an unknown outcome, use **Check current state** before submitting again.

## Announcements

1. Select the latest committed change. Create and save a manual announcement; verified source facts are displayed separately from editable wording.
2. Preview, inspect exact saved text, then approve/publish. Sign in as an attendee in a separate browser/session and open the event's announcements. Only published text is visible.
3. Another organiser must not see your private drafts. Published text cannot be patched. A second published announcement for the same change must be rejected.
4. Edit a saved draft after previewing or change the source activity again. The old preview must no longer publish. A preview older than 15 minutes must fail; request a fresh one.
5. With invented-data AI enabled, request AI assistance, confirm the boundary and follow/cancel the job. Successful output becomes a private draft only. Review/edit it before previewing. Stop the worker or disable AI and verify manual drafting still works.

## Attendee and integration limits

1. Browse the event programme: each activity appears once at its latest revision, including cancelled activities/reasons. Draft activities remain hidden. Check title/type/event-local-date filtering.
2. Open event announcements and check published exact text and historical before/after facts. The current activity link is separate from historical facts.
3. Open Notifications. Until real F02 integration, expect an explicit pending/unavailable message, not delivery or an empty-success inbox.
4. Check keyboard navigation, confirmations, narrow/mobile layout, and both themes manually. Browser, screen-reader, restart and deployed checks are not established by unit tests alone.

## API / teammate contract

Use `/docs` or committed `backend/openapi.json` for exact generated schemas. New organiser routes use `/api/v1/organiser/events/{event_id}`:

- `POST programme-items/{item_id}/changes`: complete item fields, `expectedRevision`, optional `reason`, `confirmed: true`.
- `POST programme-items/{item_id}/cancel`: `expectedRevision`, required `reason`, `confirmed: true`.
- `GET programme-items/{item_id}/changes`: paginated history, latest first.
- `POST/GET announcements`, `GET/PATCH announcements/{id}`, `POST announcements/{id}/preview`, `POST announcements/{id}/publish`, `POST announcements/generate`.

Attendee announcement list/detail routes live under `/api/v1/attendee/events/{event_id}/announcements`; notification list/detail/mark-read under `/api/v1/attendee/notifications`. Normal role/membership, origin, problem-response and pagination rules apply. Announcement AI jobs reuse existing job read/cancel endpoints and carry an explicit workflow kind.

F02 owner must deliver a transactional accepted-itinerary query returning attendee ID and accepted-plan revision ID, preserve each item's observed programme revision, reject newly accepted cancelled items, and use the event lock before reading/validating programme facts. F05 consumes it without writing F02 tables. Enable real recipient capture with planning, then verify acceptance/change races, deduplication, private read/mark-read, rollback and unchanged accepted plans. Do not mark F05 complete before these checks.

## Automated checks

Use the isolated test database and reset opt-in from the developer guide, never the retained development database. Run backend suites serially:

```sh
uv run pytest tests unit_tests -q
```

From `frontend/`, run `npm test`, `npm run build` and `npm run api:types`. CI uses Node 20, 22, 24 and 26; newer Node jobs retain the existing `--no-experimental-webstorage` setting. The run record holds actual results, protected-baseline references and remaining evidence; proposed checks above are not claims of execution.
