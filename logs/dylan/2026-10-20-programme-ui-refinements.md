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

## Implemented outcome

The approved frontend changes are implemented: floated empty-select labels, named pencil/trash controls, exact SGD dollar-to-cent validation/conversion, and MUI activity calendar/time pickers retaining event timezone, DST and server timestamp precision. Published deletion remains excluded; draft/activity and unused-location deletion instructions are in the User Guide. No backend/API/database changes or user Compose edits were made.

Actual developer and independent behaviour/security reviewers checked the same source SHA-256 recorded in the run record, with no blocking product findings. A long three-form acceptance journey exceeded its default five-second test budget; the test owner and independent verifier investigated before a narrowly scoped harness correction, retaining all assertions. Final baseline and verification results are recorded in the run record rather than implying that the diagnostic extended-budget run was the acceptance gate. Root production build passed with the visible large-chunk advisory. Real-browser visual/theme checks and human teammate/summary verification remain pending.

Final ordinary frontend suite: 119/119 tests passed across six files in 53.11 seconds. Replacement protected baseline `6a4978dd5bb1a165f0dd265cde034f7c4fec241d` and its integrity guard passed. No database migration or backend restart is required for these UI changes.

## Follow-up: future cancellation and branch story coverage

Dylan requested a future database-mechanism reminder under the user story and a report of completed branch stories. Added an F05-US01 catalogue note: retained cancelled status/ID/history regardless of reference count, cancellation actor/time, revision-checked confirmed atomic change/audit, retained plan references, default discovery exclusion and explicit future contract decisions. No cancellation implementation, schema migration or event-creation story was added. The linked Draft remains subject to refinement/approval before implementation.

Existing branch evidence covers organiser implementation of F01-US01, F01-US02 and F04-US03; F01-US03 has the published read API only, not the attendee UI journey. Full deployment, browser visual and human teammate verification remain pending. This follow-up is documentation-only; historical automated results above were not rerun as application tests for it.
