# Plan group meals

| Field | Value |
| --- | --- |
| Stable capability ID | `plan-group-meals` |
| Covered stories | [F07-US01](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Attendee; [phase 5, order 16](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of this revision and dependent contracts |
| Review / run record | Pending independent draft review and later implementation records |

Follow the [standard](../README.md). An attendee enters group dining needs, reviews sourced meal options and may place a private meal slot in a draft itinerary. This is personal planning, not group account sharing, a reservation, availability guarantee or booking.

## Product outcome, users and scope

The attendee can compare meal options using entered group size, budget and dietary needs, with sources, retrieval time and uncertainty visible. The service may use external research under an agreed provider/destination policy. A draft meal slot helps reserve time in the user's own plan; no other person's data or account is required. An LLM-generated comparison requires F10 job controls and factual validation if used.

## Use cases and user interface

The user supplies requirements and views options with source links, estimated price, dietary evidence, relevant location and missing facts. The UI does not imply that group size proves availability or that unsupported dietary/accessibility claims are confirmed. The user may add/edit/remove a meal slot in a draft schedule and see time conflicts. Invalid provider results or no qualifying options yield an explicit unknown/no-result state; manual itinerary editing remains available. Forms, source links and warnings are accessible.

## Inputs, outputs and functional contract

Inputs are owner/event identity, positive group size, budget and currency, dietary requirements, optional meal time/location constraints and explicit plan revision. Outputs are sourced option records with source URL, provider, retrieved time, evidence and uncertainty, plus an optional owner-scoped draft meal slot. Prices are labelled estimates unless supported by a current quotation. Accepted-plan behavior for meal slots, precise bounds and meal-entry shape remain decisions. A failed/invalid search or stale plan write leaves the previous itinerary unchanged and creates no booking or external send.

## Constraints, security and non-functional requirements

Apply RD03, RD04 and RD07; [SEC01–05, SEC08–10](../../docs/security.md). External websites are untrusted data. Links/destinations follow server policy, including redirects and private-network blocking. Do not send unnecessary private accessibility/preferences data. Validate factual claims before display, label missing/old data, and do not claim current seating or dietary safety without evidence. Draft conflict warnings and accepted-plan hard-constraint checks must be reconciled with the planning contract before Ready.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| plan-group-meals-AC01 | Given valid group requirements, when the owner searches, then each displayed option identifies source/provider/retrieval time and distinguishes supported from unknown price, dietary and capacity facts. | F07-US01; SEC04, SEC09 | Sourced and missing-value options |
| plan-group-meals-AC02 | Given a chosen option and valid draft plan, when the owner adds a meal slot, then the private draft shows its time/location and any conflict warning without claiming a reservation. | F07-US01; RD03; SEC05 | Draft slot and overlap |
| plan-group-meals-AC03 | Given unsupported availability, stale menu or missing dietary evidence, when results are shown, then the UI exposes uncertainty and does not claim confirmed suitability. | F07-US01; SEC04 | Unknown/stale evidence |
| plan-group-meals-AC04 | Given malicious source text or URL, when research runs, then instructions in that content do not change authority and forbidden destinations/redirects are blocked. | F07-US01; SEC03, SEC09 | Injection/URL policy |
| plan-group-meals-AC05 | Given unauthorized access, invalid inputs, stale plan revision, provider failure, timeout or quota exhaustion, when the request ends, then private records are not disclosed or changed and manual planning remains usable. | F07-US01; RD07; SEC01-02, SEC10 | Boundary/failure preservation |

## External interfaces and dependencies

Consumes [manual planning](manage-preferences-and-itineraries.md), [workspace authorization](../shared/access-authorised-workspaces.md), [AI task monitoring](../shared/monitor-and-recover-ai-tasks.md) if model research is used, and approved external source policy. Outputs sourced comparison records and typed draft meal entries. The [architecture](../../docs/architecture.md) currently models itinerary activities only; typed meal entry semantics and persistence need cross-contract approval. [Travel estimates](estimate-travel-between-activities.md) may add route context but do not establish restaurant availability.

## Decisions and approval

| Decision | Options / proposed direction | Decision owner | Blocks what? | Resolution |
| --- | --- | --- | --- | --- |
| PGM-01 | Source/provider allowlist, budget, freshness and destination rules | Human product/security owners | Ready/research integration | Pending; D07 |
| PGM-02 | Meal-slot data shape, accepted-plan validation and retention | Planning/architecture owners with human approval | Ready/integration | Pending |
| PGM-03 | Group-size/budget limits and dietary evidence threshold | Human product owner | Ready/validation | Pending; D08 |

## Verification and evidence

AC01–AC05 are pending test-design scenarios. Real source/provider checks, link blocking, plan persistence, independent reviews, protected baseline, human teammate review and environment evidence remain pending under the [agent workflow](../../workflow/agents/README.md). No external result is claimed.

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft; AC01–AC05 allocated | Approval and verification pending |
