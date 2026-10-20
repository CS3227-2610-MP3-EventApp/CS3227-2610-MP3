# Organiser programme: pre-implementation record

## Scope and ownership

- Source: local master `07a5666b7ebb80ef462025fbfa1798c9676f1ee8`; branch `feat/organiser-programme`.
- Contract: [create-and-publish-programme revision 6](../../../specs/programme/create-and-publish-programme.md), exact written revision approved by Dylan's “yes” on 2026-10-20; pre-implementation test gates remain separate.
- Dylan owns organiser delivery; attendee screens remain teammate-owned. The selected branch supplies the shared published read API.
- Session evidence: [Dylan's summary](../../../logs/dylan/2026-10-20-organiser-programme.md).

## Actual handoffs

| Agent | Assignment / write ownership | Result |
| --- | --- | --- |
| `/root/programme_spec_r6` | Specification analyst; only programme Draft | Wrote revision 6; retained all AC IDs; returned pending exact-revision approval, no application/test edits |
| `/root/programme_scenarios` | Test designer; read-only drafting analysis | Scenario analysis below; no executable tests, execution or baseline |
| `/root/programme_draft_behaviour` | Behaviour verifier; read-only revision-6 Draft review | No blocking behavioural contradiction found; exact-revision approval and executable test adequacy review remain pending |
| `/root/programme_draft_security` | Security reviewer; read-only revision-6 Draft review | No blocking written security inconsistency; Origin/CORS integration, current-session revocation, concealment and real publication races require executable coverage |

The generic subagent tools were used with the repository role definitions. The specification analyst was escalated for shared-contract complexity using the inherited session model; no custom-role runtime discovery or exact inherited model identity is claimed. Independent reviewers explicitly requested `gpt-6.1-sol` / high. Subsequent developer preparation remained read-only until the baseline gate below.

## Independent planned scenarios

The test designer inspected existing PostgreSQL and frontend harnesses, revision 5 and the approved plan before executable tests exist. These are planned checks, not test results:

| Criteria | Planned observable evidence |
| --- | --- |
| F01-AC01 | Real authorised venue → room → complete draft journey; fresh reads preserve fields, IDs, revisions and event ownership |
| F01-AC02 | Every protected read/write across unauthenticated, wrong-role, wrong-event, revoked-member and mandatory-password-change actors; denied mutations preserve state; trusted-Origin enforcement |
| F01-AC03; AC10 | Required/enum/currency/integer/time/event/capacity boundaries; wrong-event references; unknown accessibility; overlapping same-room items accepted; validation never publishes |
| F01-AC04 | Explicit publication returns exact immutable published facts; saving does not expose drafts; independent authenticated attendee reads |
| F01-AC05 | Draft-only events absent; draft IDs concealed; no private/audit fields; literal title search, combined type/date filters, timezone-midnight cases and stable pagination |
| F01-AC07 | Stale update/delete/publish races, repeated publication, published read-only state, location locks and safe deletion; real independent-connection parent-edit/publication races |
| F01-AC07/08 | Inject transaction failure and compare persisted state before/after; successful retry creates one publication/success audit; protected audit reads |
| F01-AC06 | Empty migration and populated auth-only upgrade; real API/database restart retaining fresh IDs, not just reconstructed clients |
| F01-AC09 | Actual deployed separate-session journey; deferred, not established by local tests |
| UI contract | Event switching clears stale selections; field errors/conflicts; explicit publish/delete confirmation; event-zone conversions including DST; keyboard/focus, narrow viewport and both themes |

AC10 denotes `create-and-publish-programme-AC10`. Tests will use real PostgreSQL and real authentication for server-boundary evidence. Reviewed frontend HTTP fixtures may support component checks but do not establish end-to-end delivery.

## Test-owner changes required before baseline

1. `backend/tests/test_migrations.py`: retain exact catalogue assertion with added programme tables; add auth-preserving migration evidence.
2. `frontend/tests/acceptance/session-and-homes.test.tsx`: organiser gains one active Programme Management action and retains two disabled previews; attendee/business retain three previews.
3. Review guarded fixture cleanup: auth fixtures truncate parent tables with CASCADE; programme fixtures must not depend on suite order.

Handle these through the repository's test-change process and independent assessment, not developer edits to protected tests. Exact revision approval precedes executable acceptance-test authoring and baseline freezing. No baseline SHA exists for this capability yet.

## Verification status

Only documentation preparation is underway. No feature implementation, application tests, runtime/browser checks, migration, production build, deployment, push or merge has been performed. Human teammate review and summary correctness verification remain pending.

Both independent Draft reviews found no blocking contract contradiction. They do not approve product behaviour or the future executable baseline. The security reviewer specifically observed that current middleware checks Origin only on auth routes and CORS allows GET/POST; the implementation must extend those controls and test PATCH/DELETE preflights. Draft scenario coverage is preparation only; detailed executable tests still require separate adequacy review.

## Approved revision and executable-test preparation

### Frozen baseline and developer handoff

Baseline: `0fdaa08f623dc4202e51e360293affec2938928d`. Human product approval is Dylan's exact-r6 “yes”; static test adequacy is accepted by the behaviour reviewer (backend/UI) and security reviewer (backend). Protected paths: `backend/tests`, `backend/pyproject.toml`, `backend/uv.lock`, `frontend/tests`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`, `tools/check_test_baseline.py`, `tools/tests`, `AGENTS.md`, `workflow/agents/README.md`, `workflow/agents/runs/2026-10-20-programme-test-plan.md`, `workflow/agents/runs/2026-10-20-programme-test-changes.md`.

Commands: guarded `uv run pytest` in backend; `npm test` and `npm run build` in frontend; `python3 -m unittest discover -s tools/tests -v`; `python3 tools/check_test_baseline.py --baseline <full SHA above> --paths <each protected path above>`. Root's guard-tool suite passed 9 tests. Use the approved local synthetic test URL and reset flag from DeveloperGuide. For the orchestrator's run, DATABASE_URL was a non-routable identity marker (loopback port 1, never connected); conftest validated separation then replaced it with TEST_DATABASE_URL before app imports. No production/dev target was contacted. Full credential-bearing marker URLs are deliberately omitted from prose to preserve the tracked-secret scanner's allowlist.

Backend and frontend developers receive disjoint application-file ownership and GO only after this record is written. They cannot edit protected tests/configuration or baseline references. Root coordinates generated API artifacts and docs. No dependency additions are planned.

Replacement baseline: `0c71a03f345ba15da48ea9536546eedae10c5b6b`, same protected path set and commands. The original `0fdaa08f623dc4202e51e360293affec2938928d` remains historical. Reason: the appearance test also contained the obsolete all-three-previews status text. The independent behaviour reviewer confirmed the defect; the test owner changed only role-aware expected text, retaining minimum sizing and all other assertions. The replacement commit contains only that test and its TCR record, not in-progress application code.

Dylan approved the exact written revision 6 including API shapes, bounds and filters on 2026-10-20. `/root/programme_scenarios` then authored [the test plan](2026-10-20-programme-test-plan.md), [owner change requests](2026-10-20-programme-test-changes.md), PostgreSQL acceptance tests and the approved-scope migration/home expectation updates. `/root/programme_ui_test_owner` was separately assigned only the expanded frontend programme tests. Both designer roles used actual delegated agents; no production ownership.

Initial adequacy reviews withheld approval: invalid `revoked` fixture status (existing schema uses `inactive`), missing mutation permissions/cross-event cases, weak before/after snapshots, incomplete publication-parent race design, rollback snapshot counts, business migration preservation and missing core UI interactions. Test owners corrected these; no production developer edited tests. Backend design rereview was accepted by both reviewers, including explicit remaining race execution gates. Expanded UI adequacy remained a separate check.

`/root/programme_backend` and `/root/programme_frontend` performed read-only preparation with explicit prohibition on application writes until baseline GO; Sol/high escalation was selected for shared contracts, migration, auth and integration complexity.

Docker Desktop was initially stopped. The orchestrator started it and only Compose `test-db`, leaving unrelated containers alone. A rejected test command did not run; the accepted command used a non-routable development-identity marker and independently guarded `eventapp_test` target. `tests/conftest.py` validates distinct identities and switches DATABASE_URL to TEST_DATABASE_URL before app imports. PostgreSQL red execution reached venue creation and failed expected 201 versus missing-route 404 (1 failure, `-x`), proving the existing harness/auth setup ran, not proving every later assertion. Frontend initial entry/home tests produced 4 expected failures and 20 passes before expanded UI cases. No application implementation had started at those red snapshots.

## Implementation and first verification results

The earlier preparation-only status above describes the initial gate, not the current implementation state. Backend and frontend agents implemented disjoint application paths after baseline GO. No protected tests/config/dependencies were edited by developers. Root generated OpenAPI and TypeScript together; initial export lacked the required database setting, so the successful export used the non-connected identity marker.

- Backend developer: 104 PostgreSQL tests passed, including empty/populated-auth migration, domain APIs, permissions, Origin/CORS, publication race, snapshot/audit rollback and current-parent revalidation; one existing Starlette/httpx deprecation warning. Initial broad failure was a nullable accessibility validator constraint and a credential-shaped documentation marker rejected by the existing scanner. Both were corrected without weakening tests. Final list/date filtering and pagination execute in SQL.
- Frontend developer: 91 tests passed, production build passed; timezone helper has 5 developer-owned unit cases outside the protected baseline. First run had four UI defects and the obsolete appearance expectation; UI defects were fixed, the test owner handled the independently approved expectation correction. Dialog cancellation unmounts immediately; conflict reload remains available.
- Dependency checks: `uv pip check` passed (34 packages), npm audit reported 0 vulnerabilities, isolated pip-audit reported no known vulnerabilities. An unsupported initial audit flag was corrected; no dependency/lockfile changes.
- Tooling: baseline guard passed replacement SHA and all protected paths; guard-tool tests passed 9; agent-setup/local-link validator passed. Generated artifacts are rechecked after final schema changes.
- Browser attempt: temporary Vite server started, but CUA reported IAB unavailable and no available browsers. No Safari access was attempted. The temporary server was stopped. Visual/manual browser evidence remains pending.

Root is freezing the implementation snapshot for independent behaviour/security reviews. Additional race scenarios, real restart evidence, deployed attendee UI integration and human teammate/summary review remain distinct gates. No push, merge or deployment is authorised or performed.
