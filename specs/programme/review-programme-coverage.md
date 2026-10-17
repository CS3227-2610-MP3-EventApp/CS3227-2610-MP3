# Review programme coverage

| Field | Value |
| --- | --- |
| Stable capability ID | review-programme-coverage |
| Covered stories | [F04-US04](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap | Organiser; [phase 5](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of revision 1 and checklist policies |
| Review / run record | Pending |

Sources: [standard](../README.md), catalogue, [project](../../docs/project.md), [security](../../docs/security.md), [architecture design draft](../../docs/architecture.md) updated 2026-10-17.

## Product outcome, users and scope

An organiser reviews editable coverage and accessibility checklists for an event, with each finding linked to supporting programme facts or an explicit information gap. The checklist helps identify issues for human review; it is not safety or legal compliance certification and does not change programme publication. The categories and stored assessment policies need human agreement before Ready. This manual review capability may use AI to explain findings later, but a role LLM requirement is satisfied by the separately scoped organiser analysis feature, not this draft alone.

## Use cases and user interface

The organiser selects an event and policy version, generates a checklist from current published facts, sees categories, finding/evidence/unknown status and source revision, edits a private working draft and reviews changes. When programme facts or policy change, stale findings are visibly marked and refreshed before relying on current coverage. Missing evidence stays visible rather than passing. Empty programme and inaccessible evidence have useful states. Checklist controls and explanations are accessible.

## Inputs, outputs and functional contract

Inputs are authorised event, current published programme revision set, selected immutable policy version and optional organiser draft edits. Outputs are a checklist ID/revision, category/item status, evidence references with programme IDs/revisions or explicit unknown, observed policy version and saved editable draft. A new run must distinguish newly evaluated findings from prior user edits. Exact categories, evaluation semantics, edit/version retention and whether any AI explanation is included remain decisions; no inferred safety/compliance claim is allowed.

## Constraints, security and non-functional requirements

[SEC01, SEC02, SEC04, SEC08 and SEC11](../../docs/security.md) apply where relevant. Organiser event scope governs checklist and evidence reads/writes. Published authoritative facts must support conclusions; unsupported accessibility values are unknown, not proof of accessibility. Stale facts/policy invalidate current status; failed generation preserves prior drafts. A checklist has no authority to publish, cancel or certify an event. Exact performance bounds and retention remain pending.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| review-programme-coverage-AC01 | For an authorised event and approved policy version, organiser receives coverage and accessibility categories with findings linked to current programme evidence or marked unknown. | F04-US04; SEC04 | Mixed complete/missing facts and evidence inspection |
| review-programme-coverage-AC02 | Organiser can edit and retrieve a checklist draft without changing programme facts or policy; another event's organiser cannot read/edit it. | F04-US04; SEC01/02 | Draft persistence and cross-event access |
| review-programme-coverage-AC03 | Changed programme fact or policy version makes prior finding visibly stale; it is not represented as a current assessment until reevaluated. | F04-US04 | Revision-change comparison |
| review-programme-coverage-AC04 | Missing accessibility evidence remains an explicit gap; no output claims certification, safety or compliance from checklist status. | F04-US04 | Unknown-data and UI language checks |
| review-programme-coverage-AC05 | Invalid event/policy inputs, unauthorised access or generation failure produce a safe error and leave saved checklist and programme state unchanged. | F04-US04; SEC01 | Direct boundary and before/after checks |

## External interfaces and dependencies

Consumes `PublishedProgramme v1` and [workspace access](../shared/access-authorised-workspaces.md). Requires a versioned, human-approved checklist policy and evidence reference contract before implementation; physical schema and assessment mechanics remain internal. No consumer may treat draft checklist findings as a programme publication decision.

## Decisions and approval

| Decision | Options / proposed direction | Owner | Blocks | Resolution |
| --- | --- | --- | --- | --- |
| Q-01 | Coverage/accessibility categories and evidence rules | Product/accessibility human owner | Ready | Pending |
| Q-02 | Policy versioning, organiser edits and stale-result handling | Product/contract human owner | Ready | Pending |
| Q-03 | Any AI explanation scope, provider data and retention | Product/privacy human owner | AI extension only | Pending |

## Verification and evidence

Policy approval, independent test plan/review, baseline, implementation evidence and human teammate review are pending. All criteria are unverified. Manual accessibility/content review requires a named human reviewer and approved policy; no certification is claimed.

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft | Approval and verification pending |
