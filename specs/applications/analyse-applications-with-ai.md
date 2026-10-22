# Analyse applications with AI

| Field | Value |
| --- | --- |
| Stable capability ID | analyse-applications-with-ai |
| Covered stories | F04-US02; [catalogue](../../docs/UserStoriesAndFeatures.md); criteria below |
| Specification revision / status | 3 / Draft |
| Product roles / roadmap reference | Authorised event organisers. [3 - AI for every role](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending: human product/contract owner; no approval recorded for revision 2 or its proposed interfaces |
| Review / run record | Pending: independent draft review and test scenarios |

## Product outcome, users and scope

An authorised organiser requests a rubric-based AI report for a frozen submitted application in an event they currently manage. The report provides criterion-level evidence, unknowns and possible same-event duplicate flags for human review. It never decides, scores an applicant's overall suitability, labels fraud or changes application state. Applicants never see reports or comparison evidence.

This capability covers F04-US02 only. It depends on F06-US01 submitted applications and the organiser slice of F10-US02. SoCLaaS is the selected provider. Live calls are limited to opted-in development/test environments with realistic but invented application fixtures; no real applicant, contact, or business data is used. Production AI remains disabled until provider retention/privacy terms and real-data approval are resolved. Dylan believes this live synthetic-data call should satisfy the course's real-provider evidence; lecturer confirmation remains pending.

## Use cases and user interface

An organiser can create and revise an event rubric and inspect its prior versions. A saved change creates a new immutable version; it does not rewrite reports already produced against an earlier version. The organiser can request analysis for a submitted, accepted or rejected application, see its job status, cancel it where work can still be stopped, and review the resulting report and source-version provenance. A report becomes visibly stale when its source submission or applicable rubric version is no longer current. Provider, validation, quota and cancellation outcomes must not be presented as a successful report.

One current rubric per event has 1–10 criteria with stable identifiers, titles and assessment instructions. Three editable starters cover event relevance, proposal clarity/completeness and distinctiveness. Saving creates a new immutable version. The concrete contract below defines field bounds and duplicate handling; criteria requiring excluded information must yield insufficient evidence.

## Inputs, outputs and functional contract

Inputs: authorised event/submission identifier, frozen submitted-content revision, an immutable rubric version, and at most a bounded set of permitted same-event submitted comparison records. The model may receive only pseudonymous source labels, participant type, description and rubric instructions. It must not receive requested-space data, contact name, contact email, business name, decisions/rejection reasons, private draft content, other-event records or unrelated account data.

Each rubric criterion receives `supported`, `concern` or `insufficient_evidence`, an explanation and evidence references defined by the concrete contract below. Duplicate flags are review prompts, not findings of misconduct. Reports record exact application/rubric/comparison revisions and coverage limits. No overall approval score is produced.

The selected provider interface is SoCLaaS's OpenAI-compatible HTTPS `/v1/chat/completions` endpoint. The API key remains in backend/worker runtime configuration and never enters the frontend, logs or repository. Model ID and structured-output capability must be explicitly checked against the team's accessible model list; application-side schema and evidence validation remains required even if a provider claims structured output. Do not assume tool-calling or native JSON-schema support. A narrow provider adapter sends one bounded analysis request and exposes no application tools, database access, browser, shell or decision operation to the model. The selected accessible model and probe result remain unrecorded until local setup.

Organiser endpoints are `GET/PUT /api/v1/organiser/events/{eventId}/analysis-rubric`, `POST /api/v1/organiser/events/{eventId}/applications/{applicationId}/analyses`, and `GET /api/v1/organiser/events/{eventId}/applications/{applicationId}/analyses`. Analysis creation returns an asynchronous job reference under F10-US02; exact fields, pagination, conflicts and idempotency are defined below.

## Constraints, security and non-functional requirements

### Implementation contract selected from the authorised plan

Dylan authorised implementation of the plan on 2026-10-21 and confirmed that all same-event submitted decision statuses are eligible comparison sources. The following routine contract choices make that authorised work testable; this records implementation authority, not a separate human review of this document.

- Rubric `GET` returns `{eventId, revision, criteria}`; before first save, revision is 0 with editable starters. Optional `revision` reads an immutable saved version. `PUT` accepts `{expectedRevision, criteria}`. Criteria number 1–10, have unique `id` matching `[a-z][a-z0-9-]{0,39}`, trimmed `title` (1–100 characters), and trimmed `instructions` (1–1000 characters). Stale writes return 409. Saving is explicit; a read creates no version.
- Analysis targets may be submitted, accepted or rejected, always binding the frozen submitted revision; decisions remain unchanged. Creation accepts `{requestId: UUID, expectedRubricRevision: integer >= 1, expectedSubmittedRevision: integer >= 1, syntheticDataConfirmed: true}` and returns 202 with the owned job. A stale rubric/source returns 409. Draft/mismatched/missing targets return 404 after event authorisation.
- Request IDs are unique per owner for the job's 30-day retention. Replaying the identical event/application/rubric/source tuple returns the same job without quota debit; reusing a request ID for a different tuple returns 409. Accepted jobs count once on their creation UTC day, including later failure/cancellation; retries and idempotent replay consume no extra application quota. There are no refunds.
- Report payload is `{findings, duplicateFlags}`. Each finding has `criterionId`, `status` (`supported`, `concern`, `insufficient_evidence`), `explanation` (1–2000 characters), and `evidence` (0–10 references). Exactly one finding per saved criterion is required. Supported/concern findings require evidence. A reference is `{sourceLabel, field, quote}` where `field` is `participantType` or `description` and `quote` is 1–500 characters occurring verbatim in that exact frozen source field. Unknown fields/labels, additional schema properties, missing/duplicate criteria and nonmatching evidence fail validation. `duplicateFlags` has at most five entries with a comparison `sourceLabel`, explanation and evidence; target-only or unknown comparison labels are invalid. The validator establishes structural/source grounding, not semantic truth; organisers judge the interpretation.
- Source labels are `target`, `comparison-1` through `comparison-5`. Selection uses Unicode NFKC, lowercase, Unicode letter/digit token sets, Jaccard intersection/union >= 0.50 (empty sets score zero); ties use lowercase canonical UUID strings ascending. This configurable-in-code initial heuristic is disclosed as text overlap, with no assertion of semantic equivalence. Only the selected bounded sources enter the model context.
- A report is `{id, createdAt, sourceRevision, rubricRevision, comparisonRevisions, stale, payload}`. Each comparison reference is `{applicationId, sourceRevision, sourceLabel, similarity}`. Report history returns `{items, total, limit, offset}`, newest first by creation time then report UUID, default limit 20, maximum 100. Reports bind source/rubric/comparison revisions and expose `stale` when current rubric differs. Submitted source content is currently immutable; source-change staleness is defensive future compatibility, not a delivered edit/resubmission flow.
- Validation does not infer all contradictions or semantic accuracy. AC05's rejection obligation covers detectable schema/source/evidence violations; the UI discloses the need for human interpretation.

The exact serialized OpenAPI schema is generated from these reviewed field constraints; no credential, raw provider response or full prompt is returned.

The history envelope additionally returns `latestJob` (the current owner's newest job for this application, or null), so refresh can restore pending/running/failure status without storing identity or job secrets in browser storage. Report reads/history remain owner-scoped. An ordinary page reload does not dispatch a new job.

RD02, RD06, RD07; SEC01-04, SEC06, SEC08, SEC10, SEC12, SEC13. Submission text is untrusted and cannot override instructions, permissions, rubric or comparison scope. Comparison excludes the target, drafts and other events. The plan proposes at most five same-event frozen submitted records, including accepted and rejected applications, selected by deterministic normalized-description similarity. Proposed first-pass method for human approval: Unicode-normalize and lowercase descriptions, tokenize letter/digit runs, compute Jaccard similarity over token sets, include candidates scoring at least 0.50, rank by score descending then stable submission ID ascending, and retain at most five. This is a transparent text-overlap review signal, not semantic duplicate detection. The coverage notice must not imply that no duplicate exists when the comparison set is bounded. A newer rubric or source submission revision makes saved reports visibly stale; old reports retain provenance. A rubric change while a job is running leaves its result tied to the original rubric and visibly stale if that version is no longer current. Manual decisions remain possible and independent. No report creates or updates an application decision.

For this milestone, configure live SoCLaaS use only in explicitly opted-in development/test environments with synthetic records. Automated tests use a fake provider. Production AI remains disabled until D06 data-retention/privacy terms and a human real-data approval are recorded. The course/product owner must confirm that this synthetic-data live integration satisfies the required real-provider demonstration. Do not send personal/contact fields to SoCLaaS; do not retain full prompts or provider transcripts in application logs.

The implementation plan sets a 60-second provider request timeout, 180-second overall job deadline, 40,000-character outbound bound, 4,000 output-token bound, 10 jobs per owner per UTC day, one active job per owner, two concurrent provider calls per worker, and at most one retry for a transient error. These are planning decisions, subject to exact-revision approval and D07/D08 compatibility. Explicit budget exhaustion, authentication/permission errors, invalid output and ambiguous timeouts are not blindly retried. Define atomic quota counting in the shared contract. Accessibility and delivery obligations follow the [development workflow](../../workflow/README.md).

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rule trace | Planned verification |
| --- | --- | --- | --- |
| analyse-applications-with-ai-AC01 | An organiser requests analysis of a submitted application for its event and receives a validated report tied to the exact submitted and rubric versions with evidence for each criterion. | F04-US02; RD02, RD06, RD07 | Pending: independent positive/adverse scenario |
| analyse-applications-with-ai-AC02 | A newer applicable rubric marks the existing report stale; the old report keeps its provenance and is not displayed as a current assessment. | F04-US02; RD02, RD06, RD07 | Pending: independent positive/adverse scenario |
| analyse-applications-with-ai-AC03 | Private drafts and other-event submissions are excluded from duplicate comparison, and organiser-only comparison evidence never enters applicant responses. | F04-US02; RD02, RD06, RD07 | Pending: independent positive/adverse scenario |
| analyse-applications-with-ai-AC04 | Injected instructions in submitted content cannot change rubric, access scope, permissions or decision state. | F04-US02; RD02, RD06, RD07 | Pending: independent positive/adverse scenario |
| analyse-applications-with-ai-AC05 | Malformed output or detectable schema/source/evidence violations are rejected as a valid report; prior decisions and reports remain intact. Exact source quotes establish traceability, while semantic interpretation remains subject to organiser review. | F04-US02; RD02, RD06, RD07 | Pending: independent positive/adverse scenario |
| analyse-applications-with-ai-AC06 | Only the job owner with current event organiser membership can read/cancel a job or report; permission is rechecked before source access, provider transmission and report persistence. Cancellation or revoked membership prevents a late result from becoming visible. Quota, timeout and provider failures leave manual review available. | F04-US02; RD02, RD06, RD07; SEC01/10/13 | Pending: independent authorization, cancellation-race and provider-failure scenarios |
| analyse-applications-with-ai-AC07 | An authorised organiser can save a changed event rubric as a new immutable version; previous versions and reports retain their original content and provenance, and stale concurrent edits do not overwrite a newer version. | F04-US02; RD02; SEC01/11/13 | Pending: proposed rubric version contract must be approved before executable tests |
| analyse-applications-with-ai-AC08 | A completed report contains only validated criterion findings and evidence that resolves to the exact permitted frozen source revision; invalid schema, missing criteria, unknown source references or quotes absent from the source are not saved/displayed as a valid report. | F04-US02; RD02; SEC04/08/13 | Pending: independent schema/evidence validation scenario |
| analyse-applications-with-ai-AC09 | Live analysis requests send only the approved pseudonymous application fields and rubric, never contact details or unrelated/private records; model output cannot create a decision or invoke external actions. | F04-US02; RD06; SEC03/06/08/12/13 | Pending: synthetic outbound inspection and injection scenario |

## External interfaces and dependencies

Requires the frozen submission contract in [submit-business-applications](submit-business-applications.md), the decision visibility contract in [decide-applications-and-show-outcomes](decide-applications-and-show-outcomes.md), and [monitor-and-recover-ai-tasks](../shared/monitor-and-recover-ai-tasks.md). Shared logical contracts and ownership boundaries are in [architecture](../../docs/architecture.md); proposed physical storage remains subject to coordinated review. Provider/model, report/rubric shapes, exact API, duplicate method/threshold, quota values, retention and course evidence acceptance must be agreed before Ready.

## Decisions and approval

| Decision | Proposed direction from the implementation plan | Decision owner | Blocks what? | Resolution and approval evidence |
| --- | --- | --- | --- | --- |
| D01 — Rubric contract | One current rubric per event; 1–10 stable-ID/title/instruction criteria; three editable starters (event relevance, proposal clarity/completeness, distinctiveness); immutable versions | Organiser product/API owner | Ready for rubric implementation | Plan choice recorded; exact written revision and field-validation contract await human review |
| D02 — Comparison semantics | At most five same-event frozen submitted records in any decision status, excluding target and drafts; proposed normalized token-set Jaccard >= 0.50, sorted by score descending then stable submission ID | Organiser product/security owner | Ready for duplicate flags | User selected all submitted statuses and approved proposing a deterministic cutoff; exact method/cutoff remains for review with this revision |
| D03 — SoCLaaS and evidence | SoCLaaS Chat Completions, synthetic-only live calls in opted-in dev/test, production disabled pending retention/privacy approval | Human course/product/privacy owner | Live integration and release evidence | User believes synthetic-data live call is acceptable; lecturer confirmation, accessible model probe and provider retention review remain pending |
| D04 — Exact report and API contracts | Concrete field/schema, quote-matching, pagination and request-ID contract above | Shared API/data-contract owners | Independent acceptance review | Selected under implementation authorisation; independent test review and human written-contract review tracked separately |
| D05 — Limits, retry and retention | Plan bounds plus shared task contract's concrete counting, retry and cleanup rules | Product/security owners | Independent worker/provider verification | Application rules selected; provider-side retention/privacy and real-data production approval remain pending |
| D06 — In-flight authority/freshness | Concrete task contract defines dispatch, terminal cancellation/revocation and rubric staleness | Organiser product/security/API owners | Race verification | Selected under implementation authorisation; test/review evidence pending |

## Verification and evidence

Implementation and independent test/behaviour/security reviews are recorded in the [run record](../../workflow/agents/runs/2026-10-21-organiser-ai-analysis.md), including protected baseline commits and the reviewed application snapshot. Combined verification passed 271 backend and 225 frontend tests plus the production build. The criteria below remain conservatively unverified as complete: automated fake-provider checks are partial evidence, not selected-model live synthetic integration, manual browser, actual process restart or deployed evidence. Exact-written-revision human signoff, the live course evidence gate and production real-data approval remain unresolved; this specification remains Draft.

| Criterion | Evidence | Status |
| --- | --- | --- |
| analyse-applications-with-ai-AC01 | Pending | Not verified |
| analyse-applications-with-ai-AC02 | Pending | Not verified |
| analyse-applications-with-ai-AC03 | Pending | Not verified |
| analyse-applications-with-ai-AC04 | Pending | Not verified |
| analyse-applications-with-ai-AC05 | Pending | Not verified |
| analyse-applications-with-ai-AC06 | Pending | Not verified |
| analyse-applications-with-ai-AC07 | Pending | Not verified |
| analyse-applications-with-ai-AC08 | Pending | Not verified |
| analyse-applications-with-ai-AC09 | Pending | Not verified |

## Revision history

| Revision / date | Change | Approval and evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft from F04-US02 and current RD/SEC rules | Product approval and verification pending |
| 2 / 2026-10-21 | Refined scope for SoCLaaS analysis, editable versioned rubrics, minimised outbound fields, report provenance and organiser-only F10 jobs; separated plan-approved direction from proposed physical/API/limit details | Exact revision-2 and contract approval pending; no test, implementation or provider evidence claimed |

## Draft revision3 refinement -2026-10-22

Isaac approved normal product wording and explicit data-sharing acknowledgement instead of an invented-data checkbox. Current UI confirmation explains that frozen descriptions/assessment criteria reach the AI provider, with contacts excluded; Start analysis is the explicit acknowledgement dataSharingConfirmed:true. Legacy synthetic acknowledgement remains for compatibility. Development real-data requires AI_REAL_DATA_ENABLED/event allowlisting; production remains disabled and provider retention unverified. Shared UI r5 regional dates apply to report timestamps. Existing frozen-source/evidence/schema/authority/manual-decision boundaries are unchanged. This supersedes conflicting synthetic-only product wording above for the approved dev-mode refinement, not historical evidence. Independent implementation/updated-test review remains pending.
