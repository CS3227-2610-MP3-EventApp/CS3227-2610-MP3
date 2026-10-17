# Compare venues for an event

| Field | Value |
| --- | --- |
| Stable capability ID | compare-venues |
| Covered stories | F08-US01; [catalogue](../../docs/UserStoriesAndFeatures.md); criteria below |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Authorised event organisers. [5 - Further capabilities](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending: human product/contract owner; no approval recorded |
| Review / run record | Pending: independent draft review and test scenarios |

## Product outcome, users and scope

An organiser enters location, capacity and budget requirements and requests bounded AI venue research. The saved comparison distinguishes sourced facts, missing values and estimates. It does not book venues or claim a published price is a confirmed quote.

## Use cases and user interface

Show requirements, source/provider/retrieval time per venue, comparison fields, unknowns, estimate labels and failure/partial status. The organiser can inspect sources before shortlisting.

## Inputs, outputs and functional contract

Inputs: event ID, location, capacity, budget and accessibility requirements; permitted external source scope. Outputs: owned comparison with venue identifier/name/location, sourced capacity/accessibility and price basis where available, uncertainties and timestamp; no booking.

## Constraints, security and non-functional requirements

RD07; SEC01-04, SEC08-10. Research is bounded and external content is untrusted. Unsafe links are blocked. Missing values remain unknown; claims must have support. See [accepted decisions](../../docs/project.md#accepted-review-decisions) and [security rules](../../docs/security.md). Accessibility and delivery obligations follow the [development workflow](../../workflow/README.md); exact measurable bounds remain pending where listed below.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rule trace | Planned verification |
| --- | --- | --- | --- |
| compare-venues-AC01 | An authorised organiser obtains a saved comparison against stated requirements with each material claim sourced or marked unknown. | F08-US01; RD07 | Pending: independent positive/adverse scenario |
| compare-venues-AC02 | Published rates and inferred costs are labelled as estimates, not confirmed quotes or availability. | F08-US01; RD07 | Pending: independent positive/adverse scenario |
| compare-venues-AC03 | Wrong-event or unauthorised users cannot start/read the comparison; denied requests have no private side effects. | F08-US01; RD07 | Pending: independent positive/adverse scenario |
| compare-venues-AC04 | Injected pages, unsafe redirects, fabricated venue facts and malformed output cannot be displayed as validated research. | F08-US01; RD07 | Pending: independent positive/adverse scenario |
| compare-venues-AC05 | Timeout, quota or provider failure returns a clear partial/failure result and preserves earlier comparisons and manual research. | F08-US01; RD07 | Pending: independent positive/adverse scenario |

## External interfaces and dependencies

Requires organiser access and AI task monitoring. Search provider, source policy, cost/latency limits, freshness and accessibility evidence threshold need approval. Shared logical contracts and ownership boundaries are in [architecture](../../docs/architecture.md); they are design proposals until reviewed. Producer and consumer versions, data shape details and compatibility must be agreed before Ready.

## Decisions and approval

| Decision | Owner and blocking status | Resolution |
| --- | --- | --- |
| compare-venues-D01: Provider/source allowlist, freshness, accessibility evidence, limits and retention; human product/security owner; blocks Ready. | Human product/contract authority; blocks Ready or the affected scope | Pending |

## Verification and evidence

Independent test design, adequacy review, protected baseline, implementation snapshot, integration and security checks are pending under the [agent workflow](../../workflow/agents/README.md). No application behaviour, persistence, provider integration or deployment has been verified. AI role coverage and environment separation remain release gates where applicable.

| Criterion | Evidence | Status |
| --- | --- | --- |
| compare-venues-AC01 | Pending | Not verified |
| compare-venues-AC02 | Pending | Not verified |
| compare-venues-AC03 | Pending | Not verified |
| compare-venues-AC04 | Pending | Not verified |
| compare-venues-AC05 | Pending | Not verified |

## Revision history

| Revision / date | Change | Approval and evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft from F08-US01 and current RD/SEC rules | Product approval and verification pending |
