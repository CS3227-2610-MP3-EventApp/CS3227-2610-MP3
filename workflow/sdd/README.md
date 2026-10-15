# Converge SDD workflow

Converge is a proposed secure AI event intelligence platform for attendees, organisers, and business participants. This folder establishes the shared specification process for MP3, using [WORKFLOW.md](../WORKFLOW.md) as the process baseline.

Status: Working design pack with accepted decisions RD01–RD07; detailed feature approval remains pending. Created 2026-10-14; updated 2026-10-15. No application implementation is implied by these documents.

## Start here

1. Read [project context](project.md) for scope, role boundaries, and open decisions.
2. Review [shared security rules](security.md) before specifying AI features or external actions.
3. Review the [shared schema and parallel development plan](schema-and-parallel-plan.md) to agree on foundation fields, module ownership and contracts.
4. Review the [first feature](features/F01-published-programme.md) and resolve its blocking decisions.
5. Use [the feature template](templates/feature.md) for each subsequent meaningful change.
6. Use [the person-specific development guides](roles/README.md) for all stories in each person's delivery features, proposed tasks, handoffs and review-only assignments. Check the [story coverage map](roles/story-coverage.md) for complete assignment coverage.

This is a team-designed Markdown SDD workflow built and maintained from scratch without an external SDD toolkit. The documents in this repository are the authoritative specifications.

## Shared working agreement

The following defaults are proposed for team adoption:

- Keep specifications, contracts, implementation, and evidence in the shared repository at https://github.com/CS3227-2610-MP3-EventApp/CS3227-2610-MP3.git. Do not push until the user explicitly requests it.
- Involve two or all three teammates where a high-level feature spans multiple roles. Each user story retains one end-user role, and that role's steward is accountable for the complete role-specific outcome; other participants contribute bounded shared contracts, integration, verification, or review tasks. Give each feature a coordinator, record meaningful participant tasks, and use the collaboration table in project.md. Record the product approver and shared-contract reviewer before implementation; an AI agent cannot approve its own product assumptions.
- Use stable feature and acceptance IDs, such as F01-AC01. Retain IDs when wording changes; retire rather than reuse removed IDs.
- Use feature states: Draft, Ready, In progress, In review, Verified, Completed. A feature is Ready only after blocking decisions are resolved and approval is recorded.
- Use one feature change per branch or focused commit where practical. Include spec updates and verification evidence with code changes.
- Review changes to permissions, stored data, external actions, and shared interfaces independently of their implementation. For paired delivery, use the third teammate by default. For all-team features, assign a reviewer who did not implement the particular change, even if they contribute elsewhere in that feature. Record when an independent reviewer is unavailable; co-author review cannot satisfy a required independent review. This project will use specialised development agents as part of its Basic Multi-Agent SE process; their concrete roles, handoffs, limits, and evaluation checks remain to be defined before that process begins.
- Keep small changes proportional: a brief statement of behavior and focused evidence may suffice.
- Stagger participant tasks so each teammate can lead useful work in parallel. Develop against agreed contracts and fixtures; require real integration before completion. Coordinate shared-table changes and migration history through the schema plan.

## Accepted review decisions

Use [RD01–RD07 in project context](project.md#accepted-review-decisions) as the authoritative behavior decisions. They establish business-wide membership, frozen submission content and review provenance, conflicting manual drafts with validated acceptance, immutable programme-change facts, accepted-plan notification targeting, private duplicate evidence and shared AI-job controls. Carry their verification scenarios into the affected feature criteria. Other open decisions remain scoped to the feature that needs them.

## Feature cycle

1. Specify observable behavior, exclusions, rejection cases, and dependencies.
2. Inspect existing code and relevant verified failures. Agree on affected contracts.
3. Plan tasks and checks against the approved specification revision.
4. Implement and verify together. Resolve missing requirements before depending on them.
5. Investigate review findings and refresh evidence after relevant changes.
6. Exercise real integration and the intended deployment path, inspect the diff, and finish the feature.
7. Update current behavior and capture reusable verified failures.

Completed feature documents remain the current specification. Record their completion revision and a short change history; future changes update them through review. Introduce an archive convention only if project needs justify it.

## Definition of done

- Applicable acceptance criteria have passing evidence for the delivered revision.
- Required independent reviews actually ran and valid findings were resolved.
- Relevant regression and real integration checks pass.
- Persistence checks write synthetic data, cross the relevant restart boundary, and retrieve it through the intended interface.
- The delivery check exercises the deployed or packaged application outside the development setup.
- Specifications and user guidance reflect delivered behavior.
- Remaining limitations and agreed scope changes are recorded explicitly.

Every completion report identifies the specification revision, implementation revision, checks and results, actual reviewers and scope, unresolved limitations, and next action. Checkboxes alone do not establish completion.

## Agent startup instruction

> From the repository root, read workflow/WORKFLOW.md, workflow/sdd/README.md, workflow/sdd/project.md, and the relevant feature and security rules. Inspect affected code and known failures. Identify approved acceptance criteria, contracts, and unresolved decisions. Explain scope and verification before implementation. Preserve existing work, use synthetic data, and report actual checks and reviews with evidence.

## First review agenda

Map the confirmed MP3 requirements and deadline to the final MVP after the team selects it, settle remaining feature blockers, and assign approval/contract owners. The team size, repository, backend/frontend stack, and database direction are already recorded. Review detailed F01 criteria and the next parallel slices; do not treat this documentation update as permission to implement or push. No rubric compliance claims should be made before assignment mapping.

## Review and revision record

On 2026-10-15, three independent role subagents reviewed the documentation and a coordinating review checked shared boundaries. Dylan, Yik Bing, and Isaac accepted seven recommended corrections; these were applied across the pack. The updated pack received a document consistency/link check, not a new independent engineering review. Application behavior, migrations, deployment and rubric compliance remain unverified.

Later on 2026-10-15, role summaries were rebuilt as person-specific development guides using three drafting subagents and a coordinating story/contract check. Every delivery feature's full user stories are included, even when its end-user role differs from the person's stewardship. Review-only assignments remain separate. Detailed task divisions are proposals; feature criteria and remaining decisions still gate implementation.
