# Test baseline change request

- Request ID, requester, date, feature/run: F02-MIGRATION-TCR-01, user-requested, 2026-10-22, merge of `master` into `feat/organiser-disruptions`
- Old baseline commit; protected paths; specification revision: `4c7ad97`; `backend/tests/test_ai_analysis.py` and `backend/tests/test_disruption_migration.py`; migration integration after F02 merge
- Failing test and exact reproduction/observed output:
  - `tests/test_ai_analysis.py::test_additive_ai_migration_preserves_existing_auth_and_application_records`
    - `AssertionError: Expected a single linear predecessor for the additive feature migration.`
  - `tests/test_disruption_migration.py::test_disruption_upgrade_preserves_populated_programme_and_application_ai`
    - `assert '20261021_f02' == '20261021_0005'`
  - Reproduction:
    ```sh
    DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5434/eventapp' \
    TEST_DATABASE_URL='postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test' \
    EVENTAPP_ALLOW_TEST_DB_RESET=true \
    uv run pytest
    ```
  - Observed result: `327 passed, 2 failed`
- Relevant acceptance criterion and expected behaviour: Migration upgrades and downgrades must preserve populated authentication, application, AI, programme, and F02 records; the merged migration graph must have one valid head and must not discard records.
- Cause: test / implementation / environment / specification ambiguity (justify): test. F02 introduced a legitimate migration branch from `20261021_0004`; the merge added `20261022_0006`, and the post-merge head `20261022_0007` has two predecessors (`20261022_0006`, `20261021_0006`). The tests still assume the pre-F02 linear graph and therefore fail during migration setup/assertions. The application migration graph reports one head (`20261022_0007`), and the other 327 tests pass.
- Proposed correction and alternatives considered:
  - Update the AI migration preservation test to target the named AI migration (`20261021_0005`) rather than requiring the current head to have a single predecessor.
  - Update the disruption migration preservation test to downgrade through the merged graph while retaining the F02 branch, then upgrade to the named disruption/merged target and verify all pre-existing records.
  - Preserve the existing assertions for record equality and final readability; do not weaken data-preservation coverage.
  - Alternatives rejected: changing product migrations to remove the F02 branch, renumbering applied migrations, skipping the two tests, or changing expected output only to make the current graph pass.
- Coverage/security/regression impact; evidence this does not merely fit current code: No product behavior, API contract, authorization rule, fixture, or test discovery change is proposed. The correction makes migration tests assert the actual reviewed graph and keeps populated-record preservation checks. Evidence: `uv run alembic heads` reports only `20261022_0007`; full backend run passed 327 tests with only these two migration-assumption failures.
- Independent verifier assessment: Both affected tests and the complete backend suite were rerun after the correction. The migration graph remains one-headed and the existing populated-record preservation assertions remain active. A separate role-agent review was unavailable in this session.
- Test owner decision and identity: Approved by the requesting human on 2026-10-22; the correction was applied by the main agent because the designated test-owner agent could not be launched.
- Human product approval if behaviour changes (otherwise explain N/A): N/A; this is migration-test maintenance only and does not change product behavior.
- Test-owner correction commit and affected checks/reviews: Working-tree correction applied to `backend/tests/test_ai_analysis.py` and `backend/tests/test_disruption_migration.py`. Affected checks: both migration tests and the complete backend suite.
- Replacement baseline commit, path set, rationale, and preserved old evidence: Replacement baseline pending commit. The old failing run (`327 passed, 2 failed`) remains preserved above. New result: `329 passed, 93 warnings` in `394.99s`; both corrected migration tests pass.
