# Programme UI refinements

## Approved bounded amendment

Source: Dylan's screenshots and request, followed by “yup please make the changes” approving the in-chat design. Scope: fix Venue/Room empty-select label overlap; accessible pencil/trash venue/room actions; SGD dollar input up to two decimals converted exactly to existing integer cents; Community MUI activity date/time pickers preserving event timezone, DST validation and unchanged timestamp precision. The event itself stays CLI-created. Published deletion/cancellation is not added. Existing programme revision-6 API/data/permission/lifecycle contracts remain authoritative and unchanged.

Current branch: `feat/organiser-programme`, initial implementation/documentation HEAD `917a9bc`. User-owned `compose.yaml` port change is excluded from this task and all commits. No database mutation is needed for this frontend-only change.

## Actual assignments

- `/root/programme_ui_refinement_analysis`: read-only specification analyst; assessed story/contract compatibility, validation, timezone/precision risks and source/doc map. No product approval or code edits.
- `/root/programme_ui_refinement_tests`: independent test designer; owns necessary programme acceptance-test changes and their TCR before implementation. Root owns dependency installation/config changes before freeze.
- `/root/programme_ui_refinement_dev`: bounded UI implementation, no protected test/config writes.
- `/root/programme_ui_refinement_behaviour`: independent test adequacy, runtime investigation and final behaviour review.
- `/root/programme_ui_refinement_security`: independent test adequacy and final security review.

The bounded UI amendment was approved in chat; this is not represented as approval of an unseen rewritten capability specification. Existing revision-6 approval is retained. UI presentation documentation will be synchronized without changing API units, IDs, acceptance IDs or deletion rules.

## Contract details and test expectations

`Price (SGD)` accepts trimmed ordinary nonnegative decimal notation: whole dollars, one decimal or two decimals. Blank, signs, exponent notation, currency symbols/group separators, malformed input, more than two decimal places and values above SGD 21,474,836.47 are invalid. Zero is valid. Conversion splits decimal digits into integer cents, without floating-point rounding; maximum remains 2147483647 cents. Existing values load as dollar amounts. Backend still validates integer cents and SGD.

Venue/room icon actions retain resource-specific accessible names, tooltips, keyboard focus, blocked/locked states and confirmation. Select labels stay floated when value is empty. Activity date/time pickers retain required fields, event bounds, end-after-start, explicit repeated-hour offset choice, nonexistent-time rejection and exact unchanged server instants including microseconds. Native browser timezone is never authority.

MUI package metadata checked before installation: `@mui/x-date-pickers` 9.16.0 supports existing Material UI 7.3 and React 19. Root installed the Community package and Day.js; 11 packages added, npm audit reported 0 vulnerabilities. No Pro package or icon-package dependency. This is dependency setup before the acceptance baseline, not implementation evidence.

## Gates and evidence

Preimplementation test adequacy accepted by `/root/programme_ui_refinement_behaviour` and `/root/programme_ui_refinement_security` after independent test-owner READY. The 39-case programme suite preserves existing DTO/revision/raw-microsecond assertions and adds the scoped controls, money, calendar/DST, invalid and published-lock checks. The [test-owner TCR](2026-10-20-programme-ui-test-changes.md) records necessary cents-label/value and native-to-MUI interaction changes; no behaviour was weakened to fit an implementation.

Test owner recorded 11 passing/24 failing cases on the intermediate suite, four final additive meaningful reds, and an actual installed-MUI helper/calendar/partial-clear proof passing. Behaviour reviewer independently reproduced the final helper proof (1 passed, 38 deselected). These are pre-code observations, not passing product behaviour. Freeze SHA and developer GO will be recorded next, before app changes. Required human teammate/summary review and manual visual checks remain separate.

## Protected baseline and developer GO

Baseline: `ba4e8aa898f1c4167a2bb4d3e8f5c08bdc3e79f2`. Both independent adequacy reviews accepted the scoped tests. Protected paths: `frontend/tests`, `frontend/src/programmeTime.test.ts`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`, `backend/tests`, `backend/pyproject.toml`, `backend/uv.lock`, `tools/check_test_baseline.py`, `tools/tests`, `AGENTS.md`, `workflow/agents/README.md`, `workflow/agents/runs/2026-10-20-programme-ui-test-changes.md`.

Commands: `npm test` and `npm run build` in frontend; `python3 tools/check_test_baseline.py --baseline <full SHA above> --paths <each protected path above>`, `python3 tools/validate_agent_setup.py`, `git diff --check` from root. No backend or database changes/tests are needed for this presentation adapter change; no fresh backend claim will be made.

Developer `/root/programme_ui_refinement_dev` (Sol/high escalation for money/timezone/widget integration) receives GO after this record is written. Own only `frontend/src/Programme.tsx` and focused new helper files if needed; no protected test/config edits and no backend/Compose edits. Root owns documentation and review-snapshot commits. No push/merge/deployment.

## Implementation and review snapshot

Only `frontend/src/Programme.tsx` changed in application code. Its stable SHA-256 is `225838df1176e5a650f032a99803b0888848f7dac455e2e41152987727f463c7`; both independent reviewers use this exact content. Select labels float; venue/room actions use named icon buttons/tooltips; dollar digits convert to bounded integer cents; MUI Community date/time pickers use UTC only as a wall-clock carrier before existing event-zone resolution. Unchanged server microseconds are preserved. Memoized timezone-choice scans avoid recalculation on unrelated text input. Existing publication/deletion rules and API shapes are unchanged.

Developer observed 39/39 programme cases passing. Full default-budget suites initially had a long create-flow timeout (final run 118 passing/1 timeout at 5027 ms). Isolated unchanged create flow passed in the independent verifier's run at 3794 ms. Diagnostic extended-budget full-suite create completed all assertions in 6464 ms; root briefly overlapped a production build, so this diagnostic is not described as contention-free or as acceptance evidence. Test-owner/independent-verifier harness correction and final acceptance results follow separately; no developer edited protected tests.

Root independently ran the production build successfully: 1237 modules; 793.99 kB minified / 246.56 kB gzip main chunk, with the existing 500 kB advisory still visible (not suppressed). Root baseline guard, agent configuration/local-link validator and whitespace checks passed before the harness correction. Security reviewer found no blocking issues at the source hash above, checked connected API/time resolver wiring, and independently exercised 10,019 money cases and two UTC wall-clock/DST carry checks.

No fresh backend/database verification is claimed for this frontend-only change. Real-browser visual checks in both themes, teammate review and human summary verification remain pending. User-owned Compose port changes remain untouched and excluded from commits.

## Final verification

The independent behaviour verifier found no blocking product issue at the same source hash as the security review. The test owner recorded and applied only the independently endorsed create-test 10000 ms third argument; all assertions, inputs and global limits stayed unchanged. Replacement protected baseline: `6a4978dd5bb1a165f0dd265cde034f7c4fec241d` (supersedes `ba4e8aa` only for this recorded harness correction).

Root then ran ordinary `npm test` alone: **6 files / 119 tests passed**, exit 0, 53.11 seconds. The full protected-path guard against the replacement baseline passed; whitespace checks passed. Application source did not change after the independent reviews or successful production build. There are no remaining automated frontend failures. The visible build-size warning and unexecuted browser/human checks above remain limitations, not silently passed gates.
