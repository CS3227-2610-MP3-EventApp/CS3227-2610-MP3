# Scoped capability name

Status: Draft
Feature ID: Fxx
Story ID(s): Fxx-USxx (link to the canonical catalogue)
Specification revision: 1
Task/run record: Pending; assign bounded implementation/file responsibilities when work starts
Independent review: Record actual reviewers and scope in the task/run record; they must not implement the reviewed change
Product and contract approval: Record the required human decisions and approval evidence
Approval record: Pending

## Purpose and scope

Link the story in [the canonical catalogue](../../../docs/UserStoriesAndFeatures.md) and its phase in [the roadmap](../project.md). State the user outcome, product roles, scope, exclusions, and assignment requirement references. Separate confirmed requirements from proposals and open questions; do not copy the full story table. Keep shared criterion IDs stable when an existing journey covers multiple stories.

## Required behavior

Link applicable shared security rule IDs. State permissions, resource ownership, domain rules, error behavior and measurable quality thresholds.

| ID | Observable acceptance criterion | Verification method |
| --- | --- | --- |
| Fxx-AC01 | Given a specified state, when the user acts, the system produces the required outcome | Success and relevant rejection, boundary or failure checks |

## Contracts and design

Record affected components, data and API fields, constraints, versions, dependencies and migrations. Identify shared contract owners. Keep implementation choices separate from required behavior; add a separate design only when useful.

Reference [module and table ownership](../schema-and-parallel-plan.md) and applicable [accepted review decisions RD01–RD07](../project.md#accepted-review-decisions). Identify producer/consumer contract versions, fixture needs, migration dependencies and shared files affected. Record which tasks can proceed against fixtures and which completion checks require the real producer. Coordinate bounded tasks at dependency checkpoints without standing feature-to-person assignments.

For affected features, specify allowed states, immutable versus editable data, stale/concurrent writes, exact report provenance, data visibility, before-display validation and notification recipient timing. Derive numbered acceptance criteria from the accepted decision verification scenarios. Leave numerical/provider choices open only until the feature requires them; do not reopen already accepted behavior.

## Open decisions

Record each decision, alternatives where useful, owner, whether it blocks implementation, and resolution. Do not mark Ready while blocking decisions remain.

## Tasks

- [ ] Resolve blocking decisions and record approval.
- [ ] Agree on affected contracts; independently design and review acceptance/security tests before application implementation.
- [ ] Record approved specification/contract revisions, protected test paths, immutable baseline and exact commands.
- [ ] Implement the smallest complete user journey with checks.
- [ ] Run relevant regression, persistence and integration checks.
- [ ] Complete required independent review and investigate findings.
- [ ] Check online delivery and separate development/production data/credentials; update documentation and inspect the final diff.

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

## Agent coordination and protected-test baseline

- Human-assigned capability/task scope and approval evidence:
- Run record (use [template](../../agents/templates/run-record.md)):
- Pre-implementation test plan and independent adequacy review:
- Approved specification/contract revisions and immutable test baseline commit:
- All protected paths, fixtures/configuration, and full-suite commands:
- Test change requests and superseded baseline history:
- Actual agent identities, ownership/handoffs, and reviewer independence:
- Acceptance evidence, baseline integrity, real integration, and limitations:
- Prompt/interaction summary under logs/ and human correctness verification status:

Use [the shared agent workflow](../../agents/README.md). Do not mark Completed while required evidence, reviews, or summary verification remain unresolved.
