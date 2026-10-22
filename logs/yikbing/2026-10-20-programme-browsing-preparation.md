# Programme browsing preparation

- Date/timezone and owner: 2026-10-20, Asia/Singapore; Yik Bing.
- Branch/base: `feat/yikbing-programme-browsing`, `07a5666b7ebb80ef462025fbfa1798c9676f1ee8`.
- Source coverage: this chat, actual local repository reads/Git output, recent turns of Prepare MP3 Presentation. Earlier unseen history is not reconstructed.
- AI factual check: checked against visible tool/handoff evidence; final Draft reviews recorded below.
- Human verification: Approved by the team on 2026-10-22.

## Prompts and interactions

The user requested a master pull and authentication update, then asked how to begin their attendee feature under SDD/multi-agent coordination. Master fast-forwarded from 13b768b to 07a5666, including PRs 5 and 6. Repository was clean. Authentication implementation and recorded test evidence were inspected; no application tests were rerun in this session. The user then authorised the proposed first preparation session and explicit updates to Prepare MP3 Presentation, asking us to read that chat first.

The presentation chat describes a 14-slide, roughly 12-minute account of coordination/context management, test adequacy and protection, shared dependencies and observed lessons. The latest user preference there is short bullet topic cues. Recent turns were read; older unavailable turns are not claimed reviewed. An initial evidence-only update was sent to that chat with the user's authorization.

The feature branch was created from the pulled master. The repository draft-spec skill was applied. Existing programme revision 5 was refined in place to revision 6, retaining the complete organiser-to-attendee capability and all old AC IDs; no duplicate attendee specification was created. The user explicitly approved: visible event requires at least one published activity, date filtering covers each event-local date overlapped, and attendee accounts only for this journey. Full specification and contributor agreement remain pending.

## Bounded task record (preparation, not implementation)

- Task: `YB-BROWSE-PREP-20261020`; coordinator: main chat `/root`; human attendee task owner: Yik Bing. Producer assignment/contributor review: Dylan to confirm, not inferred from product role.
- Objective: refine F01-US03 within `specs/programme/create-and-publish-programme.md` revision 6; record decisions, planned verification and producer/consumer dependencies for human review.
- Source contracts: CurrentActor v1 / access revision 3; proposed PublishedProgramme v1; catalogue F01-US01–03/F04-US03, accepted RD01–07, relevant SEC01/02/11/12; base above.
- Preparation edit ownership: coordinator only, selected Draft, minimal `specs/README.md` mapping and this session log. Agents read-only. Application, executable tests, test infrastructure, protected baseline artifacts and other contributors' files excluded.
- Future ownership proposal (not assigned development): programme producer owns programme read model/API and migrations; attendee consumer owns browser journey; generated OpenAPI artifacts coordinated with producer. Existing auth-backed `events` table must be reused, not duplicated. `frontend/src/api.ts` currently prefixes auth paths, so programme requests need a separately reviewed interface. Shared route mounting/export/schema files require a single coordinated editor. No migrations reserved/applied this session.
- Baseline: none created for this task. No approved executable acceptance tests, test adequacy approval or development authorization inferred from the Draft.
- Completion for this session: reviewable Draft and decision list, independent scenario/draft review, focused document checks and evidence handoff. No push, PR, merge or deployment requested/performed.

## Actual agent handoffs

| Agent | Assignment/model | Actual outcome / limits |
| --- | --- | --- |
| `/root/programme_analysis` | specification analyst; GPT-6 Luna/high; bounded read-only Draft analysis | Initially read stale mirror rev2 despite canonical absolute assignment, disclosed inability to verify rev5. Coordinator rejected that as canonical source evidence and requested recheck using explicit canonical workdir. Final reconciliation recorded below. |
| `/root/browse_scenarios` | test designer; GPT-6.1 Sol/high; independent planned scenarios | Read canonical rev5/auth rev3; returned B01–B10 with accepted-vs-proposed distinctions. No writes/executable tests or adequacy approval. |
| `/root/browse_draft_review` | security reviewer; GPT-6.1 Sol/high; independent Draft review | Identified current identity guard, hidden-event/count leakage, safe projection, cache/error/late-response and role-policy gaps. Final rev6 review recorded below. |
| `/root/browse_behaviour_review` | behaviour verifier; GPT-6.1 Sol/high; independent Draft review | Read canonical authorities and reviewed rev6 separately; final findings recorded below. |

Agent spawning used generic tools with explicit role instructions and model/effort selections. Custom-role auto-discovery was not demonstrated. Roles were sequenced within four total concurrent slots. No developer agent was invoked.

## Planned verification scenarios (not executed)

| Cases | Criteria / purpose | Expected evidence and limits |
| --- | --- | --- |
| B01–02 | AC11, sign-in/role boundary | Real cookie identity; missing/expired/revoked sessions, forged role, attendee without organiser membership; wrong-role rejection. |
| B03–04 | F01-AC04/05/08, AC12/14 | Mixed draft/published/empty events; raw payload, metadata and guessed-ID leakage; exact published fact fidelity including same-room concurrency. |
| B05–07 | F01-AC05, AC13/14 | Title-only matching, AND filters, local midnight/overnight/DST, static tie ordering and page boundaries. Conditional wire expectations require P-08 agreement. |
| B08–09 | AC15/16 | Distinct loading/empty/error; retry, stale-response/identity switch; read state preservation allowing session bookkeeping. Browser keyboard/focus checks remain manual until executed. |
| B10 | F01-AC04/06/08/09 | Fresh real organiser publication and separate attendee read, API/storage restart without reseeding, later isolated online journey. Fixture-backed UI and CLI-created events do not prove publication integration. |

## Decisions, proposals and next gate

Accepted human choices are P-05–P-07 plus previously accepted sign-in A-03. Proposed wire details include title substring search, AND filters, bounded offset pagination, safe projections, errors/cache and UI recovery. P-02/P-03/P-08 need exact shared shape/types/vocabulary/error examples and affected-contributor agreement. P-04 online hosting remains pending. Post-publication changes/cancellation remain the later change capability; its plan-reference guarantees are not replaced by browse visibility. Full revision 6 approval is pending. Next: resolve review findings and remaining contract choices, get exact revision/contributor approval, then independently design/review executable tests and freeze the baseline before development.

## Verification and presentation evidence

No runtime/product tests, migration, browser journey or production checks ran. Focused diff/traceability checks are recorded after final review. The old authentication run reports its own passing tests; those are not this session's results.

Presentation observations: current auth agreement resolved an obsolete pending question in another Draft; publication visibility required a separate product decision; a read-only agent used stale context and required canonical-root correction; independent scenario review checked leakage beyond visible cards; fixture progress remains separate from real producer integration. No measured cost/time benefit, feature completion or full six-role implementation cycle is claimed.

## Final independent reviews and checks

Both independent behaviour and security reviewers inspected saved revision 6 and identified the same three concrete documentation defects: blank separators broke the AC/decision/history tables, P-03 still called accepted event visibility pending, and architecture source date was stale. Coordinator fixed those; both reviewers re-read the saved corrections and reported all findings resolved, with no remaining actionable Draft findings in their scope. P-02/P-08 contract approvals and all runtime evidence remain pending.

Focused checks passed: `git diff --check`; all ten legacy acceptance rows match HEAD verbatim; 16 criterion rows present; local document links resolve. Changes are only the selected Draft, its minimal index mapping and this new log. No application/test files were edited. The branch and changes remain local and uncommitted. Human correctness verification remains pending.

Canonical analyst recheck completed: explicitly read HEAD revision 5 and working revision 6 in the real repository, confirmed branch/base and stable criteria, and confirmed P-03 correction. Auth-only frontend request prefix is a recorded future integration constraint. Type vocabulary remains owned by P-02; P-08 must agree its wire representation/validation rather than invent another vocabulary. No implementation checks performed by analyst.

## Continuation: concrete read contract, revision 7

The user asked how far the feature was from completion, then authorised moving on to the next contract-agreement step. The coordinator continued the draft-spec skill, with no application/test writes. Existing branch and three-file preparation diff were preserved.

Actual role handoffs were resumed: `/root/programme_analysis` (Luna/high) read canonical revision 6 and proposed exact fields/nullability/search/error examples; `/root/browse_scenarios` (Sol/high) proposed assertion-ready boundary scenarios; independent `/root/browse_draft_review` and `/root/browse_behaviour_review` (Sol/high) were assigned saved-revision-7 review. They remain separate from the drafting coordinator and do not edit the reviewed contract.

Yik Bing explicitly approved initial SGD-only pricing/free=zero and the initial Talk/Workshop/Booth/Performance/Other labels. These are P-09/P-10 requester decisions; lowercase tokens and producer compatibility remain part of shared-contract review. Revision 7 proposes exact event/item/room/venue projections, accessibility text-or-null semantics, integer/text bounds, Unicode-casefold literal title matching, strict query grammar, event-local overlap filtering, bounded offset pages, safe problems and examples. Search normalization alternatives from analyst/designer were reconciled into an explicit no-additional-normalization proposal, not falsely reported as approved policy. Room maximum capacity is intentionally absent from attendee projection; item capacity remains declared, not inventory. Direct item responses include eventTimezone to avoid scanning event-list pages for deep links.

The coordinator asked who owns publication/backend implementation; response pending when this paragraph was written. This is not assumed to be Dylan solely because of his product role. Complete revision-7 approval and affected-contributor agreement remain pending. Shared organiser write input, stale-publication and online gates remain outside this read-contract proposal; refining the read contract does not silently mark the whole capability Ready.

All B01–B10 scenarios remain planned. Additional planned checks from designer: Unicode expansion and literal wildcard characters, exact raw property sets/null accessibility, 19/20/21 result pagination, max/beyond-end/invalid/overflow offsets, strict unknown/duplicate query rejection, local date/DST/boundary validation, authorization-before-input/resource checks and uniform hidden/unknown problems. No executable tests or test baseline were created. Final reviews/checks appended below.

### Revision-7 final results

Yik Bing answered that publication/backend ownership is not assigned; retain it as a coordination question. No message to an unassigned teammate or chat was sent. Pending ownership does not authorize a duplicate programme store or implementation of a teammate's producer.

Independent security review identified ambiguous overflow validation precedence (before any DB work versus DB-backed authentication first) and stale revision-6 evidence wording. Behaviour review identified stale currency/type pending prose and the same evidence issue. The coordinator fixed all three, and both reviewers re-read the saved changes and reported no remaining actionable Draft findings within scope. No product/contract/baseline approval or runtime claim was made.

Focused checks passed after fixes: ten legacy AC rows preserved verbatim against HEAD, sixteen unique AC IDs, both JSON examples parsed, local document links resolve and `git diff --check` passes. No product test suite was run. Only Draft/index/session-log files are changed; local uncommitted status remains. Human log verification is pending. Next human gate: exact revision-7 read contract approval for contributor review, assignment of publication ownership, then affected-contributor agreement and resolution of remaining producer scope before Ready/test-baseline gates.

Presentation evidence for this continuation: a concrete direct-link timezone requirement emerged while designing the response projection; independent review caught a real contract precedence contradiction before tests encoded it; already-approved user choices were distinguished from wire encoding and teammate agreement; the producer ownership gap remains explicit. This is a Draft-review example, not a runtime defect/fix or measured savings claim.

## Continuation: pre-implementation executable test design

Yik Bing accepted the concise proposal ("this sounds alright"), confirmed attendee scope and fixture-backed progression, clarified that tests precede development, then instructed "lets go". Revision 8 records acceptance of the unchanged revision-7 read contract. It does not pretend to approve organiser write policy or mark the entire shared Draft Ready. This session starts independent frontend acceptance tests/fixtures; producer agreement and backend enforcement/integration remain open.

`/root/browse_scenarios` (test_case_designer, Sol/high) is assigned only new programme acceptance tests/fixtures and a test plan/change request. No developer agent or feature implementation was started. The agent discovered a historical prototype expectation requiring all three attendee actions disabled. Coordinator assigned `/root/browse_behaviour_review` independent assessment before any correction; test owner alone may perform a reviewed correction. Other preview actions must remain disabled.

Locked frontend dependencies are being installed with npm ci --ignore-scripts to execute tests; no package/lockfile change is authorized or intended. Executable test and reviewer outcomes will be recorded below. No protected baseline has been frozen for this task.

### Test environment observations

`npm ci --ignore-scripts` installed the locked frontend dependencies successfully (249 packages, audit reported zero known vulnerabilities). The first test invocation could not start esbuild due to sandbox subprocess `EPERM`; rerunning with local subprocess permission started Vitest. This startup failure is environment evidence, not meaningful test RED. Original suite result will be recorded after completion; no timeout/config changes are presumed authorized to weaken coverage.

### Early independent adequacy review

Security reviewer found that existing-home-only wrong-role tests could miss unguarded new browse/detail URLs, and that a held old item response settled at a new actor's unrelated catalogue view could miss a stale item cache. Designer was directed to discover actual permitted URLs, remount them under wrong/missing/mandatory-change identities, and release old item data after the new actor opens the same event's fresh list. Parent also flagged an overprescribed `credentials:include` assertion (explicit same-origin is valid here) and an ambiguous /30/ display assertion. These are pre-baseline test corrections, not developer edits to protected expectations.

The initial unchanged original suite returned 52 passed / 23 failed; many failures were 5000ms timeouts and later duplicate-DOM errors. A serial diagnostic while the test owner was authoring files loaded an earlier 23-case WIP suite and returned 56 passed / 42 failed (98 total, 202.05s). It is not final-snapshot evidence. No assertions or timeout configuration were changed. `/root/browse_behaviour_review` independently allowed a separately labelled original-four-file Node24/one-worker/30000ms-timeout diagnostic, warning that this does not establish the cause or approve a permanent runner change. Exact commands/results and a reviewed command decision remain necessary before freeze. No application development has begun.

### Exact-source pre-implementation checks

The coordinator independently reran the final two acceptance files under the reviewed bundled Node24.19.0/Vitest4.1.11/TZUTC/serial/30000ms command:50 cases,22passed28failed0pending. JSON inspection confirms all27 new failures are the actual disabled Browse action `toBeEnabled` assertion; the one corrected historical failure expects two disabled previews but receives three. No timeout/import failures or unexpected failure messages. The remaining three original files passed55/55. Aggregate across all five files at final source:105 cases77passed28expectedRED, without omitting a case. TypeScript `tsc -p frontend/tsconfig.app.json --noEmit` passes on the exact final sources. These are split-file runs, not falsely reported as one full-suite invocation. Temporary JSON output was inspected then removed; assertions/results are recorded here and in the plan.

Both reviewers' conditional adequacy/runner requirements are satisfied by these results. This is readiness to freeze the scoped frontend test baseline, not runtime verification of deeper browsing assertions or complete shared capability readiness. BROWSE-TCR-01 preserves original role/auth tests except approved attendee action progression; BROWSE-TCR-02 explicitly records reviewed harness allowance without product timing claims.

Reviewed frontend test baseline frozen locally at 4ee5b7c29a8efb212050ecef3b322275ed12c4b9. Parent records full inherited protected path set and exact reviewed runner in the run record, then seals that record in a second local commit to avoid a self-referential baseline hash. Both references are guarded separately. No application implementation/push/PR or complete capability readiness claimed; human verification approved on 2026-10-22.

## Implementation continuation

The user asked why development was not automatic and whether there was a gap. Coordinator acknowledged prior authorization was sufficient for the fixture-tested attendee UI; stopping at the baseline milestone had been unnecessary. Actual developer /root/attendee_developer (GPT-6 Luna/high) was assigned bounded frontend application ownership and both immutable test-baseline references. No further permission was requested; production APIs remain real calls, fixtures test-only. Exact assignments/results/reviews are recorded in workflow/agents/runs/2026-10-20-browsing-implementation.md as they occur. Full shared producer readiness is still pending; this does not approve organiser writes or real integration.

### Implementation outcome

Actual /root/attendee_developer (Luna/high) implemented only assigned5frontendfiles, with independently reviewed fixes for pagination/price/Unicode/parser/state and accessible CTA labels. Firstfullsuite103/105 exposed duplicateheading/action text; sourcefixed rather than alteringprotectedtests; label-in-name recheck caught aria mismatch and wasfixed. Finalsource63d8de4 full105/105passed in221.15s; compile and coordinatorproductionbuild pass, bothbaselinesmatch, sourcehashesmatch reviewedfiles. Interim cancellation results were not counted asgreen. Fullactualhand-offs/evidence/deferredbackend/manual/humanchecks are in workflow/agents/runs/2026-10-20-browsing-implementation.md. Mainacknowledged it should have automatically continued after prior userauthorization; this turn actually completed frontend development and independentverification without a redundant approvalrequest. No push/PR/merge/deployment; humanverificationPending. Presentationevidence shared with authorized PrepareMP3Presentation chat.
