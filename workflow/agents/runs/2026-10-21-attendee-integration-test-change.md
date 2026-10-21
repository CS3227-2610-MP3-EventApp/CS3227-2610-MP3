# Attendee producer-contract test change request

- Request ID: BROWSE-TCR-03; requester/test owner: `/root/f01_tests`; date: 2026-10-21, Asia/Singapore.
- Scope: F01-US03 attendee integration after merge `b2c7908`; existing primary consumer baseline `4ee5b7c29a8efb212050ecef3b322275ed12c4b9`, evidence seal `9b79a7721a2891ca707bc6dd93ef7c874e40ef26`. Preserve historical evidence; do not claim the old broad baseline guard passes after master integration.
- Current integration reference: programme specification revision 7 producer contract and generated `frontend/src/api-schema.d.ts`. User accepted the parent recommendation on 2026-10-21: start-date-only, aligned with the shared backend contract.

## Reproduction and classification

Read-only comparison shows the protected consumer fixture returns `/api/v1/programme`, `/items`, `hasMore`, flat `eventTimezone` and nested `room.venue`; the producer exposes `/api/v1/attendee`, `/programme`, `total`, sibling `event`/`venue`/`room`, `publishedAt`, room `maxCapacity`, and `panel` as a sixth type. Current fixture successes cannot verify this producer. No new failing execution is claimed yet. This is contract evolution following separately developed producer/consumer branches, not permission to weaken tests around current application defects.

## Proposed bounded correction

Test owner may edit only `frontend/tests/fixtures/programme.ts` and `frontend/tests/acceptance/programme-browsing.test.tsx`:

1. Use the delivered attendee route paths and full published DTO. Type-check fixture values against generated OpenAPI components, independent of application consumer types. No production fallback or fixture-side auth/filter/persistence implementation.
2. Replace fixture pagination with `{items,total,limit,offset}`. PB05/06/07 keep page-20 transport, page transitions, query-reset and final-page assertions; totals are explicit 21 for two-page datasets, not inferred from application output. Add previous-page and exact-final-page checks.
3. PB23 retains all five existing tokens and adds Panel/panel. Add positive panel list/detail rendering, so mere query transport cannot hide rejection of a valid server type.
4. Retain timezone, price/free, capacity/accessibility separation, loading/empty/error/retry, credentialed GET, 401 cleanup, stale filter/event/actor suppression, literal markup rendering, forged identity and direct-route guard checks unchanged in intent.
5. Add malformed producer response coverage with no stale protected facts and a recoverable error; no consumer accepts a legacy fixture shape as live producer evidence.
6. Date transport samples currently request Oct21 for an activity starting Oct20 local. The user accepted start-date-only; change those consistent examples to Oct20 and name the adopted rule. No fixture proves server-side filtering.

Alternatives: keeping old fixtures and adding a production compatibility fallback would preserve artificial success while hiding the actual producer contract; rejected. Deleting old tests or assertions is unnecessary; rejected. No runner/configuration/dependency/timeout/skip changes proposed.

## Review and authority

- Independent behaviour/security assessment: Pending; orchestrator must record named actual reviewers and their findings before existing baseline edits.
- Test-owner decision: Proposed, not yet applied.
- Human product approval: user authorized completing attendee F01 integration; user accepted the parent recommendation of start-date-only on 2026-10-21, resolving the earlier conflict.
- Correction execution, RED result, replacement baseline and protected paths: Pending. Freeze after independent adequacy review and pre-implementation execution; developer never edits these tests.
- Existing backend programme tests remain protected and unchanged unless a separately approved date-rule change requires test-owner corrections.


## Applied reviewed correction and pre-implementation evidence

- Independent reviewer `/root/f01_review` approved the bounded proposal before editing and then the exact executable diff after editing. Review included behaviour/security adequacy: all historical assertions retained, producer-generated fixture types, six enums, exact/partial totals and Previous, null published event and negative/fractional total failure/retry, existing stale identity/selection/role boundaries unchanged. No blocking findings; runtime server/browser/lifecycle evidence remains separate.
- Test owner `/root/f01_tests` applied only the two approved fixture/acceptance paths. All 30 historical expanded cases remain; new PB25/26/27 add six expanded cases, total 36. No runner, config, timeout, dependency, skip directive or production file changes.
- TypeScript compilation passed on the updated fixtures/tests with existing app compiler configuration.
- Selected pre-implementation RED: bundled Node24, UTC, NODE_OPTIONS=--no-experimental-webstorage; `vitest run tests/acceptance/programme-browsing.test.tsx -t PB26 --maxWorkers=1 --testTimeout=30000`: 1 failed, 35 unselected, 14.73 seconds. The application still requested its old path, displayed the safe unavailable error, and failed to render the producer event needed to open the panel. This is an expected integration contract failure, not import/configuration failure, and does not prove the deeper panel assertions executed. The 35 reported skipped cases were command selection only; no test is disabled in source. Full post-implementation execution must run all 36.
- Replacement immutable baseline: parent to create and record before developer starts. Historical baseline remains preserved; no broad historical guard pass claimed across the earlier master merge.
