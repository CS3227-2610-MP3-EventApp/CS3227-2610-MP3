# EventApp multi-agent development workflow

Adopted by the requesting teammate on 2026-10-16; shared for team review in this change. This implements the agreed six-role design, including independent pre-implementation test design. It does not approve unfinished product specifications or prove runtime discovery on every teammate's installation.

## Shared setup and invocation

Teammates may use Codex, Claude Code, or both; both tools are first-class. All use this repository's `AGENTS.md` and the same six project-scoped roles, defined for Codex in `.codex/agents/*.toml` and for Claude Code in `.claude/agents/*.md`. Open the actual repository root in the chosen tool, use a feature branch, and start a new session after updating configuration. The main agent acts as orchestrator; its role definition is also available for explicitly delegated coordination, but an extra nested orchestrator is unnecessary.

- **Codex:** supported versions discover custom agents from `.codex/agents/*.toml` and read `AGENTS.md` as project instructions.
- **Claude Code:** supported versions discover project subagents from `.claude/agents/*.md` and load `AGENTS.md` as project instructions when no `CLAUDE.md` exists. Do not add a `CLAUDE.md` that diverges from `AGENTS.md`.

Example startup prompt (either tool):

> Act as the orchestrator using AGENTS.md and workflow/agents/README.md. My assigned story/scope is [IDs and ownership]. Read its specification and check readiness. Explicitly invoke specification_analyst, test_case_designer, developer, behaviour_verifier, and security_reviewer at the appropriate stages. For application feature implementation, establish the reviewed test baseline before development, preserve file ownership, coordinate fixes and test disputes, and record actual handoffs, evidence, and this session's prompt/interaction summary in logs/. Ask for unresolved product decisions rather than inventing them.

Each role file specifies its agreed model and reasoning effort for that tool below. Provider, credentials and machine-specific paths remain session-owned. The roles inherit the session's environment and permissions; instructions do not create filesystem isolation. In either tool, if custom role discovery is unavailable but generic subagent tools exist, the main agent can read the corresponding role instructions (TOML or Markdown; they are identical) and pass them to generic subagents, recording this fallback. If no delegation tools exist, stop the multi-agent portion and report the capability gap; do not simulate agents in prose. Check available capacity and sequence work within it; six roles do not mean six simultaneous workers.

## Economical model assignments

The responsibilities and SDD gates are shared across tools; only model and effort settings differ. Model families and effort names are not equivalent across tools, so each table was chosen separately.

### Codex

Agreed by Yik Bing on 2026-10-19 as an initial usage-conscious configuration, pending measurement on representative EventApp work.

| Role | Model | Reasoning effort |
| --- | --- | --- |
| orchestrator | `gpt-6.1-sol` | `medium` |
| specification_analyst | `gpt-6-luna` | `high` |
| test_case_designer | `gpt-6.1-sol` | `high` |
| developer | `gpt-6-luna` | `high` |
| behaviour_verifier | `gpt-6.1-sol` | `high` |
| security_reviewer | `gpt-6.1-sol` | `high` |

The values are set in each standalone `.codex/agents/*.toml` file using `model` and `model_reasoning_effort`. The orchestrator is normally the main chat: select GPT-6.1 Sol / Medium in the client for that chat; the orchestrator role file applies only when that custom agent is invoked and cannot switch the main chat's model. Start a new session after updating role files and check actual model selection in the client. Static validation does not establish account access or runtime discovery.

Use bounded assignments and relevant context. Apply the workflow proportionally to the change. Luna is the starting point for routine specification analysis and implementation; escalate to Sol for ambiguous requirements, shared contracts, authentication, migrations, difficult integration or a substantive failed attempt. Keep the existing two-unsuccessful-repair-round limit. Record any escalation and its reason; when using custom agents, update the applicable model setting for the authorized task because its file setting takes precedence over a spawn override. Model availability must be checked; report unavailable models rather than silently substituting one. These settings do not establish measured savings or guarantee a usage allowance.

Model fields and precedence checked against [official Codex subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents) on 2026-10-19.

### Claude Code

Approved by Yik Bing on 2026-10-19 as an initial usage-conscious configuration, pending measurement on representative EventApp work. Rationale and sources are in [the recommendation log](../../logs/yikbing/2026-10-19-claude-model-assignment-recommendations.md).

| Role | Model | Effort | First escalation |
| --- | --- | --- | --- |
| orchestrator (main chat) | `claude-sonnet-5-5` | `medium` | `claude-opus-5-5`, `medium` |
| specification_analyst | `claude-sonnet-5-5` | `high` | `claude-opus-5-5`, `medium` |
| test_case_designer | `claude-sonnet-5-5` | `high` | `claude-opus-5-5`, `medium` (`high` for authentication, persistence, concurrency or AI) |
| developer | `claude-sonnet-5-5` | `medium` | `claude-sonnet-5-5`, `high` for repair; then `claude-opus-5-5`, `medium` |
| behaviour_verifier | `claude-opus-5-5` | `medium` | `claude-opus-5-5`, `high` |
| security_reviewer | `claude-opus-5-5` | `medium` | `claude-opus-5-5`, `high` |

The values are set in each `.claude/agents/*.md` file using the `model` and `effort` frontmatter fields, with full model IDs for reproducible run records.

- **Main chat.** The orchestrator is normally the main chat. Select Sonnet 5.5 / medium in the model picker (or start with `claude --model claude-sonnet-5-5 --effort medium`). The plan default is Opus 5.5, and subagents without a `model` field inherit the main chat's model. The orchestrator role file applies only when that subagent is invoked and does not set the main chat's model.
- **Escalation triggers.** Escalate for ambiguous or conflicting requirements, shared contracts, authentication/authorization, migrations/persistence/restart behaviour, concurrency/retries, AI grounding or prompt injection, reviewer–developer disagreement, test-change disputes, or a first unsuccessful repair round (before the two-round limit is reached). Keep the existing two-unsuccessful-repair-round limit.
- **Precedence.** Unlike Codex, a per-invocation model or effort override takes precedence over the role file's frontmatter, so escalate by overriding the invocation rather than editing the role file, and record each escalation, its model/effort and its reason in the run record.
- **Environment overrides.** Do not set `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`; they override the per-role settings.
- Model availability must be checked; report unavailable models rather than silently substituting one. These settings do not establish measured savings or guarantee a usage allowance.

Model fields and precedence checked against official Claude Code [subagent](https://code.claude.com/docs/en/sub-agents) and [model configuration](https://code.claude.com/docs/en/model-config) documentation on 2026-10-19.

### Keeping the role files in sync

Role instructions are shared. Any change to a role's responsibilities must update both its `.codex/agents/<role>.toml` and its `.claude/agents/<role>.md` in the same change; only model and effort settings may differ. `tools/validate_agent_setup.py` enforces matching role sets, descriptions and instructions.

## Source of truth and responsibilities

- Approved capability specifications under root `specs/` and accepted decisions define required behaviour. Follow the [spec standard and index](../../specs/README.md) and [canonical template](../../specs/TEMPLATE.md) when extracting capabilities from user stories. The analyst drafts/refines them; humans approve product rules and resolve blockers.
- `.codex/agents/` (Codex) and `.claude/agents/` (Claude Code) define the same reusable agent responsibilities. The orchestrator delegates and reconciles results; the analyst also investigates code and contracts.
- The test designer owns scenarios, executable acceptance tests, fixtures, integration checks, and approved test corrections. Developers may add explicitly assigned non-baseline unit tests.
- Behaviour and security reviewers assess independently; neither edits the reviewed implementation. Required human teammate review still applies.
- This document defines handoffs and stage gates. Templates record task-specific scope, approval, evidence, and exceptions. Do not duplicate authoritative criteria in role files.

## Feature flow

1. **Specify and inspect.** Orchestrator records capability/task scope and bounded file ownership, then delegates analysis. Product roles do not assign features to developers. Read current contracts and code. Resolve blockers with humans, and record the exact approved specification/contract revisions. An agent cannot approve a missing product policy.
2. **Design tests first.** A separate test designer drafts scenarios and writes executable acceptance tests wherever interfaces and tooling permit. Identify deferred UI/integration/deployment checks explicitly. All required behaviour scenarios are designed before dependent implementation; later discoveries can add reviewed coverage.
3. **Review test adequacy.** Independent behaviour and security reviewers assess coverage, observable assertions, adverse cases, fixture validity, and harness behaviour. Missing-code/import failures alone do not prove a test meaningfully detects the defect it targets. Resolve findings, record reviewer identities/scope, and record human approval of any newly introduced product expectation.
4. **Freeze the baseline.** Record an immutable commit containing the approved tests/test plan, the spec revision, reviewers, all protected paths (including fixtures, snapshots, runner/configuration/CI and test selection), and exact full-suite commands. A baseline commit is not product approval. Capture scenario-only checks honestly; application test infrastructure does not yet exist in this repository.
5. **Develop.** Assign bounded application files and agreed interfaces to developer agents. Test-plan and baseline paths remain outside developer write ownership. Independent tasks can run in parallel; shared files and sequential contracts require coordinated handoffs. Developer runs the approved suite and reports failures without rewriting it.
6. **Verify.** Freeze a reviewable implementation commit or diff snapshot. Run the baseline-integrity check and agreed test commands. Behaviour and security reviewers independently inspect the same version; add required real integration, restart/persistence, accessibility, performance/resource, migration, and deployment checks. Do not confuse fixtures/mocks with delivered integration.
7. **Repair and recheck.** Orchestrator investigates findings and returns implementation fixes to the developer. Test disputes follow the process below. Re-run affected checks and refresh affected reviews. After two unsuccessful repair rounds, report the blocker/options for human direction. Do not mark unresolved criteria complete.
8. **Finish and learn.** Human teammate review and integration precede merge. Update specification/evidence and logs with prompts, corrections, actual agents, outcomes, and limitations. Record human summary-verification status separately from agent factual checks. Prepare the authorized PR; do not auto-merge.

## Merge and long-run hygiene

- **Merging branches that each add migrations.** Merging creates a multi-parent Alembic revision. Before merging, search tests and tools for assumptions of a linear history (a string `down_revision`, a single predecessor, downgrading from head). Forward-only migrations must not be downgraded; if a protected test assumes linearity, report it with the test-change template rather than editing it, and prefer a graph shape that keeps the test valid when no behaviour changes. Run `alembic heads` and the migration tests on the merged result before pushing.
- **One test run per database.** Never run two pytest or alembic processes against the same `TEST_DATABASE_URL`; they reset each other's data and cause spurious failures and hangs. Check `docker ps` and running processes first, and reuse an existing test container on port 5433 instead of starting another.
- **Stop slow commands.** If a command takes much longer than expected (for example, a suite that CI finishes in about 5 minutes), stop it, find the cause (concurrent runs, hung containers, buffered output) and tell the human. Do not wait silently. Use verbose output so progress is visible.

## Test baseline integrity and change control

Use `python tools/check_test_baseline.py --baseline <approved-test-commit> --paths <protected-path> ...` before verification. Record the baseline SHA and path set in the run record **before** development. Include the guard itself, test plans, all acceptance fixtures/snapshots, and any configuration capable of weakening discovery or execution. Review the full diff for bypasses outside the listed paths. The guard requires a full immutable commit SHA, compares both staged and working-tree tracked content to the commit and detects untracked non-ignored files under protected paths; it does not prove coverage, detect every runtime bypass, or enforce permissions.

The developer reports a disputed test using [the change-request template](templates/test-change-request.md), with evidence and the specification clause. The test owner and independent verifier classify the cause. Implementation defects go back to the developer; environment failures are repaired without weakening expected results. A genuine test defect requires recorded independent assessment; requirement changes also require human product approval. The test owner makes the approved correction, reviewers check it, and the orchestrator records a replacement baseline plus why coverage is preserved. Never silently replace the baseline reference or erase old evidence.

These are behavioural and review controls, not an adversarial sandbox. Agents share session permissions. For stronger enforcement, keep baseline commits in human-reviewed history, run trusted baseline checks outside the developer's writable environment, and protect the relevant CI/branch rules. This change does not configure GitHub branch protection, claim filesystem-enforced test isolation, or add an application test runner that does not exist yet.

## Assignment and reporting contract

Use [task.md](templates/task.md) for objective, criteria/spec revision, input/output, file ownership, dependencies, approved baseline, commands, and authority. Use [test-plan.md](templates/test-plan.md) for coverage and adequacy. Use [run-record.md](templates/run-record.md) to identify actual agents and revisions, handoffs, findings, checks, and unresolved work. Agents return results to the orchestrator; humans do not need to relay every message.

Applicable review concerns: functionality, rejection/boundary/failure cases, authorization/privacy, contracts, data integrity/migrations/recovery, stale writes/concurrency/retries, AI grounding/fallback/limits, usability/accessibility, resource/performance bounds, deployment/logging, and accurate documentation. Mark each applicable concern's owner and evidence; use N/A with reasons instead of inventing checks.

## Validate the setup

Prerequisites: Git and Python 3.11 or later (the validator uses the standard-library TOML parser). No third-party Python packages are required.

Run `python tools/validate_agent_setup.py` for role, TOML, Claude frontmatter, cross-tool sync and local-link checks, `python -m unittest discover -s tools/tests -v` for guard regression tests, and `git diff --check`. Then perform a real delegation smoke run in each tool you use: ask the main agent to invoke a specification analyst and both reviewers on a bounded documentation-only task, collect their findings, and log actual identities/results. Do not claim the feature-development cycle was exercised until a real application feature and approved test baseline have gone through it.

Custom-agent discovery must be checked per tool in each teammate's installation; portable role instructions and structural validation alone do not prove it.

- **Codex:** confirm that the custom roles are offered and that the client shows the expected model and reasoning effort for each spawned agent.
- **Claude Code:** confirm that `AGENTS.md` is loaded as project instructions (for example with `/memory`), that the roles appear among the available subagents, and that the background-tasks view shows the expected model and effort for each invoked subagent.

Configuration reference checked 2026-10-16: [official Codex subagents documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents), including project-scoped standalone TOML definitions. Role-specific model defaults were added on 2026-10-19; see the economical model assignments above. Claude Code role files were added on 2026-10-19; see the Claude Code references in that section.

## Bootstrap exception

This initial documentation/configuration and guard-tooling change establishes the process itself; it does not have an existing approved application-test baseline. Its guard regression tests are author-written and independently reviewed, not represented as pre-approved tests written by a separate designer. Use the normal test-design/approval gate for subsequent product implementation. Do not retroactively invent a baseline approval for this setup.
