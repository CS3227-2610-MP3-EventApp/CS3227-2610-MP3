# Isaac development guide

Updated: 2026-10-15. Design handoff; implementation remains deferred. You steward the business participant experience, but your proposed delivery assignments also include attendee and organiser work. Those end-user stories retain their original voice.

Use [project context](../project.md) as the canonical source for stories and assignments, [schema plan](../schema-and-parallel-plan.md) for module ownership, [security](../security.md) for SEC rules, and [SDD guide](../README.md)/[WORKFLOW.md](../../WORKFLOW.md) for delivery. All personal task splits below are **proposed**, not approved exclusive ownership. Listing a feature's stories does not assign you every story in full.

## Assignment and story index

| Feature | Involvement | Story IDs | Priority / coordinator |
| --- | --- | --- | --- |
| F01 | Independent review only | US01–03 source-linked below | MVP / Dylan |
| F02 | Delivery with Yik Bing | US01–03 | US01–02 MVP; US03 stretch / Yik Bing |
| F03 | Independent review only | US01–04 source-linked below | US01–03 MVP; US04 stretch / Yik Bing |
| F04 | Delivery with Dylan | US01–04 | US01–03 MVP; US04 stretch / Dylan |
| F05 | Contract/integration with all three | US01–03 | MVP / Dylan |
| F06 | Delivery with Dylan | US01–04 | MVP / Isaac |
| F07 | Delivery with Yik Bing | US01–02 | Stretch / Yik Bing |
| F08 | Delivery with Dylan | US01–02 | Stretch / Dylan |
| F09 | Delivery with Yik Bing | US01–03 | Stretch / Isaac |
| F10 | Delivery with all three | US01–03 | US01–02 core; US03 extension-driven / to assign |

24 full canonical delivery-context stories appear below. Seven additional F01/F03 stories are review context, not code assignments. See [team story coverage](story-coverage.md). The collaboration allocation is a recommended starting point; actual contributions belong in approved feature specs.

## Parallel rounds and partner checkpoints

1. Design business/participation and submission fixtures while Dylan defines programme facts and Yik Bing planning. All agree foundation fields, visibility and contracts.
2. Lead F06 manual checklist/budget against fixtures. Contribute a bounded F02 validation/contract checkpoint with Yik Bing. Review F01 independently only if you did not implement its change.
3. Complete F06 submission/preparation drafts and F04 handoff with Dylan; review F03. Stagger partner checkpoints instead of assuming everyone codes simultaneously on every feature.
4. Deliver F05 shared contract and integration checks; no business disruption UI.
5. After core verification and scope approval, lead F09 and contribute bounded F07/F08 tasks.

Use separate development databases, common fixtures and reviewed migrations. Coordinate shared model registration, contracts and migration graph. Add a migration per change, never rewrite applied shared history, and never write another module's tables directly. Fixtures enable progress; real integration remains necessary.

## F02 — Personal planning

Yik Bing coordinates and partners; Dylan reviews.

- F02-US01: As an attendee, I want to bookmark activities and add them to a personal itinerary so that I can plan my day. MVP scope: add/remove, chronological view, ownership and persistence; conflicting drafts save with visible warnings, but acceptance requires all hard constraints to pass (RD03). Excludes reservations.
- F02-US02: As an attendee, I want to record interests, budget, accessibility needs and break preferences so that my plans reflect my constraints. MVP scope: explicit hard/soft constraints and editable private preferences; missing accessibility information is shown as unknown.
- F02-US03: As an attendee, I want a merchandise wishlist with estimated prices so that I can track intended spending. Stretch scope: manual entries, quantities and totals. Excludes stock guarantees and purchases.

**Scope and your proposed contribution:** MVP US01–02; US03 merchandise wishlist is stretch. Proposed personal task: agree spending arithmetic and deterministic constraint examples with Yik Bing, then take a bounded validation or persistence task. Yik Bing remains attendee steward.

**Handoff and data:** PublishedProgramme v1 supplies current published facts and revisions. Attendee planning owns preferences, bookmarks, itineraries/revisions/items; Programme owns activity records. Wishlist storage is not yet designed. Do not add planning fields to shared programme tables.

**Rules and focused verification:** SEC01/02/05, RD03/04: conflicting manual drafts save with warnings; acceptance must validate current facts and all hard constraints. Accepted versions persist, changes are flagged, and cancellations remain visible until removed/replaced. Check wrong-user access, same-event references, invalid acceptance, stale revisions and restart persistence.

**Blockers and independent progress:** Settle D08 currency, buffers, unknown-accessibility confirmation, accepted-revision linkage and stale/concurrent writes before coding. Valid/conflicting/stale programme fixtures enable contract and focused work before F01 finishes; completion needs real F01 integration.

## F04 — Submission review and programme analysis

Dylan coordinates and partners; Yik Bing reviews.

- F04-US01: As an organiser, I want to review submissions and explicitly accept or reject them so that I control event participation. Proposed first scope: business applications; speaker support still needs a separate scope decision and submitter design. Accepted lifecycle: frozen submitted content, revision-checked one-time decisions, reason and audit record; no withdrawal, resubmission or reconsideration in MVP (RD02). Decisions do not automatically publish programme items.
- F04-US02: As an organiser, I want the AI to create a saved review report against a rubric so that I can inspect strengths, gaps and suspicious duplication. MVP scope: exact submission/rubric version references, criterion-level evidence, stale-report handling, unknowns and injection handling (RD02). Duplicate comparisons use only permitted submitted records in the same event; evidence stays organiser-only and applicant reasons cannot reveal competitors (RD06). Suspicion is a review flag, never a fraud determination or automatic rejection.
- F04-US03: As an organiser, I want deterministic checks for room, time and capacity conflicts so that invalid schedules do not reach publication. MVP scope: overlapping room usage and room capacity. AI may explain findings but cannot override them.
- F04-US04: As an organiser, I want programme coverage and accessibility checklists so that I can identify gaps. Stretch scope: agreed categories and stored policies, evidence links and editable drafts; excludes certification of safety or compliance.

**Scope and your proposed contribution:** MVP US01–03; coverage/accessibility checklist US04 is stretch. Proposed task: co-design the frozen-submission and applicant-status handoff with Dylan; take bounded validation/privacy and integration work. Analyst UI and scheduling task division remains to agree.

**Handoff and data:** Submissions owns applications, immutable rubric versions and decisions; Business owns participation; Programme owns room/activity facts. SubmissionReview v1 carries submitted revision, rubric provenance, state and stale indication. Decision-to-participation command must be agreed; acceptance never publishes an activity.

**Rules and focused verification:** SEC01/02/03/04/06/08/11/13; RD02/06. Draft → submitted → accepted/rejected; submitted content/revision freezes. No post-submit edits, withdrawal, resubmission or reconsideration. Test competing/stale decisions produce one outcome, report exact submission/rubric versions and visibly stale rubric reports. Regenerate before using a report as current; manual decisions need no AI report. Duplicate analysis uses permitted submitted records in the same event only, excludes private drafts, and keeps evidence organiser-only; applicant reasons cannot expose competitors. Injection cannot trigger acceptance; suspicion is not fraud determination.

**Blockers and independent progress:** Confirm business-only initial submission scope, rubric fields/reason visibility, atomic state/audit/projection and room-publication conflict policy. D06 blocks model use. Prepare frozen submissions, two rubric versions, hostile descriptions and competing-decision fixtures while F06 producer is unfinished.

## F05 — Disruptions and notifications

Dylan coordinates; partners Dylan and Yik Bing; independent reviewer per bounded change.

- F05-US01: As an organiser, I want to cancel or revise a published activity and publish an announcement so that attendees receive current information. MVP scope: revision checks, explicit confirmation, atomic update and audit record; immutable old/new change facts (RD04); conflicts must be resolved before publication.
- F05-US02: As an attendee, I want in-app notifications for changes affecting my accepted itinerary so that I can respond. MVP scope: recipients fixed consistently at change commit, verified historical facts, source revision, read state and recipient/change deduplication (RD04/RD05). Drafts and bookmarks alone do not qualify. Excludes email/push delivery and business-specific notifications initially.
- F05-US03: As an organiser, I want AI-drafted disruption messages so that I can communicate quickly. MVP scope: save an editable draft from verified changed facts. Publication requires organiser approval of the exact text and revision.

**Scope and your proposed contribution:** All three stories are MVP context. Your accepted contribution is shared contract and integration work (RD05), not a new business disruption UI. Proposed task: define historical-change examples and race/retry integration checks; Dylan/Yik Bing own proposed producer/attendee checkpoints, subject to recorded task agreement.

**Handoff and data:** Programme owns immutable old/new facts; Notifications owns announcements/notifications; Attendee planning owns accepted plans. ProgrammeChanged v1 includes change/item/event IDs, revisions, committed timestamp and old/new facts. Persist recipients consistently at change commit, not later delivery.

**Rules and focused verification:** SEC01/02/04/05/06/07/11; RD04/05. Test two updates before processing preserve distinct history; current plans flag changes and retain cancellation. Accepted-plan users receive one notification/change; bookmark-only/draft-only users receive none. Later plan edits and retries cannot retarget the persisted set. Check acceptance/change races and exact-text/revision publication approval.

**Blockers and independent progress:** Agree transaction locking/isolation, announcement state and delivery/read-state contract. Two-change and recipient fixtures enable early contract checks but do not prove real concurrency or integration. AI message drafts inherit F10 controls below.

## F06 — Business participation and preparation

Isaac coordinates; Dylan partners; Yik Bing reviews.

- F06-US01: As a business participant, I want an event-specific profile and a draft submission so that I can apply to participate. MVP scope: exhibitor/vendor type, description, requested space, contact fields, draft editing and explicit submission. Business membership spans the business's events (RD01); submitted content freezes and post-submit edits, withdrawal and resubmission are excluded (RD02). The workspace remains usable while awaiting an organiser.
- F06-US02: As a business participant, I want to see my application's status and approved participation details so that I can prepare. MVP scope: own-business status, decision reason where shared, assigned booth and setup instructions; excludes other businesses' private submissions.
- F06-US03: As a business participant, I want a preparation checklist and budget so that I can plan materials and spending. MVP scope: manual checklist, quantities, unit prices, currency and totals; distinguish estimates from quotations.
- F06-US04: As a business participant, I want AI to create a saved preparation plan and budget draft so that I can turn my event needs into tasks. MVP scope: verified event/setup facts, editable tasks, labelled estimates and deterministic arithmetic. No orders or payments.

**Scope and your proposed contribution:** All four stories proposed MVP. Proposed task: lead manual preparation and business experience; Dylan contributes a bounded submission handoff/integration task. Record actual UI/backend/check division before implementation. Workspace must work while organisers are offline.

**Handoff and data:** Business owns businesses, participations, tasks, budgets/lines. Identity owns business membership; Submissions owns applications/decisions. Consume BusinessContext v1 and reviewed SubmissionReview v1. Booth/setup assignment contract remains unresolved. Manual preparation must not require AI tables/providers; AI artifacts cannot be the sole accepted budget record.

**Rules and focused verification:** SEC01/02/03/04/06/08/10/11/13; RD01/02/07. Active business-wide membership grants access across that business's events within its role; organiser membership alone grants no private budget/draft access. Test list/detail/write/job retrieval, two-event access, unrelated/inactive members, frozen submission and own status. Validate quantities/totals and estimates versus quotes. Accepted data survives AI failure; AI cannot silently replace it or place orders.

**Blockers and independent progress:** Settle member invitation/roles, application scope, booth/setup assignment, decision projection, budget acceptance/versioning, quantity bounds/currency and model fields. Manual examples use event/business fixtures immediately after reviewed foundation; application status completion awaits actual F04/F06 integration.

## F07 — Group dining and travel

Yik Bing coordinates and partners; Dylan reviews.

- F07-US01: As an attendee planning for friends, I want meal options suited to our group size, budget and dietary preferences so that we can eat together. Scope: user-entered group requirements, sourced options and draft meal slots. Excludes group invitations, shared accounts and reservation guarantees.
- F07-US02: As an attendee, I want travel estimates between activities and meal locations so that my itinerary allows enough time. Scope: provider-derived route estimates, mode, retrieval time and fallback when unavailable. Excludes claims about the best route or wheelchair access without supporting data, and excludes bookings.

**Scope and your proposed contribution:** Both stories stretch. Proposed task: a bounded sourced-estimate adapter or evidence-validation slice agreed with Yik Bing. No invitations, shared accounts, reservations or bookings.

**Handoff and data:** Attendee planning owns plans; AI/actions owns research/jobs/artifacts/evidence. Typed meal/route entries require F02/F07 contract review; do not add speculative nullable columns. Group inputs do not grant access to friends' accounts.

**Rules and focused verification:** SEC03/04/05/08/09/10; RD03/04/07. Check source/time/mode/uncertainty, missing routes, stale prices, unsupported wheelchair claims and recomputed constraints. Group size is not seating availability. No unsupported best-route claim.

**Blockers and independent progress:** D07 provider costs/terms, D08 dietary/travel/buffers and typed-entry semantics, final stretch approval. Curated/unavailable-provider fixtures enable adapter design before real F03/provider integration.

## F08 — Venue research and quotations

Dylan coordinates and partners; Yik Bing reviews.

- F08-US01: As an organiser, I want AI to research venues against location, capacity and budget requirements so that I can compare a sourced shortlist. Scope: bounded research job, saved comparisons, evidence and missing values; published prices are not confirmed quotes.
- F08-US02: As an organiser, I want the AI to prepare a quotation email and send it after I approve the recipient and content so that I can request prices efficiently. Scope: verified contact source, exact email preview, approval expiry, one-time execution and send outcome. Excludes automatic negotiation, booking and unattended inbox processing.

**Scope and your proposed contribution:** Both stories stretch. Proposed task: bounded contact/source evidence or sandbox action-validation work with Dylan. Excludes negotiation, booking and unattended inbox processing.

**Handoff and data:** AI/actions owns research, sources, proposals/approvals/executions. Programme owns operational venues; shortlist does not create a booked/published venue. DraftArtifact v1 and F10 action contracts need review; names are design labels, not implemented endpoints.

**Rules and focused verification:** SEC01/03/04/06/07/08/09/10/11; RD07. Published prices are not confirmed quotes. Test fabricated contacts, malicious redirects/private destinations, changed recipient/content/revisions, revoked membership, expiry and concurrent send. Unknown provider outcomes require reconciliation, not blind retries.

**Blockers and independent progress:** D07 sources/email provider/budget; D06 outbound data/retention; approval expiry and reconciliation. Research and email-preview fixtures/sandbox design precede live adapters. Do not promise exactly-once external delivery from a local retry key.

## F09 — Business promotion and procurement

Isaac coordinates; Yik Bing partners; Dylan reviews.

- F09-US01: As a business participant, I want AI to draft poster and freebie concepts so that I can prepare promotional materials. Scope: editable copy and layout brief; image generation and print-ready exports are separately scoped extensions requiring provider and export-quality decisions.
- F09-US02: As a business participant, I want AI to compare printers, snacks and freebie suppliers so that I can prepare a purchase shortlist. Scope: source links, quantities, estimates, delivery constraints and uncertainty; link screening is not a guarantee of seller trustworthiness.
- F09-US03: As a business participant, I want a reviewed quotation request or purchase proposal so that I can approve exact costs and recipients. Scope: saved request/cart draft and sandbox approval demonstration. Real orders and payments are deferred until provider, cancellation, fulfilment and spending policies are agreed.

**Scope and your proposed contribution:** All three stories stretch. Proposed task: lead business/budget requirements and integration while Yik Bing takes a bounded source/approval or promotional draft slice. Image generation/print exports need separate scope; real orders/payments remain deferred.

**Handoff and data:** Business owns accepted tasks/budgets; AI/actions owns briefs/comparisons/sources/proposals. Consume BusinessContext v1/DraftArtifact v1 and reviewed F10 approval contracts. Generating a brief never authorises a purchase.

**Rules and focused verification:** SEC01/02/03/04/06/07/08/09/10/11; RD01/07. Check quantities/totals, estimated versus quoted costs, delivery uncertainty, spoofed sellers and malicious links. Changed seller/payload/amount/currency invalidates approval. Sandbox retry/concurrent execution cannot duplicate the approved action; unknown outcome remains explicit. Screening is not a trust guarantee.

**Blockers and independent progress:** Final stretch slice, suppliers/providers, destination rules, currency/budget and sandbox scope. F06 fixtures enable drafts before real budget integration. Commerce cancellation/fulfilment and print-quality pipeline are separate unresolved extensions.

## F10 — Shared identity and action foundation

All three deliver; coordinator to assign; independent reviewer per bounded change.

- F10-US01: As a user, I want secure login and only the event/business permissions assigned to me so that my workspace and private data are protected. MVP scope: verified identity, server-enforced membership, own-data access and organiser-controlled invitations. Excludes self-service privileged roles.
- F10-US02: As a user, I want AI jobs to show progress, results and failures so that I can understand what happened and continue manually. MVP scope: server-authorised job access, persisted state, bounded tools, timeouts, cancellation between steps, quotas, minimal outbound data and validation before display; failure preserves accepted data and manual operation (RD07).
- F10-US03: As an authorised user, I want to approve an exact external action so that the assistant can execute it once within my authority. Implement when F08/F09 needs it: payload-bound approval, expiry, revalidation and audit. Pending or uncertain provider outcomes require reconciliation rather than blind retries.

**Scope and your proposed contribution:** US01–02 minimum MVP; US03 only when F08/F09 needs external actions. Proposed personal task: define business permission/job-context examples and take an agreed identity/AI validation slice. Coordinate shared files rather than editing foundation concurrently without agreement.

**Handoff and data:** Identity owns users/memberships; AI/actions owns jobs/artifacts/sources/proposals/approvals/executions; Audit owns audit events. Domain records remain authoritative. Define shared minimum IDs/revisions and stable synthetic data, not reverse dependencies from User/Event into feature tables.

**Rules and focused verification:** SEC01–SEC12 as applicable; SEC13 for applications; RD01–RD07 remain binding. See shared controls below. Direct server checks, not UI restrictions, establish permissions.

**Blockers and independent progress:** D01 rubric/deadline; D02 identity/deployment/checkout; D04 coordinator/approvers; D05 invitation/member roles; D06 retention/provider/minimal fields; D08 actual quotas/timeouts. Proposed numerical defaults are not approved or measured guarantees. Permission matrices and fixtures can be prepared before provider choice.

## Shared AI and approval controls — apply once across features

RD07 and SEC01–SEC12 require authorised job access, persisted progress/failure, cancellation between steps, bounded tools, server timeouts/quotas, minimal outbound fields and redacted logs. Validate schemas and authoritative IDs/revisions/facts **before display**, then revalidate current permissions and domain constraints before acceptance. Preserve accepted records and manual workflows when AI fails. A valid private draft may be saved; replacing accepted data is explicit.

Test wrong-user/business jobs, injection/tool overreach, fabricated facts, sensitive outbound fields/logs, quota/timeout/cancellation and failure preservation. Cancellation prevents subsequent steps but cannot promise to undo an executed external action. Models cannot create approval tokens, grant privileges, or obtain arbitrary SQL/shell/browser access.

SEC06/07 approval binds actor, destination, exact payload, amount/currency where relevant, resource revisions and expiry. Changes invalidate approval. Recheck authority before execution; deduplicate attempts and reconcile uncertain provider outcomes. Test changed payload, revoked membership, expiry, concurrent retries and denied audit reads. SEC11 audit records action/resource/revision/time/outcome without excess private content; SEC12 separates development/production data and credentials.

## Independent review only

**F01-US01–03:** read [canonical programme stories](../project.md#f01-publish-and-browse-programmes) and [draft F01-AC01–AC09](../features/F01-published-programme.md). Review server/event permissions, draft privacy, same-event capacity validation, publication/revision/audit atomicity, new-data restart and deployed journey. Event/room management and additional filters exceed current draft criteria and need specification. No F01 implementation tasks are assigned here.

**F03-US01–04:** read [canonical concierge stories](../project.md#f03-ai-event-concierge). US01–03 MVP, recap US04 stretch. Review permitted published retrieval, validated feasible drafts/unknown answers, explicit revision-aware acceptance/replanning, preserved accepted records and F10 privacy/failure controls. Recaps distinguish planned from explicitly attended activities. No F03 implementation tasks are assigned here.

Form an assessment from the current specification/change before relying on implementer conclusions. For any all-team change, a reviewer must not implement that bounded change. Co-author review is not independent.

## Readiness and evidence limits

Use [the feature template](../templates/feature.md) to record numbered acceptance criteria, exact contract revision, personal task division, approval and local blockers before implementation. RD01–RD07 are accepted behavior; detailed feature scope, allocations, schema and numerical/provider choices retain the statuses in their sources. Only F01 currently has draft numbered criteria; stories and proposed verification here are not implementation-ready approvals.

This guide reproduces delivery stories and relevant boundaries; source documents remain authoritative. Checks of documentation do not establish application correctness, migration safety, persistence, provider behavior, deployment or compliance with an unsupplied MP3 rubric. No application code, migrations, commits or pushes are authorised by this guide.
