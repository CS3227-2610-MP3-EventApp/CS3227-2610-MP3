# Test baseline change request SETUP-TCR-04

- Requester/date: orchestrator `/root`,2026-10-21; test owner `/root/preparation_scenarios`.
- Protected source: frontend/tests/business-setup.test.tsx, the two parameterized mismatch/conflict cases; original baseline2db4a2f986a0ead73de15f83a0c33906658d54cc and pending reviewed replacements retained in phase run.
- Observed evidence reported by root: current UI14/16; broad findByText(/changed|review|conflict/i) also matches existing Application Review navigation. This is a selector ambiguity, not evidence that navigation text satisfies setup conflict feedback. No test-owner execution claimed for this finding.
- Contract/expected behavior: setup AC05 announces actionable setup conflict/reconciliation feedback, preserves edited private facts and never automatically replays publication. Existing navigation may legitimately contain Review.
- Proposed narrow correction: scope query to setup section and findByRole alert; retain the same message pattern and visibility assertion. Preserve both mismatch/conflict cases and all no-replay/storage assertions. Do not remove the message assertion, change production behavior or weaken other cases.
- Independent assessment: behaviour reviewer prospectively approved this exact selector-only correction, relayed by orchestrator. Applied-delta review remains pending.
- Authority/status: on2026-10-21 user explicitly replied “Approve this selector-only correction”, authorizing the two conflict/reconciliation assertions scoped to setup error alert with message/no-replay/privacy checks preserved. Owner applied only that selector correction after new authority. User separately approved TCR03 test-name-only fix; the prior automatic rejection was not bypassed. Final delta review/replacement baseline pending.
- Test owner decision: agrees selector should address the setup error itself. Human product behavior change N/A; underlying conflict/privacy behavior unchanged.
- Correction commit, affected checks, immutable replacement baseline/protected paths: pending required authorization, owner correction and orchestrator freeze. Preserve original failures and baseline history.
