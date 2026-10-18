# Role Entry UI Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved frontend-only EventApp role-entry and three-dashboard prototype without claiming real authentication or authorisation.

**Architecture:** A Vite React/TypeScript single-page application uses Material UI and React Router. A small synthetic-session adapter validates and stores only `{role, displayName}` in `sessionStorage`; shared entry and workspace-shell components render role-specific content while the real access capability remains unimplemented.

**Tech Stack:** React, TypeScript, Vite, Material UI/Emotion, React Router, Vitest, Testing Library, user-event, jsdom.

**Spec:** `specs/shared/preview-role-entry-and-workspaces.md` revision 1 Ready

## Global Constraints

- Implement only AC01–AC10 from the approved prototype specification.
- Never store or log credentials, email, username, business name, tokens or full registration payloads.
- Treat browser role state as presentation only; every entry/home view states that credentials are not authenticated.
- The protected acceptance tests and runner/discovery configuration are owned by the test designer, not the developer.
- No backend, database, real account, provider, email, audit or domain operation is introduced.

## Review Focus

- Crafted `sessionStorage` values must not expose a mismatched role home.
- Login identifiers must never become persisted display names.
- Sign-out and browser history must not restore the synthetic session.
- Organiser registration paths must never render a registration form.
- Registration error feedback and tab/navigation controls must remain keyboard accessible.

---

### Task 1: Frontend harness and protected acceptance baseline

**Files:** Create frontend package/tooling configuration, test setup, acceptance tests and the workflow test plan/run record.

**Interfaces:** Tests consume the routes and observable behavior fixed by AC01–AC10. Protect all acceptance tests, fixtures, test setup/discovery, package scripts selecting tests, the test plan and baseline guard.

- [ ] Scaffold Vite React/TypeScript and install only the approved dependencies; add no application feature implementation.
- [ ] Write executable tests for login tabs/routes, registration validation, synthetic session validation/lifecycle, truthful notices, dashboard cards, unknown routes and keyboard semantics.
- [ ] Run the suite and record expected meaningful failures caused by missing application behavior.
- [ ] Obtain independent behaviour and security adequacy reviews and correct only the test-owned files.
- [ ] Commit the reviewed tests, record the full immutable baseline SHA/protected paths and run the baseline guard.

### Task 2: Minimal Material UI implementation

**Files:** Create focused application files for theme, routing/session, entry forms, shared workspace shell and dashboard data; do not edit protected test paths.

**Interfaces:** Produce `/login`, `/register/attendee`, `/register/business`, `/attendee`, `/organiser`, `/business`; expose the exact session behavior and copy required by revision 1.

- [ ] Implement the minimal app against the failing baseline tests.
- [ ] Use fixed preview names for login and only the registration display name for registration sessions.
- [ ] Add navy/teal Material UI theme, responsive entry layout and shared role workspace shell.
- [ ] Run the protected suite after each behavioral slice until green; then run the complete frontend suite and production build.
- [ ] Run the baseline-integrity guard to prove protected paths match the recorded baseline.

### Task 3: Independent verification and evidence

**Files:** Update the prototype specification evidence, agent run record and Dylan session log only after checking one frozen implementation snapshot.

**Interfaces:** Map AC01–AC10 to commands/results and preserve explicit deferrals for real identity/security/deployment.

- [ ] Have independent behaviour and security reviewers inspect the same implementation snapshot and reproduce relevant tests/checks.
- [ ] Repair application findings without altering the baseline; re-run affected reviews and all verification.
- [ ] Run frontend tests/build, repository Python tests, agent/link validation, baseline integrity and `git diff --check`.
- [ ] Record exact evidence, residual manual accessibility limits and human-log verification status; do not mark the real access capability complete.
