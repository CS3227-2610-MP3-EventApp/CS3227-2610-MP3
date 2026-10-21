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
