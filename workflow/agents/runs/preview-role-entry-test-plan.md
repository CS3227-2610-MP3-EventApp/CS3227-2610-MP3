# Preview role entry and workspaces test plan

Status: Independently reviewed; protected baseline commit pending

- Feature/story IDs: `preview-role-entry-and-workspaces`; presentation preview for F10-US01
- Approved specification: `specs/shared/preview-role-entry-and-workspaces.md` revision 1 Ready
- Designer: `auth_test_design` / test_case_designer
- Independent reviewers: `/root/auth_behaviour_review` and `/root/auth_security_review`; approved after focused rechecks on 2026-10-18
- Baseline commit and protected paths: pending review
- Full suite: `cd frontend && npm test`

## Executable cases

| Test group | Criteria | Observable coverage | Pre-implementation expectation |
| --- | --- | --- | --- |
| `role-entry.test.tsx` | AC01, AC02, AC04, AC07, AC09 | Three accessible tabs, keyboard switching, role-limited registration, no organiser registration, required login shape, exact one-key session object, empty local storage and keyboard-only login/sign-out | Meaningful RED: 9/9 failed because the absent UI had no tabs/forms and performed no route/session transition |
| `registration.test.tsx` | AC03, AC04, AC07, AC09 | Pre-submit warnings, required and programmatically associated errors, exact length/email/confirmation boundaries, business-name requirement, retained valid input, exact one-key session object and keyboard-only validation/correction/registration | Meaningful RED: 11/11 failed because the absent UI had no registration controls or behavior |
| `session-and-homes.test.tsx` | AC05, AC06, AC08, AC09, AC10 | Missing/mismatched/malformed/extra session data, direct matching routes, remount/history, sign-out, unknown routes, exact role cards, disabled inert incomplete actions and keyboard operation | Meaningful RED: 17/17 failed because no guards, session lifecycle, homes or keyboard controls exist |

Fixtures use synthetic names, identifiers, businesses and credentials. Tests assert through routes, accessible roles/labels, visible messages and browser storage rather than Material UI internals. The only expected production entry contract is the default export from `frontend/src/App.tsx`.

## Manual/deferred checks

- At 360 CSS px and 1280 CSS px in a real browser: inspect readable reflow, unobscured visible focus, no horizontal task loss and increased-text behaviour.
- Check application-created browser logs and visible diagnostics with distinctive synthetic values; the executable suite inspects browser storage but cannot prove browser/runtime internals.
- Fresh browser-context `sessionStorage` lifecycle and browser-native back/forward behavior require a real browser check; executable coverage is limited to remounting at the same route and a synthetic `popstate` transition with valid state.
- Real authentication, account creation, organiser provisioning, server permission enforcement, persistence/restart, database, provider, production isolation and WCAG conformance are excluded and cannot pass from this prototype.

## Adequacy and N/A

- Success, rejection, validation boundaries, route mismatch and state preservation are covered.
- Wrong user/event/business, inactive membership and private domain records are N/A because this is not the access capability and contains no server/data boundary.
- Stale revisions, concurrency, retries, AI behavior, external actions, migrations and real integration are N/A for the bounded UI preview.
- Rapid duplicate submission is not specified as a distinct asynchronous operation; navigation results are asserted without claiming domain success.
- Behaviour/security review corrections added exact storage shape/key assertions, pre-submit warnings, error associations, exact minimum boundaries, business-name validation, disabled/inert unfinished actions, keyboard-only complete journeys, remount and synthetic history-transition coverage.
- RED command: `cd frontend && npm test` using Vitest 4.1.11; 3 files collected, 37 tests executed, all 37 failed on missing observable application behavior. The test-only fallback prevented an absent production module from becoming an import/harness error.
- Harness checks: `npx tsc -b --pretty false` passed; `npm audit --json` reported zero vulnerabilities.
- Independent behaviour and security reviews approved the corrected 37-test candidate as adequate for revision 1 AC01–AC10, with the real-browser checks above retained as manual evidence.
