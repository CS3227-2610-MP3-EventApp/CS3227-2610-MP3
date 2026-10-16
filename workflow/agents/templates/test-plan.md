# Feature test plan
Status: Draft / Reviewed baseline (select and provide evidence)
Feature/story IDs:
Approved specification/contract revisions:
Designer identity; independent reviewers and review scope:
Baseline commit; protected paths; full-suite commands:

## Cases
For each case record:
- Test ID and acceptance/security criterion IDs.
- Behaviour/risk and test level (unit, integration, end-to-end, manual).
- Synthetic setup, actor/permissions, input/action, and boundary values.
- Expected observable result, persisted side effects, and records that must remain unchanged.
- Executable test path/name or manual procedure.
- Mock/stub limits and required real-component follow-up.
- Pre-implementation execution result: meaningful red, harness failure, or deferred with reason.

## Adequacy checklist
- Success, rejection, boundaries, failure/state preservation.
- Wrong user/event/business, inactive membership, draft/private data.
- Stale revisions, concurrency, retries/deduplication where applicable.
- Persistence/restart, migrations, real producer/consumer integration.
- AI schema/evidence/injection/fallback/limits and exact approvals where applicable.
- Accessibility/usability, resource limits and deployment where applicable.
- Expected results follow the approved specification, not incidental implementation.
- Tests can detect an incorrect implementation; assertions and fixtures have independent review.

Record N/A reasons, gaps, human decisions, review findings, and baseline approval evidence. Later coverage additions require review; never claim all future tests can be known in advance.
