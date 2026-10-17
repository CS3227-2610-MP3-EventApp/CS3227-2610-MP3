# Access authorised workspaces

| Field | Value |
| --- | --- |
| Stable capability ID | access-authorised-workspaces |
| Covered stories | [F10-US01](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 1 / Draft |
| Product roles / roadmap | Attendee, organiser, business participant; [phase 1 foundation](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Pending human approval of revision 1 and `CurrentActor v1` |
| Review / run record | Pending |

Sources: [spec standard](../README.md), catalogue, [RD01–RD07](../../docs/project.md#accepted-review-decisions), [security](../../docs/security.md), [architecture design draft](../../docs/architecture.md) updated 2026-10-17. Proposed physical membership fields are not approved policy.

## Product outcome, users and scope

Signed-in users reach only workspaces and records allowed by verified identity and current membership. Attendee personal data is owner-private; organisers act in assigned events; active business members access their business workspace across its event participations within their membership role (RD01). Organiser membership alone never grants business-private access. This capability defines access enforcement for dependent features, not their domain editing rules. Self-service privileged-role grants and participation-specific staff access are excluded. It underpins all three manual/AI role journeys and the shared security/deployment gates, but does not itself satisfy the three-role LLM gate.

## Use cases and user interface

Users sign in and see only available workspaces. A user with multiple authorised contexts can select among them without that selection granting permissions. Organisers may use an authorised invitation flow once its provisioning policy is agreed. Denied access gives a useful generic error without disclosing another user's private record. Empty own-data lists are distinguishable from failed access. Authentication and permission errors are keyboard accessible and understandable.

## Inputs, outputs and functional contract

The trust input is a server-verified identity, never a client-supplied role. Protected requests identify a resource or event/business context; the server resolves active memberships and stored resource ownership. A successful identity context exposes stable user ID and permitted event/business memberships and roles (`CurrentActor v1`); domain responses reveal only records allowed for that actor. Rejected access returns unauthenticated, forbidden or absent semantics without protected content or domain mutation. Business participation establishes event context but does not narrow an accepted business-wide membership (RD01). Privileged invitations require an authorised actor and agreed recipient/role scope; exact invitation fields and lifecycle remain pending.

## Constraints, security and non-functional requirements

[SEC01, SEC02, SEC08, SEC11 and SEC12](../../docs/security.md) apply. Checks cover list, detail, search, write, export, AI context and job access at the server boundary. Inactive membership loses access; permission changes take effect on subsequent protected actions, including AI result access and external execution. Denied requests cannot alter domain state or expose private data in responses or logs. Separate development/production identities, credentials and data are required for delivery.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| access-authorised-workspaces-AC01 | Given a verified attendee, own bookmarks, preferences and itineraries are accessible; another attendee's records are absent from list/detail and cannot be changed. | F10-US01; SEC01/02 | Direct own/wrong-owner reads and writes; before/after state |
| access-authorised-workspaces-AC02 | An active organiser can manage programme and submitted review records for assigned event A; the same calls for B fail without changing B. | F10-US01; SEC01 | Cross-event list/detail/write requests |
| access-authorised-workspaces-AC03 | An active member of business X participating in events A and B can access X's workspaces in both within their role; inactive members and business Y members cannot, and organiser access alone cannot read X's private records. | F10-US01; RD01; SEC01/02 | Two-event synthetic fixture and role matrix |
| access-authorised-workspaces-AC04 | Unauthenticated, inactive or forged-client-role requests are denied at the server boundary; no protected record or credential is returned and no domain state changes. | F10-US01; SEC01/02 | Direct API requests and before/after comparison |
| access-authorised-workspaces-AC05 | An organiser invitation is accepted only through the agreed authorised workflow; a user cannot grant themselves organiser rights, and denied invitations leave memberships unchanged. | F10-US01; SEC01/11 | Provisioning/invitation boundary once policy approved |
| access-authorised-workspaces-AC06 | A membership revocation prevents subsequent reads, writes, AI job access and action execution for that scope, including access via previously selected UI context. | F10-US01; RD07; SEC01/07 | Revocation between requests and execution |

## External interfaces and dependencies

Produces `CurrentActor v1` per [architecture](../../docs/architecture.md#contracts-for-independent-development): verified user ID, server-resolved membership scope and consistent denial categories. All feature contracts consume it; client context selection is advisory. Identity-provider protocol, invitation API and privacy-safe absent/forbidden disclosure are pending contract decisions. Membership changes require migration and recovery evidence once persisted data exists.

## Decisions and approval

| Decision | Options / proposed direction | Owner | Blocks | Resolution |
| --- | --- | --- | --- | --- |
| A-01 | Identity provider and initial organiser provisioning; organiser invitations | Product/security human owner | Ready | Pending (D02/D05) |
| A-02 | Business membership roles, invitations and multiple roles per user | Product human owner | Ready for affected role matrix | Pending (D05) |
| A-03 | Guest published browsing and denied-vs-absent privacy semantics | Product/security human owner | Visibility contract | Pending |
| A-04 | Session expiry/revocation behavior and measurable limits | Security/contract human owner | Ready | Pending |

## Verification and evidence

Independent test scenarios/review, protected baseline, integration, deployed environment separation and human teammate review are pending. AC05 depends on the invitation decision; AC06 requires real revocation across jobs/actions. No acceptance criterion is verified. Record actual agents and checks in the later task/run record and [logs](../../logs/README.md).

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft | Approval and verification pending |
