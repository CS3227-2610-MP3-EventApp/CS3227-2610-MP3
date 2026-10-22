# Task-centric documentation cleanup

- Date/timezone: 2026-10-17, Asia/Singapore. Requesting session owner: Isaac.
- Branch/base revision: `itzxitzx/specs-proposal`, `f6b6de974a5cd5f5f1b78286ec2c8b7e5398f259`.
- Source coverage: current visible conversation, working-tree documents and actual tool/agent results. Earlier unavailable conversations are not reconstructed.
- AI factual check: checked against file reads, diff, command results and actual delegation messages.
- Human verification: Approved by the team on 2026-10-22.

## Prompts and decisions

The user requested one canonical role-feature story table in docs/UserStoriesAndFeatures.md, a single phase-priority roadmap in project.md, eventual story-sized scoped specifications, removal of fixed feature-to-person assignments and deletion of obsolete person-based workflow files. A subsequent review considered all docs/workflow categories and the four assignment requirements: one LLM capability for each product role, SDD/basic multi-agent SE, explicit implementation/testing of AI and development-process security, and online deployment with separate development/production environments. See [the preceding review summary](2026-10-17-task-centric-workflow-review.md).

The user clarified that concurrent activities/booths may share a room, asked that users be informed when adding another activity, directed removal of the RD05 named contribution sentence without a revision note, and authorized the cleanup. The orchestrator interpreted the warning as an attendee adding a time-overlapping activity and asked asynchronously whether accepted itineraries may overlap. No answer had arrived when the cleanup was reviewed. Existing RD03 acceptance constraints were preserved; draft additions now explicitly warn. Same-room programme concurrency is allowed independently of attendee acceptance policy.

The cleanup does not approve outstanding feature/product/provider decisions and does not implement the application, make external calls, push, merge or deploy.

## Actual delegation and ownership

All assignments used current working-tree documentation against the base above. The agents shared the workspace; permitted edit paths were explicitly bounded and agents were instructed not to revert others' changes or edit protected tests. No nested delegation was assigned.

- `/root` orchestrator: coordinated scope and dependencies, read role definitions, edited the SDD entry point/spec template/F01 coordination and concurrency criterion/developer guide/agent workflow wording, removed the five obsolete guides, ran checks and maintained logs.
- `/root/coverage_review`, behaviour_verifier: before implementation, independently supplied nine documentation acceptance checks covering 31-story completeness, phases, scope preservation, RD/SEC/F01 identifiers, scheduling distinction, schema/migrations, four mandatory gates, independence and honest evidence. Read-only ownership. This documentation-only change used reviewed criteria and focused checks rather than creating an application-test baseline. Final independent review found no blocking regressions; independently reran link/whitespace checks and verified the exact 31-story set against the original project document. Session-log content was outside that review.
- `/root/schema_review`, specification_analyst: inspected and planned schema changes, then received permission to edit only workflow/sdd/schema-and-parallel-plan.md after the pre-edit checklist. Replaced named stewards/rounds with module responsibilities/task dependencies; retained six contracts, invariants and migration safeguards, allowed same-room concurrency, and preserved RD03. Returned file/link/safeguard check results and limitations.
- `/root/catalogue_editor`, developer: edited only docs/UserStoriesAndFeatures.md and workflow/sdd/project.md after the reviewed checklist. Preserved all 31 IDs and migrated story scope/exclusions, removed duplicate story text/priority matrices and fixed allocations, added one phased roadmap and four requirement-to-evidence gates. Removed RD05 personnel prose without a replacement note. Returned exact story-set/roadmap/table checks and no application-test claims.
- `/root/security_review`, security_reviewer: independently reviewed the same completed documentation working-tree diff against the base; read-only ownership, no implementation. Reported no blocking findings. Confirmed preserved SEC01–13, RD security semantics, real per-role LLM gates, protected-test/approval boundaries, schema invariants, concurrent-room distinction and dev/prod delivery gates. No runtime security or deployment verification claimed.

## Changes and handoffs

The canonical catalogue retains product-role columns and adds scope/exclusions migrated from project/person guides. Project context retains accepted decisions, verification scenarios, stack, architecture and unresolved decisions with one ordered roadmap. Story-to-spec guidance preserves stable IDs and existing F01 cross-story criteria; cataloguing does not imply approval. F01 revision 4 extends AC04 to cover concurrent same-room publication while preserving AC01–09.

The schema plan retains module-owned writes, stable contracts, synthetic fixtures, dependency integration, atomic/revision-aware operations and migration checks. The workflow/template now explicitly requires independently designed/reviewed tests and a protected baseline before application implementation. Developer guidance records the delivery evidence to add when tooling exists.

Removed workflow/sdd/roles/README.md, story-coverage.md and the three named development guides after scope migration. Shared agent definitions/process, tools, protected tests and historical logs remain. Fixed human feature assignments are removed; historical approval names remain as approval evidence. No RD05 assignment-replacement note was added.

## Checks and corrections

- Default shell setup failed with `helper_unknown_error: setup refresh had errors`; escalated PowerShell with login disabled succeeded.
- An initial combined delete/add patch for one file was rejected before applying; edits were reapplied with valid operations. A later patch deletion of an obsolete guide failed; explicit nonrecursive PowerShell removal of the five authorized files succeeded.
- A PowerShell-to-Python Unicode encoding issue produced question marks in three README identifier ranges; inspection detected and corrected them before review. The catalogue editor also corrected a script literal-match issue before completing project edits.
- `python tools/validate_agent_setup.py`: PASS for six TOML roles and local Markdown file links. This does not establish runtime discovery on other installations.
- `python -m unittest discover -s tools/tests -v`: all 9 existing guard regression tests passed; no test/tool files changed.
- Focused non-persistent assertions: exactly 31 unique original catalogue story IDs, all covered in the roadmap; six-column table; no copied `As a/an` stories in project.md; RD01–07 and F01-AC01–09 retained; obsolete guides/inbound references removed; no damaged identifier ranges.
- `git diff --check`: passed; one informational LF-to-CRLF warning for the schema file is not a whitespace failure.
- Independent security documentation review: no blocking findings, with runtime limitations explicitly recorded.
- Independent behaviour documentation review: no blocking findings; story completeness, preserved exclusions/criteria/contracts and unchanged protected tooling confirmed. Both reviewers assessed the completed documentation diff; only session-log recording followed their reports.

## Limitations and next steps

Application authorization, LLM integration, persistence/migrations, online delivery and production isolation remain unimplemented/unverified by this documentation work. Identity/provider/hosting choices, numerical limits and other detailed feature blockers remain pending human decisions. Existing RD03 acceptance policy remains authoritative unless the user explicitly changes it. Required human teammate review and correctness verification of this AI summary remain pending. Do not treat documentation checks or reviewer agreement as demonstrated assignment compliance.
