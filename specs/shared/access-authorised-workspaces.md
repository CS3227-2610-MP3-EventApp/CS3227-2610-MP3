# Access authorised workspaces

| Field | Value |
| --- | --- |
| Stable capability ID | access-authorised-workspaces |
| Covered stories | [F10-US01](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 3 / In review |
| Product roles / roadmap | Attendee, organiser, business participant; [phase 1 foundation](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Dylan authorised the complete shared-authentication plan on 2026-10-19 and requested execution on a new branch from master. Revision 3 / CurrentActor v1 records that approved plan; routine wire details reviewed by orchestrator and independent security reviewer. Test-baseline gates remain separate. |
| Review / run record | [Shared-authentication run](../../workflow/agents/runs/2026-10-19-shared-authentication.md); independent specification/test review pending |

Sources: [spec standard](../README.md), catalogue, [RD01–RD07](../../docs/project.md#accepted-review-decisions), [security](../../docs/security.md), [architecture](../../docs/architecture.md), and the requesting teammate's 2026-10-19 approved implementation plan relayed by the orchestrator. This revision selects application-owned FastAPI/PostgreSQL authentication and supersedes the earlier provider-dependent provisioning/expiry assumptions.

## Product outcome, users and scope

Signed-in users reach only workspaces allowed by verified identity and current membership. The foundation slice supplies attendee registration, atomic new-business/initial-owner registration, trusted-operator organiser/event CLI provisioning, password replacement, persisted cookie sessions, CurrentActor v1 and reusable server permission dependencies. Each user has one product role: `attendee`, `organiser` or `business`. Username and email are globally unique across roles in their respective namespaces. Business names are globally unique after normalization. Organiser authority is event-scoped; business membership is business-wide (RD01).

Excluded: public organiser registration, administrative UI or fourth product role, invitations/additional members, ownership transfer, multiple product roles, password recovery, email verification, domain editing endpoints and AI. AC01–03 and downstream portions of AC04/06 remain required but deferred to their domain capabilities. The slice proves common guards through test-only routes; it does not claim real programme/planning/business/AI authorization is delivered. The [role-entry prototype](preview-role-entry-and-workspaces.md) is presentation evidence only. This capability contributes SDD/multi-agent/security evidence but supplies no mandatory role LLM feature or online-production claim. Rate limiting, recovery and deployed environment checks remain production prerequisites.

## Use cases and user interface

Attendee registration accepts username, email, display name and password; business registration additionally accepts a new business name. Both sign the registrant in. Login accepts username or email, password and the selected role tab; the stored role must match. The trusted CLI operator supplies each organiser's initial password through runtime `getpass`, with explicit event memberships. This replaces the earlier super-organiser/provider direction; no privileged public registration exists.

React bootstraps identity with `/me`, uses returned role/memberships and generated OpenAPI types, and never restores authority from prototype browser storage. Mandatory-change organisers see the password-change form before a workspace; `/me`, change-password and logout remain available. Organisers without active events and business users without active business membership cannot enter their workspace. Forms expose labels, keyboard access, pending/error states and recoverable failures. Logout waits for server success; failed logout must not claim revocation. Passwords, tokens and full registration payloads are not persisted in browser storage or logged.

## Inputs, outputs and functional contract

JSON fields are camelCase and extra request fields are rejected. UUID strings identify entities. Username: trimmed, 3–32 ASCII `[A-Za-z0-9_.-]+`, lowercased; `@` is forbidden to separate username/email login namespaces. Email: trimmed valid email, at most 254 characters, casefolded for storage/comparison. Display name: trimmed 1–100 characters. Business name: NFKC, collapse whitespace to single spaces, trim, 1–160 characters; its casefolded form is unique. Passwords: 8–128 characters, with no trimming, conversion or truncation; store only Argon2id verifiers. Login identifiers are trimmed/casefolded, selecting email when containing `@` and username otherwise.

CurrentActor v1 is returned directly, without an envelope, by registration/login/me/password-change:

```json
{"id":"UUID","username":"example","displayName":"Example","role":"organiser","mustChangePassword":false,"eventMemberships":[{"eventId":"UUID","role":"organiser","status":"active"}],"businessMemberships":[]}
```

Both membership arrays are always present, unique and ordered by resource UUID string. Only current active memberships appear. Business entries are `{businessId,businessName,role:"owner",status:"active"}`. Attendees have empty arrays; organisers have no business memberships; business users have no organiser memberships. Actor data contains no email, verifier, session ID/token/hash or inactive membership. Rebuild it from current database state on every authenticated request.

All paths below have prefix `/api/v1/auth`; all auth responses including errors use `Cache-Control: no-store`.

| Method / path | Input | Success |
| --- | --- | --- |
| POST `/register/attendee` | `{username,email,displayName,password}` | `201` actor; atomic user/credential/session, no memberships |
| POST `/register/business` | Same plus `businessName` | `201` actor; atomic business-role user/credential/new business/active owner membership/session |
| POST `/login` | `{identifier,password,role}` | `200` actor and fresh cookie; valid stored credential and matching role required |
| GET `/me` | Cookie | `200` actor, including mandatory-change actors |
| POST `/logout` | No body | `204`; revoke presented valid session and expire cookie; absent/invalid session also `204` |
| POST `/change-password` | `{currentPassword,newPassword}` and cookie | `200` actor; replace verifier, clear mandatory-change, revoke other sessions and rotate current token retaining its existing expiry |

Successful login/registration revokes any presented session and creates a fresh one; other sessions survive. Invalid/duplicate/failed requests preserve credentials, sessions and memberships except permitted audit records. Concurrent uniqueness conflicts roll back the losing registration without orphan records. Business registration cannot select existing business IDs or elevated roles. A wrong valid selected role shares the unknown-account/wrong-password error; a malformed role is validation failure.

Sessions use at least 256 cryptographically random bits; only the SHA-256 token digest persists. Cookie `eventapp_session` is HttpOnly, SameSite=Lax, Path=/, no Domain, Secure outside development, with seven-day/604800-second lifetime. Expiry is absolute from creation, not extended by `/me`; `now >= expires_at` fails. Rotation makes the old token unusable. Revoked/expired/malformed/unknown cookies fail authentication; valid sessions survive fresh API/database connections.

Settings: `ENVIRONMENT` = `development` (default), `test` or `production`; `TRUSTED_ORIGINS` is a JSON list of exact origins, defaulting in development to `http://localhost:5173` and `http://127.0.0.1:5173`. Production requires explicitly configured HTTPS origins; no wildcard/null/path URL. Every mutating auth request, including login/register/logout, requires matching Origin; missing/null/mismatch gives 403 before credential checks or state/cookie mutation. Credentialed CORS allows only configured origins. GET `/me` does not require Origin.

Errors are `application/problem+json`, RFC9457 `{type:"about:blank",title,status,detail,instance,code}`; title is the HTTP reason phrase, instance the path without query. Exact codes/details:

| Status | Code | Detail |
| --- | --- | --- |
| 401 | `invalid_credentials` | `Invalid credentials.` (unknown identity, wrong password/role/current password) |
| 401 | `unauthenticated` | `Authentication required.` (missing/invalid/revoked/expired session) |
| 403 | `forbidden` | `Access is not permitted.` (Origin/role/membership denial) |
| 403 | `password_change_required` | `Password change required.` (mandatory-change protected access) |
| 409 | `registration_conflict` | `Registration could not be completed.` (any username/email/business-name duplicate) |
| 422 | `validation_error` | `Request validation failed.` |
| 500 | `internal_error` | `Request could not be completed.` |
| 503 | `service_unavailable` | `Request could not be completed.` (storage unavailable/transaction failure) |

No error echoes password, token, hash, validation input, database URL or trace. Audit/log output excludes secrets and unnecessary contact payloads. No claim of timing-enumeration resistance or deployed abuse controls is made.

## Constraints, security and non-functional requirements

[SEC01, SEC02, SEC08, SEC11 and SEC12](../../docs/security.md) apply. Shared guards check the current stored role, mandatory-change flag and membership on every request. Membership deactivation affects the next protected call with the same session. Test-only routes prove this slice; list/detail/search/write/export/AI/job integration remains required in later capabilities. Denied operations preserve domain state. Sensitive authentication/provisioning/password/logout outcomes create minimal attributable audit records (action, known resource/actor, outcome, time), without secrets/email/request payloads. Required success audit writes commit atomically with the sensitive change. Separate development/production identities, credentials and data are mandatory.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| access-authorised-workspaces-AC01 | Given a verified attendee, own bookmarks, preferences and itineraries are accessible; another attendee's records are absent from list/detail and cannot be changed. | F10-US01; SEC01/02 | Direct own/wrong-owner reads and writes; before/after state |
| access-authorised-workspaces-AC02 | An active organiser can manage programme and submitted review records for assigned event A; the same calls for B fail without changing B. | F10-US01; SEC01 | Cross-event list/detail/write requests |
| access-authorised-workspaces-AC03 | An active member of business X participating in events A and B can access X's workspaces in both within their role; inactive members and business Y members cannot, and organiser access alone cannot read X's private records. | F10-US01; RD01; SEC01/02 | Two-event synthetic fixture and role matrix |
| access-authorised-workspaces-AC04 | Unauthenticated, inactive or forged-client-role requests are denied at the server boundary; no protected record or credential is returned and no domain state changes. | F10-US01; SEC01/02 | Direct API requests and before/after comparison |
| access-authorised-workspaces-AC05 | Only a trusted CLI operator can create organiser identities and explicit event memberships; public registration/role selection cannot grant them; failed provisioning leaves identity/membership state unchanged. | F10-US01; SEC01/11 | CLI boundary, missing events, forged fields and public organiser registration attempts |
| access-authorised-workspaces-AC06 | A membership revocation prevents subsequent reads, writes, AI job access and action execution for that scope, including access via previously selected UI context. | F10-US01; RD07; SEC01/07 | Revocation between requests and execution |
| access-authorised-workspaces-AC07 | Successful attendee self-registration creates an attendee identity without organiser or business authority; duplicate, invalid or failed registration creates no partial account or membership and returns a privacy-safe result. | F10-US01; SEC01/02/08 | Registration success/failure and account-enumeration checks |
| access-authorised-workspaces-AC08 | Successful business-owner registration atomically creates a new business and the verified registrant's active initial-owner membership; the request cannot select an existing business or organiser authority, and failure leaves neither record. | F10-US01; RD01; SEC01/02/11 | Atomic creation, injected business/role and failure checks |
| access-authorised-workspaces-AC09 | CLI organisers must replace their initial password before workspace access; successful replacement makes the initial password unusable and revokes other sessions. Passwords remain runtime-only Argon2id verifiers; revision 3 supersedes the earlier separate temporary-password expiry promise. | F10-US01; SEC01/02/08/11/12 | Mandatory-change guard, old-password replay, verifier/log inspection |
| access-authorised-workspaces-AC10 | Normalization and global uniqueness hold across roles/businesses; 8/128-character passwords succeed and 7/129 fail without truncation or partial records. | F10-US01; SEC02/08 | Case/spacing/Unicode variants, concurrent conflicts, bounds |
| access-authorised-workspaces-AC11 | Username/email login requires correct stored password and role; unknown identity/wrong password/wrong valid role yield identical generic 401 bodies. Extra authority fields fail validation. | F10-US01; SEC01/02 | Identifier/role/error matrix |
| access-authorised-workspaces-AC12 | Approved cookie flags and seven-day absolute expiry are enforced, token storage is digest-only, and persisted sessions survive fresh API/database connections. | F10-US01; SEC08/12 | Cookie inspection, controlled expiry boundary, real PostgreSQL reopen |
| access-authorised-workspaces-AC13 | `/me` returns exactly safe CurrentActor v1 and only current active memberships; the next request reflects revocation without exposing credentials/private contact data. | F10-US01; SEC01/02/08 | Actor shape, membership update and response inspection |
| access-authorised-workspaces-AC14 | Logout is idempotent and prevents replay; password change rotates the retained current session without extending expiry, revokes others and preserves state on incorrect current password. | F10-US01; SEC01/08/11 | Two sessions, token replay, before/after state |
| access-authorised-workspaces-AC15 | Every auth mutation rejects missing/null/wrong Origin without state/cookie changes; credentialed CORS is explicit; Secure applies outside development. | F10-US01; SEC01/12 | Origin and environment matrix |
| access-authorised-workspaces-AC16 | Event/organiser CLI provisioning is atomic and idempotent, uses runtime getpass, rejects missing events/conflicting identities/invalid event times or timezone, and commits no default credential. | F10-US01; SEC01/08/11/12 | Replay, CLI credential inspection, rollback and event validation |
| access-authorised-workspaces-AC17 | UUID/FK/uniqueness/status constraints work in real PostgreSQL; additive migrations upgrade foundation data and users/businesses/memberships/sessions persist across a connection lifecycle. | F10-US01; SEC12 | Fresh/upgrade migration, catalog and reopen/read |
| access-authorised-workspaces-AC18 | React consumes generated OpenAPI types and credentialed APIs for registration/login/bootstrap/logout/password change; forged prototype storage grants no access; required-change/no-membership/server-failure states are visible. | F10-US01; SEC01/02/08 | API-backed UI tests plus manual keyboard/browser cookie checks |
| access-authorised-workspaces-AC19 | Errors/logs/audit entries exclude secrets; minimal attributable audit entries persist; validation/conflict/storage failures preserve other state. | F10-US01; SEC02/08/11/12 | Problem/log/audit inspection and forced failure |

## External interfaces and dependencies

Produces CurrentActor v1 above; [architecture](../../docs/architecture.md#shared-authentication-foundation-contract) records physical tables, CLI and reusable dependency signatures. The FastAPI OpenAPI document describes auth inputs, actor/problem responses and cookie security; generated React types use that schema. Existing health routes retain their historical foundation semantics. CLI events have UUID/title/IANA timezone/offset-aware start/end (`end > start`), not programme publication. Business registration creates no event participation. Later domain contracts must integrate real ownership/membership guards; fixtures do not establish that integration.

## Decisions and approval

| Decision | Options / proposed direction | Owner | Blocks | Resolution |
| --- | --- | --- | --- | --- |
| A-01 | Application-owned FastAPI/PostgreSQL auth; trusted organiser/event CLI, runtime initial password and mandatory replacement; separate initial-credential expiry superseded | Requesting teammate | Resolved for foundation slice | Full implementation plan authorised 2026-10-19; readiness recorded before implementation |
| A-02 | One product role; unique normalized username/email/business name; attendee/new-business-owner registration; invitations/transfer/additional membership excluded | Requesting teammate | Resolved for foundation slice | Full plan authorised 2026-10-19; readiness recorded before implementation |
| A-03 | Attendee programme browsing requires sign-in; private domain denied-vs-absent semantics stay with their domain contracts | Requesting teammate / domain owners | Later private-domain visibility only | Sign-in direction confirmed 2026-10-19; domain contracts pending |
| A-04 | Seven-day opaque cookies, SHA-256 digest storage, Argon2id 8–128 passwords, Origin check, password change retains current session/revokes others | Requesting teammate | Resolved for foundation slice | Full plan authorised 2026-10-19; readiness recorded before implementation |
| A-05 | Exact wire/error/normalization/cookie/dependency/CLI details and minimal SEC11 audit table complete the approved plan | Orchestrator / affected contributors | Resolved for foundation slice | Routine completion and independent pre-implementation reviews recorded 2026-10-19 |

## Verification and evidence

Implementation snapshot `e202ea95747a4c831cac7bb0d251c856a166d818` received independent behaviour and security approval. The protected baseline is `d60152a1b7ad78c90b5a7b26499eb1cb6b63e151`; earlier baselines and approved test corrections remain in the [run record](../../workflow/agents/runs/2026-10-19-shared-authentication.md). Fresh full runs passed 65 backend tests and 75 frontend tests; frontend build, baseline integrity, generated-contract checks and dependency audits passed. Real HTTP through Vite exercised all three identities, cookies, Origin/CORS, logout replay and password replacement. The same persisted identity/session survived both a real backend-process restart and PostgreSQL-container restart.

| Criteria | Evidence / boundary |
| --- | --- |
| AC04–06 | Direct test-only server routes exercise real role, event/business membership, mandatory-change and next-request revocation guards. Actual domain/list/write/AI integration remains deferred. |
| AC05, AC07–11, AC14, AC16 | Real PostgreSQL registration, conflicts/races/rollback, CLI provisioning and password/session tests; same-password replacement and whitespace-confirmation regressions pass. |
| AC12–13, AC15 | Cookie, safe actor, absolute expiry and origin/environment tests; network CORS and backend/database restart smoke checks passed. Browser-enforced behaviour remains for human testing. |
| AC17 | Empty-database migration test, UUID/FK/status/uniqueness constraints and restart persistence; no production data/migration claim. |
| AC18 | Generated API types, 75 UI tests and build pass; human browser/visual/keyboard verification pending. |
| AC19 | Success and selected denied-outcome audits, generic errors, log/response redaction and failed-write state preservation tested. Audit storage failure has a generic warning fallback; malformed/Origin-denied requests deliberately perform no database writes. |

AC01–03 and downstream portions of AC04/06 remain explicitly deferred to their domain capabilities. Human browser checks were not performed after Safari access was denied. Human teammate review and [session-summary verification](../../logs/dylan/2026-10-19-shared-authentication.md) remain pending, so the capability stays In review. Rate limiting, recovery, online delivery and production environment separation remain later obligations.

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft | Approval and verification pending |
| 2 / 2026-10-18 | Recorded bounded attendee/business self-registration and controlled organiser-provisioning decisions; linked the presentation-only prototype and added AC07–09 | Full revision/provider contracts, approval and verification remain pending |
| 3 / 2026-10-19 | Specified approved application-owned auth slice and CurrentActor v1; added AC10–19; retained AC01–09, deferring downstream checks and replacing AC05/09 provider/expiry assumptions with CLI/mandatory replacement | Full plan authorised; exact readiness/review and all runtime evidence pending; historical revision 2 preserved |
| 3 evidence update / 2026-10-19 | Implemented foundation, completed protected tests, independent same-commit reviews and local proxy/restart checks | In review; human/browser/downstream and production obligations remain explicit |
