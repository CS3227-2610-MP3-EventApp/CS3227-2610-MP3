# F06 phase implementation run

- Human owner: Isaac; date/timezone: 2026-10-21, Asia/Singapore.
- Branch: `itzxitzx/basic-business-features`; initial implementation base: `4b525f1`.
- Phase 1 checkpoint `cf63022` records existing implementation and pending human review; not Completed.

## Approved product direction

Isaac approved Phase2 revision2 with quantity up to 1,000,000 and price up to 1,000,000,000. The orchestrator explicitly interpreted this as SGD/unit in the response, consistent with its original approval question's currency wording; minor-unit maximum 100,000,000,000. Aggregate totals therefore use exact decimal strings, not lossy JSON numbers. All other manual preparation defaults remain approved. Exact approved amendment is recorded in revision3.

Isaac approved defaults2/3/5/6: assigned organisers assign accepted businesses a booth label and published plain-text setup instructions, later revision-checked updates/removal, no programme publication/reservation. AI reuses configured SoCLaaS, synthetic dev/test only, minimal outbound fields excluding business identity/contact, production disabled. Editable AI task/estimate drafts remain separate; adoption previews selected items, appends explicitly, never overwrites and rechecks setup/preparation revisions. Existing foundation usable while human gates stay pending. Spec amendments, tests/reviews, additive migrations, implementation, logs and local commits authorised; push/merge/deployment excluded.

Isaac approved limits with `SOCLAAS_REQUESTS_PER_MINUTE=30`: 10 jobs/owner/UTC day, one active job, 60s provider timeout, 180s overall, 30-day terminal job/draft retention and existing bounded cancellation/retry. No provider-side retention guarantees inferred.

## Actual assignments and handoffs

- Root orchestrator coordinates contracts, baseline commits, integration and logs. No developer may alter protected tests/configuration/fixtures.
- `/root/f06_sequence` specification analyst: sole initial Phase2 spec amendment ownership to r3; product approval recorded separately from implementation/test evidence.
- `/root/preparation_scenarios` test designer: owns new backend/frontend preparation acceptance files and phase test plan only; independent pre-implementation scenarios/tests, no production edits. Based on r3; reviews and baseline pending.
- Independent behaviour/security adequacy and implementation reviews follow against named snapshots; actual results appended as received. Developer handoff awaits approved baseline.

Phase2 prebaseline findings: both reviewers required odd-valued huge totals (round maximum could hide float corruption), revoked-owner writes and real foreign-row IDs. Behaviour review additionally required preparation-aware no-write snapshots, existing-update CAS, audit attribution and UI canonical-ID/revision adoption, mismatch/validation/access/context races. Designer owns all corrections. Root corrected an analyst contract mismatch before baseline: unit price remains a bounded numeric JSON integer, only aggregate totals are strings; misleading exact-written-approval wording corrected to Isaac's r2-plus-amendment authority. The analyst was interrupted and root took amendment ownership; no production implementation yet.

Developer `/root/preparation_developer` completed a read-only implementation proposal: one module-owned `preparation_documents` aggregate table, participation-row serialization without changing participation revision, exact Python/BigInt arithmetic. No code/tests changed by developer. Its new table requires a prospective compatibility TCR for the existing exact-head-schema assertion; independent behaviour reviewer approved adding only its literal name to the nonhistorical expected set, preserving exact equality/historical constraints. Test owner performs the correction, not developer; no fabricated observed failure. Actual correction and replacement baseline recorded below.

## Evidence and limitations

### Phase2 reviewed baseline

Both independent final adequacy reviews approved the corrected scenarios/assertions. Designer ran meaningful RED: real authenticated preparation GET404 instead of200, and9 UI cases missing the unimplemented route. Syntax/whitespace checks pass. No RED result is represented as passing implementation evidence. Plan/TCR own the detailed cases and correction history.

Protected paths for the upcoming immutable baseline: `backend/tests`, `backend/pyproject.toml`, `backend/uv.lock`, `frontend/tests`, `frontend/src/WorkspaceHeader.unit.test.tsx`, `frontend/src/programmeTime.test.ts`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`, `tools/check_test_baseline.py`, `tools/verify.ps1`, `tools/tests`, `.github/workflows`, `workflow/agents/runs/2026-10-21-business-preparation-test-plan.md`, `workflow/agents/runs/2026-10-21-preparation-schema-tcr.md`. This includes all acceptance fixtures, setup, discovery/runner/configuration and guard; full diff review must also check runtime bypasses. Developer has no write ownership of these paths.

Commands: backend venv Python `-m pytest tests unit_tests -q` with documented distinct development5432/test5433 URLs, reset flag and process-local PYTHONPATH; frontend `npm.cmd test` with process-local Node26 `--no-experimental-webstorage` compatibility, then `npm.cmd run build`. Focused suites run first. Baseline guard: `python tools/check_test_baseline.py --baseline FULL_SHA --paths` followed by the protected paths above. Immutable SHA will be recorded before developer assignment.

Baseline SHA/protected paths/commands: pending test design and independent adequacy review, before developer assignment. Human teammate/accessibility/summary verification remains pending throughout; no completion or deployment claim. Use actual test outputs and explicit real integration limitations. Sandbox shell startup requires reviewed elevated execution; read/write scope remains the repository/local synthetic test environment.
