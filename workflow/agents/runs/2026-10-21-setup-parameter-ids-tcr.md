# Test baseline change request SETUP-TCR-03

- Requester/date/run: orchestrator `/root`,2026-10-21, Phase3 setup verification; test owner `/root/preparation_scenarios`.
- Old baseline:2db4a2f986a0ead73de15f83a0c33906658d54cc with pending approved SETUP-TCR-02 fixture replacement; protected backend/tests/test_business_setup.py.
- Observed evidence reported by root: focused run1 failed/16 passed/2 errors. Auto-generated parameter ID for5001 emoji characters expands escaped text beyond Windows32767 environment-variable limit; pytest assigning PYTEST_CURRENT_TEST raises ValueError during setup/teardown. The separate PUT500 failure is a production defect assigned to developer, not covered by this correction.
- Relevant behavior: AC04 strict rejection of oversized setup instructions and other unchanged validation cases. Test discovery and all11 parameter value tuples must remain intact.
- Cause: Windows harness naming limit, not invalid expected product behavior.
- Proposed correction: add11 explicit short parameter IDs only to the existing strict-validation parametrize decorator. Preserve values, case count, assertions, selection/configuration and every production file. Removing/shortening Unicode payloads or skipping cases rejected because that weakens boundary coverage.
- Independent verifier assessment: behaviour reviewer approved exactly11 unique short IDs only, relayed by orchestrator before attempted owner correction.
- Test owner decision: supports narrow harness correction; human product behavior approval N/A because expectations unchanged. Automatic approval review initially rejected protected edit for missing trusted exact authorization; no bypass attempted. On2026-10-21 user explicitly replied “Approve the test-name-only fix”, authorizing11 short parameter names while preserving every payload,5001emoji case, assertion and case count. Owner applied only explicit IDs after this new authority; final delta review/baseline pending.
- Correction commit/checks/replacement baseline: pending owner correction after review and orchestrator immutable baseline; retain original result and TCR02 history.
