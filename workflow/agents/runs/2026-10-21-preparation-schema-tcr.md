# Test baseline change request

- Request ID: PREP-TCR-01; requester: orchestrator `/root`, 2026-10-21; Phase2 preparation r3.
- Old baseline/source: `4b525f1` (orchestrator to record full immutable baseline SHA); protected file: backend/tests/test_business_applications.py.
- Observed issue: prospective compatibility defect found by root/developer inspection before baseline; no actual failing run claimed. `assert_current_schema()` compares the head schema against a closed table set that cannot include the newly approved additive preparation table.
- Criterion: preparation AC08/10 requires persistent independent preparation; existing application schema regression checks must continue detecting unexpected tables and preserve historical migration checks.
- Cause: test expectation predates approved additive feature, not evidence of an implementation defect or a new product policy.
- Proposed correction: add only literal `preparation_documents` to the nonhistorical expected table set. Keep exact equality, constraint assertions and historical branch unchanged. Broad subset comparisons/removing schema checks rejected because they weaken coverage.
- Coverage/security impact: retains unexpected-table detection, migration history and all existing domain constraints; recognizes one approved module-owned table before implementation.
- Independent verifier assessment: actual `/root/f06_status` supports literal addition only to nonhistorical HEAD; no equality/history/constraint weakening, prospective defect honestly distinguished from executed failure. Orchestrator authorized correction after this assessment.
- Test owner: `/root/preparation_scenarios`; accepted and applied the single literal addition. No production edits.
- Human product behavior approval: N/A for this test correction; r3 persistent manual preparation already approved as reported by orchestrator. No acceptance behavior changes.
- Correction commit/checks and replacement immutable baseline: pending orchestrator after approval; preserve prior baseline evidence.
