# Attendee producer integration test plan

Status: Draft; independent adequacy review, replacement baseline pending; user accepted start-date-only on 2026-10-21.

- Feature: F01-US03; F01-AC05, F01-AC06, F01-AC08/09 and shared SEC01/02/12 boundaries.
- Reference: programme revision 7 producer contract, generated OpenAPI types, prior attendee baseline `4ee5b7c29a8efb212050ecef3b322275ed12c4b9` and evidence seal `9b79a7721a2891ca707bc6dd93ef7c874e40ef26`.
- Actual designer: `/root/f01_tests`; generic delegated test_case_designer. No application edit ownership or nested agents.
- Change authority: [BROWSE-TCR-03](2026-10-21-attendee-integration-test-change.md). Date filtering uses the user-accepted start-date-only rule.

## Executable frontend cases

| Case | Synthetic action and observable result | Evidence limit |
| --- | --- | --- |
| Existing PB01-24, including parameterized expansions | Preserve keyboard entry, credentialed GET, full detail facts, event-local overnight time/free-price, literal combined query transport, paging/reset, loading/empty/failure/retry, session clearing, stale filter/event/actor suppression, literal untrusted text, role/direct-route denial and deep-link detail | HTTP/auth fixtures; cannot prove server enforcement or persistence |
| PB06/07 and new total boundary checks | Producer total=21, limit=20, first full page then one item; next stops at last page, previous restores first page. A total=20 exact full page must not offer another page | Fixture values follow independent producer schema, not consumer helpers |
| PB23 plus panel positive case | All six labels send exact tokens; panel response renders list and detail using sibling event/venue/room with projected event timezone | Does not prove backend enum filtering |
| Malformed producer DTO | Invalid published projection or pagination fails safely with no stale detail facts; retry restores valid data | Basic client shape checking, not exhaustive schema enforcement |
| Date transport | Request selected event-local YYYY-MM-DD unchanged; consistent start-date-only example | Real date membership requires backend integration test |

Use generated `components` types to validate fixture EventSummary/PublishedProgramme shapes. Test fixtures never import application consumer DTOs. Synthetic publication timestamp and room maximum complete the producer projection. No fake backend filter algorithm is added.

## Real producer/lifecycle checks

Use only a verified disposable local test database (`eventapp_test`, port 5433) or a new isolated synthetic verification database, never reset retained development data. Existing `backend/tests/test_programme.py` covers publication snapshot, literal title/AND filters, paging, invalid queries, auth/roles, draft concealment, stale writes, parent relationships, atomic audit and concurrent publication. Rerun relevant tests; preserve expectations. Add missing date boundary coverage only after independent review.

A real browser journey must register/sign in an attendee, have an assigned organiser create a venue/room/private draft and publish, then use attendee catalogue/list/detail/filter/paging endpoints through the running app. Confirm the draft is absent before publication; sign out/role denial; literal text; event-local times; distinct accessibility notes; keyboard focus; narrow viewport; persisted publication after backend restart with no reseed. Do not claim live E2E from fixtures.

Read-only environment discovery: repository has `compose.yaml`, installed Docker and uv executables, backend dependency environment and documented separate db/test-db services. Docker daemon/readiness, running app and actual browser availability still need direct checks. This test-design task has not started services or reset/written a database.

## Runner and protection

Keep existing runner settings: bundled Node24, TZ=UTC, NODE_OPTIONS=--no-experimental-webstorage, Vitest single worker, reviewed 30000ms harness ceiling. No global config/timeout/dependency/test discovery changes. Focused producer baseline execution before developer must distinguish meaningful contract failures from harness failure. Full frontend regression and production build follow implementation; prior organiser 30-second creation timeout remains an unresolved earlier observation, not automatically an integration defect.

Freeze both test/fixture paths plus this plan/TCR under an immutable commit after review. Parent owns baseline identity and log evidence. N/A: attendee reads have no writes, retries do not mutate records, AI/external execution outside F01. Production/online delivery, real assistive technology and human teammate/log review remain separate completion gates unless actually verified.


## Review and RED execution

Independent behaviour/security reviewer `/root/f01_review` approved the exact amended test/fixture snapshot after proposal approval and test-owner correction. All 30 old expanded cases remain plus six new cases. TypeScript passed. A selected single-case PB26 pre-implementation run failed meaningfully at event discovery because the app still uses old API paths; 1 failed, 35 unselected, 14.73 seconds. Deeper panel assertions were not reached. This is selected RED evidence, not a complete baseline run; all 36 cases require post-implementation execution. The TCR records the exact command and limits. Parent must issue an immutable reviewed baseline before developer assignment.
