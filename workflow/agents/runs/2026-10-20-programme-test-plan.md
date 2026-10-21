# Programme revision-6 acceptance test plan

Status: scoped pre-implementation executable test design accepted by independent behaviour/security reviewers; immutable baseline recorded in the organiser run record before developer handoff. This is not implementation verification.

Designer: actual delegated `/root/programme_scenarios` test-case designer. Scope: approved `create-and-publish-programme` revision 6; F01-US01/02 and F04-US03, plus F01-US03 published API only. Human exact-revision approval relayed by orchestrator on 2026-10-20. No production files owned by designer.

## Executable cases

All backend cases use guarded local PostgreSQL, actual migrations, CLI-created organiser/event, cookie login, mandatory password replacement and an independently registered attendee. `backend/tests/test_programme.py` uses stored-state reads after requests; it does not replace auth dependencies.

| Test group | Acceptance mapping | Setup/action and expected evidence |
| --- | --- | --- |
| Create/validate/publish/snapshot/audit | F01-AC01/04/05/08; AC10 | Create private complete draft; validation does not mutate revision; explicit publish increments once, freezes exact public facts and yields attributable organiser-only audit |
| Invalid drafts | F01-AC03/07; AC10 | Invalid required bounds, enum/currency, strict integers, event times, timezone-free timestamp, unknown fields rejected with structured field errors; item list unchanged |
| Overlap, revisions, safe deletion | F01-AC03/07 | Exact event bounds accepted, same-room overlap accepted; stale update/delete/validate/publish preserve winner; reject invalid capacity reduction and referenced deletion; published item/location immutable; unused location deletion succeeds |
| Search/filter/pagination | F01-AC05 | Mixed private/public records, literal `%_`, case-insensitive combined filters, event-zone start date, default/explicit pagination and malformed filters |
| Origin | F01-AC02/07; SEC01 | Missing/null/untrusted Origin rejected on representative POST/PATCH/DELETE including validation; programme state unchanged |
| Scope/revocation | F01-AC02; SEC01 | Every organiser list/detail/create/update/delete/validation/publication/audit surface rejected for anonymous, attendee, business, mandatory-change organiser and wrong-event organiser; inactive membership denied on next request; both-event actor cannot mix resource scope |
| Competing publication | F01-AC04/07/08 | Concurrent independent HTTP clients, shared barrier: exactly one 200 and one 409, one success audit and public revision 2 |
| Publication/parent race | F01-AC07 | Barrier races independent publication and room-name edit; result must correspond to serial order and public snapshot must equal locked location facts |
| Audit storage failure | F01-AC07/08 | Guarded test-only PostgreSQL trigger rejects success-audit insert: 503 without SQL leakage, draft/snapshot visibility preserved, retry after trigger removal succeeds |
| Revalidation and successful edits | F01-AC03/07; AC10 | Synthetic changed-parent capacity returns findings and blocks publication with no revision/snapshot/success audit; positive room/venue PATCH and same-value revision increment; complete fields and expected-revision omissions rejected |
| CORS | SEC01 | Trusted PATCH/DELETE preflights accepted; untrusted origin lacks allow-origin header |
| Migration | F01-AC06 compatibility boundary | Empty latest schema exact catalogue; auth-only upgrade preserves existing auth rows and cookie session (not restart proof) |
| UI entry/states | F01-AC01/02 | Mocked HTTP integration tests check active card, permitted event data, both appearances, failure alert and unauthenticated route. Existing home regression updated via linked TCR |

AC10 denotes retained `create-and-publish-programme-AC10`. UI tests use semantic accessible roles/names; they are not real-browser or real-server integration evidence.

## Required follow-up coverage before claiming full verification

### Additional pre-implementation race scenarios

These scenarios are designed now, before dependent implementation. Their execution is a **required verification gate**, not an unconditional deferral. Test owner and independent reviewers must approve any executable additions before freezing them. Use independently authenticated clients/connections and a shared start barrier, record responses and inspect committed item, parent, snapshot and success-audit records.

| Scenario | Synthetic action pair | Allowed serial outcome and persisted assertions |
| --- | --- | --- |
| Publish versus venue edit | Valid draft revision 1; publish expectedRevision 1 versus rename its venue expectedRevision 1 | If rename commits first, both can succeed and snapshot contains renamed venue. If publication wins, rename returns 409 and original venue remains. Exactly one publication snapshot/success audit; public venue equals committed venue; later edit rejected. |
| Publish versus capacity reduction | Draft capacity 30 in room capacity 30; publish versus room PATCH capacity 29 | Capacity reduction always returns 409 because existing draft or publication references it. Publish succeeds; room remains 30; public item capacity remains 30; exactly one snapshot and success audit. No state may contain a committed published capacity exceeding room capacity. |
| Publish versus parent deletion | Valid draft references room and containing venue; publish versus DELETE room, then repeat separately for venue | Parent deletion always returns 409 because item references room or venue contains room. Publication succeeds, all relationships remain resolvable, one snapshot/success audit. No orphaned published facts or partially deleted parents. |
| Publish versus item update | Valid draft revision 1; publish expectedRevision 1 versus complete valid title replacement expectedRevision 1 | Exactly one succeeds and other receives 409. If update wins, draft revision 2 has changed title, no snapshot/success audit and attendee cannot read it. If publication wins, published revision 2 contains original title with one snapshot/success audit; later item write rejected. |

F01-AC07 cannot be reported fully verified until these scenarios have executed or reviewers have documented equivalent deterministic transaction evidence plus executed regression coverage. A generic concurrency stress run or duplicate-publication test is not sufficient evidence by itself.

- Add/review exact maximum numeric/text boundaries and blank accessibility normalization on all three shapes.
- Publication-versus-room edit is executable; deterministic coverage of every deletion/capacity-change interleaving still needs independent implementation review and further stress/adversarial checks. Neither barrier test proves all possible schedules.
- A separately delegated UI test owner is extending the frontend tests for core form/save/server field errors, conflicts/reload, publication/deletion confirmation and published read-only state before implementation. Record that owner's actual cases/results separately rather than assume coverage.
- Verify logs omit secrets/raw bodies, filter ordering ties and default pagination. Security reviewers must assess actual implementation in addition to test suite.
- Real browser keyboard/focus/narrow viewport/theme readability and non-browser-timezone/DST behaviour require browser/manual verification; DOM appearance cases do not prove contrast.
- F01-AC06 restart: persist fresh synthetic data, restart API and test PostgreSQL without deleting its volume, retrieve same records through HTTP. Not covered by a new TestClient or migration checks.
- F01-AC09 deployed organiser-to-attendee journey and production isolation remain deferred, as does actual attendee UI integration owned by teammate. AI applicability is N/A for this manual slice, not overall assignment.

## Commands and baseline

Run backend from `backend/` with distinct `DATABASE_URL` development identity, `TEST_DATABASE_URL=postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test`, `EVENTAPP_ALLOW_TEST_DB_RESET=true`: `uv run pytest tests/test_programme.py tests/test_migrations.py`; full suite `uv run pytest`.

Frontend: `npm test`, `npm run build`; generated contract consistency after reviewed exporter/type generation. Guard/tools commands follow existing workflow. Protected paths include acceptance tests/fixtures, this test plan/TCR, discovery/runner config and integrity guard. The organiser run record records the exact immutable baseline SHA and path set. `/root/programme_draft_behaviour` accepted the corrected backend and expanded UI design; `/root/programme_draft_security` accepted corrected backend security design. These are bounded static adequacy reviews, not runtime enforcement verification.

Expanded UI tests were independently authored by `/root/programme_ui_test_owner`: complete venue/room/item creation, expected-revision edits, event-local timestamps, field/validation findings, cancel/confirm publication and deletion, read-only publication, stale reload and event-switch clearing. Targeted pre-code run: 11 tests, 1 passed and 10 failed at the absent active programme entry. Later form assertions were not reached, so this red does not demonstrate their runtime correctness. Mock responses normalize accepted offset instants to UTC output.

Pre-implementation execution evidence: initial non-escalated commands failed on sandbox cache writes (environment failure, not red). Backend escalation was rejected by automatic review because the development identity appeared in DATABASE_URL; no DB command ran from this rejected attempt. Orchestrator then independently ran the guarded command with a non-routable identity marker after inspecting conftest's test-target rewrite; see run record for exact backend result.

Frontend initial 4-case entry test draft plus 20 existing session/home tests ran through Vitest: **4 failed, 20 passed**. Three new entry tests failed because Programme Management still had no enabled programme action; the changed organiser regression failed on 3 disabled actions instead of expected 2. These are expected pre-implementation behavioural reds; imports/harness succeeded. The anonymous-route case passed. This execution predates the separate UI owner's expanded tests and is not evidence those later tests ran.
