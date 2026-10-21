# F02 implementation run

- Branch: feat/yikbing-attendee-planning; starting implementation base 148b381.
- Contract: manage-preferences-and-itineraries revision 2; exact revision approved by Yik Bing on 2026-10-21 in this chat.
- Human teammate review and session-log correctness verification: Pending.
- Actual generic agents: /root/f02_contract (analyst, later isolated backend developer); /root/f02_scenarios (independent test owner); /root/f02_draft_review (independent behaviour/security draft and baseline reviewer). Parent owns orchestration and integration. No native custom-role discovery or nested delegation claimed.

## Ownership and dependency boundaries

Backend developer: new backend/app/attendee_planning/*.py and new backend/alembic/versions/20261021_f02_attendee_planning.py only. Parent owns backend/app/main.py, backend/alembic/env.py, generated schema integration, frontend attendee-planning implementation and small App/Workspace wiring. Test owner owns new tests/fixtures and independently reviewed changes to existing tests only. Developers cannot edit protected paths.

Do not edit Dylan's AI files, settings/dependencies, organiser functionality or provider integration. Migration is additive with unique revision 20261021_f02 following current master 20261021_0004; Dylan's branch has a separate 0005. Before combined merge, reconcile the actual graph without rewriting applied history and verify upgrades. No zero-conflict promise.

## Protected baseline

Immutable SHA: Pending independent adequacy review and baseline commit. Implementation cannot start before this value is recorded.

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

Pending. No passing implementation, persistence, browser, security or online-delivery claim is made. Actual F05 cancellation remains deferred to the real producer lifecycle. Manual synthetic API tests are separate from provider evidence; F02 itself has no AI dependency.

Independent /root/f02_draft_review approved final baseline and both narrow TCRs before implementation. Residual final checks: real foreign/private draft references, different-room/overnight, wrong-role mutation matrix, true DB/API restart and storage rollback. These remain required evidence, not claimed passing. Initial red observations predate final case additions.
