# Monitor and recover AI tasks

| Field | Value |
| --- | --- |
| Stable capability ID | monitor-and-recover-ai-tasks |
| Covered stories | [F10-US02](../../docs/UserStoriesAndFeatures.md), organiser application-analysis job slice only |
| Specification revision / status | 2 / Draft |
| Product roles / roadmap | Organiser; [phase 3](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of exact revision 2 and proposed job/data/API contracts |
| Review / run record | Pending |

Sources: [standard](../README.md), catalogue, [RD07](../../docs/project.md#accepted-review-decisions), [security](../../docs/security.md), [architecture](../../docs/architecture.md), and [organiser application-analysis Draft](../applications/analyse-applications-with-ai.md). This revision scopes F10-US02 to organiser analysis; attendee and business jobs still require their own approved capability coverage.

## Product outcome, users and scope

An event organiser can request a bounded application-analysis job, see its status, inspect a validated report or actionable failure, cancel work that has not completed, and continue reviewing applications manually. This specification revision covers only the F10-US02 job controls consumed by F04-US02; it does not implement attendee or business workflows and does not satisfy their separate LLM requirements. AI cannot change application decisions or other accepted/shared state.

## Use cases and user interface

The organiser starts an analysis from a submitted application, sees `pending`, `running`, `completed`, `failed` or `cancelled`, and can open only a report they still have authority to access. Progress is bounded and must not expose prompts or private provider details. Cancellation says whether further processing stopped; a provider request already sent may still consume quota, but its late response cannot be committed after cancellation. Timeout, configuration, rate/quota, malformed-output and worker-interruption failures have safe actionable messages. Manual application review and decision remain available at all times.

## Inputs, outputs and functional contract

Analysis creation binds an authenticated organiser, event, target submission's frozen-content revision, rubric version, selected comparison revisions and an idempotency/request identifier. The stable job identity, workflow, owner, state, timestamps, bounded progress and safe failure category are visible to that owner. A completed job exposes the validated analysis artifact and provenance through the F04 capability. Cancellation targets the owner's job. Any exact route and JSON shape below is a candidate contract requiring shared API approval.

Analysis creation returns `202` with a job ID; `GET /api/v1/ai/jobs/{jobId}` reads job state/result; `POST /api/v1/ai/jobs/{jobId}/cancel` requests cancellation. Durable execution uses PostgreSQL-backed job claims and a separate Python worker. The concrete contract below defines claims, leases and transactions. Workers recheck current organiser role/membership at source, dispatch and commit boundaries. A revoked member's job cannot publish a report; source/rubric versions remain those captured at creation.

## Constraints, security and non-functional requirements

### Concrete organiser job contract

Under Dylan's 2026-10-21 implementation authorisation, job read/cancel routes above return `{id, eventId, applicationId, state, createdAt, updatedAt, completedAt, failureCode, providerMayHaveRun, report}`. `report` is null unless completed and validated; it contains its stable ID, creation time, source/rubric/comparison provenance, stale indicator and the domain payload. Only the requesting owner with current event membership can read reports/history or jobs. Foreign/missing job IDs return 404; wrong roles/current membership are rejected by the existing auth boundary. All mutations enforce trusted Origin and reads are no-store. Errors use existing RFC-style problem responses; malformed requests are 422, stale/dedup/active-job conflicts 409, daily limit 429, disabled/missing provider configuration 503.

Creation's request-ID scope and quota counting are defined in the analysis contract. Creation locks the owner before quota/active checks. Worker claims are atomic with a lease bounded by the 180-second job deadline; another worker only recovers expired leases as failed/interrupted, never replays a possibly billed running job. Pending jobs survive restart. Each worker dispatches at most two concurrent calls. Completion, report insert and content-free success audit commit atomically. Cancellation and completion serialize on the job: first terminal commit wins; repeated cancellation returns current terminal state. Cancelling an in-flight call discards any later result. Revocation detected before a worker boundary ends the job as failed/permission_revoked; no report commits. Authority is rechecked at dispatch and transactionally at report commit; revocation cannot undo a request already dispatched.

The outbound bound counts Unicode code points in the actual serialized system/user message strings, including rubric and framing; oversize input fails without truncation or provider send. The request uses max_tokens 4000 and rejects response content above 40,000 characters before parsing. One retry after two seconds is allowed only for an explicit HTTP 502 or 503, within the overall deadline. HTTP 429, 401/403, other failures, transport exceptions/timeouts and invalid output fail safely without automatic retry. No raw provider body is included in errors/logs.

Dispatch has an explicit database-serialized point: while locking the job and checking current membership/cancellation, record the provider attempt before releasing the transaction for HTTP. Cancellation before this point prevents dispatch; afterwards `providerMayHaveRun: true` explains potential usage even if the HTTP call has not yet left the process. Completion still requires current membership and a non-cancelled job in the final transaction. A shared PostgreSQL dispatch gate caps provider attempts across workers at configured `SOCLAAS_REQUESTS_PER_MINUTE` (default 30, lower than the documented default limit; adjust to the actual key's allowance). Provider 429 fails safely; the app does not claim this local cap overrides provider budgets.

Live application analysis additionally requires the event UUID in operator-configured `AI_SYNTHETIC_EVENT_IDS`. Operators must allowlist only a dedicated event populated with invented data, and requests must confirm this. Neither the flag nor excluded contact columns proves free text is anonymous; the UI and startup guide explicitly state the operator responsibility. The doctor probe always sends fixed invented content. An ordinary, unlisted event cannot reach the live adapter.

Terminal jobs and their associated reports expire 30 days after creation; explicit cleanup deletes these together, preserving original submissions, decisions, immutable rubric versions and content-free security audit records. Active jobs are first recovered/failed when overdue. An expired job/report lookup returns 404. Retention is an application policy and makes no claim about provider-side retention. Production provider calls remain disabled. Synthetic-only live use additionally requires a global development/test opt-in and per-request confirmation; free text must still be invented because excluded contact fields alone cannot remove personal data embedded in descriptions.

[SEC01, SEC03, SEC04, SEC06, SEC08, SEC10, SEC11, SEC12 and SEC13](../../docs/security.md) apply. The selected provider is SoCLaaS OpenAI-compatible HTTPS `/v1/chat/completions`; live calls are explicitly enabled only for development/test with synthetic data. The provider key is server/worker runtime-only and never enters browser storage, source control or logs. Outbound data is limited to pseudonymous source labels, participant type, description and rubric instructions; it excludes requested space, contact fields, business name, decisions and unrelated records. Logs omit prompts, source contents, credentials and provider responses.

Plan limits: 60-second provider request timeout; 180-second total job deadline; maximum 40,000 outbound characters and 4,000 requested output tokens; 10 jobs per owner per UTC day; one active job per owner; at most two concurrent provider requests per worker; and at most one retry only for a clearly classified transient failure. Do not retry an ambiguous timeout, authentication/permission failure, explicit budget/quota exhaustion or invalid output. The counter must be enforced atomically under concurrent submissions. No result is displayed before schema, evidence and source-revision validation. Production AI remains disabled pending provider retention/privacy approval and human approval to process real applicant data.

The concrete contract's 30-day cleanup removes terminal jobs and associated reports, preserving submissions, decisions, rubric versions and security audits. An overdue running lease becomes failed/interrupted and is never automatically replayed. Pending jobs remain durable. Explicit new user requests create new jobs within quotas.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| monitor-and-recover-ai-tasks-AC01 | An authorised organiser's analysis request creates or returns a durable owner-scoped job ID with one of `pending`, `running`, `completed`, `failed` or `cancelled`; the job binds the exact application, rubric and comparison revisions. | F10-US02 organiser slice; RD02/07; SEC01/13 | Start job, repeat with same request ID, inspect persisted state and bound revisions |
| monitor-and-recover-ai-tasks-AC02 | A completed report is accessible only after schema, evidence-quote, source-label and source-revision validation; invalid or stale data is never presented as a current valid result. | F10-US02; SEC04/13 | Submit malformed/missing criteria, unknown labels, non-matching quotes and old rubric/source revisions |
| monitor-and-recover-ai-tasks-AC03 | A user without the job ownership and current event organiser membership cannot read, cancel or retrieve its artifact; denial does not alter job/result state. | F10-US02; SEC01/02/13 | Wrong user/event/role, unauthenticated and revoked-membership requests |
| monitor-and-recover-ai-tasks-AC04 | Cancellation before the serialized dispatch point prevents a provider attempt. After dispatch is claimed, the attempt may run and consume quota; `providerMayHaveRun` makes that visible. A late response cannot commit after cancellation. | F10-US02; RD07; SEC10 | Race cancellation against dispatch claim and completion; deliver late fake response |
| monitor-and-recover-ai-tasks-AC05 | Configured limits are enforced: 60-second provider timeout, 180-second total deadline, 40,000 outbound characters, 4,000 output tokens, 10 jobs per owner per UTC day, one active job per owner and two simultaneous provider requests per worker. Oversize input fails explicitly without silent truncation. | F10-US02; RD07; SEC08/10 | Boundary and concurrent submissions/provider calls; verify no over-limit request is sent |
| monitor-and-recover-ai-tasks-AC06 | Source text cannot override permissions, scope, rubric or behavior; only pseudonymous labels, participant type, description and rubric instructions are sent. Contact fields, requested space, business name, decisions and unrelated records are absent from provider requests/logs. | F10-US02; F04-US02; SEC03/06/08/13 | Injection corpus plus synthetic outbound-request and log inspection |
| monitor-and-recover-ai-tasks-AC07 | Job state survives service restart. An interrupted running job becomes a safe actionable failure and is not automatically replayed. Minimal job metadata expires after 30 days; explicit cleanup removes expired reports/source payloads while preserving applications, decisions and security audit records. | F10-US02; RD07; SEC10/11 | Restart during provider request, inspect no replay, run cleanup against synthetic retained/expired rows |

## External interfaces and dependencies

Consumes [workspace access](access-authorised-workspaces.md) and `CurrentActor v1`; produces owner-scoped task state and `DraftArtifact v1` per [architecture](../../docs/architecture.md#contracts-for-independent-development). Domain AI capabilities define artifact schemas and fresh acceptance validation. The approval contract in [external actions](approve-external-actions.md) governs any external write. Error categories, state transitions, retention and compatibility versions must be agreed before Ready.

## Decisions and approval

| Decision | Plan choice / candidate contract | Decision owner | Blocks what? | Resolution and approval evidence |
| --- | --- | --- | --- | --- |
| J-01 — Provider/environment | SoCLaaS HTTPS Chat Completions; opted-in development/test live calls use synthetic records only; automated tests use a fake provider; production stays disabled pending provider privacy/retention review and human real-data approval | Product/privacy and course owner | Live integration and production enablement | Provider/environment choice recorded in implementation plan; provider terms and course acceptance of synthetic-only live evidence pending |
| J-02 — Limits/retries | Concrete bounds/counting above; one HTTP 502/503 retry, no timeout/transport/429 retry | Product/security owner | Limit/failure verification | Selected under implementation authorisation; a retry may incur another provider charge because provider idempotency is not established |
| J-03 — Persistence/recovery | Proposed PostgreSQL-backed durable jobs, separate Python worker, minimal job metadata for 30 days, interrupted `running` becomes failed/no auto-replay, explicit cleanup preserving application/decision/audit records | Shared architecture/data owner | Migration, worker recovery and cleanup | Plan direction recorded; physical schema, atomic claiming/concurrency and cleanup recovery details pending architecture review |
| J-04 — API and deduplication | Concrete job envelope and owner/request-ID scope above | Shared API owners | Independent client/test integration | Selected under implementation authorisation; review/evidence pending |
| J-05 — Authority/freshness | Dispatch claim and final job/membership locks serialize cancellation, completion and revocation | Organiser product/security owner | Race verification | Selected under implementation authorisation; cancelled results discarded, detected revocation fails permission_revoked |

## Verification and evidence

Independent test design/review, protected baseline, a live synthetic SoCLaaS call for this organiser workflow, restart/recovery, adversarial security checks and online environment checks are pending. All criteria are unverified. Fake-provider tests alone do not prove the selected-provider integration. The shared story's attendee/business workflows are outside this revision and remain pending in their own specifications. Human teammate review and summary verification remain pending.

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft | Approval and verification pending |
| 2 / 2026-10-21 | Scoped the shared F10 contract to organiser application-analysis jobs and recorded planned SoCLaaS, limits, ownership, cancellation, restart and retention behavior; left exact interfaces and physical storage as proposals | Exact revision-2 and shared contract approval pending; no test, implementation or provider evidence claimed |
