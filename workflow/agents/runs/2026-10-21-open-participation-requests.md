# Open participation requests and actionable failures

Date: 2026-10-21, Asia/Singapore. Orchestrator: `/root`. Branch: `itzxitzx/basic-business-features`.

## Request, approval and scope

Isaac reported unclear same-password replacement errors, UUID event labels and inconvenient off-platform Business ID eligibility grants. He explicitly required approval before spec, documentation or code changes. Root and `/root/change_scope_analysis` first investigated read-only; no mutations occurred in that phase. Root proposed four amendments and precise defaults, then Isaac answered **approve**.

Approved: access/shared UI revision 4, submit revision 4 and bounded decision revision 2. The application itself is the participation request. Assigned organisers explicitly open applications, default closed; businesses browse named open events and their own existing application contexts. Closing blocks new drafts/submission, preserves editable existing drafts and reviewable submissions. Decisions are once-only accepted/rejected; rejection reason requires 1-1000 trimmed characters, acceptance reason optional up to1000. Legacy grants/history remain intact and confer no acceptance. No automatic date cutoff, resubmission, reconsideration, booth/setup, AI or production deployment was introduced. RD01-RD07 remain authoritative.

The earlier explicit exception permits frontend/backend work while upstream human, summary and NVDA checks remain pending. It does not permit false human verification, a Completed claim, push, merge or deployment.

## Actual agents and ownership

| Actual identity | Responsibility and handoff |
| --- | --- |
| `/root` | Orchestrator; approval/contract coordination, shared docs, service/DB serialization, local baseline commits, Chrome integration and logs |
| `/root/change_scope_analysis` | Specification analyst; read-only initial investigation |
| `/root/approved_request_contract` | Specification analyst responsibilities; only four approved specs. Applied draft-spec only to the existing Draft decision spec; non-Draft amendments were outside that skill. Root owned readiness/evidence metadata. |
| `/root/request_tests` | Independent test owner; plan, TCRs, acceptance tests and fixtures; no production source |
| `/root/request_backend_developer` | Backend source, new additive0004 and exported OpenAPI; no historical migrations or protected tests |
| `/root/request_frontend_developer` | Frontend source; generated schema remained root-owned; no tests/configuration/DB/services |
| `/root/request_behaviour` | Independent saved-test and implementation review; final full frontend rerun and baseline guard; no source/test edits |
| `/root/request_security` | Independent contract/test/security reviews and final baseline guard; no source/test edits |

Custom test/behaviour/security roles used their configured Sol/high models. Contract/backend/frontend workers used explicit generic Sol/high escalation under the repository workflow for authentication, shared contracts, migration and private lifecycle risks; fixed read-only role configurations were not modified. Workers were told they were not alone and to preserve all previous dirty work. No simulated roles or nested delegation.

## Contracts and implementation

CurrentActor v1 is unchanged; scoped organiser event summaries supply titles/dates/timezone. Submissions owns application_settings with independent settings revision and application_decisions. Programme eventRevision retains metadata meaning. Shared Event FOR UPDATE locks serialize settings/create/submit without writing Programme metadata. Settings reads have a virtual false/revision1 default without inserts.

Decision CAS uses the submitted RECORD revision n+1, produces n+2, and preserves frozen content revision n and submittedAt. Application state, one unique decision and minimal success audit commit atomically; no Business preparation/booth writes. Legacy grant endpoints return scoped410 without writes. Closed create without an own application is indistinguishable from absence. Only submitted/decided applications reach organisers.

Auth checks current password before reporting reuse; specific codes occur only on authenticated replacement. Login/registration privacy remains generic. Fixed field/code allowlists never render raw server detail. UI recovery distinguishes definite failure from uncertain writes and requires authoritative reads before supported retry. Password `/me` cannot establish which password is stored.

## Independent baseline history

Starting protected baseline: `254bc0507788c0ef1c255ad2238e3894eb4e798b`. Prior44-file source `ec6ec8893f42d18f29970f8ac780da813e0fad32902b86c7c9287c1e14acd3b6` was preserved, not staged wholesale.

| TCR / local baseline | Reason, independent review and actual checks |
| --- | --- |
| [REQ-TCR-01](2026-10-21-request-flow-test-change.md), `431564f99a90a7552e5a00e0b7075c24efc55b13` | Both reviewers approved scope before edits and exact saved candidate afterward. Mapped obsolete eligibility/v1 expectations to approved settings/v2 contracts, retained negative/CAS/privacy/history/audit assertions and unchanged harness. Added auth and decision scenarios.195 backend/167 frontend collected; TypeScript passed. Meaningful RED: missing named endpoint, old password code/reason, UUID label. Eight-file fingerprint `28716b1edfd86813d5829003a330e71062c850d76accf9df590d27de61f403f7`. |
| [REQ-TCR-02](2026-10-21-request-flow-test-change-02.md), `58d324be4b993c045866e4bc9d455c822ae721f8` | Upgrade fixture used a61-character prefixed UUID, invalid under historical/current43-character URL-safe cookie rules. Both reviewers classified genuine fixture error. Owner changed only import/constructor to secrets.token_urlsafe(32), retaining every assertion; targeted upgrade passed1/3.26s. Exact saved diff independently approved. |
| [REQ-TCR-03](2026-10-21-request-flow-test-change-03.md), `4e11b32670b93320129bc0a0a208e1ffcf989bfa` | Full run193/195 exposed residual old assertion forbidding required decision:null and hostile test URL correctly flagged by unchanged secret scanner. Both reviewers approved replacing only that assertion with null plus retained no-booth/acceptance/setup checks, and only HOSTILE URL with credential-free HTTPS retaining private/script markers. Owner affected backend2 passed1.82s and frontend6 passed2.97s; exact diff independently approved. Missed initial adequacy defects are recorded, not hidden. |
| [REQ-TCR-04](2026-10-21-request-flow-test-change-04.md), `6a9f01c15796509ec11db968090139149c6688c6` | Review found real frontend bugs: Unicode code-unit mismatch, old password form retained after authoritative actor replacement, and organiser input lost during identity revalidation. Both reviewers approved six additive public-App cases before edits and exact saved cases afterward. All six meaningfully failed against initial source in7.11s; no prior assertions/fixtures/config changed. After the new baseline, developer repaired source; six passed4.67s and full173 passed28.08s. |

The initial test-authoring replacement incorrectly changed an unrelated invalid-registration expected code; independent review caught it and the owner restored validation_error before the first freeze. Missing optional reason, malformed requests and new mutation recovery cases were also added before freezing. A harmless trailing blank-line diagnostic in the first plan was retained in the reviewed baseline. No developer edited tests or runner/configuration. All local commits above are protected test/spec freezes; feature source remains unstaged/untracked as before. No push/merge/deploy.

## Final snapshot and independently attributed results

Final implementation: **45 files**, fingerprint `a9b755d3120f94b9bf85278d7753eec7ff2fa9944ca9531ade46a5c5bc4508e6`.
Recipe: sorted unique `git ls-files --cached --others --exclude-standard -- backend/app backend/alembic backend/openapi.json frontend/src`; SHA256 raw bytes per file; SHA256 compact JSON array of `(path, hash)` rows.

Backend subset30-file fingerprint `cc1fb034ff272d2410daa6d807ac9e9a022b49c86edfd564007e0cac44aecf93` uses backend roots plus frontend/src/api-schema.d.ts. Backend source did not change during final frontend repairs.

| Check / executor | Actual result and boundary |
| --- | --- |
| Backend developer, `uv run pytest -q` | **195 passed**,186.99s; one existing Starlette/httpx deprecation warning. Disposable5433 only, explicit reset guard and venv PYTHONPATH for historical subprocess tests. |
| Frontend developer | **173 passed**,28.08s; production build passed (`index-DFyGvM-Q.js`), existing bundle-size warning; whitespace check passed. |
| Behaviour reviewer | Independently reproduced final45-file fingerprint, ran full frontend **173 passed**,28.64s, full22-path guard and whitespace check passed. No independent DB/browser run claimed. |
| Security reviewer | Independently reproduced final fingerprint and full22-path guard; scoped security approval, no unresolved finding. Static review, not own runtime test execution. |
| Root | Generated API types passed; fresh migrations and API readiness passed; final secret scan zero findings; browser evidence below. |

Both reviewers approved final code after fixes. Response reasons now count code points. Authoritative password actor replacement purges old secrets; same-actor state remains uncertain. Provider-owned organiser memory is scoped to actor/event/application, concealed during validation, pruned on confirmed loss, and preserved through permitted navigation with warnings. Persisted uncertain/in-flight markers prevent blind retries; departed responses cannot change the new view. Review confirmed exact lock/transaction boundaries, beyond what barrier-race tests alone establish.

## Browser, persistence and environment evidence

Owned synthetic container `eventapp-requests-20261021-postgres`, port5440, database eventapp_verified; API8010; production Vite preview5180 with runtime proxy only; isolated headless Chrome156/CDP9223. Default user dev db5432/API8000/UI5173 were already running and were not stopped or mutated. Read-only default DB check showed revision0003 and existing records; user must run the guide's additive upgrade before using new local endpoints. No dev database reset.

[Initial browser results](evidence/2026-10-21-open-participation-requests/browser-results.json):36 checks at pre-repair45-file snapshot124d67a5...; actual password errors/replacement, named/default-closed settings, cancel/open, private draft without Business ID exchange, closed editing/discovery, freeze/submit, approval/rejection/reasons/owner views/foreign404, closed review,320CSSpx/reduced-motion simulation, no web storage/HttpOnly cookie, exact full records/settings after actual API AND PostgreSQL restarts without reseeding, keyboard ShiftTab/Enter Overview/signout, server revocation and private-history protection.

[Final browser results](evidence/2026-10-21-open-participation-requests/final-browser-results.json):13 checks on final build/fingerprint, including same-scope reason recovery via controlled focus, settings pageshow/navigation warning/cancel/Overview return with no write,1,000-code-point emoji decision through UI/API and both reload views, exact frozen content/time preservation,320CSSpx Unicode reflow and no private web storage. Root visually inspected normal/narrow and final Unicode screenshots. Rapid headless bring-to-front was inconclusive for native focus events; controlled window events explicitly exercised real API revalidation and are labelled as such.

Browser harness corrections: Accepted text initially matched the pending confirmation rather than settled response; authoritative API state confirmed success and the wait was corrected. Keyboard harness initially assumed Signout existed directly on applications and ignored its decorative arrow; correct path uses Overview. Final navigation helper waited for ready links and instant scrolling before pointer input. These were harness corrections, not claimed product bugs. A small-viewport helper initially clicked below the viewport before scrolling; corrected without source changes.

Normal shell/CUA sandbox startup failed earlier in this conversation; elevated exec and isolated CDP were used. Automatic approval review rejected an initial wholesale service rewrite for possible dirty-work overwrite; contextual patches safely completed it, with no rejected mutation or remaining block. Preliminary empty synthetic0004 used VARCHAR; reason boundary exposed DataError before CHECK, corrected to Text plus unchanged bounded CHECK. Fresh eventapp_verified was migrated afterward; only disposable5433 was reset. No retained user schema was rewritten.

## Remaining human gates

Human teammate/code review, summary correctness verification, Chrome+NVDA, actual400% browser zoom and comprehensive WCAG/visual sign-off remain **Pending**. Controlled reflow, AX/unit tests and reviewer agreement do not establish conformance. Production retention/recovery/abuse controls, role LLM coverage and online release gates remain outside this slice. Specs are **In review**, never Verified/Completed. No push, merge or deployment.

## Final protected set

Baseline `6a9f01c15796509ec11db968090139149c6688c6`; all22 paths below remain protected. TCR04 is additive and frontend-only; final scanner/guard were refreshed after its addition, backend195 results remain bound to unchanged backend source/tests.

```text
backend/tests
frontend/tests
backend/pyproject.toml
backend/uv.lock
frontend/package.json
frontend/package-lock.json
frontend/vite.config.ts
workflow/agents/runs/2026-10-19-authentication-test-plan.md
workflow/agents/runs/2026-10-19-auth-test-change.md
tools/check_test_baseline.py
workflow/agents/runs/2026-10-20-business-applications-test-plan.md
workflow/agents/runs/2026-10-20-business-applications-test-change.md
workflow/agents/runs/2026-10-20-business-applications-test-change-02.md
workflow/agents/runs/2026-10-21-business-frontend-test-plan.md
workflow/agents/runs/2026-10-21-business-frontend-test-change.md
workflow/agents/runs/2026-10-21-business-frontend-test-change-02.md
workflow/agents/runs/2026-10-21-business-frontend-test-change-03.md
workflow/agents/runs/2026-10-21-request-flow-test-plan.md
workflow/agents/runs/2026-10-21-request-flow-test-change.md
workflow/agents/runs/2026-10-21-request-flow-test-change-02.md
workflow/agents/runs/2026-10-21-request-flow-test-change-03.md
workflow/agents/runs/2026-10-21-request-flow-test-change-04.md
```

Cleanup completed: closed only the isolated Chrome profile, identity-verified owned API8010 and preview5180 process trees, stopped owned PostgreSQL5440 and the disposable test service started for this run. Removed the never-started failed Compose container/network without deleting volumes. Verified the resolved temporary profile stayed directly under TEMP with the exact owned GUID prefix before recursive deletion; removed only named helper/log files. Remaining listeners are the original user services5173/PID1624,8000/PID15392 and5432. No temporary listener remains; synthetic volume and stopped integration container are retained. Final standalone scanner initially used an incorrect module path, then passed from backend/tests with zero findings. No action remains blocked by approval review.

Final root checks: source fingerprint still matches the approved45-file snapshot; all22 protected paths match the immutable baseline; secret scanner reports zero findings;13 changed documents have no missing local link targets. Metadata-only trailing blank lines in two specs were normalized. No source changes followed final review or browser verification.
