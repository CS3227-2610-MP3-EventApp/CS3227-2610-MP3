# Submit business applications

| Field | Value |
| --- | --- |
| Stable capability ID | submit-business-applications |
| Covered stories | [F06-US01](../../docs/UserStoriesAndFeatures.md); criteria below |
| Specification revision / status | 4 / In review |
| Product roles / roadmap | Active business owners and assigned event organisers; [manual journeys](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Historical exact r2 backend and r3 frontend approval by Isaac on 2026-10-20/21 remains bound to those revisions and recorded below. On 2026-10-21 the user approved replacing known-ID eligibility with one application/participation request and organiser-controlled open applications. Current r4 checks are recorded below; human verification remains pending. |
| Review / run record | [Current approved amendment and evidence](../../workflow/agents/runs/2026-10-21-open-participation-requests.md); prior records remain historical; human review pending |

Sources: catalogue F06-US01; accepted RD01-RD07; [architecture](../../docs/architecture.md), [security](../../docs/security.md); access r4 / unchanged CurrentActor v1; shared UI r4; user-approved 2026-10-21 request amendment. This is the current authoritative contract. Historical evidence below does not establish r4 implementation.

## Product outcome, users and scope

An active business owner browses events with applications open, reads names/dates/timezone, creates one complete private draft per business/event, edits it, and explicitly submits a frozen application. This application is the single request for participation; no prior manual eligibility approval or known-business-ID exchange is required. An assigned organiser controls whether its event accepts new drafts and submissions, and receives only submitted applications. Drafts remain private. Closing applications preserves existing drafts, applications, decisions and history: owners may continue reading/editing their existing draft, but cannot submit until applications reopen. Submitted applications remain reviewable while closed. There is no automatic date-based closure or event-end cutoff in this scope.

Submission is pending organiser decision, never acceptance or a booth assignment. Decisions and applicant outcomes use [decision r2](decide-applications-and-show-outcomes.md); neither submission nor a legacy eligibility grant is acceptance. Excluded: speakers, directory/name-email lookup, invitations, new membership roles, deletion/withdrawal/resubmission/reconsideration, post-submit edits, booth/setup assignment, publication, AI and deployment. Production contact retention/deletion, required human/browser checks and release gates remain pending.

## Use cases and user interface

Business users select only their active businesses and see discoverable open events plus events with their own existing application. Closed own applications remain reopenable and labelled closed. Names and event dates with timezone orient the journey; UUIDs remain technical selectors, never the only visible event identity. Assigned organisers select named events returned by the scoped summary API, explicitly open/close applications, and list/open only submitted applications with applicant business names. Remove known-ID eligibility controls. Settings control accessible name is `Accepting applications`; action `Save application settings` opens `Confirm application settings`, with final action `Confirm settings` and `Cancel`. Confirmation displays the exact event and proposed open/closed value; cancel sends no write. Use complete explicit save, current saved-content review and separate confirmation before submit. Repeated pending activation sends no additional write. Status/reason/next-action feedback follows shared UI r4, with authoritative reconciliation after ambiguous writes.

## Inputs, outputs and functional contract

JSON is camelCase, UUID strings, UTC offset-aware timestamps. Reject extra fields and non-string content values without coercion. All actor/state/time/revision/frozen fields and participation IDs are server-derived. `expectedRevision` is a strict positive JSON integer, never boolean/string.

`ApplicationContent` remains exactly `{participantType,description,requestedSpace,contactName,contactEmail}`. All fields are required on create/full replacement. `participantType` is `exhibitor` or `vendor`. Trim other text at both ends, preserve internal whitespace: description 1-5000 characters, requestedSpace 1-500, contactName 1-100. Email follows access validation: trim, valid email, max254 characters, casefold output. Treat all text as plain untrusted content; requestedSpace grants no capacity/booth allocation.

`ApplicationEvent v2` is exactly `{eventId,title,timezone,startsAt,endsAt,eventRevision,applicationsOpen,settingsRevision,applicationId}`; applicationId is null before creation. Business discovery returns open events UNION events containing that business's own existing application, deduplicated. It returns no closed event without an own application, contacts, organiser-private information or unpublished programme content. Reads create no participation/application and imply no publication.

`OrganiserEventSummary v1` is exactly `{eventId,title,timezone,startsAt,endsAt,eventRevision,applicationsOpen,settingsRevision}` for current active assigned events only. These summaries are a separate scoped API, never an extension to CurrentActor v1. `ApplicationSettings v1` is exactly `{eventId,applicationsOpen,revision}`; absent settings read as false/revision1. Only Submissions owns settings. `eventRevision` remains the Programme metadata revision; `settingsRevision` is the settings revision. CAS settings updates against the current settings revision, serialize concurrent first upserts, increment by one on an actual boolean change, and return unchanged revision for same-value update at the current revision. No settings read creates a row. Legacy/upgraded and newly provisioned events default closed.

`BusinessApplication v2` is exactly `{id,businessId,businessName,eventId,eventTitle,participationId,status,revision,content,frozenSubmittedContentRevision,submittedAt,decision}`. The name fields are current authorized Business/Programme names; content is ApplicationContent. status is `draft`, `submitted`, `accepted` or `rejected`. decision is null before decision, otherwise [Decision v1](decide-applications-and-show-outcomes.md). Create revision1 with null frozenSubmittedContentRevision/submittedAt/decision. Every successful full replacement increments revision even for identical content. Submit at draft revision n atomically freezes content and frozenSubmittedContentRevision n, sets record revision n+1, submittedAt and status submitted. Decision may later advance record revision/status, never frozen content/revision/time. Organisers see names only for actual permitted submitted applications, never a business directory.

All routes prefix `/api/v1`. Lists are direct arrays, ordered by eventId then id UUID string where applicable. No pagination in bounded local scope.

| Method / path | Input / authorization | Success |
| --- | --- | --- |
| GET `/organiser/events` | Current organiser; current assigned events only | 200 OrganiserEventSummary array |
| GET `/organiser/events/{eventId}/application-settings` | Assigned organiser | 200 ApplicationSettings |
| PUT `/organiser/events/{eventId}/application-settings` | `{expectedRevision,applicationsOpen}` strict boolean; assigned organiser | 200 ApplicationSettings |
| GET `/business/application-events?businessId=UUID` | Current active owner | 200 ApplicationEvent array, open OR own existing |
| GET `/business/applications?businessId=UUID` | Current active owner | 200 own BusinessApplication array |
| POST `/business/applications` | `{businessId,eventId,...ApplicationContent}`; current owner and applications open | 201 atomic first participation/complete draft |
| GET `/business/applications/{applicationId}` | Current active owner of resolved business | 200 BusinessApplication |
| PUT `/business/applications/{applicationId}` | `{expectedRevision,...ApplicationContent}`; owner, draft only, open not required | 200 replacement BusinessApplication |
| POST `/business/applications/{applicationId}/submit` | `{expectedRevision}`; owner, draft only, applications open | 200 frozen BusinessApplication |
| GET `/organiser/events/{eventId}/applications` | Assigned organiser | 200 all non-draft BusinessApplication array |
| GET `/organiser/events/{eventId}/applications/{applicationId}` | Assigned organiser; matching event; non-draft | 200 BusinessApplication |
| GET / POST `/organiser/events/{eventId}/business-approvals` | Retired; normal organiser scope check, POST Origin check first | 410 `eligibility_retired`; no grant/read/write/replay |

The submitted projection remains the frozen SubmissionReview producer; future consumers bind frozenSubmittedContentRevision, not mutable record revision. Necessary submitted contacts are visible only to current owner and assigned reviewers. No draft history, budgets or AI/competitor evidence appears.

Errors use auth RFC9457 problem shape. Domain validation adds sorted/deduplicated `fieldErrors:[{field,code:"invalid"}]`; field is a fixed accepted input field or `request`, never a caller-invented name/value. The UI maps known codes to fixed safe text and permitted next actions; arbitrary server detail is not displayed.

| Status / code | Exact detail / meaning |
| --- | --- |
| 401 `unauthenticated` | `Authentication required.` |
| 403 `forbidden` | `Access is not permitted.`; role/current membership/event scope/Origin denial |
| 403 `password_change_required` | `Password change required.` |
| 404 `not_found` | `Resource not found.`; absent business/event/application after permitted scope checks; organiser draft/wrong-event detail |
| 405 `method_not_allowed` | `Method not allowed.` |
| 409 `application_exists` | `Application already exists.` |
| 409 `revision_conflict` | `Application revision changed.` |
| 409 `event_revision_conflict` | `Event settings changed.`; stale settings revision |
| 409 `applications_closed` | `Applications are closed for this event.`; submit of an own existing draft only |
| 409 `application_submitted` | `Application has already been submitted.`; any edit/submit after submission or decision |
| 410 `eligibility_retired` | `Business eligibility approvals are no longer used.` |
| 422 `validation_error` | `Request validation failed.`; safe fieldErrors |
| 500 `internal_error` / 503 `service_unavailable` | `Request could not be completed.` |

Authorize before revealing target state or conflicts. A valid business actor gets identical404 for absent and foreign application/business IDs; wrong role/no active owner gets403 before lookup. Organiser routes first check assignment then404 for absent/wrong-event/draft applications. Submitted/decided edit or submit returns application_submitted before stale/closed feedback. A stale draft revision returns revision_conflict before closure; create duplicate returns application_exists before closure, only within authorized scope. New create targeting a closed event with no own application returns the same404 not_found body as an absent event: it must not reveal unlisted closed-event existence. This also applies when a previously discovered open event closes before create; offer refresh of open events. Discovery labels existing own closed applications as unavailable for new submission rather than available events. Unsupported deletion/withdrawal has no mutation route and returns404/405. All domain responses, including summaries/errors/unsupported methods, use `Cache-Control: no-store`.

## Constraints, security and non-functional requirements

RD01/RD02 and SEC01/02/03/08/11/12/13 apply. Reuse auth cookie/Origin/CORS semantics and recheck current stored role, mandatory-change flag and membership on every request. Every mutation, including settings and retired POST, requires trusted exact Origin before state access/change. No client context grants authority. Existing owner draft reads/edits do not depend on event openness or legacy grants. Unrelated businesses cannot use the discovery route to read another business's scope. An authorized owner may receive minimal public event identity only through permitted discovery/application context.

Serialize open checks in create/submit with settings changes in one transaction: a close that wins first prevents the new create/submit; a create/submit that wins first remains valid and is preserved by later closure. Concurrent create yields one participation/application; CAS edit/edit, edit/submit and submit/submit yield one winner, preserving frozen content. Participation type follows draft edits atomically, its revision changes only on type change, and freezes at submit. Participation remains preparation context. Acceptance uses the separate decision contract, with no booth/publication or preparation-table write.

Success audit and domain writes commit atomically. Actions `application_create`, `application_edit`, `application_submit`, `application_settings_update` record actor, authorized resource, resulting revision, outcome and server time. Settings audit resource is the eventId and its resulting settings revision; no new public settings ID is required. Same-value settings replay has no second success audit. Required audit/domain failure rolls back all changes. Denied/failed authenticated mutation may append minimal outcome after rollback; malformed/Origin-denied requests perform no domain/audit writes. Failure-audit failure emits only a generic warning. No contacts/content/email/session material/request values in errors/log/audits. Existing legacy approval records and audits are immutable historical data; grants confer neither eligibility nor acceptance now.

## Acceptance criteria and story traceability

| ID | Observable criterion | Trace | Verification |
| --- | --- | --- | --- |
| submit-business-applications-AC01 | Current owner creates one complete private draft/participation atomically only while open, with no eligibility grant; normalized saved fields/revision survive fresh connections/restart. | F06-US01; RD01; SEC01/02 | Open/closed, no grant, migration/persistence and rollback |
| submit-business-applications-AC02 | Current saved-revision submit while open freezes exact content/revision/time; close/edit/submit races cannot replace a frozen snapshot. | F06-US01; RD02; SEC13 | CAS/state/open races |
| submit-business-applications-AC03 | Unauthenticated, wrong-role, inactive/unrelated owners and other-event organisers cannot read/write; drafts stay absent to organisers and denial preserves domain state. | F06-US01; SEC01/02 | Direct list/detail/write matrix |
| submit-business-applications-AC04 | Post-submit edit/repeated submit/delete/withdrawal fail preserving frozen content/revision/time; submission creates no acceptance/booth/publication. | F06-US01; RD02; SEC13 | Before/after adverse actions |
| submit-business-applications-AC05 | Invalid/extra/missing/type/boundary data and stale revisions return safe errors with unchanged state; one CAS edit wins. | F06-US01; SEC02/08/13 | Bounds, strict integer/bool and conflicts |
| submit-business-applications-AC06 | Retired r4: known-ID eligibility and approved-event-only discovery replaced by AC18-19; historical r2/r3 evidence remains below. | F06-US01 | No active eligibility prerequisite |
| submit-business-applications-AC07 | Concurrent create and forced domain/audit failure leave no orphan or partial application/participation/frozen state; successes have atomic revision-bearing minimal audits. | F06-US01; SEC08/11/13 | Real failures, counts and audit rollback |
| submit-business-applications-AC08 | Origin/no-store/current authorization apply to every route; additive upgrade preserves auth/application/legacy data and new records survive restart. | F06-US01; SEC01/02/08/12 | Fresh/upgrade/restart and headers |
| submit-business-applications-AC09 | Business selector contains active own memberships; named/dated/timezoned event discovery shows open events and own existing closed applications, no other closed events; create/reopen never offers a second application. | F06-US01; SEC01/02 | Business/event UI and API matrix |
| submit-business-applications-AC10 | Authoritative GET populates an own draft; full replacement uses loaded revision even while closed; conflicts preserve input and offer explicit refresh. | F06-US01; RD02; SEC13 | Closed edit and second-session stale save |
| submit-business-applications-AC11 | Review displays saved content/revision; separate confirm submits that revision only while open; cancel writes nothing and authoritative success alone shows frozen awaiting-decision state. | F06-US01; RD02; SEC06/13 | Review/cancel/confirm/close race |
| submit-business-applications-AC12 | Retired r4: organiser known-ID grant UI replaced by AC19 named-event controls and submitted review; no legacy eligibility UI remains. | F06-US01 | Replacement scope below |
| submit-business-applications-AC13 | Direct/history/refresh/focus/context changes revalidate identity; conceal private data while revalidating, purge on confirmed scope/access loss, and ignore departed-context responses. | F06-US01; SEC01/02; shared UI AC08 | Revocation, actor change and A -> B -> A races |
| submit-business-applications-AC14 | Async categories include safe specific reason and next action under shared UI r4; ambiguous writes reconcile list/detail/settings GET before supported retry, never blind replay or assume success. | F06-US01; SEC02/08/10/13 | Lost responses after commit and static error mapping |
| submit-business-applications-AC15 | Unsaved input is exact-scope memory-only, preserved through same-scope navigation/failure with warnings and concealed revalidation; reload restores saved server data only; confirmed loss purges it. | F06-US01; SEC01/02/08 | Navigation/reload/storage/late responses |
| submit-business-applications-AC16 | Pages meet approved shared UI r4 keyboard/Chrome+NVDA, WCAG2.2AA,320 CSSpx/400% zoom, reduced-motion and200ms/10s presentation feedback criteria. | F06-US01; shared UI AC01-08/11-12 | Required browser/accessibility checks, no conformance inferred from unit tests |
| submit-business-applications-AC17 | Business Applications and organiser Application Reviews cards reach live guarded journeys; each home truthfully shows one live feature and two previews. | F06-US01; F10-US01 | Cards/direct entry/current membership |
| submit-business-applications-AC18 | Assigned organiser settings default closed; strict boolean/CAS updates persist independently from event metadata; business create/submit require open, existing own draft read/edit and submitted review work closed; old grants neither gate nor accept and retired routes return410 without changes. | F06-US01; RD01/02; SEC01/11/13 | Two organisers, settings races, virtual default/upgrade, grants preserved |
| submit-business-applications-AC19 | Scoped organiser summary lists only active assigned named events; settings UI exposes clear open/closed state and explicit confirmed update with conflict/recovery. Submitted list/detail identifies applicant business name but never exposes drafts, other-event records or directory lookup. | F06-US01; SEC01/02 | Names/summary minimization, closed review, context/error/privacy |

## External interfaces and dependencies

CurrentActor v1 is unchanged; OpenAPI and generated UI types expose new versioned summaries/settings and BusinessApplication v2. BusinessApplication v1 is superseded, not silently mixed. Decision r2 owns decision writes/projection; this capability owns submission/settings and the frozen review producer. Consumers must use authorized interfaces rather than arbitrary writes to other modules' tables.

Submissions owns additive `application_settings` (event FK, strict nonnull boolean defaultfalse, positive revision; unique event), existing submissions and historical immutable `application_approvals`. Additive migration preserves every prior draft, frozen submitted snapshot, submission/participation IDs and revision/time, all auth and audit data, and legacy grants. No backfilled approval or decision is inferred; all events without settings remain closed. Existing applications remain usable under the new rules. Unique business/event participation and submission/participation constraints remain. Business preparation owns participation; Audit owns resource_revision and success records; Programme owns event metadata and Identity owns business names. Settings never update Programme revision. Fresh/upgrade and real restart recovery checks are required; destructive downgrade or rewriting applied migrations is excluded.

## Decisions and approval

D01 original field/lifecycle/privacy approval remains. D02 prior eligibility-only approval is superseded by the explicit2026-10-21 open-application/single-request approval; old policy is historical only. D03 historical backend/frontend delivery approvals remain tied to r2/r3. D04 routine CAS/atomic ownership/wire details above complete the approved change; exact review and readiness belong in the orchestrator run. No event-end policy, booth/setup implementation or new membership policy is introduced. Human accessibility, teammate review, summary correctness and production release checks remain pending.

## Current verification and evidence (revision 4)

Current evidence (2026-10-21): implementation fingerprint `a9b755d3120f94b9bf85278d7753eec7ff2fa9944ca9531ade46a5c5bc4508e6`, protected baseline `6a9f01c15796509ec11db968090139149c6688c6` (22 paths). Backend195 tests passed; frontend173 tests and production build passed, with an independent full173-test rerun. Both independent final reviews approved the same snapshot. Real Chrome/UI/API/PostgreSQL normal journeys, restarts, keyboard and targeted Unicode/input-recovery checks passed with revision attribution. See [the current run](../../workflow/agents/runs/2026-10-21-open-participation-requests.md) and [session summary](../../logs/isaac/2026-10-21-open-participation-requests.md). Human teammate/summary verification, Chrome+NVDA, actual400% browser zoom and comprehensive accessibility sign-off remain pending. This is In review, not Verified/Completed or deployed.

## Historical verification and evidence (revision 2)

The approved backend-only r2 is implemented and independently reviewed. Historical backend protected baseline: `dbc06c108ab8407ffeaae61aa72ef0e3183d22b2`, including reviewed APP-TCR-02. Final 29-file implementation fingerprint: `e0635889572ad04cf627749c89dffc2b69cd0b69a67cb9b65c3d3cc553be7dc0`. See the [actual run](../../workflow/agents/runs/2026-10-20-business-application-preparation.md) for identities, baseline changes and evidence attribution.

| Criteria | Evidence | Revision / reviewer | Status / limitation |
| --- | --- | --- | --- |
| AC01-AC08 | [Protected acceptance tests](../../backend/tests/test_business_applications.py), migration tests and [reviewed scenario plan](../../workflow/agents/runs/2026-10-20-business-applications-test-plan.md) | r2; developer 125 passed; independent behaviour verifier 125 passed; independent security review approved | Backend checks pass; no unresolved scoped reviewer finding |
| AC01/02/03/04/06/08 | Root actual HTTP approval, private draft, cross-business denial, edited-revision frozen submit, repeated-write rejection, logout replay and API/database restart persistence checks | Same final snapshot; root network evidence separately attributed | Passed with synthetic data; does not establish browser behaviour |
| Existing frontend / generated contract | 75 frontend tests and build passed; verifier independently matched saved OpenAPI and TypeScript declarations | Same final backend snapshot | Regression/contract evidence; application UI remains unimplemented |
| Future UI / APP-S14 | Separate frontend/browser/keyboard/cookie journey | Unassigned in backend slice | Deferred; shared UI r3 unapproved |
| Delivery / production / role LLM coverage | Separate project release gates | Pending human authority | Not established here |

Root owns the run and [session summary](../../logs/isaac/2026-10-20-foundation-follow-through.md). Human teammate review and summary correctness verification remain pending. Status is In review, not complete; the explicit backend-first exception does not approve frontend scope or upstream browser/human evidence. Merge/deployment require human authorization.

## Revision history

| Revision / date | Change, retired or moved criterion IDs and successor mapping | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft from F06-US01 and RD/SEC rules | Historical approval/verification pending |
| 2 / 2026-10-20 | Recorded actual defaults/approval-first correction/backend exception; completed API/CAS/ownership/audit/frozen producer contract; preserved AC01–05 and added AC06–08 | Isaac approved exact saved r2; backend implemented; independent behaviour/security review and protected checks pass; human review pending (continued 2026-10-21) |
| 3 / 2026-10-21 | Added approved frontend browser journeys AC09-17; r2 backend contracts unchanged | Exact amendment and live-card test evolution approved; human checks pending continuation authorized; frontend delivered; independent automated behaviour/security reviews pass; browser evidence below; human review pending |


| 4 / 2026-10-21 | Replaced eligibility gate with open applications/single participation request, added scoped event names/settings CAS and BusinessApplication v2; retired AC06 -> AC18 and AC12 -> AC19; retained all other IDs | User approved changed product direction; earlier exact approvals/evidence remain historical; new test baseline and verification required |

## Historical verification and evidence (revision 3, 2026-10-21)

Merge integration amendment (2026-10-21): `GET /api/v1/organiser/events` retains the applications module's assigned-event array. Programme discovery is separately paginated at `/api/v1/organiser/programme-events`. Both features remain available on the organiser home. Application validation retains safe `fieldErrors`; programme paths use their own `errors` map. The shared current database head includes both programme and application tables; historical application-only upgrade checks remain scoped to the requested migration. This amendment implements the user's request to preserve both merged features and update the specifications; it does not remove the remaining human-review gates.

The complete Business and organiser F06-US01 frontend is implemented against unchanged r2 backend contracts. The approved r3 amendment lifts only the historical frontend exclusion. Current status is In review: required human teammate, summary verification and human accessibility checks remain pending under Isaac's explicit continuation authorization; this is not a Completed/Verified or deployment claim.

Active protected baseline: `254bc0507788c0ef1c255ad2238e3894eb4e798b`, all17 paths recorded in the [reviewed frontend plan](../../workflow/agents/runs/2026-10-21-business-frontend-test-plan.md). Final44-file implementation fingerprint: `ec6ec8893f42d18f29970f8ac780da813e0fad32902b86c7c9287c1e14acd3b6`. Backend29-file fingerprint remains exactly the previously reviewed `e0635889572ad04cf627749c89dffc2b69cd0b69a67cb9b65c3d3cc553be7dc0`; prior125-test/backend review evidence is reused, not claimed rerun in this frontend session.

| Criteria | Actual evidence | Result / limit |
| --- | --- | --- |
| AC09-12, AC14, AC17 | Protected52 F06 frontend cases plus75 existing regressions; developer127/127 and independent behaviour verifier127/127 using normal commands; TypeScript/production build | Passed; independent scoped security review approved; no unresolved code finding |
| AC13/15 | Same suite including TCR03 meaningful RED then3 passing scope regressions; independent final delta review | History scope changes purge old input; unrelated membership reorder preserves still-authorized input; late responses and revoked scopes covered |
| AC09-15 integration | Root real Chrome production preview to real FastAPI/PostgreSQL: register, grant, create/edit/reload, private draft organiser404, review/cancel, keyboard confirm, frozen revision2 in record3, organiser view, API process/tree replacement and DB restart, logout/history | Passed; [browser evidence](../../workflow/agents/runs/evidence/2026-10-21-business-applications/chrome-journey.json), [320px Business](../../workflow/agents/runs/evidence/2026-10-21-business-applications/chrome-business-320.png), [320px organiser](../../workflow/agents/runs/evidence/2026-10-21-business-applications/chrome-organiser-320.png) |
| AC16 / shared UI feedback and keyboard | Root real keyboard form/confirmation, AX heading, no horizontal overflow at320px, controlled pending response on production build | Pending4ms; still-pending10018ms; terminal clears pending; no private browser storage; screenshots visually inspected |
| Remaining AC16 / release gates | Chrome+NVDA, actual400% browser zoom, reduced-motion checks, comprehensive accessibility/production visual sign-off, human teammate and summary correctness review | Pending; automated AX/layout checks do not establish WCAG conformance; no production delivery claimed |

Use the [Git Bash website/API guide](../../docs/BusinessApplicationsTesting.md) for manual review. Actual identities, defects, protected-test correction history and residual checks are in the [frontend run](../../workflow/agents/runs/2026-10-21-complete-business-applications.md) and [session log](../../logs/isaac/2026-10-21-complete-business-applications.md). No push, merge or deployment.
