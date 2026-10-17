# Conversation log — user stories and feature map

Date: 2026-10-17 (Asia/Singapore)
Author: Isaac session with Codex

## Request and interaction summary

- Isaac asked for a Markdown document under `docs/` that maps user stories to features for three stakeholder roles, using the project brief, prior discussion, and repository context. The purpose was team review and agreement on project direction.
- Codex inspected the existing SDD material and identified the three roles as Attendee, Organiser, and Business participant, with 31 canonical story IDs across F01–F10. Codex created `docs/UserStoriesAndFeatures.md` as a draft mapping, including proposed MVP/stretch scope and open team decisions.
- Isaac asked that every story use the wording pattern “As a <role>, I can <action> so that <benefit>.” Codex rewrote the 31 rows and split compound feature descriptions into separate actions.
- Isaac asked for multiple feature actions to appear as bullet points. Codex changed those table cells to HTML bullet lists within the Markdown table.
- Isaac asked for a clean distinction between higher priority features and later nice-to-haves. Codex added proposed P0 Foundation, P1 Core, and P2 Later labels, a phase summary, and a dependency-oriented build sequence. P0 and P1 were described as the proposed first release, subject to team agreement.
- Isaac asked what F10 Shared foundation meant and requested clearer feature statements, specifically replacing “Use business membership permissions.” Codex added an explanation of identity, record-level permissions, bounded AI jobs, and how F10 is introduced with F01. Codex made business permissions concrete: access to that business's application drafts, preparation records, and event participation details, while excluding other businesses' private records. Other vague handoff and result descriptions were clarified.
- Isaac provided AGENTS.md instructions and then asked for this entire conversation to be logged under `logs/isaac` using the heading style of up to two existing log entries.

## Files and outcomes

- `docs/UserStoriesAndFeatures.md` was created and revised across the conversation. It remains a **team review draft**; the priority choices and unresolved product decisions are not recorded as human-approved implementation scope.
- This log records the conversation and visible actions. No application feature implementation, security test execution, deployment, merge, push, or human approval occurred in this conversation.

## Checks and limitations

- Before the final documentation revision, Codex counted 31 story rows and checked that all used the requested story format. It also checked that no placeholder cells remained.
- Codex did not run application tests because the work was documentation only.
- When preparing this log, the workspace command helper repeatedly failed with `helper_unknown_error: setup refresh had errors`; a Node REPL attempt failed with the same sandbox setup error. Therefore Codex could not inspect the headings of existing log entries or verify this log against `logs/README.md` during this turn. This heading is a best-effort format pending repository verification.
- No subagents were used in this documentation conversation; no multi-agent run is claimed.
