# Reusable SDD workflow for agent-assisted projects

Status: Working baseline, to adapt and refine through use.
Last updated: 2026-10-07 (Asia/Singapore).
Scope: Reusable across projects, technologies, and team structures.

Use this document when preparing and implementing work in a new or existing project. It defines reusable working practices for spec-driven development (SDD), evidence-based verification, and coordination between people and agents. Apply it to the current project's requirements and risks. Change it when discussion or experience gives us a better approach.

This file is an SDD workflow guide: it explains how to specify, plan, implement, verify, and maintain work. A feature-specification template provides fields for a particular feature's requirements and acceptance criteria. Use the specification checklist below to structure those separate feature documents, and keep their content specific to the project.

Examples involving software tests, APIs, persistence, packaging, or PRs apply when the project has those elements. For other deliverables, use the relevant specification, verification method, integration or delivery check, and review mechanism.

## Core principles and adaptable practices

Carry these principles into each project:

- Use SDD to guide implementation of meaningful changes.
- Include explicit acceptance criteria and evidence of completion.
- Consult relevant known failures before related implementation.
- Keep the process proportional to each change.
- Introduce tooling when it addresses a concrete recurring need.

Default to spec-anchored development: write specifications before implementing meaningful features, verify implementation against them, and maintain specifications when agreed behavior changes. Document structure, review requirements, tools, and team conventions are adaptable practices. Use the project's specific agreements to make them concrete.

## Agent startup: before implementation

1. Read the current task and applicable project instructions. Identify the relevant project context, specification, contracts, decisions, and known failures. Reuse existing artifacts; read what the task needs.
2. Identify the requested outcome and observable acceptance criteria. Distinguish agreed requirements, recommendations, and unresolved decisions. If a small task has no separate spec, state its criteria in the task discussion.
3. Inspect the affected implementation and existing verification methods. Identify integration dependencies, ownership boundaries, and current work that must be preserved.
4. Explain the proposed scope, affected areas, relevant risks, and verification approach before meaningful changes. Reuse settled decisions. Ask small batches of questions when a missing policy, conflicting requirement, or shared contract decision prevents correct implementation. Use judgment for routine reversible choices and state consequential assumptions.
5. Apply the appropriate parts of the feature cycle below. When project-specific guidance changes the approach, explain the relevant difference. Do not create a full set of documents, specialist agents, or automation for every task.

Proceed with the authorized work once the required decisions are clear. Report evidence and limitations at completion, and provide a handoff if work remains.

## Match the process to the change

| Change | Appropriate starting level of effort |
| --- | --- |
| Wording or small documentation correction | Clear intended change, inspect the result and diff, check linked examples if affected. |
| Small local behavior change | Brief criteria, relevant context, focused checks, completion evidence. |
| Feature spanning components | Feature spec, agreed contracts, dependent tasks, focused tests and real integration checks, appropriate review. |
| Change to permissions, persistent data, sensitive information, or other high-impact behavior | Explicit rules and failure cases, evidence at the enforcement boundary, independent review when warranted, relevant recovery or lifecycle checks. |

Use existing team review gates. Apply specialist work where it can resolve a concrete risk. Agree on the required reviews for meaningful work and report which actually ran.

## At project kickoff, when applicable

1. Agree on the product purpose, users, main journeys, scope, and important risks.
2. Record a short project context: component responsibilities, relevant commands, team conventions, and links to decisions.
3. Agree on a definition of done, review expectations, delivery conventions such as branches and PRs, and ownership of shared contracts.
4. Select an early, small user journey that exercises the real components together.
5. Check the intended delivery method early: for packaged software, try packaging and launch outside the normal development setup; for other outputs, exercise their intended consumer or environment.

At kickoff, review and adapt a project copy of this workflow with the team. Once adopted, the repository copy is the authoritative workflow for that project. Change shared practices through the team's agreed review process. Later updates to the reusable baseline are proposals for the project, with adoption decided by the team.

Identify who may approve product rules, acceptance-criteria changes, and shared-contract changes, and how consequential disagreements are resolved. A feature owner coordinates delivery; approval authority follows the team's agreement. Record the relevant decisions in existing project documentation.

Choose concrete tools, specialist roles, and automation after the project and recurring needs are understood.

## Repeat for each feature

### 1. Specify a small slice

Agree on the user-visible outcome, policies, acceptance criteria, exclusions, and relevant edge cases. Separate agreed requirements, recommendations, and unresolved decisions. Resolve decisions that block correct implementation with the appropriate teammates.

For a meaningful feature, record:

- Purpose and users or roles.
- Scope and exclusions.
- Rules, permissions, and constraints.
- Numbered, observable acceptance criteria.
- Relevant rejection, boundary, and failure cases.
- Relevant security, reliability, accessibility, and performance requirements.
- Shared dependencies and contracts.
- Assumptions and open decisions.

An acceptance criterion describes required behavior. A test or manual check supplies evidence about that behavior. A small change can have a two-line spec; a complex feature needs more detail.

Keep acceptance criterion identifiers stable so tasks and evidence remain traceable. For parallel or long-running work, identify the agreed specification revision in the task or handoff and reconcile intervening changes before completion.

### 2. Inspect and prepare

Inspect the affected architecture and relevant past review gaps. Explain the proposed scope and affected areas before meaningful changes. Agree on component responsibilities and necessary interface or data changes before dependent work proceeds.

Give each feature a human owner who coordinates its completion. In a team project, identify an owner for shared contracts and communicate agreed changes to affected teammates. Coordinate ownership boundaries before parallel implementation.

### 3. Plan tasks and verification

Break the feature into small tasks with dependencies, owners, and completion checks. Keep implementation steps in the task plan and required behavior in the specification.

Identify appropriate success, rejection, boundary, and failure checks. Explain unfamiliar testing concepts and what each check proves. Select checks based on the risks and observable behavior; use manual usability checks where appropriate.

Include regression checks for existing behavior affected by shared code, data, or contract changes. Link the relevant existing specifications where available and focus checks on the affected behavior.

Independent components can progress in parallel after their interfaces are agreed. Coordinate overlapping edits to shared files and rules.

### 4. Implement and check

Give the implementing agent the relevant specification, design or contracts, task, and past failures. Implement the feature and focused checks together, preserving existing work and using synthetic test data.

If implementation reveals a missing or contradictory requirement, record it, resolve it with the relevant people, and update the specification. Keep agreed changes traceable.

### 5. Review and investigate

Run relevant review checks. Use a fresh independent reviewer when the change warrants it, particularly for permissions, persistence, shared contracts, or substantial behavioral changes.

An independent reviewer should not have implemented the change. Give them the current specification, change, and relevant project context, and ask them to form their own assessment before relying on the implementer's conclusions. Record the reviewer and review scope. Separate reviewers can still share mistaken assumptions; findings require investigation.

Treat findings as claims to investigate. Verify the behavior or evidence, resolve valid issues, explain findings that do not apply, and rerun affected checks. Written checklists and skill definitions do not establish that a review actually ran.

### 6. Integrate and finish

Check the feature against its acceptance criteria and exercise its real connections to other components. Inspect the final diff and prepare a focused commit and PR according to team conventions.

Report what changed and where, which checks and reviews actually ran, their results, and what remains unverified. Distinguish reviews performed from reviews planned, skipped, or unavailable. Tell the user when a useful commit-sized slice is complete. Unresolved acceptance criteria remain incomplete or need an explicitly agreed scope change.

### 7. Maintain and learn

Update affected specifications, usage examples, and documentation alongside the implementation. Check examples against actual behavior. Capture useful screenshots or executable examples when they support understanding.

Record reusable, verified review gaps with their causes, prevention steps, and appropriate regression checks. Update this workflow when evidence supports a broader process change.

## Evidence and completion

For meaningful features, use a small requirement-to-evidence table:

| Criterion | Evidence | Status or limitation |
| --- | --- | --- |
| AC-1: Required behavior | Test name, command result, or manual observation | Verified, failed, pending, or partially verified |

Completion evidence should correspond to the version being delivered. For meaningful reviews and parallel-work handoffs, identify the relevant implementation revision or diff snapshot and specification or contract revision. When later changes affect behavior, scope, or prior conclusions, refresh the affected checks and reviews before relying on their results. An unrelated edit does not require repeating every check or review.

Default definition of done, to adapt with the project owner or team:

- Applicable acceptance criteria are verified.
- Relevant checks pass and required reviews have actually run.
- Valid findings are resolved and remaining uncertainty is reported.
- Real integration is checked where the feature depends on other components.
- Affected specifications and documentation reflect agreed behavior.
- The final diff is inspected and the completion evidence is available to reviewers.

Apply these evidence limits when relevant:

- Passing application tests does not prove every requirement is covered.
- To verify persistence, write new synthetic data, exercise the relevant restart or lifecycle boundary, and retrieve that data through the intended path. Reloading seeded data establishes less.
- UI restrictions do not establish service or API authorization and domain validation.
- A development environment check does not establish delivery behavior in the intended user environment; use packaging or deployment checks appropriate to the project.
- Synthetic integration fixtures do not establish real end-to-end integration.
- Documentation updates do not establish accuracy; verify examples against behavior.
- Structural skill checks do not establish skill selection or review quality.
- Reviewer agreement or confidence does not establish correctness; investigate findings.

## Documents and shared context

Reuse existing project context, specifications, task plans, and known-failure records. For a new project, start with a short context and the specification and plan needed for its first meaningful slice. Establish a review-gap registry as reusable findings emerge. Add technical design and integration documents when separate detail or ownership is useful.

Keep shared rules in one authoritative location and link to them. Store reusable repository conventions in the team's project instructions. Keep current feature behavior in its specification.

Suggested review-gap fields: finding, evidence, cause, prevention, regression check, affected area, and resolution. Consult relevant entries before implementing related changes; do not require a full registry review for every edit.

Suggested PR fields: purpose and scope, specification links, verification evidence, reviews performed, and limitations or follow-up work.

## Agents, skills, and automation

Specialist roles are available jobs: requirements, architecture, implementation, testing, security, review, and integration. Assign the roles that the feature needs. A human remains responsible for policy, usability judgment, evaluating evidence, and coordinating shared work.

Give each assigned agent a bounded task, relevant context, expected output, and ownership boundaries. A handoff should include completed work, supporting evidence, open questions, and the next required action.

Create reusable skills after a procedure repeatedly proves useful. Explicitly request essential checks and verify that they ran. Prefer focused guidance and relevant context over a large collection of mandatory procedures.

Add reliable test commands, formatting checks, hooks, CI, or UI smoke tests as their value becomes clear. Automate recurring checks while retaining human usability assessment. Evaluate skills and tools using observed results; faster later milestones alone do not establish which practice caused the improvement.

## Collaboration preferences

- Explain scope and affected areas before meaningful changes.
- Ask guiding questions in small batches and resolve one issue before moving on.
- Explain unfamiliar tests and their evidence boundaries.
- Distinguish agreed requirements, recommendations, and open decisions.
- Centralize shared rules and coordinate shared contract changes.
- Preserve existing work and use synthetic test data.
- Identify useful commit-sized completion points.
- Report changes, locations, checks, actual reviews, and remaining uncertainty.
- Investigate reviewer findings before accepting them.

## Refining this document

When a discussion changes our approach:

1. Update the relevant section, preserving useful context.
2. Label unresolved choices and distinguish them from confirmed direction.
3. Add a brief revision entry explaining what changed and why.
4. Reconcile contradictory guidance and remove obsolete requirements.

During a project, revisit the workflow after a meaningful milestone or failure. Ask whether it prevented errors, missed an issue, caused unnecessary work, or helped coordination. Use observations and evidence to refine it; avoid attributing improvement to a tool without support.

For a new project or chat, supply this document and explicitly ask the agent to use it. Keep project-specific agreements in the project's own documentation. Treat improvements discovered in a project as proposals for the reusable baseline, so local policies do not silently become universal rules.

Suggested startup instruction:

> From the repository root, read workflow/WORKFLOW.md and use it to guide this task. Before implementation, identify the relevant project requirements, acceptance criteria, architecture or contracts, and known failures. Explain the scope and verification approach. Adapt the effort to the change, reuse settled decisions and existing documents, and report the checks and reviews actually performed and anything still unverified.

## Decisions to make per project

- Product, technology, team size, and component ownership.
- Concrete review requirements and definition of done.
- Which quality requirements need measurable thresholds.
- Tooling and automation justified by recurring work and risks.

Resolve these choices when they become relevant to the project's work. They are intentionally left open in this reusable reference.

## Revision history

| Date | Change | Reason or evidence |
| --- | --- | --- |
| 2026-10-07 | Created the initial living workflow | Consolidates our SDD discussion, team coordination practices, acceptance criteria, and LoanDesk lessons; project selection remains open. |
| 2026-10-07 | Reframed as reusable implementation guidance | Generalized lessons from LoanDesk, added agent startup instructions and proportional application, and separated project-specific agreements from the shared baseline. |
| 2026-10-07 | Added clarifications following three independent document reviews | Clarified project adoption and decision authority, revision-aware evidence and stable criteria, independent review, and regression checks. Verified findings against the existing text; practical effectiveness remains to be established through use. Also clarified the distinction between this workflow guide and feature-specification templates. |
