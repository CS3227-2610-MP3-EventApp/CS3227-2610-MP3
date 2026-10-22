# EventApp project context

EventApp helps people plan attendance and run events while keeping AI recommendations and actions grounded in verifiable information. Confirmed on 2026-10-14: Python/FastAPI, TypeScript/React and three teammates. All three approved RD01–RD07 on 2026-10-15. Shared authentication and the frontend/backend foundations are merged. Dylan approved exact programme revision 6 on 2026-10-20; the organiser UI and published attendee read API are implemented for review, with evidence in the [programme run record](../workflow/agents/runs/2026-10-20-organiser-programme.md). Attendee screens, other domain features, AI and deployment remain subject to their own gates.

## Shared UI direction

The requesting teammate specified on 2026-10-18 that EventApp should have a professional, clean business visual character; navigation should feel smooth; and users should receive responsive feedback when work takes longer than usual. They subsequently selected direct React/TypeScript implementation with Material UI, a navy/teal visual direction and role-dashboard previews for the first frontend prototype. This is a cross-role product outcome for attendee, organiser and business workspaces; exact tokens, animation and latency budgets remain subject to the relevant specification and evidence.

The proposed [shared UI capability Draft](../specs/shared/navigate-eventapp-workspaces.md) will define the observable experience: consistent orientation and navigation, a clear hierarchy for key actions and evidence, responsive layouts, accessible interaction, visible pending/progress/success/failure states, and preservation of user work during delayed or failed operations. Domain specs retain authority over permissions, validation, AI jobs, approvals and data changes; the UI contract must display those outcomes accurately without inventing success. Visual tokens, breakpoints, motion timing and performance targets remain decisions for human product/design approval in that Draft.

Accessibility and performance references for the Draft are [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [W3C navigation guidance](https://www.w3.org/WAI/tutorials/menus/structure/) and [web.dev Core Web Vitals](https://web.dev/articles/vitals). These references guide proposed, testable requirements; no conformance or measured performance is claimed.

## Approved F06 implementation sequence (2026-10-21)

Isaac authorised phase-by-phase implementation, actual independent agent/test gates, conversation/pipeline logs under logs/isaac and a local commit after each phase; no push, merge or deployment. Order: existing application/status checkpoint → manual tasks/budget → organiser booth/setup → business shared-job foundation → separate editable AI preparation drafts with explicitly confirmed selected append-only adoption. Existing human review gates stay pending rather than blocking approved downstream development.

Approved manual caps are200 tasks/lines, quantity1–1,000,000 and unit price up to SGD1,000,000,000, with exact decimal-string aggregate minor-unit totals. Assigned organisers publish/change/clear accepted businesses' plain-text booth/setup details; no reservation/exclusivity/programme effect. Business AI reuses configured SoCLaaS for explicitly confirmed invented dev/test data only, excludes identity/contact/decisions, and stays disabled in production. Limits:10 jobs/owner/UTCday,1 active,30 dispatches/minute,60s provider,180s job and30-day terminal retention. Model estimates are not supplier quotations; adoption never silently replaces manual records. Capability specs own the detailed versioned interfaces and evidence.

## Approved Business request amendment (2026-10-21)

Isaac approved access/shared UI r4, submit r4 and bounded decision r2 before edits. Businesses browse named open events and submit one frozen application as the participation request; organisers open/close applications and decide submitted requests without exchanging business IDs. Settings default closed; closure blocks new drafts/submission while preserving editable own drafts and reviewable submissions. Rejection reason is required (1-1000 trimmed characters), acceptance reason optional (maximum1000). Legacy grants remain history only. No automatic date cutoff, resubmission, reconsideration or booth/setup assignment is included. RD01-RD07 remain authoritative. See [current evidence](../workflow/agents/runs/2026-10-21-open-participation-requests.md); implementation and required human verification remain separately tracked.

### F06 Phase 5 continuation (2026-10-22)

Isaac requested completion of the in-progress approved AI preparation capability without subagents and with all files staged, no commit. This supersedes the earlier local-commit instruction for this session. Existing specification revision3 and reviewed preimplementation baseline77cbabb are reused. Actual SoCLaaS generation/edit/selected append/API restart is evidenced using invented records and process-local opt-in only; independent implementation review and human/browser/accessibility/deployment gates remain outstanding in the Phase5 run. No production AI enablement or supplier/order/payment scope is added.

## Accepted review decisions

These decisions supersede conflicting earlier recommendations. They approve the specified behavior, not every feature or physical schema detail. Dylan, Yik Bing, and Isaac approved them on 2026-10-15; feature-specific approval records remain to be assigned.

| ID | Accepted behavior | Applies to |
| --- | --- | --- |
| RD01 | BusinessMembership is business-wide: active members access that business's workspaces across its events within their membership role. EventParticipation remains event-specific. Participation-specific staff access is deferred. Organiser membership does not grant access to business-private data. | F06/F10 |
| RD02 | Draft application content is editable; content freezes on submission. Accepted application states are draft → submitted → accepted or rejected. Editing after submission, withdrawal, resubmission and reconsideration are excluded. Decisions require the expected submitted revision and an undecided submitted state. Saved AI reports bind exact submission and immutable rubric versions. | F04/F06 |
| RD03 | Manual itinerary drafts may contain conflicts with visible warnings. Acceptance requires all hard constraints to pass. AI returns a validated feasible draft or explains infeasibility; invalid outputs cannot be displayed as valid recommendations. | F02/F03 |
| RD04 | Preserve immutable old/new facts for each committed programme change. Plans display current facts and indicate changes since planning; cancelled activities remain visible until removed or replaced. Revalidate against current programme revisions and constraints before accepting a plan. | F02/F03/F05 |
| RD05 | F05 notifies only attendees whose accepted itinerary contains the changed activity at the programme change's commit boundary. Drafts and bookmarks do not qualify. Deduplicate by recipient/change ID. Business-specific disruption views are deferred. | F05 |
| RD06 | Duplicate analysis compares permitted submitted applications in the current event only. Comparison evidence is organiser-only; applicant-facing reasons cannot expose other applications. | F04 |
| RD07 | Every role follows F10 job ownership, progress, cancellation, timeouts, quotas, outbound-data minimisation and validation-before-display requirements. Manual workflows and accepted data remain usable when AI fails. | AI features/F10 |

For RD02, submission content and its submitted revision remain frozen even when decision state changes. Rubric versions are immutable; changing criteria creates a new version. Reports show their evaluated versions and become visibly stale when the applicable rubric version changes; regeneration is required before using them as a current assessment. An organiser may still decide manually without an AI report. Repeated or concurrent decisions cannot create multiple outcomes: a stale/decided request returns a conflict and the current state without changing the first decision.

For RD03, acceptance validates current activity state, times, budget, accessibility requirements and agreed travel/break buffers on the server. Adjacent intervals do not overlap, but may violate buffers. Buffer values and unknown-accessibility confirmation semantics remain feature-specific decisions. A programme change may make a previously accepted plan need attention; it does not erase the plan or silently accept a replacement.

Programme room sharing and personal itinerary conflicts are separate rules. Multiple booths or activities may run concurrently in the same room for all product roles; this alone does not block publication or browsing. When an attendee adds a time-overlapping activity to their own itinerary, warn that an activity is already planned, whether the activities are in the same room or different rooms. The warning permits a conflicting draft; RD03 still governs acceptance. There is no one-activity-per-room restriction.

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

## Stack and task-based coordination

The confirmed stack is Python/FastAPI, TypeScript/React and the PostgreSQL planning baseline. Business participant covers exhibitors, vendors, sponsors, artists and other event-specific types; start with exhibitors/vendors in one shared workspace.

Assign bounded tasks/files, product approval, contract coordination and independent review when selecting a capability. There are no fixed workspace stewards, feature-to-person allocations or minimum number of human implementers per feature. Reviewers must not implement the change they independently review. Record actual contributions and handoffs.

Use module-owned tables, shared foundations, stable producer/consumer contracts, synthetic fixtures and coordinated migrations under the [schema plan](architecture.md). Module ownership is a technical write boundary, not ownership by a person. Independent tasks can proceed against reviewed contracts; fixtures do not prove real integration.

## Phase-priority roadmap

The [canonical catalogue](UserStoriesAndFeatures.md) owns all 31 stories, role-feature tables, scope and exclusions. Work down this single ordered list. Phases express delivery priority and dependency, not MVP/stretch categories or implementation approval. Independent tasks may run in parallel after prerequisites and contracts are ready. Remaining specification blockers still gate implementation.

| Order | Phase | Capability / story IDs | Dependencies and focus |
| --- | --- | --- | --- |
| 1 | 0 - Foundations | Process, security and delivery setup | SDD and actual multi-agent handoffs; reviewed tests before development; resolve infrastructure and separate development/production; establish early online deployment. |
| 1a | 0/1 - Shared UI foundation | Cross-role navigation and feedback Draft | Establish the shared visual and interaction contract before building role journeys; verify its observable states with each delivered journey. This is cross-cutting presentation scope, not an extra catalogue story or application approval. |
| 1b | 0/1 - Role-entry UI prototype | Three-tab entry, attendee/business registration forms and three role-home previews | Presentation-only prototype against synthetic state. It does not satisfy F10-US01, verified authentication, server authorisation, persistence or deployment and must pass its own approved-spec/protected-test gates. |
| 2 | 1 - Published programme | F10-US01 | Minimum identity/event permissions; extend business permissions before F06. |
| 3 | 1 - Published programme | F01-US01, F01-US02, F01-US03, F04-US03 | Create/publish/browse with per-item capacity/field validation; concurrent same-room activities are permitted. |
| 4 | 2 - Manual journeys | F02-US02, F02-US01 | Published facts, private preferences, overlap warnings and accepted-plan validation. |
| 5 | 2 - Manual journeys | F06-US01, F06-US03 | Business membership, frozen submission producer and independent manual preparation. |
| 6 | 2 - Manual journeys | F04-US01, F06-US02 | Submitted applications precede review; agree decision-to-participation and booth/setup contracts. |
| 7 | 3 - AI for every role | F10-US02 | Shared bounded jobs and approved provider/data boundary precede role AI workflows. |
| 8 | 3 - AI for every role | F03-US01, F03-US02 | Grounded attendee LLM workflow with validated facts and preferences. |
| 9 | 3 - AI for every role | F04-US02 | Organiser LLM analysis over frozen permitted submissions/versioned rubric. |
| 10 | 3 - AI for every role | F06-US04 | Business LLM draft, deterministic totals and manual fallback. |
| 11 | 4 - Changes and recovery | F05-US01, F05-US02, F05-US03 | Immutable changes, commit-time recipients, exact announcement approval and integrated delivery. |
| 12 | 4 - Changes and recovery | F03-US03 | F05 cancellations and F02/F03 acceptance/replanning contracts. |
| 13 | 5 - Further capabilities | F02-US03 | Refine wishlist persistence and estimates. |
| 14 | 5 - Further capabilities | F03-US04 | Explicit attended markers; no inferred attendance. |
| 15 | 5 - Further capabilities | F04-US04 | Agreed coverage/accessibility policies and evidence. |
| 16 | 5 - Further capabilities | F07-US01, F07-US02 | Approved meal/route entries, sources and fallback. |
| 17 | 5 - Further capabilities | F08-US01 | Bounded venue research; estimates are not confirmed quotes. |
| 18 | 5 - Further capabilities | F09-US01, F09-US02 | Business promotion and sourced procurement drafts. |
| 19 | 5 - Further capabilities | F10-US03 | Exact-action controls before external execution or approval demonstration. |
| 20 | 5 - Further capabilities | F08-US02, F09-US03 | Approved email execution and sandbox proposals; real commerce deferred. |

The deadline is 23 Oct 2026, 2pm SGT. Review achievable phase commitments against it without dropping mandatory gates. Optional providers do not block refinement of manual capabilities.

## Mandatory completion gates

| Requirement | Required evidence |
| --- | --- |
| At least one LLM-based AI feature for each role | Real selected-provider integration for attendee F03-US01, organiser F04-US02 and business F06-US04. Shared jobs or mock responses alone do not satisfy this. |
| SDD and Basic Multi-Agent SE | Approved scoped criteria/contracts; actual agent identities, assignments and handoffs; independent pre-implementation test design/review, protected baselines and revision-specific verification. |
| AI and development-process security | Implement and test applicable SEC rules: unauthorised access, injection, fabricated/stale output, data minimisation, limits, failure preservation and approval bypasses. Verify baseline integrity and agent boundaries; preserve independent review and record limitations. |
| Online deployment and development/production separation | Deployed journeys for all three roles; separate credentials/data, server-only production secrets, deployment/migration procedures and environment checks. F01's organiser-to-attendee deployment smoke alone does not satisfy the full gate. |

Security, process evidence and environment separation apply throughout delivery. This roadmap does not establish application, provider, persistence, security or deployment compliance. No merge or production deployment without human authorization.

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
| D02 | Repository, stack, authentication, database, deployment | F01 implementation and delivery checks | Application-owned FastAPI/PostgreSQL auth selected by requesting teammate 2026-10-19; existing backend foundation implemented/In review; deployment remains open |
| D03 | Phase commitments and role capability coverage | Delivery commitment | Three role workspaces confirmed as direction; detailed stories proposed |
| D04 | Task-time approval, bounded ownership and independent review | Approval and coordination | Task-based allocation adopted; record approval, bounded ownership and independent review for each selected capability; no standing person allocations |
| D05 | Membership model and organiser provisioning | Prevent self-assigned organiser access | Resolved for auth slice 2026-10-19: one product role, globally unique normalized username/email/business name, attendee/new-business-owner registration, trusted runtime-password organiser/event CLI with mandatory replacement, attendee sign-in required. Additional invitations/members/transfer excluded |
| D06 | Model provider, retention, consent, data minimisation | AI privacy and integration | Open before F03 |
| D07 | Maps, search, email and commerce providers and budget | External integration scope | Open before relevant extension |
| D08 | Preference semantics and measurable limits | Constraint correctness, latency, quotas and accessibility | Open before affected features |
| D09 | First organiser programme contract | F01-US01/02, F04-US03; F01-US03 read API only | Dylan approved exact revision 6 on 2026-10-20: complete drafts, six types, SGD integer cents, optional unknown accessibility, event bounds, permitted overlap, immutable publication/parent locks, safe deletion and versioned API. Dylan owns this organiser task; attendee UI remains teammate-owned. No other roadmap/allocation change. |

When a decision is made, record the choice, approver, date, reasoning, and affected feature IDs here. Do not treat a draft recommendation as approval.

## Recommendations for remaining decisions

### D01 Assignment and delivery planning

Map every mandatory rubric item to a feature and acceptance criterion before finalising phase commitments. Deliver one complete journey per role and one bounded AI workflow per role before later capabilities. Plan backwards from the confirmed deadline of 23 Oct 2026, 2pm SGT, reserving the final part of the schedule for integration, deployment, adversarial checks and demo preparation.

### D02 Repository and infrastructure

Use one shared Git repository containing backend, frontend and this SDD folder. PostgreSQL is the accepted database planning baseline. SQLAlchemy and Alembic for persistence and migrations, and Pydantic models for API/tool validation remain recommendations. Use a separate local development database per developer with common migrations and fixtures. Use local containers to keep setup repeatable. Derive frontend API types from the reviewed FastAPI OpenAPI contract.

The requesting teammate selected application-owned authentication on 2026-10-19, superseding the earlier managed-OIDC recommendation: Argon2id 8–128-character passwords, seven-day opaque cookie sessions with SHA-256 token digests, Origin validation and generated React OpenAPI types. Exact contract: [access revision 4](../specs/shared/access-authorised-workspaces.md) and [foundation architecture](architecture.md#shared-authentication-foundation-contract). Static React/container backend/managed PostgreSQL deployment remains a recommendation; vendors/paid tiers are open.

### D03 Phase commitments

Use the single roadmap and canonical catalogue. Commit achievable scoped specifications without treating draft rows as approval. Prioritise complete role journeys, grounded draft-producing AI, submission review and itinerary correctness before optional external actions. All four mandatory gates remain required.

### D04 Approval and reviews

Record a human product approver and independent reviewer for each selected task/specification. Cross-module contracts need agreement from affected contributors; shared security changes require team agreement. Assign files, migration coordination and integration checkpoints at task time. Product approval is separate from implementation, code review and verification. Co-author review cannot satisfy required independent review.

### D05 Membership and provisioning

Accepted: BusinessMembership grants business-wide access across that business's events within the assigned membership role; EventParticipation stores each event's participant type (RD01). Participation-specific staff permissions are deferred. Event organiser access stays event-scoped and does not confer business-private access.

Approved direction, extended by the requesting teammate on 2026-10-19: attendees may self-register; business registrants atomically create a new business and active initial-owner membership. Username/email are normalized and globally unique across roles; normalized business names are globally unique. Users have one product role. Additional business members, invitations and ownership transfer are outside this slice.

Organisers cannot self-register or gain authority from UI role selection. The trusted operator CLI provisions organiser identities and explicit event-scoped memberships using runtime getpass passwords requiring replacement before workspace access. No super-organiser account type or admin UI is included. This replaces the prior provider-dependent temporary-password expiry direction; no separate initial-credential expiry is promised. Recovery and future invitations remain excluded. Password change retains the current session (rotated token) and revokes other sessions.

The frontend prototype remains historical synthetic presentation evidence. Production has no default/shared organiser credential. Attendee programme browsing requires sign-in. Changing UI role grants no authority. Organisers see submitted applications only for their events, not private preparation budgets/drafts. Rate limiting, recovery and deployed environment evidence remain production prerequisites.

### D06 Model data and retention

Begin with one provider behind an adapter and one structured-output/tool workflow per role. Choose the provider using a small evaluation set for factual correctness, injection resistance, latency and cost rather than branding. Send published event data for attendee tasks, only the necessary submitted fields for organiser reviews, and the requesting business's permitted data for preparation. Do not send contact details or sensitive accessibility notes unless the task requires them and disclosure is explained.

Recommended initial policy: private AI drafts remain editable and deletable by their owner; avoid retaining full provider transcripts; retain minimal job metadata for 30 days with redaction. Confirm provider retention terms and course/privacy requirements before deployment; this is a proposed application policy, not a claim about provider storage. Use structured database retrieval initially; introduce vector retrieval only if document search needs it.

### D07 External integrations and budget

Start with published data and a curated source set. Implement in-app notifications first. For later research, select one search provider and, if necessary, one places/routes provider after checking costs and terms. Use a sandbox email adapter before live quotation requests. Keep live commerce deferred; saved purchase proposals demonstrate approval and budget controls without fulfilment complexity.

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
| 2026-10-14 | Confirmed stack; expanded business scope; established modular database and contract-first development direction. |
| 2026-10-15 | Accepted RD01-RD07 and confirmed deadline; implementation remained deferred. |
| 2026-10-17 | Consolidated stories/scopes into the canonical catalogue; adopted one phase-priority roadmap and task-based coordination; permitted concurrent same-room activities and clarified attendee warnings. |
| 2026-10-19 | Recorded requesting teammate's shared-authentication plan and current backend foundation; replaced provider/multiple-role/temporary-expiry assumptions with the bounded one-role CLI/cookie contract; RD01–RD07 unchanged. |

## 2026-10-22 Business refinement approval

Isaac requested and approved canonical contract/test amendments for duplicate account feedback, realistic event display names, regional dates everywhere, own contact defaults, separate setup Save/Publish, compact full-width checklists, overall budget limits/optional breakdowns, context-preserving Back navigation, block context selections, scroll-preserving access revalidation and professional AI wording. He selected spending limit plus optional breakdowns and development real-data intent. No subagents, commits, merge, push or deployment authorized. Root verified worker import with Python3.12 from the backend project and a configured DATABASE_URL; F06-US04 generation does not depend on F09. Minimal real-data dev opt-in/allowlisting and unverified provider retention are explicit. Shared/story/architecture/testing docs are updated with the canonical existing specs, preserving RD01-RD07 and prior evidence.

## Approved F09 Phase 2 scope (2026-10-22)

Isaac selected Tavily broad discovery, Singapore/SGD estimates with unknown unsupported costs, creator-private participation research/shortlists,24-hour evidence staleness, immutable refresh snapshots and saved-until-deleted evidence. He explicitly approved compare-suppliers revision3/shared-job revision6 after independent acceptance design/review, and instructed this continuation to stop after Phase2. The scoped local implementation includes independent behaviour/security checks and a local phase commit; no push, merge, production enabling, supplier contact, cart, order or payment is authorized. Human review and session-summary verification remain separate gates.
