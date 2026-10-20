# Programme UI refinement session

- Owner/date: Dylan, 2026-10-20, Asia/Singapore.
- Branch: `feat/organiser-programme`.
- Source: visible user screenshots/request and subsequent approval; not a complete historic chat transcript.
- Human summary verification: pending.

## Request and approval

Dylan reported Venue/Room placeholder-label overlap, requested pencil/trash actions, SGD dollar entry with two-decimal validation and MUI calendar controls, and asked how deletion works. The orchestrator proposed those bounded changes while retaining existing cents API/timezone/lifecycle rules. Dylan approved and asked why published activities cannot be deleted.

The orchestrator explained that published IDs/facts must remain referencable for attendees and later plans/notifications; future cancellation belongs to the later published-change feature. No published-deletion permission was inferred from the question.

## Actions and evidence

Repository instructions/role files and applicable code/contracts were inspected. Ponytail and test-first guidance are used for scoped implementation. The user-owned Compose port change is preserved. Actual read-only analyst and independent test-owner handoffs, dependency metadata/install results and subsequent gates are recorded in the [run record](../../workflow/agents/runs/2026-10-20-programme-ui-refinements.md).

No production backend/database changes are planned. Current checks, approval boundaries and unexecuted browser/human checks must remain distinguished in the final handoff.
