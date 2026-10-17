# Estimate travel between activities

| Field | Value |
| --- | --- |
| Stable capability ID | `estimate-travel-between-activities` |
| Covered stories | [F07-US02](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap reference | Attendee; [phase 5, order 16](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of this revision and dependent contracts |
| Review / run record | Pending independent draft review and later implementation records |

Follow the [standard](../README.md). An attendee sees sourced travel-time estimates between chosen locations and may enter a manual buffer when no estimate exists. An estimate supports planning; it does not promise a route, arrival time, wheelchair access or booking.

## Product outcome, users and scope

The owner can inspect travel time, mode, route source and retrieval time between activities or meals they choose. When a provider cannot return a supported result, the owner can record a buffer explicitly. This capability provides data to itinerary constraint checks only under an agreed buffer policy. It is not navigation, transport purchase or proof of accessibility.

## Use cases and user interface

The user views consecutive plan locations and an estimated time with mode, source, retrieved time and uncertainty. Missing or stale estimates are labelled; a manual-buffer input is available. The UI distinguishes a user-entered buffer from a provider estimate, and shows how each affects a schedule warning/acceptance after rules are agreed. Unknown wheelchair suitability remains unknown. Errors do not erase manual buffers or plans. Controls and units are clearly labelled and keyboard accessible.

## Inputs, outputs and functional contract

Inputs are an authenticated owner/event, chosen location IDs or reviewed location details, travel mode and optional departure time, and a nonnegative manual buffer with unit and expected plan revision. Output is a provider-derived estimated duration with route/source identifier, provider, retrieval time, mode, qualifications and uncertainty; or explicit unavailable status. Manual buffer persists as user-entered planning data, never as provider evidence. Unit conversions and bounds are deterministic. A stale, invalid, unauthorized or failed write leaves previous buffers/plan state unchanged. Exact location/route contracts and allowed modes remain decisions.

## Constraints, security and non-functional requirements

Apply RD03, RD04, RD07 and [SEC01–05, SEC08–10](../../docs/security.md). External route data is untrusted and links/destinations follow server policy. Do not state a best route, actual arrival or wheelchair accessibility without supporting data. Disclose only necessary location/time context to the provider; private preferences are excluded unless approved. Current programme location revisions must be reflected. No estimate means no invented travel time; the agreed acceptance policy for unknown/manual buffers must be resolved before Ready.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| estimate-travel-between-activities-AC01 | Given valid chosen locations and supported mode, when an estimate is available, then the user sees duration, unit, mode, source/provider and retrieval time, labelled as an estimate. | F07-US02; SEC04 | Sourced route result |
| estimate-travel-between-activities-AC02 | Given no supported estimate, when the user opens the journey, then the UI states unavailable and accepts an explicit manual buffer without representing it as provider data. | F07-US02; RD03 | Fallback and provenance |
| estimate-travel-between-activities-AC03 | Given a saved manual buffer, when the owner reopens the draft after a storage lifecycle, then its value and origin persist; a changed location/time is flagged for review. | F07-US02; RD04 | Persistence/staleness |
| estimate-travel-between-activities-AC04 | Given missing wheelchair evidence, stale route facts or a malformed provider result, when displayed, then unsupported accessibility or route-quality claims are absent and uncertainty is visible. | F07-US02; SEC04 | Unsupported/stale facts |
| estimate-travel-between-activities-AC05 | Given malicious route content/destination or another user's plan, when direct research/read/write is attempted, then destination and ownership boundaries hold with no private disclosure or plan mutation. | F07-US02; SEC01-03, SEC09 | URL/injection/authorization |
| estimate-travel-between-activities-AC06 | Given provider failure, timeout, quota or stale plan revision, when estimation/editing ends, then previous plan and buffer state are preserved and manual planning remains available. | F07-US02; RD07; SEC10 | Failure preservation |

## External interfaces and dependencies

Consumes owner-scoped [plans](manage-preferences-and-itineraries.md), authoritative [programme locations and changes](../programme/change-published-activities.md), optional [meal slots](plan-group-meals.md), [workspace access](../shared/access-authorised-workspaces.md), and an approved route provider. Returns estimate/unavailable with provenance and separate manual-buffer data. The [architecture](../../docs/architecture.md) explicitly defers typed travel entries; agree data/interface shape and constraint use across planning before Ready.

## Decisions and approval

| Decision | Options / proposed direction | Decision owner | Blocks what? | Resolution |
| --- | --- | --- | --- | --- |
| ETA-01 | Route provider, modes, source/destination policy, cost and freshness | Human product/security owners | Ready/provider integration | Pending; D07 |
| ETA-02 | Location representation and plan/travel-entry contract | Programme/planning owners with human approval | Ready/integration | Pending |
| ETA-03 | Manual-buffer limits and hard-constraint treatment of unknown route/accessibility | Human product owner | Ready/acceptance behavior | Pending; D08 |

## Verification and evidence

AC01–AC06 remain unexecuted independent test-design scenarios. Real-provider integration, URL security, persistence, stale-location behavior, protected baseline, independent reviews, human teammate review and environment separation evidence are pending under the [agent workflow](../../workflow/agents/README.md).

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft; AC01–AC06 allocated | Approval and verification pending |
