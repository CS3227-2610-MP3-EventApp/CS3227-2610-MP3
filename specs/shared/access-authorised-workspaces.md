# Access authorised workspaces

| Field | Value |
| --- | --- |
| Stable capability ID | access-authorised-workspaces |
| Covered stories | [F10-US01](../../docs/UserStoriesAndFeatures.md) |
| Specification revision / status | 2 / Draft |
| Product roles / roadmap | Attendee, organiser, business participant; [phase 1 foundation](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Provisioning/self-registration direction approved by requesting teammate on 2026-10-18; full revision 2 and `CurrentActor v1` approval pending |
| Review / run record | [2026-10-18 planning and independent documentation reviews](../../logs/dylan/2026-10-18-project-understanding-auth-ui-planning.md); executable access test/run record pending |

Sources: [spec standard](../README.md), catalogue, [RD01–RD07](../../docs/project.md#accepted-review-decisions), [security](../../docs/security.md), [architecture design draft](../../docs/architecture.md) updated 2026-10-18. Proposed physical membership fields are not approved policy.

## Product outcome, users and scope

Signed-in users reach only workspaces and records allowed by verified identity and current membership. Attendee personal data is owner-private; organisers act in assigned events; active business members access their business workspace across its event participations within their membership role (RD01). Organiser membership alone never grants business-private access. This capability defines real registration, identity and access enforcement for dependent features, not their domain editing rules. Self-service organiser grants and participation-specific staff access are excluded. It underpins all three manual/AI role journeys and the shared security/deployment gates, but does not itself satisfy the three-role LLM gate. The separate [role-entry prototype](preview-role-entry-and-workspaces.md) does not implement or verify this capability.

## Use cases and user interface

Attendees may self-register. A business owner may self-register a new business, creating that business and their initial active owner membership atomically at the future server boundary. Users sign in and see only available workspaces. A user with multiple authorised contexts can select among them without that selection granting permissions.

Organisers cannot self-register. An authorised super organiser provisions an organiser identity from username and email and assigns explicit event-scoped membership. The super organiser is an administrative actor, not a fourth product workspace. Initial organiser access uses a single-use, expiring temporary password that must be replaced before workspace access; secure delivery, exact expiry and recovery depend on the selected identity provider. Denied access and login failures give useful generic errors without disclosing account existence or another user's private record. Empty own-data lists are distinguishable from failed access. Authentication and permission errors are keyboard accessible and understandable.

## Inputs, outputs and functional contract

The trust input is a server-verified identity, never a client-supplied role. Protected requests identify a resource or event/business context; the server resolves active memberships and stored resource ownership. A successful identity context exposes stable user ID and permitted event/business memberships and roles (`CurrentActor v1`); domain responses reveal only records allowed for that actor. Rejected access returns unauthenticated, forbidden or absent semantics without protected content or domain mutation. Business participation establishes event context but does not narrow an accepted business-wide membership (RD01).

Business-owner registration cannot select an existing business, organiser authority or a more privileged membership; failure leaves neither an orphan business nor membership. Organiser provisioning requires an already-authorised super organiser and explicit event scope. Creating an identity without active event membership grants no organiser workspace. Temporary passwords are never stored or logged as plaintext, are single-use and expiring, and must be replaced before workspace access. Additional business invitations, organiser invitations, multiple-role semantics and ownership transfer remain pending.

## Constraints, security and non-functional requirements

[SEC01, SEC02, SEC08, SEC11 and SEC12](../../docs/security.md) apply. Checks cover list, detail, search, write, export, AI context and job access at the server boundary. Inactive membership loses access; permission changes take effect on subsequent protected actions, including AI result access and external execution. Denied requests cannot alter domain state or expose private data in responses or logs. Separate development/production identities, credentials and data are required for delivery.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| access-authorised-workspaces-AC01 | Given a verified attendee, own bookmarks, preferences and itineraries are accessible; another attendee's records are absent from list/detail and cannot be changed. | F10-US01; SEC01/02 | Direct own/wrong-owner reads and writes; before/after state |
| access-authorised-workspaces-AC02 | An active organiser can manage programme and submitted review records for assigned event A; the same calls for B fail without changing B. | F10-US01; SEC01 | Cross-event list/detail/write requests |
| access-authorised-workspaces-AC03 | An active member of business X participating in events A and B can access X's workspaces in both within their role; inactive members and business Y members cannot, and organiser access alone cannot read X's private records. | F10-US01; RD01; SEC01/02 | Two-event synthetic fixture and role matrix |
| access-authorised-workspaces-AC04 | Unauthenticated, inactive or forged-client-role requests are denied at the server boundary; no protected record or credential is returned and no domain state changes. | F10-US01; SEC01/02 | Direct API requests and before/after comparison |
| access-authorised-workspaces-AC05 | An organiser identity and event-scoped membership can be created only by an authorised super organiser; attendee/business registration, role selection and direct requests cannot grant organiser authority, and failed provisioning leaves membership unchanged. | F10-US01; SEC01/11 | Provisioning boundary and role-escalation attempts after provider selection |
| access-authorised-workspaces-AC06 | A membership revocation prevents subsequent reads, writes, AI job access and action execution for that scope, including access via previously selected UI context. | F10-US01; RD07; SEC01/07 | Revocation between requests and execution |
| access-authorised-workspaces-AC07 | Successful attendee self-registration creates an attendee identity without organiser or business authority; duplicate, invalid or failed registration creates no partial account or membership and returns a privacy-safe result. | F10-US01; SEC01/02/08 | Registration success/failure and account-enumeration checks after provider selection |
| access-authorised-workspaces-AC08 | Successful business-owner registration atomically creates a new business and the verified registrant's active initial-owner membership; the request cannot select an existing business or organiser authority, and failure leaves neither record. | F10-US01; RD01; SEC01/02/11 | Atomic creation, injected business/role and failure checks |
| access-authorised-workspaces-AC09 | An organiser's single-use temporary password expires, cannot be replayed, is never stored/logged as plaintext and must be replaced before organiser workspace access. | F10-US01; SEC01/02/08/11/12 | Expiry, replay, storage/log inspection and mandatory replacement after provider selection |

## External interfaces and dependencies

Produces `CurrentActor v1` per [architecture](../../docs/architecture.md#contracts-for-independent-development): verified user ID, server-resolved membership scope and consistent denial categories. All feature contracts consume it; client context selection is advisory. Identity-provider protocol, invitation API and privacy-safe absent/forbidden disclosure are pending contract decisions. Membership changes require migration and recovery evidence once persisted data exists.

## Decisions and approval

| Decision | Options / proposed direction | Owner | Blocks | Resolution |
| --- | --- | --- | --- | --- |
| A-01 | Initial organiser provisioning uses an authorised super organiser, username/email, explicit event membership and a single-use expiring temporary password requiring replacement; provider, delivery, exact expiry, recovery and later organiser invitations remain pending | Product/security human owner | Ready for implementation details | Partially resolved by requesting teammate 2026-10-18 (D02/D05) |
| A-02 | Attendee self-registration and atomic new-business/initial-owner registration accepted; additional business roles, invitations, ownership transfer and multiple roles remain pending | Product human owner | Ready for affected role matrix | Partially resolved by requesting teammate 2026-10-18 (D05) |
| A-03 | Guest published browsing and denied-vs-absent privacy semantics | Product/security human owner | Visibility contract | Pending |
| A-04 | Session expiry/revocation behavior and measurable limits | Security/contract human owner | Ready | Pending |

## Verification and evidence

Independent test scenarios/review, protected baseline, integration, deployed environment separation and human teammate review are pending. AC05 depends on the invitation decision; AC06 requires real revocation across jobs/actions. No acceptance criterion is verified. Record actual agents and checks in the later task/run record and [logs](../../logs/README.md).

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded Draft | Approval and verification pending |
| 2 / 2026-10-18 | Recorded bounded attendee/business self-registration and controlled organiser-provisioning decisions; linked the presentation-only prototype and added AC07–09 | Full revision/provider contracts, approval and verification remain pending |
