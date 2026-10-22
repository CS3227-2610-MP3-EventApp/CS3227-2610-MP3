# Manage preparation tasks and budgets

> Current revision 5: the **Approved current revision 5 amendment - 2026-10-22** section below governs changed behavior and supersedes conflicting earlier clauses. Earlier runtime results remain tied to their original revisions; independent review of this refinement is pending.
| Field | Value |
| --- | --- |
| Stable capability ID | manage-preparation-tasks-and-budgets |
| Covered stories | F06-US03; [catalogue](../../docs/UserStoriesAndFeatures.md); criteria below |
| Specification revision / status | 5 / In review |
| Product roles / roadmap reference | Active members of a participating business. [2 - Manual journeys](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Isaac approved r2 with quantity/price amendments and authorised implementing related specification amendments on 2026-10-21; r3 records that approved direction. Independent test/baseline gates remain separate. |
| Review / run record | [Implementation, independent reviews and protected baselines](../../workflow/agents/runs/2026-10-21-f06-implementation.md); human gates pending |

## Product outcome, users and scope

An active member of a business maintains private checklist tasks and a manual budget for any existing EventParticipation owned by that business, regardless of application-decision state. The journey supports creating, editing, reopening and removing tasks and budget lines. It labels estimates separately from quotations, calculates totals deterministically, and leaves unknown prices visibly unknown. It does not place orders or payments, or require AI, an accepted application decision, or booth/setup assignment.

## Use cases and user interface

The member selects an existing participation and sees event context plus the current task/budget document, or an empty document. The editor supports task title, status and due date; budget-line description, quantity, optional unit price, price basis and quotation basis. It displays line values and a known subtotal; if any line has no price, the overall total is shown as incomplete rather than as a complete total. Validation is tied to labelled fields and retains user-entered values. The private document exists in UI memory only: clear it on sign-out, identity or participation switch, or 401/403; never restore it from browser storage or reconcile it under a different current identity/context. Responses use `Cache-Control: no-store`. A save reports success only after an authoritative response. On a timeout or lost response, the UI reloads the authoritative document and compares it with the submitted normalized document before offering a retry; it never claims success or blindly replays an uncertain write. Provide keyboard operation, visible focus, programmatic labels, announced save/error state and a non-colour-only estimate/quotation distinction.

## Inputs, outputs and functional contract

All routes use JSON with camelCase fields, UUID path IDs, strict request schemas (unknown fields rejected), and RFC 9457 `application/problem+json` errors. The logical interface is `GET /api/v1/business/participations/{participationId}/preparation` and `PUT` on the same path. GET has no write side effect and returns the virtual empty document at revision 1 if no preparation has been saved. PUT requires the current authenticated business role, active owner membership and trusted Origin under access r4; it replaces the complete editable document and requires `expectedRevision`. Its request has exactly `expectedRevision`, `tasks` and `budget`; task/line IDs are optional existing UUIDs or null for new rows. It accepts no `participationId`, revision, totals or other server-owned fields. Integers must be actual JSON integers (booleans are invalid). The first save expects 1, and each successful save advances the preparation revision by exactly one. The response is the canonical saved document and includes server-owned IDs/revision/totals. Omitted existing task/line IDs mean deletion. IDs from another participation, duplicates, or unknown IDs are rejected. The entire replacement is one transaction: tasks, budget, revision and success audit commit together or none do. The preparation revision is independent of EventParticipation/application revisions. Application draft edits, submission, decision and preparation writes do not change or erase one another; decision state is not an access precondition.

Both GET and PUT require the current business role, active owner membership and completed mandatory password change; only PUT requires trusted Origin. All success/error responses are no-store. `expectedRevision` is a strict positive integer; reject booleans, strings and floats. In PUT, `budget` contains exactly `currency` and `lines`; each task/line has exactly its editable fields shown below and optional `id`. Response IDs are always nonnull UUIDs. All title, description and quotation text is plain untrusted text, never executable HTML.

Array order is retained on save/read. The UI calculates each displayed line amount from canonical quantity and unit price (null when unknown); the server computes the aggregate totals. An empty budget is complete with zero subtotal/total. After an uncertain write, compare ordered editable fields, excluding newly allocated IDs, revision and computed fields. Matching state means the requested content is currently saved, not proof of which request committed it; adopt canonical IDs/revision before further edits. A mismatch requires explicit reconciliation and a new user save at the refreshed revision, never automatic replay.

Shared UI r4 governs context revalidation: conceal private content while rechecking authority on focus/history/refresh; ignore responses belonging to departed identity/participation contexts and purge on confirmed access loss. Unsaved navigation requires a warning. Same-scope recoverable errors retain input in memory only.

Approved v1 response shape:

```json
{
  "participationId": "UUID",
  "revision": 2,
  "tasks": [{"id": "UUID", "title": "Prepare display", "status": "not_started", "dueDate": null}],
  "budget": {
    "currency": "SGD",
    "lines": [{"id": "UUID", "description": "Print materials", "quantity": 2, "unitPriceMinorUnits": 1500, "priceBasis": "estimate", "quotationBasis": null}],
    "totalMinorUnits": "3000",
    "knownSubtotalMinorUnits": "3000",
    "isComplete": true
  }
}
```

Approved bounds: at most 200 tasks and 200 budget lines per participation; trimmed task titles 1â€“160 characters; status `not_started | in_progress | done`; optional `dueDate` is an ISO calendar date in the event timezone. Budget currency is `SGD`; trimmed line descriptions are 1â€“160 characters; quantity is an integer 1â€“1,000,000; unit price is null or an actual JSON integer from 0 to 100,000,000,000 minor units (SGD 1,000,000,000 per unit). Price basis is `unknown | estimate | quotation`: null price requires `unknown` and contributes no amount; a known estimate is labelled `estimate`; `quotation` requires a known price and nonempty trimmed plain-text quotation basis (1â€“500 characters). Non-quotation lines have null quotation basis. Tax and shipping are represented as explicit budget lines, not implicit calculations. Displayed line totals use exact integer arithmetic; only server aggregate totals are represented as decimal digit strings. `knownSubtotalMinorUnits` is a decimal digit string; `totalMinorUnits` is null and `isComplete` false if any line is unknown, otherwise total equals the known subtotal. The UI uses BigInt or equivalent exact decimal-string arithmetic and never calculates money through floating point. No price is described as a confirmed quotation beyond the user-entered basis.

The approved safe problem codes are `unauthenticated` (401), `forbidden` (403), `not_found` (404), `validation_error` (422), `revision_conflict` (409), `service_unavailable` (503) and `internal_error` (500). Validation errors identify only fixed known fields and safe codes, never submitted values or arbitrary database detail. A missing or foreign participation returns the same 404 result to avoid confirming another business's records. Authorization is checked before returning any current revision on conflict; only an authorized caller receives `currentRevision` (positive integer) on a revision conflict; other errors omit it. On conflict, no submitted change is applied and the client must reload and let the member reconcile. Persistence failure returns a safe service error and leaves the prior document intact. Isaac authorised this bounded contract under the recorded implementation approval.

## Constraints, security and non-functional requirements

RD01, RD07; SEC01, SEC02, SEC08, SEC10, SEC11. Every read/write resolves current server-side identity and active business membership and verifies ownership of the participation. Organiser membership alone grants no preparation access. The authorization applies at every API boundary; client role/context values are not authority. Invalid, denied, stale or failed writes preserve the saved document and create no prohibited side effects; successful sensitive writes create minimal attributable audit records without budget/task payloads. No model/provider receives data in this manual capability. See [accepted decisions](../../docs/project.md#accepted-review-decisions) and [security rules](../../docs/security.md). Accessibility and delivery obligations follow the [development workflow](../../workflow/README.md).

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rule trace | Planned verification |
| --- | --- | --- | --- |
| manage-preparation-tasks-and-budgets-AC01 | An active member of the owning business reads and saves tasks and budget lines against any existing owned participation, whether its related application is draft, submitted, accepted or rejected; preparation access does not create or require an application/decision. | F06-US03; RD01, RD07; SEC01/02 | Own participation across decision states; no participation; application remains independent |
| manage-preparation-tasks-and-budgets-AC02 | The member creates, edits, reopens and removes tasks; valid integer quantity/price inputs produce the stated deterministic line values and totals in SGD minor units. | F06-US03; RD01; SEC10 | Task lifecycle plus arithmetic boundaries |
| manage-preparation-tasks-and-budgets-AC03 | Estimates are visibly labelled; a quotation requires a known price and nonempty plain-text basis; unknown prices remain distinct from zero, produce a known subtotal, and make the total explicitly incomplete. | F06-US03; SEC02 | Unknown, zero, estimate and quotation display and arithmetic |
| manage-preparation-tasks-and-budgets-AC04 | Unauthenticated, non-business-role, inactive, unrelated-business and organiser-only callers cannot read or write the document; denied requests disclose no private preparation and leave it unchanged. Both routes enforce the mandatory-password-change restriction; PUT also enforces trusted Origin through access r4. | F06-US03; RD01; SEC01/02 | Direct GET/PUT role, Origin and ownership matrix with before/after state |
| manage-preparation-tasks-and-budgets-AC05 | Invalid fields, unsupported currencies, booleans/floats in integer fields, out-of-range values, over-limit collections, invalid quotation combinations, foreign/duplicate IDs and stale revisions return safe errors and do not change any task, line, total or revision. The client cannot submit server-owned totals, revision or participation identity. | F06-US03; SEC01/02/10 | Boundary/error matrix and state preservation |
| manage-preparation-tasks-and-budgets-AC06 | Manual checklist and budget reads/edits remain available without any AI provider, AI job, booth/setup assignment or external service. | F06-US03; SEC10 | Manual journey with AI/external services unavailable |
| manage-preparation-tasks-and-budgets-AC07 | GET returns a read-only empty revision-1 document before the first save; full-document PUT requires the expected preparation revision and advances it once on success, while stale writes return conflict and cannot overwrite concurrent edits. | F06-US03; SEC01/10 | Initial read, first save, concurrent CAS and lost-response reconciliation |
| manage-preparation-tasks-and-budgets-AC08 | A full-document replacement, including deletions, budget/task rows, revision and success audit is atomic; a forced commit failure leaves all previous records intact, and preparation revisions remain independent of participation/application revisions. | F06-US03; RD01/RD02; SEC11 | PostgreSQL failure injection; application mutation does not alter preparation and vice versa |
| manage-preparation-tasks-and-budgets-AC09 | The UI exposes labelled keyboard-operable fields, visible focus, field-specific recoverable validation, announced save/error outcomes and estimate/quotation meaning without relying on colour. Private document state is not persisted and is cleared on identity/participation changes or access denial; uncertain writes reconcile only after rechecking the same current identity and authorized participation, before retry, and are never shown as saved prematurely. | F06-US03; SEC01/02/10 | Keyboard/accessibility inspection, context-switch/privacy checks, validation and simulated lost response |
| manage-preparation-tasks-and-budgets-AC10 | Valid saved tasks and budget survive a real PostgreSQL connection lifecycle; successful changes are attributable in minimal audit records, and responses/logs contain no other business's data or internal error detail. | F06-US03; SEC02/08/11/12 | Synthetic persistence/reopen, audit and response/log inspection |
| manage-preparation-tasks-and-budgets-AC11 | The business home exposes an enabled Preparation & Budget destination and accurately shows two available features and one AI preview after this capability is delivered. Existing application navigation remains live. This later approved capability supersedes only the earlier submit-r4 AC17 one-live/two-preview home snapshot; other roles and domain criteria are unchanged. | F06-US03; shared UI | Positive enabled route, accurate counts, remaining disabled AI preview |

## External interfaces and dependencies

Requires CurrentActor v1 and BusinessContext v1 plus an existing EventParticipation owned by the caller's business; BusinessContext must expose the caller's participation IDs/types without decision-state filtering. The output is the manual source record consumed by F06-US04; AI-generated content must be a separate draft and cannot silently replace it. The preparation revision is owned by this capability and is independent of application, participation and programme revisions. Architecture lists the logical PreparationTask/Budget/BudgetLine entities and business ownership boundary; the route and DTO contract above records Isaac's authorised bounded amendment. Producer/consumer runtime integration remains a verification requirement. The implementation design is recorded in architecture without creating another specification.

## Decisions and approval

| Decision | Owner | Blocking scope | Resolution |
| --- | --- | --- | --- |
| manage-preparation-tasks-and-budgets-D01: SGD only; task/line caps 200; quantity 1â€“1,000,000; unit price null or 0â€“100,000,000,000 minor units; approved status/text/date bounds; explicit tax/shipping lines; quotation requires known price and plain-text basis; exact decimal-string totals. | Isaac | Resolved; approved for Ready | Approved 2026-10-21 with revision 3 |
| manage-preparation-tasks-and-budgets-D02: GET/PUT route and DTO/error contract, virtual empty revision 1, independent per-participation CAS, atomic full replacement/deletion, and BusinessContext dependency. | Isaac (implementation/contract authority for this task) | Resolved; approved for Ready | Approved 2026-10-21 with revision 3 |
| manage-preparation-tasks-and-budgets-D03: Manual records remain editable source data; no accepted-budget workflow in US03; AI suggestions stay separate drafts and cannot replace these records without the agreed user action. | Isaac | Resolved for US03; no remaining Ready blocker | Approved 2026-10-21 with revision 3 |

## Verification and evidence

Revision4 makes the approved Phase2 home availability explicit under Isaac's specification-amendment/implementation authority; it does not introduce a new product policy or change quantity/price/API rules. Initial independent protected baseline remains historical at b5600c03968bc23cc1d3cc69c47144fca90dcbc2 (r3). First implementation reviews found focus/failed-revalidation/private-state gaps plus omitted authorized currentRevision on conflicts; fixes and test-owner regressions/replacement baseline are recorded in the phase run. Human teammate/accessibility/summary verification is still pending.

Independent design and adequacy reviews established the replacement protected baseline `bd6dcef7fce2027074b95b284ae5965e3c578feb`. Backend31 affected cases passed after the409 correction; prior full backend302 passed against the earlier collected baseline. Frontend14 focused and278 full cases plus production build passed. Final independent behaviour/security review assessed the frozen production diff; a low-year date-validation edge was returned for bounded correction. Real HTTP/isolated Chrome and actual API/database restart preserved invented saved records without reseeding. See the run for precise snapshots, correction results and limitations. Human accessibility/teammate/summary verification and deployment remain pending; manual implementation is not AI role coverage.

| Criterion | Evidence | Status |
| --- | --- | --- |
| manage-preparation-tasks-and-budgets-AC01â€“AC08 | Protected backend31 and UI14 scenarios; independent source reviews; atomic persistence, scope/CAS and exact arithmetic checks | Automated evidence passing; final date correction independently confirmed |
| manage-preparation-tasks-and-budgets-AC09 | Focus/pageshow, private-state/revalidation, validation and uncertain-write regressions; real Chrome320px reflow | Automated evidence passing; human keyboard/NVDA/400% pending |
| manage-preparation-tasks-and-budgets-AC10 | Real PostgreSQL/API restart without reseeding, retained canonical document; minimal audit tests/source review | Local evidence passing; delivery/human review pending |
| manage-preparation-tasks-and-budgets-AC11 | Positive enabled navigation and truthful home count in protected UI tests; full278 pass | Automated evidence passing |

## Revision history

| Revision / date | Change | Approval and evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft from F06-US03 and current RD/SEC rules | Product approval and verification pending |
| 2 / 2026-10-21 | Added proposed manual API/UI contract, strict bounds and DTO, per-participation CAS/atomicity, independent application state, safe recovery and persisted evidence criteria; retained Draft | Defaults and interfaces remain unapproved; scenario design/review and implementation evidence pending |
| 3 / 2026-10-21 | Recorded Isaac's r2 approval plus quantity 1,000,000 and price SGD 1,000,000,000/unit amendments; JSON integer unit prices through 100,000,000,000 cents, aggregate totals as decimal strings, exact UI arithmetic | Ready for independent test/baseline gates under the authorised amendment; no runtime or completion claim |
| 4 / 2026-10-21 | Made approved live preparation home/accurate two-live-one-preview state explicit in new AC11; source/API/numeric rules unchanged | In progress; first independent review repairs and test-owner replacement baseline pending; no new human completion claim |

## Approved current revision 5 amendment - 2026-10-22

Status: proposed exact contract for the user-requested refinement; earlier approved revision/evidence above remains historical and is not reapproved by this appendix. User direction authorises the requested product changes; independent test adequacy/baseline and exact amendment review are pending. No independent agents are used, per Isaac.

Overall budget is a spending limit plus optional cost breakdowns, not an obligation to add a budget line. Add budget.overallLimitMinorUnits: null or strict integer0..100000000000; default null for legacy clients/records. Each internal budget.lines item may have category:null or trimmed1..80 characters; retain internal line IDs, quantity/price/quotation rules and200-item cap. UI uses Overall budget, Cost breakdown, Add item, Item description, Category (optional), never requires a breakdown to save a limit. Server returns remainingMinorUnits as an exact signed decimal string only when a limit exists and all costs are known, otherwise null; knownSubtotal and incomplete-state remain exact. Over-budget values are allowed with a visible warning, not silently capped. Legacy totals/rows migrate unchanged. Adoption preserves the overall limit and adds selected breakdown copies atomically, with categories. Checklist occupies available width: title/status/due date/remove share a desktop row, fields wrap on narrow screens; full titles use wrapping/multiline input, no hidden dates or horizontal overflow. Back to AI preparation returns to same permitted Business/event/participation, warns on unsaved work and never navigates to an external return URL. AC12 limit/categories/exact remaining/boundaries/persistence; AC13 responsive compact20-task checklist; AC14 context-safe Back navigation; AC15 adoption preserves limit and failure state.

## Approved current revision 5 amendment - 2026-10-22

Isaac explicitly approved these amendments and the refinement acceptance plan on2026-10-22. This current amendment supersedes conflicting wording/criteria in the retained previous revision below; unchanged requirements remain authoritative. Historical approvals/evidence are not transferred to new behavior. New executable tests are written by root against the human-reviewed scenarios; independent executable-delta/implementation review remains pending. No subagents or commits.

AC12: Overall budget is a spending limit plus optional cost breakdowns. Add budget.overallLimitMinorUnits:null or strict integer0..100000000000. Default null for old records; omission by legacy writes preserves an existing limit. Each internal lines item may have category:null or trimmed1..80 characters; preserve numeric/quotation rules, IDs and200-item cap. UI labels Overall budget, Cost breakdown, Add item, Item description, Category (optional); never require an item to save a limit. remainingMinorUnits is an exact signed decimal string only if a limit and all costs are known, otherwise null; show overspend warning, allow saving. AC13: checklist fills available width; desktop title/status/date/remove in one compact row, wraps on narrow screens; long titles/dates fully visible. AC14: Back to AI preparation retains exact permitted context and warns on unsaved navigation; no external return URL. AC15: selected AI adoption preserves spending limit and appends category/item copies atomically; rollback/CAS and legacy totals preserved.

Revision 5 /2026-10-22: user-approved Business refinements; test-first failures and implementation/results belong in [the refinement run](../../workflow/agents/runs/2026-10-22-business-refinements-test-plan.md). Human implementation/accessibility review remains pending.

Current AC11 follows the delivered Phase5 home contract (three available business entries), superseding the historical Phase2 two-available/one-preview snapshot. No future feature is falsely enabled by this wording correction.
