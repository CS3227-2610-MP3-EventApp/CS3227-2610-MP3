# EventApp development prompt and interaction summaries

## Requirement

The user supplied this assignment requirement on 2026-10-16:

> A folder of summary logs (logs/…). This folder should contain summaries of all the prompts and interactions that took place during the development of this app. Ask AI to produce the summaries for you, but don't forget to verify the correctness of the generated summaries. (These summaries will come in handy when you reflect on your project.)

## Team procedure

Each teammate maintains a dated, unique session file such as `YYYY-MM-DD-owner-feature-session.md`. Before concluding each development session or PR, ask the coordinating AI to summarise the prompts and interactions, including subagent handoffs. Include small debugging/documentation sessions too. Summarise faithfully rather than storing full transcripts; redact credentials and personal/private data without losing the technical lesson. Concurrent agents return summaries to the orchestrator, which owns the session file to avoid edit conflicts.

Use [TEMPLATE.md](TEMPLATE.md). Record requests, corrections, decisions versus proposals, actions and actual results, failed attempts, verification, limitations, and reflection. Link relevant specifications, commits, tests, PRs, and agent run records. Historical backfills must identify their source and missing history; do not invent prompts or claim complete coverage of unavailable chats.

The AI checks factual statements against the visible interaction/tool evidence and repository history. The human session owner then reads the summary, corrects errors, and records their name/date and any corrections. Until that happens, keep `Human verification: Pending`. Agent review is not human verification. Pending summaries may be proposed in a PR, but remain an outstanding requirement before the team treats the log as verified or submits it. New changes or review findings require corresponding summary updates.

## Coverage index

- [2026-10-21 Dylan organiser AI analysis](dylan/2026-10-21-organiser-ai-analysis.md): approved-plan implementation, SoCLaaS synthetic-data boundary, actual specialist handoffs, protected tests and verification status; human verification pending.

- [2026-10-15–16 coordination discussion and repository sync](yikbing/2026-10-16-yik-bing-coordination-history.md): retrospective from the visible chat and Git evidence; earlier project-planning conversations are unavailable, and no claim of their complete coverage is made.
- [2026-10-16 workflow implementation](yikbing/2026-10-16-yik-bing-agent-workflow.md): branch setup, agent definitions, protected-test procedure, log requirement, validation and review evidence.
- [2026-10-17 Yik Bing specification scoping](yikbing/2026-10-17-yik-bing-spec-scoping.md): story-level specification scoping review and limits.
- [2026-10-19 Yik Bing agent model discussion and workspace preparation](yikbing/2026-10-19-agent-model-discussion-and-workspace-preparation.md): model configuration discussion, corrected repository discovery, upstream update, working branch and log organization.
- [2026-10-19 Yik Bing Claude model assignment recommendations](yikbing/2026-10-19-claude-model-assignment-recommendations.md): proposed Claude Code models/effort per SDD role, configuration guidance, unverified availability and pilot proposal; approved assignments applied to `.claude/agents/` on 2026-10-19, runtime discovery pending.
- [2026-10-18 spec boundary and layout](isaac/2026-10-18-spec-boundary-and-layout.md): revised contract definition and template, approved folder layout, 26 domain Drafts and independent documentation review.
- [2026-10-18 shared UI specification](isaac/2026-10-18-shared-ui-spec.md): user-requested visual and interaction direction, prior project/catalogue updates, UI Draft, scenario handoff and log organization.
- [2026-10-20 cross-platform run guide](isaac/2026-10-20-cross-platform-run-guide.md): ordered local startup, backend/frontend test commands, PowerShell and bash/zsh equivalents, and troubleshooting clarifications.
- [2026-10-18 Dylan project/authentication UI planning](dylan/2026-10-18-project-understanding-auth-ui-planning.md): repository review, account/provisioning decisions, bounded prototype specification, independent analysis/test/security handoffs and pre-implementation gates.
- [2026-10-19 Dylan shared authentication](dylan/2026-10-19-shared-authentication.md): revision 3 application-owned auth contracts, exact peer handoffs and corrected provisioning/session choices; implementation and human verification pending.

- [2026-10-20 foundation follow-through and backend applications](isaac/2026-10-20-foundation-follow-through.md): original Business multi-agent request, prerequisite evidence, approval gates, backend delivery, agent performance and corrected test-contract mismatch.

- [2026-10-21 complete Business application journey](isaac/2026-10-21-complete-business-applications.md): frontend scope/spec ownership and delivery questions, approved F06 revision 3, actual agent performance/corrections, 127 passing frontend checks and real browser/restart evidence; human review pending.

- [2026-10-21 open participation requests](isaac/2026-10-21-open-participation-requests.md): user-approved spec amendments, request/decision journey, agent performance and missed-coverage fixes, 195/173 passing suites, testing-guide and conversation-logging follow-ups; human verification pending.

Each teammate must add summaries for their own earlier sessions and verify the historical coverage. Existing SDD revision records can support backfills but are not original prompt transcripts.

- [2026-10-21 Isaac merge-conflict and verification conversation](isaac/2026-10-21-merge-conversation.md): whole-conversation summary covering preservation of both features, Node compatibility, CI/verifier setup, PowerShell safety, incomplete-run corrections, actual reviewer/test-owner handoffs, specification synchronization and final 452/452 verified cases. Human verification pending; [repair evidence](isaac/2026-10-21-merge-error-repair.md) retains the narrower execution record.

- [2026-10-21 frontend CI repair](isaac/2026-10-21-frontend-ci-repair.md): whole-conversation summary covering CI timeout and asynchronous selection diagnosis, independently reviewed test-owner corrections, 217 passing frontend tests/build, specification traceability, proposed commit message and logging follow-up; GitHub rerun and human verification pending.

- [2026-10-21 Yik Bing attendee F01 integration](yikbing/2026-10-21-attendee-integration.md): approved start-date contract alignment, independent test baseline/review, generated consumer integration, real HTTP/Chrome/PostgreSQL restart evidence and explicit remaining gates. Human verification pending.
