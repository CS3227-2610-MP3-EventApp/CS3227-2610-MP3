# Task-centric workflow review

- Date/timezone: 2026-10-17, Asia/Singapore. Requesting session owner: Isaac.
- Task: review story consolidation and phase-based planning against four assignment requirements.
- Branch/source: `itzxitzx/specs-proposal`, `f6b6de974a5cd5f5f1b78286ec2c8b7e5398f259`; working tree initially clean.
- Source coverage: visible conversation and repository documentation. Earlier unavailable conversations are not reconstructed.
- AI factual check: checked against file reads, actual delegation results and command output.
- Human verification: Approved by the team on 2026-10-22.

## Prompts and interactions

The user requested one canonical user-story table in docs/UserStoriesAndFeatures.md, an ordered phased roadmap in project.md, removal of static feature-to-person assignments and obsolete person-based workflow files. Initial sandbox failures prevented inspection; the earlier response was a provisional outline, not a grounded cleanup plan.

The user then requested a review of everything under docs/ and workflow/, particularly the schema/parallel plan, preserving LLM features for each role, SDD/basic multi-agent SE, explicit AI and process security implementation/testing, and online deployment with separate development/production environments.

The orchestrator read shared workflow/role instructions, product documents, specifications, security/schema plans and agent templates, and delegated bounded read-only reviews against the current working-tree documentation:

- `/root/schema_review`, specification_analyst: product/story/schema and person-guide consolidation; no edit ownership. Returned recommendations to retain technical schema contracts, replace named rounds with dependencies, preserve scope exclusions before removing five person-guide files, preserve RD01–RD07 and propose story-level phases.
- `/root/security_review`, security_reviewer: security, process and deployment coverage; no edit ownership. Returned independent findings on mandatory role-specific AI evidence, SEC/RD safeguards, test-baseline independence, release/environment gates and draft specification status.
- `/root/coverage_review`, behaviour_verifier: independent document coverage and story-to-spec migration review; no edit ownership. Returned findings to preserve F01 revision 3's nine stable criteria, migrate exclusions before deleting guides, replace person-extract counts with 31-story traceability, and retain incremental F10 foundations. Flagged the unresolved difference between F04-US03's publication blocking wording and F01's pending overlap-block-versus-warning decision; consolidation must not silently settle this product policy. Review was document-only, with targeted remaining material rather than application execution.

## Decisions and actions

This session reviews a proposed documentation cleanup; it does not approve product scope or implement the cleanup. No application, test-baseline, specification or roadmap files were changed. This session summary is the only intended edit.

Recommended structure: canonical 31-story role-feature catalogue; project context with accepted decisions and one phased roadmap referencing story IDs; task-sized specifications with observable criteria; retained schema/contracts/migration safeguards; retained security and actual multi-agent workflow. Fixed human allocations should be removed while task-local file ownership, human approval and independent review remain.

Keep schema-and-parallel-plan.md and revise its steward/round tables. Remove the five workflow/sdd/roles Markdown files only after preserving unique contracts, exclusions and checks and updating live references. Preserve .codex/agents, workflow/agents, tools and historical logs. RD05's historical personnel clause should be explicitly superseded without changing accepted notification behavior. Existing F01 criteria/IDs and draft approval status must survive any story-level transition.

## Verification and limitations

- Default exec attempts failed with `helper_unknown_error: setup refresh had errors`; node execution previously failed similarly. Read-only escalated PowerShell execution with login disabled succeeded.
- Read all docs/workflow document categories; specialist reviews cover person-guide details and independent security/coverage concerns.
- `python tools/validate_agent_setup.py`: PASS for six TOML roles and Markdown local links; runtime discovery is not established by that check.
- `git diff --check` before and after adding this log: no errors. Final status showed only this new untracked summary before its final content update.
- No application/security/provider/deployment tests ran. Documentation and agent configuration do not establish assignment compliance.
- DeveloperGuide says startup, application test, migration and deployment commands remain undocumented. F01 revision 3 is Draft and all criteria unverified; schema fields remain draft.
- Provider/identity/hosting, quotas/data policy, membership and relevant product blockers still require human decisions. Phase ordering is a recommendation, not feature approval.

## Reflection and next steps

The technical schema plan is independent of static human allocation. Deleting it would lose necessary integration and security constraints. Consolidation should distinguish product roles from developer assignments and reusable agent roles. Add requirement-to-evidence release gates, align feature templates with pre-implementation independent test design/baseline protection, preserve all 31 stories and run link/coverage checks after a later authorized cleanup.
