# Submit business applications

| Field | Value |
| --- | --- |
| Stable capability ID | submit-business-applications |
| Covered stories | [F06-US01](../../docs/UserStoriesAndFeatures.md); criteria below |
| Specification revision / status | 2 / Ready |
| Product roles / roadmap reference | Active business owners and assigned event organisers; [manual journeys](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Isaac explicitly answered "Approve exact F06 revision 2 and proceed" on 2026-10-20 for the saved contract SHA-256 D0DBEB87534574F9E0648CC45892F378204B079772A5459B90F0F95BB13B8258; [actual answer record](../../workflow/agents/runs/2026-10-20-business-application-preparation.md). This approves the bounded backend contract and baseline/implementation work; upstream human/browser verification remains pending. |
| Review / run record | [Preparation and actual handoffs](../../workflow/agents/runs/2026-10-20-business-application-preparation.md); independent contract review passed; executable acceptance baseline remains a separate gate |

Sources: this capability r1; catalogue F06-US01; accepted RD01–RD07; current architecture/security rules; access specification r3 / CurrentActor v1; actual Isaac answers in the run. The routine wire details propose ApplicationEligibility v1, BusinessApplication v1 and the frozen producer portion of SubmissionReview v1 for coordinated review.

## Product outcome, users and scope

A business owner may apply as an exhibitor or vendor only after an organiser assigned to that event explicitly approves that known business ID to apply. Eligibility is distinct from application acceptance and booth reservation. Isaac rejected open applications. There is no global private business directory, email lookup or invitation delivery; the organiser obtains the known ID outside this capability.

The current owner discovers only its business's approved events, creates one complete application per business/event, edits its private draft and explicitly submits a frozen version. Initial participation and draft creation occur together after eligibility approval. Organisers receive only submitted applications for their currently assigned event. Drafts remain private. The business workspace remains usable while a later decision is pending.

Excluded: speaker submissions, additional member roles, eligibility revocation/deletion interfaces, partial autosave, invitations/delivery, application deletion, post-submit editing, withdrawal, resubmission, reconsideration, decisions, booth/setup assignment, programme publication, AI and frontend implementation. This capability contributes SDD/multi-agent and authorization/privacy evidence; actual per-role LLM features and online delivery remain separate release gates. Backend-first authorization does not approve shared-navigation r3 or complete upstream human/browser checks.

## Use cases and user interface

The backend supports explicit known-ID eligibility approval; approved-event discovery; complete draft creation/reopen/replacement; review of current content/revision followed by explicit submit; and assigned-event submitted list/detail. Empty discovery exposes no unapproved event metadata. Safe validation/conflict responses allow correction or an authorized fresh GET. A failed or lost response must not imply success: retrieve authoritative state before retrying. Submitted is visibly distinct from accepted/booth assigned.

Future UI must label fields, support keyboard/error/pending states, expose explicit confirmation and handle stale data. APP-S14 browser/accessibility scenarios are deferred to a separately approved frontend task; no UI delivery is claimed here.

## Inputs, outputs and functional contract

JSON uses camelCase, UUID strings and offset-aware UTC timestamps. Unknown fields and non-string content values are rejected, not coerced. The actor, status, timestamps, IDs other than accepted business/event selectors, participation ID and frozen revision/content are server-derived. Client authority fields are rejected.

`ApplicationContent` is exactly `{participantType,description,requestedSpace,contactName,contactEmail}`. All fields are required on create/replacement edit. participantType is exactly `exhibitor` or `vendor`. Other text is trimmed at both ends with internal whitespace preserved: description 1–5000 characters, requestedSpace 1–500, contactName 1–100. Contact email uses access-r3 email validation: trim, valid email, maximum 254 characters, casefolded storage/output. Text is untrusted plain text, never interpreted as markup/instructions. requestedSpace has no numeric capacity or booth-allocation meaning.

`ApplicationEligibility` is exactly `{id,eventId,businessId,approvedAt}`. One immutable grant exists per event/business; the granting actor is retained for audit. Replay returns the original unchanged grant/timestamp. Grant revision is immutable 1 for audit purposes.

`ApplicationEvent` is exactly `{eventId,title,timezone,startsAt,endsAt,eventRevision,applicationId}`. applicationId is null before creation. Only approved events for the authorized business appear; reads create no participation/application and imply no programme publication.

`BusinessApplication` is exactly `{id,businessId,eventId,participationId,status,revision,content,frozenSubmittedContentRevision,submittedAt}`. content is ApplicationContent. status is `draft` or `submitted` in this slice. Create has revision 1 and null frozenSubmittedContentRevision/submittedAt. Each successful replacement edit increments revision by one even for identical content. expectedRevision is a strict positive JSON integer, never boolean/string. Submit at draft revision n freezes exactly that content with frozenSubmittedContentRevision n, sets record revision n+1, submittedAt and submitted status atomically. Subsequent GET returns the frozen content. Future decision state/record revision may change, but frozen content/revision/time cannot. No decision endpoint is included.

All paths below have prefix `/api/v1`. Lists are direct arrays ordered by eventId then id UUID string where applicable; no pagination in this bounded local-development scope.

| Method / path | Accepted input / current authorization | Success |
| --- | --- | --- |
| POST `/organiser/events/{eventId}/business-approvals` | `{businessId}`; assigned organiser; existing business | 201 new ApplicationEligibility; 200 unchanged replay |
| GET `/organiser/events/{eventId}/business-approvals` | Assigned organiser | 200 array of ApplicationEligibility for that event; no names/contact fields |
| GET `/business/application-events?businessId=UUID` | Active owner of businessId | 200 array of approved ApplicationEvent |
| GET `/business/applications?businessId=UUID` | Active owner of businessId | 200 array of own BusinessApplication |
| POST `/business/applications` | `{businessId,eventId,participantType,description,requestedSpace,contactName,contactEmail}`; active owner plus existing eligibility | 201 BusinessApplication; atomic first participation and complete draft |
| GET `/business/applications/{applicationId}` | Active owner of resolved business plus eligibility | 200 BusinessApplication |
| PUT `/business/applications/{applicationId}` | `{expectedRevision,participantType,description,requestedSpace,contactName,contactEmail}`; same owner/eligibility, draft only | 200 replacement BusinessApplication |
| POST `/business/applications/{applicationId}/submit` | `{expectedRevision}`; same owner/eligibility, draft only | 200 frozen BusinessApplication |
| GET `/organiser/events/{eventId}/applications` | Assigned organiser | 200 array of submitted BusinessApplication, never drafts |
| GET `/organiser/events/{eventId}/applications/{applicationId}` | Assigned organiser; matching event; submitted only | 200 submitted BusinessApplication |

The organiser projection is the immutable-content producer for future review: id is the stable submission ID; eventId/businessId/participationId identify its source; frozenSubmittedContentRevision and submittedAt bind exact content. Necessary application contacts are visible only to assigned-event reviewers and the owner. No credentials, mutable draft history, budgets or competitor/AI reports appear. Future review/AI consumers must bind this frozen revision and cannot bypass this interface to read drafts.

Errors use access-r3 `application/problem+json` `{type:"about:blank",title,status,detail,instance,code}`, title HTTP reason phrase, instance path without query. Only validation errors add `fieldErrors:[{field,code:"invalid"}]`, using fixed accepted field names or `request` for malformed/unknown input, deduplicated and sorted. No submitted value, unknown input field name, database detail or stored unauthorized resource identifier is echoed; the required instance path may retain selectors supplied by the caller.

| Status / code | Exact detail / meaning |
| --- | --- |
| 401 `unauthenticated` | `Authentication required.`; existing auth-r3 sessions |
| 403 `forbidden` | `Access is not permitted.`; wrong role/current membership, event scope, absent eligibility, missing/null/untrusted Origin |
| 403 `password_change_required` | `Password change required.` |
| 404 `not_found` | `Resource not found.`; absent business/application after scope checks; organiser draft/wrong-event detail |
| 405 `method_not_allowed` | `Method not allowed.`; unsupported method on an existing domain path |
| 409 `application_exists` | `Application already exists.`; business/event already has any application |
| 409 `revision_conflict` | `Application revision changed.`; stale expectedRevision on a draft |
| 409 `application_submitted` | `Application has already been submitted.`; any edit/submit after submission including replay |
| 422 `validation_error` | `Request validation failed.`; safe fieldErrors above |
| 500 `internal_error` / 503 `service_unavailable` | `Request could not be completed.`; unexpected/internal or unavailable storage/transaction failure respectively |

Authorize before revealing state/conflicts. A valid business workspace actor gets identical 404 for foreign and absent application IDs; wrong product role or no current active owner membership gets 403 before target lookup. An actor with another active owner membership still gets 404 for a target business/application outside their active ownership; this prevents existence disclosure across multiple memberships. Organiser routes first check current event assignment, then return 404 for absent/wrong-event/draft application. Submitted edit/submit gives application_submitted before stale-revision feedback. Unsupported deletion/withdrawal has no route and gives the defined 404/405 problem without state changes. Every domain response, including errors/unsupported methods under these prefixes, uses `Cache-Control: no-store`.

## Constraints, security and non-functional requirements

RD01/RD02 and [SEC01/02/03/08/11/12/13](../../docs/security.md) apply. Reuse access-r3 / CurrentActor v1 cookie semantics and resolve current stored role, mandatory-change flag and active membership on every request. Client/cached context grants no authority. Business permission spans that business's approved events within owner role. Eligibility grants no membership, acceptance, booth or publication. Granting requires current assigned organiser authority; later organiser membership loss prevents that actor's access but does not invalidate historical grants. No grant revocation API is included.

Every business AND organiser mutation requires the explicit exact trusted Origin from access-r3 before domain changes; missing/null/untrusted Origin fails 403. Credentialed CORS stays restricted to configured origins. Lists/details enforce visibility directly. Concurrent create produces one participation/application only; losers create no duplicate/orphan. Edit/edit and edit/submit use atomic expected revision AND draft-state compare-and-set. One contender wins at a revision. Submit/submit produces one frozen snapshot and one application_submitted conflict. Rejection/failure preserves relevant domain state, first submission and prohibited side effects.

Success audit records commit atomically with grant/create/edit/submit. Actions: `application_eligibility_approve`, `application_create`, `application_edit`, `application_submit`; fields: current actor, grant/application ID, resulting resource revision, action, outcome, server time. Grant replay creates no additional success audit. Required success-audit/domain failure rolls back every change including participation and frozen snapshot. Authenticated denied/failed mutations may append separate minimal attributable outcome records after rollback, using only known authorized resource/revision. Malformed/Origin-denied calls perform no domain/audit writes. Failure-path audit failure emits only a generic warning without replacing the original error. Contacts, email, content, cookie/session material, request payloads and validation inputs never reach logs/audits/errors. Local-development contact data stays private; production retention/deletion requires separate human approval before deployment.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rule trace | Planned verification |
| --- | --- | --- | --- |
| submit-business-applications-AC01 | With current owner membership and prior eligibility, create persists one complete private draft/participation atomically; reopen/lists return normalized saved fields/revision across fresh connections and restart. | F06-US01; RD01; SEC01/02 | APP-S02/03/11/12; two businesses/events, real persistence/rollback |
| submit-business-applications-AC02 | Explicit current-revision submit freezes one exact content/revision snapshot for assigned-event organisers; concurrent submit/edit cannot replace it or create a second snapshot. | F06-US01; RD02; SEC13 | APP-S08/10; content/revision/time and race assertions |
| submit-business-applications-AC03 | Unauthenticated, wrong-role, inactive/unrelated owner and other-event organiser direct reads/writes fail; drafts stay absent to organisers; denial preserves domain state and exposes no contacts. | F06-US01; RD01; SEC01/02 | APP-S03/13; list/detail/mutation/current membership matrix |
| submit-business-applications-AC04 | Post-submit edit/repeated submit/withdrawal/deletion fail preserving frozen content/revision/time; submission creates no acceptance/booth/publication. | F06-US01; RD02; SEC13 | APP-S08/09/10; direct attempts and before/after state |
| submit-business-applications-AC05 | Invalid/missing/extra/type/boundary fields and stale revisions give safe validation/conflict feedback without changes; concurrent edits at one revision have one winner. | F06-US01; RD02; SEC02/08 | APP-S04/05/07; bounds plus one-outside, strict integer/email |
| submit-business-applications-AC06 | Only current assigned organisers grant known-business eligibility; replay is unchanged and no directory/lookup exists. Owners discover only approved own-business events; guessed unapproved IDs cannot create/read contexts; discovery creates no records. | F06-US01 entry condition; RD01; SEC01/02/11 | APP-S01/03/06; scope/replay/concurrent grants and discovery privacy |
| submit-business-applications-AC07 | Duplicate/concurrent create and forced domain/audit failure produce no partial grant/participation/draft/submission; successful mutations have attributable atomic revision-bearing audits without private content. | F06-US01; SEC08/11/13 | APP-S06/10/11/13; real transaction failure, counts/content |
| submit-business-applications-AC08 | All business/organiser mutations enforce trusted Origin, private responses/errors are no-store, revocation applies next request, and additive migrations preserve old auth contracts/data and persist new records across restart. | F06-US01; SEC01/02/08/12 | APP-S03/11/12/13; headers/Origin/revoke, fresh/upgrade/restart |

## External interfaces and dependencies

Depends on [access r3 / CurrentActor v1](../shared/access-authorised-workspaces.md) and trusted-provisioned Programme events. Produces the versioned projections above. [Architecture ownership/migration conventions](../../docs/architecture.md) remain authoritative: the capability coordinates a transaction across module-owned interfaces; it does not authorize arbitrary writes to another module's tables.

Bounded migration contract: Submissions owns new `application_approvals` (UUID id/event_id/business_id/approved_by, UTC approved_at; unique event_id/business_id) and `submissions` (UUID id/participation_id, draft content, status/revision, frozen content/revision, submitter/time). Business preparation owns new `event_participations` (UUID id/event_id/business_id, participant_type, revision; unique event_id/business_id). One submission per participation is unique; FKs reference existing identities/businesses/events; revisions positive; exhibitor/vendor/state checks enforced. Draft has null frozen fields/submitter/time; submitted has all frozen fields/submitter/time. Storage columns/JSON may vary behind these constraints. Participation type follows draft edits atomically; participation revision increases on an actual type change and type freezes at submit. Participation establishes preparation context, never acceptance.

Audit owns the coordinated additive nullable positive `audit_events.resource_revision` column; prior auth rows remain null and auth wire behavior remains unchanged. New feature successes record resulting application revision or immutable grant revision 1. Existing applied migrations, identity/business/event facts and protected baseline are not rewritten. Fresh DB and upgrade from current auth head must preserve synthetic auth data. Module interface/model registration/migration coordination is assigned in the run. Destructive downgrade is outside delivery and must not be used against retained data.

## Decisions and approval

| Decision | Direction | Owner | Blocks what? | Resolution / evidence |
| --- | --- | --- | --- | --- |
| submit-business-applications-D01 | Owner-only; one business/event; exhibitor/vendor; complete fields/bounds; private drafts/frozen explicit submit; development-private contacts | Isaac | Resolved for this backend scope | Actual defaults and exact-r2 approval on 2026-10-20; r1 pending assumptions superseded |
| submit-business-applications-D02 | Invitation OR organiser approval before application; minimal allowed organiser known-ID grant selected | Isaac; orchestrator coordinates routine path | Open applications forbidden; resolved for this scope | Isaac rejected open applications and approved exact r2; no directory/invitation delivery introduced |
| submit-business-applications-D03 | Backend-first with upstream manual/human review pending | Isaac | Bounded backend exception resolved; no frontend approval | Actual authorization in run; independent baseline/review gates remain |
| submit-business-applications-D04 | REST/error/CAS/frozen projection and coordinated atomic ownership/audit extension | Isaac; orchestrator coordinates independent review | Contract approved; protected baseline still required | Isaac approved exact r2 after saved contract and independent alignment review; agents do not approve product policy |
| submit-business-applications-D05 | Production retention/deletion and deployed abuse/resource limits | Human product/security authority | Deployment, not bounded synthetic local-development work | Separate explicit approval required before deployment |

## Verification and evidence

This handoff changes only this Draft. Actual analyst fallback/escalation and agent identities are recorded by root in the run; custom-role discovery is not claimed. Test owner supplied APP-S01–14 planning and actual approval corrections; executable acceptance tests, adequacy review and protected baseline for r2 remain pending. Existing auth baseline `d60152a1b7ad78c90b5a7b26499eb1cb6b63e151` remains protected. No implementation, test execution, persistence, provider integration or security verification is claimed here.

| Criteria | Evidence | Revision / reviewer | Status / limitation |
| --- | --- | --- | --- |
| AC01–AC08 | Planned scenarios above and run | r2; independent review pending | Not executed; implementation/baseline pending |
| Future UI / APP-S14 | Separate frontend/browser/keyboard/cookie journey | Unassigned in backend slice | Deferred; shared UI r3 unapproved |
| Delivery / production / role LLM coverage | Separate project release gates | Pending human authority | Not established here |

Root owns the [run](../../workflow/agents/runs/2026-10-20-business-application-preparation.md) and [session summary](../../logs/isaac/2026-10-20-foundation-follow-through.md), including actual handoffs and outstanding checks. Human teammate review and summary correctness verification remain pending. Ready/implementation require the separate [agent workflow](../../workflow/agents/README.md) gates; merge/deployment require human authorization.

## Revision history

| Revision / date | Change, retired or moved criterion IDs and successor mapping | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft from F06-US01 and RD/SEC rules | Historical approval/verification pending |
| 2 / 2026-10-20 | Recorded actual defaults/approval-first correction/backend exception; completed API/CAS/ownership/audit/frozen producer contract; preserved AC01–05 and added AC06–08 | Isaac approved exact saved r2; Ready recorded; executable baseline and implementation verification still required |
