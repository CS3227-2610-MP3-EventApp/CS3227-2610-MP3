# Programme browsing consumer test plan

Status: Independently reviewed scoped executable acceptance suite; final exact-source execution conditions satisfied; baseline SHA pending orchestrator commit.

- Feature/story: Yik Bing F01-US03 attendee browsing consumer, create-and-publish-programme AC11–16 and relevant F01-AC04/05. Backend publication and other contributors' work are outside this execution slice.
- Contract: requester-approved revision-7 browsing read proposal; parent records approval in revision 8 without changing behavior. CurrentActor v1 / access-authorised-workspaces revision 3 remains the identity source. Full producer/contributor agreement and complete capability readiness remain pending.
- Designer: actual `/root/browse_scenarios`, acting as test_case_designer from `.codex/agents/test_case_designer.toml`; orchestrator `/root`. Independent behaviour `/root/browse_behaviour_review` and security `/root/browse_draft_review` assess final adequacy separately; their early race/route/credential findings were incorporated, not counted as final approval.
- Branch/base: `feat/yikbing-programme-browsing`, `07a5666b7ebb80ef462025fbfa1798c9676f1ee8`. Existing three-file documentation diff preserved.
- Owned additions: `frontend/tests/acceptance/programme-browsing.test.tsx`, `frontend/tests/fixtures/programme.ts`, this plan and [BROWSE-TCR-01](2026-10-20-browsing-test-change.md). A separately approved narrow correction may touch the affected role-home test only.
- Original auth baseline: `d60152a1b7ad78c90b5a7b26499eb1cb6b63e151`; frontend/tests and runner/config are protected by the authentication run. No new baseline commit exists. Developer may not alter these artifacts after review/freeze.

## Harness and commands

All executable cases render the actual App through existing `renderPrototype`; no missing feature module imports. `installProgramme` wraps the existing auth fetch fixture, preserving real App `/me`, login/logout and password flow interactions with that fixture. Only programme HTTP responses are assigned synthetic fixtures. Held responses intentionally survive abort to exercise UI stale-response suppression. Fetch is mocked; no real cookie/session, server, database, producer or deployment is exercised.

Use the frontend working directory. Canonical reviewed runner uses bundled Node24.19.0 and Vitest4.1.11 with TZ=UTC, serial maxWorkers1 and testTimeout30000. Earlier system-Node/default-timeout diagnostics remain historical evidence only; record the actual executable used. Parent installs locked dependencies with scripts disabled. Test commands require sufficient process permission for esbuild on this Windows host.

- Focused pre-implementation: `node node_modules/vitest/vitest.mjs run tests/acceptance/programme-browsing.test.tsx --reporter=verbose --maxWorkers=1 --testTimeout=30000`, with `TZ=UTC` set so Singapore display cannot accidentally use the runtime default.
- Corrected prototype regression: same command selecting `tests/acceptance/session-and-homes.test.tsx`.
- Full frontend: `node node_modules/vitest/vitest.mjs run --maxWorkers=1 --testTimeout=30000`, with `TZ=UTC`.
- Compile harness: `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit`.

No full-suite command or runtime version is frozen until independent review. Per-test timeout accommodates slow local App imports; it is not a product latency target. Do not call process/spawn errors, dependency issues or timeouts meaningful behavior RED.

## Executable cases

All cases are UI acceptance at a mocked HTTP boundary in `programme-browsing.test.tsx`; PB identifiers are literal test-name prefixes. Every fixture is synthetic. No test asserts mock server filtering as actual enforcement.

| Case | Criterion | Setup, action and expected observable result |
| --- | --- | --- |
| PB01 | AC11/14; UI accessibility | Attendee without event memberships; keyboard-enter existing Browse Programme action; render two returned events; requests use explicit same-origin/include credentials and GET. |
| PB02 | F01-AC04/05; AC14/16 | Choose event/item; detail request and stored fixture facts appear, including SGD12.50, declared capacity, room, venue/address, separate accessibility/unknown; no seats-remaining guarantee or programme mutation request. |
| PB03 | AC13/14 | UTC process receives Singapore overnight instants; show 23:30 on20Oct and01:00 on21Oct (12/24-hour formats accepted), and zero-price item as Free. Backend overlap selection remains deferred. |
| PB04 | AC14 | Enter literal STRASSE/percent/underscore/backslash/quote text plus workshop/date; outgoing event-scoped query carries all three; render assigned response and replace unrelated rows. Does not prove server casefold/AND. |
| PB05 | AC14 | Advance page, change/clear search; restriction clears and query resets to offset0. Live filtering or explicit Apply/Search allowed. |
| PB06 | AC14 | Twenty synthetic event summaries then final page; Next sends offset20/default20; replaces old rows and hides/disables Next when hasMore false. No cross-request snapshot assertion. |
| PB07 | AC14 | Twenty published item fixtures then final one; corresponding item paging/replacement/hasMore behavior. |
| PB08 | AC15 | Hold event response; accessible loading status, no invented event; settle promise and show returned events. |
| PB09 | AC15 | Empty event page; understandable no-events state without failure/retry. |
| PB10 | AC15 | Search returns empty item page; no-match state replaces old results and is distinct from failure. |
| PB11 x2 | AC15 | Network exception or generic503; alert/retry rather than no-events; successful retry renders returned events. |
| PB12 | AC14/15 | Valid title/type/date request fails503; preserve controls and resend all three values on retry; returned item appears. |
| PB13 x2 | AC14/15 | Detail403 or404; appropriate forbidden/unavailable feedback; no stale price/accessibility detail retained as successful detail. |
| PB14 | AC11/15 | Hold older search, newer search returns401; clear programme facts, show authentication feedback; settle older response and do not restore content. |
| PB15 | AC15 | Hold old title search, complete newer search; settle old response after newer result and keep selected query's rows. |
| PB16 | AC15 | Hold eventA items, select eventB from catalogue, then settleA;B remains and staleA never appears. Navigate using accessible back-to-events action or actually discovered catalogue URL, not an invented pathname. |
| PB17 | AC11/15 | Hold old request, real UI logout through auth fixture, then log in another synthetic attendee and reopen the same event items with a distinct fresh title; settle old promise only after that new identity item is visible; fresh content persists, old content absent immediately and after leaving/reopening the item list. |
| PB18 | AC14; SEC02/03 | Server-projected title contains img markup; render literal text and create no injected image element. |
| PB19 x2 | AC11 | Organiser/business home plus forged attendee browser state; no attendee Browse action or programme fetch. Positive existing-guard controls. |
| PB20 | AC11 | No server actor plus forged browser attendee state; existing home redirects to login, no programme fetch or facts. Positive existing-guard control. |
| PB21 | AC14/15 | Assigned generic422 after valid UI search; visible validation/request failure, not no-match. Server validation is not exercised. |
| PB22 x4 | AC11 | Discover actual catalogue/items/detail URLs through attendee journey; remount each under organiser/business/mandatory-change/unauthenticated actors with forged storage; zero programme requests and no protected facts. If a view has no distinct URL, this covers only its actual URL; a direct-addressability policy is not invented. |
| PB23 | AC14 | All five approved displayed types are selectable; native-select option labels are asserted against their exact tokens (custom combobox options are located by exact label); outgoing requests use exact talk/workshop/booth/performance/other tokens. No server enum enforcement is claimed. |
| PB24 | AC13/14 | Discover detail URL, unmount, clear browser storage and remount directly; only detail HTTP response is available, with eventTimezone. Render Singapore overnight time without an event-list/item-list fetch. Module-level caches are not forcibly reset by this harness. |

Expected discovery: 30 parameter-expanded cases. Before implementation, missing enabled Browse action should produce assertion RED in feature cases; three existing-home guard controls may pass. Exact observed results below supersede this expectation.

## Deferred/manual boundary scenarios

| Criteria | Required follow-up; owner/dependency |
| --- | --- |
| AC11; SEC01 | Actual browser cookie enforcement, real CurrentActor expiry/revocation/password/role guard and direct HTTP routes; programme/backend contributor and later independent security reviewer. Existing auth test-only routes do not prove domain integration. |
| AC12; F01-AC05/08; SEC02 | Real mixed published/draft/empty events; direct hidden IDs/mismatched pairs; identical absence errors; no drafts in search, pagination hasMore or raw payloads; audit access denial. A fixture returning only published examples cannot prove any of these. |
| AC13/14 | Server literal Unicode casefold/AND, pinned Unicode data version, search title-only bounds, DST/half-open overlap, actual sort/tie-breaker/filter-before-page behavior and consistent committed view. Assert actual server results, not request mocks. |
| AC14 | Real exact allowlists/types/nullability, numeric bounds, timestamps/UUID casing, unknown/repeated parameters, integer grammar/overflow, unknown type, date syntax/year/representability and authentication-before-validation precedence. UI transport tests do not cover these server rules. |
| AC14 | Real problem shape/details/media type/no-store and secret/hidden-fact redaction for401/403/404/422/500/503; transport fixture headers are examples, not evidence. |
| AC16 | Database before/after successful/denied/invalid/failed reads; unchanged facts/revisions/publication/plans and permitted session bookkeeping. UI GET assertions do not prove persisted state preservation. |
| F01-AC04/06/08/09 | Real organiser create/validate/explicit publish with audit, separate attendee consumer, fresh records surviving application/storage restart without reseeding, deployed isolated environment journey. Producer/contributor and delivery owners; pending shared agreement. |
| AC15; accessibility | Human browser keyboard/focus, responsive/visual checks, meaningful screen-reader feedback; jsdom cannot establish real layout or browser behavior. No latency target approved. |
| Producer AC01–03/07/10 | Organiser writes, stale/conflicting publication, capacity/revision/audit atomicity stay with producer test plan; not replaced by this consumer suite. |

AI/provider/approval-execution checks are N/A to this manual read consumer; this slice does not satisfy mandatory every-role LLM coverage. Post-publication change/cancellation and accepted-plan references remain later F05/RD04 integration. No unsupported resource/latency targets are introduced.

## Execution and adequacy evidence

- Initial harness compile identified unsupported `exact` option on findByRole; corrected the test helper before feature execution. That compiler failure is harness evidence, not behavior RED.
- Focused runtime, corrected compile and regression results are recorded in the execution snapshots below; downstream behavior remains unexercised while entry is disabled.
- Independent final adequacy, test-owner correction review, human teammate review and baseline freeze: pending. Early reviewer findings were incorporated but are not final adequacy approval.
- Complete shared capability approval/producer compatibility: pending despite requester authorization for this test-first consumer slice.

### Pre-implementation execution snapshot 1 (before PB23/PB24 and TCR correction)

- Bundled Node24.19.0, Vitest4.1.11, TZ=UTC. Command from repository root: `node frontend/node_modules/vitest/vitest.mjs run --root frontend tests/acceptance/programme-browsing.test.tsx --reporter=verbose --maxWorkers=1 --testTimeout=20000` (explicit bundled node executable).
- Result: 28 discovered; 25 failed /3 passed;25.29s; exit1. All25 failures reached the actual App's disabled Browse Programme action (`expect(element).toBeEnabled()`); no missing-module/import errors or test timeouts. PB19 x2 andPB20 existing-guard controls passed. This proves missing entry behavior only; downstream assertions remain unexercised until entry is implemented.
- Harness compile using bundled node and `tsc -p tsconfig.app.json --noEmit`: passed, exit0 before PB23/PB24/TCR additions.
- After independent behavior/security assessment recorded in BROWSE-TCR-01 and this meaningful RED, test owner applied the narrow role-home correction. No other original tests changed. PB23/PB24 added following independent behavior review; final rerun/recheck pending.

### Final pre-implementation execution snapshot 2

- All final source additions and BROWSE-TCR-01 correction saved before this run; no application/config/helper changes. Bundled executable: `C:/Users/yikbi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe` version24.19.0; Vitest4.1.11; TZ=UTC.
- Exact repository-root command: `node frontend/node_modules/vitest/vitest.mjs run --root frontend tests/acceptance/programme-browsing.test.tsx tests/acceptance/session-and-homes.test.tsx --reporter=verbose --maxWorkers=1 --testTimeout=30000`, invoking the bundled executable above. The orchestrator authorized30000ms as a diagnostic allowance for Windows cold rendering; this is not a product performance claim or baseline runner approval.
- Result:50 cases,28 failed /22 passed,31.54s, exit1. New programme suite:30 cases,27 failed on the actual disabled Browse Programme action /3 passed existing-home guard controls. Corrected session-and-homes:20 cases,19 passed /1 prospective attendee failure (`expected ... length2 but got3`). No import/module errors or test timeouts. Thus observed RED identifies missing enabled entry; later assertions are designed and statically reviewable but not runtime exercised yet.
- Final harness compile: bundled node `frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.app.json --noEmit`, exit0 (executed equivalently from frontend working directory).
- `git diff --check`: passed for tracked diff; Git reported existing LF-to-CRLF normalization notices on the preexisting documentation edits. New untracked artifacts remain for review; no application implementation or commit created.
- Independent final test adequacy/TCR recheck and remaining original-file/full-suite diagnostic results are orchestrator-owned pending evidence. No baseline frozen by the designer.

### Proposed future protected baseline scope (requires orchestrator/reviewer agreement)

Protect `frontend/tests/` in full (acceptance, fixtures, helpers, setup and future test additions), `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.ts`, all `frontend/tsconfig*.json`, `tools/check_test_baseline.py`, the exact approved consumer contract in `specs/programme/create-and-publish-programme.md`, this plan, `workflow/agents/runs/2026-10-20-browsing-test-change.md` and the orchestrator's `workflow/agents/runs/2026-10-20-browsing-test-first.md`. Preserve the original authentication baseline and its broader protected paths; this consumer list does not replace backend/auth protection.

Before a developer starts, record an immutable baseline SHA, agreed full-suite/compile commands and runtime/timeout settings, reviewer identities/approvals, test-selection/config protection and known deferred checks. Any executable test changes remain test-owner corrections under the documented change-control process. The proposed scope and diagnostic commands here do not themselves freeze a baseline, approve implementation or establish full programme readiness.

### Final reviewer-requested assertion refinement

After snapshot2, the designer added the behaviour reviewer's native-select option label/token assertion to chooseType (custom options already used exact accessible labels). This changes assertion coverage only. Snapshot2 proves meaningful entry RED for the preceding source; final exact-source execution is pending orchestrator run/recheck. No further suite is run concurrently with the orchestrator's remaining-original-files diagnostic.

Proposed canonical frontend runner after BROWSE-TCR-02 approval: set `$env:TZ='UTC'`; invoke `& 'C:/Users/yikbi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' 'node_modules/vitest/vitest.mjs' run --maxWorkers=1 --testTimeout=30000` from frontend. Compile with the same executable and `node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit`. Runtime24.19.0/Vitest4.1.11 and explicit serial selection are part of the proposal. Full frontend means all acceptance files; no failed cases are excluded. Config/package files remain untouched.

## Final independent scope and runner decisions (2026-10-20)

The orchestrator relayed final independent behaviour approval from `/root/browse_behaviour_review` and security approval from `/root/browse_draft_review` for scoped consumer-test adequacy, BROWSE-TCR-01 and BROWSE-TCR-02. The designer accepts both reviewed corrections. Approval is conditional on final exact-source TypeScript compilation and passing the remaining three unchanged original frontend acceptance files with the canonical Node24.19.0/Vitest4.1.11/TZ=UTC/serial/30000ms runner. Final execution is orchestrator-owned and remains pending in this record. The tiny native-select label assertion is included in this reviewed scope. Earlier pending-review statements describe their original snapshots; this section records the subsequent decisions without replacing those observations.

These approvals cover browser consumer acceptance and runner suitability only. They do not claim server enforcement, publication integration, persistence, deployment, complete capability readiness or successful execution of downstream assertions currently stopped by the disabled entry. No application work is authorized by this plan alone.

### Concrete inherited and additional protected paths

The next baseline must retain the original authentication protection and explicitly protect the following paths; this is the reviewed path proposal, not a newly created baseline SHA:

- `backend/tests/`
- `backend/pyproject.toml`
- `backend/uv.lock`
- `frontend/tests/`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/vite.config.ts`
- `frontend/tsconfig.json`
- `frontend/tsconfig.app.json`
- `frontend/tsconfig.node.json`
- `tools/check_test_baseline.py`
- `workflow/agents/runs/2026-10-19-authentication-test-plan.md`
- `workflow/agents/runs/2026-10-19-auth-test-change.md`
- `workflow/agents/runs/2026-10-20-browsing-test-plan.md`
- `workflow/agents/runs/2026-10-20-browsing-test-change.md`
- `specs/programme/create-and-publish-programme.md`

The orchestrator separately owns the baseline anchor and final execution evidence in `workflow/agents/runs/2026-10-20-browsing-test-first.md`; the designer does not edit or claim to freeze it. Record its protection and immutable baseline SHA there before developer handoff. Preserve original authentication baseline SHA and historical test-change approvals.

## Final exact-source execution and conditional-review closure (orchestrator evidence)

On2026-10-20, `/root` reported the final saved source (including native-select label/token assertion) compiled successfully and executed using the reviewed bundled Node24.19.0/Vitest4.1.11/TZ=UTC/serial maxWorkers1/testTimeout30000 runner. Two-file result:50 cases,22 passed/28 failed/0 pending; new browsing suite30 cases comprised27 actual disabled-Browse `toBeEnabled` failures and3 existing-home guard controls passing; corrected session-and-homes20 cases comprised19 passing and1 prospective attendee disabled-count failure (expected2, actual3). No timeout/import failures occurred. The remaining three unchanged original frontend acceptance files passed all55 cases in126.26s. These are orchestrator-reported results; the designer did not rerun checks or modify tests after receiving them.

The independent reviewers' final-source compilation and remaining-original-regression conditions are now satisfied for this scoped consumer test adequacy and BROWSE-TCR-02 runner adoption. Earlier pending-execution notes remain attached to their historical snapshots. Baseline SHA remains pending orchestrator commit/anchor; no baseline is created or frozen by this appendix.

All27 new feature-path failures stop at missing enabled entry. Deeper query/detail/render/race assertions are present and reviewed but have not executed against a browsing implementation. Passing legacy controls and the remaining original55 tests do not verify those deeper behaviors. Real server authorization/filtering/privacy, producer integration, database preservation/persistence and deployment remain deferred exactly as documented above.
## Orchestrator baseline anchoring method

The orchestrator will create two local immutable anchors without pushing. The primary test-baseline commit protects the concrete inherited/additional path set listed above, including this plan/TCR and the old authentication plan/TCR, but excludes `workflow/agents/runs/2026-10-20-browsing-test-first.md`. The orchestrator then writes the actual primary SHA into that separately owned run record and creates a second evidence-seal commit. Developer assignment supplies both SHAs: guard the test/contract/path set against the primary anchor, and guard the parent run record against the evidence seal. This avoids a record referring to the SHA of the same commit that contains it. Both anchor SHAs remain orchestrator-owned pending values in this plan; the designer creates neither commit.
