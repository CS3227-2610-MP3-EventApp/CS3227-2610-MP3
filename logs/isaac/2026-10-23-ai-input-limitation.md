# Session summary
- Date/timezone and session owner: 2026-10-23, Asia/Singapore; Isaac.
- Feature/task, branch and source revision: document AI input limitation; master at `7c6ad10`.
- Source coverage: this visible request and tool output only.
- AI factual check: checked against the visible request and documentation diff.
- Human verification: Pending. Reviewer/date/corrections: not yet supplied.

## Prompts and interactions
The user requested a known limitation in the user or developer guide explaining that irrelevant LLM inputs may produce unexpected values because guardrails can miss situations. No subagents were used.

## Decisions and actions
Added a prominent Known AI limitation section near the start of `docs/UserGuide.md`, covering unexpected, inaccurate or unrelated output and practical advice to focus requests, verify sources, review suggestions and use manual workflows. This is documentation of the user-supplied limitation; no application behaviour, security requirements, specifications or protected tests changed. An initial read used an incorrect specification directory; located and read `specs/attendee-planning/answer-event-questions.md` instead.

## Verification and limitations
Reviewed the wording and diff and ran `git diff --check`. No runtime tests were needed for this documentation-only change. No new provider experiment was performed; this session does not establish the frequency or specific triggers of guardrail misses.

## Reflection and next steps
The shared user-guide introduction makes the limitation visible across AI features. Human verification of this summary remains pending.
