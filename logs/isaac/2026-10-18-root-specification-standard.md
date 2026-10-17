# Root specification standard

- Date/timezone: 2026-10-18, Asia/Singapore. Requesting session owner: Isaac.
- Base revision: `ae0616d68c3245b1e89f7883d1e7968e88395fc8`; initial working tree clean.
- Source: visible user request, repository reads and actual agent/tool evidence. Earlier unavailable conversations are not reconstructed.
- AI factual check: against the stated evidence; final checks recorded below.
- Human verification: Pending; reviewer/date/corrections not supplied.

## Request and approach

The user asked for a definition, template and project standard for specs derived by extracting capabilities from user stories, guidance for a new agent, and a preference for actual specifications under root specs/. The orchestrator treated this as a request to establish repository guidance and the location convention, not approve or implement new application capabilities.

The standard defines a spec as a versioned, testable scoped capability contract grounded in story outcomes. The catalogue owns story wording/scope; project context owns priority and accepted RD decisions; shared schema/security documents own cross-cutting rules; approved capability specs define detailed behaviour and evidence. Default new files derive from Fxx-USxx; legacy F01 criteria remain stable. Draft and approved specs share root specs/, distinguished by status/approval. No automatic implementation follows spec drafting.

## Actual agents, ownership and handoffs

- `/root` orchestrator: inspected existing workflow/template/security/role instructions, assigned bounded tasks and read-only reviews, moved F01, updated root instructions/live links, removed the obsolete template after replacement, checked the migration and maintained this summary.
- `/root/coverage_review`, behaviour_verifier: read-only; independently supplied a nine-point pre-edit checklist covering capability boundaries/IDs, source authority, novice instructions, observable adverse criteria, human Ready approval vs reviewed protected tests before development, four mandatory requirements, F01 preservation, link migration and truthful evidence. Assigned final independent review after edits.
- `/root/schema_review`, specification_analyst: owned only new specs/README.md and specs/TEMPLATE.md; proposed structure then drafted the standard, index and template. Instructed to preserve concurrent work, avoid application/protected-test edits and not approve product assumptions. Corrected PowerShell-to-Python Unicode placeholder/range artifacts after inspection. Independent reviewers requested general rejected/failed-operation state-preservation assertions and explicit completed human summary verification before Completed; corrections were returned to this author.
- `/root/security_review`, security_reviewer: read-only final review assignment covering inherited RD/SEC policy, AI grounding/privacy/approval boundaries, test independence and mandatory role-AI/deployment evidence. No implementation or nested delegation assigned.

This documentation-only change uses independently reviewed criteria and document checks, not a new application acceptance baseline. Actual test design/baseline gates remain required for later application implementation.

## Files and migration

New canonical standard/index and template live at specs/README.md and specs/TEMPLATE.md. The existing draft F01 moves to specs/F01-published-programme.md. Its only content changes are three relative link corrections; Draft status, revision 4, behaviours, blockers and F01-AC01–09 remain unchanged. The prior workflow/sdd/templates/feature.md is removed after replacement to avoid competing templates. Shared planning/security/process remain under workflow/.

AGENTS.md, the SDD/process entry points, story catalogue and developer guide point new agents to root specs/. No application features, tests, fixtures, tooling, provider integration or deployment are implemented by these edits.

## Verification and limitations

- F01 comparison against the base: passed; exactly the three expected relative-link substitutions, original path removed.
- `python tools/validate_agent_setup.py`: passed six-role TOML and local Markdown link checks. Runtime discovery on other installations remains unverified.
- `git diff --check`: passed. Searches found no obsolete live spec/template links in AGENTS/docs/workflow/specs/agent definitions; the historical path in this migration summary is intentional.
- The analyst and independent behaviour reviewer verified that the index accounts for exactly all 31 canonical story IDs. The reviewer independently confirmed F01 content equivalence after normalizing relative links.
- `/root/coverage_review` final read-only review: no blocking findings after explicit adverse state-preservation guidance and completed human-summary-verification requirements were added. Confirmed usable drafting prompt, source authority, identifier rules and preserved protected tooling/tests.
- `/root/security_review` final read-only review: no unresolved blocking findings. Confirmed SEC/RD inheritance, human approval, independent baseline/review gates, bounded AI authority, all four project requirements and correction of the completion ambiguity.
- Reviewer findings went back to the specification author; both reviewers checked the corrected documents. Only recording these final results in this summary followed their reviews. No application/provider/migration/security-runtime/deployment tests ran.
- Human product decisions still gate Ready specs; independent test review/protected baseline still gates application implementation. No spec becomes approved merely by moving or drafting it.
- Human review of this summary remains pending. Document checks do not establish runtime, security or deployment compliance.
