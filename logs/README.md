# EventApp development prompt and interaction summaries

## Requirement

The user supplied this assignment requirement on 2026-10-16:

> A folder of summary logs (logs/…). This folder should contain summaries of all the prompts and interactions that took place during the development of this app. Ask AI to produce the summaries for you, but don't forget to verify the correctness of the generated summaries. (These summaries will come in handy when you reflect on your project.)

## Team procedure

Each teammate maintains a dated, unique session file such as `YYYY-MM-DD-owner-feature-session.md`. Before concluding each development session or PR, ask the coordinating AI to summarise the prompts and interactions, including subagent handoffs. Include small debugging/documentation sessions too. Summarise faithfully rather than storing full transcripts; redact credentials and personal/private data without losing the technical lesson. Concurrent agents return summaries to the orchestrator, which owns the session file to avoid edit conflicts.

Use [TEMPLATE.md](TEMPLATE.md). Record requests, corrections, decisions versus proposals, actions and actual results, failed attempts, verification, limitations, and reflection. Link relevant specifications, commits, tests, PRs, and agent run records. Historical backfills must identify their source and missing history; do not invent prompts or claim complete coverage of unavailable chats.

The AI checks factual statements against the visible interaction/tool evidence and repository history. The human session owner then reads the summary, corrects errors, and records their name/date and any corrections. Until that happens, keep `Human verification: Pending`. Agent review is not human verification. Pending summaries may be proposed in a PR, but remain an outstanding requirement before the team treats the log as verified or submits it. New changes or review findings require corresponding summary updates.

## Coverage index

- [2026-10-15–16 coordination discussion and repository sync](2026-10-16-yik-bing-coordination-history.md): retrospective from the visible chat and Git evidence; earlier project-planning conversations are unavailable, and no claim of their complete coverage is made.
- [2026-10-16 workflow implementation](2026-10-16-yik-bing-agent-workflow.md): branch setup, agent definitions, protected-test procedure, log requirement, validation and review evidence.

Each teammate must add summaries for their own earlier sessions and verify the historical coverage. Existing SDD revision records can support backfills but are not original prompt transcripts.
