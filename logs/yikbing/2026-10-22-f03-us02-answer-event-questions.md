# F03-US02 attendee event questions (AI)

- Date/timezone: 2026-10-22, Asia/Singapore. Session owner: Yik Bing.
- Feature/branch: F03-US02 `answer-event-questions` (spec revision 2), branch `feat/yikbing-event-qa`, created from master `735792b` (PR #15 merged).
- Source coverage: this visible conversation, tool output and the subagent reports below. AI factual check: checked against that evidence. Human verification: Pending. Reviewer/date/corrections: not yet supplied.

## Prompts and interactions

A scoping session (read-only, no subagents) came first: the user asked what F03-US02 could reuse from F03-US01, which decisions were needed, and whether it fitted before the deadline. The user then asked for all questions with recommendations, approved Q1 to Q9, asked how it related to the assignment's per-role LLM requirement, and decided to build it ("it was meant to be an LLM feature"). Later the user approved cancelled activities being included as facts, asked that prompt injection and other LLM threats be prevented, found the "I confirm this event uses only synthetic data" checkbox unclear and asked for it to be removed from Q&A now and from the already merged itinerary feature as the very last commit of this branch, approved the exact spec text, and agreed to leave one surviving review mutant as a documented limitation.

Agents used (reduced set, recorded honestly):
- Orchestrator, spec author and developer: the main assistant. Its own review was not used as independent review.
- `test_case_designer` (Claude Sonnet): independent test design, 50 backend and 30 frontend acceptance tests plus test plan; wrote only its deliverables; nothing committed by it.
- `behaviour_verifier` (Claude Opus): single combined behaviour and security review plus mutation-style reasoning (8 mutants on a scratch copy) at commit `f115412`; no separate `security_reviewer` or `specification_analyst` ran, so security was reviewed inside that one pass.

## Decisions and actions

- Decisions approved by the user in chat 2026-10-22: signed-in attendees only; one event per independent question; whole programme sent (venue name and address included); 300-character question kept 30 days; 20 questions per UTC day separate from itineraries; structured, server-verified claims; background job with polling; stale results withheld; cancelled activities included and marked cancelled (AEQ-01 to AEQ-04).
- Spec revision 2 (`a05426d`, `d6f6000`, `1372953`) adds the concrete contract, outbound-field list, limits, validation rules and an LLM threat model. The synthetic-data checkbox and `confirmSynthetic` were removed from the Q&A contract at the user's request; the server allowlist of synthetic events remains the control and the UI shows a plain notice instead.
- Step 0 (`published_facts` returning old revisions and cancelled snapshots) had already been fixed on master by PR #15 before this branch; a Q&A variant keeps cancelled facts.
- Baseline frozen at `df37359` (protected paths verified with `tools/check_test_baseline.py`).
- Implementation `f115412`: question jobs share the attendee job table via a `workflow` column (migration `20261022_0009`, single head), new `app/attendee_ai/questions.py`, routes, a workflow branch in the attendee worker (organiser files untouched), itinerary active-job/daily/lookup filtered by workflow, regenerated OpenAPI and types, `EventQuestions.tsx` on the event programme view.
- Review findings fixed after `f115412`: summary screening now NFKC-normalises and withholds bare domains, `scheme:` text, `//`, markdown and bracket tricks, entities, full-width `@` and non-ASCII numerals; the question is normalised again after hidden characters are removed; the status poll stops on 401/403/404 or repeated failures with a message; worker log text no longer says "itinerary" for question jobs; the unknown-answer link goes to this event's programme; results sit in an `aria-live` region. Developer-owned tests added outside the baseline: `backend/unit_tests/test_event_question_validation.py` and `frontend/src/attendee-planning/EventQuestions.unit.test.tsx`.
- Final change set (last commits of the branch), at the user's request ("approved" after the test-change process was explained): the synthetic-data checkbox and `confirmSynthetic` were removed from the already merged itinerary feature. Spec `generate-feasible-itineraries` revision 3; test-change request `workflow/agents/runs/2026-10-22-itinerary-synthetic-checkbox-test-change.md` (F03-US01-TCR-02): the independent verifier approved with conditions (the Q&A baseline also posts the field and needed a one-line helper change, the allowlist became the tested control), the test owner made all edits (replacement baseline `8049b4f`), the verifier re-verified the diff, and one faulty new test written by the test owner (clicking a disabled button) was found by my run and corrected by the owner. Code: backend request model drops the field, the itinerary page shows a notice described by the button instead of a checkbox, OpenAPI/types regenerated, User Guide updated (including a new event-questions section).
- A first version of the summary URL regex contained stray backspace characters (a quoting mistake in my edit script); the new unit tests caught it and it was corrected.

## Verification and limitations

- After the checkbox removal: backend itinerary (34), Q&A (50) and unit tests (50) 134 passed in one run; frontend itinerary, planning and Q&A UI 63 of 64 passed, the one failure being the faulty test above, which passes alone after the owner's fix; `tsc` clean. The full local suites were not run.
- Backend baseline: 50/50 passed before and after the review fixes (see the commit message for the final run). Regression (F03-US01, organiser AI, announcements, schema/migration tests, unit tests): 142 passed at `f115412`; unit tests alone 50 passed after the fixes.
- Frontend: 30/30 baseline UI tests passed; the developer-owned poll test passes (it needed a longer timeout on this slow machine); `tsc` clean. The full local frontend and backend suites were not run; CI is the authoritative run.
- Not verified: any live SoCLaaS call or real model behaviour against injection (all tests use a fake provider), multi-process concurrency, the 180-second deadline and lease recovery for question jobs, the per-minute cap for questions, migration downgrade with question rows present, browser and assistive-technology use, production-environment gating.
- Documented limitations: a model's `unknown` answer cannot be verified; summary prose is checked for links, markup and unverified numerals but not for false statements, spelled-out numbers, or date digits that are grounded by a datetime claim; the protected tests accept any equivalent datetime string, so a review mutant that copies the claim value from the model instead of the record survived (accepted by the user; practical effect is only the written format of a time); large events fail with `input_too_large`.
- Real-attendee-data use stays disabled; production calls need provider privacy approval (D06). Deployment and the human teammate review are outside this work.

## Reflection and next steps

The mutation-style review was useful: it found weak summary screening that the protected tests did not cover, and my own unit tests then caught a quoting mistake in the fix. Next: push and read CI only when the user asks; teammate review; the live SoCLaaS run for both attendee features on a synthetic event is still pending.
