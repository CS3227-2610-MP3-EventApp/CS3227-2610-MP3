# F06 phase4: business job foundation

Owner:Isaac; date/timezone:2026-10-22 Asia/Singapore. Prior phase delivery:`771ff042cba2c836ce822ae59df6fcfddba4d8ba`. Human verification:Pending.

## Approved scope and coordination

Isaac approved business AI provider/data/limits defaults3/4/6, with30dispatches/minute and production disabled. Only the business extension of [shared jobs r3](../../../specs/shared/monitor-and-recover-ai-tasks.md) is authorised; existing organiser exact-written review and attendee scope remain unchanged. Phase4 delivers durable workflow discrimination, current-owner GET/cancel, shared attempt accounting, worker isolation and lifecycle maintenance. Phase5 supplies business creation/dedup/quotas, validated drafts/provider work/adoption and UI. No infrastructure-only LLM completion claim.

Read-only analyst `/root/business_jobs_analysis` recommended extending existing ai_jobs, not a second queue, preserving organiser API/data and common gate. Coordinated physical design: migration0008 after0007; workflow enum analysis/preparation defaults existing rows to analysis; nullable organiser-only application/source/rubric fields; nullable business participation FK; checks require corresponding workflow fields. Preserve owner/request uniqueness and AIProviderAttempt references. No new table is needed in this slice. Analysis worker cannot claim preparation rows. Source snapshot/draft storage belongs to Phase5. Existing owner-protected business event summary already provides event revision/dates/timezone; no extra context endpoint.

## Actual assignments and gates

Root owns run/spec evidence/architecture/logs/integration. Designer `/root/preparation_scenarios` owns new backend/tests/test_business_jobs.py and the scenario plan; no application edits. Phase3 final guarded delivery precedes these protected-file writes. Existing tests/configuration remain unchanged unless a separate reviewed TCR authorises a test-owner correction. No production developer handoff until independent test adequacy review and immutable baseline SHA/path set.

Test creation dependencies: trusted synthetic business-job fixture uses actual own participation, no fake submission. Missing workflow columns during preimplementation setup are not meaningful endpoint RED; business-role unknown-job dispatch can expose the current organiser-only403 versus required404 without the future schema. Review observable assertions and classify failures honestly.

Initial designer baseline21 cases frozen: meaningful public GET/cancel403vs404 RED, plus future business_participation_id missing-column fixture failure explicitly not endpoint evidence. No old tests/production changed. Both independent reviewers requested target-business revocation while the owner retains another active business membership; behaviour also requested concurrent cancel with one audit/no domain changes. Designer owns additions. Actual auth schema enforces membership_role='owner' only; role downgrade is legitimately N/A until supported roles exist, never implemented by weakening that constraint. Root accepted proposed physical column name business_participation_id for the shared job FK.

## Verification plan and limits

Isolated5433 test DB only for resetting suites; never overlap. Backend venv Python `-m pytest tests/test_business_jobs.py -q` then affected organiser AI and full `tests unit_tests -q`. Frontend schema generation/build if API changes; no new UI in Phase4. Protect entire prior d7762e1 path set plus this phase's reviewed testplan/TCRs before implementation. Root guard, full diff/bypass review and independent behaviour/security assessment target the same frozen source.

Retained development migration/restart and old organiser compatibility remain required local evidence. No provider call/production deployment/human accessibility or summary verification claimed by this phase. Provider requests remain disabled until the explicitly opted-in invented-data Phase5 integration.
