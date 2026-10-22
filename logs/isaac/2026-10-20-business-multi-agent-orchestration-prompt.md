# Business multi-agent orchestration prompt

- Date/timezone and session owner: 2026-10-20 Asia/Singapore / Isaac.
- Feature/task, branch and source revision: Business development orchestration guidance and prompt refinement; branch and source revision not inspected.
- Source coverage: Entire visible conversation in this session, including supplied repository instructions and tool results; earlier conversations and external run history unavailable.
- AI factual check: Checked against the visible conversation, official Codex subagent documentation, logs/README.md, logs/TEMPLATE.md, and opening headings of two existing Isaac entries. Foundation implementation status was not verified.
- Human verification: Approved by the team on 2026-10-22.

## Prompts and interactions

1. Isaac supplied a reading of the project documentation: independent tasks may run in parallel once prerequisites and contracts are ready; assignment is by bounded task rather than permanent feature ownership; module-owned tables are technical write boundaries. Shared backend, authentication, F10-US01 permissions, and UI foundations must precede dependent role features. Isaac highlighted Business membership and submission-producer dependencies for F06-US01/F06-US03, submitted-application dependencies for F04-US01/F06-US02, and the F05 dependency for F03-US03. These were user-supplied context, not independently verified repository findings in this session.
2. Isaac asked how to use the Codex subagents in .codex/agents to start Business development, or shared features if unfinished. The assistant proposed one main orchestrator session using specification_analyst, test_case_designer, developer, behaviour_verifier, and security_reviewer, and supplied a copyable startup prompt. It recommended one bounded implementation task first and parallel developers only when independent tasks are ready.
3. Isaac requested stronger Business emphasis and asked whether the prompt would identify and perform the next task automatically. The assistant clarified that the prompt directs autonomous task selection, implementation, testing, and review within recorded approvals, while missing human product decisions remain blocking. The revised prompt prioritized F06/F09 and limited shared work to necessary prerequisites.
4. Isaac requested an explicit requirement to finish previous steps because the shared foundation status was uncertain. The assistant added a prerequisite verification gate based on code, tests, integration evidence, and review records. Missing evidence must be classified as unverified. All transitive dependencies must be checked; unrelated earlier roadmap rows do not automatically block independent work. The proposed foundation order was backend, authentication, F10-US01 permissions, then shared UI, with the precise order to be confirmed from repository documents.
5. Isaac asked for a more concise prompt. The final version retained Business priority, actual role-based subagents, prerequisite verification, approved specifications and recorded human product approvers, independent test-baseline review, protected tests, explicit ownership, independent behaviour/security reviews, fixes and rechecks, required logging, and one bounded task per run. It prohibited pushing, merging, and deployment.
6. Isaac requested a log of this entire conversation under logs/isaac, matching existing style while checking headings from at most two other log entries. The assistant read the logging instructions and template, and only the opening 22 lines of the cross-platform run guide and scheduling clarification entries to establish style.

## Decisions and actions

The final proposed execution sequence is: verify prerequisites, confirm approved specification, independently review acceptance tests, implement, run checks and independent reviews, then fix and recheck before dependent work proceeds. Business work should be selected when ready; otherwise the next eligible necessary shared prerequisite should be selected. Draft or missing specifications require preparation and human approval rather than invented authorization.

The prompt assigns readiness assessment to specification_analyst, acceptance-baseline ownership to test_case_designer, independent baseline and behaviour review to behaviour_verifier, implementation to developer, and security review to security_reviewer. The main agent coordinates ownership, shared contracts, migrations, evidence, and logs. Delegations must identify scope, permitted files, specification revision, dependencies, and baseline reference. These are instructions for a future run, not completed handoffs.

Initial shell reads of workflow documents and the openai-docs skill failed with a Windows sandbox initialization error. A Node-based filesystem fallback failed for the same reason. Consequently, the assistant could not inspect the role TOML files or establish foundation completion. It consulted the official Codex subagent documentation instead: https://learn.chatgpt.com/docs/agent-configuration/subagents . The documentation described project-scoped standalone TOML agents and default subagent availability. The six repository-specific roles were exposed in this session's available agent tools, but their on-disk contents were not verified.

For this logging request, the normal shell attempt again failed. Escalated read-only shell calls succeeded and supplied the logging instructions, file inventory, template, and the two limited style samples. Created this session summary under logs/isaac.

## Verification and limitations

- No subagents were spawned. No development run, readiness assessment, implementation handoff, independent review, or acceptance-test baseline was executed.
- No application code, specifications, agent configuration, or tests were changed. No tests, integration checks, commits, pushes, merges, or deployments were performed.
- Shared foundation and Business implementation status remains unknown. Statements that prior work was underway originated in the supplied conversation context and were not confirmed.
- The assistant announced use of the openai-docs skill, but its local SKILL.md could not be read; no claim of completing that skill workflow is made.
- The prompts are proposed operating instructions, not evidence of product approval or successful execution. Autonomous progress still depends on tool access, approved scope, prerequisite completion, and recorded human decisions.
- Human verification of this summary remains pending.

## Reflection and next steps

The main clarification was to separate autonomous task execution from assumptions about readiness: the next run should verify foundations and dependencies before implementing Business features. Progressive prompt revisions made the Business scope and completion gates explicit while reducing repeated instructions.

Run the final concise prompt in a functioning repository session, establish actual prerequisite status, and complete one eligible bounded task. Isaac should review this summary and record the verification date and any corrections.
