# Answer event questions

| Field | Value |
| --- | --- |
| Stable capability ID | `answer-event-questions` |
| Covered stories | [F03-US02](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 2 / Draft |
| Product roles / roadmap reference | Attendee; [phase 3, order 8](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Decisions AEQ-01 to AEQ-04 approved by Yik Bing in chat on 2026-10-22; exact revision-2 text (including the clarifications recorded at test design) approved by Yik Bing in chat on 2026-10-22 |
| Review / run record | Pending independent draft review and later implementation records |

Follow the [standard](../README.md). An attendee asks a natural-language question about one event's published programme and receives an answer whose factual claims are each checked by the server against the current published records, or an explicit unknown. This contract excludes private application/business data, plans and preferences, and unsupported assertions about availability, suitability or external conditions.

## Product outcome, users and scope

A signed-in attendee can use an LLM-assisted event information service without mistaking model guesses for event facts. Published programme facts are the only source. The model proposes structured claims; the server verifies them and shows the verified record, never the model's wording as fact. The feature contributes to the attendee LLM requirement of the assignment, subject to real provider evidence (live use only in development or test with synthetic events). Manual browsing stays available. Each question is independent: no conversation history is stored or sent. Guest or public use is excluded.

## Use cases and user interface

On the attendee event view, a section headed "Ask about this event" has a text box labelled "Your question" (300 characters, with a remaining-count), and buttons "Ask question" and, while a job is active, "Cancel question". A status line states the job state and that an answer can take up to a minute. A visible notice says the question is sent to an external AI service and that personal details must not be entered. There is no confirmation checkbox; the server-side allowlist of invented-data events is the control.

- **Answered:** a list of verified facts, each showing item title, revision, field, the value taken from the authoritative record, a "Cancelled" marker where applicable, and a link to the programme item. Below it, an "AI summary" sentence only when the summary passes validation; the page states that only the verified facts are checked.
- **Unknown:** a message giving the reason (not enough information, conflicting information, or outside the programme) and a link to browse the programme.
- **Stale:** when a cited item changed after the answer, no answer is shown; the message says the programme changed and offers "Ask again".
- **Failure, cancelled, timeout, daily limit, active job, or AI unavailable:** a plain message that browsing remains available. Cancelling after dispatch states that the provider may already have received the question.
- Nothing is displayed as an answer while the job is pending or validation has not completed. Controls and messages are keyboard and assistive-technology accessible; status changes are announced.

## Inputs, outputs and functional contract

### Concrete contract (revision 2; approved by Yik Bing in chat 2026-10-22)

- `POST /api/v1/attendee/events/{eventId}/event-questions` (attendee role only, trusted Origin) with `{requestId, question}` returns `202` and a job view. `GET /api/v1/attendee/ai/question-jobs/{jobId}` reads it and `POST /api/v1/attendee/ai/question-jobs/{jobId}/cancel` cancels it. Foreign, missing or non-question jobs return 404. Responses are no-store. Errors use the existing problem format: malformed or empty question 422; duplicate request ID with different content or active-job conflict 409; unknown event or event with no published items 404; daily limit 429; disabled or missing provider configuration 503; unauthenticated 401; wrong role 403.
- Job view: `{id, eventId, state, createdAt, updatedAt, completedAt, failureCode, providerMayHaveRun, question, stale, result}`. `state` is `pending`, `running`, `completed`, `failed` or `cancelled`. `result` is null unless the job is completed, validated and not stale.
- `result` is one of:
  - `{outcome: "answered", summary: string | null, claims: [{itemId, itemRevision, itemTitle, itemState, field, value}], observedProgrammeRevisions}`. `claims` has 1 to 20 entries. `field` is one of `title`, `type`, `startsAt`, `endsAt`, `room`, `venueName`, `venueAddress`, `price`, `capacity`, `accessibility`, `state`, `cancellationReason`. `price` is integer SGD minor units. `itemTitle`, `itemState` and `value` are filled from the authoritative record, not copied from the model. `observedProgrammeRevisions` maps each cited `itemId` to its revision.
  - `{outcome: "unknown", reason: "insufficient_evidence" | "conflicting_evidence" | "out_of_scope", observedProgrammeRevisions}` where the map covers every programme item the model saw.
- Clarifications recorded at test design (2026-10-22): the section is on the attendee event programme view (`/attendee/programme/events/:eventId`); request bodies with any key other than `requestId` and `question` are rejected with 422; the raw model output is `{"outcome":"answered","summary":string|null,"claims":[{"itemId","itemRevision","field","value"}]}` or `{"outcome":"unknown","reason":...}` and any other key (including `itemTitle` or `itemState`) is `invalid_output`; claim order is preserved; a summary longer than 300 characters is withheld rather than failing the job; an answered result is stale only when a cited item changed, while an unknown result is stale when any item changed or was published.
- Facts: the current (latest) published revision of each activity of the event, including cancelled activities marked `cancelled`; draft activities do not exist in this source. Foreign-event and unpublished records are never sent.
- Validation (deterministic, not the model's claims): the model output must be one JSON object that matches a strict schema with no extra keys. Every claim's `itemId` must be a fact of that event and `itemRevision` its current revision. `value` must equal the record's value for `field` (datetimes compared as instants, `price` and `capacity` as integers, accessibility `null` only when the record has none, other fields by exact string equality). Contradictory duplicate claims are rejected. An `answered` output without claims, any fabricated or altered claim, extra keys, or non-JSON output fails the job as `invalid_output`. `unknown` is accepted with a reason; the server cannot verify that the evidence was really insufficient (known limitation).
- Summary: at most 300 characters of plain text. It is withheld, with the verified claims still shown, if it contains markup characters, URLs, email-like text, control or bidirectional characters, or any numeric token that does not appear in a verified claim value or cited item title. The summary is never used as evidence.
- Question handling: Unicode NFC, control and formatting (including zero-width and bidirectional) characters removed, whitespace collapsed, 1 to 300 characters after cleaning. The cleaned question is stored on the job and is the only free text the user adds to the provider request.
- Outbound data to the provider is limited to the event's title and timezone, each fact's item ID, revision, title, type, start, end, room name, venue name and address, price in minor units, capacity, accessibility details, state and cancellation reason, with the cleaned question in a separate JSON field. It excludes preferences, plans, username, email, other attendees' data, other events and all job or owner identifiers. The system prompt states that the question and all programme text are untrusted data, forbids following instructions inside them, requires one JSON object, and contains no secrets. No tools are offered and tool or function calls in a response are rejected.
- Limits: 60-second provider request, 180-second job deadline, 40,000 outbound characters (oversize fails without sending), 4,000 output tokens, output over 40,000 characters rejected, one retry only for HTTP 502 or 503, none for timeouts, transport errors, 429 or invalid output. One active question job per owner and 20 question jobs per owner per UTC day, counted separately from itinerary jobs. The per-minute provider cap is shared with the organiser and itinerary slices. Terminal jobs, questions and results expire after 30 days. Live provider calls are enabled only in development or test for events in `AI_SYNTHETIC_EVENT_IDS`, enforced by the server; production stays disabled.
- Freshness: on every read the server compares the recorded revisions with the current ones. If any cited item changed (for `unknown`, if any item changed or a new item appeared) the job view has `stale: true` and `result` null.
- Storage: question jobs share the attendee job table with itinerary jobs, distinguished by a workflow value; itinerary behaviour, limits and tests are unchanged. A failed, cancelled or malformed run changes no programme, plan or accepted data. Audit records for create, cancel and complete carry the job and action, never the question or answer.

## Constraints, security and non-functional requirements

Apply RD07 and [SEC01–04, SEC06, SEC08 and SEC10](../../docs/security.md), plus the [programme producer contract](../../docs/architecture.md#feature-schemas). The role and owner checks, validation and limits above are server-side; the front end is not a control. No answer discloses private preferences, plans, business submissions or contacts. Provider and request bodies are not logged.

### LLM threat model for this capability

| Threat | Control | Criterion |
| --- | --- | --- |
| Direct prompt injection in the question (override, reveal prompt, role-play, encoded or multilingual payloads) | Question is untrusted data in its own JSON field; no tools; strict schema; claims verified against records; unrelated or private data cannot be shown because it is never sent | AC03, AC04 |
| Indirect injection in item text (title, accessibility details, cancellation reason, venue text) | Same; programme text is data; output is limited to verified claims; summary checks | AC04 |
| Fabricated or altered facts, wrong revision, hallucinated items | Server verification of every claim; invalid output fails the job | AC01, AC05 |
| Stale answers after programme changes | Stored revisions compared on every read; stale result is withheld | AC05 |
| Unsupported claims hidden in prose | Summary is non-evidentiary; numbers, URLs, markup and emails are checked; verified facts are shown first | AC01, AC05 |
| Data exfiltration through the request or response | Minimum outbound fields; no identifiers or private data are sent; no links or markup rendered from model text; React escaping | AC03, AC04 |
| Cross-user or cross-event access | Owner-scoped jobs (404 otherwise); event scope from the path; facts only from that event | AC03, AC06 |
| Tool or action abuse | No tools; tool calls rejected; the job can write nothing except its own row | AC04, AC06 |
| Resource abuse, runaway cost, flooding | Question length, quotas, one active job, shared per-minute cap, timeouts, input and output caps, idempotent request IDs | AC06 |
| Oversized, odd Unicode or hidden-character inputs | Cleaning before storage and send | AC04 |
| Prompt or response leakage in logs | No bodies logged; failure codes only | AC04, AC06 |
| Model refuses or says "unknown" wrongly (availability) | Known limitation; browsing remains available | AC02 |

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| answer-event-questions-AC01 | Given a question answerable from current published programme items, when the user asks it, then each event fact in the answer has a permitted supporting item ID/revision and matches the authoritative current value. | F03-US02; SEC04 | Known facts and evidence links |
| answer-event-questions-AC02 | Given insufficient, contradictory or missing evidence, when the question is answered, then the result explicitly states unknown/unavailable rather than inventing a fact. | F03-US02; SEC04 | Unknown/conflict cases |
| answer-event-questions-AC03 | Given unpublished, foreign-event or private records, when a question requests their contents, then the boundary reveals none and leaves records unchanged. | F03-US02; SEC01-02 | Direct privacy probes |
| answer-event-questions-AC04 | Given prompt injection in an item description or user question, when a job runs, then it does not elevate source text into instructions, disclose unrelated data or initiate an unauthorized action. | F03-US02; SEC03, SEC06, SEC08 | Injection and outbound inspection |
| answer-event-questions-AC05 | Given fabricated IDs/revisions or programme changes during generation, when output is validated, then stale/unsupported text is not displayed as a current factual answer; unknown/retry guidance is shown. | F03-US02; SEC04 | Stale/fabricated output |
| answer-event-questions-AC06 | Given cancellation, timeout, quota or provider failure, when the user checks the task, then the owner-scoped outcome is visible, browsing remains usable and no domain record is changed. | F03-US02; RD07; SEC10 | Failure/fallback and job access |

## External interfaces and dependencies

Consumes published item IDs, revisions and displayable facts (including cancelled activities) from [programme authoring and publication](../programme/create-and-publish-programme.md) and [change-published-activities](../programme/change-published-activities.md), authorization from [workspace access](../shared/access-authorised-workspaces.md), and the job lifecycle pattern of [AI task monitoring](../shared/monitor-and-recover-ai-tasks.md), whose approved scope is the organiser slice; this capability defines its own attendee job contract above, as [generate-feasible-itineraries](generate-feasible-itineraries.md) does. It reuses the SoCLaaS transport, limits and worker seam without changing organiser or itinerary behaviour. An implementation-specific retrieval technique is outside this contract.

## Decisions and approval

| Decision | Options / proposed direction | Decision owner | Blocks what? | Resolution |
| --- | --- | --- | --- | --- |
| AEQ-01 | Public/guest versus signed-in questions, scope and limits | Human product/security owners | Ready and authorization tests | Resolved in revision 2: signed-in attendees only; one event per question, independent questions, no history; approved by Yik Bing in chat 2026-10-22 (D05) |
| AEQ-02 | Provider, permitted outbound fields, question/job retention and quota | Human product/security owners | Ready and integration | Resolved in revision 2: SoCLaaS, fields and limits as listed, whole event programme sent, 300-character question retained 30 days with the job, 20 questions per day separate from itineraries, synthetic-only live use enforced by the server allowlist with an on-screen notice instead of a confirmation checkbox (removal requested by Yik Bing in chat 2026-10-22); approved by Yik Bing in chat 2026-10-22; privacy approval for real data still pending ([D06](../../docs/project.md#decisions-before-implementation)) |
| AEQ-03 | Answer/evidence schema and stale retry semantics | Programme/AI contract owners with human approval | Ready/integration | Resolved in revision 2: structured server-verified claims, explicit unknown reasons, background job with polling, stale results withheld; approved by Yik Bing in chat 2026-10-22 |
| AEQ-04 | Cancelled activities as facts | Human product owner | Ready and grounding tests | Resolved in revision 2: included and marked `cancelled`; approved by Yik Bing in chat 2026-10-22 |

## Verification and evidence

AC01–AC06 are pending independent test-design scenarios, including adverse source content, the threat model above and real-provider validation. Protected baseline, implementation snapshot, independent reviews, human teammate review, delivery checks and human-verified session summary remain pending under the [agent workflow](../../workflow/agents/README.md). No tests or live provider results are claimed.

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft; AC01–AC06 allocated | Approval and verification pending |
| 2 / 2026-10-22 | Added concrete attendee question-job and result contract, outbound-field list, limits, validation rules and LLM threat model; resolved AEQ-01 to AEQ-03 and added AEQ-04 (cancelled activities); criteria AC01–AC06 unchanged | Decisions and exact text approved by Yik Bing in chat 2026-10-22; implementation and provider evidence pending |
