# Draft and publish disruption announcements

| Field | Value |
| --- | --- |
| Stable capability ID | draft-and-publish-disruption-announcements |
| Covered stories | [F05-US01 and F05-US03](../../docs/UserStoriesAndFeatures.md): publication of a change announcement and optional AI drafting |
| Specification revision / status | 2 / Draft |
| Product roles / roadmap | Organiser author, attendee reader; [phase 4](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of exact revision 2 and publication contract |
| Review / run record | Partial implementation, test and independent review evidence in the [F05 run record](../../workflow/agents/runs/2026-10-21-organiser-disruptions.md); full live workflow and human approval pending |

Sources: [standard](../README.md), catalogue, [RD04/RD07](../../docs/project.md#accepted-review-decisions), [security](../../docs/security.md), [architecture](../../docs/architecture.md) updated 2026-10-21, and the current [AI job contract](../shared/monitor-and-recover-ai-tasks.md). Per the orchestrator's task brief, the user approved the implementation plan; that plan approval is separate from approval of this exact specification revision and its contracts, which remains pending.

## Product outcome, users and scope

An organiser can manually write or ask AI to draft a disruption announcement from verified programme changes, edit it, review its exact text and source revision, then explicitly approve publication. Drafts are owner-private and versioned. A successful publication is immutable and unique per programme change. It is readable by signed-in attendees of the event only after publication; the audience is event-wide and is not the accepted-itinerary recipient set used for F05-US02 notifications. A manual drafting path remains available during AI failure. This capability does not send email/push, alter the programme change, or notify accepted-plan recipients; those belong to separate contracts.

## Use cases and user interface

The organiser selects the latest committed change for an item, sees verified old/new facts, requests a draft or writes one manually, edits and previews the exact event-wide audience and text, then approves a specific draft revision. A draft is stale if its source change is not the latest item revision or the current published item revision no longer equals that change's `to_revision`. Stale drafts cannot be previewed for approval or published until refreshed and reviewed. The attendee sees published text with source/change context; drafts and rejected text remain private, including from other organisers on the event. Loading, AI failure and publication uncertainty are explicit and accessible.

## Inputs, outputs and functional contract

All routes below are under `/api/v1`. `POST /organiser/events/{event_id}/announcements` creates a manual private draft; `PATCH /organiser/events/{event_id}/announcements/{id}` edits its complete body and requires the expected draft revision. Body is plain text of 1–3000 characters. Manual and AI authoring both create private, versioned drafts with owner, event, change ID, source item revision, exact body, monotonically increasing draft revision, creation/update times, and validation status. Editing increments the revision even if text is later restored. `POST /organiser/events/{event_id}/announcements/generate` accepts `{changeId,requestId,syntheticDataConfirmed:true}` and creates or returns an `announcement_draft` job under the existing explicit synthetic-data opt-in. The AI receives only verified source facts and must return the strict shape `{changeId,sourceRevision,opening,closing}`, where `opening` is `update|attention|apology` and `closing` is `thanks|review_plan`. The server renders these bounded wording choices with authoritative programme facts; arbitrary AI prose claims are not accepted. Source facts are displayed in a separate, clearly identified block. Retrieved descriptions and generated content remain untrusted and cannot alter programme data or directly publish. The current source item revision must equal the immutable change's `to_revision` when an AI result is saved, when a preview is created, and when publication commits.

The organiser obtains a preview at `POST /organiser/events/{event_id}/announcements/{id}/preview`. It binds the authenticated owner, event, change ID and source revision, draft ID and revision, exact body, fixed event-wide signed-in-attendee audience, and a 15-minute expiry. Any changed binding or expiry invalidates it. `POST /organiser/events/{event_id}/announcements/{id}/publish` requires the unexpired preview and explicit confirmation for that exact binding. One immutable published announcement is allowed per change. Replaying the same successful publish request returns the existing publication after rechecking the caller's current organiser authority; changed payloads or a different actor cannot reuse it. A published record stores its source change/item revision, immutable body, event-wide audience, publisher and publication time. Attendee list/detail returns published announcements only and excludes organiser/audit/private draft fields. Draft CRUD, AI job, preview and publish responses have explicit versioned IDs and revisions; pagination defaults to limit 50 and offset 0, limit 1–100.

## Constraints, security and non-functional requirements

[SEC01–SEC04, SEC06–SEC08, SEC10–SEC12](../../docs/security.md) apply. Factual claims about times, rooms and cancellation are rendered from authoritative change facts; AI selects bounded wording only. Publishing is allowed only while the change remains the latest item revision and current item facts still match it. An AI job follows [task monitoring](../shared/monitor-and-recover-ai-tasks.md), uses the exact `announcement_draft` job kind with nullable typed target fields, and shares the existing SoCLaaS provider opt-in, global provider gate, per-owner/global quotas, limits, cancellation, retention and audit controls. It must not fabricate an application ID or create fake application records to satisfy current non-null `applicationId` requirements. Manual draft authoring and publication remain available if AI is disabled or unavailable. Publication is a shared-state action requiring concrete human approval and server revalidation; retries cannot duplicate a successful publication. Replaying an existing publication rechecks current organiser authority before returning the stored result. Failed AI or publish attempt leaves prior published announcements and accepted data intact.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| draft-and-publish-disruption-announcements-AC01 | An authorised organiser requests an `announcement_draft` for the latest committed change and receives editable bounded wording rendered from verified old/new facts, with source facts shown separately and source revision identified. | F05-US03; RD04/07; SEC04 | Real opted-in provider with synthetic change; source/fact comparison |
| draft-and-publish-disruption-announcements-AC02 | Invalid AI schema, fabricated facts, injected instructions, stale source revision, or AI output outside the bounded opening/closing choices cannot create a publishable draft or prohibited side effect. | F05-US03; SEC03/04/06 | Adversarial source/model results and stale-source checks |
| draft-and-publish-disruption-announcements-AC03 | An organiser can create or edit a private manual draft, preview exact text and event-wide audience, explicitly approve that revision and publish once; attendees read the same immutable text. | F05-US01/03; SEC06/07 | Manual create/edit/preview/publish comparison |
| draft-and-publish-disruption-announcements-AC04 | Changed body/draft revision, source item advance, expired 15-minute preview, revoked membership, wrong-event actor or repeated/concurrent publish is rejected or reconciled without publishing unapproved text twice. | F05-US03; SEC01/07 | Binding mutations, expiry, stale state and duplicates |
| draft-and-publish-disruption-announcements-AC05 | Provider timeout, disabled opt-in, per-owner/global quota rejection or publication storage failure leaves prior published state intact, records an accurate outcome, and keeps manual authoring available. | F05-US03; RD07; SEC10/11 | Controlled provider/quota/storage failure and state comparison |
| draft-and-publish-disruption-announcements-AC06 | Attendee list/detail exposes event-wide published announcements only; private drafts remain inaccessible to attendees and unrelated organisers. | F05-US03; SEC01/02 | Direct list/detail/write access matrix |
| draft-and-publish-disruption-announcements-AC07 | One immutable publication exists per change; an identical replay returns it only after current organiser authority is rechecked, while changed payload or another actor cannot reuse it. | F05-US01/03; SEC06/07 | Concurrent publish and authorized/unauthorized replay |

## External interfaces and dependencies

Consumes immutable `ProgrammeChanged v1`, current `PublishedProgramme v1`, [AI tasks](../shared/monitor-and-recover-ai-tasks.md), [workspace access](../shared/access-authorised-workspaces.md), and the exact-action safeguards in [approval](../shared/approve-external-actions.md). No accepted-itinerary query is used for announcement readership: the event-wide attendee audience is distinct from F05-US02 notification recipients. F02's missing accepted-plan contract blocks notification delivery only, not this event-wide published read. AI use depends on extending the current application-specific job contract to an explicit typed job kind without fake application IDs; exact shared quota numbers remain those of the current task contract unless changed by its human owners.

## Decisions and approval

| Decision | Options / proposed direction | Owner | Blocks | Resolution |
| --- | --- | --- | --- | --- |
| D-01 | Event-wide signed-in attendee audience; body length and bounded factual wording | Product human owner | Ready | Event-wide audience, 1–3000 character body and server-rendered factual wording proposed for exact revision approval |
| D-02 | 15-minute preview approval binding, one publication per change, immutable result and replay semantics | Product/security human owner | Ready | Proposed in revision 2; exact revision approval pending |
| D-03 | AI provider, outbound facts, shared quotas/limits and retention | Product/privacy human owner | AI path Ready | Reuse opted-in SoCLaaS and existing task quotas; typed job-kind contract and exact approval pending |

## Verification and evidence

Local manual/AI implementation, independent test design and protected baselines, approval/privacy/failure tests and behaviour/security reviews are recorded in [the F05 run](../../workflow/agents/runs/2026-10-21-organiser-disruptions.md). A direct real SoCLaaS call with fixed invented workshop-change facts passed source-bound structured-output validation; it did not save or publish and is distinct from fake-provider worker tests. Full live worker/browser and deployed attendee journeys, exact-written-revision human approval and teammate review remain pending; no full criterion or LLM project-gate completion is claimed.

## Project gates

This capability is the organiser's F05 LLM draft path; it does not satisfy attendee or business LLM requirements. The current shared SoCLaaS contract permits only explicit opted-in synthetic development/test calls and keeps production disabled pending privacy/retention approval. Typed disruption jobs, bounded provider evidence, actual specialist handoffs, protected baseline and local reviews are linked above. Full live end-to-end evidence, online delivery with separate development/production data and credentials, and human teammate review remain pending.

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft | Approval and verification pending |
| 2 / 2026-10-21 | Added manual and AI versioned private drafts, event-wide published readership, latest-source rule, exact 15-minute preview binding, unique immutable publication/replay semantics, shared SoCLaaS quota/job requirements; separated plan approval from exact spec approval | Plan approval is reported in the orchestrator's task brief; exact revision 2 approval pending. The explicit typed job kind is required; no fake application IDs permitted |
