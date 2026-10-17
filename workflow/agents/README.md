# EventApp multi-agent development workflow

Adopted by the requesting teammate on 2026-10-16; shared for team review in this change. This implements the agreed six-role design, including independent pre-implementation test design. It does not approve unfinished product specifications or prove runtime discovery on every teammate's installation.

## Shared setup and invocation

All three teammates use this repository's `AGENTS.md` and six project-scoped definitions under `.codex/agents/`. Open the actual repository root in Codex, use a feature branch, and start a new session after updating configuration. The main agent acts as orchestrator; its role definition is also available for explicitly delegated coordination, but an extra nested orchestrator is unnecessary.

Example startup prompt:

> Act as the orchestrator using AGENTS.md and workflow/agents/README.md. My assigned story/scope is [IDs and ownership]. Read its specification and check readiness. Explicitly invoke specification_analyst, test_case_designer, developer, behaviour_verifier, and security_reviewer at the appropriate stages. For application feature implementation, establish the reviewed test baseline before development, preserve file ownership, coordinate fixes and test disputes, and record actual handoffs, evidence, and this session's prompt/interaction summary in logs/. Ask for unresolved product decisions rather than inventing them.

Custom agents are discovered from `.codex/agents/*.toml` by supported Codex versions. No model override, provider, credentials, or machine-specific paths are required. The roles inherit the session's environment and permissions; instructions do not create filesystem isolation. If custom role discovery is unavailable but generic subagent tools exist, the main agent can read the corresponding TOML instructions and pass them to generic subagents, recording this fallback. If no delegation tools exist, stop the multi-agent portion and report the capability gap; do not simulate agents in prose. Check available capacity and sequence work within it; six roles do not mean six simultaneous workers.

## Source of truth and responsibilities

- Feature specifications and accepted decisions define required behaviour. The analyst drafts/refines them; humans approve product rules and resolve blockers.
- `.codex/agents/` defines reusable agent responsibilities. The orchestrator delegates and reconciles results; the analyst also investigates code and contracts.
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

## Test baseline integrity and change control

Use `python tools/check_test_baseline.py --baseline <approved-test-commit> --paths <protected-path> ...` before verification. Record the baseline SHA and path set in the run record **before** development. Include the guard itself, test plans, all acceptance fixtures/snapshots, and any configuration capable of weakening discovery or execution. Review the full diff for bypasses outside the listed paths. The guard requires a full immutable commit SHA, compares both staged and working-tree tracked content to the commit and detects untracked non-ignored files under protected paths; it does not prove coverage, detect every runtime bypass, or enforce permissions.

The developer reports a disputed test using [the change-request template](templates/test-change-request.md), with evidence and the specification clause. The test owner and independent verifier classify the cause. Implementation defects go back to the developer; environment failures are repaired without weakening expected results. A genuine test defect requires recorded independent assessment; requirement changes also require human product approval. The test owner makes the approved correction, reviewers check it, and the orchestrator records a replacement baseline plus why coverage is preserved. Never silently replace the baseline reference or erase old evidence.

These are behavioural and review controls, not an adversarial sandbox. Agents share session permissions. For stronger enforcement, keep baseline commits in human-reviewed history, run trusted baseline checks outside the developer's writable environment, and protect the relevant CI/branch rules. This change does not configure GitHub branch protection, claim filesystem-enforced test isolation, or add an application test runner that does not exist yet.

## Assignment and reporting contract

Use [task.md](templates/task.md) for objective, criteria/spec revision, input/output, file ownership, dependencies, approved baseline, commands, and authority. Use [test-plan.md](templates/test-plan.md) for coverage and adequacy. Use [run-record.md](templates/run-record.md) to identify actual agents and revisions, handoffs, findings, checks, and unresolved work. Agents return results to the orchestrator; humans do not need to relay every message.

Applicable review concerns: functionality, rejection/boundary/failure cases, authorization/privacy, contracts, data integrity/migrations/recovery, stale writes/concurrency/retries, AI grounding/fallback/limits, usability/accessibility, resource/performance bounds, deployment/logging, and accurate documentation. Mark each applicable concern's owner and evidence; use N/A with reasons instead of inventing checks.

## Validate the setup

Prerequisites: Git and Python 3.11 or later (the validator uses the standard-library TOML parser). No third-party Python packages are required.

Run `python tools/validate_agent_setup.py` for TOML/role and local-link checks, `python -m unittest discover -s tools/tests -v` for guard regression tests, and `git diff --check`. Then perform a real delegation smoke run: ask the main agent to invoke a specification analyst and both reviewers on a bounded documentation-only task, collect their findings, and log actual identities/results. Do not claim the feature-development cycle was exercised until a real application feature and approved test baseline have gone through it. Custom-agent discovery must be checked in each teammate's installation; portable role instructions and structural validation alone do not prove it.

Configuration reference checked 2026-10-16: [official Codex subagents documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents), including project-scoped standalone TOML definitions. No role-specific model is forced.

## Bootstrap exception

This initial documentation/configuration and guard-tooling change establishes the process itself; it does not have an existing approved application-test baseline. Its guard regression tests are author-written and independently reviewed, not represented as pre-approved tests written by a separate designer. Use the normal test-design/approval gate for subsequent product implementation. Do not retroactively invent a baseline approval for this setup.
