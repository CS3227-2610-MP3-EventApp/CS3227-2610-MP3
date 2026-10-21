# F02 attendee planning preparation

- Date/timezone: 2026-10-21, Asia/Singapore. Session owner: Yik Bing.
- Repository: EventApp; branch `feat/yikbing-attendee-planning`, base `148b381b106df12ba2ddd94359f4834e4e8f8537`.
- Source coverage: this visible conversation, actual tool output and agent handoffs. AI factual check: checked against this evidence. Human verification: Pending.

## Prompts and interactions

The user requested pulling master and identifying the next capability. The chat workspace was a project mirror rather than a Git checkout; the actual repository was found at `C:/Users/yikbi/NUS/CS3227/MP3`. The clean programme-browsing branch fast-forwarded to master at 148b381 (merged PR9). The roadmap identifies F02 preferences/manual itineraries as the next attendee slice. The user asked whether concurrent work with Dylan's AI integration would conflict. Refreshed organiser AI branch ac45c69 showed separate organiser AI functionality plus shared registration, migration, navigation and generated-schema changes. Zero-conflict delivery was not promised. A separate planning branch was created. The user paused preparation to pull master again; it was already current, and both running preparation agents were interrupted.

The user then requested clarification recommendations and approved: SGD integer-cent optional hard budget, optional free-text soft interests, once-per-activity costs, overlaps blocking acceptance with adjacent activities allowed and configurable minimum gap defaulting to zero, no travel estimation or recurring breaks, private accessibility notes and explicit per-item attendee suitability confirmation with unknown facts still labelled unknown, one editable draft per attendee/event, accepted-version history, and retention until owner deletion. These are human-approved policy decisions; approval of an assembled exact specification revision and API contract is not inferred.

## Actual handoffs and bounded ownership

- `/root/f02_contract`: specification analyst via generic agent fallback; selected F02 Draft and handoff proposal only, written first in the chat workspace. Inherited model used for shared-contract ambiguity. No application/test writes or nested agents.
- `/root/f02_scenarios`: independent test designer; AC01–07 scenario analysis, boundary/failure/state-preservation checks and actual conflict hotspots. Documentation only; no executable tests or baseline claimed.
- `/root/f02_draft_review`: independent combined behaviour/security draft reviewer; read role definitions and reviewed the candidate, accepted RD/SEC rules and scenarios. No reviewed specification or implementation edits.
- Parent: orchestration, preservation of scope, repository integration of reviewed documentation and factual session summary.

## Decisions and boundaries

Attendee planning owns private preferences/bookmarks/itinerary storage and validation. Dylan's provider, organiser jobs and analysis module remain outside this task. Shared route registration, model registration, workspace navigation, OpenAPI regeneration and migration graph need explicit integration. Dylan's proposed AI migration is 20261021_0005 after 20261021_0004; no conflicting migration is created here. Real published-item cancellation is not available in the current programme producer; F05 cancellation integration remains deferred rather than fabricated.

## Verification and limitations

No application code, protected tests, test infrastructure, schema migrations, provider integration or deployment changed during preparation. No implementation tests executed and no baseline frozen. No push, PR or master merge. Draft review and document checks are recorded below when complete. Role discovery was not claimed; actual generic agent handoffs were used. Policy approval, exact revision approval, test-baseline review, implementation verification and human teammate/log review are distinct.

## Draft review outcome

The independent reviewer reported no critical behaviour/security findings in the final revision-2 proposal. Resolved items: monotonic content-free revision token after delete/recreate, read-only duplicate acceptance with no backward current-pointer movement, atomic owner-scoped deletion, confirmations bound to current preference/item revisions and no accessibility certification claim. Parent clarified AC01 that the break control is only the approved minimum gap. The test designer found no critical policy mismatch and identified the same retry/wording concerns. All actual review was documentation only. The final contract conservatively invalidates accessibility acknowledgements after every effective preference revision change; empty-plan acceptance rejection and technical input bounds are concrete proposals for exact revision review, not separately fabricated user approvals. Exact revision/API approval and executable test baseline remain pending.

Repository edits are limited to the F02 Draft revision 2, its existing index row and this log. Scenario and handoff working notes remain in the chat workspace. No application implementation is claimed. The repository specification standard requires recorded human approval of the exact revision; the draft-spec skill ends at Draft. Parent requests approval of the assembled revision after making it concrete and independently reviewed.

Document checks: initial diff check found one extra blank line at the spec EOF; parent removed it. Final scoped diff and local-link checks follow. No implementation tests were run for this documentation-only change.

## Exact contract approval and continuation
The user explicitly replied 'Approve F02 revision 2 and proceed' to the question linking the assembled spec and summarising empty rejection, renewed confirmations and full event-planning deletion. Parent recorded Ready outside the draft-spec skill, preserving revision 2 because only approval/evidence metadata changed. Independent executable baseline design is now active; application implementation still waits for reviewed baseline. The user also reconfirmed the separate feature branch.
