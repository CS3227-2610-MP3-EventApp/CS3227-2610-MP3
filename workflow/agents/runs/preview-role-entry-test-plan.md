# Preview role entry and workspaces test plan

Status: Revision 2 implemented and verified; replacement baseline commit pending for the current package/test-plan correction

- Feature/story IDs: `preview-role-entry-and-workspaces`; presentation preview for F10-US01
- Approved specification: `specs/shared/preview-role-entry-and-workspaces.md` revision 2 Ready
- Designer: `auth_test_design` / test_case_designer
- Independent reviewers: `/root/auth_behaviour_review` and `/root/auth_security_review`; both approved revision 1 after focused rechecks and approved the final corrected revision-2 candidate on 2026-10-18.
- Baseline commits and protected paths: revision 1 `3039cd4e2baec0b87a77e68c7d9f95f2390553e2`; revision 2 `64cfa0f` (recorded by `9ad8bd4`). A new replacement baseline is pending only because the protected package metadata, lockfile, unused fixture export and this test-plan record are being corrected.
- Full suite: `cd frontend && npm test`

## Executable cases

The original three groups remain the protected revision-1 regression baseline. Revision 2 added the approved `appearance.test.tsx` group, froze it in `64cfa0f`, and was subsequently implemented and verified. The current protected-file correction requires a new replacement baseline before later development relies on it.

| Test group | Criteria | Observable coverage | Pre-implementation expectation |
| --- | --- | --- | --- |
| `role-entry.test.tsx` | AC01, AC02, AC04, AC07, AC09 | Three accessible tabs, keyboard switching, role-limited registration, no organiser registration, required login shape, exact one-key session object, empty local storage and keyboard-only login/sign-out | Meaningful RED: 9/9 failed because the absent UI had no tabs/forms and performed no route/session transition |
| `registration.test.tsx` | AC03, AC04, AC07, AC09 | Pre-submit warnings, required and programmatically associated errors, exact length/email/confirmation boundaries, business-name requirement, retained valid input, exact one-key session object and keyboard-only validation/correction/registration | Meaningful RED: 11/11 failed because the absent UI had no registration controls or behavior |
| `session-and-homes.test.tsx` | AC05, AC06, AC08, AC09, AC10 | Missing/mismatched/malformed/extra session data, direct matching routes, remount/history, sign-out, unknown routes, exact role cards, disabled inert incomplete actions and keyboard operation | Meaningful RED: 17/17 failed because no guards, session lifecycle, homes or keyboard controls exist |
| `appearance.test.tsx` | revised AC07/09; AC11/12 | Public `data-color-mode`, computed palette evidence and isolated light-vs-dark comparisons for OS/saved modes; invalid cleanup; labelled controls on all screens; immediate/exact persistence; full form and byte-exact active-session preservation; storage read/write/remove failure; keyboard operation; >=24px base and representative >=1.5x prior form/tab/control/notice/card/description/caption sizes | Meaningful final RED: 31/31 fail because revision 1 lacks the approved appearance/scale behavior; all 37 revision-1 regressions remain GREEN |

Fixtures use synthetic names, identifiers, businesses and credentials. Tests assert through routes, accessible roles/labels, visible messages and browser storage rather than Material UI internals. The only expected production entry contract is the default export from `frontend/src/App.tsx`.

## Manual/deferred checks

- At 360 CSS px and 1280 CSS px in a real browser: inspect readable reflow, unobscured visible focus, no horizontal task loss and increased-text behaviour.
- Check application-created browser logs and visible diagnostics with distinctive synthetic values; the executable suite inspects browser storage but cannot prove browser/runtime internals.
- Fresh browser-context `sessionStorage` lifecycle and browser-native back/forward behavior require a real browser check; executable coverage is limited to remounting at the same route and a synthetic `popstate` transition with valid state.
- Real authentication, account creation, organiser provisioning, server permission enforcement, persistence/restart, database, provider, production isolation and WCAG conformance are excluded and cannot pass from this prototype.
- Revision 2 still requires real-browser checks of clipping/overlap, responsive heading changes, both coherent palettes, contrast/readability, visible focus, increased text and reflow at 360/1280 CSS px. jsdom computed-style checks provide representative scale/hierarchy and palette-change evidence, not layout or contrast measurement.
- If invalid-preference removal fails because browser storage denies writes, the app must ignore the value and render safely but cannot guarantee physical deletion; manual evidence records the retained invalid value without treating it as active or authoritative.

## Adequacy and N/A

- Success, rejection, validation boundaries, route mismatch and state preservation are covered.
- Wrong user/event/business, inactive membership and private domain records are N/A because this is not the access capability and contains no server/data boundary.
- Stale revisions, concurrency, retries, AI behavior, external actions, migrations and real integration are N/A for the bounded UI preview.
- Rapid duplicate submission is not specified as a distinct asynchronous operation; navigation results are asserted without claiming domain success.
- Behaviour/security review corrections added exact storage shape/key assertions, pre-submit warnings, error associations, exact minimum boundaries, business-name validation, disabled/inert unfinished actions, keyboard-only complete journeys, remount and synthetic history-transition coverage.
- RED command: `cd frontend && npm test` using Vitest 4.1.11; 3 files collected, 37 tests executed, all 37 failed on missing observable application behavior. The test-only fallback prevented an absent production module from becoming an import/harness error.
- Harness checks: `npx tsc -b --pretty false` passed; `npm audit --json` reported zero vulnerabilities.
- Independent behaviour and security reviewers approved the final 31-test revision-2 candidate after the corrections below; it was frozen in `64cfa0f` before revision-2 implementation. A further replacement baseline is pending only for the current protected package/test-plan correction.
- Revision-2 privacy expectation: flows that make no explicit appearance choice continue to require empty `localStorage`. After an explicit choice, exactly one `eventapp.colorMode` key with exact value `light` or `dark` is permitted; session, form and distinctive sensitive values remain forbidden there.
- Revision-2 final pre-implementation command: `TMPDIR=/private/tmp npm test -- --reporter=dot`; 4 files collected, 68 tests executed, 37 revision-1 cases passed and all 31 revision-2 cases failed on missing approved behaviour. No collection/import/harness failure occurred.
- Final revision-2 corrections approved by both reviewers cover representative typography categories across every entry/home surface; public and computed palette evidence with isolated OS/saved cross-render comparisons; exact form and active-session preservation through toggles; invalid preference fallback with a valid session; safe local-storage read/write/remove failure behavior; and a failed-write home case that preserves exact session bytes/structure and forbids false persistence claims.
