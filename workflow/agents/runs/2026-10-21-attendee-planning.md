# F02 implementation run

- Branch: feat/yikbing-attendee-planning; starting implementation base 148b381.
- Contract: manage-preferences-and-itineraries revision 2; exact revision approved by Yik Bing on 2026-10-21 in this chat.
- Human teammate review and session-log correctness verification: Pending.
- Actual generic agents: /root/f02_contract (analyst, later isolated backend developer); /root/f02_scenarios (independent test owner); /root/f02_draft_review (independent behaviour/security draft and baseline reviewer). Parent owns orchestration and integration. No native custom-role discovery or nested delegation claimed.

## Ownership and dependency boundaries

Backend developer: new backend/app/attendee_planning/*.py and new backend/alembic/versions/20261021_f02_attendee_planning.py only. Parent owns backend/app/main.py, backend/alembic/env.py, generated schema integration, frontend attendee-planning implementation and small App/Workspace wiring. Test owner owns new tests/fixtures and independently reviewed changes to existing tests only. Developers cannot edit protected paths.

Do not edit Dylan's AI files, settings/dependencies, organiser functionality or provider integration. Migration is additive with unique revision 20261021_f02 following current master 20261021_0004; Dylan's branch has a separate 0005. Before combined merge, reconcile the actual graph without rewriting applied history and verify upgrades. No zero-conflict promise.

## Protected baseline

Initial immutable SHA: 6c0232b38fb4ed81ebc20a9e8fd8a5178a8d1c10. After independently approved TCR04, replacement baseline SHA: 162a1dc96b4f08b8535f9728f04e08a8b3653680. The guard passes on the replacement SHA with the protected path set below.

Protected paths: backend/tests; frontend/tests; backend/pyproject.toml; frontend/package.json; frontend/package-lock.json; frontend/vite.config.ts; tools/check_test_baseline.py; workflow/agents/runs/2026-10-21-attendee-planning-test-plan.md; workflow/agents/runs/2026-10-21-attendee-planning-test-changes.md. Verify every path exists in the baseline before using the guard. The run record remains evidence-owned; do not weaken its baseline identity or protection policy.

## Commands and environment

Only task-owned disposable PostgreSQL container eventapp-f02-test-20261021 on loopback5433/eventapp_test is used. Existing development container on5432 is untouched. Default Docker access was denied; authorized escalation succeeded. The initially unused5546 task container was recreated at5433 because existing reset guard intentionally permits only that exact test target. No guard change.

Backend: TEST_DATABASE_URL points to guarded synthetic localhost5433/eventapp_test, DATABASE_URL to distinct unused localhost5432/eventapp, EVENTAPP_ALLOW_TEST_DB_RESET=true. backend/.venv/Scripts/python.exe -m pytest tests/test_attendee_planning.py -q; affected existing programme/auth/application/migration checks follow after focused suite. Never run concurrent suites against this resettable database.

Frontend: TZ=UTC; node20.19.0; node_modules/.bin/vitest.cmd run tests/attendee-planning.test.tsx tests/acceptance/session-and-homes.test.tsx --maxWorkers=1. Production build via installed TypeScript/Vite scripts. Preserve existing runner settings.

## Preimplementation evidence

- One initial install attempt used a relative path from backend and failed before copying; no tests ran. Corrected absolute destinations.
- Backend first case reached real auth/bootstrap/publication then failed on GET planning404, 1failed21.48s. This is a meaningful missing-route failure, not import/setup failure.
- Frontend UI01 selected with name filter: missing enabled My Itinerary action; 1failed,7unselected,32.31s. No test skip/config change.
- Independent adequacy reviewer requested accepted-version privacy, invalid draft references/stale tokens, empty acceptance and zero-budget cases before freeze.

## Implementation and verification

Final F02 implementation is in the working diff following baseline `162a1dc96b4f08b8535f9728f04e08a8b3653680`. Independent reviewer `/root/f02_draft_review` assessed the same code snapshot for behaviour/security and found no actionable scoped findings; this was static review, not test execution. No edits were made to protected production/test paths after the baseline except the independently reviewed TCR04 correction included in baseline 162a1dc.

- Backend `backend/.venv/Scripts/python.exe -m pytest tests/test_attendee_planning.py -q`: 22 passed in 3386.79s on guarded `127.0.0.1:5433/eventapp_test`. Only warnings: Starlette/httpx deprecation and pytest cache access denied; neither changed the result.
- Frontend on Node 20.19.0 with `TZ=UTC`, `npm test -- --run tests/attendee-planning.test.tsx tests/acceptance/session-and-homes.test.tsx --maxWorkers=1`: after TCR04, 2 files/29 tests passed in 60.36s. One earlier run exposed an ambiguous query (both the empty-itinerary warning and stale-write conflict are valid alerts); it was corrected by the test owner, approved independently, frozen as 162a1dc, then passed. No application change was required for this failure.
- `npm run build`: TypeScript and Vite production build passed. Existing bundle advisory remains: main JS chunk 874.64 kB minified / 268.53 kB gzip, above Vite's 500 kB advisory threshold.
- Two targeted backend migration tests (fresh full-head schema and auth-to-head data preservation): 2 passed in 35.45s.
- Independent synthetic scenario helper: real private draft and published foreign-event references denied with unchanged planning data; organiser and business mutation matrix denied; same-room and actual different-room overlap rejected at acceptance; overnight exact adjacency accepted; forced accepted-row insert/delete storage failures rolled back; repeated empty delete remained a no-op.
- Persistence: wrote synthetic preferences, bookmark, draft and two accepted snapshots, stopped the setup process, restarted only `eventapp-f02-test-20261021` PostgreSQL, then a fresh process/client retrieved the exact state and both accepted versions without reseeding.
- `tools/check_test_baseline.py` passed against full baseline SHA `162a1dc96b4f08b8535f9728f04e08a8b3653680`; `git diff --check` passed. The synthetic verification script also required a small correction to use a separately created Room B before the different-room case.

Remaining evidence: manual accessibility/assistive technology review, actual online delivery and environment isolation, human teammate review and human session-log verification. F05 cancellation/change producer is absent and explicitly deferred. Dylan's organiser AI migration `20261021_0005` is on a separate branch; reconcile both additive migration heads and test combined empty/existing-database upgrades before integration/PR. No push, PR or merge occurred. See `logs/yikbing/2026-10-21-attendee-planning-start.md` for the user interaction and coordination summary.