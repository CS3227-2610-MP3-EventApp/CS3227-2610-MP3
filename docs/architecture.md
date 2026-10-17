# EventApp architecture and shared contracts

Status: Design draft for review. No models, migrations or application code implemented.
Updated: 2026-10-17. Accepted behavior decisions: [RD01–RD07 in project context](project.md#accepted-review-decisions). Physical schema details remain a design draft.

Accepted direction: establish a small shared foundation, keep feature data in modules with clear ownership, and develop against stable contracts and synthetic fixtures. The logical schema below is a proposed design; bounded implementation tasks are assigned when a scoped capability is ready. PostgreSQL is the agreed planning baseline; hosting, identity provider and exact physical schema remain to be settled before implementation.

## Module boundaries and ownership

Use one database and one FastAPI application. A module is a code and data ownership boundary; it does not require a separate service or PostgreSQL schema. Other modules can reference stable IDs and use reviewed read interfaces, but do not write another module's tables directly.

| Module | Tables it owns | Responsibility | Consumers |
| --- | --- | --- | --- |
| Identity | users, event_memberships, business_memberships | Verified identity and membership access | All modules |
| Programme | events, venues, rooms, programme_items, programme_changes | Authoritative event and programme facts | Attendee planning, submissions, business preparation, AI |
| Business preparation | businesses, event_participations, preparation_tasks, budgets, budget_lines | Private business and event-preparation records | Identity, submissions, AI |
| Attendee planning | attendee_preferences, bookmarks, itineraries, itinerary_revisions, itinerary_items | Private preferences and versioned attendee plans | AI and notifications |
| Submissions | submissions, rubric_versions, submission_decisions | Frozen applications, rubrics and decisions | Business status view, organiser analysis |
| Notifications | announcements, notifications | Announcements and fixed-recipient delivery | All role workspaces |
| AI and actions | ai_jobs, ai_artifacts, source_references, action_proposals, action_approvals, action_executions | Bounded jobs, validated artifacts and approved actions | AI workflows in all roles |
| Audit | audit_events | Attributable protected action records | Protected audit views |

Assign implementation, contract coordination and independent review per task; module ownership remains stable when contributors change. Membership policy is shared even when its references point to business-owned or programme-owned records.

## Minimum shared foundation

Agree on these fields and semantics first. IDs are proposed UUIDs; timestamps are timezone-aware instants; events declare an IANA timezone. Mutable records use a monotonically increasing revision for stale-write detection. A foreign key is an integrity constraint, not an authorisation check.

| Entity | Minimum proposed fields | Integrity and visibility |
| --- | --- | --- |
| User | id, identity_issuer, identity_subject, display_name, created_at | Unique issuer/subject pair; do not use email as a primary key or accept client-supplied roles |
| Event | id, title, event_type, timezone, starts_at, ends_at, visibility, revision | End after start; public readers see only published event information |
| EventMembership | id, user_id, event_id, role, status | Unique user/event/role; privileges require active membership and authorised provisioning |
| Business | id, name, revision, created_at | Private business workspace; initial membership created atomically with business |
| BusinessMembership | id, business_id, user_id, membership_role, status | Unique business/user; active membership grants business-wide access across its event workspaces within the assigned role (RD01) |
| EventParticipation | id, event_id, business_id, participant_type, revision | Unique event/business in the initial scope; establishes preparation context, not accepted status |

Do not introduce a reverse dependency in Event or User on itineraries, budgets or AI artifacts. Domain consumers keep their own user_id, event_id and business_id references.

Accepted access scope: business membership is business-wide, with event-specific participation; participation-specific staff access is deferred (RD01). Exact member roles/invitation policy, multiple event roles per user, public programme browsing, organiser invitations and business applications as the initial submission scope remain to review. Do not reopen accepted scope merely because physical fields are still draft.

## Feature schemas

These fields define logical scope. Nullability, database types, indexes, API names and detailed state transitions are finalised in the owning scoped capability specification. Story IDs and end-user feature mapping live in [the canonical catalogue](UserStoriesAndFeatures.md); delivery order lives in [the project roadmap](project.md).

| Entity | Proposed fields and references | Feature |
| --- | --- | --- |
| Venue | id, event_id, name, address, accessibility_details, revision | F01 |
| Room | id, event_id, venue_id, name, max_capacity, accessibility_details, revision | F01 |
| ProgrammeItem | id, event_id, room_id, title, type, starts_at, ends_at, capacity, price_minor_units, currency, accessibility_details, state, revision | F01 |
| AttendeePreferences | id, user_id, event_id, interests, budget_minor_units, currency, hard_constraints, soft_preferences, revision | F02 |
| Bookmark | id, user_id, event_id, programme_item_id, created_at | F02 |
| Itinerary | id, user_id, event_id, accepted_revision_id, revision | F02/F03 |
| ItineraryRevision | id, itinerary_id, version, state, created_by_user_id, created_at | F02/F03 |
| ItineraryItem | id, itinerary_revision_id, programme_item_id, observed_programme_revision, position | F02/F03 |
| Submission | id, participation_id, submitted_by_user_id, content, state, revision, submitted_content_revision, submitted_at | F06/F04; content and its submitted revision freeze on submission |
| RubricVersion | id, event_id, version, criteria, created_at | F04 |
| SubmissionDecision | id, submission_id, observed_submission_revision, decided_by_user_id, outcome, reason, created_at | F04 |
| PreparationTask | id, participation_id, title, status, due_at, revision | F06 |
| Budget | id, participation_id, title, currency, spending_ceiling_minor_units, state, revision | F06 |
| BudgetLine | id, budget_id, description, quantity, unit_price_minor_units, price_basis, source_reference_id_if_available | F06/F09 |
| ProgrammeChange | id, programme_item_id, from_revision, to_revision, old_facts, new_facts, change_type, changed_by_user_id, created_at | F05; committed old/new facts are immutable |
| Announcement | id, event_id, programme_change_id_if_relevant, body, state, revision, published_at | F05 |
| Notification | id, recipient_user_id, programme_change_id, observed_accepted_itinerary_revision_id, message, delivery_state, read_at, created_at | F05; recipient fixed at the change commit boundary |
| AIJob | id, requested_by_user_id, event_id_if_relevant, business_id_if_relevant, workflow_type, state, limits, created_at, completed_at | F03/F04/F06/F10 |
| AIArtifact | id, job_id, kind, schema_version, validated_payload, revision, created_at | AI features |
| SourceReference | id, artifact_id, source_type, resource_id_or_url, resource_revision_if_internal, retrieved_at | AI features |
| ActionProposal | id, job_id, proposed_by_user_id, action_type, payload, payload_digest, resource_revisions, expires_at, state | F08/F09/F10 |
| ActionApproval | id, proposal_id, approved_by_user_id, approved_payload_digest, approved_at, expires_at | F08/F09/F10 |
| ActionExecution | id, proposal_id, approval_id, idempotency_key, provider_reference, state, attempted_at, completed_at | F08/F09/F10 |
| AuditEvent | id, actor_user_id, action, resource_type, resource_id, resource_revision, outcome, occurred_at | Shared |

Initially, ItineraryItem references an event activity. Dining and travel later introduce typed itinerary entries after a contract review; avoid speculative nullable fields now. Speaker submissions need a separate submitter model before expansion beyond business applications. Assigned booths and setup instructions need an explicit participation-assignment contract in F06 before implementation.

The source reference on BudgetLine is optional and added only when AI/research is integrated. Manual preparation must work without AI tables or providers. Define budget acceptance/versioning before implementing AI replacement of accepted preparation records. Domain entities remain authoritative; generic AIArtifact payloads hold drafts and evidence, not the sole record of accepted itineraries or budgets.

## Required relationship rules

- Programme items, rooms and venues belong to the same event. Enforce this with reviewed database constraints where possible and server validation; trusting separate IDs is insufficient.
- Concurrent programme items or booths may share a room; overlap alone does not block publication. Validate positive item duration and each item's capacity against its room capacity. Room capacity is a limit, not available inventory or a reservation guarantee.
- A bookmark's programme item belongs to its event. Itinerary items belong to the itinerary's event; only the owning attendee can modify their plan.
- Use composite uniqueness for bookmark user/item and itinerary revision itinerary/version. An accepted revision must belong to its itinerary. Resolve the parent/revision reference ordering in the F02 migration design.
- Business membership authorises the business's workspaces across all its events; unrelated businesses, inactive members and event organisers without business membership cannot access private preparation data. Apply this scope to list/detail/write and AI-context retrieval.
- Submission visibility follows stored participation and membership. Organisers see submitted applications for their event, never private drafts or preparation budgets. Draft content is editable; submitted content and submitted_content_revision are frozen. Initial transitions: draft → submitted → accepted or rejected; post-submit editing, withdrawal, resubmission and reconsideration are excluded (RD02).
- A decision requires the expected submitted content revision and current submitted/undecided state. Concurrent or repeated decisions cannot produce another outcome; conflicting requests return the current state without a write. The stored outcome/reason, state transition and audit record are atomic.
- Rubric versions are immutable. Review artifacts bind submission ID/submitted_content_revision and rubric ID/version. A newer applicable rubric makes the report visibly stale; regenerate before presenting it as a current assessment. Manual decisions do not require AI reports.
- Duplicate comparisons are limited to permitted submitted records in the same event. Comparison evidence stays organiser-only; applicant-facing reasons cannot expose other submissions (RD06).
- Accepting a submission does not publish a programme item. If acceptance establishes participation status, update it through the business module's command in the same transaction; define this contract before F04/F06 integration.
- Prices use integer minor units for supported currencies; Initial currency choice remains open. Validate quantity and price bounds and calculate totals deterministically.
- Conflicting manual itinerary drafts can be stored with warnings; acceptance requires current facts and all hard constraints to pass. Accepted versions are retained, and a later change can flag them as needing attention without silently accepting a replacement (RD03/RD04).
- Published programme records referenced by plans are cancelled or retired rather than cascade-deleted. ProgrammeChange preserves immutable old/new facts, not just counters. Plan reads show current facts with change indicators; cancelled items remain visible until removed/replaced. Privacy deletion and retention policies are designed separately.
- Notifications deduplicate by recipient/change. Select users whose accepted itinerary contains the item consistently at programme change commit, and persist the recipient set with pending delivery in the same transaction. Plan-acceptance and change transactions need reviewed locking/isolation so races have a consistent result. Drafts/bookmarks do not qualify. Retry against the persisted set; historical messages link to current facts (RD05).
- F05 has no business-specific disruption view in the initial scope.
- AI jobs enforce requesting-user/resource permissions, progress, cancellation, timeouts, quotas, outbound minimisation and validation before display. Invalid artifacts cannot be shown as valid results or accepted into domain records (RD07).
- Tool calls always recheck user permissions. Approval binds the exact payload and resource revisions; uncertain external outcomes require reconciliation.

## Contracts for independent development

Agree on a versioned contract example and matching fixtures before consumers begin. Names below are design labels, not implemented endpoints.

| Contract | Producer | Minimum consumer-facing behavior |
| --- | --- | --- |
| CurrentActor v1 | Identity | Verified user ID plus server-resolved event/business memberships; consistent unauthorised/forbidden responses |
| PublishedProgramme v1 | Programme | Current event/item IDs, revision, state, timestamps, room, price/currency, capacity and accessibility evidence; change/cancellation indicators against observed revision; never expose drafts |
| BusinessContext v1 | Business | Business-wide permitted membership plus event participation IDs/types and published setup information; organiser reads cannot disclose private budget data |
| SubmissionReview v1 | Submissions | Frozen submitted content/revision, immutable rubric version, decision state, stale-report indicator and revision-checked decision command; competitor evidence is organiser-only |
| ProgrammeChanged v1 | Programme | Stable change ID, item/event ID, prior/new revision, immutable old/new facts and committed timestamp; fixed accepted-plan recipient set for notification processing |
| DraftArtifact v1 | AI | Validated kind/payload, permitted sources and observed revisions; validation before display and fresh domain validation before acceptance; review report provenance includes exact submission/rubric versions |

Fixture set: two events, an organiser for each, two attendees, two businesses and active/inactive memberships; one business participates in both events. Include draft/published/cancelled activities, conflicting and valid itinerary drafts, accepted plans, bookmark-only users, immutable submitted content, multiple rubric versions and two successive programme changes. Include wrong-event and unauthorised requests. Use stable synthetic IDs and timestamps. Verification scenarios are in project.md under RD01–RD07; fixtures do not prove real integration.

## Parallel development tasks and dependencies

The [project roadmap](project.md) owns phase priority. These groups describe dependencies and safe parallel work, not a second roadmap or permission to begin implementation. Assign bounded file ownership, a product approver, contract coordination and independent reviewers for each approved task.

| Task group | Independent work after contract agreement | Dependencies and integration gate |
| --- | --- | --- |
| Shared foundation | Identity/membership, programme, planning and business contract examples; synthetic fixtures; deployment configuration | Review visibility, foundation migrations and environment separation before dependent integration |
| Published programme | F01 organiser writes and attendee reads against CurrentActor and PublishedProgramme examples | Integrate the real permission and programme producers; allow concurrent same-room activities and validate per-item capacity |
| Manual domain journeys | F02 preferences/planning and F06 checklist/budget can progress independently against fixtures | Real programme/business integration, server ownership checks and persistence are required for completion |
| Applications and decisions | F06-US01 submission producer and F04 review consumer can develop against frozen-content fixtures | Actual F06-US01 submission precedes integrated F04-US01/02 review; agree decision-to-participation and booth/setup contracts before completing F06-US02 |
| AI capabilities for all roles | F03 attendee drafts/answers, F04 organiser reports and F06 business preparation drafts | F10-US02 job controls, approved provider/data boundaries and domain validators; test the real LLM integration for each role |
| Programme changes and recovery | F05 change producer, notification consumer and announcement drafts against ProgrammeChanged examples | Real accepted-plan/change transaction and fixed recipient integration; F03-US03 replanning depends on F05 |
| Later capabilities | Dining/routes, recap, wishlist, checklists, venue and supplier research, promotional concepts | Follow roadmap order and explicit scope approval; typed itinerary extension before meals/routes; F10-US03 approval controls before external actions |

Run the shared [multi-agent process](../workflow/agents/README.md) within each task: independent test design and adequacy review precede implementation, and independent behavior/security review follows it. Record actual contributions and handoffs instead of assuming planned participation occurred. Fixtures permit parallel progress, but completion requires the delivered producer revision and real integration. Security tests and online delivery with separate development/production environments apply throughout.

## Migration and merge convention

Use separate local development databases per developer with the same reviewed migrations and synthetic fixtures. A shared development database would create avoidable data interference; production remains one database.

Each change adds its own migration file and names the affected tables and dependencies. Never modify a migration already applied to a shared environment. Reserve edits to shared model registration, API contracts and migration configuration for coordinated changes. Feature model files stay in module directories rather than one shared models file.

Before merging a migration, synchronise with the latest main branch, inspect the migration graph and resolve multiple heads in a coordinated integration change. Do not merely renumber files or edit deployed history. The combined migration path must build an empty database successfully and upgrade an existing database with synthetic data intact. Review downgrade or recovery implications for destructive changes.

Feature branches can develop consumers using contracts before the producer is finished, but completion requires real integration against the delivered producer revision. Cross-module foreign keys remain useful; they require foundation migrations to precede dependent migrations, not all features to finish sequentially.

## Review before implementation

Carry accepted RD01–RD07 into feature criteria rather than reopening them. Confirm minimum field types, remaining invitation/member-role policies, the decision-to-participation projection, currency, buffer/accessibility semantics, transaction race handling and task-local contract coordination and independent review. Then record detailed feature approval before implementation. The MP3 brief, team size, repository and checkout are confirmed; identity, deployment, provider and detailed capability scope decisions remain open where recorded in [project.md](project.md).

Checks performed on this design: local links and consistency with feature scope and shared security rules. Database behavior, API compatibility and migration safety remain unverified until implementation and real integration checks run.

## Change history

2026-10-15: Applied accepted membership, submission/report provenance, valid-plan acceptance, historical-change, recipient and AI-control decisions. No migrations or application models created.

2026-10-17: Replaced fixed personal assignments with module responsibilities and dependency-based tasks linked to the project roadmap. Recorded concurrent same-room programme activities with per-item capacity validation; retained attendee acceptance rules, contract boundaries, security controls and migration safeguards.
