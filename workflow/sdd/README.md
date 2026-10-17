# EventApp SDD workflow

Status: Task-based working design pack, updated 2026-10-17. Accepted RD01–RD07 remain authoritative; detailed specifications still require approval. These documents do not establish application implementation or deployment.

## Start here

1. Read the [canonical user-story and role-feature catalogue](../../docs/UserStoriesAndFeatures.md).
2. Follow the single ordered roadmap in [project context](project.md), including accepted decisions, delivery gates and unresolved product choices.
3. Review [shared security rules](security.md) and the [schema and parallel development plan](schema-and-parallel-plan.md).
4. Read the relevant scoped specification; [F01](features/F01-published-programme.md) is the existing draft journey covering three stories.
5. Use the [specification template](templates/feature.md) and [multi-agent workflow](../agents/README.md) to refine, test, implement and verify the selected task.

This is a repository-maintained Markdown SDD workflow. The catalogue owns story wording and scope; project.md owns priority and shared decisions; approved specifications own detailed behaviour and acceptance criteria. Schema/security documents own shared contracts and rules. Link these sources rather than copying stories into development guides.

## Story to scoped specification

Each story is a candidate scoped capability identified by its existing Fxx-USxx ID. Refine it into a specification with numbered observable criteria, dependencies, SEC/RD references, approval and evidence. A catalogue row alone is not a Ready specification. Fxx groups related capabilities; a group is not an implementation assignment.

Preserve existing criterion identifiers, including F01-AC01–09. An existing shared journey may cover several stories; map each story to its applicable criteria without copying or renumbering them. New specifications may be story-sized, and shared integration criteria should have one authoritative definition. Story boundaries do not require separate services, tables or duplicated AI/security infrastructure.

Maintain traceability from every catalogue story to its specification and criteria, dependency contracts, test cases and completion evidence. Until refined, mark specification/evidence pending. All 31 existing story IDs must remain represented, including later-phase work.

## Task-based working agreement

- Work in the shared repository; do not push, merge or deploy to production without the applicable human authorization.
- Choose tasks by capability priority and dependencies. There are no standing feature-to-person assignments or required human participant counts per feature.
- Record bounded task/file ownership, contract coordination, product approval and independent reviews when work is assigned. Product roles describe users, not developers. An agent cannot approve missing product policy.
- Use states Draft, Ready, In progress, In review, Verified and Completed. Ready requires resolved blockers and recorded approval. Retain stable story/criterion IDs; retire rather than reuse them.
- Develop independent tasks in parallel after agreeing producer/consumer contracts and fixtures. Coordinate shared files and migration history; real integration is required before completion.
- Reviewers must not implement the changes they independently review. Required human teammate review remains separate from agent review.
- Keep small changes proportional; documentation-only edits use reviewed criteria, diff/link checks and appropriate independent review rather than inventing an application-test baseline.

## Capability cycle

1. Specify outcome, exclusions, permissions, dependencies, success and adverse cases against the current accepted decisions.
2. Inspect code/contracts and resolve blocking human product decisions. Record approved specification and contract revisions.
3. Delegate independent test design before application implementation. Independently review test adequacy, including security, and freeze the approved protected baseline and commands using [the agent workflow](../agents/README.md).
4. Delegate bounded implementation; developers preserve protected tests, fixtures, runner/configuration and baseline identity. Route disputed tests through the recorded change-request process.
5. Independently verify behaviour and security against the same implementation snapshot. Investigate findings, fix through the responsible task, and refresh affected checks/reviews.
6. Exercise actual producer/consumer integration, fresh-data persistence/restart, relevant migration paths and online delivery. Fixtures or mocked models do not establish real integration.
7. Update specification/evidence, user/developer guidance and [interaction logs](../../logs/README.md). Keep human correctness verification of AI-generated summaries explicit.

## Completion gates

- Applicable criteria have revision-specific passing evidence, actual independent reviews and resolved findings.
- Each product role has at least one implemented LLM-based capability; shared AI-job controls alone do not meet role coverage.
- AI and development-process security controls have implementation and test evidence. Preserve SEC/RD rules, independent test ownership, baseline-integrity checks and actual bounded agent handoffs.
- The application is online with separate development/production data, credentials and configuration. Verify server-only secrets and deployed synthetic journeys for all three product roles.
- Required human review/authorization and summary verification are recorded; remaining uncertainty stays explicit.

Use the requirement-to-evidence gates in [project context](project.md) for release assessment. Passing workflow validators or editing specifications does not establish assignment compliance.

## Review context

RD01–RD07 were accepted by the team on 2026-10-15. The 2026-10-16 agent setup establishes reusable roles and protected-test procedures, not an application-development result. This task-based organization retains those controls and the accepted behaviour. Remaining provider, membership, constraint and integration decisions are resolved before the affected capability depends on them.
