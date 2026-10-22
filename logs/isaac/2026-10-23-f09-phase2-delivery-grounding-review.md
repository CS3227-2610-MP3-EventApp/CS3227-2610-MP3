# F09 Phase 2 delivery-grounding review session

- Date/timezone and owner: 2026-10-22 to 2026-10-23, Asia/Singapore; Isaac.
- Branch/source: `itzxitzx/basic-business-features`. At the time of the final request the working tree was clean. The later commits `a2243e5`, `fdd1477` and `40b7a80` are recorded in [2026-10-23 F09 Phase 2 completion and handoff](2026-10-23-f09-phase2-completion-and-handoff.md); this log does not claim authorship of those commits.
- Source coverage: visible user messages in this conversation, the compacted summary of earlier context, actual tool and agent results, and Git status. Earlier history is covered by [2026-10-22 F09 phased delivery](2026-10-22-f09-phased-delivery.md). Verbatim history from before the compaction is not reconstructed.
- AI factual check: checked against the visible tool output, subagent replies and Git output. Tests were not rerun merely to write this log.
- Human verification: Pending. Reviewer, date and corrections: not yet supplied.

Current outcome: at the end of this conversation, Phase 2 was not complete. Its delivery validator had been hardened through several review rounds, but live research, the browser shortlist and restart checks, and final reviews were still outstanding. Later commits in the repository show further progress that this conversation did not verify.

## Prompts and interactions

1. Isaac asked me to implement the F09 plan phase by phase, starting from the unfinished Phase 2. Each phase required clarifying specifications, returning unresolved product decisions to him, writing independent acceptance tests before implementation, adding developer-owned unit tests, checking behaviour and security, and committing when complete.
2. Phase 2 was listed as still needing: a successful real research result, browser shortlist save/reopen/delete checks, restart persistence, final behaviour and security reviews, and evidence updates with a Phase 2 commit.
3. Isaac asked whether the research LLM feature was failing, whether the code worked, and whether SoCLaaS rate limits or limits required the agent to make multiple smaller calls.
4. I reported that the supplied SoCLaaS API reference documents per-key rate, concurrency and budget limits, including HTTP 429, but gives no numeric thresholds. The configured model reports a 262,144-token context. Recent failures were `invalid_output` from strict evidence validation, not observed 429s, timeouts or truncation. Isaac chose to keep the approved single extraction call.
5. Behaviour and security reviewers found delivery-attribution gaps. I recorded the reviewer findings and then added developer-owned regressions outside the protected baseline. The validator was tightened to use exact normalized subjects and clause-scoped attribution.
6. The configured custom reviewer model was unavailable. General-purpose fallback agents were given the behaviour-verifier and security-reviewer responsibilities. Their reports are recorded below.
7. I was asked to finish the pending reviews. Successive review rounds found further bypasses: a parenthetical product qualifier, a trailing `(Poster Pack only)`, a comma-clause subject carried into a later estimate, a colon-delimited qualifier, a dash-plus-parenthetical combination, and a slash-delimited qualifier. Each was added as a regression and then addressed in the validator.
8. Isaac asked me to log this entire conversation under `logs/isaac`, following the heading style of other logs, and to suggest a commit name.

## Decisions and actions

- No change to the single extraction call, the retry policy or the protected baseline `0cea5e267a39fc8bdd03ed655a3c7ea1bee7e5d0`. Developer-owned regressions were added outside protected paths.
- The validator now scopes subject attribution to the clause containing the exact estimate and checks parenthetical and trailing qualifiers before accepting either an explicit product subject or a generic delivery label. Suffix splitting recognises `,`, `;`, `:`, `/`, dash and em dash.
- The compare-suppliers spec evidence rows, the Phase 2 run record and the supplier testing guide were updated to match the observed results. Phase 2 was kept explicitly incomplete.
- The residual cross-sentence case (`Flyer Pack delivery 1 day. Poster Pack only.`) was reported to Isaac as an open product decision: reject when a following sentence is qualifier-only, or accept as a documented heuristic limitation. It was not changed.

## Checks and results

- Latest focused backend run during this conversation: **120 passed** (93 protected supplier acceptance tests, 27 developer-owned checks), one existing Starlette/httpx deprecation warning. The run used the documented disposable test database from `backend/`.
- Protected-baseline guard against `0cea5e267a39fc8bdd03ed655a3c7ea1bee7e5d0` and `git diff --check`: passed after the final edits.
- Behaviour follow-up: confirmed the slash, colon, dash/parenthetical and positive cases (same-product and generic `Delivery: 1 day`).
- Security follow-up: static review agreed the qualifier cases fail closed and reported one open Medium limitation (cross-sentence qualifier, confidence 8/10). Final security sign-off on the slash change was not received before this conversation ended.
- Live research: no successful saved snapshot in this conversation. Browser shortlist save/reopen/delete, process-restart persistence and manual checks were not run.

## Corrections and failed attempts

- A test invocation from the repository root could not find backend-relative test paths. Running from `backend/` with the documented environment succeeded.
- One early diagnostic command unexpectedly stopped the development `db` container. It was restarted and verified, with no development database contents reset or queried.
- Some reviewer claims were not reproduced. The dash-plus-parenthetical fixture was added as a regression and passed; the reviewer's failure report did not match the exact fixture.
- A subagent test run initially used the wrong environment variable setup and failed before pytest started; it was rerun with the documented local targets.
- The record in the Phase 2 run record and the spec had lagged behind the test counts; they were updated in this pass.

## Limitations and reflection

- The validator is a bounded text heuristic. Every review round found another delimiter or sentence-boundary form, so it does not prove semantic attribution across all supplier page formats.
- The reviewers were general-purpose fallbacks, not the configured custom reviewers, and they do not replace teammate review.
- Live research remains unproven. Failed runs leave no snapshot, and the sample is small.
- Repeated patching of delimiters was a sign that a product decision on ambiguous, cross-sentence evidence was needed.
- Reflection: the strict validator improved safety but made live success rare. Making the residual ambiguity an explicit decision is more honest than extending the heuristic indefinitely.
