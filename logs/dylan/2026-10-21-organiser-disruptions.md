# F05 programme disruptions session

- Date/timezone and owner: 2026-10-21, Asia/Singapore; Dylan.
- Branch/source: `feat/organiser-disruptions`, clean local master `3c5ff1e`.
- Coverage: visible approved plan, actual agent messages, working files and command output. Earlier conversations are context, not reconstructed transcripts.
- AI factual check: checked against the evidence below; final verification results are in the linked run record.
- Human verification: Pending. Dylan has not yet checked this summary.

## Prompts and interactions

Dylan approved the complete F05 plan: published edits/final cancellation, private manual/AI announcement drafting and minimal attendee updates UI, with accepted-itinerary notifications explicitly gated on the teammate's real F02 implementation. The plan requested actual specialist handoffs and test-first review; it did not authorize taking over F02, pushing or deploying.

The orchestrator created the feature branch and assigned `/root/f05_spec` to three Draft refinements, `/root/f05_tests` to independent acceptance design, `/root/f05_backend` to programme/disruption persistence/API, and `/root/f05_ai` to durable announcement jobs. `/root/ai_analysis_behaviour_draft_review` and `/root/f05_security` independently reviewed contracts/tests and later implementation. Root owned UI, documentation, serial isolated-PostgreSQL execution and integration. The backend developer became unavailable after writing its assigned files; root completed integration and repairs rather than claiming a completed agent review.

The analyst initially drifted on routes/criterion meanings; root requested correction while preserving existing acceptance IDs. The test owner made the reviewed additive current-schema table expectation correction, without weakening historical checks. The new acceptance baseline was committed separately before application implementation. Missing endpoints produced a real HTTP404 RED failure after successful authentication/publication setup.

Initial integration exposed overly strict optional accessibility notes; root corrected production validation only. The focused core/AI suite then passed 42 cases. The full pre-review suite passed 313 backend and 265 frontend cases. Independent review found a real authority-revocation race and oldest-first history paging that hid the current change after 50 entries. A claimed published-announcement edit hole was disproved by the existing shared draft-state guard; the reviewer explicitly withdrew that finding.

The test owner added TCR-F05-002: six real-authentication revocation interleavings, 51-change pagination, and published-text immutability. Independent adequacy review approved it. Root observed seven expected failures and one pass before fixing authority-before-event lock ordering and newest-first history. All eight then passed. No guard was removed or test expectation weakened to fit implementation.

Final documentation review noticed the shared AI-task Draft still described only application analysis. Root requested a bounded analyst amendment for the explicit announcement workflow, nullable domain targets, shared limits and retained domain drafts; this late documentation correction is not described as a pre-implementation approval. A separate independently reviewed populated migration regression passed, preserving legacy facts across 21 tables.

## Decisions and actions

- Added migration `20261021_0006`, append-only programme snapshots/change evidence, final cancellation, current-only attendee reads and protected referenced locations.
- Added owner-private versioned announcement text, exact 15-minute publication previews, explicit publish/replay handling, immutable published text and event attendee reads.
- Extended existing AI jobs with a real workflow kind and source-change target, sharing limits/cancellation/deadlines. Model output selects bounded editorial phrases; server records render authoritative facts. Manual authoring remains independent of AI.
- Added organiser change/cancel/history/announcement UI and minimal attendee announcement/inbox screens, preserving timezone, SGD and theme conventions. Before/after previews use named locations, event-local times and SGD dollars.
- Added notification persistence and owner-scoped routes behind an explicit integration gate. No fake F02 records or successful fabricated empty recipient result. Historic blocked changes are not retargeted later.
- Updated architecture/security/user/developer guidance and [testing/handoff](../../docs/DisruptionsTesting.md).

## Verification and limitations

Actual test results, protected SHAs and reviewed snapshots are in [the run record](../../workflow/agents/runs/2026-10-21-organiser-disruptions.md): final full backend 321 passed, plus the additional populated migration case passed separately; all 266 frontend cases and builds passed on Node 20/22/24/26. A direct real SoCLaaS call using fixed invented lantern-workshop time/room changes passed source-bound structured validation in 0.91 seconds with model identifier `default`. It used no database source and performed no draft save/publication; it is not a full worker/browser demonstration.

Exact-written-spec teammate approval is not fabricated; the three refined specifications remain Draft revision 2. F02 delivery/race/end-to-end verification is blocked on the real teammate-owned producer. Browser/mobile/screen-reader, actual restart and deployed checks remain pending unless separately recorded. Existing dependency/deprecation and frontend bundle-size warnings are not resolved by this feature.

## Reflection and next steps

Independent race tests caught a permission gap that sequential happy-path tests missed. Review findings also required checking shared helpers before changing code: one alleged bug was already prevented. Integrate the real F02 contract, verify recipient/acceptance races, run manual UI flows, obtain human review and only then assess full F05 completion.
