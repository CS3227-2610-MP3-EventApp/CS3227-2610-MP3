# EventApp development instructions

Use EventApp as the product name. Historical commits may use Converge.

## Start here
- Read `workflow/README.md`, `specs/README.md`, the relevant capability specification under root `specs/`, and applicable rules in `docs/security.md`.
- Follow `workflow/agents/README.md` for the team's multi-agent development process. The main agent is the orchestrator; use actual subagent tools, not simulated role dialogue.
- Use the six shared roles, defined for Codex in `.codex/agents/*.toml` and for Claude Code in `.claude/agents/*.md` with identical responsibilities and only tool-specific model settings. Read the relevant role definition when assigning it. Role names are orchestrator, specification_analyst, test_case_designer, developer, behaviour_verifier, and security_reviewer.
- Delegate bounded tasks with the specification revision, expected output, permitted files, and dependencies. Record actual agent identities, assignments, handoffs, findings, and results. If delegation is unavailable, report that limitation; do not claim a multi-agent run.

## Specifications and protected tests
- Derive scoped capabilities from `docs/UserStoriesAndFeatures.md`, following `specs/README.md` and the canonical `specs/TEMPLATE.md`. Store draft and approved capability specs together under root `specs/`; status and recorded human approval distinguish them. The phase roadmap and accepted decisions remain in `docs/project.md`; shared contracts remain in `docs/architecture.md`. Do not create competing templates or duplicate specs under workflow/.
- Use the repository skill `.agents/skills/draft-spec/SKILL.md` for new specifications or refining existing Drafts. It does not cover finalized-spec audits, implementation verification or code/spec synchronization; non-Draft specs remain read-only within that skill.
- Accepted RD01–RD07 remain authoritative. Draft stories and proposed schema fields are not blanket implementation approval. Humans resolve blocking product decisions.
- Design and independently review required test scenarios before feature implementation. Create executable acceptance tests before implementation where contracts and tooling permit; record deferred/manual checks explicitly.
- The developer cannot modify the approved test baseline: cases, assertions, fixtures, snapshots, expected outputs, test discovery/configuration, runner, baseline reference, or this protection policy. Never weaken, skip, or bypass tests to fit an implementation.
- Report a suspected faulty test using `workflow/agents/templates/test-change-request.md`. The test owner and independent verifier investigate; humans approve changes to product behaviour. Record approval and have the test owner make the correction before issuing a new baseline.
- Assign additional developer-owned unit tests outside the protected baseline where appropriate. Any new acceptance tests become protected after review. Test-file ownership is explicit; coordinate edits.
- Re-run affected checks after fixes. Passing tests alone does not prove coverage, real integration, security, persistence, or deployment.

## Ownership and evidence
- Do not overwrite another person's work or write another module's tables directly. Coordinate shared contracts and migrations. Use synthetic data; keep secrets out of code, logs, and prompts.
- Reviewers must not implement the change they independently review. Behaviour and security checks may run in parallel against the same diff snapshot. Agent review does not replace required teammate review.
- Before finishing a meaningful development session, create/update its summary in `logs/`, following `logs/README.md`. Summarise prompts and interactions, outcomes, corrections, agent handoffs, checks, and limitations; never fabricate missing history or human verification.
- Keep specifications and summary logs current with changes. No merge or production deployment without human authorization. Push/PR only within the user's requested scope.
