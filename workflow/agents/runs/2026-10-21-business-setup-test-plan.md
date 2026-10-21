# Booth/setup acceptance test plan

Status: Reviewed executable baseline; immutable commit recorded by orchestrator in phase run.
Specification: assign-booths-and-publish-setup-details r1 Ready; CurrentActor v1; decision r2; shared UI r4. Exact approval and phase run: [F06 implementation](2026-10-21-f06-implementation.md).
Designer: actual `/root/preparation_scenarios` (test_case_designer). Independent adequacy reviewers `/root/phase2_final_behaviour` and `/root/phase2_final_security` approved final scenario/assertion/fixture deltas within recorded scope, through read-only assessment; neither executed these tests. Schema TCR independently assessed by `/root/phase2_final_behaviour`. Baseline commit belongs in phase run; runtime implementation verification remains pending.

## Fixture and interface contract

Reuse existing synthetic business-application HTTP/PostgreSQL fixtures: two businesses, two assigned organisers/events, attendee, anonymous clients and current auth sessions. Create applications through approved APIs, explicitly accept before setup writes; keep draft/submitted/rejected cases for negative coverage. Give one business two event participations. Prepare a private preparation document to assert domain isolation.

GET/PUT organiser route: `/api/v1/organiser/events/{eventId}/participations/{participationId}/setup`; business GET: `/api/v1/business/participations/{participationId}/setup`. Assert exact SetupDetails keys, canonical UUIDs, independent revision and UTC timestamp; both fields required in PUT, nullable plain strings. All responses are no-store, failures use safe RFC9457 errors. `participation_setup` is the provisional module-owned additive table name, subject to orchestrator coordination rather than new product policy.

UI uses existing organiser/application and business/application detail routes. `Booth label` and `Setup instructions` are labelled controls. `Save setup` opens `Confirm setup details`; only `Publish setup` sends PUT; `Cancel` sends none. Scope/normalize confirmation to actor, participation, loaded revision and editable facts. Private fixture state stays memory-only. UI HTTP fixtures model public responses, not repository internals.

## Executable cases planned

All IDs below map to `assign-booths-and-publish-setup-details-ACxx`.

| Case / criterion | Synthetic setup and action | Expected observable result and unchanged side effects | Level |
| --- | --- | --- | --- |
| SET-01 / AC01,02 | Accepted participation without setup; organiser/business GET twice | Exact empty revision1 with null fields/timestamp; snapshot all public tables before/after proves no GET writes | HTTP/PostgreSQL |
| SET-02 / AC01,06 | Save trimmed booth/instructions; retrieve from both roles in fresh requests/connections; update, same-content save, clear one/both fields | Identical canonical details, stable participation/event, one revision increment per save, UTC updatedAt; no application/decision/participation/preparation changes | HTTP/PostgreSQL |
| SET-03 / AC01,03 | One business in two events plus another business; independently save, including identical booth labels | Both owned workspaces readable, documents isolated, repeated label allowed; no reservation/programme side effects | HTTP/PostgreSQL |
| SET-04 / AC02 | Two synchronized first saves, then two synchronized updates at same expected revision; stale/repeated requests | Exactly one winner each race,409 loser, canonical winner persisted; one attributable success audit per committed save | HTTP/PostgreSQL |
| SET-05 / AC03 | Anonymous, attendee, business on organiser route; unrelated organiser/event; wrong-event target; foreign/absent business target |401/403/404 as contract requires; missing and foreign indistinguishable after removing instance; no private current revision; denied writes preserve documents | HTTP/PostgreSQL |
| SET-06 / AC03 | Revoke organiser event membership/business owner membership or require password replacement after initial authorized read; retry GET/PUT | Current authority enforced on next request; no stale-session access; setup unchanged after restoration | HTTP/PostgreSQL |
| SET-07 / AC03,04 | Business attempts PUT; organiser attempts preparation GET; organiser setup targets draft/submitted/rejected applications | No business setup writes/preparation leakage; nonaccepted organiser targets404; business pending/rejected GET displays empty state | HTTP/PostgreSQL |
| SET-08 / AC04 | Missing/untrusted Origin; malformed UUID; missing/extra/server-owned fields; bool/string/float/zero revisions; nonstring facts | Safe403/422 with no-store, fixed known validation fields, no payload/exception reflection; entire setup/domain state unchanged | HTTP/PostgreSQL |
| SET-09 / AC01,04 | Text length100/5000 and101/5001 Unicode codepoints; whitespace, null, empty; markup/injection text | Boundaries accepted/rejected correctly, blanks normalize null, plain text preserved without execution; failed mixed-field replacement atomic | HTTP/PostgreSQL + UI |
| SET-10 / AC04,06 | Reject audit INSERT during new/save/clear; capture attributable success audit on normal save | Failed setup and audit both roll back; prior records intact; success action setup_save, actor/resource/revision/time with no text payload | HTTP/PostgreSQL |
| SET-11 / AC06 | Seed applications/decisions/preparation at preceding migration, upgrade additively, reconnect and retrieve via public APIs | All old records unchanged; new setup persists; exact current schema recognizes only coordinated table addition; historical schema check preserved | Migration/PostgreSQL |
| SET-12 / AC05 | Fill organiser fields; open confirmation, cancel; reopen, publish; change facts after cancellation; confirm clearing | Dialog shows exact target/facts; cancel no PUT; only explicit publication sends matching normalized payload/revision; stale prior confirmation cannot publish edited facts | UI/HTTP fixture |
| SET-13 / AC05 | Business application detail with empty or saved setup; markup/instruction-like strings | Correct missing labels or current facts beside outcome; text stays inert; business has no assignment controls | UI/HTTP fixture |
| SET-14 / AC05 |409 response,422 containing arbitrary detail; retain edited input | Safe announced feedback; no success claim/replay; explicit review at authorized current revision; no raw error/private storage | UI/HTTP fixture |
| SET-15 / AC05 | Commit then lose response; authoritative GET matches or differs | GET under current actor/context; matching state adopts canonical revision before next explicit save; mismatch requires review; no automatic second PUT | UI/HTTP fixture |
| SET-16 / AC05 | Hold actual dispatched setup GET; switch application/event/identity or revoke access; release departed response | Private facts concealed during authority refresh, purged on confirmed departure/denial; late response cannot restore wrong-context content; no browser-storage/history payloads | UI/HTTP fixture |

## Deferred/manual evidence and adequacy

- Real browser integrated organiser publication → business outcome, keyboard/focus/dialog return, announcements, screen-reader and400% zoom: defer until implementation; fixture UI checks do not establish real integration/accessibility.
- Restart running backend without reseeding and retrieve setup/preparation/application through APIs: defer to independent verification. Fresh database connections alone do not prove process lifecycle persistence.
- Online delivery and distinct development/production credentials/data, client-bundle/log secret checks: release evidence, not established by local fixtures.
- Provider/injection tool dispatch, reservations/orders/payments: N/A; this manual capability makes no provider/external-action call. Plain text remains untrusted and UI execution is covered.
- Before baseline, independent behaviour/security reviewers inspect observable assertions, fixture dispatch/holds, complete role matrix and TCR for additive exact-schema compatibility. No scenario-only check is claimed passing.

## Planned artifacts and commands

Executable files: backend/tests/test_business_setup.py and frontend/tests/business-setup.test.tsx. Existing exact-schema literal correction was approved independently and applied by test owner under [SETUP-TCR-01](2026-10-21-setup-schema-tcr.md); no equality/history weakening.

Backend: `.venv/Scripts/python.exe -m pytest tests/test_business_setup.py -q` in backend with existing guarded5433 synthetic database environment. Frontend: `npm.cmd test -- tests/business-setup.test.tsx` in frontend. Full-suite and protected-path set will be recorded by orchestrator before development. Preimplementation RED: backend first virtual setup GET returned404 instead of200 after successful auth/application acceptance; run stopped after1 failure. UI9/9 meaningful failures for absent Booth label/setup UI and missing business setup facts, with existing application/auth harness running. No import/harness errors observed. Syntax compilation and git diff --check passed. The subsequent test-only addition seeds a preparation document before the same missing setup GET; its behavior remains unexecuted until next run.

Executable coverage presently groups SET01–10,12–16; context-loss UI specifically covers authority revocation/held response, not every application/event-switch permutation. SET11 populated preceding-migration upgrade remains deferred for independent verification; fixture migrate-to-head alone does not prove additive data preservation. Browser/restart checks remain deferred. Setup conflict currentRevision is optional in r1; tests validate it when returned and prohibit disclosure to unauthorized callers.

Behaviour adequacy additions before freeze: first-save audit rejection proves no setup row/revision/success audit;422 publication with injected raw detail proves safe field-specific invalid feedback, retained editable facts and no replay/storage; an edit while confirmation remains open invalidates its prior publication approval. These are test-owner changes against unchanged r1 behavior; independent delta review pending. UI now12 cases; initial nine-case RED evidence remains historical, not claimed execution of additions.

Security adequacy additions before freeze: all401/403/404 API problems assert no currentRevision; both business and organiser consumers reject valid-looking foreign eventId/participationId responses before text/input display or browser storage. UI now16 cases. Held-response coverage remains sign-out/revocation only; other actor/event-switch permutations are deferred. Supplemental UI run of the two behaviour additions produced2 meaningful missing-Booth-label failures/10 filtered before security cases were added. Both independent reviewers approved final additions; no passing implementation claim.
