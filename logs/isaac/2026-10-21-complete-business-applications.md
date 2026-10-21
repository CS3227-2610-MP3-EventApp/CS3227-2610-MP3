# Complete Business application journey

- Date/timezone and session owner: 2026-10-21 Asia/Singapore / Isaac.
- Feature/task and branch: F06-US01 frontend completion; `itzxitzx/basic-business-features`.
- Source coverage: visible user questions and approval answers, saved [frontend run](../../workflow/agents/runs/2026-10-21-complete-business-applications.md), recorded checks and agent handoffs. Earlier assistant replies are not all available verbatim; no exact missing delivery-order answer is reconstructed.
- AI factual check: checked against the available conversation and attributed run evidence; this retrospective does not replace human review.
- Human verification: **Pending**. Reviewer/date/corrections not supplied.

## Prompts and interactions

Following the backend-only phase, Isaac asked what frontend integration meant and how to test manually using Git Bash. He then asked which spec had been completed, which spec/F would own the frontend, why frontend work had not been implemented to finish the spec, and what order of specs would fully deliver F06-US01 including the current work. These scope and completion questions were only briefly represented in the earlier log and are now recorded explicitly.

The record-supported resolution was that application r2 delivered a bounded backend slice, still In review, while usable Business/organiser screens remained missing. The screens belonged in the existing `submit-business-applications` capability; a separate feature label was not needed merely to add a frontend. Shared UI approval and an exact frontend amendment were prerequisites for that continuation. Other Business features and booth/setup work remained separate; the delivery-order discussion itself did not authorize their implementation.

Isaac then instructed: fully complete F06-US01 before guiding manual testing. Root started actual contract, test and readiness agents and prepared a concrete frontend amendment. Isaac answered "Approve revision 3; Chrome + NVDA", then "Approve r3 and proceed with human checks pending". The latter explicitly extended the earlier backend-only exception while retaining independent tests/reviews and pending human verification.

After implementation and browser checks, root updated the Git Bash website/API guide. The later request for clearer password errors, named events and a more convenient participation-request journey begins [the next log](2026-10-21-open-participation-requests.md); it supersedes this phase's known-ID eligibility interaction without rewriting its historical evidence.

## Decisions and actions

The approved r3 frontend added Business discovery for eligible events, complete draft creation/editing, saved-content review and separate confirmation before frozen submission. Organiser screens provided known-ID eligibility approval and submitted list/detail. That policy followed Isaac's earlier requirement for invitation or organiser approval before applying; application acceptance/rejection and booth assignment were outside this r3 slice. The backend r2 contract stayed unchanged.

Actual assignments were `/root/f06_frontend_contract` (specification analyst), `/root/f06_frontend_tests` (independent test owner), `/root/f06_frontend_readiness` (behaviour verifier), `/root/f06_frontend_security` (security reviewer) and `/root/f06_frontend_developer` (developer). Root owned integration, approval/run/log records and service coordination. The developer used explicit Sol/high escalation for shared authentication/privacy integration under the repository policy; read-only preparation preceded the protected baseline. Role configuration was not modified. Reviewers did not implement their own reviewed changes.

| Protected baseline / correction | What changed and why |
| --- | --- |
| `ad41fca42c1517907bc76c1f1e47bffc8eb63657` | Reviewed initial 49 application cases and the approved historical preview-card expectations. Meaningful initial missing-UI RED was 31 failed/3 passed from the earlier 34-case subset; the final expanded 49 collection was separately checked. |
| `379a2eb7038ba7fefffbc2f711907665394aa9bf` / APP-UI-TCR-02 | One keyboard journey completed every assertion in 5.83s, beyond its incidental 5s execution budget. Independent classification preceded a test-owner-only 10000ms per-test timeout. Actions/assertions/global runner and product 200ms/10s requirements were unchanged. |
| `254bc0507788c0ef1c255ad2238e3894eb4e798b` / APP-UI-TCR-03 | Independent review found history/context input leakage and overbroad membership-reorder invalidation. Owner added three tests that all failed meaningfully before source repair; old assertions remained intact. |

Native CUA failed during Windows sandbox initialization. Root established an isolated Chrome/CDP fallback without downloading browser tooling, used a separate synthetic database volume and confirmed browser-to-API transport before claiming journey coverage. Existing dirty work and retained development data were preserved. Only local test/spec/run baseline commits were made; feature source remained working-tree changes. No push, PR, merge or deployment.

## Verification and limitations

Final r3 source snapshot:44-file fingerprint `ec6ec8893f42d18f29970f8ac780da813e0fad32902b86c7c9287c1e14acd3b6`; protected baseline `254bc0507788c0ef1c255ad2238e3894eb4e798b`,17 paths. These are historical r3 results, not the later r4 state.

- Developer: normal 127 frontend tests and production build passed.
- Behaviour verifier: independently ran all 127 tests, checked the full baseline before/after and matched the exact source hash.
- Security reviewer: independent scoped review approved the same final snapshot with no unresolved blocking finding; runtime evidence was attributed rather than claimed as its own execution.
- Root: real Chrome production UI/API/PostgreSQL journey passed, including keyboard entry/confirmation, private drafts, freeze/reload, logout/history,320px layouts, actual API and database restart persistence without reseeding, and controlled pending feedback at4ms/10018ms. Screenshots were visually inspected.
- Prior backend 125-test evidence remained explicitly historical and was not claimed as rerun by this frontend phase. Existing bundle-size advisory remained.

Cleanup stopped only owned Chrome/profile, preview and synthetic database services; exact helper/log files were removed after evidence copy and retained volumes were preserved. No listeners remained on the tested ports at that cleanup point; this did not assert they would remain stopped in later phases. Final protected-path, role/link and whitespace checks passed.

Human teammate/auth/foundation review, summary correctness verification, NVDA, actual400% browser zoom and comprehensive accessibility/production sign-off remained Pending. The spec stayed In review. Controlled reflow/AX checks did not establish WCAG conformance or human verification.

## Reflection and next steps

### Orchestrator and agent performance

| Participant | What worked | Issue and correction |
| --- | --- | --- |
| Orchestrator | Obtained the explicit frontend/continuation approvals, coordinated independent test ownership, isolated browser/DB work and prepared manual guidance after exercising the implemented journey. | Earlier backend-only delivery did not satisfy the usable end-to-end outcome. Isaac's repeated scope questions show root needed to explain the remaining frontend work more clearly at the first handoff. "Backend implemented" should not sound like "F06-US01 fully completed". |
| Analyst | Kept frontend scope in the existing capability, retained r2 backend boundaries and distinguished approved presentation work from remaining human checks. | Exact UI/frontend approval was still required; root did not infer it from earlier defaults or silence. |
| Test owner | Created independent stateful acceptance fixtures, preserved historical adverse cases and handled test changes through documented independent review. | The keyboard execution budget required a justified harness correction, and initial lifecycle coverage missed history/reorder cases later found by reviewers. The owner added protections before the corresponding fixes. |
| Developer | Initial43/49 results were followed by source fixes; protected tests stayed owner-controlled. Final 127 passed. | A full 124-case run exposed four failed-logout feedback regressions. Later review found departed-context input surviving early returns and whole-membership comparison discarding still-authorized input. Source repairs retained a scope-safe notice, purged departed memory and made membership handling selective. |
| Independent reviewers | Found consequential privacy/state issues after initial test success, required meaningful regressions and independently rechecked the final snapshot. | Initial adequacy and passing tests did not expose every lifecycle path. Their findings demonstrate the value of source review beyond fixture-based green tests, not proof of exhaustive coverage. |
| Root browser harness | Exercised real production UI, cookies, storage and restarts separately from mocks. | Link/button labels, native Enter payload and API process lifetime/tree assumptions caused failed attempts. Root corrected the harness and owned-process handling without changing product expectations to make it pass. |

The process delivered the usable r3 journey and exposed privacy regressions, but required several correction cycles. Completion still depended on actual human/accessibility review. The next user-directed phase replaced the awkward eligibility-ID handoff with open events and submitted requests; it should be read as a later approved change, not silently applied to this phase's test results.
