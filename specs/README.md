# EventApp specification standard

A **spec** is a versioned, agreed and testable contract for a scoped capability derived from a user-story outcome. A Draft proposes that contract; recorded human approval makes it agreed. It describes observable behavior across the components needed to deliver the outcome. An Fxx feature umbrella, a developer assignment or a UI-only implementation task is not itself the default spec boundary.

## Sources and boundaries

| Source | Authority |
| --- | --- |
| [User stories and role features](../docs/UserStoriesAndFeatures.md) | Canonical story wording, stable story IDs and product-role feature mapping |
| [Project context](../docs/project.md) | Ordered delivery phases, accepted RD01-RD07, assignment requirements and unresolved shared decisions |
| [Security rules](../docs/security.md) | Shared SEC rules and AI/security verification obligations |
| [Architecture and shared contracts](../docs/architecture.md) | Proposed module boundaries, versioned shared contracts, dependency and migration safeguards |
| This folder | Capability-specific requirements, acceptance criteria, approval and evidence at identified revisions |
| [Development workflow](../workflow/README.md) and [agent workflow](../workflow/agents/README.md) | Delivery gates, actual specialist handoffs, independent review and protected tests |

Link shared rules instead of copying them. A spec cannot silently override an accepted RD/SEC rule; resolve conflicts with the required human authority and update the authoritative decision first. Proposed schema fields and catalogue rows do not constitute implementation approval. Specifications remain current after completion; later behavior changes revise the same contract and refresh affected evidence.

## Files, identifiers and revisions

- Start from [TEMPLATE.md](TEMPLATE.md). Default to `specs/Fxx-USxx-short-slug.md` for one cohesive capability, using its existing `Fxx-USxx` story ID as the capability ID. Fxx remains a grouping, not a priority or person assignment.
- Split a capability only when independently specified boundaries help delivery; retain its story/capability ID and use distinct descriptive file slugs. Merge closely related stories only with an explicit primary story ID and a mapping of every covered story to its authoritative criteria. Record splits/merges and successor paths here and in the affected specs; do not create duplicate authoritative criteria.
- New acceptance IDs are `Fxx-USxx-AC01`, `Fxx-USxx-AC02`, and so on, scoped to the primary story ID. Allocate the next number above the highest ever allocated in that namespace, including retired IDs and every split file. Never renumber or reuse IDs. Record retired IDs and replacements in the spec history; moving a criterion retains its ID. In a merged spec, existing criteria retain their original namespaces; genuinely shared new criteria use the declared primary story namespace and map all covered stories.
- The existing [F01 aggregate](F01-published-programme.md) is a legacy multi-story draft. Preserve its revision 4 and `F01-AC01` through `F01-AC09` identifiers. Do not convert them to story IDs or allocate new Fxx-only acceptance IDs. Any new F01 criterion uses the applicable primary `F01-USxx-ACnn` namespace. A later split must map the legacy criteria without copying or renumbering them.
- Increase the integer specification revision for substantive contract, scope, criterion or approval changes; describe the change and affected approvals/evidence. Approval binds the exact spec revision and agreed contract versions. Formatting/link repairs need a history note only when they affect traceability. An approval of an earlier revision does not approve changed behavior; record whether reapproval is required and keep it pending until resolved.

## Lifecycle and implementation gates

Use **Draft -> Ready -> In progress -> In review -> Verified -> Completed**. A new spec starts Draft. Ready requires a bounded outcome, observable success/adverse criteria, applicable RD/SEC rules, agreed interfaces, resolved blocking decisions and recorded human product/contract approval of the exact revisions. Decisions need a responsible decision owner, alternatives where material, blocking status and recorded resolution; agents cannot approve their own assumptions.

**Ready is specification readiness, not permission to implement.** Application implementation additionally requires the independent test-design, adequacy-review and protected-baseline gates defined in the [agent workflow](../workflow/agents/README.md). Link its task/run records rather than duplicating execution instructions here. Developers cannot alter the approved test baseline.

In progress means authorized implementation has begun after the prerequisite gates. In review means an identified implementation snapshot awaits required independent assessment. Verified means applicable criteria and integration/security/delivery obligations have passing revision-specific evidence under the [development workflow](../workflow/README.md). Completed additionally requires completed human teammate review, current documentation and session logs whose human correctness verification is complete; a pending verification status does not satisfy completion. Unresolved required evidence remains pending; mocks, validator passes and checkboxes do not establish completion. Changes after approval/review reopen the affected gates; retain earlier evidence with its original revisions.

Every spec marks how it contributes to these project requirements, or gives a justified N/A: LLM capability for each product role; SDD and actual Basic Multi-Agent SE handoffs; implemented/tested AI and development-process security; online delivery with separate development/production credentials, data and configuration. Release coverage is assessed across capabilities: each role needs an actual LLM feature, not only shared job infrastructure. Provider/privacy/limit decisions must be resolved before the affected AI capability depends on them. Production deployment and merge still require the applicable human authorization.

## Initial story-to-spec index

This index accounts for all **31** catalogue stories. Only the existing F01 aggregate has been drafted; its three mapped stories are not thereby Ready. Pending rows are coverage reservations, not created specifications or approved scope. Replace a pending row with explicit file/criterion links when drafting; retain every story ID through split/merge changes. Priority remains solely in the project roadmap.

| Story IDs | Authoritative specification and criterion mapping | Current state |
| --- | --- | --- |
| F01-US01 | [F01 aggregate](F01-published-programme.md): F01-AC01, F01-AC03; shared F01-AC02/06-09 | Draft revision 4; approval pending |
| F01-US02 | [F01 aggregate](F01-published-programme.md): F01-AC04, F01-AC07-08; shared F01-AC02-03/06/09 | Draft revision 4; approval pending |
| F01-US03 | [F01 aggregate](F01-published-programme.md): F01-AC04-05; shared F01-AC06/09 | Draft revision 4; approval pending |
| F02-US01, F02-US02, F02-US03 | Specification and criteria pending | Not drafted |
| F03-US01, F03-US02, F03-US03, F03-US04 | Specification and criteria pending | Not drafted |
| F04-US01, F04-US02, F04-US03, F04-US04 | Specification and criteria pending | Not drafted |
| F05-US01, F05-US02, F05-US03 | Specification and criteria pending | Not drafted |
| F06-US01, F06-US02, F06-US03, F06-US04 | Specification and criteria pending | Not drafted |
| F07-US01, F07-US02 | Specification and criteria pending | Not drafted |
| F08-US01, F08-US02 | Specification and criteria pending | Not drafted |
| F09-US01, F09-US02, F09-US03 | Specification and criteria pending | Not drafted |
| F10-US01, F10-US02, F10-US03 | Specification and criteria pending | Not drafted |

## Drafting assistance

Use the repository-local [draft-spec skill](../.agents/skills/draft-spec/SKILL.md) to create a new Draft specification or refine an existing Draft. Its scope stops before auditing finalized specifications, checking their implementation or synchronizing them with code. Finalized specifications may be read as reference only. Human product approval and later implementation gates remain separate.
