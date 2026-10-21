# AI-MIG-TCR-01: Current-head AI schema expectation

- Requester/date: `/root`, 2026-10-21, for the AI analysis migration test baseline.
- Old baseline: `f34db4d` (as supplied by the orchestrator). Protected path: `backend/tests/test_business_applications.py`; exact-schema helper `assert_current_schema`.
- Observed issue: the protected full-head schema catalogue still expects only authentication, business-application and programme tables. The additive AI migration introduces four additional current-head tables, so the exact catalogue assertion rejects the expected schema.
- Relevant scope: F04-US02 and organiser F10-US02 AI analysis/task persistence; current-head migration catalogue. This is an expected-schema correction, not a product behavior change.
- Cause: protected test expectation predates the additive AI migration. Existing exact schema equality is correct and must remain strict.
- Proposed and approved correction: define `AI_TABLES = {"analysis_rubric_versions", "ai_jobs", "ai_reports", "ai_provider_attempts"}` and include it only in the non-historical/current-head expected table set. Keep exact set equality. Leave the historical schema branch and all existing constraint, foreign-key, nullability, migration, and data-preservation checks unchanged.
- Alternatives rejected: changing equality to subset membership would stop detecting unexpected tables; adding AI tables to historical expectations would falsify the prior migration state; omitting any of the four expected tables would leave the current-head contract incomplete.
- Coverage/security/regression impact: no assertion is removed or weakened. The exact current-head catalogue now detects both missing and unexpected tables; the historical catalogue remains unchanged and exact.
- Independent verifier assessment: `/root/ai_analysis_behaviour_draft_review` approved this precise current-head-only addition, retaining strict equality and the historical expected set. No product behavior changed; separate human product approval is N/A for this test correction.
- Test-owner decision: approved and applied only the table constant/current-head expected-set union in `backend/tests/test_business_applications.py`; no production code or migration edited.
- Execution: targeted/full backend test result and replacement baseline are owned by `/root`; no concurrent test run is claimed here.
- Replacement baseline commit and final protected path set: pending `/root` verification and freeze. Preserve `f34db4d` as the prior immutable baseline evidence.
