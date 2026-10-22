# F02 test change requests

## F02-TCR-01: delivered attendee entry replaces one future-action expectation

Requester/test owner: /root/f02_scenarios. Trigger: human approved F02 r2 and implementation; existing role-home test assumes My Itinerary remains disabled. This is a new approved capability expectation, not a discovered faulty assertion.

Proposed narrow change: attendee future-action count2->1; organiser remains1 and business remains2. Keep Event Assistant disabled. Add explicit My Itinerary enabled assertion. Preserve Browse Programme, every other role card isolation, auth/session tests and all organiser/business assertions. Proposed file is mirrored frontend/tests/acceptance/session-and-homes.test.tsx. No config/timeout/skip changes.

Independent reviewer: /root/f02_draft_review, decision pending. Baseline replacement only after approval. Parent installs reviewed candidate; developer may not edit it.

## F02-TCR-02: additive schema exact-head table whitelist

Current test_business_applications.assert_current_schema uses exact current-head table set. Additive approved F02 tables would correctly extend head and fail this legacy set. Historical schema assertion must remain exact and unchanged; all existing auth/application/programme tables, constraints and upgrade-preservation assertions remain.

Proposed correction: add only explicit reviewed F02 table names to current-head expected set, and verify F02 schema constraints/persistence in F02 acceptance evidence. Await developer architecture table-name proposal before producing narrow mirrored candidate. Never replace equality with subset, remove existing names or loosen constraint checks. Dylan AI additions require their own named whitelist coordination.

Independent reviewer: /root/f02_draft_review, pending. No correction written until exact additive names known; no production/schema assumption claimed.

## F02-TCR-02 concrete candidate

Architecture handoff /root/f02_contract named exactly four additive tables: attendee_planning_states, attendee_bookmarks, attendee_draft_items, attendee_accepted_versions. Mirrored backend/tests/test_business_applications.py adds precisely that constant and unions it only into current-head expected_domain_tables. Historical exact equality remains unchanged; all existing constraints/upgrade/auth checks retained. No subset relaxation. Independent approval still pending.

## Parent preimplementation observation

Parent reported first installed backend test crossed real bootstrap/auth/publication fixture and failed on GET /planning404 before implementation (1 failed,21.48s). This is meaningful missing-feature red, not a harness import failure. One earlier installation path mistake ran no tests and was corrected; it is not evidence. UI red pending parent result. Designer has not independently executed these commands.

## F02-TCR-03: UI06 scopes conflict feedback to the alert

Requester/test owner: /root/f02_scenarios. Parent reported the UI06 broad findByText(/changed|conflict|reload|stale/i) matched three legitimate rendered elements: safe conflict alert, Reload saved data button, and help text. Thus the test failed on ambiguous text selection despite correct feedback. This is a test-selection defect, not a product-policy change.

Proposed mirrored correction: await screen.findByRole('alert'), require it visible, and require the same changed|conflict|reload|stale text pattern inside that alert. Keep raw-server-detail absence, persisted fixture unchanged-state assertion, API setup, and all other assertions. No skip, timeout, runner, fixture, or implementation edits. A missing/invisible/wrong-text alert still fails.

Independent reviewer /root/f02_draft_review explicitly approved the exact scoped alert/visible/same-regex correction after inspecting the candidate and implementation labels, relying on parent-reported ambiguous DOM; no independent execution was claimed. Raw-detail and state assertions remain intact; no product behavior changed. Parent must record the replacement immutable baseline before verification. No repository baseline was edited by the designer.

## F02-TCR-04: distinguish conflict alert from legitimate draft-validation alert

Parent's replacement baseline cc1028b run showed TCR03 was insufficient: both the empty-itinerary validation warning and new conflict feedback legitimately have alert roles. Parent reported 28/29 focused cases passed in57.45s and the remaining UI06 failed on role ambiguity; the home-label production correction passed. Backend22/22 passed373.84s at that snapshot. These are parent-reported results, not independent designer execution.

Test-owner proposal: inside waitFor, collect all role=alert elements, filter by the unchanged changed|conflict|reload|stale text regex, require exactly one matching alert, require it visible and containing the same regex. Waiting for the semantic matching alert handles an earlier warning already present before asynchronous conflict feedback arrives. An unconditional findAllByRole alone would resolve on that earlier warning too soon. No CSS classes/internal state selectors are used.

Preserve the original raw-server-detail absence and fixture-state-unchanged assertions, all setup/responder data, other cases, and runner/timeouts. No product behavior change or weakened assertion: missing conflict, invisible conflict, wrong conflict text and duplicate conflict feedback all fail. Designer changed mirrored candidate only; protected repository baseline remains parent-owned. Independent reviewer /root/f02_draft_review approved the exact waitFor + semantic text-filter candidate after inspecting it. Approval relied on parent-reported ambiguous DOM and review of the exact patch; no independent execution claimed. Raw-detail and unchanged-state assertions remain. Parent owns the replacement baseline commit.
