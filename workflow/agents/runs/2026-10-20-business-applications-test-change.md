# Business application test baseline change request

- Request ID / requester / date: APP-TCR-01; `/root/test_readiness` (test_case_designer); 2026-10-20 Asia/Singapore.
- Feature/run: F06-US01 / `submit-business-applications` exact revision 2 approved by Isaac and marked Ready by root; [task preparation](2026-10-20-business-application-preparation.md).
- Old baseline: `d60152a1b7ad78c90b5a7b26499eb1cb6b63e151`; protected `backend/tests/test_migrations.py` within `backend/tests/`. Existing auth baseline and evidence remain historical and unchanged until this correction is independently assessed.

## Evidence and classification

The protected `test_empty_database_upgrade_creates_authentication_tables` resets only the explicitly guarded synthetic test schema, runs `alembic upgrade head`, and requires exactly `alembic_version`, `users`, `password_credentials`, `sessions`, `businesses`, `business_memberships`, `events`, `event_memberships`, and `audit_events`.

At inspection, the latest migration is `20261019_0002`; the test is not reported as failing today. Approved F06 persistent approvals, participation and applications require additive migration history, so a future full-head upgrade must contain additional domain tables. Keeping both the dynamic `head` target and the auth-only exact set would reject that approved capability. This is anticipated approved requirement evolution / historical test scope correction, not evidence of a faulty implementation or a reproduced runtime failure. No missing F06 migration, database failure or import error is presented as meaningful RED here.

Relevant contracts: access revision 3 AC17 preserves additive migration history and identity data; F06 r2 AC01/02/08 requires durable owned drafts, frozen submissions and preserving additive migrations. Root recorded actual exact-r2 approval and Ready before the new executable acceptance file was written.

## Proposed correction

After independent assessment, change only this historical test's upgrade target from `head` to `20261019_0002`. Preserve its guarded empty-schema reset, exact nine-table assertion, subprocess result checks, environment targeting, and all reset-guard rejection cases. No discovery, runner, fixture, dependency or configuration changes are proposed.

In new test-owner-owned `backend/tests/test_business_applications.py`, add full-head migration assertions for the approved F06 schema and an upgrade from authentication revision with fresh synthetic identity/business/session data. Assert original records survive the upgrade and the new public API persists the approved application lifecycle. The new full-head check prevents the pin from removing coverage of current migration history.

Alternatives rejected: allowing arbitrary table supersets would weaken schema assertions; deleting/skipping the historical test would lose auth migration evidence; developer-owned test edits would violate baseline ownership. Running auth-only and full-head checks separately preserves their distinct revision-specific promises.

## Assessment and disposition

- Independent behaviour assessment: `/root/prerequisite_verification` approved the scoped correction before edit, conditional on new fresh-head exact-schema and auth-to-head preservation coverage; all old guards/assertions/discovery remain unchanged. This assessment is prospective requirement evolution, not reproduced RED.
- Independent security assessment: `/root/security_gate` approved the same scoped plan before edit, conditional on exact auth/head assertions, preservation of synthetic identity/credential/membership/session/audit data and all reset-target/opt-in safeguards. Final saved correction and new test adequacy still require review.
- Test owner decision: `/root/test_readiness` applied only the approved `head` to `20261019_0002` historical target correction after both assessments; no other old test assertion, fixture or configuration changed.
- Human product authority: root relayed actual approval of bounded F06 defaults, organiser approval before application access, and development-only backend-first work. This correction changes test scope to accommodate that capability; it does not authorize open event access or change approved authentication behavior. Exact approval evidence remains in the task/run record.
- Correction commit: root records the immutable replacement commit in the run after freeze. The saved protected diff is exactly one upgrade-target token; `/root/prerequisite_verification` independently confirmed that scope. Focused `tests/test_migrations.py -q` passed 2/2 on the guarded synthetic PostgreSQL target with the existing Windows `PYTHONPATH` dependency workaround. Initial runs had one passing migration test and one unchanged child-Python dependency harness failure, not product RED; no assertions were weakened to resolve it.
- New head/upgrade checks are saved in the new acceptance file. Both reached exact-schema assertions in a real guarded PostgreSQL run and failed for the three absent F06 tables (2 failed in 7.45s); the auth-to-head fixture itself succeeded after the pre-freeze timestamp correction. This is missing-migration RED; later preservation assertions remain unexecuted until implementation supplies the schema.
- Final saved-case adequacy assessment: `/root/prerequisite_verification` and `/root/security_gate` independently approved the final new acceptance assertions, test plan and this request after all reported findings were corrected. Their review was static and considered owner-reported RED/collection; neither reran tests or touched the database. Both confirmed the historical correction remains scoped and guards/discovery unchanged. Reviewer recording is metadata only.
- Replacement baseline: approved for root's freeze, immutable commit pending in the run record. Retain old baseline/evidence; include prior protected paths plus the new acceptance file, test plan, this request and the reviewed correction. Final immutable SHA is recorded only in the non-protected run record after commit.

The scoped correction has been assessed and applied by its test owner; final new-test adequacy is approved by both independent reviewers. Root must record the immutable baseline before developer assignment. This request alone does not authorize application implementation or claim passing product behavior.
