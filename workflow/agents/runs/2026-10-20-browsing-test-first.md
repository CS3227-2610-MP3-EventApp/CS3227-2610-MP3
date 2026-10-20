# Attendee browsing test-first run

- Date/timezone/owner: 2026-10-20, Asia/Singapore; Yik Bing.
- Branch/base: `feat/yikbing-programme-browsing`, `07a5666b7ebb80ef462025fbfa1798c9676f1ee8`.
- Task: F01-US03 fixture-backed attendee frontend; read contract revision 7 accepted by Yik Bing and recorded in specification revision 8. Full shared capability remains Draft, publication owner/contributor agreement unresolved.
- Authority: requester confirmed scope, fixture-backed progression and test-first workflow, then instructed proceed. This is not approval of remaining organiser-write policy or deployed/backend enforcement.
- Baseline: not yet frozen. Original authentication protected baseline remains `d60152a1b7ad78c90b5a7b26499eb1cb6b63e151`; its historical evidence is preserved. New suite additions and BROWSE-TCR-01 correction require independent recheck before replacement baseline.

## Actual delegation and ownership

- `/root` coordinates; edits specification approval/index/log/run evidence only. No production implementation authored.
- `/root/browse_scenarios`, GPT-6.1 Sol/high, actual test_case_designer: owns new `frontend/tests/acceptance/programme-browsing.test.tsx`, `frontend/tests/fixtures/programme.ts`, [test plan](2026-10-20-browsing-test-plan.md), [change request](2026-10-20-browsing-test-change.md) and the independently approved narrow old role-home correction. Existing fixtures/helpers/configuration otherwise read-only.
- `/root/browse_behaviour_review`, GPT-6.1 Sol/high: independent adequacy/coverage and test-change assessment. No edits to reviewed suite/application.
- `/root/browse_draft_review`, GPT-6.1 Sol/high: independent security adequacy and test-change assessment. No edits to reviewed suite/application.
- No developer assignment yet. Generic actual agents used with supplied repository roles; runtime native custom-role discovery not claimed. No nested agents.

## Handoffs and review findings

Designer found historical three-disabled-action assertion conflicts with approved Browse Programme scope. Both reviewers classified this as authorized requirement evolution, not a product bug; require designer-owned narrow correction, retain other previews/role/auth/isolation checks and preserve old baseline. TCR records authorization before edit.

New-test independent review caught home-only guards missing direct URL risks, insufficient account-switch settlement, stale-results interaction assumption, overprescribed include-only credential mode, ambiguous capacity selector, positive deep-link timezone gap and missing all-five-type filter coverage. Designer owns corrections before baseline. Security review accepted final race/fixture boundaries, conditional on final correction/execution review; behaviour review requested deep-link/all-type additions. Final reviewer rechecks and actual snapshot execution must be recorded before any freeze.

## Commands and evidence

Locked dependencies installed with `npm ci --ignore-scripts`; 249 packages, audit zero known vulnerabilities. No manifest/lockfile changes. System Node20.19.0 and bundled Node24.19.0 differ; actual command recorded with each result.

First normal original75-suite execution: sandbox esbuild spawn EPERM, retried with subprocess permission; then52passed23failed, primarily5s timeouts/duplicate DOM cascades. Serial WIP98-suite:56passed42failed202.05s, not final-snapshot evidence. No test expectations/config were weakened. Independent behaviour reviewer allowed separate clearly labelled runtime/timeout diagnostic with same assertions; permanent command decision is not inferred from that permission. Focused final-suite RED, baseline and original-regression results pending.

## Deferred verification and completion

This suite checks real React application behaviour with mocked HTTP only. Server role/draft visibility, search/date/query enforcement, no-store headers, PostgreSQL writes/restarts, real publication integration and online/browser checks remain deferred as mapped in the test plan. Fixtures are not a production fallback. No backend, migration, feature code, push/PR/merge/deployment or full capability completion is claimed.

Session summary: [preparation and test-design continuation](../../../logs/yikbing/2026-10-20-programme-browsing-preparation.md). Human correctness verification pending. Test design and all command results are subject to exact-snapshot evidence appended below.

### Final review and unchanged regressions

Both independent reviewers approved scoped frontend acceptance adequacy, exact narrow BROWSE-TCR-01 correction and documented BROWSE-TCR-02 runtime/command adoption, conditional on exact-source final execution/compile. Behaviour's final native-select label assertion and plan table fixes are saved. The remaining three unchanged original files passed all55 tests with bundled Node24/TZUTC/serial/30000ms;126.26s. This is no product performance claim. Together with the corrected session/home19passing and one expected prospective failure, no unrelated original assertion failure remains at this snapshot. Exact final two-file source rerun is in progress before freeze.

### Exact-source pre-implementation checks

The coordinator independently reran the final two acceptance files under the reviewed bundled Node24.19.0/Vitest4.1.11/TZUTC/serial/30000ms command:50 cases,22passed28failed0pending. JSON inspection confirms all27 new failures are the actual disabled Browse action `toBeEnabled` assertion; the one corrected historical failure expects two disabled previews but receives three. No timeout/import failures or unexpected failure messages. The remaining three original files passed55/55. Aggregate across all five files at final source:105 cases77passed28expectedRED, without omitting a case. TypeScript `tsc -p frontend/tsconfig.app.json --noEmit` passes on the exact final sources. These are split-file runs, not falsely reported as one full-suite invocation. Temporary JSON output was inspected then removed; assertions/results are recorded here and in the plan.

Both reviewers' conditional adequacy/runner requirements are satisfied by these results. This is readiness to freeze the scoped frontend test baseline, not runtime verification of deeper browsing assertions or complete shared capability readiness. BROWSE-TCR-01 preserves original role/auth tests except approved attendee action progression; BROWSE-TCR-02 explicitly records reviewed harness allowance without product timing claims.
