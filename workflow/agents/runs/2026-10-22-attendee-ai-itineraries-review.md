# Independent behaviour + security review: F03-US01 attendee AI itineraries

Snapshot: branch feat/yikbi-attendee-ai-itineraries at 067d32f (diff vs 2a9b409). Spec: generate-feasible-itineraries rev 2. Baseline: 0464d40 (protected paths match: `tools/check_test_baseline.py` run, test files, fixture, test plan unchanged since 0464d40). Reviewer: independent review run (not the implementer or test designer). Targeted tests run: `-k "ac06_one_retry or ac06_cancel_during or ac04_outbound"` = 3 passed (23 s). No full suite run.

## Findings

### Blocking
B1. Attendee job cleanup is unreachable (spec: terminal jobs/results expire after 30 days; SEC08/RD07).
`backend/app/attendee_ai/service.py:96` `cleanup()` is never called. `backend/app/ai/worker.py:251-256` `--cleanup` calls only `app.ai.service.cleanup` (deletes `ai_jobs`). Docs (`docs/DeveloperGuide.md:223`, `docs/AIAnalysisTesting.md:64`) tell operators `--cleanup` expires jobs, so attendee `result` JSON (model reasons) and job rows persist indefinitely. No baseline test covers it, so green tests do not show it. Fix: in `main()` also call `attendee_ai.service.recovery/cleanup` in the same `--cleanup` branch (one-line seam change in Dylan's file, coordinate), and add an owned unit test outside the baseline (insert 31-day-old terminal job, run cleanup, assert deleted; 29-day and active kept).

### Should fix
S1. Shared rate cap is one-directional (`backend/app/ai/worker.py:115-150` vs `backend/app/attendee_ai/worker.py:~99-106`). Attendee `_dispatch` counts both attempt tables under the shared advisory lock (3227, 20261021), but the organiser `_dispatch` counts only `AIProviderAttempt`. Combined traffic can reach up to twice `soclaas_requests_per_minute`; "limits match the organiser slice / shared transport limits" is only half met. Fix: change organiser count to include `ItineraryProviderAttempt` (needs Dylan's agreement), or extract one shared helper used by both. No test covers the cap for either slice.

S2. Frontend stale detection misses removed items. `frontend/src/attendee-planning/ItineraryAI.tsx` `stale` uses `!!current && current.revision !== item.itemRevision`; if an item is no longer in the current programme page (or not loaded), it is not stale, shows the title "Activity" and offers "Save as draft". Server rejects the save (409), so no data harm, but the UI presents it as current (spec: stale suggestions cannot be presented as current). Fix: treat `!current` as stale when the programme has loaded. Note the programme list is a single page (`programme?.items`), so items beyond the first page also look missing; combine with the fix.

S3. Free-text `reason` from the model is stored and shown with only a length/blank check (`schemas.py` ModelItem). React escapes it (no `dangerouslySetInnerHTML`/`href` in `ItineraryAI.tsx`, checked), so no XSS, but injected prose (e.g. an email/URL echoed from a title) is displayed as a "reason". Low impact; consider rejecting reasons containing URLs or the attendee's email, or accept and document.

S4. Accessibility "hard constraint" is only "details present". `service.py` validate_result: `accessible = not needs or all(details is not None)`; it never evaluates whether the facts satisfy the stated need, and a whitespace-only `needs` counts as a requirement. A result with `accessibility: passed=false` is still returned as `outcome: feasible`. This is consistent with the approved text ("unknown accessibility is flagged and needs confirmation") and acceptance later forces confirmation, but the spec's "validation reuses the existing deterministic planning checks" is not literally true: overlap/budget/accessibility are reimplemented in `validate_result` and the existing `validation()` (`attendee_planning/service.py:51`) minimum_gap check is not applied. Gap: a feasible AI draft can violate the minimum gap preference (soft per spec, so acceptable) and saving shows it as a warning. Fix or document; ideally call the planning `validation()` to avoid drift.

S5. Recovery code is misleading and unreferenced by tests: pending jobs past the 180 s deadline are marked `worker_interrupted` (`service.py` recovery); run `failure_code` semantics for a never-dispatched job should be `job_timeout`. Also attendee recovery only runs when `ai.worker.run_once` finds no organiser pending job (`ai/worker.py:224-228`), so a continuously busy organiser queue starves attendee jobs and their recovery. Fix: call attendee `_claim`/recovery independently, or alternate.

S6. Baseline coverage gaps (tests that would not detect a regression), see section below.

### Notes
N1. Auth/IDOR/Origin/no-store: all attendee routes use `require_workspace("attendee")`; job reads and cancel filter by `owner_id` (`service.py:_owned`), 404 for foreign/missing; POST Origin and no-store handled by existing `auth_boundary` middleware for `/api/v1/attendee/`. Looks correct; tests assert 404/401/403 and Origin variants.
N2. Outbound data (`worker.py:_messages`): sends item id, revision, title, type, times, room name, price, accessibilityDetails, interests, budget, minimumGapMinutes; does not send accessibility needs, username/email, venue, address, or request/owner ids. Matches spec. Interests is attendee free text (permitted by spec). Source labels are positional and pseudonymous.
N3. Output validation (`validate_result`) rejects fabricated ids, revision, start/end mismatches, duplicates, overlaps, over-budget, extra keys (strict models), naive datetimes; constraintResults are server-computed; items are re-sorted. Model infeasibility claims are not verified (documented known limitation).
N4. Races: create serialises on the user row (`lock_attendee` FOR UPDATE) for idempotency, one-active, daily count; cancel locks the job row; `_dispatch` and `_finish` lock the job and require `state == running`, so a cancel during the provider call discards the result (test passes). Lock order is job then user then advisory lock, same as organiser; no deadlock found by inspection (not stress-tested).
N5. Config gating: `provider_configured` checks ai_enabled, synthetic only, non-production, key, model, event allowlist at create (503) and again at dispatch; `SoCLaaSProvider._enabled` re-checks. Production-environment gating itself has no test (only the five env toggles).
N6. Retry: only HTTP 502/503, once; timeouts, transport, 429, invalid output are not retried; second dispatch goes through the rate cap. Logs carry only failure codes (no bodies). Failed attempts are not audited (only create/cancel/complete); acceptable per SEC11 but note.
N7. Migration: single linear head `20261022_0008` (down_revision `20261022_0007`), `alembic/env.py` imports the new models; indexes match model `index=True`; downgrade drops them. I did not run `alembic heads` (this machine's venv path was not used) and relied on file inspection plus the passing protected migration test being in the suite (not run by me).
N8. `published_facts` is unpaged and could exceed 40,000 chars for a large event: job then fails `input_too_large` deterministically. Acceptable, visible failure.
N9. Reload loses the job: there is no "list my jobs" endpoint, so a page reload hides an active job (quota/active-job 409 still applies). Not in spec; note for UX.
N10. Fits-tests-rather-than-spec: nothing found that hardcodes test outputs; fake provider only at the documented seam. The `ai/worker.py` hook returns the attendee result when no organiser job exists, which suits the fake-provider tests; the production `_serve` path passes one shared `SoCLaaSProvider` to both, fine.

## Baseline adequacy (mutation-style)
Would still pass if the behaviour were broken:
- `test_ac01_unknown_accessibility_...`: calls `assert_constraint_results(...)` with `passed=None`, so it passes even if the accessibility result were always True or always False; the real check is the existing planning API's `accessibility_unconfirmed`, not new code.
- AC05 tests (`test_ac05_*`) exercise only the existing planning save/accept API; they cannot fail on any change to `attendee_ai` code.
- `test_ac03_stale_preference_revision_...` second half also tests only the planning API.
- `test_ac06_*failures*` timeout case accepts any of three codes, and does not exercise the 180 s deadline, lease expiry/recovery, `permission_revoked`, or `job_timeout` paths.
- Daily limit test counts to ten but never crosses a UTC day boundary, so a wrong `day_start` would pass.
- `test_ac04_oversized...` accepts either a failed job or no calls, so it passes if the cap were removed provided messages stay under 40,000 (it does assert no call exceeds 40,000, which is the actual check).
- Retention/cleanup (B1), shared rate cap (S1), production environment gating, and frontend stale-with-removed-item (S2) have no test.
Good: outbound canary test (accessibility needs identical with/without), 29-variant malformed output matrix, cancel-during-call, concurrent create/replay, owner scoping, Origin matrix, migration/organiser-table checks, and baseline integrity all look sound.

## Could not verify
- Full backend and frontend suites, the frontend tests, build, lint, openapi regeneration drift: not run (constraint).
- Live SoCLaaS behaviour and real HTTP error shapes; real multi-process worker concurrency and lock behaviour under load; deadlock absence is by inspection only.
- Accessibility (keyboard/AT) of `ItineraryAI.tsx` beyond reading markup; no browser run.
- `alembic heads` and migration upgrade/downgrade were not run by me.
- Human teammate review and privacy approval for real data remain pending (outside this review).
