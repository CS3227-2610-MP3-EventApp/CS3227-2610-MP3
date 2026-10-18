# Preview role entry and workspaces

| Field | Value |
| --- | --- |
| Stable capability ID | preview-role-entry-and-workspaces |
| Covered stories | Presentation preview for [F10-US01](../../docs/UserStoriesAndFeatures.md); does not implement its identity or authorisation contract |
| Specification revision / status | 2 / Ready |
| Product roles / roadmap | Attendee, organiser and business participant; [shared UI foundation](../../docs/project.md#phase-priority-roadmap) |
| Product and contract approval | Revision 2 explicitly approved by requesting teammate Dylan on 2026-10-18 |
| Review / run record | [Multi-agent run and revision-2 planning](../../workflow/agents/runs/2026-10-18-preview-role-entry.md); [Dylan session log](../../logs/dylan/2026-10-18-project-understanding-auth-ui-planning.md) |

Sources: [specification standard](../README.md), [catalogue](../../docs/UserStoriesAndFeatures.md), [project context](../../docs/project.md), [security rules](../../docs/security.md), [architecture](../../docs/architecture.md), [workspace access Draft](access-authorised-workspaces.md) and [shared navigation Draft](navigate-eventapp-workspaces.md).

## Product outcome, users and scope

This capability provides a frontend-only preview of role entry and the first home page for EventApp's attendee, organiser and business workspaces. It lets the team review the three-tab login experience, attendee/business registration forms, role-specific orientation and dashboard hierarchy before real identity infrastructure exists.

Included: a login page with Attendee, Organiser and Business tabs; attendee and initial-business-owner registration forms; a minimal synthetic same-tab session; role-matching presentation guards; sign-out; and three dashboard previews. Excluded: authenticated identity, server authorisation, persisted accounts, credential verification, organiser provisioning UI, database storage, email delivery, password recovery, `CurrentActor v1`, domain operations and production deployment.

The prototype is not evidence for [workspace access](access-authorised-workspaces.md), F10-US01, SEC01 enforcement or production authentication. Its browser state is user-controlled and must never protect private data or a real operation.

## Use cases and user interface

The login page at `/login` initially selects Attendee and presents exactly three role tabs. Attendee and Business expose Create account actions leading to `/register/attendee` and `/register/business`; Organiser explains that accounts are provisioned by an authorised administrator and exposes no self-registration path. `/register/organiser` and unknown routes return to `/login` without creating state. All entry and home views conspicuously state that this is a UI prototype, credentials are not authenticated and no persistent account is created.

Attendee registration collects display name, username, email, password and password confirmation. Business registration adds business name and previews the future creation of a new business with the registrant as its initial owner. Successful shape-valid login or registration creates only a synthetic presentation session and opens the matching home page.

The attendee home previews Browse Programme, My Itinerary and Event Assistant. The organiser home previews Programme Management, Application Reviews and AI Application Analysis. The business home previews Applications, Preparation & Budget and AI Preparation Draft. Unimplemented actions say `Coming later` and do not navigate to nonexistent features or claim success.

Entry and workspace screens expose a keyboard-operable, labelled light/dark appearance control. On a first visit, or when no valid saved choice exists, appearance follows the operating-system colour-scheme preference. An explicit user choice applies immediately and persists only the value `light` or `dark` in the dedicated `eventapp.colorMode` local-storage key. An absent or invalid value falls back to the current operating-system preference without affecting entry, session or registration state.

## Inputs, outputs and functional contract

Every login tab requires a non-empty username-or-email field and a non-empty password field; no credential correctness or account existence is checked. Registration validation requires every listed field, a syntactically valid email, username length of at least 3 characters, password length of at least 8 characters and matching password confirmation. These checks demonstrate form behaviour only and are not the final credential policy.

The synthetic session is shaped as `{ role: "attendee" | "organiser" | "business", displayName: string }` in `sessionStorage`. `role` must be one of those exact values and `displayName` must be a trimmed, non-empty string. Invalid JSON, non-object values, missing/wrong-type fields, unknown roles and blank display names are rejected and cleared; additional fields are ignored and cannot convey authority. Prototype login uses the fixed role-specific name `Attendee Preview`, `Organiser Preview` or `Business Preview`; it never copies the username/email or password input into the session. Registration may use the separately entered display name, but never the username, email, business name, password or confirmation. Passwords, contact/business fields, tokens and complete form payloads are never persisted. Same-tab refresh, history and direct navigation preserve role orientation; sign-out clears the entry; a fresh browser context has no promised restored session. History cannot restore state after sign-out.

The only application-created `localStorage` entry is `eventapp.colorMode`, whose complete value is exactly `light` or `dark`. On initialisation, either value overrides the operating-system preference. A missing value follows the operating-system preference; any other value is ignored and removed, then the operating-system preference is used. Appearance state never contains or controls identity, role, display name, form input, token or authorisation data. Changing appearance does not create, replace or clear the synthetic session.

Presentation guards compare `/attendee`, `/organiser` and `/business` with the synthetic role. Missing or mismatched state returns to login without rendering the other home. A valid synthetic session remains until explicit sign-out or replacement by a successful prototype login/registration; route redirects do not clear it. Malformed state is cleared. `/login` and the two supported registration routes remain directly viewable even while a valid synthetic session exists. These guards are not authorisation: real access depends on a server-verified identity and server-resolved `CurrentActor v1` under the separate access capability.

## Constraints, security and non-functional requirements

[SEC01, SEC02, SEC08 and SEC12](../../docs/security.md) define the relevant future boundary. The prototype contains only synthetic data, no secrets or real personal information. Seeded identities are development fixtures only; production must contain no default/shared account or fixture credential. A role tab, route or edited browser value grants no real authority.

Tabs, forms, validation feedback, navigation, appearance control and sign-out are keyboard operable with visible focus, programmatically associated labels/errors and no colour-only status. Body, form, navigation, control and card text use an approximately 150% typography scale across the interface; headings scale responsively while retaining hierarchy and avoiding clipping or overlap. Both light and dark modes use coherent, readable palettes with distinguishable surfaces, text, focus, validation and status states. The light palette retains the navy/teal direction and warm off-white surfaces; the dark palette provides a corresponding dark surface treatment rather than merely inverting colours. Layout and typography reflow at the prototype's 360 CSS px narrow viewport and 1280 CSS px desktop viewport. No WCAG conformance or measured contrast result is claimed until the revised test matrix is executed.

## Acceptance criteria and story traceability

| ID | Observable criterion | Story / rules | Verification scenario |
| --- | --- | --- | --- |
| preview-role-entry-and-workspaces-AC01 | `/login` shows exactly Attendee, Organiser and Business tabs, with Attendee initially selected and the selected tab perceivable by keyboard and assistive technology. | F10-US01 presentation; navigation AC03/04 | Initial render and keyboard tab switching |
| preview-role-entry-and-workspaces-AC02 | Attendee and Business expose their registration routes; Organiser has no registration action or supported registration route and explains controlled provisioning. | F10-US01; SEC01 | Link/route inventory including direct organiser-registration attempt |
| preview-role-entry-and-workspaces-AC03 | Each registration form validates its defined fields and boundaries with accessible, field-associated feedback while retaining unrelated valid input. | UI presentation | Empty, malformed and boundary-value submissions |
| preview-role-entry-and-workspaces-AC04 | A shape-valid prototype login or attendee/business registration opens only the matching role home and clearly states that no credential was authenticated or account persisted. | F10-US01 presentation; SEC01/02 | All role entry flows and visible notice |
| preview-role-entry-and-workspaces-AC05 | Missing or mismatched synthetic state cannot display another role's home and returns to login without clearing otherwise valid state; malformed state is cleared. This response makes no server-authorisation claim. | SEC01 presentation boundary | Direct and cross-role route attempts plus state inspection |
| preview-role-entry-and-workspaces-AC06 | Same-tab refresh, history and direct navigation preserve role orientation using only valid `{role, displayName}` session state; sign-out clears it, history cannot restore it after sign-out and a fresh browser context has no promised restored session. | navigation AC01; SEC08 | Reload, history, fresh-context and sign-out checks |
| preview-role-entry-and-workspaces-AC07 | Prototype login stores only its fixed role-specific preview name in the synthetic session; registration may store only the entered display name there. The only application-created `localStorage` entry is `eventapp.colorMode` with exact value `light` or `dark`. Username/email, business name, passwords, confirmation, tokens, role/session data and complete registration data never enter `localStorage`, logs or visible diagnostics. | SEC02/08/12 | Distinctive synthetic values and complete application storage/log inspection |
| preview-role-entry-and-workspaces-AC08 | Each role home shows only its three agreed preview cards; unfinished actions visibly say `Coming later` and cause no phantom navigation or success state. | Shared UI direction | Role-by-role card/action assertions |
| preview-role-entry-and-workspaces-AC09 | Login, registration, errors, role homes, appearance control and sign-out remain readable and keyboard operable with visible focus at narrow and desktop layouts. Interface typography is approximately 150% of the prior/default scale, with responsive headings and no clipped, overlapping or lost task content. | navigation AC03/04 | Keyboard, focus, 360/1280-width, representative computed typography and increased-text checks |
| preview-role-entry-and-workspaces-AC10 | Unknown routes, malformed synthetic state and unsupported registration destinations return safely to login without creating state or claiming a completed operation. | SEC01/02 | Unknown-path and malformed-storage checks |
| preview-role-entry-and-workspaces-AC11 | On first visit or with no valid saved appearance, the UI follows the operating-system light/dark preference. A labelled keyboard-operable control is available on every entry and role-home screen; choosing a mode applies it immediately and persists exactly that choice across reload and navigation without changing session or form state. | navigation AC03/04; SEC08 | Mock both OS preferences, toggle from entry/home screens, reload/navigate and inspect state preservation |
| preview-role-entry-and-workspaces-AC12 | A saved `light` or `dark` value overrides the operating-system preference. Any other `eventapp.colorMode` value is removed and safely falls back to the operating-system preference without breaking rendering, creating authority or exposing data; both palettes preserve readable hierarchy and distinguishable interactive/status states. | navigation AC03/04; SEC02/08 | Valid/invalid saved values, conflicting OS preference, palette/readability and storage inspection |

## External interfaces and dependencies

The prototype uses a local synthetic-session adapter, not `CurrentActor v1`. Its role names align with the future access contract so it can later be replaced by a server-authorised actor without changing visible workspace names. Material UI and React Router are implementation choices approved for this prototype, not cross-project domain contracts.

The [workspace access Draft](access-authorised-workspaces.md) remains authoritative for real registration, identity, membership and authorisation. The [navigation Draft](navigate-eventapp-workspaces.md) remains authoritative for cross-workspace presentation. No database migration or backend API is part of this capability.

## Decisions and approval

| Decision | Approved direction | Decision owner | Status |
| --- | --- | --- | --- |
| PRE-01 | Frontend-only React/TypeScript prototype using Material UI and direct code rather than external mock-ups | Requesting teammate (Dylan), 2026-10-18 | Approved in revision 1 and implemented |
| PRE-02 | Three login tabs; only Attendee and Business self-register; Business registration previews a new business plus initial owner | Requesting teammate (Dylan), 2026-10-18 | Approved direction; production enforcement remains in access Draft |
| PRE-03 | Synthetic session persists only role/display name in `sessionStorage`; no credential or registration payload is stored | Requesting teammate (Dylan), 2026-10-18 | Approved direction; unchanged in revision 2 |
| PRE-04 | Navy/teal Material UI theme and dashboard-preview home pages | Requesting teammate (Dylan), 2026-10-18 | Approved direction; extended by PRE-05/06 |
| PRE-05 | Approximately 150% interface typography with responsive headings and readable narrow/desktop reflow | Requesting teammate (Dylan), 2026-10-18 | Explicitly approved for revision 2 |
| PRE-06 | Accessible light/dark control on entry and workspace screens; OS preference is the default, and an explicit `light`/`dark` choice is the sole value in dedicated `eventapp.colorMode` local storage | Requesting teammate (Dylan), 2026-10-18 | Explicitly approved for revision 2 |

Revision 1 became Ready following recorded human approval. Its executable tests, independent adequacy reviews and immutable protected baseline were then completed before the developer received application-file ownership. Revision 2 is Ready following explicit human approval of PRE-05/06, but its changed AC07/09 and new AC11/12 reopen test design, adequacy review and protected-baseline gates before revision-2 implementation may begin.

## Verification and evidence

Revision-1 evidence is retained for history: the independently reviewed acceptance baseline is commit `3039cd4e2baec0b87a77e68c7d9f95f2390553e2`; its exact protected paths and integrity command are recorded in the linked run record. Before revision-1 implementation, all 37 cases failed for absent observable behaviour. On its final working-tree snapshot, all 37 passed, the production build and TypeScript checks passed, and the baseline guard reported no protected-path difference.

The revision-1 implementation was inspected independently by `/root/auth_behaviour_review` and `/root/auth_security_review`. Behaviour review found route-change focus and validation-announcement gaps; the implementation was corrected and the reviewer approved the recheck. Security review found no actionable issue and approved the focus-only correction. That evidence does not verify revision 2: the revised AC07/09 and new AC11/12 require updated independent test design, behaviour/security adequacy review, a replacement protected baseline, implementation and same-snapshot verification. Real-browser 360/1280 reflow, increased-text, both colour modes, visible focus and palette readability remain pending.

Real credential rejection, server role enforcement, account uniqueness, organiser provisioning, audit persistence, database persistence, restart recovery and production isolation remain deferred to the access capability and cannot be marked passing here. Human teammate review and human correctness verification of the session log remain required before completion.

## Revision history

| Revision / date | Change | Approval / evidence impact |
| --- | --- | --- |
| 1 / 2026-10-18 | Initial bounded presentation-only contract resolving the reviewed UI-plan boundary and refresh issues | Approved and marked Ready on 2026-10-18; protected tests and implementation evidence pending |
| 1 evidence update / 2026-10-18 | Frontend implementation and same-snapshot independent reviews completed | Marked In review; 37 acceptance cases, build, TypeScript, baseline integrity and reviewer rechecks pass; real-browser and human review remain pending |
| 2 / 2026-10-18 | Added approved approximately 150% typography, responsive headings, accessible light/dark control, OS-default behaviour and dedicated validated appearance preference; revised AC07/09 and added AC11–12 | Revision 2 marked Ready by explicit human approval; revision-1 evidence retained but affected test, baseline, implementation and verification gates reopened |
