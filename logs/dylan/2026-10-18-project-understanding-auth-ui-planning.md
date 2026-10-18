# Project understanding and role-entry UI planning

- Date/timezone and session owner: 2026-10-18, Asia/Singapore; Dylan.
- Feature/task, branch and source revision: role-entry/dashboard prototype documentation on `docs/auth-ui-prototype-spec`, based on `148aa18`.
- Source coverage: visible conversation, repository files, Git history and actual agent messages in this session. Earlier chats are summarised only where visible in the current conversation; unavailable external chats are not reconstructed.
- AI factual check: checked against the visible requests, current repository and specialist handoffs described below.
- Human verification: Pending for the complete session summary. Dylan approved the exact `preview-role-entry-and-workspaces` revision 1 requirements for implementation on 2026-10-18 after requesting the final plan recheck; this is product/spec approval, not verification of the full AI-generated log.

## Prompts and interactions

Dylan asked the coordinating assistant to read the current repository and understand the whole project before adding a base UI. Dylan specified three login tabs for attendee, organiser and business roles. Attendee and business users may create their own accounts; business registration represents a new business and its initial owner. Organisers cannot self-register. An authorised super organiser will create an organiser username/email and issue a temporary password; the organiser must replace it on first real sign-in. For the initial frontend prototype, super-organiser and organiser identities may be seeded and no super-organiser UI is required.

Dylan selected a frontend-only prototype rather than real authentication, direct implementation rather than Google Stitch, Material UI, a navy/teal professional visual direction and dashboard-preview home pages. The assistant proposed an in-chat plan, then reviewed it against the canonical specifications and found that memory-only sessions conflicted with refresh orientation and that the real access specification could not be made Ready by a mock frontend.

Dylan authorised fixing those findings before implementation. The orchestrator created this documentation branch and invoked three actual specialist agents. `auth_spec_analysis` inspected the specification boundary and authoritative sources; `auth_test_design` produced provisional AC-oriented scenarios and baseline recommendations; `auth_security_review` checked misleading-authentication, browser storage, provisioning and privacy boundaries. All were read-only reviewers and did not edit repository files.

The analyst and security reviewer incorrectly reported that temporary-password behaviour had not been selected. The visible conversation records Dylan choosing the temporary-password option, so the orchestrator retained that decision and added the required single-use, expiry, verifier-only storage, no-logging and mandatory-replacement constraints. Provider, delivery, precise expiry and recovery remain unresolved.

During independent rechecks, the security reviewer identified an ambiguous synthetic display-name source; the test designer identified unspecified login fields, routes and malformed-session rules; and the behaviour verifier identified a missing roadmap row and ambiguous redirect/session lifecycle. The orchestrator corrected each issue and requested focused rechecks. Security, test-design and behaviour rechecks found no remaining documentation or baseline-design blocker. The behaviour review was performed after the earlier analyst consistency review and did not edit the Draft.

## Decisions and actions

The real `access-authorised-workspaces` capability remains Draft and cannot be verified by frontend presentation. Revision 2 records the narrow future production direction for attendee registration, atomic new-business/initial-owner registration, and controlled event-scoped organiser provisioning. It does not claim that `CurrentActor v1`, a provider or server enforcement exists.

A separate `preview-role-entry-and-workspaces` revision 1 Draft now owns the presentation-only scope: three tabs, permitted registration routes, validation, minimal same-tab synthetic session, role home previews, sign-out and truthful prototype notices. Only `{role, displayName}` may enter `sessionStorage`; credentials, contact/business fields, tokens and complete form data are excluded. The navigation Draft links this adapter without weakening its real authorised-workspace contract.

Project, architecture, security, catalogue and spec-index documentation were aligned with this split. The access and navigation Draft revisions remain pending human review of their exact text. No application code, executable frontend tests, protected baseline, identity provider, database model or deployment configuration was created.

## Verification and limitations

The provisional test handoff covers tab/registration visibility, validation boundaries, synthetic-session shape, same-tab refresh, sign-out, malformed state, cross-role routes, role dashboard cards, prototype notices, keyboard operation and browser-storage inspection. No executable test has been written or run and no protected baseline exists.

Repository checks after the documentation changes used Python 3: the agent/link validator passed, all nine existing baseline-guard regression tests passed, and `git diff --check` passed. Host `xcrun` emitted temporary-cache warnings during Git operations, but the tests completed successfully. These checks validate the existing workflow tooling and local links/formatting, not the new frontend behaviour.

Before implementation, Dylan must approve the exact bounded prototype specification. A test designer must then create the executable acceptance/component tests; independent behaviour and security reviewers must approve adequacy; and the reviewed test plan, tests, fixtures and runner/discovery configuration must be committed as an immutable protected baseline with its full SHA and paths. Only then may a developer receive application files, without ownership of protected tests. Same-snapshot behaviour/security review, criterion evidence, human teammate review and log verification remain later gates.

Real credential verification, account uniqueness, server authorisation, organiser provisioning, audit persistence, database persistence, revocation, restart recovery, online delivery and development/production separation remain unimplemented and unverified. The prototype must not be presented as satisfying F10-US01 or SEC01.

## Reflection and next steps

Separating presentation from real access avoids turning a convincing mock login into a false security claim. The session-storage adjustment preserves the existing refresh-orientation criterion while retaining no credential data. The next step is human review of the exact Draft revisions, followed by independent executable test design and baseline creation; implementation must not begin before those gates.

After the corrections and independent rechecks, Dylan asked to pull up the plan again and implement it if consistent. The orchestrator treated this as approval of exact revision 1, marked only the bounded prototype specification Ready, and began the required protected-test sequence. The real access and cross-workspace navigation specifications remain Draft.
