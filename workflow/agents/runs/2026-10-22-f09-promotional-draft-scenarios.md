# F09 Phase 1 independent acceptance plan

Status: Preimplementation review candidate; not yet frozen.
Feature/story: draft-promotional-concepts / F09-US01.
Approved specification/contracts: promotional concepts r3 / shared AI jobs r5, Isaac approved default bundles2026-10-22; root/analyst confirmed absent published setup uses expectedSetupRevision:null; PUT edits creative fields only and refresh-facts is separate.
Designer: actual test_case_designer /root/f09_scenarios. Independent reviewers: behaviour_verifier /root/f09_behaviour_draft and security_reviewer /root/f09_security_draft. They reviewed evolving draft scenarios and executable files; final adequacy results belong to root Phase1 run. No reviewer agreement is claimed before their return.
Ownership: backend/tests/test_promotional_concepts.py; frontend/tests/promotional-concepts.test.tsx; this plan. No app changes. Synthetic fixtures are defined in those files and use existing public auth/participation setup from test_business_applications.py and frontend fixtures.
Baseline commit: pending root; this plan is frozen with the baseline and not updated during development. Mutable execution/review results belong in 2026-10-22-f09-phase1.md.

## Scope and observable assertions

Creator-private concepts for any extant owned participation; no acceptance prerequisite. Successful generation stores a distinct new concept, never overwrites existing ones. Manual blank creation is excluded; still-authorised users edit existing generated drafts during provider failure. Structured selected facts are server-rendered with provenance/freshness; generated/user-edited prose remains visibly unverified and may contain undetected misleading claims. No automatic semantic-detection claim. No publication, email, order/payment, supplier request or other domain write is permitted.

Common synthetic fixtures: two businesses/organisers/events, attendee and anonymous actors, existing owned unaccepted participation, current/inactive and additional owner memberships; generated creative/provenance records, published/unpublished setup and private sentinel text. Domain-state witness captures applications/settings/decisions/participations, manual preparation/setup and event/programme tables before and after failures. SQL fixture mutations model source changes/revocation, not public product operations. All failure/rejection assertions preserve prior concepts and producer records; permitted job/audit mutations are separate.

## Cases and criterion mapping

All cases use the named test(s) in the owned files; tests derive expected results from r3, not app internals. API cases use real HTTP/auth/PostgreSQL and actual worker with a fake provider returning independent wire JSON. UI cases render real App with independent HTTP records and user actions; they do not prove real browser/server integration.

| Case / criteria | Setup/action and boundaries | Expected observable result / preserved effects | Level and executable mapping |
| --- | --- | --- | --- |
| PC01 / AC01/06 | Own unaccepted participation; generate, replay, generate again, list/detail | One durable job per requestID, new saved ID per successful generation, exact creative payload/current fact DTO; other domain state unchanged | API/worker: test_generation_existing_unaccepted_participation_is_private_distinct_and_stored |
| PC02 / AC06 | Edit saved draft then fresh detail read; remount UI | Same saved text, revision increments once; unchanged bound provenance | API test_edit_cas...; UI PCUI07. Real process restart deferred |
| PC03 / AC03 | Foreign business/attendee/organiser/anonymous across create/list/detail/edit/delete/jobs/cancel; same business other creator | Safe denials, foreign owner indistinguishable404, no changes/private content; requester-only access | test_direct_foreign...; test_same_business_other_requester... |
| PC04 / AC02/04 | Select event or published booth only; edit organiser setup draft | Only selected published values sent/rendered; unpublished/unselected fields never leak | test_source_staleness...; test_published_setup_only... |
| PC05 / AC02/04 | Provider malformed JSON, extra fact/action fields, empty/oversize generated content | failed invalid_output and no concept/new history item; earlier concept survives | test_invalid_provider_output... parameterized |
| PC06 / AC04 | Injection in brief/output, script and URL strings inside creative fields | No authority/tool expansion; creative prose unverified; scripts/links inert | Source minimisation API and UI PCUI03; transport tooling review also required |
| PC07 / AC01/04 | Empty/2001codepoint brief; duplicate/unknown fields, false confirmation, unknown server-provenance fields | 422 before job/provider effect; no unrelated state changes | test_invalid_requests...; test_refresh_facts... |
| PC08 / AC02/05 | Event revision changes before dispatch/during call/after save; refresh facts | No stale successful commit, current stale projection includes latest readable value and old observedRevision; explicit refresh/CAS updates provenance only | test_predispatch...; test_worker_late...; test_source_staleness...; test_refresh_facts... |
| PC09 / AC06 | Two concurrent edits at n; stale edit/delete; different payload same requestID; active competing job | One edit winner/no lost update;409 losers/conflicts; no duplicate quota charge | test_dedup_conflict...; test_edit_cas... |
| PC10 / AC03/05 | Cancel/revoke pending or inflight job | Predispatch zero calls/attempts, late response no concept; exact terminal outcome; old concept intact and revoked actor denied | test_predispatch...; test_worker_late... |
| PC11 / AC05 | Timeout;10 daily owner jobs;11th, replay; cross-preparation quota | Safe bounded failure/quota; replay no extra count; still-authorised manual editing available | test_daily_shared_quota...; test_worker_late...; UI PCUI04/06; actual provider adapter limits/retries require shared regression |
| PC12 / AC05/06 | Completed promotional job exactly30days old; pending/running recovery | Expired job404, saved concept survives; pending survives, overdue possibly-dispatched job fails without replay | test_terminal_job_cleanup...; actual process restart deferred |
| PC13 / AC04 | Synthetic contacts/account IDs/business/application sentinels in server records | Only selected facts and disclosed brief sent; no private server context or secrets in transport/logs | test_source_staleness...; test_published_setup_only...; UI PCUI02 storage; no anonymisation promise for brief |
| PC14 / AC01/05 | Empty/current/unavailable/running states; edit/generate/cancel/remount | Accessible labels, private/unverified/source disclosure, usable editing, safe errors, no browser-persisted draft | UI PCUI01-07; actual keyboard/browser accessibility deferred |
| PC15 / AC02/06 | User edits unverified prose; removes all creative fields | Save accepts allowed-empty collections/layout, does not certify prose or alter source provenance | test_refresh_facts...; UI PCUI03/04/07 |
| PC16 / AC02/04 | Creative text implies free admission, alias booth name, hidden date/URL/script | Never promoted to structured verified fact; no automatic semantic truth promise | Payload fixture + UI PCUI03; human semantic review policy remains product limitation |
| PC17 / AC02/06 | Caller tries PUT factFields/sourceRevisions; later refresh | Strict creative PUT rejects provenance fields; dedicated refresh exact revisions only | test_refresh_facts... |
| PC18 / AC02/03 | Remove readable published booth value while retaining concept ownership; detail/history/completed-job reads | Old value never returned; unavailable/null value/currentRevision, existing private prose remains | test_published_setup_only...; UI PCUI05. Fixture producer nulling is not a proposed unpublish UI |
| PC19 / AC06 | Delete completed C at exact revision; read old completed job and history; generate later | Deleted C stays404 and old job concept:null; later generation creates distinct concept and cannot recreate C | test_edit_cas...; UI PCUI07. No in-place generation/edit binding exists |
| PC20 / AC03/06 | Missing/foreign Origin; positive private reads; foreign job/concept lookup | Mutation403 no effects; all success reads no-store; safe foreign404; audit/log sensitive payload excluded | test_origin...; helper success checks; same-business anti-enumeration. Detailed audit action/visibility review required |

## Commands and baseline protection

Do not overlap backend reset suites. Use documented isolated synthetic DB5433 only:

```powershell
Set-Location backend
$env:DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
$env:TEST_DATABASE_URL='postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test'
$env:EVENTAPP_ALLOW_TEST_DB_RESET='true'
$env:PYTHONPATH=(Join-Path (Get-Location) '.venv/Lib/site-packages')
uv run pytest tests/test_promotional_concepts.py -q --tb=short
uv run pytest tests unit_tests -q
```

```powershell
Set-Location frontend
$env:NODE_OPTIONS='--no-experimental-webstorage'
npm.cmd test -- tests/promotional-concepts.test.tsx
npm.cmd test
npm.cmd run build
```

Proposed protected paths: all backend/tests and frontend/tests; this plan; backend/pyproject.toml and uv.lock; frontend/package.json and package-lock.json; vite/tsconfig/runner/test-discovery configuration; existing frontend/src test files; tools/check_test_baseline.py; tools/verify.ps1; prior protected baseline set. Root records the exact immutable SHA/full expanded path set before development. Developer cannot edit those artifacts; prefreeze designer corrections are reviewed here, postfreeze changes require a test-change request.

## Execution, adequacy and deferred evidence

Initial preimplementation run: backend34 failed, no collection/import/fixture errors; public promotional route returned404 rather than202/422. Frontend6 failed: missing home link and Generate concepts controls on real App. These are meaningful missing-feature failures, but downstream assertions have not yet been exercised against implementation. Subsequent prefreeze corrections added null-source/creative-only/refresher contract alignment and extra cases; final red run results are recorded in root run before freeze.

Deferred and not passing: actual SoCLaaS/live data minimisation/real provider failure; real process/API/worker restart and pending survival; browser navigation/keyboard/accessibility; deployment/separate production credentials and provider secrets; provider billing/retention; broad multiprocess stress and failure rollback around provider/database commit. Shared regression tests must re-run for limits60s/180s/40000/4000/30-minute gate, output caps, retries502/503, settings/environment gating and existing workflows. Existing analysis/preparation regression does not substitute promotional-discriminator coverage added here.

Reviewers must independently inspect: field cardinalities/strict schema, API errors/access ordering, fake-provider semantic limits, source projection redaction, job cleanup survival and test harness behavior. Exact numeric boundary success cases, cross-event authorised business checks, audit read visibility and broad shared resource stress need supplemental review/real evidence; do not infer complete acceptance solely from these suites. No implementation verification or human review is claimed. External action approvals are N/A Phase1 because no external action exists; absence of effects remains a required review assertion.


Final prefreeze run: backend36 failed/1 existing Starlette warning in36.60s; frontend7 failed in10.53s. Backend fixtures/migrations/auth ran and route-level assertions rejected missing404 behavior; frontend imported/rendered real App and lacked required entry/route controls. No harness/import errors. Two final reviewer corrections after run do not reach executed missing-feature failure points: source-change witness now excludes only deliberately changed events while preserving all other domain comparisons; synthetic UI successful PUT projection no longer echoes expectedRevision request metadata. No claim that downstream assertions passed. Reviewers/root must inspect these final deltas before freeze. Behaviour reviewer /root/f09_behaviour_draft approved coverage subject to that witness correction and stated deferrals. Final security recheck remains pending in root run.
