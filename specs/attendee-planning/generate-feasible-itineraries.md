# Generate feasible itineraries

| Field | Value |
| --- | --- |
| Stable capability ID | `generate-feasible-itineraries` |
| Covered stories | [F03-US01](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 3 / Draft |
| Product roles / roadmap reference | Attendee; [phase 3, order 8](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | GFI-01 to GFI-03 defaults approved by Yik Bing in chat on 2026-10-22; exact revision-2 text approved by Yik Bing in chat on 2026-10-22; revision-3 removal of the synthetic-data confirmation requested and approved by Yik Bing in chat on 2026-10-22 |
| Review / run record | Pending independent draft review and later implementation records |

Follow the [standard](../README.md). This capability offers an attendee a grounded, feasible AI plan to review and optionally accept. It does not book places, silently replace an accepted plan or treat model prose as validation.

## Product outcome, users and scope

The authenticated attendee requests a plan for an event using their permitted preferences and published programme facts. The result is either a validated feasible private draft with explanations or an explicit infeasibility result identifying constraints to reconsider. The attendee LLM integration is part of the project role coverage gate, subject to real provider evidence. Manual planning remains available.

## Use cases and user interface

The user requests generation, monitors their job, then reviews ordered proposed activities, relevant current facts, reasons for each suggestion, sources, constraint results and any unknowns. They may save a valid draft and explicitly accept a current valid version. An infeasible, failed, cancelled or quota-limited run has a clear outcome and a manual planning path. Stale suggestions are marked and cannot be represented as current feasible recommendations. Controls and validation messages are accessible by keyboard and assistive technology.

## Inputs, outputs and functional contract

Inputs are owner/event identity, event-specific preferences and hard/soft constraints, permitted published item facts and revisions, and an optional explicit request scope. Output is a versioned, owner-scoped validated itinerary draft whose activity IDs/revisions, ordered times, reasons, constraint results and source references match permitted current records; or a structured infeasible/failure result with no accepted-plan change. Job ownership/status/failure/cancellation follow [monitor and recover AI tasks](../shared/monitor-and-recover-ai-tasks.md). Saving a draft does not accept it. Acceptance rechecks current programme revisions and constraints and creates a new accepted plan version only after explicit attendee action.

### Concrete contract (revision 2, approved by Yik Bing in chat 2026-10-22)

- `POST /api/v1/attendee/events/{eventId}/itinerary-generations` (attendee role only; trusted Origin) with `{requestId, preferenceRevision}` returns `202` and a job `{id, eventId, state, createdAt, updatedAt, completedAt, failureCode, providerMayHaveRun, result}`. `GET /api/v1/attendee/ai/jobs/{jobId}` reads it and `POST /api/v1/attendee/ai/jobs/{jobId}/cancel` cancels it. Foreign or missing jobs return 404. Responses are no-store. Errors use the existing problem format: malformed 422, stale or active-job or duplicate conflicts 409, daily limit 429, disabled or missing provider configuration 503. Job tables, routes and worker queries are attendee-specific and additive; the organiser `ai_jobs` schema is unchanged. The provider transport, limits and claim/lease/recovery pattern are shared with the organiser slice.
- `state` is `pending`, `running`, `completed`, `failed` or `cancelled`. `result` is null unless completed and validated. It is either `{outcome: "feasible", items: [{itemId, itemRevision, startsAt, endsAt, reason, sourceLabel}], constraintResults, preferenceRevision, observedProgrammeRevisions}` or `{outcome: "infeasible", blockingConstraints: [{constraint, detail}]}`. `constraintResults` is a list of `{constraint: "overlap"|"budget"|"accessibility", passed}`; `observedProgrammeRevisions` maps each `itemId` to its revision. Items are ordered, reference only published, non-cancelled items of that event, and carry the revisions observed at generation.
- The model cannot save or accept anything. A feasible result becomes the attendee's private draft only when they explicitly save it through the existing draft API (current revision tokens apply). Acceptance uses the existing acceptance API, which rechecks current facts and hard constraints. A stale result cannot be presented as current.
- Hard constraints are overlap, the budget ceiling and explicit accessibility requirements; unknown accessibility is flagged and needs confirmation. The 15-minute break every two hours is a soft preference. Validation reuses the existing deterministic planning checks, never the model's own claims.
- Outbound data to the provider is limited to the event's published programme facts (item ID, title, type, start and end, room label, price in cents, accessibility facts) and the attendee's interests, budget and break preferences, with pseudonymous source labels. It excludes username, email, other attendees' data, venue name and address, and all accessibility preference data (the server checks accessibility deterministically against item facts). The server does not verify a model's claim of infeasibility (known limitation; manual planning remains available). Programme descriptions are untrusted data.
- Limits match the organiser slice: 60-second provider request, 180-second job deadline, 40,000 outbound characters, 4,000 output tokens, 10 jobs per owner per UTC day, one active job per owner, one retry only for HTTP 502 or 503, none for timeouts, transport errors, 429 or invalid output. Terminal jobs and results expire after 30 days. Live provider calls are enabled only in development or test with synthetic events (`AI_SYNTHETIC_EVENT_IDS`), enforced by the server; production stays disabled. Revision 3: the request no longer carries `confirmSynthetic` and the page has no confirmation checkbox (a request containing `confirmSynthetic` or any other unknown key is rejected with 422); the page instead shows the plain notice "Your preferences and the programme are sent to an external AI service. Do not enter personal details." The server allowlist is the control.

## Constraints, security and non-functional requirements

Apply RD03, RD04 and RD07, [SEC01–06, SEC08 and SEC10](../../docs/security.md), and [AI/plan contracts](../../docs/architecture.md#required-relationship-rules). Only minimum permitted data may leave the server; private fields require agreed provider/data policy. Untrusted item descriptions never set instructions or tool permissions. Factual references and schema validate before display. A failed, cancelled or malformed run leaves previously accepted plans unchanged. Timeouts, quotas and retention require agreed values before Ready. Provider integration, security, accessibility and environment separation require revision-specific verification.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| generate-feasible-itineraries-AC01 | Given permitted current programme facts and preferences, when an owner requests a feasible plan, then they receive a private ordered draft with item IDs/revisions, reasons, constraint results and factual references that match those facts. | F03-US01; RD03; SEC01-05 | Positive grounding and ownership |
| generate-feasible-itineraries-AC02 | Given no plan satisfies the hard constraints, when generation completes, then the user sees infeasibility and the blocking constraints rather than an invalid draft labelled feasible; accepted state is unchanged. | F03-US01; RD03; SEC05 | Infeasible fixture and state comparison |
| generate-feasible-itineraries-AC03 | Given malformed, fabricated, contradictory or stale model output, when validation runs, then it is not displayed as a valid recommendation or saved as an accepted plan; failure/recovery is visible. | F03-US01; SEC04-05 | Fabricated IDs, times and revisions |
| generate-feasible-itineraries-AC04 | Given injection text inside permitted source material, when a plan is generated, then instruction, disclosure and unauthorized-action attempts have no effect on permissions or outputs. | F03-US01; SEC03, SEC06, SEC08 | Injection and outbound inspection |
| generate-feasible-itineraries-AC05 | Given a saved validated draft, when its owner explicitly accepts it, then current facts and all hard constraints are rechecked and a new accepted version persists; a stale or invalid acceptance preserves the prior accepted version. | F03-US01; RD03-04; SEC05-06 | Race and acceptance boundary |
| generate-feasible-itineraries-AC06 | Given wrong-user job access, cancellation, timeout, quota exhaustion or provider failure, when the job is accessed or ends, then access is denied or the applicable status is shown only to its owner; accepted data is retained and manual planning remains usable. | F03-US01; RD07; SEC01, SEC08, SEC10 | Job/privacy/fallback cases |

## External interfaces and dependencies

Consumes [manual plan and preference versions](manage-preferences-and-itineraries.md), [published programme](../programme/create-and-publish-programme.md), [workspace authorization](../shared/access-authorised-workspaces.md), and [AI task status](../shared/monitor-and-recover-ai-tasks.md). The boundary returns a validated draft with source item revisions and constraint results, or infeasible/failed/cancelled outcomes; consumers must distinguish these. Domain itinerary versions remain authoritative rather than an opaque AI artifact. Programme changes require revalidation, not copying old model facts.

## Decisions and approval

| Decision | Options / proposed direction | Decision owner | Blocks what? | Resolution |
| --- | --- | --- | --- | --- |
| GFI-01 | Provider, allowed outbound fields, consent/retention | Human product/security owners | Ready and provider integration | Resolved in revision 2: SoCLaaS, fields as listed above, 30-day job metadata, synthetic-only live use; approved by Yik Bing in chat 2026-10-22; privacy approval for real data still pending ([D06](../../docs/project.md#decisions-before-implementation)) |
| GFI-02 | Hard constraint/buffer/accessibility semantics | Human product owner | Ready and feasibility checks | Resolved in revision 2: overlap, budget and explicit accessibility are hard; break rule is soft; unknown accessibility needs confirmation; approved by Yik Bing in chat 2026-10-22 (D08) |
| GFI-03 | Job quota/timeout and draft schema versions | Human product and contract owners | Ready and test baseline | Resolved in revision 2: limits as the organiser slice, result schema as in the concrete contract; approved by Yik Bing in chat 2026-10-22 |

## Verification and evidence

AC01–AC06 are pending test scenarios; no tests, provider evaluation, integration or deployment verification has run for this draft. Separate test ownership, protected baseline, independent behaviour/security review, human teammate review, and environment evidence remain pending under the [agent workflow](../../workflow/agents/README.md). Record future evidence against exact spec/contract revisions and an implementation snapshot.

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft; AC01–AC06 allocated | Approval and verification pending |
| 2 / 2026-10-22 | Added concrete attendee job and result contract, outbound-field list and limits; resolved GFI-01 to GFI-03 with Yik Bing's chat approval; criteria AC01–AC06 unchanged | Test design, implementation and provider evidence pending |
| 3 / 2026-10-22 | Removed the synthetic-data confirmation field and checkbox at the user's request (unclear to attendees and not a control; the server allowlist remains); added the plain notice; criteria AC01–AC06 unchanged | Approved by Yik Bing in chat 2026-10-22; protected F03-US01 tests change only through the test-change request `2026-10-22-itinerary-synthetic-checkbox-test-change.md`; baseline reissue pending |
