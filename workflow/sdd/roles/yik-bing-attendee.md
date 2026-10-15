# Yik Bing development guide

Updated: 2026-10-15. Design handoff; application implementation remains deferred.

You steward the attendee experience, but your development participation also includes organiser publication, business promotion and shared infrastructure. End-user roles in stories describe who uses the feature, not which developer implements it. Full stories below provide feature context; they do not assign every story to you personally.

[Project context](../project.md) owns canonical stories and proposed allocations. Task splits here are proposed and must be agreed in feature specifications. [Story coverage](story-coverage.md) provides the team-wide map.

## Assignment and story index

| Feature | Involvement | Canonical stories included | Proposed partner / coordinator | Priority |
| --- | --- | --- | --- | --- |
| F01 | Delivery | F01-US01–03 | Dylan / Dylan | MVP; draft F01 spec is narrower |
| F02 | Delivery | F02-US01–03 | Isaac / Yik Bing | US01–02 MVP; US03 stretch |
| F03 | Delivery | F03-US01–04 | Dylan / Yik Bing | US01–03 MVP; US04 stretch |
| F05 | Delivery | F05-US01–03 | Dylan and Isaac / Dylan | MVP |
| F07 | Delivery | F07-US01–02 | Isaac / Yik Bing | Stretch |
| F09 | Delivery | F09-US01–03 | Isaac / Isaac | Stretch; real commerce deferred |
| F10 | Delivery | F10-US01–03 | All three / to assign | US01–02 minimum MVP; US03 when F08/F09 needs it |
| F04 | Independent review only | F04-US01–04 linked below | Dylan and Isaac / Dylan | US01–03 MVP; US04 stretch |
| F06 | Independent review only | F06-US01–04 linked below | Isaac and Dylan / Isaac | MVP |
| F08 | Independent review only | F08-US01–02 linked below | Dylan and Isaac / Dylan | Stretch |

There are 21 full delivery stories below. MVP/stretch remains proposed pending rubric/deadline review. F01 has draft numbered criteria, not approved criteria; most other features still need detailed criteria. This guide does not make a feature Ready.

## Shared rules and accepted decisions

Read [security](../security.md), [schema/contracts](../schema-and-parallel-plan.md), [SDD process](../README.md), [WORKFLOW.md](../../WORKFLOW.md) and [the feature template](../templates/feature.md). Refresh these extracts when canonical sources change.

The accepted [RD01–RD07](../project.md#accepted-review-decisions) establish:

- RD01: active business membership spans the business's event workspaces within its membership role. Event organiser membership never grants private business access.
- RD02: submitted content freezes; MVP allows draft → submitted → accepted/rejected only. No post-submit editing, withdrawal, resubmission or reconsideration. Decisions check expected submitted revision and undecided state. Reports reference exact submitted content and immutable rubric versions; a newer applicable rubric makes them visibly stale and requires regeneration for a current assessment. Manual decisions remain possible without AI.
- RD03: manual conflicting drafts save with warnings; acceptance must pass current hard constraints. AI returns a validated feasible draft or explains infeasibility.
- RD04: immutable old/new programme facts are retained; plans show current facts/change indicators and keep cancellations until removed/replaced. Acceptance revalidates current revisions.
- RD05: accepted-plan recipients are fixed consistently at programme-change commit. Bookmarks/drafts do not qualify; recorded recipients survive retries and recipient/change deduplication. Isaac contributes contract/integration work only; business disruption views are deferred.
- RD06: duplicates compare permitted submitted records within the same event only. Evidence is organiser-only; applicant reasons cannot reveal competitors.
- RD07: every AI workflow enforces job ownership, progress, cancellation, timeouts, quotas, outbound minimisation and validation before display, preserving accepted data/manual flows on failure.

Module ownership is not exclusive person ownership. Reference stable IDs and reviewed interfaces; never write another module's tables directly. Coordinate shared registration/contracts/migrations. Use separate local databases with common reviewed migrations and synthetic fixtures.

## Delivery features

### F01 Publish and browse programmes

Canonical stories (feature context):

- F01-US01: As an organiser, I want to create venues, rooms and draft programme items so that I can prepare an event schedule. MVP scope: room capacity and accessibility fields, programme times, prices and publication state. Excludes complex venue booking.
- F01-US02: As an organiser, I want to publish valid programme items so that attendees see authoritative details. MVP scope: permission checks, validation, revision and audit record. Publication is an explicit organiser action.
- F01-US03: As an attendee, I want to browse and search published events and programme items so that I can choose activities. MVP scope: event list, item list, title search, type/date filters and detail pages. Excludes recommendations and ticket sales.

Proposed split: you lead catalogue/detail UI and consumer checks; Dylan leads organiser creation/publication. Agree PublishedProgramme v1 together. Programme owns events/venues/rooms/items; F01 introduces no attendee planning tables.

[The F01 spec](../features/F01-published-programme.md) covers venue/room creation, item publication, title search, and type/date filters. Apply SEC01/02/11/12, retaining RD04-compatible revisions. Capacity is a limit, not available inventory.

Check factual published display/draft privacy (AC04/05), direct unauthorised calls and invalid references (AC02/03), fresh-data restart (AC06) and real deployment (AC09) jointly. Blockers: D02/D04/D05, guest browsing, accessibility/currency fields, edits/concurrency and room-conflict publication policy. D01 is resolved. Design against draft/published fixtures first; final integration requires Dylan's real producer.

### F02 Personal planning workspace

Canonical stories (feature context):

- F02-US01: As an attendee, I want to bookmark activities and add them to a personal itinerary so that I can plan my day. MVP scope: add/remove, chronological view, ownership and persistence; conflicting drafts save with visible warnings, but acceptance requires all hard constraints to pass (RD03). Excludes reservations.
- F02-US02: As an attendee, I want to record interests, budget, accessibility needs and break preferences so that my plans reflect my constraints. MVP scope: explicit hard/soft constraints and editable private preferences; missing accessibility information is shown as unknown.
- F02-US03: As an attendee, I want a merchandise wishlist with estimated prices so that I can track intended spending. Stretch scope: manual entries, quantities and totals. Excludes stock guarantees and purchases.

Proposed split: you lead private plan/preferences flows, warnings and acceptance; Isaac takes an agreed bounded validator/persistence task and integration check. Dylan supplies the programme contract/fixtures, but must not implement a change he independently reviews.

Attendee planning owns preferences, bookmarks, itineraries, revisions and items; Identity/Programme supply permissions/IDs/current facts. Items must match their itinerary event and accepted revisions their itinerary. Wishlist physical design is not agreed. Apply SEC01/02/05/11, RD03/04.

Check wrong-user direct reads/writes, wrong-event references, conflicting saves versus rejected acceptance, adjacent intervals/buffers, stale/cancelled activities and fresh-data restart. Preserve accepted history even when it needs attention. Blockers: D08 buffers/accessibility unknowns/currency, acceptance transaction semantics and parent/revision migration order; wishlist needs stretch approval. Agree valid/conflicting fixtures with Isaac and programme fixtures with Dylan.

### F03 AI event concierge

Canonical stories (feature context):

- F03-US01: As an attendee, I want the AI to create and save a draft itinerary from my preferences so that I can review a usable plan. MVP scope: permitted published items, deterministic checks and validation before display, explanations and draft persistence. Produce a feasible draft or explain infeasibility. Acceptance creates a new accepted version after current facts/constraints are revalidated; it does not silently replace my current plan (RD03/RD04).
- F03-US02: As an attendee, I want grounded answers about published event information so that I can find reliable details. MVP scope: referenced item IDs/revisions, factual validation and an explicit unknown response when evidence is insufficient.
- F03-US03: As an attendee, I want a replacement plan after cancellations so that I can adjust my day. MVP scope: compare old/new drafts and retain hard constraints; accepting changes is explicit. Depends on F05.
- F03-US04: As an attendee, I want a personalised recap so that I can remember my event experience. Stretch scope: distinguish planned activities from activities I explicitly mark as attended; no inferred attendance tracking.

Proposed split: you lead plan review/acceptance, Q&A evidence and old/new comparison; Dylan contributes permitted retrieval and a bounded AI/validator task. Agree DraftArtifact v1 and PublishedProgramme v1. US03 depends on F05; US04 is stretch.

AI/actions owns jobs/artifacts/sources; attendee planning owns authoritative accepted plans. Generic artifacts cannot replace domain records. Apply SEC03/04/05/06/08/10, RD03/04/07 and F10 below.

Check fabricated facts/IDs, stale revisions and injection before valid display, infeasibility without accepted-plan changes, explicit freshly validated acceptance and recap attendance evidence. Blockers: D06 provider/privacy/consent/outbound fields, D08 limits, F02 acceptance and F05 changes for US03. Prepare feasible/infeasible/stale fixtures before live provider work; provider data boundary needs approval.

### F05 Disruptions and notifications

Canonical stories (feature context):

- F05-US01: As an organiser, I want to cancel or revise a published activity and publish an announcement so that attendees receive current information. MVP scope: revision checks, explicit confirmation, atomic update and audit record; immutable old/new change facts (RD04); conflicts must be resolved before publication.
- F05-US02: As an attendee, I want in-app notifications for changes affecting my accepted itinerary so that I can respond. MVP scope: recipients fixed consistently at change commit, verified historical facts, source revision, read state and recipient/change deduplication (RD04/RD05). Drafts and bookmarks alone do not qualify. Excludes email/push delivery and business-specific notifications initially.
- F05-US03: As an organiser, I want AI-drafted disruption messages so that I can communicate quickly. MVP scope: save an editable draft from verified changed facts. Publication requires organiser approval of the exact text and revision.

Proposed split: you lead accepted-plan notification/read-state and changed-plan display; Dylan leads revisions/announcements; Isaac contributes shared contracts/integration tests only. Agree ProgrammeChanged v1 and plan-acceptance/change transaction behavior together.

Programme owns current facts and immutable changes; Notifications owns announcements/notifications; attendee planning supplies accepted revision references. No business-specific disruption view. Apply SEC01/02/04/06/07/11, RD04/05; AI messages also follow F10.

Check commit-time accepted recipients, draft/bookmark exclusion, acceptance races, two historical updates before delayed processing, unchanged retry recipients and deduplication. Current links must not revert later facts; edited announcement text/revision invalidates approval. Blockers: transaction isolation/locking, change/read-state contracts, publication conflicts and detailed criteria. Design against historical-change fixtures; final verification needs real producers.

### F07 Group dining and travel

Canonical stories (feature context):

- F07-US01: As an attendee planning for friends, I want meal options suited to our group size, budget and dietary preferences so that we can eat together. Scope: user-entered group requirements, sourced options and draft meal slots. Excludes group invitations, shared accounts and reservation guarantees.
- F07-US02: As an attendee, I want travel estimates between activities and meal locations so that my itinerary allows enough time. Scope: provider-derived route estimates, mode, retrieval time and fallback when unavailable. Excludes claims about the best route or wheelchair access without supporting data, and excludes bookings.

Proposed split: you lead group inputs/evidence and itinerary interaction; Isaac contributes a bounded source/route adapter and integration cases. Entire feature is stretch.

AI/actions owns research evidence; Programme owns event facts. Attendee planning requires a reviewed typed-entry extension for meals/routes, not speculative nullable fields. Apply SEC03/04/08/09/10 and SEC05 when routes constrain a plan; follow F10.

Check group size versus guaranteed seating, unknown dietary/accessibility evidence, mode/retrieval-time estimates, unavailable-provider fallback and malicious redirects/private destinations. Blockers: D07 provider/cost/licensing/source policy, D08 travel/accessibility semantics and typed-entry approval. Sourced/unknown/unavailable fixtures permit independent design. No bookings or unsupported best-route/accessibility claims.

### F09 Business promotion and procurement

Canonical stories (feature context):

- F09-US01: As a business participant, I want AI to draft poster and freebie concepts so that I can prepare promotional materials. Scope: editable copy and layout brief; image generation and print-ready exports are separately scoped extensions requiring provider and export-quality decisions.
- F09-US02: As a business participant, I want AI to compare printers, snacks and freebie suppliers so that I can prepare a purchase shortlist. Scope: source links, quantities, estimates, delivery constraints and uncertainty; link screening is not a guarantee of seller trustworthiness.
- F09-US03: As a business participant, I want a reviewed quotation request or purchase proposal so that I can approve exact costs and recipients. Scope: saved request/cart draft and sandbox approval demonstration. Real orders and payments are deferred until provider, cancellation, fulfilment and spending policies are agreed.

Proposed split: help Isaac with evidence-rich comparisons and exact proposal review through an agreed bounded UI/validator/integration task. Isaac coordinates. Business-user stories retain their original voice.

Business preparation owns accepted tasks/budgets; AI/actions owns concept/research/proposal drafts and evidence. Use BusinessContext v1/DraftArtifact v1 without direct budget-table writes; manual F06 budgets must not depend on AI. Apply SEC01/02/03/06/07/08/09/10/11, RD01/07 and F10.

Check business privacy/inactive membership, screened URLs without seller-safety guarantees, deterministic arithmetic/estimate labels and changed seller/recipient/payload/cost invalidating approval. Sandbox retries must not duplicate actions; uncertain outcomes need reconciliation. Blockers: D07 providers/budget/destinations, F06 contracts and approval limits. Images/print-ready exports need separate scope/provider/quality decisions. Real orders/payments stay deferred pending fulfilment/cancellation/spending policy. Use synthetic supplier/proposal fixtures.

### F10 Shared identity and action foundation

Canonical stories (feature context):

- F10-US01: As a user, I want secure login and only the event/business permissions assigned to me so that my workspace and private data are protected. MVP scope: verified identity, server-enforced membership, own-data access and organiser-controlled invitations. Excludes self-service privileged roles.
- F10-US02: As a user, I want AI jobs to show progress, results and failures so that I can understand what happened and continue manually. MVP scope: server-authorised job access, persisted state, bounded tools, timeouts, cancellation between steps, quotas, minimal outbound data and validation before display; failure preserves accepted data and manual operation (RD07).
- F10-US03: As an authorised user, I want to approve an exact external action so that the assistant can execute it once within my authority. Implement when F08/F09 needs it: payload-bound approval, expiry, revalidation and audit. Pending or uncertain provider outcomes require reconciliation rather than blind retries.

Proposed split: contribute attendee ownership/job/acceptance cases and an agreed bounded identity/job task; Dylan supplies organiser cases and Isaac business cases. Assign coordinator and independent reviewer per change.

Identity owns users/event/business memberships; AI/actions owns jobs/artifacts/sources/approval/execution records; Audit owns audit events. Coordinate shared files/migrations. Apply SEC01–12 as relevant and SEC13 for submission context, RD01/07. Physical fields/API types and numerical limits remain proposals.

Shared AI checklist for every delivery AI feature: server-check current job/resource permissions on reads, cancellation, draft acceptance and execution; persist progress/failure; enforce bounded tools/steps/timeouts/quotas; cancellation stops later steps but cannot undo completed external actions. Minimise outbound fields/redact logs. Validate schema/IDs/revisions/facts before display; revalidate current domain constraints on acceptance. Preserve manual flows and accepted records on failure.

US03 is needed when F08/F09 proceeds: bind approval to actor, exact recipient/seller/payload, amount/currency where relevant, revisions and expiry. Edits/revoked authority invalidate approval; recheck before execution and audit outcomes. Reconcile unknown provider outcomes rather than blind retries. Models cannot grant privileges or manufacture approvals.

Check wrong-user/event/business access, inactive memberships, self-granted roles, quotas, cancellation, timeout/provider failure, minimised outbound/log fields and unchanged accepted data at server boundaries. Blockers: D02 identity/deployment, D04 coordinator/review, D05 provisioning/roles, D06 privacy and D08 limits. D07 external providers/approval expiry are required only before external execution. Agree permission/job fixtures and build the minimum foundation of each approved slice.

## Review-only work

| Canonical story source | Proposed review scope |
| --- | --- |
| [F04-US01–04](../project.md#f04-submission-review-and-programme-analysis) | RD02/06, SEC13: freeze, concurrent decisions, report provenance/stale rubric, same-event submitted-only comparison and applicant privacy; deterministic programme checks; US04 remains stretch and never certifies compliance. |
| [F06-US01–04](../project.md#f06-business-participation-and-preparation) | RD01/02/07: business-wide access across two events, private drafts/budgets, submitted freeze, decision/status handoff, manual preparation independence, deterministic budget and AI failure. Booth/setup assignment needs a contract. |
| [F08-US01–02](../project.md#f08-venue-research-and-quotations) | SEC03/06–11, RD07: source evidence versus quotes, verified contacts, exact approval/revocation/expiry, redirects/private destinations and repeated/unknown sends; no automatic negotiation/booking/inbox processing. |

Read linked full stories before reviewing. Review-only participation is not a delivery task or a substitute for two-person delivery. Replace yourself as independent reviewer if you implemented the specific change. Record actual evidence/scope.

F04/F06 shared identity/privacy contracts still affect you: decisions do not publish activities; acceptance-to-participation projection needs the reviewed business command. Speaker support remains unresolved.

## Parallel checkpoints

| Round | Your main slice | Coordination |
| --- | --- | --- |
| 0 Design | Attendee/preferences/programme consumer contracts | Dylan: fields/revisions; Isaac: F02 split; all: foundation/fixtures/review assignments |
| 1 Core | F02 against agreed fixtures | F01 contract/integration with Dylan; Isaac's bounded F02 task while his main slice is F06 preparation |
| 2 AI/review | F03 | Dylan retrieval/validator checkpoint; independent F04/F06 review when ready |
| 3 Integration | F05 notifications/F03 replanning | Dylan changes; Isaac contract/integration only; reviewer assigned per change |
| 4 Optional | F07 and bounded F09 contribution | Stagger checkpoints with Isaac; review F08 separately |

Follow [shared work rounds](../schema-and-parallel-plan.md#parallel-development-rounds). Partners need not code one feature throughout. Dylan must not implement a particular F02 change and independently review it. Coordinate overlapping shared files/migration integration and record producer/consumer revisions.

## Readiness and evidence limits

D03 MVP commitment and D04 approvals/allocations remain to confirm; D01 is resolved. Resolve each feature's blockers without waiting for optional external integrations to specify manual planning. Numerical defaults in project.md are recommendations, not measured or approved limits.

Use the template to derive numbered criteria from stories/RD scenarios, agree contracts and bounded tasks, and record approval before implementation. Include accessible forms, keyboard/focus behavior and understandable errors.

Completion requires criterion-to-evidence mapping, specification/implementation revisions, actual independent review, investigated findings, fresh-data restart, real producer integration and delivery checks. Fixtures do not establish real integration. This guide creates no evidence of application, migration, provider, deployment or rubric correctness and authorises no commit or push.
