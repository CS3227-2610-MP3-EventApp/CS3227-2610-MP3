# Complete F06-US01 through the frontend

Date: 2026-10-21 Asia/Singapore. Orchestrator: /root. User requests fully deliver F06-US01 before giving manual testing instructions. No push, merge or deployment authorized.

## Starting state and scope

Approved application r2 backend remains In review, with historical automated and independent evidence in the previous run. Active protected baseline is `dbc06c108ab8407ffeaae61aa72ef0e3183d22b2`. Existing dirty backend, generated API, shared UI/foundation docs and prior logs are preserved. No developer owns protected tests. Human upstream/log review remains pending; earlier explicit exception authorized backend only. Shared UI r3 exact approval and a concrete frontend scope/prerequisite continuation decision are being prepared, not invented.

## Actual assignments

- /root/f06_frontend_contract: specification_analyst, fixed role Luna/high; owns proposed r3 frontend amendment in existing application spec only; approved r2 remains unchanged. Existing non-Draft audit/amendment is outside draft-spec; no skill-based downgrade or second competing spec.
- /root/f06_frontend_tests: test_case_designer, fixed Sol/high; read-only frontend/tooling/scenario preparation pending concrete contract approval; later new acceptance tests and plan ownership.
- /root/f06_frontend_readiness: behaviour_verifier, fixed Sol/high; independent read-only prerequisite/coverage preparation, no implementation edits or DB access.
- /root owns approval questions, run/log/index, browser inventory and service coordination. No developer assigned yet.

## Environment evidence

Current CUA inventory attempt failed before interaction: node kernel exited, Windows sandbox helper_unknown_error setup refresh failure. Browser checks have not run. Shell tools run via authorized require_escalated execution due the same sandbox failure. No browser tests are represented as passed; alternative real-browser verification feasibility is being investigated.

## Pending gates

Shared UI r3 approval asked asynchronously with WCAG/reflow, Chrome + NVDA, timing, private-memory and truthful feedback choices. Application frontend proposal is being prepared before exact approval. Protected test design/review/baseline precedes implementation. Pending human verification cannot be claimed completed by agents.

## Approval and browser feasibility update

Isaac explicitly answered ?Approve revision 3; Chrome + NVDA? to the exact shared UI r3 approval question on 2026-10-21. Root recorded Ready metadata, preserving historical unexecuted evidence and production sign-off caveat. Application frontend amendment is still being prepared.

Fallback real-browser automation is feasible without dependency installation: root started an isolated headless Chrome/156.0.8078.35 process PID 36464, loopback CDP port 9223, temporary profile `eventapp-f06-chrome-4b51fd93158b4080b177416544c8e5dc` under TEMP. Chrome version endpoint responds. This is browser availability only, not a journey pass. Native CUA remains unavailable. Root will close only the owned Chrome/profile during cleanup. NVDA/human visual review cannot be fabricated.

## Exact frontend authorization

Isaac answered ?Approve r3 and proceed with human checks pending? to the saved F06 frontend amendment on 2026-10-21. The question described AC09?16 plus explicitly replacing the two all-preview expectations; final saved AC17 records this same live-card scope, not an additional domain-policy choice. Approval includes continuation while upstream human and NVDA checks remain pending, extending the earlier backend-only exception. Root records application revision3 Ready; baseline/review gates remain.

Developer prep assignment: /root/f06_frontend_developer is actual generic Sol/high applying `.codex/agents/developer.toml` responsibilities for auth/private-lifecycle/integration risk under the documented escalation policy. Fixed Luna custom-role model and read-only .codex config mean explicit generic escalation, not silent model substitution. Read-only prep only until root baseline handoff; no source/test edits authorized yet. Shell sandbox failed initially; root supplied require_escalated/login:false working execution method.

Test owner assigned new App-level acceptance/fixture files and the two narrowly scoped historical expectation changes under APP-UI-TCR-01. Independent behaviour/security assessment precedes corrections; saved test adequacy and immutable baseline precede implementation. Browser UI?API?DB follows source delivery. No actual human/NVDA execution is claimed.

Actual browser harness check PASS: isolated Chrome156 opened existing production preview /login, document title EventApp ? Log in, and same-origin `/api/v1/health/ready` returned ready through Vite preview proxy. This establishes available browser-to-API transport only, not new application UI coverage. Source inspected installed Vite confirms preview proxy inherits server.proxy; no runner/dependency changes. Owned local API PID35708, production preview PID36872. Isolated Compose project `eventapp-f06-ui-20261021` owns newly created development volume; migrations0001?0002?0003 applied only there. Root temporary Node CDP and harness-check files contain generic helpers; generated synthetic account credentials will stay runtime-only.

## Pre-implementation test adequacy and freeze

Test owner /root/f06_frontend_tests independently authored 49 final parameterized cases and a stateful wire fixture, plus only the two approved historical preview expectation corrections. Initial meaningful RED against existing UI: 31 failed/3 passed out of34 in38.26s; valid new application routes redirect instead of rendering missing headings, not import/harness failure. Final expanded collection49 PASS and standalone TypeScript fixture/test compile PASS are owner-attributed; no full expanded RED repeat claimed. Both /root/f06_frontend_readiness and /root/f06_frontend_security independently approved the final saved cases after targeted lifecycle, boundary, response-projection, reconciliation and navigation additions. Neither reviewer implements or changes tests.

Reviewed acceptance SHA256 `8F6599C38643558FAABBDB2D5CE5F7D580C1BAFE58E99E74F9CD63112266EDDF`; fixture `7FFCFFE08944DB7355D88CD9AD80D7F80FA23E4E76243FB54AEDB143473749E9`; session/home `C6386608A4FA3826365887DD02CBA913B98074BDAC86D15F79E2B757EF57D908`; appearance `4BA6059D64195C1941171FF50EAB5EE1B427528670916E87B7C83D56648451B3`. Existing backend/auth tests, fixtures, runner/config and old protected plans remain unchanged against prior baseline.

Freeze includes the six test-owner files, approved application/shared-UI contracts and this run. The protected set extends every prior path with new frontend plan/TCR; frontend/tests already covers both newfiles. Full set: backend/tests; frontend/tests; backend/pyproject.toml; backend/uv.lock; frontend/package.json; frontend/package-lock.json; frontend/vite.config.ts; workflow/agents/runs/2026-10-19-authentication-test-plan.md; workflow/agents/runs/2026-10-19-auth-test-change.md; tools/check_test_baseline.py; workflow/agents/runs/2026-10-20-business-applications-test-plan.md; workflow/agents/runs/2026-10-20-business-applications-test-change.md; workflow/agents/runs/2026-10-20-business-applications-test-change-02.md; workflow/agents/runs/2026-10-21-business-frontend-test-plan.md; workflow/agents/runs/2026-10-21-business-frontend-test-change.md. Root records immutable commit SHA after commit, before developer authorization. Source/backend/generated files remain unstaged; no feature implementation commit/push/merge/deploy.

Immutable frontend baseline: `ad41fca42c1517907bc76c1f1e47bffc8eb63657`, local test/contract/run-only commit before source implementation. Full15-path guard PASS before developer authorization. Final plan SHA256 `EAB938EC0820E56870CEA38F9B575F44CFE35DE675C6513831A5967A55121F9C`; TCR `76151E350F6C860D615082DD3076324DAD35F1D329DB6D8D9BFFDD865DA8ABBB`. Source-only developer handoff authorized after this freeze/guard.

## First source pass and execution-budget dispute

Developer first focused49 run:43 pass/6 fail. Five behavioural/test-interaction findings were repaired and their affected rerun passed. Keyboard-only full journey still reached Vitest's default5000ms limit; developer reported two unsuccessful performance optimizations rather than editing the protected test or claiming a normal-command pass. Isolated diagnostic `--testTimeout15000` completed every existing keyboard assertion in5.83s (8.59s command), developer-attributed, not final passing-suite evidence.

Test owner independently investigated the87-character user-event/tab/React-MUI/jsdom workload and proposed APP-UI-TCR-02. Behaviour verifier independently read the exact scenario, config and approved UI timing rules and classified a test execution-budget defect: no whole keyboard-journey5s product SLA exists; separate200ms/10s presentation checks remain unchanged. Security reviewer approved the narrow scope with no weakening of keyboard/privacy/submission expectations. Root authorized owner to add10000ms ONLY to that test, retaining every action/assertion/input/tab limit, global runner/config and timer checks; saved patch review and new immutable baseline precede final developer checks. No extra user product approval is inferred or needed for an unchanged-behaviour harness correction.

Held source before correction: root44-file fingerprint `b708fcd112dd2aa3312cf5eb82ad38db340482c2b8666f7d312b60dca2dc3b8f` over sorted `(path,SHA256 bytes)` compact JSON under backend/app, backend/alembic, backend/openapi.json, frontend/src. Developer's distinct8-file path+NUL+raw-byte recipe fingerprint `b6ec82331657f828636a31c828fd995a9a5fe9c2e7b95f12ba4ceab5121f6d4f`; not claimed identical recipes. Original15-path guard againstad41 PASS before any owner correction. Developer flagged three bounded source self-review improvements and EOF whitespace cleanup; these remain held until replacementbaseline.

Root preliminary real Chrome journey passed registration, approved-event empty state, organiser login/password replacement/grant, private organiser draft404, save/edit/reload/review-cancel/frozen submit, organiser submitted detail,320px reflow, AX heading, no private browser storage, controlled production pending-feedback conditions, and API/database restart persistence. Temporary harness ultimately failed its own incorrect sign-out location assumption: sign-out is on Overview, not application page. Harness now follows the real Overview link. Earlier harness-only label/link timing mistakes were corrected without production/test expectation changes. Preliminary screenshots showed the developer's already identified initial non-ASCII encoding issue; final UTF-8 build and final snapshot browser rerun remain required. Restarted owned API PID30564; PIDfile tracks subsequent owned restarts. No preliminary result is represented as final independent approval or human/NVDA evidence.

Both independent reviewers approved the saved APP-UI-TCR-02 one-argument diff. New acceptance SHA256 `92B9D85F7B3E6C54483CB56CBED864717BC39A23FA82A03668746779EEE5E81A`; fixture and prior legacy corrections unchanged. Replacement protected set adds `workflow/agents/runs/2026-10-21-business-frontend-test-change-02.md` to all15 prior paths. Root will record replacementcommit before releasing the held source.
