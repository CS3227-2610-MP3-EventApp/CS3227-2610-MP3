# Test baseline change request SETUP-TCR-02

- Requester/date: orchestrator `/root`,2026-10-21; test owner `/root/preparation_scenarios`.
- Old immutable baseline:2db4a2f986a0ead73de15f83a0c33906658d54cc; protected path frontend/tests/business-setup.test.tsx; setup specification r1.
- Evidence: prospective fixture fault independently identified by root/frontend inspection; no executed failure claimed in this request. The inert-saved-text fixture sets nonnull saved facts while retaining virtual-empty revision1/updatedAtnull; corrected authoritative retry and four foreign-reference fixtures have the same invalid saved envelope.
- Contract: virtual revision1 is empty with null updatedAt; first persisted save is revision2 with UTC timestamp. Saved inert text and recovered authoritative facts must display; foreign reference cases should fail only because reference IDs violate current scope.
- Proposed narrow correction: set revision2 and fixed synthetic UTC updatedAt on inert saved fixture, corrected retry fixture and four foreign-reference fixtures. Keep intentionally invalid revision0 initial response unchanged. Preserve every behavioral assertion, marker, reference mutation and empty-state fixture.
- Cause: test-fixture inconsistency with approved lifecycle, not product behavior change or reason to relax production validation. Preserving invalid saved envelopes would test unrelated rejection instead of intended display/scope behavior.
- Independent verifier assessment: independent behaviour reviewer approved exact fixture corrections, then confirmed the applied delta, as relayed by orchestrator; owner correction authorized after initial assessment. Metadata frozen for replacement baseline.
- Test owner decision: `/root/preparation_scenarios` applied only the specified revision2/UTCtimestamp changes to saved/inert, corrected retry and foreign-reference envelopes. Initial revision0 and every assertion/reference mutation preserved. Human product approval N/A: lifecycle unchanged.
- Correction commit/checks/replacement baseline: pending orchestrator after owner correction and delta review; original evidence remains attached to old baseline.
