# EventApp architecture and shared contracts

Status: Domain design draft; backend foundation implemented and In review. Shared-authentication foundation contract below is selected; implementation/verification pending.
Updated: 2026-10-19. Accepted behavior decisions: [RD01–RD07 in project context](project.md#accepted-review-decisions). Remaining domain schemas stay proposed.

Accepted direction: one FastAPI/PostgreSQL foundation, module-owned data and stable contracts. Application-owned authentication is selected for the authorised slice below; hosting and remaining domain schemas stay unresolved where recorded.

## Module boundaries and ownership

Use one database and one FastAPI application. A module is a code and data ownership boundary; it does not require a separate service or PostgreSQL schema. Other modules can reference stable IDs and use reviewed read interfaces, but do not write another module's tables directly.

| Module | Tables it owns | Responsibility | Consumers |
| --- | --- | --- | --- |
| Identity | users, password_credentials, sessions, event_memberships, business_memberships | Verified identity, credentials, sessions and membership access | All modules |
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
| User | id, username, email, display_name, role, created_at, updated_at | Canonical username/email independently globally UNIQUE; one attendee/organiser/business role |
| Event | id, title, timezone, starts_at, ends_at, revision | IANA timezone; end after start; publication fields added by programme capability |
| EventMembership | id, user_id, event_id, role, status | Unique user/event/role; privileges require active membership and authorised provisioning |
| Business | id, name, normalized_name, revision, created_at | normalized_name globally UNIQUE; initial registration atomic with user/credential/owner/session |
| BusinessMembership | id, business_id, user_id, membership_role, status | Unique business/user; active membership grants business-wide access across its event workspaces within the assigned role (RD01) |
| EventParticipation | id, event_id, business_id, participant_type, revision | Unique event/business in the initial scope; establishes preparation context, not accepted status |

Do not introduce a reverse dependency in Event or User on itineraries, budgets or AI artifacts. Domain consumers keep their own user_id, event_id and business_id references.

Accepted access scope: business membership is business-wide, with event-specific participation; participation-specific staff access is deferred (RD01). Registration creates the new business and active owner membership atomically with user/credential/session. It cannot select existing businesses or organiser authority. Additional memberships/invitations/transfer are excluded; users have one product role. Attendee programme browsing requires sign-in. Initial submission scope remains a separate decision.

The approved 2026-10-19 auth plan uses a trusted operator CLI for organiser/event provisioning with runtime passwords requiring replacement before workspace access. It supersedes provider selection, a stored super-organiser role and the earlier separate temporary-password expiry proposal. No public organiser registration, admin UI or default/shared password exists.

## Shared authentication foundation contract

[Access specification revision 3](../specs/shared/access-authorised-workspaces.md) owns exact normalization, HTTP/cookie/errors and CurrentActor v1. All foundation IDs are UUIDs; stored instants are timezone-aware. Physical fields supplement the tables above:

| Table | Required columns / constraints |
| --- | --- |
| password_credentials | user_id PK/FK users, password_hash (Argon2id), must_change_password boolean, updated_at |
| sessions | id PK, user_id FK, token_hash UNIQUE SHA-256 hex, created_at, last_used_at, expires_at, nullable revoked_at; last_used_at never extends absolute expiry |
| event_memberships | id PK, user_id FK, event_id FK, role organiser, status active/inactive; UNIQUE user/event/role |
| business_memberships | id PK, user_id FK, business_id FK, membership_role owner, status active/inactive; UNIQUE business/user |
| audit_events | id PK, nullable user_id FK, action, nullable UUID resource_id, outcome, occurred_at; minimal SEC11 identity, no payload/contact/secret fields |

Database checks enforce role/status values and positive event duration. Event title is trimmed 1–200 characters; events/businesses start at revision 1. Success audit entries commit with sensitive mutations. Auth audit actions are `registration`, `login`, `password_change`, `logout`; CLI may use `organiser_provision`. Credential `updated_at` records password-change time. Business/event ownership remains in the owning modules; the coordinated foundation transaction establishes shared records without duplicate stores. Use additive migrations preserving original migration history and synthetic data.

`app.auth.dependencies` exposes `get_current_actor` (safe Pydantic `CurrentActor`, mandatory-change allowed), `require_workspace(role)` (dependency factory for a product-role literal), `require_event_membership(event_id: UUID)` and `require_business_membership(business_id: UUID)` (direct FastAPI dependencies taking route path parameters). The latter three require completed password replacement and current matching role/membership. Organiser workspace requires an active event; business workspace requires an active business membership. All return CurrentActor, query current stored membership every request and use the spec's denial problems. Tests mount test-only routes using these dependencies; no placeholder domain endpoint is shipped.

OpenAPI schema names are `CurrentActor`, `AttendeeRegistration`, `BusinessRegistration`, `LoginRequest`, `PasswordChangeRequest`. React generates TypeScript from this schema. CurrentActor v1 fields are authoritative in the access spec, including username, displayName, mustChangePassword and active membership status.

Trusted CLI commands, from `backend/`:

```text
uv run python -m app.auth.bootstrap event --id UUID --title TITLE --timezone IANA --starts-at ISO_OFFSET --ends-at ISO_OFFSET
uv run python -m app.auth.bootstrap organiser --username NAME --email EMAIL --display-name NAME --event-id UUID
```

Repeat `--event-id` for multiple assignments. Required event `--id` makes replay deterministic: identical existing facts succeed unchanged; differing facts fail. Validate all events before atomic organiser creation. New organisers obtain password twice via runtime getpass and must change it; no password argument/env/default/output. Matching existing canonical username/email/organiser role/display name adds missing active memberships without resetting credentials or prompting again; existing inactive requested memberships remain inactive and replay succeeds without reactivation. Identity conflicts fail atomically. Event times require explicit offsets, valid IANA timezone and end after start. Failure exits nonzero with no credential/database disclosure. CLI access itself is the trusted administrative boundary; no bootstrap HTTP endpoint exists.

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

Carry accepted RD01–RD07 into feature criteria rather than reopening them. Confirm remaining invitation/member-role policies, the decision-to-participation projection, currency, buffer/accessibility semantics, transaction race handling and task-local coordination/review. The auth slice fixes its minimum field types and application-owned identity; deployment, AI providers and remaining domain decisions stay open in [project.md](project.md).

Checks performed on this design: local links and consistency with feature scope and shared security rules. Database behavior, API compatibility and migration safety remain unverified until implementation and real integration checks run.

## Change history

2026-10-15: Applied accepted membership, submission/report provenance, valid-plan acceptance, historical-change, recipient and AI-control decisions. No migrations or application models created.

2026-10-17: Replaced fixed personal assignments with module responsibilities and dependency-based tasks linked to the project roadmap. Recorded concurrent same-room programme activities with per-item capacity validation; retained attendee acceptance rules, contract boundaries, security controls and migration safeguards.

2026-10-18: Recorded the bounded direction for atomic new-business/initial-owner registration and controlled event-scoped organiser provisioning. Kept identity-provider, credential-delivery and broader membership details unresolved; no schema or implementation is claimed.

2026-10-19: Specified authorised application-owned auth foundation tables, CurrentActor/dependency/OpenAPI interfaces and trusted CLI idempotence; prior provider/super-organiser/temporary-expiry proposals superseded. Runtime evidence pending.
