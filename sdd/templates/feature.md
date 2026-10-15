# Feature name

Status: Draft
Feature ID: Fxx
Specification revision: 1
Coordinator: Unassigned
Delivery participants: At least two teammates; assign before implementation
Participant task responsibilities: Pending
Independent reviewer: Unassigned; must not implement the reviewed change
Approver: Unassigned
Contract reviewer: Unassigned
Approval record: Pending

## Purpose and scope

State the user outcome, roles, scope, exclusions, and assignment requirement references. Separate confirmed requirements from proposals and open questions.

## Required behavior

Link applicable shared security rule IDs. State permissions, resource ownership, domain rules, error behavior and measurable quality thresholds.

| ID | Observable acceptance criterion | Verification method |
| --- | --- | --- |
| Fxx-AC01 | Given a specified state, when the user acts, the system produces the required outcome | Success and relevant rejection, boundary or failure checks |

## Contracts and design

Record affected components, data and API fields, constraints, versions, dependencies and migrations. Identify shared contract owners. Keep implementation choices separate from required behavior; add a separate design only when useful.

Reference [module and table ownership](../schema-and-parallel-plan.md) and applicable [accepted review decisions RD01–RD07](../project.md#accepted-review-decisions). Identify producer/consumer contract versions, fixture needs, migration dependencies and shared files affected. Record which tasks can proceed against fixtures and which completion checks require the real producer. Assign participant tasks at specific checkpoints so other features can progress in parallel.

For affected features, specify allowed states, immutable versus editable data, stale/concurrent writes, exact report provenance, data visibility, before-display validation and notification recipient timing. Derive numbered acceptance criteria from the accepted decision verification scenarios. Leave numerical/provider choices open only until the feature requires them; do not reopen already accepted behavior.

## Open decisions

Record each decision, alternatives where useful, owner, whether it blocks implementation, and resolution. Do not mark Ready while blocking decisions remain.

## Tasks

- [ ] Resolve blocking decisions and record approval.
- [ ] Agree on affected contracts and prepare focused checks.
- [ ] Implement the smallest complete user journey with checks.
- [ ] Run relevant regression, persistence and integration checks.
- [ ] Complete required independent review and investigate findings.
- [ ] Check delivery, update documentation and inspect the final diff.

Add owners and dependencies when work is assigned. A checked task is a progress record, not proof of an acceptance criterion.

## Evidence and handoff

Implementation revision: Pending
Specification revision tested: Pending
Reviews actually performed: None

| Criterion | Evidence and result | Status or limitation |
| --- | --- | --- |
| Fxx-AC01 | Pending | Not verified |

Record actual commands or observations, reviewer and scope, unverified behavior, resolved findings, agreed scope changes and next action. Refresh affected evidence after changes.

## Change history

| Revision | Date | Change and approval |
| --- | --- | --- |
| 1 | YYYY-MM-DD | Initial draft; approval pending |
