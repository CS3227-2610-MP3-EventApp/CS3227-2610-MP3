# Draft-spec skill and workflow consolidation

- Date/timezone: 2026-10-18, Asia/Singapore. Requesting session owner: Isaac.
- Source: visible user request, existing uncommitted root-spec-standard work, current file reads and actual tool/agent results. Earlier unavailable history is not reconstructed.
- AI factual check: checked against the evidence recorded below.
- Human verification: Pending; reviewer/date/corrections not supplied.

## Prompts and decisions

The user requested saving the drafting prompt as a skill named draft-spec, specifically for writing new specs or refining Draft specs, excluding actual-spec checking and synchronization. The user also requested reorganizing workflow/ so its sdd content no longer duplicates root specs/, and asked that the skill reflect the new structure.

The orchestrator applied the skill-creator instructions and checked official OpenAI skill-discovery documentation at https://learn.chatgpt.com/docs/build-skills. An optional location question offered repository or personal installation. After useful independent work and a stated repository-local default, the user explicitly confirmed .agents/skills/draft-spec. No personal/global skill copy was installed.

Agreed structure: specs/ owns capability contracts, definition/template/lifecycle/index; docs/ owns project scope/priority/accepted decisions, security and shared architecture; workflow/ owns the development process and detailed multi-agent/test handoffs. The skill references these authoritative sources rather than copying their logic.

## Actual agents and file ownership

- `/root` orchestrator: read skill-creator/OpenAI Docs and repository/role instructions; coordinated the reorganization; moved shared docs; updated live links, AGENTS, developer guidance and the security reviewer's source path; wrote workflow/README.md; removed superseded process entry points and verified-empty directories; ran checks; maintained this summary. Earlier uncommitted changes were preserved.
- `/root/coverage_review`, behaviour_verifier: read-only; independently supplied a nine-point pre-edit checklist covering complete rule/contract/story preservation, unique evidence principles, canonical sources, skill triggers/exclusions, non-Draft read-only handling, bounded writes, chosen installation scope and honest evidence. Final review found a duplicate workflow startup path introduced by mechanical replacement; root corrected it. Final recheck reported no blocking findings. The reviewer independently checked normalized project/security/F01 content equivalence, architecture title-only change beyond links, exact 31-story coverage, live references, validator and whitespace. Actual skill execution and this later log were outside that review.
- `/root/schema_review`, specification_analyst: owned only specs/README.md and specs/TEMPLATE.md. Proposed then implemented concise consolidation: kept capability/ID/lifecycle/index authority, replaced detailed execution protocol with links to workflow/agents, replaced the long starter prompt with the skill reference, and updated docs/process paths. Preserved stable IDs, adverse-case assertions and completed human-summary verification requirements. No app/test edits or nested delegation.
- `/root/catalogue_editor`, developer: owned only .agents/skills/draft-spec/SKILL.md and agents/openai.yaml. Read the skill-creator and UI metadata guidance, proposed the narrow workflow and authored the instruction-only skill after the independently reviewed checklist. No scripts, duplicate template or unrelated resources were added. It returned the scope, checks and remaining evaluation needs.
- `/root/security_review`, security_reviewer: independent forward-test assignment using the actual skill and minimal raw sources. The positive request was drafting F02-US02; excluded requests were implementation/spec audit-sync and refinement of a Ready target. Only isolated temporary artifacts were permitted, no real repository writes, child delegation or implementation testing. It created a revision-1 Draft with six observable criteria and four unresolved human-owned choices, declined audit/sync without inspection or writes, and left a synthetic Ready reference byte-identical. No skill correction was required by these cases. No blocking security regression was found in the migrated gates.

## Changes

Created repository-local draft-spec with default implicit discovery and a UI prompt explicitly naming $draft-spec. It reads current project sources, extracts scoped outcomes and writes only selected new/Draft specs plus minimal necessary index/log updates. Non-Draft references stay read-only. Audit/sync-only requests do not write; mixed requests perform only an independently separable requested drafting part. It does not implement, execute implementation tests, freeze/change baselines, invent approvals, push, merge or deploy. Draft review/scenario design remains distinct from implementation verification.

Moved workflow/sdd/project.md to docs/project.md, security.md to docs/security.md, and schema-and-parallel-plan.md to docs/architecture.md. Preserved their rules, decisions, scenarios, contracts and migration safeguards; architecture's heading and necessary relative links changed. Root specs/F01-published-programme.md retains its existing Draft/revision/criteria and only changes shared-source links in this reorganization.

Replaced workflow/WORKFLOW.md and workflow/sdd/README.md with one compact workflow/README.md. Retained unique evidence principles: identified revisions/snapshots, refresh affected checks, direct server enforcement, fresh-data lifecycle tests, fixture-vs-real integration, local-vs-deployed evidence, independent claim investigation, proportional checks and human responsibility. Detailed baseline/agent protocol stays in workflow/agents. Removed the now-empty retired sdd directories with explicit emptiness/path checks and nonrecursive removal.

Updated AGENTS, catalogue/developer guidance, specs references and .codex/agents/security_reviewer.toml to the final source paths. Historical logs retain their historical paths/statements. Earlier removal of nested F01 and the old spec template remains part of the prior uncommitted root-spec migration; this follow-up does not discard it or claim it happened again.

## Checks and limitations

- Skill creator quick_validate.py: Skill is valid.
- python tools/validate_agent_setup.py: passed six-role TOML/local Markdown links; runtime discovery on every teammate installation is not established.
- git diff --check: passed.
- Focused metadata/source assertions: $draft-spec prompt, 25-64 character UI summary, implicit invocation true, all referenced root sources exist, process-only workflow tree and no retired sdd/WORKFLOW sources.
- Exact 31-story index coverage retained; independent normalized move checks preserved project/security/F01 content and architecture except title/links. No protected tools/tests changed. The only agent-definition change is the security source path.
- Independent behaviour review: no unresolved blocking findings after startup-path correction.
- Independent forward-test artifacts: `C:\Users\isaac\AppData\Local\Temp\eventapp-draft-spec-security-1e94da5e28844351b9121b2c6861adc9`; actual scratch draft, evaluation record, Ready fixture and source-hash record. No real project spec was drafted by this test. The reviewer reported no repository writes; consulted skill/template/F01/product-source hashes were unchanged. AGENTS and the spec standard changed concurrently during root integration, so no whole-tree immutability claim is made. This was one bounded evaluation, not a complete multi-agent drafting cycle or proof of routing for all possible prompts.
- No application scheduling, authorization, real LLM, persistence/migration or online deployment tests ran. Structural skill checks do not establish good routing or authoring behaviour by themselves.

## Reflection and next steps

Each concern now has one canonical home. The draft-spec skill routes to those sources and stops at a reviewable Draft instead of becoming a second specification/process manual. Team members can invoke it with a story ID or an existing Draft path. Human product approval, application test-baseline gates, implementation verification and human correctness verification of this summary remain separate.
