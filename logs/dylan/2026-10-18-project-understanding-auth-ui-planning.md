# Project understanding and role-entry UI planning

- Date/timezone and session owner: 2026-10-18, Asia/Singapore; Dylan.
- Feature/task, branch and source revision: role-entry/dashboard prototype on `feat/role-entry-ui-prototype`, based on `148aa18` (initially developed under `docs/auth-ui-prototype-spec` before the local branch was renamed).
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

A separate `preview-role-entry-and-workspaces` revision 1 specification owns the presentation-only scope: three tabs, permitted registration routes, validation, minimal same-tab synthetic session, role home previews, sign-out and truthful prototype notices. Only `{role, displayName}` may enter `sessionStorage`; credentials, contact/business fields, tokens and complete form data are excluded. Dylan approved revision 1, and it progressed through Ready to In review after implementation evidence. The navigation Draft links this adapter without weakening its real authorised-workspace contract.

Project, architecture, security, catalogue and spec-index documentation were aligned with this split. The access and navigation Draft revisions remain pending human review of their exact text. A frontend-only application, executable acceptance suite and immutable test baseline were created; no identity provider, database model or deployment configuration was created.

## Verification and limitations

The initial test handoff covered tab/registration visibility, validation boundaries, synthetic-session shape, same-tab refresh, sign-out, malformed state, cross-role routes, role dashboard cards, prototype notices, keyboard operation and browser-storage inspection. It was subsequently implemented as the independently reviewed 37-case baseline recorded below.

Repository checks after the documentation changes used Python 3: the agent/link validator passed, all nine existing baseline-guard regression tests passed, and `git diff --check` passed. Host `xcrun` emitted temporary-cache warnings during Git operations, but the tests completed successfully. These checks validate the existing workflow tooling and local links/formatting, not the new frontend behaviour.

The planned sequence was completed: Dylan approved the exact bounded specification; a separate test designer created the executable baseline; independent reviewers approved its adequacy; the immutable SHA and protected paths were recorded; and only then did the developer receive application files. Same-snapshot behaviour/security reviews and their rechecks were also completed. Human teammate review and log verification remain pending.

Real credential verification, account uniqueness, server authorisation, organiser provisioning, audit persistence, database persistence, revocation, restart recovery, online delivery and development/production separation remain unimplemented and unverified. The prototype must not be presented as satisfying F10-US01 or SEC01.

## Implementation, verification and limitations

The test designer `/root/auth_test_design` created 37 acceptance cases and the frontend test harness. Independent behaviour and security reviewers approved the corrected test design, which was frozen at commit `3039cd4e2baec0b87a77e68c7d9f95f2390553e2` before `/root/auth_ui_developer` received production-file ownership. The developer added the React/Material UI application under `frontend/src/` plus `frontend/index.html` without editing protected paths.

On the final working-tree snapshot, all 37 tests pass, the production build and TypeScript checks pass, and the baseline guard confirms the protected tests/configuration match the approved commit. Security review approved the implementation. Behaviour review identified two accessibility gaps—route-change focus and immediate orientation to validation errors—which were corrected; both behaviour and security rechecks approved the result.

Real-browser inspection at 360/1280 CSS px, increased text, native history/fresh-context behaviour and runtime logs remains pending because no controllable browser surface was available. Vite reports a non-blocking bundle-size advisory. The prototype remains In review pending that manual evidence and teammate review; it does not implement real authentication or authorisation.

## Reflection and next steps

Separating presentation from real access avoids turning a convincing mock login into a false security claim. The session-storage adjustment preserves the existing refresh-orientation criterion while retaining no credential data. The next step is real-browser/manual inspection and human teammate review of the implementation and log; real access work should remain under its separate Draft contract.

After the corrections and independent rechecks, Dylan asked to pull up the plan again and implement it if consistent. The orchestrator treated this as approval of exact revision 1, marked only the bounded prototype specification Ready, completed the protected-test sequence and moved the implemented prototype to In review. The real access and cross-workspace navigation specifications remain Draft.

## Revision 2 visual and appearance update

Dylan explicitly approved a follow-up bounded change on 2026-10-18: typography should be approximately 150% across the interface with responsive headings; an accessible light/dark control should appear on entry and workspace screens; a first visit should follow the operating-system preference; and an explicit choice should persist only `light` or `dark` in one dedicated local-storage key. Invalid stored values must fall back safely, and both palettes must remain coherent and readable. Registration and synthetic-session behaviour otherwise remain unchanged.

The specification analyst revised `preview-role-entry-and-workspaces` to revision 2 Ready. The dedicated key is `eventapp.colorMode`; it contains exactly `light` or `dark`, while all identity, session, credential, token and form data remain forbidden from local storage. Missing or invalid preference state follows the operating-system preference, and invalid values are removed. Appearance changes cannot create, replace or clear the synthetic session.

This approved specification change reopens affected evidence. Revision-1 tests, baseline, implementation and reviews remain historical, but they do not verify the revised AC07/09 or new AC11/12. Independent revision-2 test design and behaviour/security adequacy review, a replacement immutable baseline, implementation, automated checks, real-browser typography/palette inspection and same-snapshot reviews are pending. No test or application file was changed during this specification update.

The revision-2 test designer then added 31 appearance and typography cases while preserving all 37 revision-1 regressions. Behaviour and security reviewers required stronger representative 24px/1.5x typography assertions, actual cross-render palette evidence, complete form and active-session preservation, invalid-preference handling, and read/write/remove storage-failure cases. After correction, both reviewers approved the replacement baseline, frozen at `64cfa0f16935f237d450494e18572980ac45d816`.

Developer `/root/auth_ui_developer` implemented the central appearance provider and coherent palettes under `frontend/src/` without editing protected paths. On the final snapshot, all 68 tests pass, the production build and TypeScript checks pass, and the baseline guard passes. Same-snapshot behaviour and security reviewers approved with no actionable findings. A real-browser review was attempted, but the available Safari surface was not approved; light/dark visual coherence, measured contrast, visible focus, increased text and 360/1280 reflow remain for Dylan/team review. Revision 2 is therefore In review rather than Verified.
