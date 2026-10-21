# F02 revision-2 preimplementation test plan

Status: Draft candidate, not frozen. Human approval of r2 relayed by parent in this task; reviewers and immutable baseline SHA pending.
Designer: /root/f02_scenarios (actual generic subagent, inherited model; role instructions read). Independent behaviour/security adequacy reviewer: /root/f02_draft_review, pending results.
Source snapshot: master 148b381, F02 r2 human approved in session, PublishedProgramme v1/programme r7, access r4, SEC01/02/05/10/11, RD03/04/07.

## Protected paths proposed

New backend/tests/test_attendee_planning.py; new frontend/tests/attendee-planning.test.tsx; existing frontend/tests/acceptance/session-and-homes.test.tsx via F02-TCR-01; existing backend/tests/test_business_applications.py only via separately reviewed F02-TCR-02. Protect tools/check_test_baseline.py, tests/fixtures and reset guard, backend/tests/conftest.py, frontend/tests/setup.ts, vite.config.ts, package/lock files, runner/CI configuration using parent-recorded exact path set. Developer cannot alter any baseline artifact.

## API cases

Uses existing guarded test_programme.journey and auth/programme helpers: synthetic exact PostgreSQL target only, real bootstrap/auth/publication through current APIs. No F02 module mocks/imports. Cases assert returned authoritative facts and complete before/after PlanningState after rejection, not implementation internals.

| Case/test substring | Criteria | Observable coverage |
| --- | --- | --- |
| empty_read | AC01 | Empty GET no domain mutation, persisted private plain text/zero ceiling, session-derived owner, wrong-role/anonymous denial, no spoofed owner field |
| invalid_preferences (9 values) | AC01 | Bounds, exact integer cents (reject bool/fraction), unsupported currency, lengths, gap bounds; before/after equality |
| bookmarks | AC02 | Add/remove/duplicate idempotence, independent draft, hidden/missing/foreign-event targets |
| draft_sorts | AC03/04 | Reverse insertion reads chronological canonical producer facts; overlap draft saves with warning but acceptance rejected |
| exact_budget | AC04/05 | Exact 125-cent sum passes, 124 ceiling fails, adjacent zero gap passes, configured ten-minute threshold, immutable accepted snapshot/history |
| accessibility_confirmation | AC04/06 | Nonempty needs block unconfirmed, explicit confirmation permits unknown while preserving unknown evidence, any preference revision invalidates acknowledgement |
| zero_budget | AC04/05 | Free-only acceptance, paid selection reject, empty acceptance reject with prior accepted pointer unchanged |
| draft_rejects | AC03/06 | Duplicate/forged authoritative price fields, absent ID, stale programme/preference revisions reject without writes |
| new_connection | AC05/07 | Engine connection disposal/reopened app client retrieves persisted acceptance, another owner cannot read accepted ID; manual flow without AI fixture/provider |
| stale_revisions | AC05/06 | Concurrent first-create CAS one success/one409, concurrent same-revision acceptance idempotent single history, newer plan acceptance then old retry409 |
| delete_history | AC08 | Owner atomic scope, accepted IDs disappear, programme unchanged, monotonic deletion tombstone rejects stale resurrection/deletion after recreation |
| every_mutation (3 Origins) | AC01-08 | Every PUT/POST/DELETE rejects missing/null/foreign Origin and leaves full state unchanged |

## UI cases

Real App rendered via established auth fixture, network-only authoritative response fixtures. New UI conventions: existing My Itinerary home action -> /attendee/planning event picker -> /attendee/planning/events/:eventId. Accessible labels describe Interests, Budget SGD, Accessibility needs, Minimum gap; Save preferences/draft, Accept itinerary and confirmed Delete planning data. These conventions are technical choices acknowledged by parent. UI fixtures do not implement domain enforcement.

UI01 keyboard home/event entry and credentialed reads; UI02 exact 12.50 dollars ->1250 cents and revision tokens; UI03 unknown accessibility and unchecked explicit confirmation; UI04 overlap warning/saveable draft and no silent accepted replacement; UI05 explicit acceptance with all CAS tokens; UI06 stale error safe allowlist/no raw detail; UI07 failed read/retry; UI08 confirmation-before-delete with current revision then empty form.

## Required deferred checks and limits

- Real PostgreSQL process and API restart without reseeding: parent/local integration after implementation; engine.dispose case establishes connection lifecycle only.
- Controlled transaction storage failure/rollback during acceptance/deletion: add independently reviewed executable fixture once schema/transaction surface exists; no claim current rejection tests prove storage-error rollback.
- F05 cancellation and live programme-change propagation: deferred until real producer exists (r2 explicitly defers); synthetic revision tests do not prove it.
- Same-time different-room overlap, overnight timezone and minimum-gap rendering browser coverage: API interval arithmetic currently same-room synthetic fixtures; add focused coverage before final verification if not supplied independently.
- Broader manual accessibility, 320px/400%/assistive technology and online separate-environment evidence remain human/deployment checks.
- Real provider test N/A to manual F02; manual-path availability during existing AI worker failure should be integrated after Dylan branch is merged.

## Commands and preimplementation evidence

Backend from backend/: uv run pytest tests/test_attendee_planning.py -q (set existing guarded TEST_DATABASE_URL plus distinct DATABASE_URL and EVENTAPP_ALLOW_TEST_DB_RESET=true; never substitute development DB).
Frontend from frontend/: npm test -- tests/attendee-planning.test.tsx tests/acceptance/session-and-homes.test.tsx --maxWorkers=1 (existing settings; TZ=UTC). TypeScript/build later checks candidate compatibility.
No commands executed by designer yet. Parent owns red run after reviewed installation. Expected behavioral red: backend planning GET404; UI My Itinerary disabled/missing planning route. Import/harness errors must be fixed as harness faults, never counted meaningful red. Independent adequacy review and approval precede immutable baseline freeze.

## Adequacy review expansion before freeze

Added UI09 central bookmark/add/save/remove journey: asserts independent mutation routes and full current CAS tokens, draft item ID/published revision and no implicit acceptance. UI fixture state is controlled network evidence, not server persistence. Backend gained explicit empty/free-only cases, stale/duplicate/spoofed draft cases, real connection lifecycle, accepted-ID denial for another attendee/organiser/anonymous with unchanged owner state. Current candidate backend expanded test count is determined by collection, not inferred as execution.
