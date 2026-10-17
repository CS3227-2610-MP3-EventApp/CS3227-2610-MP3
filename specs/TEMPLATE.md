# Capability title

| Field | Value |
| --- | --- |
| Capability / primary story ID | Fxx-USxx |
| Covered stories | Link canonical catalogue IDs; map each to authoritative AC IDs below |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Actors and linked project phase |
| Product and contract approval | Pending: human authority, exact revision/contract versions, date and record |
| Task / run record | Pending: bounded file ownership, actual agent identities and independent review assignments |

Use the [specification standard](README.md). The [catalogue](../docs/UserStoriesAndFeatures.md) owns story wording; [project context](../docs/project.md) owns phases and RD decisions. Replace placeholders; use justified N/A where irrelevant. Do not invent policy or claim review/approval that did not occur.

## Outcome and scope

State the complete user-visible capability and why it matters. Define actors, permitted resources, entry conditions, included behavior and explicit exclusions. Link the story rather than copying the catalogue. Map assignment requirements to this capability (LLM role coverage, SDD/multi-agent evidence, AI/process security, online/environment delivery), or explain N/A. A cross-component journey can remain one capability; bounded implementation tasks follow later.

## Rules and acceptance criteria

Reference applicable [SEC rules](../docs/security.md) and accepted RD01-RD07. State authorization/visibility, domain invariants, failure behavior and agreed measurable bounds. Distinguish accepted requirements from proposed decisions.

| ID | Observable criterion: initial state, action and expected result | Story / RD / SEC references | Verification scenario |
| --- | --- | --- | --- |
| Fxx-USxx-AC01 | Given [initial state], when [actor action], then [observable result] | Fxx-USxx; applicable rules | Positive outcome and observable assertion |
| Fxx-USxx-AC02 | Given [unauthorized, invalid, stale or failed request], when [request reaches the enforcement boundary], then [observable rejection or failure result] | Applicable rules | Rejection/boundary/failure assertion |

Add only applicable criteria, covering positive, rejection, boundary and failure cases. Define direct server-boundary permission checks, data persistence and stale/concurrent behavior when relevant. For denied, invalid or failed operations, assert before/after that relevant persisted domain state is unchanged and prohibited side effects did not occur. Where partial work is possible, specify and verify atomicity or the agreed recovery behavior; permitted failure/audit records remain explicit. Every covered story maps to criteria; define shared integration criteria once. Follow README ID rules, including retained legacy IDs and split-file allocation.

For AI, make criteria cover permitted inputs/sources and outbound fields, untrusted-content injection, validated schema/facts before display, domain validation before acceptance, human approval boundaries, job ownership/progress/cancellation, quotas/timeouts, provider failure/manual fallback and retained accepted data. Specify exact-action approval and reconciliation if external actions exist. For development-process security, reference protected baseline integrity, bounded ownership and independent review evidence. Link shared rules instead of duplicating them; record unresolved provider/policy/limit choices below.

## Interfaces, data and dependencies

Link versioned producer/consumer contracts and [module ownership/migration rules](../docs/architecture.md). State required inputs/outputs, authoritative records, visibility, states/revisions, side effects and validation boundaries sufficient to design meaningful tests. Describe necessary schema/API changes; distinguish required behavior from recommended implementation design.

Record prerequisites, task/file boundaries and shared-file coordination. Identify what can proceed using approved synthetic fixtures, what needs a real producer/provider, and the final integration/deployment checks. Include relevant atomicity, migration/upgrade/recovery and retention decisions. Do not write another module's tables directly.

## Decisions and approval

| Decision | Options / proposed direction | Decision owner | Blocks what? | Resolution and approval evidence |
| --- | --- | --- | --- | --- |
| D-local-01 | Pending | Human authority to assign | Ready / affected implementation | Pending |

Resolve blockers and record human approval of the exact spec/contract revisions before Ready. Ready does not authorize implementation; follow the prerequisite gates in the [agent workflow](../workflow/agents/README.md).

## Verification and evidence

- Test plan, protected baseline and task/run record: pending; link the authoritative records required by the [agent workflow](../workflow/agents/README.md), including separate test ownership, actual reviews and revisions. Do not duplicate its execution protocol here.
- Deferred/manual scenarios: identify each criterion, reason, responsible task and required completion evidence; do not count unexecuted checks as passing.
- Implementation snapshot / spec and contract revisions tested: pending.
- Actual independent implementation reviews: none yet; record reviewers, scope, snapshot and results. Required human teammate review remains separate.

| Criterion | Test/observation, command or artifact and result | Revision / reviewer | Status / limitation |
| --- | --- | --- | --- |
| Fxx-USxx-AC01 | Pending | Pending | Not verified |
| Fxx-USxx-AC02 | Pending | Pending | Not verified |

Record criterion-specific evidence and applicable integration, security and delivery results required by the [development workflow](../workflow/README.md). Include environment-separation evidence where relevant. Link task/run records and [session logs](../logs/README.md), with human summary-verification status. State remaining gaps and next action. Completed requires required human teammate review and completed human correctness verification of the session summary; recording a pending status is insufficient. Refresh affected approvals/reviews/evidence after changes; preserve historical records.

## Revision history

| Revision / date | Change, retired or moved criterion IDs and successor mapping | Approval / evidence impact |
| --- | --- | --- |
| 1 / YYYY-MM-DD | Initial draft | Approval and verification pending |
