# Assign booths and publish setup details

> Current revision 2: the **Approved current revision 2 amendment - 2026-10-22** section below governs changed behavior and supersedes conflicting earlier clauses. Earlier runtime results remain tied to their original revisions; independent review of this refinement is pending.
| Field | Value |
| --- | --- |
| Stable capability ID | assign-booths-and-publish-setup-details |
| Covered stories | [F06-US02](../../docs/UserStoriesAndFeatures.md), booth/setup portion only; status/reason stays in decision r2 |
| Specification revision / status | 2 / In review |
| Product roles / roadmap | Assigned organisers and active business owners; manual journeys |
| Product and contract approval | Isaac approved booth/setup default 2 and implementation/specification-amendment authority default 6 on 2026-10-21. This contract records those choices; human teammate review is separate. |
| Review / run record | [Actual phase run](../../workflow/agents/runs/2026-10-21-f06-implementation.md); test baseline and implementation pending |

## Product outcome, users and scope

An assigned organiser gives an accepted business a booth label and plain-text setup instructions. Saving explicitly publishes the details to that business's active owner. Later confirmed saves can change or remove details. This does not reserve physical space, promise exclusive booth-label use, publish a programme item, change an application decision or grant organiser access to business preparation. The business sees current details beside its existing application outcome.

## Use cases and user interface

The organiser opens an accepted submitted application, reviews existing setup, edits Booth label and Setup instructions, and reviews an explicit confirmation before Save setup. Cancel sends no write. A removal displays the exact cleared details before confirmation. The business application detail shows the saved booth/instructions or Not assigned / No setup instructions yet, never fabricated facts. Use shared UI r4 labels, keyboard/focus, pending feedback, safe errors and context revalidation; private text stays memory-only and departed-context responses are ignored. An uncertain save reconciles authorized GET before another explicit save, never blind replay.

Accessible controls: `Save setup` opens `Confirm setup details`, final `Publish setup`, or `Cancel`. Confirmation binds exact participation, loaded revision and normalized editable facts; editing invalidates the prior confirmation. Uncertain-response reconciliation compares normalized booth/instructions under the same current actor/context, adopts the canonical revision on a match, and otherwise requires explicit review/save. Malformed UUID paths are safe422 validation errors. Labels may be reused between businesses; no uniqueness/reservation guarantee is implied.

## Inputs, outputs and functional contract

All paths prefix `/api/v1`; camelCase strict JSON. `SetupDetails v1` is `{participationId,eventId,revision,boothLabel,setupInstructions,updatedAt}`; revision is positive integer; updatedAt is UTC timestamp or null before first save. Optional facts are null or trimmed nonempty plain strings, boothLabel at most100 Unicode codepoints, setupInstructions at most5000. Empty trimmed strings normalize null. Unknown fields/nonstrings are rejected. No content is executable markup.

| Method/path | Scope | Result |
| --- | --- | --- |
| GET `/organiser/events/{eventId}/participations/{participationId}/setup` | Current assigned organiser; matching accepted application/participation | SetupDetails |
| PUT same | Same authority, trusted Origin; `{expectedRevision,boothLabel,setupInstructions}` with both fields required | Canonical saved SetupDetails |
| GET `/business/participations/{participationId}/setup` | Current active owner of participation's business | Own SetupDetails; pending/rejected has empty details |

Absent setup is a virtual empty revision1 without read-time writes. Every successful PUT advances the independent setup revision exactly once, including clearing or same-content saves. `expectedRevision` is a strict positive JSON integer, excluding bool/string/float. Full replacement and minimal attributable `setup_save` success audit commit atomically. First-save/update races have one winner; stale requests return409 `revision_conflict`, without mutation. The current authorized setup revision may be returned only after normal authorization. There is no application/participation/preparation revision mutation or separate setup draft/publication state.

Use existing no-store RFC9457 safe errors:401 unauthenticated,403 forbidden/password_change_required,404 not_found,409 revision_conflict,422 validation_error,500 internal_error,503 service_unavailable. Wrong-event/absent/nonaccepted organiser targets are404 after event authorization; foreign/absent business targets are indistinguishable404. Failed/denied/stale operations preserve setup, all other domains and prior audits except permitted minimal failure audit metadata. Never return raw exceptions or submitted values in validation errors.

## Constraints, security and non-functional requirements

RD01/RD02; SEC01/02/03/08/11/12. Resolve current stored identity, role, completed password replacement and membership at every read/write. Origin applies to writes; all outcomes no-store. Business owners cannot assign setup; organiser assignment does not grant preparation/budget access. Membership revocation takes effect on subsequent requests. Keep frozen submission, decision and private preparation intact. No provider call is part of this capability. Human accessibility and online/environment delivery evidence remain separate obligations under workflow; the manual feature supplies no role LLM coverage.

## Acceptance criteria and story traceability

| ID | Observable criterion | Trace | Verification |
| --- | --- | --- | --- |
| assign-booths-and-publish-setup-details-AC01 | Assigned organiser saves/updates/clears accepted participation setup at its current independent revision; owning business reads identical canonical details. | F06-US02; RD01/02 | Both roles, persistence, null normalization and replacement |
| assign-booths-and-publish-setup-details-AC02 | Absent setup reads empty revision1 without writes; concurrent first saves/updates yield one winner; stale writes preserve winning data. | F06-US02; SEC11 | Real database/CAS and no-write read |
| assign-booths-and-publish-setup-details-AC03 | Anonymous, wrong role/event/business, revoked members and mandatory-change actors cannot gain reads/writes; business write and organiser private-preparation access remain denied. | F06-US02; SEC01/02 | Direct scope matrix and before/after state |
| assign-booths-and-publish-setup-details-AC04 | Invalid field/type/bounds/Origin and nonaccepted targets fail without changes; success audit and setup commit together or roll back. | F06-US02; SEC08/11 | Strict validation, audit failure, unrelated-domain invariants |
| assign-booths-and-publish-setup-details-AC05 | UI confirms exact published change, cancels without writing, shows current business facts/missing state and safely handles conflicts, uncertainty and context loss. | F06-US02; SEC01/02/03 | Consumer tests plus actual browser/keyboard checks |
| assign-booths-and-publish-setup-details-AC06 | Additive upgrade and fresh reconnect preserve saved setup plus all historical application/decision/preparation records; no reservation/publication side effects. | F06-US02; SEC11/12 | Migration, real persistence/restart and integration |

## External interfaces and dependencies

Consumes CurrentActor v1, existing owned participation and immutable accepted decision projection from decision r2. Business preparation owns setup records; consumers read this contract rather than write its tables. SetupDetails v1 is the authoritative versioned producer for business AI grounding. Additive migration after the current shared head; do not rewrite applied history. Preparation remains independent and readable without setup.

## Decisions and approval

Isaac approved organiser-only assignment to accepted businesses, save-to-publish visibility, updates/removal and no programme publication/reservation, plus authorised related spec/API amendments. Default text bounds and versioned read/write contract above implement that bounded direction. No new product decision is delegated to AI. Speaker support, allocations/reservations, public setup visibility and external messaging remain excluded.

## Verification and evidence

Independent design/reviews established initial baseline2db4a2f, reviewed fixture/portable-name/selector corrections at3639174, then same-actor approval/reconciliation regressions at `d7762e149599f2ebc97d9fc7fa974acc7bfae16f`. Backend18 focused/320 full and frontend18 focused/296 full tests plus production build pass. Both independent affected reviews resolved the stale-identity blocker at the same final source fingerprint recorded in the run. See the [setup phase run](../../workflow/agents/runs/2026-10-21-business-setup-implementation.md) for exact snapshots, actual agents and failed-attempt attribution. Human teammate/accessibility/summary review remains pending. No deployment, provider integration or Completed claim.

| Criterion | Current evidence | Limitation |
| --- | --- | --- |
| AC01â€“AC04 | HTTP/PostgreSQL role/state/bounds/CAS/audit rollback and domain preservation cases;18 focused/320 full backend tests; independent server source reviews | Local evidence, not deployment/human signoff |
| AC05 | UI confirmation/cancel/edit invalidation/unknown-write recovery/inert text/foreign-reference/identity swap cases;18 focused/296 full pass; both affected independent reviews pass; real Chrome organiser publicationâ†’business visibility | Human keyboard/NVDA/400% pending |
| AC06 | Retained0006â†’0007 migration, every old table's row fingerprint unchanged; actual database/API restart preserved setup and manual preparation without reseeding | Synthetic local environment; online delivery remains separate |

Preimplementation contract review: actual security reviewer `/root/preparation_security` reported no blocking specification findings; test designer `/root/preparation_scenarios` supplied positive/adverse/race/atomicity/UI scenarios and the path/confirmation/reconciliation clarifications above. These are read-only contract reviews, not runtime or executable-test adequacy evidence. Both remain to be performed at the phase baseline.

## Revision history

| Revision/date | Change | Evidence impact |
| --- | --- | --- |
| 1 / 2026-10-21 | Contract for approved booth/setup defaults; new IDs AC01â€“06, no reuse of retired decision AC06 | Product direction authorised; independent baseline and implementation gates pending |

## Approved current revision 2 amendment - 2026-10-22

Status: proposed exact contract for the user-requested refinement; earlier approved revision/evidence above remains historical and is not reapproved by this appendix. User direction authorises the requested product changes; independent test adequacy/baseline and exact amendment review are pending. No independent agents are used, per Isaac.

Supersedes r1 save-is-publication behavior: Save setup persists an organiser-only draft; Publish setup explicitly confirms and publishes the exact saved draft and revision. Business readers and AI consume only the last published facts, never an unpublished draft. Existing published records migrate as published; further draft edits leave them visible. Separate draft revision and published revision; CAS on both, expected draft revision on publish, current assigned-organiser and accepted-participation checks. POST organiser setup path /publish accepts {expectedRevision}; no content in publish payload. Concurrent/stale/replayed publication cannot duplicate effects; same already published draft is an idempotent read. First draft save does not create published facts; business revision remains1 until first publication. Published revision advances only on actual publish. AI freshness is bound to published revision: draft save does not stale AI, publication does. Business DTO SetupDetails v1 remains published-only; organiser GET/PUT returns draft details plus publishedRevision and published facts/state. Save/publish/audit/rollback remain domain-owned transactions. AC07 draft save never publishes, published preservation/restart; AC08 exact confirmed publish/CAS/ownership/AI freshness.

## Approved current revision 2 amendment - 2026-10-22

Isaac explicitly approved these amendments and the refinement acceptance plan on2026-10-22. This current amendment supersedes conflicting wording/criteria in the retained previous revision below; unchanged requirements remain authoritative. Historical approvals/evidence are not transferred to new behavior. New executable tests are written by root against the human-reviewed scenarios; independent executable-delta/implementation review remains pending. No subagents or commits.

Supersedes r1 save-is-publication. AC07: Save setup persists an organiser-only draft; Business and AI read only last published facts. Existing records migrate as published. Draft edits never change published content/revision or stale AI. AC08: separate Publish setup confirmation publishes the exact saved draft revision through POST organiser setup path /publish {expectedRevision}; current assigned organiser/accepted participation, Origin, CAS and atomic audit enforced. Publishing the same saved revision again is idempotent. First draft save leaves Business empty revision1; published revision advances only on publication. Organiser DTO extends draft details with publishedRevision/published facts/state; Business SetupDetails v1 remains published-only. Publish changes, not draft saves, invalidate AI source freshness.

Revision 2 /2026-10-22: user-approved Business refinements; test-first failures and implementation/results belong in [the refinement run](../../workflow/agents/runs/2026-10-22-business-refinements-test-plan.md). Human implementation/accessibility review remains pending.
