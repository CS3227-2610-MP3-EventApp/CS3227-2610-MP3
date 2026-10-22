# Silent session re-check on window focus

- Date/timezone: 2026-10-22, Asia/Singapore. Session owner: Yik Bing.
- Branch: `fix/yikbing-silent-session-recheck` (from master `2a9b409`, independent of the F03 AI branch).
- Source coverage: this visible conversation, tool output and subagent reports. AI factual check: checked against that evidence. Human verification: Pending.

## Prompts and interactions

While testing, the user asked why returning to the tab (alt-tab) emptied the page. The assistant explained `Auth.tsx` re-validated the session on `focus`/`pageshow` and replaced the whole app with "checking your session". The group decided this accepted behaviour is not wanted; the user approved the proposed silent background re-check, noting the trade-off, and later asked to proceed.

Agents: the independent `behaviour_verifier` assessed the proposal (APPROVE WITH CONDITIONS: spec first, test owner edits tests, stable `setActor`, silent only for focus/non-restored pageshow, a navigation or recovery check always wins). The `test_case_designer` agent acted as test owner and edited the tests. The main assistant wrote the spec text and the implementation; the verifier's review of the finished test change is still pending.

## Decisions and actions

- Spec first: `specs/applications/submit-business-applications.md` revision 5 (AC13/AC15 reworded), plus notes in decide-applications-and-show-outcomes and navigate-eventapp-workspaces. Recorded exposure window: until the check returns, stale or other-actor content stays visible and a write could be submitted; the server still authorises every read and write.
- Test-change record `SILENT-TCR-01` (`workflow/agents/runs/2026-10-22-silent-session-recheck-test-change.md`): four protected tests in `business-applications.test.tsx` rewritten (REQ-REG-C1, REQ-REG-C2 and two AC13/15 focus tests) and six added (401 on focus, different actor, membership loss, restored-page concealment, focus during a navigation check, no refetch).
- `frontend/src/Auth.tsx`: focus and non-persisted `pageshow` trigger a silent check (page stays mounted); a persisted (bfcache) `pageshow`, navigation and "Try again" stay non-silent; a focus during an in-flight check is ignored and the error screen still retries on focus; a stable `setActor` and no object churn for an identical actor. Retained: purge on 401/403, actor change and membership loss; failed checks fail closed.
- A first version restarted the check on a focus during a held navigation check; the new test caught it and the focus is now ignored while a check is running.

## Verification and limitations

- `business-applications.test.tsx`: 83/83 pass alone; the type check is clean.
- A full local frontend run on a loaded machine had 21 failures of 280, nearly all timeouts (385 s vs about 145 s in CI), so it is not treated as a clean result; CI is the authoritative full run.
- Not verified: browser behaviour by a human beyond the user's own manual check, assistive-technology use, and the verifier's final review of the test diff.

## Reflection and next steps

Order followed: spec, independent assessment, test owner, implementation, tests. Next: read CI, verifier review, open a PR, tell Isaac about the protected-test change.
