# Draft and publish disruption announcements

| Field | Value |
| --- | --- |
| Stable capability ID | draft-and-publish-disruption-announcements |
| Covered stories | [F05-US01 and F05-US03](../../docs/UserStoriesAndFeatures.md): publication of a change announcement and optional AI drafting |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap | Organiser author, attendee reader; [phase 4](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of revision 1 and exact publication policy |
| Review / run record | Pending |

Sources: [standard](../README.md), catalogue, [RD04/RD07](../../docs/project.md#accepted-review-decisions), [security](../../docs/security.md), [architecture design draft](../../docs/architecture.md) updated 2026-10-17.

## Product outcome, users and scope

An organiser can ask AI to draft a disruption announcement from verified programme changes, edit it, review its exact text and source revision, then explicitly approve publication. Attendees can read only a published announcement. A manual drafting path remains available during AI failure. This capability does not send email/push, alter the programme change, or notify accepted-plan recipients; those belong to separate contracts.

## Use cases and user interface

The organiser selects a committed change, sees verified old/new facts, requests a draft or writes one manually, edits and previews the exact audience/text, then approves a specific revision. The preview indicates if source facts changed and requires refreshed review when stale. The attendee sees published text with source/change context; drafts and rejected text remain private. Loading, AI failure and publication uncertainty are explicit and accessible.

## Inputs, outputs and functional contract

Inputs are authorised event/change ID, source revisions and user-edited body. AI input includes only minimum permitted verified facts; retrieved descriptions remain untrusted. A saved draft has owner/event, body, source change ID/revision, draft revision and validation status. Publication binds actor, exact body/audience and source revision; success yields a published revision/time and attributable outcome. Changed text or facts invalidate prior approval. No draft publication occurs from AI output alone. Audience scope and content bounds require approval before Ready.

## Constraints, security and non-functional requirements

[SEC01–SEC04, SEC06–SEC08, SEC10–SEC12](../../docs/security.md) apply. Factual claims about times, rooms and cancellation must match authoritative change/current facts or be clearly editorial and validated before publication. An AI job follows [task monitoring](../shared/monitor-and-recover-ai-tasks.md). Publication is a shared-state action requiring concrete human approval and server revalidation; retries cannot duplicate a successful publication. Failed AI or publish attempt leaves previous published announcements and accepted data intact.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| draft-and-publish-disruption-announcements-AC01 | An authorised organiser requests a draft for a committed change and receives editable text grounded in the change's validated old/new facts and source revision. | F05-US03; RD04/07; SEC04 | Real provider with synthetic change; fact checks |
| draft-and-publish-disruption-announcements-AC02 | Invalid model schema, fabricated facts, stale source revision or injected instructions cannot produce a valid publishable draft or prohibited side effect. | F05-US03; SEC03/04/06 | Adversarial source/model results |
| draft-and-publish-disruption-announcements-AC03 | Organiser writes or edits a draft, sees exact text/audience, explicitly approves that revision and then publishes once; attendee reads the same approved text. | F05-US01/03; SEC06/07 | Manual and AI-assisted preview/approval/published comparison |
| draft-and-publish-disruption-announcements-AC04 | Edited text, changed facts, expired approval, revoked membership, wrong-event actor or repeated/concurrent publish is rejected or reconciled without publishing unapproved text twice. | F05-US03; SEC01/07 | Bypass, stale and duplicate attempts |
| draft-and-publish-disruption-announcements-AC05 | Provider timeout, quota rejection or publication storage failure leaves prior published state intact and manual authoring available, with a useful outcome and audit record. | F05-US03; RD07; SEC10/11 | Controlled failure, before/after state |
| draft-and-publish-disruption-announcements-AC06 | Attendee list/detail exposes published announcements only; unrelated organisers cannot read/edit private drafts. | F05-US03; SEC01/02 | Direct list/detail/write matrix |

## External interfaces and dependencies

Consumes `ProgrammeChanged v1`, current `PublishedProgramme v1`, [AI tasks](../shared/monitor-and-recover-ai-tasks.md), [workspace access](../shared/access-authorised-workspaces.md), and the exact-action safeguards in [approval](../shared/approve-external-actions.md). The latter must be in place before any automated external send; publication still requires SEC06/07 semantics even if implementation timing differs. Announcement read/approval result shapes and source-version behavior need reviewed contracts.

## Decisions and approval

| Decision | Options / proposed direction | Owner | Blocks | Resolution |
| --- | --- | --- | --- | --- |
| D-01 | Announcement audience, body limits and editorial versus factual claims | Product human owner | Ready | Pending |
| D-02 | Publication approval expiry, revision and duplicate semantics | Product/security human owner | Ready | Pending |
| D-03 | AI provider, outbound facts, limits and retention | Product/privacy human owner | AI path Ready | Pending (D06/D08) |

## Verification and evidence

Independent test design/review, baseline, real selected-provider integration, approval bypass checks, online attendee read and human teammate review are pending. All criteria are unverified; simulated AI alone cannot satisfy the organiser LLM gate.

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft | Approval and verification pending |
