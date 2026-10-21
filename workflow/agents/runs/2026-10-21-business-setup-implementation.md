# F06 phase3: booth/setup implementation

Owner: Isaac; date/timezone:2026-10-21 Asia/Singapore. Previous phase commit:`1aa821e`. Human verification:Pending.

## Authority and scope

Isaac approved defaults2/6: assigned organisers publish booth labels/plain-text setup details for accepted businesses, with updates/removal; no reservations, exclusive allocation or programme publication. Contract: [setup r1](../../../specs/business-preparation/assign-booths-and-publish-setup-details.md). RD01–07 remain authoritative. No push/merge/deployment.

## Actual pipeline and ownership

- Root orchestrator owns this run, index/architecture/spec evidence and conversation log.
- Analyst `/root/f06_sequence` previously checked future contract dependencies read-only; backend developer `/root/preparation_developer` proposed table/migration integration read-only. Prior security reviewer `/root/preparation_security` found no blocking contract issue. Neither is implementation evidence.
- Designer `/root/preparation_scenarios` owns `backend/tests/test_business_setup.py`, `frontend/tests/business-setup.test.tsx`, phase testplan and setup-schema TCR. Phase2 guard passed and commit completed before Phase3 test writes were signalled. No production ownership.
- Exact current-schema addition of literal `participation_setup` needs the documented TCR and independent approval; historical assertions/equality stay intact. Developer cannot edit baseline files.
- Independent adequacy reviews/baseline SHA and production developer handoff:pending. Implementation must wait for these gates.

Designer froze executable files for review. Meaningful preimplementation RED: accepted owned setup GET404;9 UI cases fail for absent controls/facts, not import/harness errors. Added afterward: private preparation invariance, business password-change read denial and10th malformed-response conceal/retry case (not executed yet). Populated migration/restart/browser remain deferred explicitly. `/root/phase2_final_behaviour` approved SETUP-TCR-01; test owner added only literal participation_setup to nonhistorical exact schema set. Actual behaviour adequacy review now assigned; security review awaits capacity rather than simulated approval. Previous final source full SHA:`1aa821ef1213830694150ab00c39a5c3a7482d8d`.

Actual independent adequacy reviewers `/root/phase2_final_behaviour` and `/root/phase2_final_security` requested bounded additions before approval: safe422 retains input without raw detail/success/replay; editing while confirmation remains open invalidates approval; first-save audit failure leaves no row/revision/audit; wrong event/participation response references never display private markers; all unauthorized errors omit currentRevision. Designer owns these deltas; no production edits yet. Both accepted explicit deferred populated migration/restart/browser and remaining context permutations. Frontend developer's read-only proposal uses child setup consumers/editors and a dedicated typed Auth map; root clarified domain request scope avoids existing organiser raw-detail fallback. Production handoff still awaits final approved baseline.

Both reviewers approved the final test-owner delta for baseline freeze (read-only, no execution claimed). UI16 cases; supplemental two behaviour additions failed on absent fields before four final security cases were added. Backend first-save audit and later private-preparation fixture additions remain unexecuted until implementation verification; not passing evidence.

Protected paths: `backend/tests`, `backend/pyproject.toml`, `backend/uv.lock`, `frontend/tests`, `frontend/src/WorkspaceHeader.unit.test.tsx`, `frontend/src/programmeTime.test.ts`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`, `tools/check_test_baseline.py`, `tools/verify.ps1`, `tools/tests`, `.github/workflows`, `workflow/agents/runs/2026-10-21-business-preparation-test-plan.md`, `workflow/agents/runs/2026-10-21-preparation-schema-tcr.md`, `workflow/agents/runs/2026-10-21-preparation-review-tcr.md`, `workflow/agents/runs/2026-10-21-business-setup-test-plan.md`, `workflow/agents/runs/2026-10-21-setup-schema-tcr.md`. Tests/fixtures/runner/configuration/discovery/CI/guard are protected, and full production diff review must check bypasses elsewhere. Immutable baseline SHA recorded after commit, before any developer edit.

## Verification

Backend uses isolated resettable5433 test DB, never retained5432 development DB. Do not overlap resetting suites. Full checks: backend venv Python `-m pytest tests unit_tests -q`; frontend `npm.cmd test` with process-local `NODE_OPTIONS=--no-experimental-webstorage`, then `npm.cmd run build`. Focused setup cases first. Guard includes all Phase2 paths plus new Phase3 plan/TCR; immutable SHA recorded before implementation.

Actual browser organiser-to-business publication, owned API/database restart without reseed, keyboard/focus, human/NVDA/400% and production delivery remain pending. No tests or feature completion claimed yet.
