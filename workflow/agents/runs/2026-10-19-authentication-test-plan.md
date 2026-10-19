# Shared authentication test plan

Status: Approved for baseline freeze by independent behaviour and security reviewers; immutable baseline recorded in the shared-authentication run record.

Feature: F10-US01, `access-authorised-workspaces` revision 3, CurrentActor v1 and architecture shared-authentication foundation contract. Human authorised full implementation plan on 2026-10-19, including replacing prototype browser identity; exact readiness recorded by orchestrator.

Designer: `/root/auth_tests_v3`, actual delegated test_case_designer; no nested agents. Security adequacy reviewer: `/root/auth_pre_security`; independent behaviour adequacy reviewer: `/root/auth_behaviour_v3`. Both approved the saved pre-implementation tests and contract on 2026-10-19. Baseline SHA is assigned by orchestrator in the shared-authentication run record after this commit.

## Protected paths and commands

Protect `backend/tests/`, `frontend/tests/`, `backend/pyproject.toml`, `backend/uv.lock`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.ts`, this plan and `tools/check_test_baseline.py`. Dependency additions and API type-generation scripts are finalized by orchestrator before freeze. Vite proxy `/api` to `http://127.0.0.1:8000` is a test-owner approved harness/config change preserving Vitest discovery.

Backend from `backend/`:

```sh
DATABASE_URL=postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp TEST_DATABASE_URL=postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test EVENTAPP_ALLOW_TEST_DB_RESET=true uv run pytest
```

Frontend from `frontend/`: `npm test -- --reporter=dot`; build/type verification `npm run build`; generated API contract `npm run api:types` plus inspect generated-source diff. Baseline guard: `python tools/check_test_baseline.py --baseline FULL_SHA --paths` followed by every protected path above. Inspect non-baseline diff for bypasses.

All mutation fixtures use synthetic identities. PostgreSQL is real, never SQLite; every reset/TRUNCATE/trigger operation calls `require_synthetic_reset_target()` first, allowing only driver `postgresql+psycopg`, account/database `eventapp_test`, loopback port5433 and explicit reset opt-in. Development database is not touched.

## Executable cases

Backend cases live in `backend/tests/test_authentication.py` (46 collected cases). All API success/failure tests call the real FastAPI application with real PostgreSQL; no auth service/database replacement. Test-only protected GET routes consume public permission dependencies; they ship no domain API.

| Cases / criteria | Setup and action | Expected observable result and unchanged state |
| --- | --- | --- |
| Registration safe actor/cookie; AC07/12/13/19 | Fresh attendee registration; inspect response, reopened DB, logs and `/me` | Exact safe actor, UUID, Argon2id verifier, SHA256 token digest, >=256-bit token length, seven-day stored lifetime, HttpOnly/Lax/root cookie; no email/password/token in logs; actor survives new DB connection |
| Atomic business; AC08 | Register new business | One business user/credential/business/active owner membership; no organiser membership |
| Normalized duplicates; AC08/10 | Case/trim username and email; case/collapsed-space business name repeat | Generic409, counts unchanged, no orphan business/owner |
| Injection/validation; AC04/05/07/08/10/11/19 | Extra role/businessId/membershipRole; invalid username/email/display/password | RFC9457 422 without input echo; all identity/business counts remain zero |
| Bounds and identifiers; AC10/11 | Password8/128 accepted,7/129 rejected; username3; username/email case/trim login | Correct password works untruncated; rejected inputs do not create records or change old credential |
| Generic login; AC11 | Unknown identity, wrong password, wrong valid selected role | Identical generic401 body; no response cookie; no secrets in logs |
| Origin; AC15 | Missing/null/hostile Origin for registration,login,logout,change-password | Generic403 before mutation, no Set-Cookie; existing sessions/verifier/counts unchanged and `/me` remains valid |
| Session expiry/logout; AC12/14 | Expire session in DB; logout and replay copied token through new client | Generic401 for expired/revoked sessions; logout204 and browser cookie cleared |
| Races/failure; AC08/10/19 | Two concurrent identical business registrations; PostgreSQL trigger rejects owner-membership insert | Exactly one201/one409 and complete winning business; forced failure503 redacted with no partial identity/business/cookie |
| CLI; AC05/09/16 | New event/organiser through real CLI process with runtime getpass interception; repeat; inactive membership; missing event; attendee collision | Idempotent counts/hash, no credential output, no inactive reactivation, invalid/colliding provisioning fails atomically without role escalation |
| Mandatory replacement; AC09/14 | Two organiser sessions, incorrect then correct current password | Workspace/event denied before change; wrong password preserves sessions; change rotates current token without extending expiry, revokes other/old token; initial password cannot replay |
| Permission freshness; AC04/06/13 | Test-only event/business routes; unrelated UUID, inactive membership, unauthenticated/attendee actor | Current role and membership enforced each call; next `/me` removes inactive membership; denial leaves identity/business state unchanged |
| Environment; AC12/15 | Isolated test/production-configured app process | Secure cookie outside development, no Domain; production uses explicit HTTPS trusted Origin |
| Audit; AC19/SEC11 | Registration, password replacement, logout, CLI provisioning | Attributable registration/password_change/logout actions with outcomes/timestamps; no passwords or contact payload |
| Migration; AC17 | `test_migrations.py` resets guarded test schema and upgrades from empty | Exact foundation+auth+audit tables; original reset/connection-separation safeguards retained |
| OpenAPI regression | `test_health.py` | Existing foundation routes retain GET behavior; six auth paths are present |

Frontend cases live in the four existing `frontend/tests/acceptance/*.test.tsx` files. `fixtures/auth.ts` supplies contract responses via fetch; `renderPrototype` requires `/me` restoration before examining UI. This detects the old browser-only app even if it renders a plausible form. The fixtures do not prove browser cookie enforcement or real frontend/backend integration.

- Role entry: three keyboard tabs, registration scope/direct organiser-route denial, required labels, backend login fields, returned actor role controls navigation, generic server failure, keyboard login/server logout, no browser credentials.
- Registration: both forms preserve required/error associations and lower bounds, exact backend payload excludes confirmation/authority, server failures preserve valid fields, keyboard correction, no browser-persisted secrets. Obsolete claims that registration saves no account are forbidden.
- Session/homes: unauthenticated and forged legacy browser state denied, server actor remount restoration, mismatch preserves verified actor, expired session remount denial, server logout/history, failed logout remains visible without claiming revocation, mandatory password replacement, no-active-membership state. Three role-card sets remain isolated and actions disabled; narrow keyboard access retained.
- Appearance: OS/saved mode palettes, immediate preference and persistence, light/dark accessibility labels, form retention, storage read/write/remove errors, role navigation and remount, all existing representative typography and card assertions retained. Actor fixtures replace obsolete prototype session assertions; appearance changes cannot alter server actor.

## Test change request AUTH-TCR-01

- Requester/designer `/root/auth_tests_v3`, 2026-10-19; requested by orchestrator under full human-approved real-auth implementation plan.
- Historical baselines: backend `08054b56c116c8ba5edd7c9b8890a42171af0fbd`; frontend `297b458774b857a9402eb7926f55b7fd9f948e20`; retained in prior run records. Parent base before this work `5c0ab1552d65bf400fbcc96fb99bde2b18da29ee`.
- Old expectations under dispute: OpenAPI has only three health/docs routes; migration has no domain tables; arbitrary nonempty credentials create a sessionStorage role; successful registration saves no account; authenticated appearance fixtures read prototype session bytes.
- Classification: approved requirement evolution, not an implementation defect. Human explicitly approved replacing synthetic authentication. Old tests would reject any compliant real authentication implementation.
- Correction: foundation endpoint assertions preserve existing methods while require auth paths; migration requires new agreed tables; server fixtures and API/state/security assertions replace browser authority and obsolete disclaimers. Appearance, typography, required/error associations, role scope, keyboard and disabled-feature coverage preserved.
- Independent assessment: security reviewer inspected and requested all-auth Origin, sanitized validation, Secure environment, audit and authority coverage; designer added them before freeze. Behaviour assessment and approval recorded by orchestrator in run record. No developer edits to baseline permitted.
- Test-owner correction commit/replacement baseline: orchestrator records immutable SHA after approval; original evidence remains historical. No permission to silently replace a later frozen baseline.

## Pre-implementation evidence and limitations

`uv run pytest tests/test_authentication.py -x -q` executed with the exact guarded local PostgreSQL target: migrations ran; real POST `/api/v1/auth/register/attendee` returned404 instead of201, 1 failed in1.11s. This is meaningful missing-behavior RED, not an import failure. A later `--collect-only -q` collected46 auth cases cleanly. Designer's final `npm test -- tests/acceptance/role-entry.test.tsx --reporter=dot` run produced11 RED in12.40s at the explicit missing `/me` restoration assertion; existing application never calls the backend. This supersedes orchestrator's earlier10-case run and demonstrates startup-contract RED only, not execution of every subsequent UI assertion. Full acceptance suite must run after implementation; no GREEN claim yet.

Scenario-only follow-ups: real browser frontend/backend cookie/CORS and keyboard journey; credentialed CORS preflight exact allowlist; password-policy upper bounds for every name/email/Unicode field; timezone/event duration/foreign-key/status catalog constraints and upgrade preserving pre-existing rows; audit-write failure atomicity; exact expiry equality controlled-clock boundary and non-sliding repeated `/me`; session refresh through server process restart; generated type/schema regeneration consistency; denied GET business/event resource state preservation through later actual domain write routes. These are not all executable assertions in this baseline. Reviewer should consider gaps against bounded readiness; remaining domain ownership/list/write/AI/exports and resource controls are explicitly deferred by revision3, and production isolation/rate limiting/recovery/deployment require later evidence. No claim of full AC01–03/domain AC06, online delivery, rate-limit or production release readiness.

No stale revision API exists in this auth slice; uniqueness/session rotation and retries represent concurrency. AI and external approvals are N/A. Human teammate review and human verification of the session summary remain required.
