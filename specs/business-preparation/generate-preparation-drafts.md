# Generate preparation drafts

| Field | Value |
| --- | --- |
| Stable capability ID | generate-preparation-drafts |
| Covered stories | [F06-US04](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 3 / Ready |
| Product roles / roadmap | Active business owners; AI for every role |
| Product and contract approval | Isaac approved provider/data/estimate/adoption defaults3/5 and related specification/implementation amendments6 on2026-10-21; limits approved with30 dispatches/min. This revision records that direction. |
| Review / run record | [Actual phase run](../../workflow/agents/runs/2026-10-21-f06-implementation.md); independent tests/baseline and runtime evidence pending |

## Product outcome, users and scope

An authorised owner requests a private AI preparation draft from permitted event/setup facts, its needs and explicitly selected manual preparation context. It contains editable suggested tasks and labelled cost estimates with deterministic totals. A saved draft never silently changes manual preparation. Adopting explicitly selected draft items appends them only after preview, confirmation and current-source validation. No supplier research, orders, payments, quotations, application decisions or programme publication.

## Use cases and user interface

The business home links AI Preparation Draft. Select an own existing participation; show authoritative event/setup facts, missing setup, selected outbound context, and a plain synthetic-data notice. Require per-request invented-data confirmation. Generate preparation draft creates one bounded job, shows progress/cancel, restores the latest owner job after refresh, and displays validated draft or safe actionable failure. Keep a link to manual Preparation & Budget available.

Authoritative event/setup facts are displayed separately from generated suggestions. Prices are always labelled estimates or unknown, never quotations. Tasks/lines remain editable and saved in the private draft. Explicit selection plus Adopt selected items opens Confirm preparation adoption with exact selected content and current target revisions; Confirm adoption appends, Cancel writes nothing. Changing draft, selection or context invalidates confirmation. After uncertain writes, reconcile job/draft/preparation through authorized reads before any further explicit attempt. Use shared UI r4 memory-only private state, conceal/revalidate on focus, purge on access loss, departed-response suppression and accessible pending/error/keyboard feedback.

## Inputs, outputs and functional contract

All paths prefix `/api/v1`; strict camelCase JSON, UUIDs, positive integer revision tokens (not bool/string/float), safe no-store RFC9457 responses and trusted Origin on every mutation.

| Method/path | Contract |
| --- | --- |
| POST `/business/participations/{participationId}/preparation-drafts` | `{requestId,expectedPreparationRevision,expectedSetupRevision,expectedEventRevision,needs,selectedTaskIds,selectedLineIds,syntheticDataConfirmed:true}`;202 BusinessPreparationJob v1 |
| GET same | Current requesting owner's paginated history `{items,total,limit,offset,latestJob}`; default20, max100, offset>=0 |
| GET `/business/preparation-drafts/{draftId}` | Current requesting owner, current business authority; canonical draft |
| PUT same | `{expectedRevision,tasks,budget}`; full replacement of editable draft content, independent draft CAS |
| POST `/business/preparation-drafts/{draftId}/adopt` | `{expectedDraftRevision,expectedPreparationRevision,expectedSetupRevision,expectedEventRevision,taskIndexes,lineIndexes}`; canonical draft with adoption metadata and updated manual preparation |
| GET/cancel `/ai/jobs/{jobId}` | Shared business envelope and controls in monitor-and-recover-ai-tasks r3 |

Creation needs trimmed1..2000 codepoints; selected IDs are unique own current task/line UUIDs, at most200 each. Missing/foreign IDs, stale sources and unsupported fields fail atomically. No application acceptance or assigned booth is required: absent setup is explicitly unknown, never invented. Stored source snapshot binds event metadata revision, setup revision, preparation revision and current participation type. Request UUID dedup/quotas follow shared jobs. Before an actual provider dispatch, source freshness and current authority are checked again.

Outbound allowlist: permitted event title/dates/timezone, assigned booth/setup facts or null, participant type, explicit needs and selected manual task/line editable fields. Never send business/user IDs or names, contacts, decision/review content, other businesses or unselected records. Free text can still contain personal data; live use requires invented data, operator event allowlist and opt-in. Do not claim automated anonymisation.

Provider output is strict `{sourceFacts,tasks,lines}`: sourceFacts must echo exactly the provided event title/timezone/start/end/booth/setup values; unknown/changed fields are rejected. Render actual authoritative facts, not model echo. Up to20 generated tasks `{title}` (trimmed1..160); server supplies not_started status and null dueDate. Up to20 lines `{description,quantity,unitPriceMinorUnits}`; use manual r3 bounds, SGD, numeric integer cents0..100000000000 or null and quantity1..1000000. Server assigns estimate for known price, unknown for null, and null quotation basis. Model supplied totals, quotation status, external links, actions, IDs or extra fields are invalid. Task text remains explicitly suggested work, not authoritative event facts; schema/source echo checks do not prove semantic correctness. Display uncertainty and require human review.

A canonical `PreparationDraft v1` contains `{id,jobId,participationId,revision,sourceRevisions,sourceFacts,tasks,budget,createdAt,adoptedAt,adoptedPreparationRevision}`. Source revisions/facts are server-owned. Tasks use editable title/status/dueDate; lines description/quantity/unitPriceMinorUnits/priceBasis/quotationBasis, no caller-controlled row IDs. Saved edits obey manual r3 text/date/number/currency rules, including unknown versus zero; draft prices cannot become quotations without explicit user-entered basis. Draft task/line caps200 each. Aggregate totals are exact decimal strings, incomplete total null; calculate with exact Python/BigInt arithmetic. PUT never changes provenance, job state or manual records; success advances draft revision once. Draft edits after adoption are rejected.

Concrete v1 shapes for independent consumers: `sourceRevisions` is `{event,setup,preparation}` with positive integer revisions; participation revision remains internal only. `sourceFacts` is `{event:{title,startsAt,endsAt,timezone},setup:{boothLabel,setupInstructions}}`, using exact server event timestamp strings and nullable setup facts. Provider sourceFacts has this identical shape and must equal the captured snapshot. Draft tasks/lines omit row IDs, otherwise use manual editable fields; budget is `{currency:"SGD",lines,totalMinorUnits,knownSubtotalMinorUnits,isComplete}`. Initial draft revision1; createdAt is UTC; adoptedAt/adoptedPreparationRevision are both null before adoption, otherwise UTC time/positive resulting revision. History items are canonical drafts, total counts drafts, latestJob is the latest owner job regardless of completion. Completed job `draft` is canonical PreparationDraft, otherwise null. Adoption response is `{draft,preparation}`, with canonical adopted draft and updated manual PreparationView. No additional domain mutation is authorised by these shape clarifications.

After provider I/O, final draft commit transaction rechecks current event/setup/preparation revisions as well as current requesting-owner authority and job cancellation/deadline. If any bound source changed, fail `source_changed` without publishing the draft as current-valid. Source locks/consistent validation must serialize with the relevant producers' writes.

The source snapshot also records participation revision internally because a draft application's participant type may change independently. Creation captures that current revision without a caller-supplied authority field; dispatch, final commit and adoption verify it still matches before using the captured participant type.

Adoption requires at least one selected index, no duplicates/out-of-range, current draft revision and currently matching event/setup/preparation revisions bound at generation. Stale sources require review/regeneration; no silent adoption onto changed facts. Append copies only, allocating new manual row IDs, preserving existing items and rejecting any resulting200-item limit overflow atomically. One adoption per draft: repeated/concurrent requests cannot duplicate copies. Draft adoptedAt/adoptedPreparationRevision, resulting manual revision and minimal attributable audit commit together. Job/draft/preparation reconciliation reveals whether an uncertain adoption committed. Manual records outlive expired job/draft cleanup.

Safe failures include401 unauthenticated,403 forbidden/password_change_required,404 not_found,409 revision_conflict/source_changed/already_adopted/request_conflict/active_job,422 validation_error,429 quota_exceeded,503 configuration/service_unavailable and500 internal_error. Permission checks precede private source/conflict details. Failure does not change existing manual records.

## Constraints, security and non-functional requirements

RD01/RD07; SEC01–04/06/08/10/11/12. Requesting owner and current business membership are required at read/write/worker boundaries; organiser membership grants no private draft access. Generation is tool-free with the existing fixed SoCLaaS provider, configured model and safe transport; no autonomous actions. Strict schema/source validation precedes result persistence/display. Both prompt and generated text are untrusted plain text. Minimise provider/log payloads and redact secrets. Adopt through the preparation module's approved domain write service, never arbitrary cross-module table writes.

Shared limits:10 jobs/user/UTC day, one active,60s provider timeout,180s total deadline,40000 outbound codepoints,4000 output tokens,40000 response-content characters,2 in-flight provider calls per worker, shared `SOCLAAS_REQUESTS_PER_MINUTE=30`, existing bounded502/503 retry only and30-day terminal job/draft retention. Production AI remains disabled. Provider failure/cancellation/quota exhaustion never blocks manual tasks/budgets.

## Acceptance criteria and story traceability

| ID | Observable criterion | Trace | Planned verification |
| --- | --- | --- | --- |
| generate-preparation-drafts-AC01 | Current authorised owner receives a validated private editable draft using exact permitted current event/setup facts, selected context and clearly labelled estimates/unknowns; missing booth remains unknown. | F06-US04; RD01/07; SEC01/04 | Real provider and controlled-source/schema cases |
| generate-preparation-drafts-AC02 | Quantity-by-price line amounts and summed totals are exact, including odd values beyond JS safe integer; incomplete prices never become zero. | F06-US04; SEC04 | Max/odd/null arithmetic and UI |
| generate-preparation-drafts-AC03 | Save/edit stays in draft; confirmed append-only adoption checks exact source/draft/preparation revisions and selection, preserves existing data and cannot duplicate under replay/race. | F06-US04; SEC06/11 | CAS, stale/overflow/failure, confirmation/cancel and uncertain-response |
| generate-preparation-drafts-AC04 | Foreign/inactive/organiser users cannot create/read/edit/adopt/cancel the private job/draft or selected source context; denial preserves domain state. | F06-US04; RD01; SEC01/02 | Full direct scope matrix |
| generate-preparation-drafts-AC05 | Injection, fabricated/changed facts, extra fields, malformed output and forbidden outbound data fail validation/minimisation checks and never trigger external actions. | F06-US04; SEC03/04/06/08 | Controlled malicious payload/provider/log assertions |
| generate-preparation-drafts-AC06 | Job limits, cancellation, timeout/provider failure and restart/cleanup follow shared jobs; manual data remains usable/intact. | F06-US04; RD07; SEC10 | Shared integration and real persistence/recovery |

## External interfaces and dependencies

Consumes manual preparation r3 and SetupDetails v1, current permitted event facts and shared business jobs r3. Reuse producer APIs/services, preserve existing organiser AI contracts. Additive migrations preserve identities, frozen applications, decisions, setup/manual records and organiser jobs/reports. Schema and generated frontend API types move together. AI drafts are separate domain records; they are not the sole manual source of truth.

## Decisions and approval

Isaac approved provider/data limits, model estimates without supplier research, separate editable drafts, explicit selected append-only adoption with fresh source checks and implementation/spec amendments. Price/quantity amendments from manual r3 apply. Shared job/privacy restrictions remain in force; real-data or production enablement is not authorised. API/DTO bounds above implement the approved direction under that amendment authority.

## Verification and evidence

Independent preimplementation test design/adequacy/baseline, developer implementation, independent behaviour/security reviews and actual selected-provider/browser/restart evidence remain pending in the phase run. All AC01–06 are unverified as completion until applicable evidence is recorded. Human teammate/accessibility/summary verification, deployment and cross-role project release gates remain separate. Fake-provider tests do not satisfy actual business LLM integration. Session logs under logs/isaac record real handoffs and results.

## Revision history

| Revision/date | Change | Evidence impact |
| --- | --- | --- |
| 1 /2026-10-18 | Initial F06-US04 Draft | Approval/verification pending historically |
| 2 /2026-10-21 | Recorded Isaac's approved AI defaults, bounded source/output/API contracts, shared30/min jobs, exact arithmetic and append-only confirmed adoption; retained AC01–06 | Product direction authorised; independent baseline and implementation evidence pending |
| 3 /2026-10-22 | Made nested source facts/revisions, history, draft lifecycle and adoption response shapes explicit for independent consumers | Bounded contract clarification under Isaac's specification-amendment authority; no new policy or runtime evidence; AC01–06 retained |
