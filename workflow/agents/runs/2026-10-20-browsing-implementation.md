# Attendee programme frontend implementation

- Date/timezone: 2026-10-20, Asia/Singapore. Human owner: Yik Bing.
- Branch: `feat/yikbing-programme-browsing`; starting commit: `9b79a7721a2891ca707bc6dd93ef7c874e40ef26`.
- Reviewed implementation: `63d8de4ffd9296e84d8ee148b78300171cbc1fdb`.
- Scope: the requester-approved revision-7 attendee read contract, with approval recorded in specification revision 8. The full shared capability remains Draft; producer ownership and contributor agreement are unresolved.
- Human teammate review and human correctness verification of this summary: **Pending**.

## Authorization and actual assignments

Yik Bing had already authorized the attendee scope, fixture-backed progression and test-first workflow. When asked why development had not continued automatically, the coordinator acknowledged the unnecessary milestone stop and proceeded without another permission request. No additional approval was needed for this frontend consumer. That authorization does not cover organiser writes, production deployment or claims of real producer integration.

The actual developer, `/root/attendee_developer` (GPT-6 Luna/high), received the canonical repository path, approved contract, frozen tests, role instructions, file ownership and both immutable baseline references. Its application ownership was limited to `App.tsx`, `Workspace.tsx`, new `Programme.tsx`, `programmeApi.ts` and `programmeTypes.ts`. No test, fixture, runner, configuration, backend or dependency edits were allowed. The developer made no commits or nested-agent assignments.

The coordinator owned guides, session/run records, snapshots and final verification. Independent behaviour reviewer `/root/browse_behaviour_review` and security reviewer `/root/attendee_security_review` (both GPT-6.1 Sol/high) inspected the same saved source fingerprints. They did not implement their own reviewed fixes or run UI tests concurrently with the developer. Generic actual subagents received repository role instructions; native custom-role discovery was not demonstrated.

## Frozen tests and protection

The [test-first run](2026-10-20-browsing-test-first.md) remains authoritative:

- Primary test baseline: `4ee5b7c29a8efb212050ecef3b322275ed12c4b9`, covering its 22 concrete protected paths.
- Run-record seal: `9b79a7721a2891ca707bc6dd93ef7c874e40ef26`.
- Both baseline checks passed after implementation, independently checked by the behaviour reviewer and coordinator. Tests, fixtures, configuration, runner expectations and baseline records remain unchanged.

The approved runner uses bundled Node 24.19.0, Vitest 4.1.11 and `TZ=UTC`. From `frontend/`:

```powershell
& 'C:/Users/yikbi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/vitest/vitest.mjs run --maxWorkers=1 --testTimeout=30000
```

The timeout is the reviewed harness accommodation in BROWSE-TCR-02, not a product latency target. No cases, assertions or failures were skipped.

## Implementation and review findings

The frontend provides attendee-only event, activity and detail routes; real same-origin credentialed GET calls; title/type/date query transport; pagination; event-local time, SGD/free-price and declared-capacity display; separate accessibility notes; loading, empty, failure and retry states; and stale-response suppression across filters, events, logout and account changes. A 401 clears the actor. Production code has no fixture import or synthetic fallback.

Review identified and corrected these application defects before final approval:

1. One pagination offset could carry an event-catalogue page into a newly selected event. Offsets now belong to their pathname.
2. Floating-point currency formatting lost a cent at the accepted maximum safe-integer minor-unit amount. Integer major/remainder formatting preserves exact cents. The behaviour reviewer extracted the actual saved helper and checked seven amounts, including the maximum.
3. Native input `maxLength` counted UTF-16 units rather than the approved Unicode code points. The saved predicate accepts 200 astral code points and rejects 201; the narrower native limit was removed.
4. Response validation initially confused the queried event-list path with an item response, and state was referenced before initialization. Both were fixed before passing execution. Runtime validation remains basic shape checking, not proof of full server-contract enforcement.
5. After the new browsing suite passed, the first full suite found duplicate visible card-heading/action text in two historical UI checks. The developer corrected application wording without changing tests.
6. Review of that wording fix caught a visible/accessibility-name mismatch. The final action has both visible and accessible name “Explore programme”; the card heading remains “Browse Programme”. Invalidated intermediate runs were cancelled and are not reported as passing evidence.

Both reviewers found no remaining actionable issues in the final frontend scope. The final Workspace SHA-256 is `44AEF7A637682C6FDF0AFDEB512FF62E98E065BF3AD4A059B00FB593E8F5C966`; the other four reviewed source fingerprints remained unchanged. The coordinator confirmed all five fingerprints after the final run.

## Actual verification

| Check | Result and scope |
| --- | --- |
| Initial focused browsing suite | 30/30 passed; 62.46 seconds. |
| First full suite | 103/105 passed; two duplicate-text UI failures, fixed in application code. |
| Affected-file recheck | 51/51 passed on the intermediate wording fix. Its later accessibility refinement was separately reviewed. |
| Final exact-source full suite | **105/105 passed across five files**, 221.15 seconds, on source commit `63d8de4`. No source changed during execution. |
| TypeScript | `tsc -p tsconfig.app.json --noEmit` passed; coordinator also ran the project build. |
| Final production build | TypeScript project build and Vite build passed. JS bundle: 540.91 kB minified, 169.01 kB gzip; the existing-style 500 kB chunk warning remains. No performance limit was changed. |
| Baseline integrity | Both immutable baseline checks passed. |
| Documentation/artifact checks | Local guide links and diff whitespace checks passed. Selected acceptance-fixture sentinel strings were absent from built JS; this is a narrow supplementary check. |

## Completion boundary and next dependency

The fixture-tested attendee frontend is implemented and independently reviewed. It is not the completed live programme feature. Publication and read endpoints, producer agreement, generated producer OpenAPI types, server permissions/visibility/filtering/no-store behavior, persistence/restart, real end-to-end integration, online delivery and real-browser visual/keyboard verification remain pending. No backend suite was rerun because no backend files changed.

`programmeTypes.ts` is explicitly interim consumer typing, not generated schema evidence. Current backend requests can fail because programme endpoints are unavailable; the UI reports the failure rather than inventing data. The full capability was not marked Ready or Completed. No push, PR, merge or deployment was performed.

The [session summary](../../../logs/yikbing/2026-10-20-programme-browsing-preparation.md) records the interaction history. Presentation-worthy findings and their evidence limits were sent to **Prepare MP3 Presentation**, thread `01a14f7a-11db-7cb0-a7ed-a86db5c541be`, under the user's explicit authorization. No presentation artifact edits or measured coordination/cost savings were claimed.
