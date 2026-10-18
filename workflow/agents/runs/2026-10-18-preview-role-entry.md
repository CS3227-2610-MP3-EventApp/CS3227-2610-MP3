# Multi-agent run record: preview role entry and workspaces

- Date/timezone: 2026-10-18, Asia/Singapore
- Feature/story: `preview-role-entry-and-workspaces`; presentation preview for F10-US01
- Human owner: Dylan
- Branch/base: `docs/auth-ui-prototype-spec`; base `148aa18`
- Specification: `preview-role-entry-and-workspaces` revision 1 In review
- Approved test baseline: `3039cd4e2baec0b87a77e68c7d9f95f2390553e2`
- Product approval: recorded in the Ready specification and Dylan session log

## Actual delegation and handoffs

- Orchestrator `/root`: coordinated specification readiness and assigned independent roles.
- Specification analyst: revised the bounded prototype contract; exact identity to be reconciled by orchestrator.
- Test designer `/root/auth_test_design`: owns frontend test tooling, fixtures, acceptance tests and these draft records; no application behavior permitted.
- Behaviour verifier `/root/auth_behaviour_review`: approved the corrected candidate after rechecking all AC01–AC10 behavior.
- Security reviewer `/root/auth_security_review`: approved the corrected candidate after rechecking the storage boundary and both registration warnings.
- Developer `/root/auth_ui_developer`: implemented only `frontend/index.html` and `frontend/src/` after the baseline was recorded; no protected path was edited.

## Evidence

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
