# Dylan development guide

Updated 2026-10-15. You steward the organiser experience, but you also help deliver attendee and business features. This is a person-specific handoff: user stories keep their original end-user voice regardless of who helps build them.

The feature allocations and bounded task divisions below are proposed. Complete stories provide context for your feature participation; they do **not** assign every story to you. Confirm individual tasks in the feature spec. Implementation remains deferred: F01 has draft acceptance criteria; other features mostly still need numbered criteria and approval.

## Your assignment and story index

| Feature | Proposed delivery/review responsibility | Story context | Priority |
| --- | --- | --- | --- |
| F01 Programme | Delivery with Yik Bing; coordinator Dylan; reviewer Isaac | F01-US01–03 | MVP |
| F03 Concierge | Delivery with Yik Bing; coordinator Yik Bing; reviewer Isaac | F03-US01–04 | US01–03 MVP; US04 stretch |
| F04 Review/analysis | Delivery with Isaac; coordinator Dylan; reviewer Yik Bing | F04-US01–04 | US01–03 first/MVP scope; US04 stretch |
| F05 Disruptions | All three; coordinator Dylan; reviewer per change | F05-US01–03 | MVP |
| F06 Business | Delivery with Isaac; coordinator Isaac; reviewer Yik Bing | F06-US01–04 | MVP |
| F08 Venue research | Delivery with Isaac; coordinator Dylan; reviewer Yik Bing | F08-US01–02 | Stretch |
| F10 Foundation | All three; coordinator to assign; reviewer per change | F10-US01–03 | US01–02 minimum MVP; US03 when F08/F09 needs it |
| F02 Planning | Review only | F02-US01–03 | US01–02 MVP; US03 stretch |
| F07 Dining/travel | Review only | F07-US01–02 | Stretch |
| F09 Promotion/procurement | Review only | F09-US01–03 | Stretch |

All 23 delivery-context stories below are copied verbatim from [project.md](../project.md#user-stories-and-implementation-scope). See [team story coverage](story-coverage.md). The project owns scope and stories; [schema plan](../schema-and-parallel-plan.md) owns proposed data/contracts; [security rules](../security.md) own SEC policies. These extracts must be refreshed when sources change. Domain stewardship means maintaining the organiser experience, not exclusive ownership of its code.

## F01 — Publish and browse programmes

- F01-US01: As an organiser, I want to create venues, rooms and draft programme items so that I can prepare an event schedule. MVP scope: room capacity and accessibility fields, programme times, prices and publication state. Excludes complex venue booking.
- F01-US02: As an organiser, I want to publish valid programme items so that attendees see authoritative details. MVP scope: permission checks, validation, revision and audit record. Publication is an explicit organiser action.
- F01-US03: As an attendee, I want to browse and search published events and programme items so that I can choose activities. MVP scope: event list, item list, title search, type/date filters and detail pages. Excludes recommendations and ticket sales.

**Proposed personal contribution:** lead organiser draft/publication behavior and authoritative field validation. Yik Bing contributes the published reader and contract/integration checkpoint; confirm task division before coding. Coordinator Dylan; reviewer Isaac.

**Data and handoff:** Programme owns events, venues, rooms and programme_items. Consume CurrentActor v1 from Identity; agree PublishedProgramme v1 with Yik Bing, including IDs/revisions, timestamps, timezone, price/currency, capacity, accessibility and draft privacy. Do not write planning tables. Capacity is a limit, not inventory or reservations.

**Rules and verification:** SEC01/02/11/12; RD04 informs revisions without adding F05 implementation. Use [F01-AC01–09](../features/F01-published-programme.md#required-behavior) for wrong-role/event requests, invalid fields, list/search/detail draft protection, atomic publication/audit, restart persistence and deployed cross-session journey.

**Before implementing:** resolve F01's D01/D02/D04/D05 blockers, guest browsing, field/accessibility/currency bounds, publication edits/concurrency and conflict policy. The draft spec covers item publication/title search; venue/room management and additional filters need criteria rather than silently extending that slice. Programme/identity fixtures and contract design can proceed pending these decisions.

## F03 — AI event concierge

- F03-US01: As an attendee, I want the AI to create and save a draft itinerary from my preferences so that I can review a usable plan. MVP scope: permitted published items, deterministic checks and validation before display, explanations and draft persistence. Produce a feasible draft or explain infeasibility. Acceptance creates a new accepted version after current facts/constraints are revalidated; it does not silently replace my current plan (RD03/RD04).
- F03-US02: As an attendee, I want grounded answers about published event information so that I can find reliable details. MVP scope: referenced item IDs/revisions, factual validation and an explicit unknown response when evidence is insufficient.
- F03-US03: As an attendee, I want a replacement plan after cancellations so that I can adjust my day. MVP scope: compare old/new drafts and retain hard constraints; accepting changes is explicit. Depends on F05.
- F03-US04: As an attendee, I want a personalised recap so that I can remember my event experience. Stretch scope: distinguish planned activities from activities I explicitly mark as attended; no inferred attendance tracking.

**Proposed personal contribution:** supply authoritative programme retrieval and fixtures; take a bounded grounding/factual-validation implementation or verification task. Yik Bing coordinates planning/draft acceptance; Isaac reviews. This does not assign you the entire AI service or all four stories.

**Data and handoff:** consume PublishedProgramme v1 and agree DraftArtifact v1 with Yik Bing. Planning owns preferences and itinerary revisions/items; AI owns jobs/artifacts/source references. Accepted plans stay in domain records, not just generic AI payloads. Replacement plans require F05 ProgrammeChanged v1; recap is a separately approved stretch slice.

**Rules and verification:** SEC03/04/05/06 plus shared F10 controls; RD03/04/07. Invalid references/facts and infeasible plans must fail before display as valid. Conflicting manual drafts may save with visible warnings; acceptance validates current activities and all hard constraints server-side. AI returns a feasible draft or explains infeasibility and preserves accepted plans. Changed/cancelled activities show current facts and changes; cancelled entries stay until removed/replaced. Check stale revisions, malformed output and insufficient evidence.

**Before implementing:** resolve D06/D08 provider/data/retention policy, travel/break buffers and unknown-accessibility confirmation plus detailed criteria. Use programme/preferences and invalid-output fixtures before real F02/F05 integration. Fixtures cannot establish completed integration.

## F04 — Submission review and programme analysis

- F04-US01: As an organiser, I want to review submissions and explicitly accept or reject them so that I control event participation. Proposed first scope: business applications; speaker support still needs a separate scope decision and submitter design. Accepted lifecycle: frozen submitted content, revision-checked one-time decisions, reason and audit record; no withdrawal, resubmission or reconsideration in MVP (RD02). Decisions do not automatically publish programme items.
- F04-US02: As an organiser, I want the AI to create a saved review report against a rubric so that I can inspect strengths, gaps and suspicious duplication. MVP scope: exact submission/rubric version references, criterion-level evidence, stale-report handling, unknowns and injection handling (RD02). Duplicate comparisons use only permitted submitted records in the same event; evidence stays organiser-only and applicant reasons cannot reveal competitors (RD06). Suspicion is a review flag, never a fraud determination or automatic rejection.
- F04-US03: As an organiser, I want deterministic checks for room, time and capacity conflicts so that invalid schedules do not reach publication. MVP scope: overlapping room usage and room capacity. AI may explain findings but cannot override them.
- F04-US04: As an organiser, I want programme coverage and accessibility checklists so that I can identify gaps. Stretch scope: agreed categories and stored policies, evidence links and editable drafts; excludes certification of safety or compliance.

**Proposed personal contribution:** lead organiser decision/report experience and deterministic programme conflict rules. Isaac contributes submitted-content/status producer and applicant visibility/participation projection checkpoint. Agree bounded API/UI/validation tasks. Coordinator Dylan; reviewer Yik Bing.

**Data and handoff:** jointly steward Submissions (submissions, rubric_versions, submission_decisions); consume BusinessContext v1 and reviewed business commands rather than direct Business table writes. Agree SubmissionReview v1: frozen submitted content/revision, immutable rubric version, state, stale-report indicator and revision-checked decision command. Define decision-to-participation projection before integration. Acceptance never publishes a programme item.

**Rules and verification:** SEC01/02/03/04/06/11/13; RD02/06/07 and F10 controls. Draft → submitted → accepted/rejected only. Content freezes at submission; no post-submit edits, withdrawal, resubmission or reconsideration. Stale/repeated/concurrent decisions return conflict/current state without a second outcome; decision/state/audit and agreed participation update remain consistent. Reports bind exact submission/rubric versions; changed applicable rubric visibly stales a report, requiring regeneration before using it as current assessment. Manual decisions do not require AI.

Only permitted submitted records in the same event enter duplicate analysis. Exclude private drafts/cross-event records, protect organiser-only evidence and redact competitor details from applicant reasons. Injected text cannot change rubric, leak data or decide acceptance. Check deterministic room/time/capacity boundaries separately from model explanation.

**Before implementing:** settle business-first versus speaker scope, rubric fields, projection transaction/race handling, publication conflict policy and AI data boundaries. Decision/report design can use frozen-submission, competing-decision, changed-rubric and cross-event fixtures while the real producer is pending. Coverage/checklists remain stretch; they do not certify safety or compliance.

## F05 — Disruptions and notifications

- F05-US01: As an organiser, I want to cancel or revise a published activity and publish an announcement so that attendees receive current information. MVP scope: revision checks, explicit confirmation, atomic update and audit record; immutable old/new change facts (RD04); conflicts must be resolved before publication.
- F05-US02: As an attendee, I want in-app notifications for changes affecting my accepted itinerary so that I can respond. MVP scope: recipients fixed consistently at change commit, verified historical facts, source revision, read state and recipient/change deduplication (RD04/RD05). Drafts and bookmarks alone do not qualify. Excludes email/push delivery and business-specific notifications initially.
- F05-US03: As an organiser, I want AI-drafted disruption messages so that I can communicate quickly. MVP scope: save an editable draft from verified changed facts. Publication requires organiser approval of the exact text and revision.

**Proposed personal contribution:** coordinate organiser changes, announcement approval and change producer. Yik Bing contributes accepted-plan notifications/change views/replanning handoff. Isaac contributes shared contract and integration tests only; business-specific disruption views remain deferred (RD05). Assign independent reviewer per bounded change, not someone who implemented that change.

**Data and handoff:** Programme owns programme_changes/items; Notifications owns announcements/notifications, stewarded with Yik Bing. Planning provides accepted-plan membership through an agreed interface. ProgrammeChanged v1 includes stable ID, old/new revisions, immutable old/new facts and committed timestamp. Persist accepted-plan recipients consistently with the committed change; retries use that fixed set. Agree transaction/locking/isolation ownership for change-versus-plan-acceptance races.

**Rules and verification:** SEC01/02/04/05/06/07/11; RD04/05/07 and F10 controls. Cancel/retire referenced activities rather than deleting plans; retain cancellations until removed/replaced and revalidate before accepting a new plan. Two changes before delayed processing must preserve each historical message with links to current facts. Accepted-plan users qualify at commit; draft/bookmark-only users do not. Deduplicate recipient/change; later plan edits cannot retarget delivery. Check exact announcement text/revision approval, stale writes and unauthorised publication; AI cannot publish automatically.

**Before implementing:** define announcement states, recipient/read contracts, race behavior and numbered criteria. Shared historical-change/recipient fixtures allow parallel UI/processor work, but final completion requires real atomicity/concurrency and cross-role delivery evidence. Email/push and business notifications are excluded initially.

## F06 — Business participation and preparation

- F06-US01: As a business participant, I want an event-specific profile and a draft submission so that I can apply to participate. MVP scope: exhibitor/vendor type, description, requested space, contact fields, draft editing and explicit submission. Business membership spans the business's events (RD01); submitted content freezes and post-submit edits, withdrawal and resubmission are excluded (RD02). The workspace remains usable while awaiting an organiser.
- F06-US02: As a business participant, I want to see my application's status and approved participation details so that I can prepare. MVP scope: own-business status, decision reason where shared, assigned booth and setup instructions; excludes other businesses' private submissions.
- F06-US03: As a business participant, I want a preparation checklist and budget so that I can plan materials and spending. MVP scope: manual checklist, quantities, unit prices, currency and totals; distinguish estimates from quotations.
- F06-US04: As a business participant, I want AI to create a saved preparation plan and budget draft so that I can turn my event needs into tasks. MVP scope: verified event/setup facts, editable tasks, labelled estimates and deterministic arithmetic. No orders or payments.

**Proposed personal contribution:** agree submitted-application/review and organiser-provided participation/setup handoffs with Isaac; take a bounded transition/integration or verification task. Isaac coordinates the business workspace; Yik Bing reviews. Manual preparation should progress without waiting for organiser review.

**Data and handoff:** Isaac stewards Business preparation (businesses, event_participations, preparation_tasks, budgets, budget_lines). Identity owns business_memberships; Submissions is jointly stewarded. Consume BusinessContext v1 and SubmissionReview v1, and define missing booth/setup assignment and decision projection contracts before implementing those paths. Manual preparation works without AI tables/providers; optional source references come later.

**Rules and verification:** SEC01/02/04/06/08/11/13; RD01/02/07 and F10 controls. Business-wide membership permits its event workspaces within role; it does not make private data public to event organisers. Test active/inactive membership, one business in two events, unrelated business access and private AI context. Submitted content freezes; status/shared reasons cannot reveal other applications. Verify quantities/totals deterministically, distinguish estimates/quotes and preserve accepted budget/tasks on AI failure. No orders/payments; workspace remains usable without an organiser online.

**Before implementing:** define invitations/member roles, currency/quantity/price bounds, booth/setup assignment, initial submission scope and projection rules. Manual checklist/budget can proceed against agreed event/business fixtures while review/AI contracts are refined. F06 criteria and approval remain pending.

## F08 — Venue research and quotations

- F08-US01: As an organiser, I want AI to research venues against location, capacity and budget requirements so that I can compare a sourced shortlist. Scope: bounded research job, saved comparisons, evidence and missing values; published prices are not confirmed quotes.
- F08-US02: As an organiser, I want the AI to prepare a quotation email and send it after I approve the recipient and content so that I can request prices efficiently. Scope: verified contact source, exact email preview, approval expiry, one-time execution and send outcome. Excludes automatic negotiation, booking and unattended inbox processing.

**Proposed personal contribution:** coordinate organiser research requirements, sourced comparison and exact-email approval UX. Isaac contributes source/evidence or sandbox action integration checkpoints; agree division before coding. Reviewer Yik Bing. Entire feature is stretch after MVP verification and explicit scope approval.

**Data and handoff:** shared AI/actions module owns jobs/artifacts/source references/proposals/approvals/executions. Research results are not booked authoritative venues. Consume CurrentActor v1; agree DraftArtifact v1 and F10 exact action payload/revisions, not new endpoints invented by this guide.

**Rules and verification:** SEC03/04/06/07/08/09/10/11; RD07/F10 controls. Save provider/source URL/retrieval time and missing values; estimates are not confirmed availability or quotes. Check injected pages, redirects/private network destinations and unsupported trust claims. Exact recipient/content changes, expired approval or revoked membership block execution. Repeated/concurrent execution cannot duplicate the approved action; unknown provider outcomes need reconciliation, not blind send retries. No negotiation, booking or unattended inbox processing.

**Before implementing:** resolve D07 source/email providers and terms/costs, contact/destination policy, budgets/quotas/timeouts, retention, approval expiry and provider reconciliation contract. Sourced fixtures and sandbox adapter enable design/checks without a live send; they cannot prove live delivery.

## F10 — Shared identity and action foundation

- F10-US01: As a user, I want secure login and only the event/business permissions assigned to me so that my workspace and private data are protected. MVP scope: verified identity, server-enforced membership, own-data access and organiser-controlled invitations. Excludes self-service privileged roles.
- F10-US02: As a user, I want AI jobs to show progress, results and failures so that I can understand what happened and continue manually. MVP scope: server-authorised job access, persisted state, bounded tools, timeouts, cancellation between steps, quotas, minimal outbound data and validation before display; failure preserves accepted data and manual operation (RD07).
- F10-US03: As an authorised user, I want to approve an exact external action so that the assistant can execute it once within my authority. Implement when F08/F09 needs it: payload-bound approval, expiry, revalidation and audit. Pending or uncertain provider outcomes require reconciliation rather than blind retries.

**Proposed personal contribution:** supply organiser event-scoped permission/provisioning requirements and cross-role denial cases; take a specifically assigned foundation task. Yik Bing contributes attendee ownership, Isaac business membership cases. All three participate; coordinator and independent reviewers remain to assign. Shared infrastructure stewardship is not automatically yours.

**Data and handoff:** Identity owns users/event_memberships/business_memberships. Shared AI/actions owns jobs/artifacts/sources/proposals/approvals/executions; Audit owns audit_events. Agree CurrentActor v1 and DraftArtifact v1; domain acceptance remains in its owning module. Narrow tools cannot grant roles, create approval tokens or run arbitrary SQL/shell/browser tasks. Python/FastAPI and TypeScript/React are confirmed; physical fields/supporting libraries and vendors remain recommendations where labelled.

**Shared controls for every AI feature:** server-resolve current actor/resource permissions for retrieval, job read/cancellation and writes; minimise outbound fields and redact logs; treat retrieved text as data; validate schemas and authoritative facts before display. Persist progress/results/failure; enforce quota/timeout and cancellation between steps. Cancellation cannot undo an executed external action. AI failure preserves manual workflows and accepted data. Draft creation needs ownership/validation; accepted/shared/external writes need authorised human confirmation. Approval binds exact actor/destination/payload/amount/currency when applicable, revisions and expiry; execution rechecks permission/freshness. Unknown delivery requires reconciliation. These reference SEC01–12 and RD01/RD07; SEC13-specific submission controls are in F04/F06.

**Verification and blockers:** deny wrong-user job read/cancellation, cross-event writes and self-granted organiser privileges at server boundary; inspect redacted logs/outbound data; test quotas/timeouts/cancellation/provider failure and audit privacy. Separate development/production credentials and keep secrets server-side (SEC12). Resolve D02/D04/D05 identity/hosting/provisioning/coordinator/review, D06 privacy/provider/retention and D08 numerical limits. D07 action details can wait until F08/F09 need them. Build minimal F10 with F01, not every external-action mechanism immediately. Fixtures do not prove provider or deployment correctness.

## Review-only work

These are proposed independent reviews, not delivery/code tasks. Independence applies only when you did not implement the reviewed change.

| Feature/source | Stories | Review focus |
| --- | --- | --- |
| [F02 Planning](../project.md#f02-personal-planning-workspace) | F02-US01–03 | Own-user privacy, programme/event integrity, conflicting drafts versus valid acceptance (RD03), stale/current revisions and cancellations (RD04), preference/unknown-accessibility semantics; wishlist is stretch |
| [F07 Dining/travel](../project.md#f07-group-dining-and-travel) | F07-US01–02 | Source timestamps, route/group-size uncertainty, fallback and typed itinerary contract; no unsupported reservation/accessibility/best-route guarantees |
| [F09 Promotion/procurement](../project.md#f09-business-promotion-and-procurement) | F09-US01–03 | Private business context, source/destination checks, estimates versus quotes, exact sandbox approval; image/export extensions separately scoped, real payments/orders deferred |

Use approved criteria, actual diff and enforcement-boundary evidence. Investigate findings and record reviewer/scope and specification/implementation revision. Reviewer agreement is not proof.

## Start in parallel with checkpoint handoffs

| Round | Your primary work | Partner checkpoints and other work |
| --- | --- | --- |
| 0 Design | Programme fields/read contract | Yik Bing agrees consumer; Isaac agrees event/business/submission; all three agree foundation/visibility/fixtures |
| 1 Core | F01 publishing | Yik Bing contributes reader/contract while leading F02; Isaac leads F06 manual preparation. Contribute F06 setup/submission contract checkpoint; review F02 without implementing its reviewed slice |
| 2 AI/review | F04 organiser decisions/reports | Isaac provides submission/status handoff while leading F06; Yik Bing leads F03 and you contribute programme grounding/validation |
| 3 Integration | F05 programme updates | Yik Bing notifications/replanning; Isaac shared contract/integration tests; all review change-versus-acceptance race boundary |
| 4 Optional | F08 venue research | Isaac action/evidence checkpoint while leading F09; Yik Bing leads F07. Review F07/F09 only for slices you did not implement |

Delivery partners contribute meaningful bounded tasks, not necessarily simultaneous coding. Record actual tasks in [the feature template](../templates/feature.md). Use separate local databases and common synthetic fixtures. Feature modules own model/table edits; coordinate shared contract/model registration/migration configuration. Add separate migration files, never edit applied history, and resolve multiple migration heads together. Review empty-database creation and synthetic-data upgrade paths before merge. Foreign keys protect integrity, not access. Fixture development needs final real integration against delivered producer revisions.

## Approval, sources and evidence limits

This handoff was derived from [WORKFLOW.md](../../WORKFLOW.md), [SDD process](../README.md), [project](../project.md), [schema/parallel plan](../schema-and-parallel-plan.md), [security](../security.md), [F01 draft](../features/F01-published-programme.md), [feature template](../templates/feature.md) and [team index](README.md). It does not replace these authoritative sources.

Before Ready: resolve feature-local blockers, agree numbered criteria and contract examples, assign bounded tasks/approver/contract reviewer/independent reviewer, and record approval. D01 rubric/deadline and D03 final scope commitment remain unresolved. Proposed provider/numerical defaults are not measured or automatically accepted. Carry accepted RD01–RD07 into criteria; do not reopen accepted policy just because schema fields remain draft.

All checks above are planned, not executed implementation tests. No application, database migration, persistence, deployment, live provider or rubric correctness is established. Completion requires revision-specific criterion evidence, actual independent review, real integration and intended delivery checks. No implementation, commit or push is authorised by this guide.
