# Business application test baseline change request

- Request ID / requester / date: APP-TCR-02; `/root/test_readiness` (test_case_designer), following developer/root report; 2026-10-20 Asia/Singapore.
- Feature/run: F06-US01 / `submit-business-applications` exact revision 2, human-approved normative SHA-256 `D0DBEB87534574F9E0648CC45892F378204B079772A5459B90F0F95BB13B8258`; [run](2026-10-20-business-application-preparation.md).
- Old protected baseline: `62c18cdd8e5cc879a6ac8676b29cc05f0a24680a`; `backend/tests/test_business_applications.py`, test plan, APP-TCR-01 and all previously recorded protected paths. This request/new coverage must be included in the replacement path set. Preserve the old baseline and its evidence.

## Report, evidence and expected behavior

The developer/root reported that the implementation follows protected assertions expecting 403 for a valid active business owner selecting another business via `businessId`, while the exact approved r2 requires the target to remain unobservable with 404. Root reports the 119-test suite passed at the old baseline, demonstrating that a green suite can encode a mistaken expectation. That reported run is not a new execution by this test owner.

Read-only inspection confirmed the mismatch in `test_private_owner_and_organiser_read_write_boundaries` (foreign-business application list/create assertions) and `test_private_discovery_lists_and_submitted_contacts_recheck_current_authority` (foreign-owner discovery/list matrix). Existing application-ID 404 and global wrong-role/inactive-workspace 403 cases correctly distinguish the boundaries.

The approved contract explicitly says: "An actor with another active owner membership still gets 404 for a target business/application outside their active ownership". The preceding rule requires wrong product role or no current active owner membership to fail with 403 before target lookup. Its general 403 membership row does not override the explicit valid-workspace/foreign-target rule. Foreign and absent targets must have the same safe 404 problem, including `not_found`, `Resource not found.`, no private data and `Cache-Control: no-store`.

Relevant criteria: F06 r2 AC03/06/08, RD01, SEC01/02. No authorization is granted by returning 404; list/create requests still disclose no protected data and produce no application/participation mutation.

No reproduction was executed by this owner at investigation time: root owned the database for a separate real-HTTP smoke. Root subsequently reported actual HTTP returning 403 for a foreign business list instead of the approved 404, terminated its API process and transferred exclusive synthetic test-DB ownership to this designer. That root observation is reported evidence, separate from this owner's focused corrected-test run below.

## Classification and correction proposal

Cause: protected-test defect / specification misalignment, not a product-policy change or genuine unresolved ambiguity. The test owner accepts that the original 403 expectations were wrong. Independent review must investigate rather than simply follow the implementation.

After both independent assessments, correct only foreign-business selector expectations for actors with an otherwise valid current active business workspace to 404 `not_found`. Add explicit comparison against a fresh nonexistent business UUID for event discovery, application listing and creation. Add active-owned-A plus inactive-target-B selector coverage. Preserve the existing wrong-role/no-active-owner 403, foreign-application 404, Origin, private-payload, state-preservation and audit assertions.

Compare before/after all domain rows. Authenticated denial audits may be recorded only as already allowed by r2; no additional success audit or unauthorized business identifier may appear. Unknown/foreign selectors in query/body are not echoed by the fixed problem body; instance remains the requested path without query.

Alternatives rejected: changing the approved contract to 403 would require a product change and weaken its chosen non-enumeration boundary; changing application-ID cases or global workspace rejection would incorrectly broaden the repair; removing assertions/skipping tests would lose protection. Production fixes belong to the developer only after the corrected reviewed replacement baseline is frozen.

## Independent assessment and disposition

- Behaviour assessment: `/root/prerequisite_verification` independently approved the classification and scoped proposal before edit, confirming the specific approved r2 rule overrides the general 403 row. It acknowledged missing this conflict in the original review. No DB/tests were run by that reviewer. Saved patch/RED still require review.
- Security assessment: `/root/security_gate` independently approved the classification and scoped correction before edit, confirming the explicit target-business rule and need to retain workspace/Origin/privacy boundaries. It acknowledged missing the original conflicting assertions. No DB/tests were run by that reviewer. Saved correction/RED require final review.
- Test owner decision: after both assessments and root's explicit DB handoff, `/root/test_readiness` corrected only the three foreign-selector expectation locations and added parameterized foreign/absent/inactive-selector coverage. No production file changed. Original global401/403, foreign-application404, Origin, privacy and other acceptance assertions remain.
- Human product approval: no new product behavior proposed; restore the exact r2 already approved by Isaac. Root retains the original exact-approval evidence.
- Owner runtime reproduction: after root released the database, `uv run pytest tests/test_business_applications.py -k 'private_owner_and_organiser_read_write_boundaries or private_discovery_lists_and_submitted_contacts_recheck_current_authority or foreign_absent_business_selectors' -q` ran real auth/F06 setup successfully and failed all eight selected cases on current implementation returning 403 instead of the approved 404 (8 failed, 52 deselected, 11.10s). This is meaningful behavior RED, not import/fixture failure. The first foreign-selector assertion stops each new case; later absent-equivalence/workspace-loss/privacy assertions are not yet claimed executed.
- Full backend `uv run pytest --collect-only -q`: 125 tests collected in 0.38s (119 prior cases plus six new selector cases); no discovery/configuration change. No full-suite run was required against the intentionally unfixed implementation.
- Final saved-patch/adequacy assessment: `/root/prerequisite_verification` and `/root/security_gate` independently approved acceptance snapshot `C601165E52E7DDCB5F4C9830F177D9703378C2981A4926004E1458DD1F63A592`, this request and the plan. They confirmed exactly three expectation locations and six parameterized cases, retained global401/403, existing application-ID404, Origin/privacy/state/audit and reset/discovery protection. Neither reran tests or touched the database; owner RED and collection were reviewed as reported evidence. This final record update is metadata only; acceptance assertions are unchanged.
- Correction commit: root freezes the approved owner correction before developer repair; no production fix by this test owner. Designer DB operations are complete; synthetic test DB remains running for the authorized developer handoff.
- Replacement baseline: independently approved for root freeze, immutable commit pending in the run. Record final immutable SHA only in the non-protected run; do not rewrite protected plan/request after freeze. Retain APP-TCR-01 and original baseline history.

Until the correction and replacement baseline are reviewed, the developer preserves protected tests and does not adjust production code to a moving baseline.
