# Multi-agent run record: preview role entry and workspaces

- Date/timezone: 2026-10-18, Asia/Singapore
- Feature/story: `preview-role-entry-and-workspaces`; presentation preview for F10-US01
- Human owner: Dylan
- Branch/base: `feat/role-entry-ui-prototype`; base `148aa18`
- Specification: `preview-role-entry-and-workspaces` revision 2 Ready
- Approved test baseline: revision 2 uses `64cfa0f16935f237d450494e18572980ac45d816` (revision 1 used `3039cd4e2baec0b87a77e68c7d9f95f2390553e2`)
- Product approval: revision 2 approval recorded in the Ready specification and Dylan session log

## Actual delegation and handoffs

- Orchestrator `/root`: coordinated specification readiness and assigned independent roles.
- Specification analyst: revised the bounded prototype contract; exact identity to be reconciled by orchestrator.
- Test designer `/root/auth_test_design`: owns frontend test tooling, fixtures, acceptance tests and these draft records; no application behavior permitted.
- Behaviour verifier `/root/auth_behaviour_review`: approved the corrected candidate after rechecking all AC01–AC10 behavior.
- Security reviewer `/root/auth_security_review`: approved the corrected candidate after rechecking the storage boundary and both registration warnings.
- Developer `/root/auth_ui_developer`: implemented only `frontend/index.html` and `frontend/src/` after the baseline was recorded; no protected path was edited.

## Evidence

- Dylan explicitly approved revision-2 approximately 150% typography, responsive headings and persisted light/dark preference behavior on 2026-10-18.
- Revision 2 changes AC07/09 and adds AC11/12. Revision-1 tests, reviews, baseline and implementation evidence remain historical and do not verify these changes.
- Revision-2 test owner added a separate appearance acceptance group for revised AC07/09 and AC11/12 while preserving the 37 revision-1 regression cases. `/root/auth_behaviour_review` and `/root/auth_security_review` approved the final corrected revision-2 candidate; recording its replacement immutable baseline commit remains pending, and revision-2 implementation must not begin before that baseline gate.
- Initial revision-2 candidate RED: `TMPDIR=/private/tmp npm test -- --reporter=dot` collected 4 files and executed 55 tests. All 37 revision-1 tests remained GREEN; all 18 initial revision-2 cases failed because the revision-1 app had no appearance control/preference and retained prior typography. Later reviewer-driven additions superseded this count with the final 68-test evidence below.
- After reviewer-requested strengthening, the corrected revision-2 command collected 4 files and executed 65 tests: all 37 revision-1 regressions remained GREEN and all 28 revision-2 cases were meaningfully RED. Added evidence covers the public active-mode marker and computed palette, >=24px base and representative category-specific 1.5x scale, every registration field, existing-home session preservation, valid-session invalid-preference fallback, and local-storage read/write/remove failures. Physical removal cannot be guaranteed when the browser itself rejects `removeItem`; the test requires safe fallback, unchanged authority/session and treats the retained invalid value as inactive.
- Final adequacy corrections add representative typography checks across login, both registrations and all three homes; isolated cross-render computed-palette comparisons for OS-selected and saved light/dark modes; exact form/session preservation; invalid-preference fallback; storage read/write/remove failure handling; and a failed-write case on an existing organiser home that preserves the exact session bytes/structure, route and home, permits immediate in-memory mode only, leaves local storage empty and forbids a false persistence-success message. The final command collected 4 files and executed 68 tests: all 37 revision-1 regressions remained GREEN and all 31 revision-2 cases were meaningfully RED. Behaviour reviewer `/root/auth_behaviour_review` and security reviewer `/root/auth_security_review` approved this final adequacy set; replacement baseline commit remains pending.

- Provisional criterion scenarios were derived before implementation and reviewed against the final Draft wording.
- Revision 1 was marked Ready after Dylan's recorded approval.
- Executable RED evidence after behaviour/security corrections: `cd frontend && npm test` with Vitest 4.1.11 collected 3 files and executed 37 tests; all 37 failed because the application supplied no tabs, forms, route guards, session transitions or home content. No suite/import error remained.
- Harness checks: `npx tsc -b --pretty false` passed; `npm audit --json` reported zero vulnerabilities across the installed dependency graph.
- Initial environment issues resolved before RED evidence: the user npm cache was not writable, so installation used an isolated temporary cache; the Vitest worker temp directory required scoped write permission; npm 10 required `--legacy-peer-deps` for the clean Vitest 4 install, with `@testing-library/dom` declared explicitly.
- GREEN evidence on the final working-tree snapshot: `TMPDIR=/private/tmp npm test -- --reporter=dot` passed 37/37; `npm run build` and `npx tsc -b --pretty false` passed; the recorded baseline command and `git diff --check` passed. Vite emitted a non-blocking 520.73 kB minified chunk-size advisory.
- Independent implementation review: security approved with no actionable finding. Behaviour review found missing route-change focus and immediate validation-error orientation; the orchestrator added stable heading focus and first-invalid-field focus, reran 37/37, and both reviewers approved focused rechecks.
- No real authentication, authorisation, persistence, integration, accessibility conformance or deployment evidence is claimed.

## Protected baseline candidate

- `frontend/package.json`, lockfile and TypeScript/Vite test discovery configuration
- `frontend/tests/` including setup, helpers, fixtures and acceptance cases
- `workflow/agents/runs/preview-role-entry-test-plan.md`
- `tools/check_test_baseline.py`

The developer may add application-owned unit tests outside this protected acceptance set but cannot edit the approved baseline.

Full protected paths:

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/tsconfig.json`
- `frontend/tsconfig.app.json`
- `frontend/tsconfig.node.json`
- `frontend/vite.config.ts`
- `frontend/tests`
- `workflow/agents/runs/preview-role-entry-test-plan.md`
- `tools/check_test_baseline.py`

Integrity command:

```sh
python3 tools/check_test_baseline.py \
  --baseline 3039cd4e2baec0b87a77e68c7d9f95f2390553e2 \
  --paths frontend/package.json frontend/package-lock.json frontend/tsconfig.json \
  frontend/tsconfig.app.json frontend/tsconfig.node.json frontend/vite.config.ts \
  frontend/tests workflow/agents/runs/preview-role-entry-test-plan.md \
  tools/check_test_baseline.py
```

## Fixes, completion and reflection

- Test adequacy findings were incorporated for exact storage shape/key and empty local storage, registration warnings/business-name/error association/exact boundaries, disabled inert unfinished actions, keyboard-only complete journeys, and remount/history behavior. Both independent reviewer rechecks approved the corrected candidate.
- Completed automated evidence: AC01–AC08 and AC10; AC09 keyboard and synthetic narrow-viewport checks. Real-browser 360/1280 reflow, increased-text, visible-focus, native history/fresh-context and runtime-log inspection remain manual checks.
- Human review/merge: pending.
- Session summary: `logs/dylan/2026-10-18-project-understanding-auth-ui-planning.md`; human correctness verification status remains as recorded there.
- Revision-2 reopened scope: approximately 150% typography and responsive headings; light/dark controls on all entry/home screens; OS default; exact `eventapp.colorMode` `light`/`dark` persistence; invalid-value fallback/removal; palette/readability and storage-boundary checks. The final test plan, behaviour/security adequacy reviews and replacement baseline are complete; implementation and same-snapshot implementation reviews remain pending.

Revision-2 protected paths:

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/tsconfig.json`
- `frontend/tsconfig.app.json`
- `frontend/tsconfig.node.json`
- `frontend/vite.config.ts`
- `frontend/tests`
- `workflow/agents/runs/preview-role-entry-test-plan.md`
- `tools/check_test_baseline.py`

Revision-2 integrity command:

```sh
python3 tools/check_test_baseline.py \
  --baseline 64cfa0f16935f237d450494e18572980ac45d816 \
  --paths frontend/package.json frontend/package-lock.json frontend/tsconfig.json \
  frontend/tsconfig.app.json frontend/tsconfig.node.json frontend/vite.config.ts \
  frontend/tests workflow/agents/runs/preview-role-entry-test-plan.md \
  tools/check_test_baseline.py
```
