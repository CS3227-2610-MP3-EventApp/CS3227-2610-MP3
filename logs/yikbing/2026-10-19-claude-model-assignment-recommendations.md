# Claude Code model assignment recommendations

- Date/timezone and owner: 2026-10-19, Asia/Singapore; Yik Bing.
- Feature/task, branch and source revision: Claude Code model recommendations for the existing six-role SDD workflow; branch `chore/agent-model-configuration` at base `13b768b` with the earlier uncommitted Codex model changes still present.
- Source coverage: visible prompt, assistant responses and tool output in this Claude chat. The earlier Codex/ChatGPT discussion is summarised in [the previous session log](2026-10-19-agent-model-discussion-and-workspace-preparation.md) and is not re-covered here.
- AI factual check: checked against the repository files read and the official Anthropic pages fetched on 2026-10-19 (listed below).
- Human verification: Pending. Reviewer/date/corrections: not yet supplied.

## Prompts and interactions

1. The user asked Claude to review the existing six-agent SDD workflow and recommend economical Claude Code model assignments, keeping responsibilities, independent test design, the protected baseline, review independence and human approval gates unchanged. The approved Codex table (Sol medium orchestrator; Luna high analyst and developer; Sol high test designer, behaviour verifier and security reviewer) was supplied for context, with an instruction not to assume direct equivalence between model families.
2. The user required: current official Anthropic documentation; the models available in this installation; per-role default model, effort, rationale and escalation triggers; a distinction between subscription usage and API pricing; how to configure the main chat separately from subagents; flags for unverifiable availability; a small representative evaluation task; no agents spawned merely for the recommendation; no configuration changes yet; and this session log with human verification Pending.
3. The assistant requested and received access to the repository folder, then read `AGENTS.md`, `workflow/README.md`, `workflow/agents/README.md`, all six `.codex/agents/*.toml` files, `logs/README.md`, `logs/TEMPLATE.md`, the previous Yik Bing session log, the spec status index and the backend foundation test-change request. No subagents were invoked.
4. The assistant consulted official Anthropic pages: Claude Code subagents (`code.claude.com/docs/en/sub-agents`), model configuration (`code.claude.com/docs/en/model-config`), cost management (`code.claude.com/docs/en/costs`) and API pricing (`platform.claude.com/docs/en/about-claude/pricing`).

## Proposed assignments (proposal only; not approved or applied)

| Role | Default model | Effort | First escalation |
| --- | --- | --- | --- |
| orchestrator (main chat) | Sonnet 5.5 (`claude-sonnet-5-5`) | medium | Opus 5.5, medium |
| specification_analyst | Sonnet 5.5 | high | Opus 5.5, medium |
| test_case_designer | Sonnet 5.5 | high | Opus 5.5, medium (high for auth/persistence/concurrency/AI) |
| developer | Sonnet 5.5 | medium | Sonnet 5.5 high for repair; then Opus 5.5 medium |
| behaviour_verifier | Opus 5.5 (`claude-opus-5-5`) | medium | Opus 5.5, high |
| security_reviewer | Opus 5.5 | medium | Opus 5.5, high |

Rationale summary: producing roles (analysis, test design, implementation) and coordination start on Sonnet 5.5 because their output is checked by later independent gates; the two final independent reviewers start on Opus 5.5 at its default medium effort because nothing automated follows them, and a different model family from the producers reduces correlated blind spots. Haiku 5.5 is not proposed for any gate role. Fable 5.1 is not proposed as a default; it is the most expensive API model and may bill to usage credits on some subscription plans. Escalation triggers recorded in the chat response include: ambiguous or conflicting requirements, shared contracts, authentication/authorization, migrations/persistence/restart behaviour, concurrency/retries, AI grounding/injection, reviewer–developer disagreement, test-change disputes, and a first unsuccessful repair round (escalating before the existing two-round limit is reached). Every escalation is to be recorded in the run record.

Configuration guidance given (not applied): select the main chat model with `/model` (or `claude --model claude-sonnet-5-5 --effort medium`) because the subscription and API `default` resolves to Opus 5.5 and subagents without a `model` field inherit the main chat model; define Claude roles as `.claude/agents/<role>.md` with `model` and `effort` frontmatter because Claude Code does not read `.codex/agents/*.toml`; prefer full model IDs over aliases for reproducible run records; avoid `CLAUDE_CODE_EFFORT_LEVEL` and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, which override per-role settings. In Claude Code a per-invocation `model` parameter takes precedence over frontmatter, which differs from the Codex precedence noted in the workflow README.

Proposed evaluation: a replay pilot of the backend foundation capability (`specs/shared/run-backend-with-postgresql.md`, revision 2, currently In review) in an isolated worktree, comparing quality, repair rounds, escalations and plan usage against the recorded Codex run, including whether the reviewers independently reach the BF-TCR-01 classification. No capability spec is currently Ready, so a new feature implementation cannot serve as the pilot without human approval.

## Decisions and actions

- Decision: none. The table above is a proposal awaiting the user's review.
- Files changed: this new log file and one coverage-index line in `logs/README.md`. No configuration, role definition, workflow rule, test or application file was modified. Nothing was committed or pushed.

## Verification and limitations

- Not verifiable from this session: the user's own Claude Code version (Sonnet 5.5 needs v2.1.284+, Opus 5.5 v2.1.280+, per-invocation subagent effort v2.1.292+), authentication type and plan, any organization `availableModels`/model restrictions/effort caps, whether Fable bills usage credits on the user's plan, whether the user's Claude Code loads `AGENTS.md` automatically, and runtime discovery of `.claude/agents/`. The Claude binary present in the remote workspace is not the user's installation and was not used as evidence.
- Subscription consumption was deliberately not estimated from API prices. API list prices were cited only for API/Console billing.
- No model behaviour, quality or usage was measured; the recommendations are reasoned from role responsibilities and official documentation, not benchmarked.
- Human verification of this summary remains pending.

## Reflection and next steps

The user should check `claude --version`, `/status`, `/model` and `/usage` locally, then decide whether to adopt the proposal and run the replay pilot before the assignments are written to `.claude/agents/` and documented in `workflow/agents/README.md`.

## Follow-up: plan and setup verification

The user stated they are on the Claude Pro plan (SGD 30/month) and asked why Claude could not check whether their installation loads `AGENTS.md` and discovers `.claude/agents/`. The assistant explained that its shell runs in a separate Linux workspace with only the granted repository folder mounted; it cannot run the user's Windows Claude Code, open an interactive session there, or read `~/.claude/` settings, and loading/discovery are runtime behaviour of the installed version. It then checked what the repository can show: there is no `CLAUDE.md`, `CLAUDE.local.md` or `.claude/` folder, so under the documented default (Claude Code v2.1.277 or later, "Project instructions" left at its default) `AGENTS.md` would load automatically, and `.claude/agents/` does not exist yet because configuration has not been created. Local checks were proposed (`claude --version`, the startup "AGENTS.md loaded" line or `/memory`, `/status` for subscription login, and later `@` typeahead/`/tasks` for agent discovery).

Pro-plan implications recorded: Pro usage limits are shared between Claude chat and Claude Code; Opus is available on Pro within plan limits; Fable on Pro is reported to bill to usage credits (official Claude Code docs say this depends on plan/seat; the Pro-specific statement came from a secondary source summarising the support article). The proposed table is unchanged, but the pilot should run roles sequentially and watch `/usage` closely because Pro limits are comparatively small. Plan type is now user-stated rather than unknown; version, organization restrictions and runtime discovery remain unverified. Human verification remains Pending.

Follow-up: the user ran `claude --version` in Windows PowerShell and it was not recognized, so the Claude Code CLI is either not installed or not on PATH on their machine. The assistant pointed to the official native installer and the Desktop app as options; installation and version remain unverified.

Follow-up: the user installed Claude Code with the official PowerShell installer, which reported version 2.1.303 at `C:\Users\yikbi\.local\bin\claude.exe` and warned that this folder is not on PATH; `claude` was still not recognized in the repository folder. 2.1.303 meets the documented minimums for Sonnet 5.5, Opus 5.5, AGENTS.md loading and per-invocation subagent effort (user-reported installer output, not yet confirmed by `claude --version`). The assistant gave a current-window PATH workaround and pointed to the installer's permanent PATH step.

## Follow-up: Claude Code configuration applied

Session: Claude Code desktop app (Code tab), main chat on Opus 5.5 (`claude-opus-5-5`), 2026-10-19, same branch with the earlier uncommitted Codex model changes preserved.

- Prompt: Yik Bing asked the main agent to act as orchestrator and apply the following Claude Code assignments, which they approved. Configuration/documentation only; role responsibilities, independent test design, the protected baseline, review independence and the human approval gates were to stay unchanged. Approved assignments: orchestrator (main chat) `claude-sonnet-5-5` medium; specification_analyst and test_case_designer `claude-sonnet-5-5` high; developer `claude-sonnet-5-5` medium; behaviour_verifier and security_reviewer `claude-opus-5-5` medium. The user also asked that the docs treat Codex and Claude Code as equally supported, that the validator check the new files, that the checks and a discovery smoke check be run, and that this follow-up be appended.
- Files changed:
  - New `.claude/agents/<role>.md` for all six roles. Each was generated from the matching TOML, so its description and instructions are identical. The orchestrator file says, in a YAML comment in its frontmatter, that it does not set the main chat's model. The comment sits there because the body must match the TOML exactly.
  - `AGENTS.md`: the shared-roles bullet now names both role directories.
  - `workflow/agents/README.md`:
    - setup and invocation now cover both tools, with a tool-neutral startup prompt and the fallback and capability-gap rules applying to both;
    - the source-of-truth bullet names both directories;
    - the model section keeps the Codex table unchanged and adds a Claude Code table with first escalations and triggers, main-chat selection, override precedence and the environment variables to avoid, replacing the "pending" sentence;
    - new rule for keeping the role files in sync;
    - per-tool validation and discovery checks.
  - `docs/DeveloperGuide.md:9`: "Codex" changed to "Codex or Claude Code". This edit was outside the files listed in the request and was reported to the user.
  - `tools/validate_agent_setup.py`: now also checks the Claude agent files:
    - required frontmatter fields (`name`, `description`, `model`, `effort`), with no other fields allowed;
    - model must be a full Claude model ID; effort must be one of low, medium, high, xhigh, max;
    - file name matches the role name, with no duplicate roles;
    - the same role set as the TOML files;
    - description and instructions match the TOML, ignoring whitespace and line endings.

    The existing TOML checks are kept.
  - `.codex/agents/*.toml` were not modified in this session.
- Checks (actual results):
  - `python -B tools/validate_agent_setup.py`: PASS.
  - `python -m unittest discover -s tools/tests -v`: 9 tests, OK.
  - `git diff --check`: no issues; Git warned that it will convert the validator's line endings from LF to CRLF on checkout.
  - The validator was also run against temporary copies with deliberate faults. It reported each one: changed instructions, an invalid effort, a short model name (`opus`), a missing role, a missing description and a changed description. A copy with only CRLF line endings passed, as intended.
- Discovery smoke check: not done in this session. Claude Code loads `.claude/agents/` when a session starts, and these files were created after this session started. Invoking `specification_analyst` returned "Agent type not found"; only the built-in agent types were available. `behaviour_verifier` was not attempted. The generic-subagent fallback was not used because it would not test discovery or the frontmatter settings. No models were observed for either role. The user will run the smoke check in a new Claude Code session and report the models and effort shown in the background-tasks view.
- Limitations:
  - Codex discovery was not checked in this session.
  - Claude Code discovery and the model/effort actually used at runtime are not yet verified.
  - No unit tests were added for the new validator checks; the fault checks above were one-off runs on temporary copies.
  - `$draft-spec` and `.agents/skills/` are Codex-specific and were not adapted for Claude Code.
  - Nothing was committed or pushed.
- Human verification: Pending.

## Follow-up: discovery smoke check in a new Claude Code session

The user started a new Claude Code session in the repository root and reported the results here. The assistant in this session didn't observe them directly.

- First, the user typed `/` intending to run `/memory`, but the menu ran the unrelated `anthropic-skills:import-memory` skill instead. That skill saved nothing. `/memory` may not be available in the desktop app's Code tab.
- Instead, the new session was asked, without using tools, which project instruction file it had loaded at startup. It named `AGENTS.md` at the repository root, "checked into the codebase", and quoted its first heading, "EventApp development instructions". This confirms, as reported by the user, that `AGENTS.md` loads as project instructions when no `CLAUDE.md` exists.
- The user then ran the smoke-check prompt, which delegated one read-only task each to `specification_analyst` and `behaviour_verifier` with no model or effort override. According to the user, the background-tasks view showed Sonnet 5.5 and Opus 5.5 respectively. This matches the role frontmatter and indicates that both project subagents were discovered.
- Effort was not visible in the background-tasks view, so the configured efforts (high for the analyst, medium for the verifier) remain unverified at runtime. The workflow README says that view shows model and effort; this observation contradicts that for effort.
- The subagents' replies were not reported here. The other four roles, a Sonnet 5.5 main chat and Codex discovery remain unchecked.
- Human verification: Pending.
