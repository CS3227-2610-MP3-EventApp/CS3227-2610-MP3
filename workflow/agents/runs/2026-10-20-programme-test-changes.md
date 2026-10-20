# Programme test-owner change request

Status: implemented by test owner for independent adequacy review; baseline not frozen.

Authority: Dylan approved the exact written programme capability revision 6 on 2026-10-20, as relayed by the orchestrator. This request changes test expectations required by that approved behaviour, not product requirements.

1. `backend/tests/test_migrations.py`: retain exact schema catalogue assertion, adding the four new programme tables. Add upgrade from authentication-only revision `20261019_0002`, comparing existing auth records byte-for-byte and confirming existing session restoration. Reset remains guarded to disposable local test database only.
2. `frontend/tests/acceptance/session-and-homes.test.tsx`: organiser now has one enabled Programme Management action and two disabled future actions. Attendee/business retain three disabled future actions and existing role isolation assertions.

Reason: retaining the old auth-only catalogue and three-disabled-organiser expectation would contradict approved scope. No auth response, permission, session, cookie, appearance or other-role expectation is weakened.

Independent assessment: `/root/programme_draft_behaviour` and `/root/programme_draft_security` found the migration and organiser-home changes justified by approved revision 6, without weakening auth or other-role expectations. Final corrected scoped test design was accepted for baseline freeze. The immutable baseline SHA is recorded in the organiser run record before development. Existing authentication baseline remains historical, not silently overwritten.

## Follow-up: appearance status expectation

Independent behaviour reviewer `/root/programme_draft_behaviour` confirmed the organiser appearance test's unconditional `03 / PREVIEWS` expectation is obsolete under approved revision 6: Programme Management is now ready while two other capabilities remain previews. Test owner changed only that text expectation to `01 / READY · 02 / PREVIEWS` for organiser; attendee/business retain `03 / PREVIEWS`. Minimum text-size checks and every other appearance assertion remain unchanged. This corrects a test expectation, not product behaviour. Root will record the replacement baseline SHA containing this test and this change record.
