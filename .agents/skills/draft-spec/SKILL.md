---
name: draft-spec
description: Draft new EventApp scoped capability specifications from user-story outcomes, or refine existing Draft specifications. Do not use for auditing finalized specifications, verifying application implementation, or synchronizing code and specifications.
---

# Draft an EventApp capability specification

Produce specification documentation for human review. This skill ends at a Draft; it does not authorize application implementation or establish runtime correctness.

## Establish the drafting boundary

Resolve the repository root from the active repository context and its `AGENTS.md`. All project paths below are relative to that root, not this skill directory.

Identify the requested story/outcome and whether the target is new or explicitly **Draft**. Treat existing non-Draft specifications as read-only references: never downgrade their status, approval or evidence to make them editable. Checking/auditing finalized or actual specifications, verifying current application behavior, and syncing code/spec content are outside this skill. An audit/sync-only request produces an outside-scope explanation without writes. For mixed requests, perform only an independently separable, requested drafting portion and report excluded work; do not turn an audit into a rewrite.

Read the applicable instructions and authoritative sources:

- `AGENTS.md`, `workflow/README.md` and `workflow/agents/README.md` for process and actual agent handoffs.
- `specs/README.md` and `specs/TEMPLATE.md` for specification boundaries, identifiers, revisions and lifecycle. Use the canonical template; do not create another.
- `docs/UserStoriesAndFeatures.md` for story outcomes and product-role features; `docs/project.md` for phases, accepted RD decisions and unresolved shared choices.
- `docs/security.md` for applicable SEC rules; `docs/architecture.md` for shared contracts, module boundaries and dependencies.

Inspect relevant Draft specs and known context to avoid duplicate authoritative criteria. Read relevant code only to understand interfaces or constraints needed for drafting; do not audit its conformance or claim its behavior is verified. Record the source/spec/contract revisions used. Missing or contradictory authority becomes an explicit question, not invented policy.

## Draft and review

Use the actual specification analyst and test designer for bounded analysis and planned verification scenarios, with independent behavior/security draft review as required by the agent workflow. Read assigned role definitions, record actual identities, file ownership, revisions, handoffs and findings; report unavailable delegation honestly. Follow the referenced protocol rather than simulating roles.

Map the complete outcome and every covered story to a cohesive capability and observable positive, adverse, boundary and state-preservation criteria. Include applicable security, AI approval/data/failure boundaries, contracts, dependencies and required project evidence using the template. Keep proposed choices distinct from accepted rules; give unresolved decisions human owners and blocking status. Preserve stable IDs, approval records and history under the spec standard, including legacy criteria and split/merge traceability.

Write only the selected new/Draft specification and the minimum necessary specification-index and session-log updates. Broader shared decisions remain read-only proposals unless separately authorized. Preserve other contributors' work. Do not edit application code, tests, protected baseline artifacts or test infrastructure; do not execute implementation tests, freeze a baseline, push, merge or deploy.

Return the Draft path/revision, concise diff summary, source mappings, unresolved human questions, actual review/handoff results and session-log location. Keep unexecuted verification scenarios pending and historical evidence tied to its original revision. Do not mark the Draft Ready or claim product approval, implementation or verification.
