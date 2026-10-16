# EventApp project context

EventApp helps people plan attendance and run events while keeping AI recommendations and actions grounded in verifiable information. Confirmed on 2026-10-14: Python with FastAPI for the backend, TypeScript with React for the frontend, and a three-person team comprising Dylan, Yik Bing, and Isaac as the three role owners. All three teammates approved the review decisions below on 2026-10-15. Other scope and infrastructure recommendations remain proposals where labelled. Application implementation remains deferred pending feature criteria and remaining blockers.

## Accepted review decisions

These decisions supersede conflicting earlier recommendations. They approve the specified behavior, not every feature or physical schema detail. Dylan, Yik Bing, and Isaac approved them on 2026-10-15; feature-specific approval records remain to be assigned.

| ID | Accepted behavior | Applies to |
| --- | --- | --- |
| RD01 | BusinessMembership is business-wide: active members access that business's workspaces across its events within their membership role. EventParticipation remains event-specific. No participation-specific staff access in MVP. Organiser membership does not grant access to business-private data. | F06/F10 |
| RD02 | Draft application content is editable; content freezes on submission. MVP states are draft → submitted → accepted or rejected. Editing after submission, withdrawal, resubmission and reconsideration are excluded. Decisions require the expected submitted revision and an undecided submitted state. Saved AI reports bind exact submission and immutable rubric versions. | F04/F06 |
| RD03 | Manual itinerary drafts may contain conflicts with visible warnings. Acceptance requires all hard constraints to pass. AI returns a validated feasible draft or explains infeasibility; invalid outputs cannot be displayed as valid recommendations. | F02/F03 |
| RD04 | Preserve immutable old/new facts for each committed programme change. Plans display current facts and indicate changes since planning; cancelled activities remain visible until removed or replaced. Revalidate against current programme revisions and constraints before accepting a plan. | F02/F03/F05 |
| RD05 | F05 notifies only attendees whose accepted itinerary contains the changed activity at the programme change's commit boundary. Drafts and bookmarks do not qualify. Deduplicate by recipient/change ID. Isaac contributes shared contract and integration work; business-specific disruption views are deferred. | F05 |
| RD06 | Duplicate analysis compares permitted submitted applications in the current event only. Comparison evidence is organiser-only; applicant-facing reasons cannot expose other applications. | F04 |
| RD07 | Every role follows F10 job ownership, progress, cancellation, timeouts, quotas, outbound-data minimisation and validation-before-display requirements. Manual workflows and accepted data remain usable when AI fails. | AI features/F10 |

For RD02, submission content and its submitted revision remain frozen even when decision state changes. Rubric versions are immutable; changing criteria creates a new version. Reports show their evaluated versions and become visibly stale when the applicable rubric version changes; regeneration is required before using them as a current assessment. An organiser may still decide manually without an AI report. Repeated or concurrent decisions cannot create multiple outcomes: a stale/decided request returns a conflict and the current state without changing the first decision.

For RD03, acceptance validates current activity state, times, budget, accessibility requirements and agreed travel/break buffers on the server. Adjacent intervals do not overlap, but may violate buffers. Buffer values and unknown-accessibility confirmation semantics remain feature-specific decisions. A programme change may make a previously accepted plan need attention; it does not erase the plan or silently accept a replacement.

For RD05, persist the affected recipient set consistently with the committed change. Later delivery retries use that set rather than inspecting whichever plan is current at delivery time. Notifications identify the historical change and link to current facts; they do not revert newer changes. Future opt-out or retention policy must be explicit if introduced.

### Required verification for the accepted decisions

| Decision | Evidence required before the affected feature is complete |
| --- | --- |
| RD01 | One business participating in two events: authorised members can access both workspaces; another business's users, inactive members and event organisers without business membership cannot access its private records or AI job context |
| RD02 | Post-submit edits and stale/concurrent decisions fail; only one outcome persists; saved reports retain exact submission/rubric references and signal an outdated rubric; applicant views expose no competitor evidence |
| RD03 | A conflicting manual draft saves with warnings but fails acceptance; a valid draft accepts; AI infeasibility preserves the accepted plan; invalid drafts and answers fail validation before being shown as valid |
| RD04 | Two programme updates before delayed processing still yield the correct historical facts; current plan view flags changes/cancellations; accepting a stale draft fails or requires refreshed validation |
| RD05 | Accepted-plan users receive one notification per change; bookmark-only and draft-only users receive none; recipient selection races with plan acceptance are consistent; retries and later plan edits do not retarget delivery |
| RD06 | Cross-event submissions and private drafts are excluded from comparison; organiser evidence is protected; applicant-facing reasons do not leak another submission |
| RD07 | Wrong-user job access is denied; quota/timeout/cancellation behavior is visible; outbound fields and logs are minimised; failed AI leaves accepted data and manual actions intact |

These are required verification scenarios, not executed tests. Carry the applicable decision IDs into numbered feature acceptance criteria and revision-specific evidence.

## Confirmed stack and ownership

| Area | Confirmed choice or owner |
| --- | --- |
| Backend | Python and FastAPI |
| Frontend | TypeScript and React |
| Attendee workspace | Yik Bing |
| Organiser workspace | Dylan |
| Business participant workspace | Isaac |

Business participant is the umbrella role for exhibitors, vendors, sponsors, artists, or other businesses depending on the event. Booth personnel is one subtype. Recommended MVP: implement exhibitors and vendors first using one shared workspace, with an event-specific participant type. The role assignments identify domain stewards who maintain a consistent user experience and clarify requirements. Feature delivery involves at least two teammates, with all three involved in shared foundations and broader integration.

## Feature collaboration

Confirmed team convention: each feature involves two or all three teammates. The allocation below is a recommended starting point; swap assignments to balance workload and learning. A coordinator tracks delivery but does not exclusively implement the feature.

| Feature | Delivery participants | Coordinator | Suggested independent reviewer |
| --- | --- | --- | --- |
| F01 Programme publication and browsing | Dylan and Yik Bing | Dylan | Isaac |
| F02 Personal planning | Yik Bing and Isaac | Yik Bing | Dylan |
| F03 AI concierge | Yik Bing and Dylan | Yik Bing | Isaac |
| F04 Submission review and analysis | Dylan and Isaac | Dylan | Yik Bing |
| F05 Disruptions and notifications | All three | Dylan | Assign per change |
| F06 Business participation and preparation | Isaac and Dylan | Isaac | Yik Bing |
| F07 Dining and travel | Yik Bing and Isaac | Yik Bing | Dylan |
| F08 Venue research and quotations | Dylan and Isaac | Dylan | Yik Bing |
| F09 Promotion and procurement | Isaac and Yik Bing | Isaac | Dylan |
| F10 Identity and action foundation | All three | To assign | Assign per change |

Features are high-level delivery groupings and may contain stories for more than one end-user role. Each story keeps its original user role, and that role's steward is accountable for delivering the complete role-specific outcome required by the assignment. Other participants may contribute bounded shared contracts, integration, verification, or review tasks without transferring that primary accountability. Participants jointly refine stories and agree on contracts; one person can lead a story while a partner contributes at agreed checkpoints and leads another story in parallel. Review-only involvement does not satisfy the two-person delivery convention. Record the primary story owner and every actual contribution in the feature specification.

Accepted direction: one PostgreSQL database with module-owned tables, a small shared foundation, stable producer/consumer contracts, synthetic fixtures and coordinated migrations. See [shared schema and parallel development plan](schema-and-parallel-plan.md) for the proposed entities, ownership, relationship rules and work rounds. These design details require review before migrations or application implementation.

For features involving all three, assign an independent reviewer for each bounded change who did not implement that change. That person can contribute to other changes in the same feature. If all three implemented a particular change, obtain a fresh independent reviewer when required and record their scope; co-author review is not independent review.

## Proposed users and capabilities

| Role | Independent workspace | AI assistance |
| --- | --- | --- |
| Attendee | Search published programmes, bookmarks, itineraries, merchandise wishlists, accessibility and scheduling preferences, schedule notifications | Explain and build itineraries; resolve overlaps; respect budget, accessibility, travel and breaks; replan after cancellations; answer published-information questions; create recaps |
| Organiser | Venues, rooms, capacities, schedules, submission review, announcements, cancellations, coverage, policies | Summarise and compare submissions against a rubric; flag suspected duplicates and conflicts; draft checklists and announcements |
| Business participant | Business profile, submissions, participation details, preparation checklist and budget | Create promotional content; research printing and supply options; estimate costs; prepare quotation requests |

Attendee and organiser core workflows must remain usable without the other role being actively online. Organiser decisions to accept or reject submissions and publish changes require human approval.

## Recommended delivery sequence

| Feature | Proposed slice | Dependency |
| --- | --- | --- |
| F01 | Organiser publishes a programme item; attendee reads it securely | Repository, identity approach, persistence, delivery target |
| F02 | Personal bookmarks and itinerary with deterministic overlap checks | F01 and preference ownership |
| F03 | Grounded AI itinerary recommendations with verified references and failure fallback | F02 and approved model data boundary |
| F04 | Submission analysis against an explicit rubric with organiser decisions, plus programme conflict analysis | F06-US01 submitted applications and submission privacy rules for F04-US01–02; F01 programme records for F04-US03 |
| F05 | Schedule changes, affected itinerary handling, and verified notifications | F02 and notification delivery contract |
| F06 | Business participation and preparation workspace | Event and business membership rules |
| F07 | Group dining and travel planning | F03 and external places and route sources |
| F08 | Venue research and quotation workflow | Organiser workspace and external action approval |
| F09 | Business promotional assets and procurement preparation | F06 and source and approval rules |
| F10 | Shared identity, permissions and action execution foundation | All roles; build the minimum with F01 |

Recommended MVP covers all three user roles: F01, F02, F03, F04, F05 and F06, plus the required parts of F10. Keep each narrow. Build minimal F10 with F01, then develop the planning and business/submission slices using the feature collaboration assignments after agreeing on shared contracts. F07, F08 and F09 are stretch features. The team has not yet made the final MVP commitment and will update D03 after its scope discussion.

## User stories and implementation scope

Story IDs remain stable and should be referenced by feature acceptance criteria. MVP and stretch labels are recommendations. A story is not ready to implement until its detailed criteria, contracts and blocking decisions have been reviewed.

### F01 Publish and browse programmes

Delivery participants: Dylan and Yik Bing. Coordinator: Dylan. Suggested independent reviewer: Isaac. Draft acceptance criteria: [F01 specification](features/F01-published-programme.md).

- F01-US01: As an organiser, I want to create venues, rooms and draft programme items so that I can prepare an event schedule. MVP scope: room capacity and accessibility fields, programme times, prices and publication state. Excludes complex venue booking.
- F01-US02: As an organiser, I want to publish valid programme items so that attendees see authoritative details. MVP scope: permission checks, validation, revision and audit record. Publication is an explicit organiser action.
- F01-US03: As an attendee, I want to browse and search published events and programme items so that I can choose activities. MVP scope: event list, item list, title search, type/date filters and detail pages. Excludes recommendations and ticket sales.

The draft F01 specification covers venue and room creation, item publication, title search, and type/date filters. Its remaining blockers and approval status are recorded in that specification.

### F02 Personal planning workspace

Delivery participants: Yik Bing and Isaac. Coordinator: Yik Bing. Suggested independent reviewer: Dylan.

- F02-US01: As an attendee, I want to bookmark activities and add them to a personal itinerary so that I can plan my day. MVP scope: add/remove, chronological view, ownership and persistence; conflicting drafts save with visible warnings, but acceptance requires all hard constraints to pass (RD03). Excludes reservations.
- F02-US02: As an attendee, I want to record interests, budget, accessibility needs and break preferences so that my plans reflect my constraints. MVP scope: explicit hard/soft constraints and editable private preferences; missing accessibility information is shown as unknown.
- F02-US03: As an attendee, I want a merchandise wishlist with estimated prices so that I can track intended spending. Stretch scope: manual entries, quantities and totals. Excludes stock guarantees and purchases.

### F03 AI event concierge

Delivery participants: Yik Bing and Dylan. Coordinator: Yik Bing. Suggested independent reviewer: Isaac.

- F03-US01: As an attendee, I want the AI to create and save a draft itinerary from my preferences so that I can review a usable plan. MVP scope: permitted published items, deterministic checks and validation before display, explanations and draft persistence. Produce a feasible draft or explain infeasibility. Acceptance creates a new accepted version after current facts/constraints are revalidated; it does not silently replace my current plan (RD03/RD04).
- F03-US02: As an attendee, I want grounded answers about published event information so that I can find reliable details. MVP scope: referenced item IDs/revisions, factual validation and an explicit unknown response when evidence is insufficient.
- F03-US03: As an attendee, I want a replacement plan after cancellations so that I can adjust my day. MVP scope: compare old/new drafts and retain hard constraints; accepting changes is explicit. Depends on F05.
- F03-US04: As an attendee, I want a personalised recap so that I can remember my event experience. Stretch scope: distinguish planned activities from activities I explicitly mark as attended; no inferred attendance tracking.

### F04 Submission review and programme analysis

Delivery participants: Dylan and Isaac. Coordinator: Dylan. Suggested independent reviewer: Yik Bing. Submission contract agreed by both participants.

- F04-US01: As an organiser, I want to review submissions and explicitly accept or reject them so that I control event participation. Proposed first scope: business applications; speaker support still needs a separate scope decision and submitter design. Accepted lifecycle: frozen submitted content, revision-checked one-time decisions, reason and audit record; no withdrawal, resubmission or reconsideration in MVP (RD02). Decisions do not automatically publish programme items.
- F04-US02: As an organiser, I want the AI to create a saved review report against a rubric so that I can inspect strengths, gaps and suspicious duplication. MVP scope: exact submission/rubric version references, criterion-level evidence, stale-report handling, unknowns and injection handling (RD02). Duplicate comparisons use only permitted submitted records in the same event; evidence stays organiser-only and applicant reasons cannot reveal competitors (RD06). Suspicion is a review flag, never a fraud determination or automatic rejection.
- F04-US03: As an organiser, I want deterministic checks for room, time and capacity conflicts so that invalid schedules do not reach publication. MVP scope: overlapping room usage and room capacity. AI may explain findings but cannot override them.
- F04-US04: As an organiser, I want programme coverage and accessibility checklists so that I can identify gaps. Stretch scope: agreed categories and stored policies, evidence links and editable drafts; excludes certification of safety or compliance.

### F05 Disruptions and notifications

Delivery participants: all three. Coordinator: Dylan. Independent reviewer assigned per change. Dylan and Yik Bing agree on organiser-to-attendee behavior; Isaac contributes shared contract work and integration tests. A business-specific disruption view is deferred (RD05).

- F05-US01: As an organiser, I want to cancel or revise a published activity and publish an announcement so that attendees receive current information. MVP scope: revision checks, explicit confirmation, atomic update and audit record; immutable old/new change facts (RD04); conflicts must be resolved before publication.
- F05-US02: As an attendee, I want in-app notifications for changes affecting my accepted itinerary so that I can respond. MVP scope: recipients fixed consistently at change commit, verified historical facts, source revision, read state and recipient/change deduplication (RD04/RD05). Drafts and bookmarks alone do not qualify. Excludes email/push delivery and business-specific notifications initially.
- F05-US03: As an organiser, I want AI-drafted disruption messages so that I can communicate quickly. MVP scope: save an editable draft from verified changed facts. Publication requires organiser approval of the exact text and revision.

### F06 Business participation and preparation

Delivery participants: Isaac and Dylan. Coordinator: Isaac. Suggested independent reviewer: Yik Bing.

- F06-US01: As a business participant, I want an event-specific profile and a draft submission so that I can apply to participate. MVP scope: exhibitor/vendor type, description, requested space, contact fields, draft editing and explicit submission. Business membership spans the business's events (RD01); submitted content freezes and post-submit edits, withdrawal and resubmission are excluded (RD02). The workspace remains usable while awaiting an organiser.
- F06-US02: As a business participant, I want to see my application's status and approved participation details so that I can prepare. MVP scope: own-business status, decision reason where shared, assigned booth and setup instructions; excludes other businesses' private submissions.
- F06-US03: As a business participant, I want a preparation checklist and budget so that I can plan materials and spending. MVP scope: manual checklist, quantities, unit prices, currency and totals; distinguish estimates from quotations.
- F06-US04: As a business participant, I want AI to create a saved preparation plan and budget draft so that I can turn my event needs into tasks. MVP scope: verified event/setup facts, editable tasks, labelled estimates and deterministic arithmetic. No orders or payments.

### F07 Group dining and travel

Delivery participants: Yik Bing and Isaac. Coordinator: Yik Bing. Suggested independent reviewer: Dylan. Stretch feature.

- F07-US01: As an attendee planning for friends, I want meal options suited to our group size, budget and dietary preferences so that we can eat together. Scope: user-entered group requirements, sourced options and draft meal slots. Excludes group invitations, shared accounts and reservation guarantees.
- F07-US02: As an attendee, I want travel estimates between activities and meal locations so that my itinerary allows enough time. Scope: provider-derived route estimates, mode, retrieval time and fallback when unavailable. Excludes claims about the best route or wheelchair access without supporting data, and excludes bookings.

### F08 Venue research and quotations

Delivery participants: Dylan and Isaac. Coordinator: Dylan. Suggested independent reviewer: Yik Bing. Stretch feature.

- F08-US01: As an organiser, I want AI to research venues against location, capacity and budget requirements so that I can compare a sourced shortlist. Scope: bounded research job, saved comparisons, evidence and missing values; published prices are not confirmed quotes.
- F08-US02: As an organiser, I want the AI to prepare a quotation email and send it after I approve the recipient and content so that I can request prices efficiently. Scope: verified contact source, exact email preview, approval expiry, one-time execution and send outcome. Excludes automatic negotiation, booking and unattended inbox processing.

### F09 Business promotion and procurement

Delivery participants: Isaac and Yik Bing. Coordinator: Isaac. Suggested independent reviewer: Dylan. Stretch feature.

- F09-US01: As a business participant, I want AI to draft poster and freebie concepts so that I can prepare promotional materials. Scope: editable copy and layout brief; image generation and print-ready exports are separately scoped extensions requiring provider and export-quality decisions.
- F09-US02: As a business participant, I want AI to compare printers, snacks and freebie suppliers so that I can prepare a purchase shortlist. Scope: source links, quantities, estimates, delivery constraints and uncertainty; link screening is not a guarantee of seller trustworthiness.
- F09-US03: As a business participant, I want a reviewed quotation request or purchase proposal so that I can approve exact costs and recipients. Scope: saved request/cart draft and sandbox approval demonstration. Real orders and payments are deferred until provider, cancellation, fulfilment and spending policies are agreed.

### F10 Shared identity and action foundation

Delivery participants: all three. Coordinator: to assign. Independent reviewer assigned per change. Each domain steward contributes their role's permissions and integration cases.

- F10-US01: As a user, I want secure login and only the event/business permissions assigned to me so that my workspace and private data are protected. MVP scope: verified identity, server-enforced membership, own-data access and organiser-controlled invitations. Excludes self-service privileged roles.
- F10-US02: As a user, I want AI jobs to show progress, results and failures so that I can understand what happened and continue manually. MVP scope: server-authorised job access, persisted state, bounded tools, timeouts, cancellation between steps, quotas, minimal outbound data and validation before display; failure preserves accepted data and manual operation (RD07).
- F10-US03: As an authorised user, I want to approve an exact external action so that the assistant can execute it once within my authority. Implement when F08/F09 needs it: payload-bound approval, expiry, revalidation and audit. Pending or uncertain provider outcomes require reconciliation rather than blind retries.

## AI service and permitted actions

The AI service can do more than return text. Recommended implementation is a bounded tool workflow that researches, creates domain artifacts, runs deterministic checks, saves drafts and executes approved actions through server services.

| Action level | Examples | Authority |
| --- | --- | --- |
| Read and analyse | Query published items, compare submissions, search approved sources | Current user permissions and bounded task scope |
| Create private drafts | Save itinerary versions, review reports, checklists, budgets, promotional copy and email drafts | User request; validate fields and ownership; preserve accepted records |
| Update accepted user data | Replace an accepted itinerary or budget | Explicit user confirmation of the proposed change |
| Act externally or change shared state | Send quotation email, publish announcements, decide applications, place an order | Exact-action approval under SEC06/SEC07 plus server checks; real commerce deferred |

Suggested job flow: request → permission-filtered context → model proposes an allowed tool call → server validates arguments and permissions → execute within the job's limits → validate and save results → show evidence and next action. Approval-required calls stop at a saved proposal until authorised. The model cannot create approval tokens, grant roles or access arbitrary SQL, shell commands or unrestricted browser sessions.

Keep this inside the FastAPI backend with narrow tool functions initially. Add a worker for lengthy research or email execution when needed. Track pending, running, awaiting approval, completed, failed and cancelled job states. For delivery with uncertain outcomes, record unknown and reconcile with the provider; exactly-once delivery cannot be assumed merely from a local retry key.

## Proposed extensions

- Group dining: include lunch and dinner options, group size, budget, travel time, and accessibility in itineraries. Restaurant availability, accessibility, prices, and routes need external sources with timestamps and uncertainty labels. Decide whether Google Maps integration is necessary; provider, API costs, licensing, and booking scope are unresolved.
- Venue research: compare location, price, capacity, and accessibility. Draft quotation requests for venue contacts. Research can run within an authorised scope; sending email requires the action approval defined in [security.md](security.md). A quotation is not a booking.
- Booth preparation: generate designs and research printers, snacks, and freebies; distinguish estimates from quotations. Purchases require explicit approval. A link or seller cannot be described as safe solely because an LLM recommends it.

## Proposed component boundaries

- UI collects user intent and displays evidence, validation failures, and approvals.
- Server enforces identity, event and resource permissions, domain rules, and workflow transitions.
- Database stores authoritative programme records, memberships, revisions, personal data, and audit events.
- Deterministic planning code checks overlaps and hard constraints independently of model prose.
- AI service orchestrates permitted retrieval, analysis, deterministic validators, draft creation and approved actions through narrow tools. It validates structured output and records job state, sources, revisions and outcomes.
- External action service enforces approval, destination checks, quotas, deduplication, and outcome recording.

Use the confirmed FastAPI backend and React frontend. Recommended first architecture: one backend application with internal domain modules and one relational database, rather than separate services. The external action service is initially an internal module with an independent permission boundary.

## Decisions before implementation

| ID | Decision | Impact | Status |
| --- | --- | --- | --- |
| D01 | MP3 brief, rubric, deadline, team size | Required capabilities and realistic scope | Resolved: three-person team; MP3 brief reviewed; deadline 23 Oct 2026, 2pm SGT |
| D02 | Repository, stack, identity provider, database, deployment | F01 implementation and delivery checks | Partially resolved: shared GitHub repository, checkout, stack and PostgreSQL planning baseline confirmed; identity and deployment providers remain open |
| D03 | MVP role and feature coverage, including business participants | Delivery commitment | Three role workspaces confirmed as direction; detailed stories proposed |
| D04 | Product approver, feature participants, coordinator, contract reviewer | Approval and coordination | Partially resolved: role stewards and cross-role participation model confirmed; feature allocations, shared coordinator, approvers and contract reviewers remain proposed or unassigned |
| D05 | Membership model and organiser provisioning | Prevent self-assigned organiser access | Business-wide membership accepted (RD01); organiser provisioning, guest browsing and other role policies remain open |
| D06 | Model provider, retention, consent, data minimisation | AI privacy and integration | Open before F03 |
| D07 | Maps, search, email and commerce providers and budget | External integration scope | Open before relevant extension |
| D08 | Preference semantics and measurable limits | Constraint correctness, latency, quotas and accessibility | Open before affected features |

When a decision is made, record the choice, approver, date, reasoning, and affected feature IDs here. Do not treat a draft recommendation as approval.

## Recommendations for remaining decisions

### D01 Assignment and delivery planning

Use Dylan, Yik Bing, and Isaac as the three-person working team. Map every mandatory rubric item to a feature and acceptance criterion before finalising the MVP. Deliver one complete journey per role and one bounded AI workflow per role before stretching scope. Plan backwards from the confirmed deadline of 23 Oct 2026, 2pm SGT, reserving the final part of the schedule for integration, deployment, adversarial checks and demo preparation.

### D02 Repository and infrastructure

Use one shared Git repository containing backend, frontend and this SDD folder. PostgreSQL is the accepted database planning baseline. SQLAlchemy and Alembic for persistence and migrations, and Pydantic models for API/tool validation remain recommendations. Use a separate local development database per developer with common migrations and fixtures. Use local containers to keep setup repeatable. Derive frontend API types from the reviewed FastAPI OpenAPI contract.

Prefer a managed OpenID Connect identity provider if the rubric permits it; the backend verifies identity tokens and applies application memberships itself. Select the provider after checking course constraints, account access, pricing and hosting region. If the rubric requires implementing authentication, scope it separately before F01. For deployment, use static React hosting, a container-capable backend host and managed PostgreSQL, with separate development and production credentials. Specific vendors and paid tiers remain open.

### D03 Minimum viable scope

Use F01–F06 and the minimum F10 foundation as the proposed MVP, with the story-level exclusions above. Start with a representative convention and synthetic data while retaining event-specific business types. Prioritise draft-producing agents, submission review and itinerary correctness over live purchases, image-generation pipelines or restaurant bookings. Stretch stories require a deliberate scope decision after core integration works.

### D04 Approval and reviews

Each domain steward approves that role's behavior. Cross-role contracts need agreement from the affected stewards; changes to shared security rules need all three. Use the feature collaboration table to assign delivery participants, coordinator and reviewer. For paired delivery, the third teammate is the default independent reviewer. For all-team features, preserve independence at the individual change level as described above. Assign the shared infrastructure coordinator explicitly. Record product approval separately from code review, implementation contributions and verification evidence.

### D05 Membership and provisioning

Accepted: BusinessMembership grants business-wide access across that business's events within the assigned membership role; EventParticipation stores each event's participant type (RD01). Participation-specific staff permissions are deferred. Event organiser access stays event-scoped and does not confer business-private access.

Remaining recommendations: allow public browsing of published programmes; require login for personal workspaces and business submissions. New users start as attendees. Provision initial organisers through a controlled bootstrap step; event organisers invite additional organisers. A user may hold multiple memberships, but changing UI role does not grant permissions. Organisers see submitted applications for their own events, not private preparation budgets or draft applications.

### D06 Model data and retention

Begin with one provider behind an adapter and one structured-output/tool workflow per role. Choose the provider using a small evaluation set for factual correctness, injection resistance, latency and cost rather than branding. Send published event data for attendee tasks, only the necessary submitted fields for organiser reviews, and the requesting business's permitted data for preparation. Do not send contact details or sensitive accessibility notes unless the task requires them and disclosure is explained.

Recommended initial policy: private AI drafts remain editable and deletable by their owner; avoid retaining full provider transcripts; retain minimal job metadata for 30 days with redaction. Confirm provider retention terms and course/privacy requirements before deployment; this is a proposed application policy, not a claim about provider storage. Use structured database retrieval initially; introduce vector retrieval only if document search needs it.

### D07 External integrations and budget

Start with published data and a curated source set. Implement in-app notifications first. For stretch research, select one search provider and, if necessary, one places/routes provider after checking costs and terms. Use a sandbox email adapter before live quotation requests. Do not add live commerce to MVP; saved purchase proposals demonstrate approval and budget controls without fulfilment complexity.

Recommended pilot limits: a configurable per-environment spending ceiling, 10 AI jobs per user per day, at most 5 external research calls per job and at most 10 model/tool steps per job. Record usage and stop at limits. Choose the monetary ceiling once model/provider prices and team budget are known; billing controls must supplement local estimates.

### D08 Constraints and measurable defaults

Accepted: overlapping activities, stated spending ceilings and explicit accessibility requirements are hard constraints for plan acceptance. Manual conflicting drafts remain saveable with warnings; AI must provide a validated feasible draft or an infeasibility explanation (RD03). Interests and preferred variety are soft preferences. Default proposed break: 15 minutes every two hours, editable by the attendee; travel times use sourced estimates or an explicit conservative user-entered buffer. Unknown accessibility information requires confirmation and cannot establish suitability. Group size is an input to research, not evidence that a venue has available seats.

Recommended pilot defaults: non-AI read latency below 500 ms at the 95th percentile under a documented 20-concurrent-user synthetic test; AI draft timeout 60 seconds; research-job timeout 180 seconds; approval expiry 15 minutes; at most one controlled retry for transient read/model failures and no blind retries of external writes. Explain whether timings exclude provider/network time and record the test environment. These are targets to test, not measured capabilities.

For correctness, require every displayed referenced programme fact to pass deterministic validation and every executable external action to pass server approval checks. Include a fixed adversarial suite covering injection, cross-event access, stale approvals, fabricated facts, quota exhaustion and uncertain delivery. Require keyboard navigation, labelled form controls, visible focus and understandable validation for the core flows.

## Technical references

FastAPI provides [OAuth2 scope integration](https://fastapi.tiangolo.com/advanced/security/oauth2-scopes/); resource ownership and event membership still require application checks. PostgreSQL documents [row security policies](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), which can add defense in depth after the application permission model is defined. Narrow tool authority and explicit approval address risks described in [OWASP excessive agency guidance](https://owasp.github.io/www-project-top-10-for-large-language-model-applications/2_0_vulns/LLM06_ExcessiveAgency.html). Architecture and numerical defaults above are project recommendations.

## Change history

| Date | Change |
| --- | --- |
| 2026-10-14 | Confirmed stack and role owners; expanded business role; added scoped stories, bounded AI actions and recommendations for D01–D08 |
| 2026-10-14 | Confirmed two-or-three-person feature delivery; distinguished domain stewardship from implementation and proposed collaboration assignments |
| 2026-10-14 | Accepted modular database and contract-first parallel development direction; documented shared schema draft and staggered participant involvement; implementation remains deferred |
| 2026-10-15 | Applied accepted independent-review recommendations RD01–RD07 across stories, permission policy and verification scenarios; application implementation remains deferred |
| 2026-10-15 | Recorded the confirmed three-person team and deadline, unanimous RD01–RD07 approval, story-level role accountability, corrected F04 dependencies, and aligned F01 scope |
