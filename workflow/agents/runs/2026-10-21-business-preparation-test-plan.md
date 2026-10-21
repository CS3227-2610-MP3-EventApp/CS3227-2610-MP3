# US03 preparation acceptance test plan

Status: Original baseline reviewed; PREP-TCR-02 additions/corrections await independent delta review and replacement baseline in the orchestrator run record.
Specification: manage-preparation-tasks-and-budgets r4 In progress; r3 API/numeric contract retained, AC11 explicitly covers live Preparation home entry and two available/one preview business summary. Original r3 drafting inconsistencies were corrected before baseline: quantity1..1e6, JSON integer price0..1e11 cents (SGD1e9/unit); aggregate totals are decimal digit strings; no line-total response property.
Designer: actual agent `/root/preparation_scenarios` (test_case_designer). Independent reviewers: `/root/f06_status` (behaviour) and `/root/preparation_security` (security), read-only adequacy and delta reviews approved within recorded scope. Baseline SHA belongs in the orchestrator run record. No implementation test passes are claimed.
Replacement protected paths include this plan, backend/tests/test_business_preparation.py, frontend/tests/preparation.test.tsx, frontend/tests/acceptance/session-and-homes.test.tsx, frontend/tests/acceptance/appearance.test.tsx and workflow/agents/runs/2026-10-21-preparation-review-tcr.md; retain all original shared fixtures/configuration/guard protection. Original baseline b5600c03968bc23cc1d3cc69c47144fca90dcbc2 remains historical evidence.

## Cases

All fixtures are synthetic. Backend cases use authenticated public HTTP and guarded PostgreSQL, not mocked repositories; each test imports existing database cleanup/migration fixtures explicitly.

| Case / criterion | Setup and action | Observable expected result; preserved state | Level |
| --- | --- | --- | --- |
| virtual_get / AC01,07 | Existing own participation; repeated GET before save | Empty revision1, string zero totals; application domain unchanged | HTTP/PostgreSQL |
| full_replacement / AC01,02,03,08,10 | Save, edit, complete/reopen task, quotation at zero, delete by omission, fresh GET | Canonical IDs, advancing revision, exact totals, deletions; application unchanged | HTTP/PostgreSQL |
| maximum_unknown / AC02,03,05 | 200 tasks/lines, quantity1e6, unit price1e11 cents; then unknown+zero+known lines | Total string20000000000000000000; unknown remains null/incomplete and known subtotal375 | HTTP/PostgreSQL |
| invalid_line/document / AC05 | Invalid types, ranges, currency, quote combinations, caps, unknown/server fields, duplicate/unknown IDs | Safe422; entire prior document including revision unchanged | HTTP/PostgreSQL |
| authority / AC04 | Anonymous, attendee, organiser, foreign business, inactive membership, password-change-required, missing/untrusted Origin | Safe401/403/404 and no-store; foreign and absent indistinguishable; owner data unchanged | HTTP/PostgreSQL |
| concurrency_failure / AC07,08 | Concurrent first saves then stale retry; reject success audit insertion | One200/one409; revision2; forced failure rolls back all content/revision | HTTP/PostgreSQL |
| application_independence / AC01,06,08 | Edit application type, submit, reject, then edit preparation | Own preparation remains writable and independent, no AI/setup dependency | HTTP/PostgreSQL |
| UI edit/privacy / AC01,09 | Route selects own application participation; edit task/save | Correct expectedRevision; private data absent from storage/history | UI with HTTP fixture |
| UI exact/unknown / AC02,03 | Huge string totals, unknown price | Exact SGD decimal; explicit incomplete marker | UI with HTTP fixture |
| UI recovery / AC09 | Lost committed response or safe422 with injected detail | Authoritative GET, one PUT only, draft retained, raw exception hidden | UI with HTTP fixture |
| Review additions / AC02,04,05,07,08,10 | Odd unsafe-integer arithmetic; inactive PUT; actual own-other-event and other-business IDs; existing-write CAS; minimal audit | Exact final cent, no row movement, one winner/one success audit with actor/resource/revision | HTTP/PostgreSQL |
| UI review additions / AC09 | New-row lost-response reconciliation followed by second save; mismatching GET; access loss and held departed-participation response | Canonical IDs/revision adopted, no automatic replay, departed private data stays purged | UI with HTTP fixture |
| First implementation-review regressions / AC09,11 | Focus/pageshow remount with dirty draft; failed local reload; departed authority response; malformed known-price/unknown-basis response; business home | Same-scope memory retained, failed recheck conceals editor with retry, departed response cannot replace/clear new scope, malformed document rejected; enabled Open preparation and business two-live/one-preview metric | UI with HTTP fixture |

UI accessibility contract: heading containing Preparation; Task title, Description, Quantity, Unit price labels; Add task, Add budget line, Save preparation buttons. Unit price entry is SGD decimals; API uses integer cents. Labels are case-insensitive. Values remain private in memory.
Budget lines expose semantic row/group/fieldset containers so per-line amounts are independently observable; the odd-cent assertion is scoped to the line container, not duplicated aggregate/subtotal text.

## Deferred checks and limitations

- Browser keyboard/focus/screen-reader/400% zoom, unsaved departure warning and complete same-scope focus revalidation: scenario-only pending implementation and browser verification. Automated UI identity-loss/participation-switch/late-response cases supplement these checks.
- Process restart persistence (without reseeding), deployed database/environment separation, real browser-to-server integration, minimal audit/log inspection: deferred; fresh HTTP requests/database sessions alone do not prove restart/deployment.
- Date/Unicode/text boundary matrix and commit-time failure specifically remain coverage gaps for independent reviewers to assess before baseline. Actual IDs across two owned participations/other business, existing-write concurrency and minimal audit attribution were added after review.
- No provider tests required: manual capability makes no external calls. Fixture UI responses establish only consumer behaviour, not server enforcement.

## Commands and pre-implementation evidence

Backend: `.venv/Scripts/python.exe -m pytest tests/test_business_preparation.py -q` from backend with existing guarded synthetic DB environment and PYTHONPATH=.venv/Lib/site-packages.
Frontend: `npm test -- tests/preparation.test.tsx` from frontend.
Pre-implementation execution: backend with `--maxfail=1` produced one meaningful failure: authenticated existing owned participation GET returned404 instead of virtual200. Provisioning/migrations/auth succeeded; no import/harness failure. UI via `npm.cmd test -- tests/preparation.test.tsx`: initially five, then expanded nine meaningful failures, Preparation heading absent because route not implemented. Expanded backend syntax compilation and `git diff --check` passed. Plain `npm` was blocked by Windows script execution policy; using npm.cmd required no policy change. No baseline approval or passing behavior claimed.

First implementation-review execution: expanded UI14 tests returned10 passed/4 meaningful failures: focus and pageshow lost dirty draft, failed local reload exposed cached private editor, malformed known-price/unknown-basis response was displayed. Strengthened departed local-authority/new-scope-draft case separately passed1 with13 filtered. Focused real backend conflict test failed meaningfully with missing currentRevision after successful CAS;30 filtered. Orchestrator reports original backend full suite302 passing and full UI271/273 before corrections; those are historical results, not proof new regressions pass. No developer may edit these expectations; PREP-TCR-02 governs reviewed replacement.
