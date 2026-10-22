# F03-US01 attendee AI itinerary generation

- Date/timezone: 2026-10-22, Asia/Singapore. Session owner: Yik Bing.
- Feature/branch: F03-US01 `generate-feasible-itineraries` (spec revision 2), branch `feat/yikbing-attendee-ai-itineraries`, based on master `2a9b409` (PR #11 merged).
- Source coverage: this visible conversation, tool output and the subagent reports below. AI factual check: checked against that evidence. Human verification: Pending. Reviewer/date/corrections: not yet supplied.

## Prompts and interactions

After PR #11 merged, the user asked to pull master, read the artefacts, record the CI lessons, then start the next part (F03-US01, the attendee LLM feature required by the per-role AI gate). The user asked for the same workflow with fewer subagents to save credits, approved my proposed defaults for GFI-01 to GFI-03 and then approved revision 2 of the spec text. Later the user supplied their SoCLaaS key and model locally (not shared with the assistant) and the doctor listing check succeeded; the live feature run has not been done. The user also asked that slow commands be stopped and explained.

Agents used (reduced set, recorded honestly):
- Orchestrator, spec refinement and developer: the main assistant in this session. Because the main assistant both orchestrated and implemented, its own review was not used as independent review.
- `test_case_designer` (Claude Sonnet): independent test design, 32 backend and 22 frontend acceptance tests, test plan, fixture speed-up, and one harness correction. Two resumed assignments after the first.
- `behaviour_verifier` (Claude Sonnet): single combined behaviour and security review at commit `067d32f`; no separate `security_reviewer` or `specification_analyst` ran. Security was reviewed against a checklist inside that one review, which is less independent than a dedicated pass.

## Decisions and actions

- Spec revision 2 added a concrete job/result contract; outbound fields; GFI-01 to GFI-03 resolved with the user's chat approval: no accessibility preference data to the provider, constraint result shapes pinned, the server does not verify a model's infeasibility claim, break rule left to the existing planner check.
- Baseline frozen at `97acb07`; one test-owner harness correction `0464d40` (overrides a leaked autouse `clean_database` fixture registered via `pytest_plugins` in the organiser AI tests; no assertion changed).
- Backend `ab20212`: additive `app/attendee_ai` module (own tables, routes, validation, worker), migration `20261022_0008` on the single head, small hooks in `app/ai/worker.py` and `app/main.py`, regenerated OpenAPI and types. Frontend `067d32f`: AI suggestions section in My Itinerary.
- Review findings fixed after `067d32f`: the attendee 30-day cleanup was unreachable (now part of the worker `--cleanup` path); the provider rate cap is now shared in both directions; the UI treats a suggested item missing from the loaded programme as stale. Added developer-owned unit test `backend/unit_tests/test_attendee_ai_cleanup.py`.
- Also this session: CI lessons committed to `AGENTS.md`, the developer role files and `workflow/agents/README.md` (`bd453ec`).

## Verification and limitations

- Backend baseline: 32/32 alone; combined with the organiser AI tests 37/37 and 48/48 (designer runs). Final combined run after the review fixes: see the commit message of the follow-up commit.
- Frontend: 22/22 new UI tests plus the 10 existing planning tests; type check and production build clean.
- Not verified: the full local backend and frontend suites (the local machine is far slower than CI; CI is the authoritative full run), a live run against the real SoCLaaS model, browser and assistive-technology use, multi-process load, the UTC-day quota rollover, the 180-second deadline and lease recovery for attendee jobs, and the shared rate cap under load (no test). The two reviewer notes below remain open.
- Open notes from the review: validation is reimplemented in `validate_result` rather than reusing the planning `validation()`, so it can drift; attendee jobs run only when no organiser job is pending, so a busy organiser queue could delay them; model `reason` text can contain injected prose (rendered as plain text only).
- Real-attendee-data use stays disabled; production calls need provider privacy approval (D06). Deployment and the human teammate review are outside this work.

## Reflection and next steps

What caused delay: a protected-test assumption (linear migration history) and overlapping test processes earlier; this time a leaked autouse fixture between test modules, found by running neighbouring modules together before pushing. Next: user performs the live SoCLaaS run on a synthetic event, then push and read CI; teammate review; F03-US02 would reuse this infrastructure.
