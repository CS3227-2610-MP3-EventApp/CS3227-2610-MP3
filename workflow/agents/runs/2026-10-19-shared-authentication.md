# Shared authentication run record

- Date/timezone / human owner: 2026-10-19 Asia/Singapore / Dylan.
- Branch / starting snapshot: `feat/shared-authentication`, `5c0ab1552d65bf400fbcc96fb99bde2b18da29ee`.
- Scope: `access-authorised-workspaces` revision 3 / CurrentActor v1, F10-US01 foundation slice. Domain-level criteria remain deferred as specified.
- Authority: Dylan approved the complete plan and execution on a new branch from master. Orchestrator recorded exact revision 3 Ready before implementation; current status is In review pending human/browser and downstream evidence.
- Original protected baseline: `b264f3951d19185a499828ab5d198dc1c3aa57fe`; reviewed replacement `991621186ade0136be8440524fd51b7cdc520259`; final `d60152a1b7ad78c90b5a7b26499eb1cb6b63e151`. Protect `backend/tests/`, `frontend/tests/`, `backend/pyproject.toml`, `backend/uv.lock`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.ts`, `workflow/agents/runs/2026-10-19-authentication-test-plan.md`, `workflow/agents/runs/2026-10-19-auth-test-change.md`, and `tools/check_test_baseline.py`. Commands/scenarios: [test plan](2026-10-19-authentication-test-plan.md); authorized changes: [AUTH-TCR-02–08](2026-10-19-auth-test-change.md).
- Reviewed implementation snapshot: `e202ea95747a4c831cac7bb0d251c856a166d818`. Later handoff edits are documentation/evidence only.

## Actual delegation and handoffs

- `/root` delegated bounded documentation ownership to `/root/auth_contract_v3` as specification_analyst, escalated for authentication/shared contracts. Read AGENTS, draft-spec, analyst role, workflow, canonical template/index, catalogue, project, architecture/security and existing access Draft. No nested agents spawned.
- `/root/auth_contract_v3` authored the access revision 3 and minimum shared documentation; coordinated exact wire/CLI/table/dependency shapes directly with `/root/auth_tests_v3`. Test ownership remains with that separate agent.
- Orchestrator clarified that final plan supersedes separate temporary-password expiry, retains/rotates the current password-change session, includes username/status in actor, uses active/inactive membership, and requires minimal SEC11 audit events. These are recorded without claiming new analyst product approval.
- `/root/auth_pre_security` inspected saved revision 3/architecture and identified storage-status and inactive-seed-replay mismatches. Analyst aligned storage failure to 503 and inactive replay to success without reactivation. Reviewer reported no other blocking security-contract gaps; final adequacy/baseline review belongs in orchestrator evidence.
- `/root/auth_tests_v3` owned executable acceptance tests, fixtures and authorized corrections, including actual RED runs. `/root/auth_behaviour_v3` and `/root/auth_pre_security` independently approved adequacy before the initial freeze and reviewed subsequent corrections. Generic agent tools were supplied the corresponding repository role instructions and agreed model settings; native custom-agent discovery was not claimed.
- `/root/auth_backend_v3` implemented only backend application/migration/OpenAPI files after the protected baseline; escalated to GPT-6.1 Sol/high for authentication/migrations per repository policy. `/root` implemented frontend application files and coordinated docs, dependency generation and verification. Developers did not edit the protected tests.
- Final independent behaviour reviewer `/root/auth_behaviour_v3` and security reviewer `/root/auth_pre_security` both approved `e202ea9` with no remaining blocking findings. Security reviewer corrected an earlier route-only observation: unchanged-password rejection resides in `PasswordChangeRequest` validation. No browser operation or production deployment was performed.

## Evidence and limitations

The orchestrator reviewed revision 3 against Dylan's explicit plan and marked it Ready. `/root/auth_tests_v3` designed executable acceptance tests and recorded meaningful RED: real PostgreSQL-backed registration returned 404 instead of 201, and UI restoration tests failed because the prototype never calls `/me`. `/root/auth_behaviour_v3` and `/root/auth_pre_security` independently approved pre-implementation adequacy and AUTH-TCR-01 before baseline freeze. Application development begins after this recorded baseline. Model escalation to GPT-6.1 Sol / high for authentication and migration work follows the repository's agreed model policy.

Final fresh root checks on the implementation snapshot:

- `uv run pytest` against guarded PostgreSQL `eventapp_test` on loopback 5433: **65 passed**, 19.74s; one upstream TestClient/httpx deprecation warning. Developer independently reported 65 passed after final audit changes. Empty-database upgrade is included.
- `npm test -- --reporter=dot`: **75 passed**, 6.68s. `npm run build`: passed; existing approximately 528 kB bundle warning remains. Independent behaviour reviewer also ran 75 UI tests and the build.
- Final protected-baseline guard: passed. Agent/local-link validator: passed. Guard tooling regression suite: **9 passed**. `git diff --check`: passed. Dependency/cache/build folders are ignored, not tracked.
- `npm audit`: zero known vulnerabilities. `uvx pip-audit --path .venv/lib/python3.12/site-packages`: zero after replacing vulnerable development-only Pytest 8.4.2 with locked 9.1.1 under the reviewed baseline. Production/runtime dependencies were unchanged by that correction.
- OpenAPI exports without opening a DB connection. Behaviour reviewer independently checked saved schema against `app.openapi()` and generated TypeScript equality. Generated artifacts are intentionally tracked.
- Real HTTP smoke with Uvicorn 8001 and Vite 5174: attendee register/reopen, safe cookies, wrong-role login, rejected Origin, direct API credentialed CORS, business atomic owner creation/logout/copied-cookie rejection, and seeded organiser login/replacement/old-password rejection passed. One initial preflight assertion incorrectly expected backend CORS via Vite; inspection showed Vite itself returns development preflight 204. Checking the backend directly gave the required allowlist/credentials/no-store response; product code was unchanged.
- A separate Uvicorn process on 8002 was stopped/restarted while retaining its client cookie; the same actor restored. The synthetic PostgreSQL container was restarted and readiness recovered; the same actor/session restored. No development database reset or user port-8000 process was touched. Temporary servers 8001/5174/8002 were stopped after testing; synthetic test records remain only in the disposable test DB.
- Safari was unavailable because Computer Use was not approved. No browser interaction occurred. The user asked to finish without it; [manual test flows](../../../docs/AuthenticationTesting.md) cover remaining browser checks.

Persistence and network evidence is local only. Production hosting, recovery, rate limits, full domain authorization and real-browser visual/keyboard enforcement remain outside these completion claims. Audit success and selected denial paths are covered; malformed input and untrusted Origin do not create database writes, and audit storage failures can only emit a generic warning.

## Completion and reflection

The foundation is implemented and reviewed on the feature branch. The full capability remains In review because human teammate review, manual browser verification, human log verification and deferred domain integration remain pending. No push, PR, merge or deployment was performed. Test change control avoided adding artificial UI/production router workarounds for stale test assumptions; regression tests caught actual unchanged-password and whitespace-confirmation defects before handoff.

Session summary: [shared authentication](../../../logs/dylan/2026-10-19-shared-authentication.md). Human correctness verification pending.
