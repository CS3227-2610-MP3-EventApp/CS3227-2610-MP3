# Decide applications and show outcomes

| Field | Value |
| --- | --- |
| Stable capability ID | decide-applications-and-show-outcomes |
| Covered stories | F04-US01; F06-US02 own status/reason portion; booth/setup portion explicitly deferred |
| Specification revision / status | 2 / Ready |
| Product roles / roadmap | Assigned organisers deciding frozen submitted applications; active business owners viewing own outcomes; [manual journeys](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | User approved one irreversible accepted/rejected decision, applicant-visible reason and no booth/setup assignment on2026-10-21. Exact revision/readiness metadata and pre-implementation gates owned by orchestrator; Draft not promoted by analyst. |
| Review / run record | Independent test design and scoped behaviour/security review in current orchestrator run; implementation verification pending |

Sources: catalogue F04-US01/F06-US02, accepted RD01/RD02/RD06, SEC01/02/03/08/11/13, [submit r4](submit-business-applications.md), access r4 / CurrentActor v1 and shared UI r4. The bounded approved decision outcome supersedes the wider r1 booth/setup proposal; no story completion for deferred setup is claimed.

## Product outcome, users and scope

A currently assigned organiser reviews the exact frozen submission and explicitly confirms one acceptance or rejection. The applicant business owner sees its own authoritative status, decision time and shared reason. Rejection requires a reason; acceptance may omit it. The first successful decision is irreversible in this scope. Submitted content, frozen revision and submission time never change. Open/closed application settings do not restrict review or decisions on already submitted applications.

Excluded: private draft review, speakers, AI decisions/reports, competitor evidence, withdrawal, resubmission, reconsideration, revocation, booth or setup assignment, preparation/budget writes, programme publication, messages and external actions. Acceptance is participation approval represented by the application decision; it creates no second request, booth, published programme item or invented setup details. F06-US02 booth/setup work is explicitly deferred to a future approved contract.

## Use cases and user interface

Named assigned-event selection and submitted application list/detail come from submit r4. Show business/event names, frozen content/revision/time, record revision and current pending/accepted/rejected state. For an undecided submitted record the organiser chooses Accept or Reject, sees an applicant-visible reason field and reviews the exact outcome/reason/application before explicit confirmation. Label rejection reason required and acceptance reason optional. Accessible actions are `Approve application` and `Reject application`; reason label `Decision reason`; confirmation dialog `Confirm decision` with final `Confirm approval` or `Confirm rejection` and `Cancel`. The approval action maps to wire outcome `accepted`; applicant labels are `Accepted`/`Rejected`. Cancel writes nothing. Disable repeated activation while pending. After authoritative success show immutable decision and no further decision controls; another actor's stale/decided result is a conflict with the current authorized state. Applicant status never implies a booth/setup allocation. Any reason is plain text and must not include another applicant or organiser-private review evidence.

Errors show category, fixed safe reason and supported next action under shared UI r4. Preserve permitted same-scope input on recoverable failure, conceal/purge on access loss, and ignore departed-context results. A lost decision response shows outcome not confirmed and uses authorized detail GET before a retry; if a decision exists, display it and offer no second decision.

## Inputs, outputs and functional contract

Consumes BusinessApplication v2 and produces `Decision v1`, exactly `{outcome,reason,decidedAt}`. `outcome` is `accepted` or `rejected`; decidedAt is server UTC timestamp; reason is trimmed plain string or null. Rejection requires a string trimmed length1-1000. Acceptance reason is optional/null, trim if supplied; empty normalizes null, maximum1000. Reject non-string non-null reason, invalid outcome, extra fields, booleans/string/nonpositive expectedRevision. BusinessApplication v2 decision is null for draft/submitted and nonnull for accepted/rejected, with status equal outcome. Actor/decision IDs, private notes, reports and other applicants are absent from this shared projection; attributable actor remains internal audit evidence.

All routes prefix `/api/v1` and return no-store JSON/problem responses. Existing authorized business and organiser GET/list routes return the updated BusinessApplication v2 including current decision. No additional business directory or private preparation endpoint exists.

| Method / path | Input / authorization | Success |
| --- | --- | --- |
| POST `/organiser/events/{eventId}/applications/{applicationId}/decision` | `{expectedRevision,outcome,reason?}`; current organiser assigned to matching event; submitted undecided only; trusted Origin | 200 BusinessApplication v2 |

`expectedRevision` means the current submitted application RECORD revision loaded by the organiser, not frozenSubmittedContentRevision. Example: submit draft content revision n produces submitted record revision n+1; decision expects n+1 and produces record revision n+2. The frozen content token remains n forever. This clarifies accepted RD02's expected submitted revision while distinguishing immutable content provenance from state-transition CAS.

The successful transaction compares expected record revision AND submitted/undecided state, records exactly one decision, changes status to outcome and increments record revision by one, and commits required success audit atomically. Submitted content/frozen revision/submittedAt and participation IDs/type/revision remain unchanged. Unique decision per application and state/revision CAS protect repeated and competing decisions. Open/closed state is irrelevant to this transition.

Errors use submit/auth RFC9457 shape. Only validation_error adds sorted/deduplicated fixed-field `fieldErrors:[{field,code:"invalid"}]`; permitted fields expectedRevision/outcome/reason or request, never submitted input/raw exceptions. Known code messages are static allowlisted UI text; unknown/malformed responses use a safe generic fallback.

| Status / code | Exact detail / additional safe data |
| --- | --- |
| 401 `unauthenticated` | `Authentication required.` |
| 403 `forbidden` | `Access is not permitted.`; wrong role/current event membership/Origin |
| 403 `password_change_required` | `Password change required.` |
| 404 `not_found` | `Resource not found.`; absent/wrong-event/draft application after event-scope authorization |
| 409 `revision_conflict` | `Application revision changed.`; stale expected record revision on submitted undecided record; add `currentApplication` |
| 409 `application_decided` | `Application already has a decision.`; replay/competing decision including stale token; add `currentApplication` |
| 422 `validation_error` | `Request validation failed.`; fixed safe fieldErrors |
| 500 `internal_error` / 503 `service_unavailable` | `Request could not be completed.` |

`currentApplication` is the exact same authorized BusinessApplication v2 returned by organiser detail, not an unrestricted lookup. Check identity/Origin/current event assignment before target and conflicts; return404 for absent/wrong-event/draft, identical without contacts. Once target is authorized and non-draft, decided-state conflict precedes stale-revision feedback. No currentApplication on401/403/404 or validation problems. Rejected/stale/invalid/failed operations preserve first decision, frozen content, participation and all prohibited side effects; only permitted minimal failure audits may be appended.

## Constraints, security and non-functional requirements

RD01/RD02/RD06 and SEC01/02/03/08/11/13 apply. Recheck stored role/mandatory-change/current active event membership on every decision/read. Business outcome reads use current business ownership; organiser assignment alone grants no private draft, preparation or budget access. UI hiding is not enforcement. Every decision mutation requires trusted exact Origin before domain/audit writes and credentialed CORS follows access contract. Preserve cookie/CurrentActor v1 and no-store on all outcomes.

Reason is an explicit applicant-visible message, plain text; it is not generated from organiser-only evidence and cannot attach or disclose competitor records. Untrusted application/reason text cannot change permission or actions. The model makes no decision in this manual scope. Minimal attributable success audit action `application_decide` records actor, application, resulting record revision, outcome and server time without reason/contact/content/session material. Decision row, status/revision and audit either all commit or all roll back. Malformed/Origin-denied requests perform no writes. Authenticated denied/failed requests may append only authorized minimal audit evidence after rollback; failure-audit storage failure emits generic warning and preserves original response.

## Acceptance criteria and story traceability

| ID | Observable criterion | Trace | Planned independent verification |
| --- | --- | --- | --- |
| decide-applications-and-show-outcomes-AC01 | Current assigned organiser explicitly accepts or rejects one submitted undecided application at expected submitted record revision; status, one immutable decision/time and atomic audit persist across reconnect/restart. Rejection requires1-1000 trimmed characters; acceptance optional max1000. | F04-US01/F06-US02; RD02; SEC11/13 | Both outcomes, bounds/null/empty/types, audit and real persistence |
| decide-applications-and-show-outcomes-AC02 | Current owner sees only own authoritative pending/accepted/rejected status, shared reason and time through BusinessApplication v2; setup/booth is not invented. Former r1 setup-assignment/read portion deferred to future approved contract. | F06-US02 status/reason; RD01; SEC01/02 | Owner/unrelated/inactive matrix and names/outcome view |
| decide-applications-and-show-outcomes-AC03 | Stale/competing/repeated decisions return defined409 and current authorized application, with one winning outcome/audit; frozen content/revision/time and first reason/time never change. | F04-US01; RD02; SEC11/13 | Accept/reject and same-outcome races, replay, revision distinction |
| decide-applications-and-show-outcomes-AC04 | Draft/wrong-event/absent target, wrong-role/unauthenticated/revoked organiser, invalid/extra authority fields and untrusted Origin cannot decide or expose conflicts/content; domain state unchanged. | F04-US01; RD01; SEC01/02/13 | Direct read/write matrix, field/Origin validation, before/after |
| decide-applications-and-show-outcomes-AC05 | Shared reason/outcome contains no automatic competitor/private-note/report data; names are only scoped application/event identity and plain text remains untrusted. | F06-US02; RD06; SEC02/03/08 | Projection/log redaction, synthetic injection text and cross-business reads |
| decide-applications-and-show-outcomes-AC06 | Retired r2: booth/setup update validation is out of this approved slice; no such endpoint/state change is delivered. Transaction/storage failure preservation now belongs to AC07. | F06-US02 setup portion deferred | No assignment/publication side effects |
| decide-applications-and-show-outcomes-AC07 | Forced decision/domain/audit storage failure rolls back outcome/status/revision, preserves frozen content/participation and allows a later valid decision; legacy grants never become acceptance and additive upgrades preserve all prior data. | F04-US01/F06-US02; SEC11/13 | Failure at each atomic boundary, upgrade/restart |
| decide-applications-and-show-outcomes-AC08 | Organiser confirms exact target/outcome/shared reason before mutation; cancel sends none, pending double activation sends one; stale/decided/validation/access errors show safe reason/action, lost responses reconcile GET and never blind retry. Owner sees authoritative outcome without decision controls. | F04-US01/F06-US02; shared UI r4; SEC01/02/06/10 | Accessible UI, confirmation, conflicts/lost-response/scope races |
| decide-applications-and-show-outcomes-AC09 | Review/decision still works while applications are closed; owner can revisit the existing record with names/date/timezone and sees unchanged frozen submission after outcome. | F04-US01/F06-US02; RD02; SEC13 | Close before decision, owner history and content equality |

## External interfaces and dependencies

Depends on submit r4 frozen producer and BusinessApplication v2, scoped OrganiserEventSummary v1, access r4 with unchanged CurrentActor v1 and shared UI r4. Decision and submission share the Submissions ownership boundary. Additive `application_decisions` table has UUID id, unique nonnull submission_id FK, outcome accepted/rejected, nullable plain reason with outcome-dependent bounds, deciding actor FK, decided_at, positive expected_record_revision and frozen_content_revision. A unique submission decision and coordinated application state/revision constraints enforce the one-time lifecycle. No writes to Business preparation tables or Programme metadata are authorized by this capability; decision row/application status is the acceptance projection. Physical implementation may vary behind those required constraints; test owner/developer coordinate migration names in run record.

Migration upgrades historical submitted records to decision null without changing frozen content/time/revisions; historical drafts remain private/undecided. Legacy approval grants remain immutable historical records and produce no decisions. Preserve existing applied migrations; add a new reviewed migration. Fresh/upgrade and reconnect/API+database restart checks are required. No destructive downgrade, production retention policy or deployment claim.

## Decisions and approval

D01 r1 broad decision-to-participation/booth/setup policy is superseded for this bounded slice: one application is the request, accepted/rejected application decision is the approval projection, rejection reason applicant-visible1-1000 and acceptance reason optional max1000; no second acceptance gate or assignment. User approved2026-10-21; root records exact revision/contract readiness. Booth/setup authority/fields/publication remain deferred and do not block this explicitly narrower outcome. No automatic deadline or reconsideration policy introduced. Draft skill ends at analyst draft; implementation requires independent test-design/adequacy/protected-baseline gates and orchestrator readiness record.

## Verification and evidence

Independent test design, adequacy/security reviews, protected baseline, implementation snapshot and actual integration remain pending for r2. No runtime, persistence, accessibility or deployment result is claimed. Required Chrome+NVDA/keyboard/320px/400%zoom/reduced-motion/shared feedback checks, human teammate review and summary verification remain required where applicable. This manual slice contributes SDD/security evidence, supplies no actual LLM capability and does not satisfy online-production release gates by itself.

## Revision history

| Revision / date | Change / criterion mapping | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial wider Draft for decision and booth/setup proposal, AC01-06 allocated | No product approval or implementation evidence |
| 2 / 2026-10-21 | User-approved bounded one-time decision/outcome contract; AC01-05 refined, AC02 setup portion deferred, AC06 retired; AC07 transaction preservation, AC08-09 added; booth/setup remains deferred | Exact readiness/review owned by orchestrator; independent tests and all implementation evidence pending |

Readiness record 2026-10-21: Isaac explicitly approved the proposed amendment and defaults before edits. Root aligned saved wire contracts with the independent test owner and behaviour/security scope reviews. Product/contract is Ready for protected-test design and review; executable baseline and implementation evidence remain separately pending. No human runtime/accessibility review is inferred.
