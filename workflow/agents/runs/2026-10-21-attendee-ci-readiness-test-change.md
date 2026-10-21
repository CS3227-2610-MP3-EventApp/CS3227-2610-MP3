# Attendee overnight-detail CI readiness correction

- Request ID: BROWSE-TCR-04; test owner/requester: `/root/f01_tests`; date: 2026-10-21, Asia/Singapore; PR9 attendee browsing CI follow-up.
- Pre-change snapshot: `a908f7c045be3bfcab21f34aad94b5c05662e052`. Protected edit scope: only `frontend/tests/acceptance/programme-browsing.test.tsx`, PB03 line 116. Existing integration test baseline/approval history remains preserved in [BROWSE-TCR-03](2026-10-21-attendee-integration-test-change.md).
- Specification: canonical programme revision 7 with its 2026-10-21 approved attendee integration amendment; F01-US03 event-local detail rendering. No product requirement changes.

## Observed failure and cause

User-provided GitHub Actions log for Node 20.20.2/Ubuntu 24.04 at the exact snapshot above reports 252/253 frontend cases passing. The failed case is **PB03**, not PB04: `displays overnight times in the event timezone and zero price as Free`. Line116 immediately calls getByText for the expected 23:30 time; captured DOM still displays `Loading programme…`. PB04 passes in that log.

The test first awaits observation of the detail HTTP request, which does not prove response decoding or React state/render completion. The next synchronous rendered-time lookup therefore races normal asynchronous loading. This is a test readiness defect supported by the captured DOM; the evidence does not establish a product timezone defect or promise the failure reproduces on every local run.

## Approved minimal correction

Change only the first timezone assertion from `expect(screen.getByText(existing time regex)).toBeVisible()` to `expect(await screen.findByText(the identical regex)).toBeVisible()`. Retain the request-observation assertion, the exact expected time pattern, the 01:00 assertion, both calendar-date assertions, Free assertion and all other cases. This polls for the required visible output using the existing bounded Testing Library wait. It is not a sleep or a relaxed product/performance expectation.

No application, fixture, test configuration, timeout, dependency, skip or discovery changes. No expected values changed and no assertions removed; only the first detail-time lookup becomes asynchronous. Alternatives rejected: arbitrary delay, higher timeout, weakened selector, deleted timezone/date assertions or production scheduling changes unsupported by a product defect.

## Independent review and authority

- Actual independent behaviour/security reviewer `/root/f01_review` inspected the pasted CI failure and current source before the protected edit. Approved this exact one-line asynchronous-readiness correction; request interception precedes decoded/rendered response, and every expected result remains unchanged. No product behaviour approval needed because the required outcome is unchanged.
- Human requester authorized fixing PR9 CI. Test owner `/root/f01_tests` owns the correction; production developer does not edit this baseline.
- Exact executable diff review and focused execution evidence: pending below. No commit/push by test owner. Parent owns resulting immutable correction identity and session log.


## Exact diff review and scoped execution

- Independent `/root/f01_review` rechecked the saved one-line executable diff and TCR: identical time regex, request-observation wait, 01:00 and both date assertions retained; no other production/fixture/config/package/CI changes. Scoped whitespace check passed.
- Focused PB03 command from frontend: bundled Node 24 with TZ=UTC and NODE_OPTIONS=--no-experimental-webstorage, `node_modules/vitest/vitest.mjs run tests/acceptance/programme-browsing.test.tsx -t PB03 --maxWorkers=1`. No test-timeout override. Result: 1 passed, 35 command-unselected, 16.44 seconds total; exit 0. This is Windows/Node 24 local evidence, not a rerun of Ubuntu/Node20 CI.
- Complete 36-case attendee browsing suite at the same source, same process settings and no name filter: 36/36 passed, 220.94 seconds total (96.22 seconds tests; 104.03 seconds setup), exit 0. No full 253-case suite or build requested for this one-line test-only follow-up.
