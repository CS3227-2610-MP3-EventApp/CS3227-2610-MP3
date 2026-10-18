# Multi-agent run record: preview role entry and workspaces

- Date/timezone: 2026-10-18, Asia/Singapore
- Feature/story: `preview-role-entry-and-workspaces`; presentation preview for F10-US01
- Human owner: Dylan
- Branch/base: `docs/auth-ui-prototype-spec`; base `148aa18`
- Specification: `preview-role-entry-and-workspaces` revision 1 Ready
- Approved test baseline: `3039cd4e2baec0b87a77e68c7d9f95f2390553e2`
- Product approval: recorded in the Ready specification and Dylan session log

## Actual delegation and handoffs

- Orchestrator `/root`: coordinated specification readiness and assigned independent roles.
- Specification analyst: revised the bounded prototype contract; exact identity to be reconciled by orchestrator.
- Test designer `/root/auth_test_design`: owns frontend test tooling, fixtures, acceptance tests and these draft records; no application behavior permitted.
- Behaviour verifier `/root/auth_behaviour_review`: approved the corrected candidate after rechecking all AC01–AC10 behavior.
- Security reviewer `/root/auth_security_review`: approved the corrected candidate after rechecking the storage boundary and both registration warnings.
- Developer: must not receive application ownership until reviewed baseline SHA and protected paths are recorded.

## Evidence

- Provisional criterion scenarios were derived before implementation and reviewed against the final Draft wording.
- Revision 1 was marked Ready after Dylan's recorded approval.
- Executable RED evidence after behaviour/security corrections: `cd frontend && npm test` with Vitest 4.1.11 collected 3 files and executed 37 tests; all 37 failed because the application supplied no tabs, forms, route guards, session transitions or home content. No suite/import error remained.
- Harness checks: `npx tsc -b --pretty false` passed; `npm audit --json` reported zero vulnerabilities across the installed dependency graph.
- Initial environment issues resolved before RED evidence: the user npm cache was not writable, so installation used an isolated temporary cache; the Vitest worker temp directory required scoped write permission; npm 10 required `--legacy-peer-deps` for the clean Vitest 4 install, with `@testing-library/dom` declared explicitly.
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
- Completed criteria: none; tests precede application implementation.
- Human review/merge: pending.
- Session summary: `logs/dylan/2026-10-18-project-understanding-auth-ui-planning.md`; human correctness verification status remains as recorded there.
