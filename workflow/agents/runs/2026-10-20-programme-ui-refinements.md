# Programme UI refinements

## Approved bounded amendment

Source: Dylan's screenshots and request, followed by “yup please make the changes” approving the in-chat design. Scope: fix Venue/Room empty-select label overlap; accessible pencil/trash venue/room actions; SGD dollar input up to two decimals converted exactly to existing integer cents; Community MUI activity date/time pickers preserving event timezone, DST validation and unchanged timestamp precision. The event itself stays CLI-created. Published deletion/cancellation is not added. Existing programme revision-6 API/data/permission/lifecycle contracts remain authoritative and unchanged.

Current branch: `feat/organiser-programme`, initial implementation/documentation HEAD `917a9bc`. User-owned `compose.yaml` port change is excluded from this task and all commits. No database mutation is needed for this frontend-only change.

## Actual assignments

- `/root/programme_ui_refinement_analysis`: read-only specification analyst; assessed story/contract compatibility, validation, timezone/precision risks and source/doc map. No product approval or code edits.
- `/root/programme_ui_refinement_tests`: independent test designer; owns necessary programme acceptance-test changes and their TCR before implementation. Root owns dependency installation/config changes before freeze.
- Developer and independent behaviour/security review handoffs: pending.

The bounded UI amendment was approved in chat; this is not represented as approval of an unseen rewritten capability specification. Existing revision-6 approval is retained. UI presentation documentation will be synchronized without changing API units, IDs, acceptance IDs or deletion rules.

## Contract details and test expectations

`Price (SGD)` accepts trimmed ordinary nonnegative decimal notation: whole dollars, one decimal or two decimals. Blank, signs, exponent notation, currency symbols/group separators, malformed input, more than two decimal places and values above SGD 21,474,836.47 are invalid. Zero is valid. Conversion splits decimal digits into integer cents, without floating-point rounding; maximum remains 2147483647 cents. Existing values load as dollar amounts. Backend still validates integer cents and SGD.

Venue/room icon actions retain resource-specific accessible names, tooltips, keyboard focus, blocked/locked states and confirmation. Select labels stay floated when value is empty. Activity date/time pickers retain required fields, event bounds, end-after-start, explicit repeated-hour offset choice, nonexistent-time rejection and exact unchanged server instants including microseconds. Native browser timezone is never authority.

MUI package metadata checked before installation: `@mui/x-date-pickers` 9.16.0 supports existing Material UI 7.3 and React 19. Root installed the Community package and Day.js; 11 packages added, npm audit reported 0 vulnerabilities. No Pro package or icon-package dependency. This is dependency setup before the acceptance baseline, not implementation evidence.

## Gates and evidence

Preimplementation test adequacy accepted by `/root/programme_ui_refinement_behaviour` and `/root/programme_ui_refinement_security` after independent test-owner READY. The 39-case programme suite preserves existing DTO/revision/raw-microsecond assertions and adds the scoped controls, money, calendar/DST, invalid and published-lock checks. The [test-owner TCR](2026-10-20-programme-ui-test-changes.md) records necessary cents-label/value and native-to-MUI interaction changes; no behaviour was weakened to fit an implementation.

Test owner recorded 11 passing/24 failing cases on the intermediate suite, four final additive meaningful reds, and an actual installed-MUI helper/calendar/partial-clear proof passing. Behaviour reviewer independently reproduced the final helper proof (1 passed, 38 deselected). These are pre-code observations, not passing product behaviour. Freeze SHA and developer GO will be recorded next, before app changes. Required human teammate/summary review and manual visual checks remain separate.
