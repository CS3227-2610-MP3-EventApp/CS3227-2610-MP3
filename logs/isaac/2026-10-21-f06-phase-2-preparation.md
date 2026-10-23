# F06 phase 2: manual preparation contract

- Date/timezone: 2026-10-21, Asia/Singapore; owner: Isaac.
- Branch: `itzxitzx/basic-business-features`; prior checkpoint: `cf63022`.
- Sources: visible chat, repository contracts and actual specialist handoffs; no missing history reconstructed.
- AI factual check: checked against stated evidence; final review results recorded below.
- Human verification: Pending; reviewer/date/corrections not supplied.

## Prompts and interactions

Continuation of [phase 1](2026-10-21-f06-phase-1-review.md). Isaac requested phase-by-phase implementation, a local commit after each phase, conversation/orchestrator-pipeline summaries in logs/isaac and token savings. The orchestrator inspected the clean worktree and existing contracts. Phase 1 remains pending human checks; its local checkpoint commit does not claim completion. Independent manual preparation drafting can proceed from existing participation context.

## Actual pipeline and ownership

- `/root` orchestrator: read authoritative workflow/security/contract sources, assigned bounded work, coordinated independent revisions and owns this log plus minimum index changes.
- `/root/f06_sequence`, specification analyst: sole edit ownership of `specs/business-preparation/manage-preparation-tasks-and-budgets.md`; assigned r1-to-r2 Draft refinement under draft-spec. No application, test, migration, shared architecture or commit ownership.
- `/root/preparation_scenarios`, test designer: read-only proposed scenarios against r1 and proposed defaults, no executable tests or baseline. Identified that application edits can change participation revision; preparation must have an independent revision and preserve other domain records.
- `/root/f06_status`, behaviour verifier: assigned independent r2 Draft completeness/testability review, no edits or implementation audit.
- `/root/preparation_security`, security reviewer: assigned independent r2 Draft security review, no edits or runtime/security compliance claims.

Agents were instructed not to spawn nested agents or overwrite others. Read-only inspection required reviewed elevated shell execution with login disabled because sandbox helper setup failed; the test designer initially reported the failure and successfully retried this read-only route. No provider calls, private records or secrets were used.

## Proposed decisions, not approvals

Recommended bounded scope: SGD only; integer quantities 1–10000; nullable integer unit prices 0–100000000 cents; at most 200 tasks and 200 budget lines per participation. Tax/shipping are explicit lines, quotation requires known price and plain-text basis. Missing prices remain unknown; totals show known subtotal and incompleteness. Manual preparation remains editable without a separate accepted-budget lifecycle. Current active owner access follows existing auth scope and any own existing participation independently of decision status. Whole-document optimistic saves use a preparation-only revision and authoritative reconciliation after an uncertain response.

These are product proposals for exact-spec approval. Existing D01 explicitly requires human agreement before Ready. The drafting skill says: “Resolve blockers and record human approval of the exact spec/contract revisions before Ready” via the canonical template, and ends at Draft. The user authorized implementation of the phase roadmap, which did not resolve those explicitly listed product choices; no agent has approved them.

## Planned verification, not executed

Independent designer scenarios: own business across two events; strict numeric bounds, null versus zero and exact totals; unrelated/inactive/organiser denial with unchanged data; stale/concurrent saves; malformed batches and storage failure atomicity; lost-response reconciliation; private UI input/scope/late-response handling; real API/database restart retrieval without reseeding; manual operation without AI. Check both directions of preparation/application revision isolation. Scenario IDs must follow the final r2 criteria before independent adequacy review and executable baseline creation.

No application implementation/tests, protected baseline, provider integration, deployment, push or merge in this drafting checkpoint. Phase 2 is not implemented or completed. Human product approval precedes implementation and its independent test-baseline gates. Later phases remain unimplemented.

## Draft review and checks

Analyst saved r2. Independent behaviour review found ambiguous request/response fields, generated-ID reconciliation, missing explicit private-UI/auth inheritance and undefined line-total presentation. Security review independently requested active-owner/current-role/password-change enforcement, trusted Origin, no-store, bounded fields and authorization before conflict metadata. Analyst made an initial remediation. To finish the bounded checkpoint, the orchestrator interrupted the analyst, took ownership of the remaining Draft corrections, and requested final read-only rechecks from both reviewers. This was specification editing only; neither reviewer implemented the reviewed changes.

Final corrections distinguish strict writable fields from computed response fields, reject invalid expected revisions, return canonical UUIDs, retain array order, compare editable content after lost responses without generated IDs, define canonical client line arithmetic, apply both GET/PUT permission/password rules and shared UI privacy/revalidation. The decision table was repaired and the minimum spec-index row updated to r2/AC01–10. Reviewer recheck results and whitespace check follow below. Human approval and summary correctness remain pending.

Final independent rechecks: `/root/f06_status` confirmed all three reported contract blockers resolved; `/root/preparation_security` confirmed its auth/privacy/validation clarifications resolved. Both reported no remaining blocker within their bounded Draft review and explicitly left D01–D03, implementation/tests and baseline gates pending. `git diff --check` passed with no output. Only the assigned spec, its index row and this session log are included in the Draft checkpoint. No full feature/phase completion is claimed.
