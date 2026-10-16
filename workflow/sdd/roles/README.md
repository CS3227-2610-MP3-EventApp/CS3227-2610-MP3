# EventApp developer guides

Each guide now follows a person's development assignments, including stories for user roles other than the one they steward. Start with your guide and the [story coverage map](story-coverage.md), then use the linked shared specifications for authoritative behavior and approval.

| Teammate | Guide | User experience stewarded |
| --- | --- | --- |
| Yik Bing | [Yik Bing development guide](yik-bing-attendee.md) | Attendee |
| Dylan | [Dylan development guide](dylan-organiser.md) | Organiser |
| Isaac | [Isaac development guide](isaac-business.md) | Business participant |

## Development assignments at a glance

Assignments remain the proposed allocations in project.md. Each guide contains the full canonical stories for every delivery feature below. A story's inclusion gives feature context; it does not assign the entire story to every participant. Personal tasks and partner divisions are proposed until recorded in an approved feature plan.

| Person | Delivery feature context | Full stories included | Review-only features |
| --- | --- | --- | --- |
| Yik Bing | F01, F02, F03, F05, F07, F09, F10 | 21 | F04, F06, F08 |
| Dylan | F01, F03, F04, F05, F06, F08, F10 | 23 | F02, F07, F09 |
| Isaac | F02, F04, F05, F06, F07, F08, F09, F10 | 24 | F01, F03 |

For example, Isaac helps deliver F08, so his guide contains the organiser's venue research stories and his proposed research/approval contribution. The end-user voice stays organiser; it is not rewritten into a business story. Review-only features have source links and a review checklist rather than duplicated delivery stories.

## How to use these guides

The role assignments, Python/FastAPI backend, TypeScript/React frontend, and shared database direction are agreed. Feature scope, pair allocations, exact schema fields and numerical limits remain proposals where the shared SDD marks them that way. Implementation remains deferred until the relevant decisions and feature criteria are clear. No guide authorises a GitHub push.

On 2026-10-15, Dylan, Yik Bing, and Isaac accepted [RD01–RD07](../project.md#accepted-review-decisions): business-wide membership, frozen submissions, validated plan acceptance, immutable programme change facts, accepted-plan-only notifications, private same-event duplicate evidence and shared AI-job controls. These decisions are now reflected in all guides; remaining feature details still require criteria and approval.

These are development handoffs, not separate specifications. [Project context](../project.md) owns the story wording, feature allocations and accepted decisions; [schema and parallel plan](../schema-and-parallel-plan.md) owns proposed data boundaries; [security rules](../security.md) own shared policies; [SDD workflow](../README.md) and [WORKFLOW.md](../../WORKFLOW.md) define delivery and evidence. Full stories are read-only extracts for convenient reading. Change them in project.md first, then refresh every affected guide and coverage entry. Resolve contradictions in the shared source before implementation.

Features are high-level groupings and can contain stories for more than one role. Each story retains its end-user role, and that role's steward is accountable for its complete role-specific outcome; partners may contribute bounded contracts, integration, verification, or review work. Participation can happen at different checkpoints, so one steward can lead a story while a partner contributes a bounded task and leads another story in parallel. For paired implementation, the third teammate is the default independent reviewer. For changes involving all three, the reviewer must not have implemented that particular change.

## Shared first discussion

1. Confirm the MP3 rubric, deadline and repository setup.
2. Agree on minimum user, event, business and membership fields and their visibility.
3. Define business invitation/member roles, multi-role users and the initial submission scope; business-wide permission scope and the frozen submission lifecycle are already accepted.
4. Agree on programme and submission interfaces and synthetic examples.
5. Assign the foundation coordinator and review the feature acceptance criteria.

Use a separate local development database per person with common migrations and fixtures. A fixture is agreed synthetic data that lets a feature be developed before another feature is complete. It does not replace a final test of the real connected application.

Updated: 2026-10-15. Three independent role reviewers previously inspected the planning pack. This rebuild used three role-focused drafting subagents with shared instructions to read every SDD source, include every assigned feature's canonical stories, distinguish proposed tasks from approved behavior, and preserve RD01–RD07. A coordinating check reconciled story coverage, links and handoffs. Drafting is not an independent review of one's own output. No application implementation, migration or deployment verification has occurred.
