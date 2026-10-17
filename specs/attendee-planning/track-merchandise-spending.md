# Track merchandise spending

| Field | Value |
| --- | --- |
| Stable capability ID | `track-merchandise-spending` |
| Covered stories | [F02-US03](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Attendee; [phase 5, order 13](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of this revision and dependent contracts |
| Review / run record | Pending independent draft review and later implementation records |

Follow the [standard](../README.md). An attendee maintains a private manual merchandise wishlist and sees an estimated spending total. The list is a planning aid, not a stock, purchase or reservation service.

## Product outcome, users and scope

The attendee records items they might buy, quantities, estimated unit prices and currency. They can edit/remove entries and see a total derived from current entries. No seller inventory, actual charge or availability is implied. This manual capability remains independent of AI and satisfies no LLM role gate by itself.

## Use cases and user interface

The owner adds, edits or removes a line, reviews its estimate and the calculated total, and sees an empty-state total when no items exist. Input validation distinguishes malformed quantities, unsupported currency and out-of-range prices; errors preserve prior entries. Estimates and any lack of stock verification are visible. Inputs, totals and errors are accessible by keyboard and assistive technology.

## Inputs, outputs and functional contract

Inputs are owner/event context, an item label, positive quantity, nonnegative estimated unit price in integer minor units, supported currency, and expected revision on edit. Outputs are owner-scoped persisted lines and a deterministic sum of quantity times unit price for the displayed currency. Mixed-currency behavior, bounds, event association and whether notes/source URLs exist require decisions. No external purchase or payment side effect occurs. Unauthorized, invalid, failed or stale requests preserve prior lines and totals.

## Constraints, security and non-functional requirements

Apply [SEC01, SEC02, SEC10 and SEC11](../../docs/security.md) and [currency/quantity principles](../../docs/architecture.md#required-relationship-rules). Store private wishlist data only for its owner; never expose it via public event views. Reject arithmetic overflow and ambiguous currency aggregation. Local calculation must not present estimates as confirmed quotations or guarantee stock. Persistence and separate development/production data require evidence before delivery.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| track-merchandise-spending-AC01 | Given a valid owner, when they add/edit/remove a manual wishlist line, then the owner retrieves the persisted label, quantity, estimated price and currency after a storage lifecycle. | F02-US03; SEC01-02 | CRUD and restart retrieval |
| track-merchandise-spending-AC02 | Given multiple valid lines in one supported currency, when the list is viewed, then the displayed estimated total equals the sum of quantity times unit price and updates after edits/removals. | F02-US03 | Arithmetic boundaries |
| track-merchandise-spending-AC03 | Given an empty list, when viewed, then the estimate is zero in the selected currency and no stock or purchase claim appears. | F02-US03 | Empty state |
| track-merchandise-spending-AC04 | Given invalid quantity/price, overflow, unsupported or incompatible currency, when a write/total is requested, then a clear error appears and persisted lines and total are unchanged. | F02-US03; SEC02 | Invalid and overflow cases |
| track-merchandise-spending-AC05 | Given another user, unauthenticated caller or stale revision, when list/detail/write is attempted, then private data is not disclosed or modified. | F02-US03; SEC01-02 | Direct boundary checks |

## External interfaces and dependencies

Uses [workspace authorization](../shared/access-authorised-workspaces.md) and event identity; it does not require AI, supplier research or a purchase provider. The contract exposes private lines, revision and estimated total with explicit currency and validation errors. Its persistent data ownership and physical shape require [architecture](../../docs/architecture.md) review because the current logical schema does not yet define a wishlist entity.

## Decisions and approval

| Decision | Options / proposed direction | Decision owner | Blocks what? | Resolution |
| --- | --- | --- | --- | --- |
| TMS-01 | Supported currencies and mixed-currency handling; do not silently convert | Human product/contract owners | Ready and total rules | Pending |
| TMS-02 | Quantity/price limits, item label and event association | Human product owner | Ready and validation | Pending |
| TMS-03 | Wishlist retention and persistent interface shape | Planning/architecture owners with human approval | Ready/integration | Pending |

## Verification and evidence

AC01–AC05 are pending independent test scenarios, including restart persistence, arithmetic boundary and cross-owner denial. Baseline, implementation snapshot, reviews, delivery checks and human summary verification remain pending under the [agent workflow](../../workflow/agents/README.md). No implementation or test result is claimed.

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft; AC01–AC05 allocated | Approval and verification pending |
