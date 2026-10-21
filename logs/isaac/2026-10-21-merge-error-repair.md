# Merge error repair and specification synchronization

Human verification: Pending.

## Requests and evidence

The user supplied terminal results showing 19 failed and 215 passed backend tests, 217 passed frontend tests, and a successful frontend build. They requested fixing all errors and ensuring the specifications reflect the latest code. Earlier partial-output execution attempts had not established complete-suite results; this session retains native command session IDs and polls them through completion.

## Changes and reasoning

- Narrowed application-path classification so programme input validation retains its `errors` map instead of application `fieldErrors`; existing application and rejected business-directory paths retain their safe problem responses.
- Separated conflicting organiser discovery routes: applications retain `/api/v1/organiser/events` as an array; programme uses `/api/v1/organiser/programme-events` with pagination. Updated the programme client, generated contracts, specification revision 7 and index; preserved historical revision-6 approval/evidence.
- Assigned `/root/schema_tests` as the independent test owner and `/root/review` as read-only behaviour/security reviewer using generic subagent fallback with repository role instructions. The owner corrected latest-head exact schema assertions to include the four programme tables without changing historical migration expectations; added a shared-backend discovery regression and updated two frontend discovery references after reviewer approval. See the linked [test-change record](../../workflow/agents/runs/2026-10-21-merge-schema-test-correction.md).
- Fixed verification-script exit-code aggregation and original directory/environment restoration; detect storage-flag support rather than applying an unsupported flag to Node 20. CI exempts Node 20 and matches local PostgreSQL 17.
- Starlette's deprecation notice and Vite's chunk-size notice are warnings; no dependency migration or warning suppression is claimed.

## Verification

Complete backend and frontend suites and the frontend production build are being rerun against synthetic local test data. Final results are recorded below after completion. Static independent review approved the scoped implementation/test corrections; teammate review and summary verification remain pending. No commit, push, merge or deployment performed in this session.

- Backend full original suite: 234 passed, one Starlette deprecation warning, 332.65 seconds, process exit 0. The new discovery regression was added after original test collection and passed separately (1 passed in 4.72 seconds), totaling 235/235 current backend cases verified.
- First frontend rerun alongside backend: 216 passed, one creation-journey timeout at 15016ms; build passed. The independent reviewer and test owner approved a finite 30-second ceiling only for that longest interaction test, preserving every interaction/assertion and the global 15-second limit; no latency target is specified. Full frontend rerun alone is pending below.
- Verifier parser check passed. A simulated failed npm test followed by a successful build still produced verifier failure and restored caller environment/directory, confirming native failures no longer disappear.
- Final frontend rerun alone on Node 26.8.2: all 8 files and 217/217 tests passed in 196.29 seconds, process exit 0. Combined current backend/frontend cases verified: 452/452 (backend original 234 plus new regression 1; frontend 217). Production TypeScript/Vite build passed after endpoint/contract edits, with the existing advisory chunk-size warning. No remaining test failure or unresolved Git merge entry was observed. Other Node versions are configured in CI but were not executed locally in this session.
