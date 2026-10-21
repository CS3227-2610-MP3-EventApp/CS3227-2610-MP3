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

## Frozen baseline and implementation handoff

Both actual independent reviewers approved final24-case adequacy (read-only; additions not executed). Immutable baseline: `55817ee5296f9f291d09729237aa8811bcc330ee`. Protected paths: entire d7762e1 set recorded in the setup run, plus `workflow/agents/runs/2026-10-21-business-jobs-test-plan.md`. This includes all backend/tests, frontend/tests, test configuration/fixtures/discovery/CI, guard and previous protected plans/TCRs. Developer cannot change any protected file or baseline reference.

Backend developer `/root/preparation_developer` owns only app/ai models/schemas/service/routes/worker, additive0008 migration, OpenAPI and narrow main error routing if needed. No tests/config/docs/frontend edits. Root owns integration, logs and generated frontend schema coordination. Implementation starts after this record; no provider call or Phase5 creation/adoption in this handoff.

Root guard passed against55817ee; read-only retained development table fingerprints captured before0008. Phase5 scenario-only planning proceeds separately with no protected writes. Frontend owner identified nested DTO ambiguity; root clarified sourceRevisions/sourceFacts, history and adoption response in generate-preparation-drafts r3 under existing amendment authority. Actual frontend owner and security reviewer independently reported no remaining blocking contract ambiguity/contradiction; no new policy or runtime claim. Source snapshot/draft implementation still Phase5, not this slice.

Initial Phase4 focused24passed,1 deprecation warning,16.02s; backend developer began full isolated suite, snapshot frozen. Retained development0007→0008 upgrade passed; all pre-existing table row fingerprints unchanged, no new tables. Existing development ai_jobs was empty, so populated organiser-job upgrade/restart still needs separate evidence.

Actual independent behaviour/security reviews found no business authority/CAS/audit/gate/claim/cleanup blocker, and behaviour passed complete55817ee guard. Both contradicted developer's claimed retained SQL default: actual0008 removes it and ORM has only Python default. Behaviour also found shared route password-completion regression (get_current_actor replaced workspace guard). Root verified disk discrepancy, preserves developer report as inaccurate rather than claiming default retained, and assigns test-owner compatibility regressions/TCR before first repair. Full suite shows an early failure but exact cause remains pending captured traceback. Since0008 is already applied, restore SQL default via additive0009, never rewrite applied history. Developer owns0009/model/routes repair only after reviewed replacement baseline; Phase5 migration becomes0010.

Designer added seven JOBS-TCR-01 compatibility cases (31total): prelookup mandatory-password role/target/method matrix and actual legacy SQL omitted-workflow insertion plus unchanged organiser DTO. Both independent reviewers approved adequacy read-only; original24 unchanged, no DB execution during the ongoing full suite. Root prepares replacement baseline before authorising first repair. Supplemental real HTTP job/restart helper syntax passes; actual check awaits corrected API/default migration. Seeded infrastructure jobs do not claim generation/provider delivery.
