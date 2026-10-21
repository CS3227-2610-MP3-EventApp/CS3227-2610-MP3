# Test baseline change request SETUP-TCR-01

- Requester: orchestrator `/root`; owner `/root/preparation_scenarios`;2026-10-21 Phase3 setup r1.
- Prior baseline: bd6dcef7fce2027074b95b284ae5965e3c578feb; Phase2 final source1aa821ef1213830694150ab00c39a5c3a7482d8d.
- Protected path proposed correction: backend/tests/test_business_applications.py, nonhistorical assert_current_schema expected table set only.
- Evidence: prospective incompatibility by inspection, no actual failure claimed. Approved additive migration0007 introduces participation_setup, absent from previous closed HEAD table expectation.
- Criterion: setup AC06 additive persistence, preserving application/decision/preparation history and exact unexpected-table detection.
- Proposed correction: add only literal participation_setup to nonhistorical expected table union; retain exact equality, historical branch and constraints. Removing equality/subset checks rejected.
- Independent verifier assessment: actual `/root/phase2_final_behaviour` approved only literal participation_setup addition to nonhistorical HEAD expectation; equality/history/constraints/discovery untouched. Orchestrator authorized owner correction after assessment.
- Human product behavior change: none; approved setup persistence already requires additive data. Test owner `/root/preparation_scenarios` applied the narrow correction.
- Correction commit/replacement baseline/checks: pending orchestrator; retain historical baseline/evidence.
