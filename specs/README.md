# EventApp specification standard

A **spec** is a versioned, agreed and testable contract for one bounded system capability. A Draft proposes that contract; recorded human approval makes it agreed. It states the user intent, accepted inputs, produced outputs, observable behaviour, data and interface shapes, constraints, security boundaries and failure outcomes. It describes the system from outside its implementation boundary. Internal classes, function names, algorithms, execution loops and task plans belong in architecture or implementation records unless an accepted architectural constraint makes them part of the external contract. An Fxx feature umbrella, individual story, developer assignment or UI-only task is not automatically a spec boundary. Keep each contract readable and proportionate to its risk; revise it when approved behaviour or implementation feedback changes the contract.

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

- Start from [TEMPLATE.md](TEMPLATE.md). Use a descriptive capability filename, such as `programme-publication.md`, inside a domain folder once that folder structure is approved. The filename and stable capability ID name the contract, not a story or phase. Story IDs remain traceability references in the index and spec, never the default filename or capability ID.
- Choose a boundary around one coherent set of inputs, outputs, state changes, failure outcomes and constraints. A contract may cover several stories; a story may require several contracts. Map every covered story to its authoritative criteria. Split or combine contracts when this makes the externally observable boundaries clearer, and record successor paths without duplicating authoritative criteria.
- New acceptance IDs use the stable capability ID, for example `programme-publication-AC01`. Allocate the next number above the highest ever allocated for that capability, including retired IDs and legacy IDs retained in the same contract. Never renumber or reuse IDs; moving a criterion retains its ID. Record retired IDs, replacements and split/merge mappings in the history and index. Story IDs continue to appear in traceability columns.
- The [programme Draft](programme/create-and-publish-programme.md) supersedes the former root `F01-published-programme.md` Draft at revision 5. Its revision 4 history and `F01-AC01` through `F01-AC09` identifiers remain intact; new validation criterion `create-and-publish-programme-AC10` covers F04-US03 without duplicating legacy criteria. Neither revision has product approval.
- Increase the integer specification revision for substantive contract, scope, criterion or approval changes; describe the change and affected approvals/evidence. Approval binds the exact spec revision and agreed contract versions. Formatting/link repairs need a history note only when they affect traceability. An approval of an earlier revision does not approve changed behavior; record whether reapproval is required and keep it pending until resolved.

## Lifecycle and implementation gates

Use **Draft -> Ready -> In progress -> In review -> Verified -> Completed**. A new spec starts Draft. Ready requires a bounded outcome, observable success/adverse criteria, applicable RD/SEC rules, agreed interfaces, resolved blocking decisions and recorded human product/contract approval of the exact revisions. Decisions need a responsible decision owner, alternatives where material, blocking status and recorded resolution; agents cannot approve their own assumptions.

**Ready is specification readiness, not permission to implement.** Application implementation additionally requires the independent test-design, adequacy-review and protected-baseline gates defined in the [agent workflow](../workflow/agents/README.md). Link its task/run records rather than duplicating execution instructions here. Developers cannot alter the approved test baseline.

In progress means authorized implementation has begun after the prerequisite gates. In review means an identified implementation snapshot awaits required independent assessment. Verified means applicable criteria and integration/security/delivery obligations have passing revision-specific evidence under the [development workflow](../workflow/README.md). Completed additionally requires completed human teammate review, current documentation and session logs whose human correctness verification is complete; a pending verification status does not satisfy completion. Unresolved required evidence remains pending; mocks, validator passes and checkboxes do not establish completion. Changes after approval/review reopen the affected gates; retain earlier evidence with its original revisions.

Every spec marks how it contributes to these project requirements, or gives a justified N/A: LLM capability for each product role; SDD and actual Basic Multi-Agent SE handoffs; implemented/tested AI and development-process security; online delivery with separate development/production credentials, data and configuration. Release coverage is assessed across capabilities: each role needs an actual LLM feature, not only shared job infrastructure. Provider/privacy/limit decisions must be resolved before the affected AI capability depends on them. Production deployment and merge still require the applicable human authorization.

## Story-to-spec index

This index maps all **31** catalogue stories to domain capabilities and shared technical/UI foundations. Rows follow the [phase-priority roadmap](../docs/project.md#phase-priority-roadmap), not filename order. Status is recorded per row; draft criteria do not imply implementation approval. Exact criteria are in the linked files. A future split or merge must preserve allocated IDs and update both this index and the [catalogue](../docs/UserStoriesAndFeatures.md#story-to-spec-links).

| Roadmap order | Story IDs | Authoritative Draft and criterion IDs | Status |
| --- | --- | --- | --- |
| 1 | N/A: backend technical foundation | [run-backend-with-postgresql](shared/run-backend-with-postgresql.md): run-backend-with-postgresql-AC01–09 | In review revision 2; automated and independent implementation reviews pass, isolated clean development-database workflow verified; human review and fresh-machine setup pending |
| 1a | Cross-cutting presentation | [navigate-eventapp-workspaces](shared/navigate-eventapp-workspaces.md): AC01-12 | In review revision 4 for delivered auth/F06 scope;173 UI tests/build and browser checks pass; human accessibility pending |
| 1b | Presentation preview for F10-US01; does not satisfy real identity/authorisation | [preview-role-entry-and-workspaces](shared/preview-role-entry-and-workspaces.md): preview-role-entry-and-workspaces-AC01–12 | In review revision 2; automated and independent reviews pass, manual browser and human review pending |
| 2 | F10-US01 | [access-authorised-workspaces](shared/access-authorised-workspaces.md): AC01-21 | In review revision 4; safe actionable errors implemented/tested; human review and other downstream domains remain separate |
| 3 | F01-US01–03; F04-US03 | [create-and-publish-programme](programme/create-and-publish-programme.md): F01-AC01–09; create-and-publish-programme-AC10 | In review revision 7; merge integration separates programme discovery from application summaries and retains historical revision-6 evidence. Attendee consumer integration is implemented against the shared producer contract; current local evidence is recorded separately, while online delivery and human review remain pending |
| 4 | F02-US01–02 | [manage-preferences-and-itineraries](attendee-planning/manage-preferences-and-itineraries.md): manage-preferences-and-itineraries-AC01–07 | Draft; approval and verification pending |
| 5 | F06-US01 | [submit-business-applications](applications/submit-business-applications.md): AC01-19, AC06/12 retired | In review revision 4; open-event request journey, named settings and private/frozen lifecycle pass automated/browser checks; human/NVDA/actual400% pending |
| 5 | F06-US03 | [manage-preparation-tasks-and-budgets](business-preparation/manage-preparation-tasks-and-budgets.md): manage-preparation-tasks-and-budgets-AC01–11 | In review revision 4; manual preparation implemented, independent reviews and automated/local integration checks pass; human gates pending |
| 6 | F04-US01; F06-US02 (status/reason only) | [decide-applications-and-show-outcomes](applications/decide-applications-and-show-outcomes.md): AC01-09, AC06 retired | In review revision 2; once-only decision/outcome implemented and independently reviewed; booth/setup deferred, human gates pending |
| 6 | F06-US02 (booth/setup remainder) | [assign-booths-and-publish-setup-details](business-preparation/assign-booths-and-publish-setup-details.md): AC01–06 | In review revision1; independent reviews, automated/local migration/browser/restart checks pass; human gates pending |
| 7 | F10-US02 | [monitor-and-recover-ai-tasks](shared/monitor-and-recover-ai-tasks.md): monitor-and-recover-ai-tasks-AC01–07 | Draft revision 2; organiser slice implemented and independently reviewed; partial automated evidence in run record, live/restart/human gates and other roles pending |
| 8 | F03-US01 | [generate-feasible-itineraries](attendee-planning/generate-feasible-itineraries.md): generate-feasible-itineraries-AC01–06 | Draft; approval and verification pending |
| 8 | F03-US02 | [answer-event-questions](attendee-planning/answer-event-questions.md): answer-event-questions-AC01–06 | Draft; approval and verification pending |
| 9 | F04-US02 | [analyse-applications-with-ai](applications/analyse-applications-with-ai.md): analyse-applications-with-ai-AC01–09 | Draft revision 2; implemented and independently reviewed; partial automated evidence in run record, live/browser/human gates pending |
| 10 | F06-US04 | [generate-preparation-drafts](business-preparation/generate-preparation-drafts.md): generate-preparation-drafts-AC01–06 | Draft; approval and verification pending |
| 11 | F05-US01 | [change-published-activities](programme/change-published-activities.md): change-published-activities-AC01–06; [draft-and-publish-disruption-announcements](programme/draft-and-publish-disruption-announcements.md): draft-and-publish-disruption-announcements-AC03 | Draft; approval and verification pending |
| 11 | F05-US02 | [notify-affected-attendees](programme/notify-affected-attendees.md): notify-affected-attendees-AC01–06 | Draft; approval and verification pending |
| 11 | F05-US03 | [draft-and-publish-disruption-announcements](programme/draft-and-publish-disruption-announcements.md): draft-and-publish-disruption-announcements-AC01–06 | Draft; approval and verification pending |
| 12 | F03-US03 | [replan-after-cancellations](attendee-planning/replan-after-cancellations.md): replan-after-cancellations-AC01–06 | Draft; approval and verification pending |
| 13 | F02-US03 | [track-merchandise-spending](attendee-planning/track-merchandise-spending.md): track-merchandise-spending-AC01–05 | Draft; approval and verification pending |
| 14 | F03-US04 | [create-personal-event-recaps](attendee-planning/create-personal-event-recaps.md): create-personal-event-recaps-AC01–05 | Draft; approval and verification pending |
| 15 | F04-US04 | [review-programme-coverage](programme/review-programme-coverage.md): review-programme-coverage-AC01–05 | Draft; approval and verification pending |
| 16 | F07-US01 | [plan-group-meals](attendee-planning/plan-group-meals.md): plan-group-meals-AC01–05 | Draft; approval and verification pending |
| 16 | F07-US02 | [estimate-travel-between-activities](attendee-planning/estimate-travel-between-activities.md): estimate-travel-between-activities-AC01–06 | Draft; approval and verification pending |
| 17 | F08-US01 | [compare-venues](venue-research/compare-venues.md): compare-venues-AC01–05 | Draft; approval and verification pending |
| 18 | F09-US01 | [draft-promotional-concepts](business-preparation/draft-promotional-concepts.md): draft-promotional-concepts-AC01–05 | Draft; approval and verification pending |
| 18 | F09-US02 | [compare-suppliers](business-preparation/compare-suppliers.md): compare-suppliers-AC01–05 | Draft; approval and verification pending |
| 19 | F10-US03 | [approve-external-actions](shared/approve-external-actions.md): approve-external-actions-AC01–06 | Draft; approval and verification pending |
| 20 | F08-US02 | [request-venue-quotations](venue-research/request-venue-quotations.md): request-venue-quotations-AC01–07 | Draft; approval and verification pending |
| 20 | F09-US03 | [review-procurement-proposals](business-preparation/review-procurement-proposals.md): review-procurement-proposals-AC01–06 | Draft; approval and verification pending |

## Drafting assistance

Use the repository-local [draft-spec skill](../.agents/skills/draft-spec/SKILL.md) to create a new Draft specification or refine an existing Draft. Its scope stops before auditing finalized specifications, checking their implementation or synchronizing them with code. Finalized specifications may be read as reference only. Human product approval and later implementation gates remain separate.

### Attendee integration evidence boundary (2026-10-21)

The attendee consumer now targets the shared programme producer contract using generated schema types, canonical paths, total pagination and all six activity types. Yik Bing authorized completing the integration and accepted event-local start-date filtering, superseding the earlier overlap-date consumer proposal. The [historical snapshot](../workflow/agents/runs/2026-10-21-attendee-contract-before-master-merge.md) retains prior approval/evidence; current checks and limits belong in the [integration session](../logs/yikbing/2026-10-21-attendee-integration.md). Online delivery and human review remain separate gates; no full F01 completion is claimed solely from local tests.
