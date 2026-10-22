# Independent behaviour + security review: F03-US02 answer-event-questions

Snapshot: branch feat/yikbing-event-qa at f115412 (diff vs protected baseline df37359). Spec: `specs/attendee-planning/answer-event-questions.md` revision 2. Reviewer: one independent behaviour_verifier run doing a combined behaviour and security pass. It is not the implementer or the test designer. Test database used by this process only, one test process at a time.

Checks run:
- `tools/check_test_baseline.py --baseline df37359… --paths backend/tests frontend/tests backend/pyproject.toml frontend/package.json frontend/vite.config.ts <test plan>`: "Protected paths match". `git diff df37359 f115412` touches no test, fixture, runner or config file. No skip, xfail or `.only` markers.
- `uv run pytest tests/test_attendee_event_questions.py`: **50 passed** (207 s).
- `npx vitest run tests/attendee-event-questions.test.tsx`: **30 passed** (96 s).
- Offline probes using the backend venv (`python -I`, no DB): pydantic and summary edge cases (results below).
- Mutation runs on a `git archive f115412` copy in the scratchpad, without `.env` and with repo files untouched: 8 mutants, results in the baseline section.

## Findings

### Blocking
None found.

### Should fix
S1. **The summary check misses URL-like and email-like text.** Spec: withhold summaries with "URLs, email-like text, markup characters". Code: `backend/app/attendee_ai/questions.py:87-88,211`. `_URL` only matches `https?:`, `www.` and `://`, and `_EMAIL` needs an ASCII `@`. Each of these probe strings was **kept** as a valid summary: `Pay at evil.example.com now`, `hxxp evil[.]com`, `[click](evil.example)`, `javascript:alert(document.cookie)`, `//evil.example/x`, `data:text/html,hi`, `mail me at a＠b.com` (fullwidth @), `**Free** entry \`code\``, `&lt;b&gt;`.
- Scenario: indirect injection in a venue name or accessibility text gets the model to write "Tickets moved to pay-now.example.com", and the page shows it under "AI summary".
- React escapes the text and makes no link, so there is no XSS. The risk is social engineering and a spec deviation (AC04/AC05, SEC03).
- Fix: withhold on any bare domain (`[\w-]+(\.|\[\.\])[a-z]{2,}`), any `scheme:` token, `//`, `[`, `]`, `(`/`)` after `]`, backticks, `*`, `_`, `#`, `&…;`, and `@`/`＠`. Normalise the summary with NFKC before checking. Add the probe strings above to the summary matrix through a test-change request.

S2. **The "numeric token" check only sees ASCII-style decimal digits.** `questions.py:89,215-216`: `\d` matches Unicode Nd only, so fullwidth `１０` is correctly withheld. But superscripts and circled or Roman numerals pass (`Costs ²⁰ or ① or Ⅻ` was kept), and so do spelled-out numbers ("costs five dollars"). Grounding is also token-level across all claim values: once a `startsAt` claim is cited, the date and offset tokens (`2026`, `10`, `22`, `08`, `00`) ground those numbers anywhere in the sentence, e.g. "costs 22 dollars".
- Fix: NFKC-normalise first, treat any `unicodedata.numeric()` character as a digit, and document that spelled-out numbers and context-free token grounding are known limits (the summary is non-evidentiary). Criterion: AC05.

S3. **The frontend keeps polling forever after an error.** `frontend/src/attendee-planning/EventQuestions.tsx:671-676`: `.catch(() => undefined)` followed by `finally` → `setPolls+1`. If the job is gone (404 after cleanup or a server-side race), the session expired (401), or the network is down, the page polls every 2 s indefinitely and the user sees no message. Fix: stop on 401/403/404 and show "Check the status later / browse the programme", and back off or cap the number of attempts for status 0 and 5xx. Criterion: AC06 (failure states).

S4. **The cleaned question is not always NFC.** `questions.py:95-100` normalises *before* removing format characters. Probe: `"e​́ x"` → `"é x"` (decomposed), and `is_normalized("NFC")` is False. The spec says NFC applies to the cleaned question. Fix: normalise again after removal. Low impact, but it is a contract mismatch. Criterion: AC04.

### Notes
N1. **Value comparison** (probed): JSON `true`, `1.0`, `1e2` and `NaN` are rejected by the strict `RawClaim` (bool and float are not StrictInt). `-0` → 0 and a 30-digit int validate and compare correctly. Duplicate JSON keys resolve last-wins in both `json.loads` (outcome routing) and pydantic (`{"outcome":"answered",…,"outcome":"unknown"}` is routed and validated as unknown on both paths). So I found no parser-differential bypass. `datetime.fromisoformat` also accepts compact ISO (`20261022T100000+0800`). That is acceptable as "compared as instants", and naive times are rejected. Exact duplicate claims are accepted and shown twice. The spec only rejects contradictory duplicates, which cannot both pass value equality. Consider dropping exact duplicates.

N2. **Datetime claim `value`** is stored as `fact.startsAt.isoformat()`, filled by the server and so correct. The baseline cannot detect a regression to the model's string (see the mutation table).

N3. **Outbound data** (`questions.py:172-181`) contains exactly: event title and timezone; per item ID, revision, title, type, state, start, end, room, venue name and address, price, capacity, accessibility and cancellation reason; and `question` as its own JSON field. It carries no owner, job, request or event IDs and no preferences. The system prompt has no secrets. The transport rejects `tool_calls`/`function_call` (`app/ai/provider.py:90`), uses `max_tokens` 4000, and checks input and output caps at 40,000 characters. The question path checks `input_too_large` before `_dispatch`, so `providerMayHaveRun` stays false (`worker.py:565-567`).

N4. **Workflow separation** checked in `service.owned` (workflow-scoped, 404 across workflows), in the active-job and daily counts in both `create_job`s, and in replay. Replay across workflows gives 409 either way: question replay compares `workflow`, and itinerary replay checks `workflow != "itinerary"`. The `_claim` FIFO serves both workflows. A question job never reads planning rows. Recovery and cleanup (`service.py` `recovery`/`cleanup`, wired in `ai/worker.py:295-298 --cleanup`) cover both workflows because neither filters on workflow. The shared per-minute cap counts both attempt tables in both slices (`ai/worker.py:169-171`, `attendee_ai/worker.py` `_dispatch`).

N5. **Races** checked by inspection. Cancel locks the job row. `_dispatch` and `_finish` lock the row and require `running`, so a late result after a cancel is discarded (this is tested). Create is serialised on the user row lock.

N6. **Stale logic** (`questions.py:140-145`): an answered job is stale when any cited item's latest revision differs or the item is missing. An unknown job is stale on any map inequality (change, new item, cancel). `latest_revisions` includes cancelled items, and `question_facts` uses the same source, so the two maps are consistent. The check runs on every read, including replay.

N7. **Unknown-reason link** goes to the catalogue `/attendee/programme` (`EventQuestions.tsx:723`) rather than this event's programme. The stale and unknown explanations are plain text outside the live region, so screen-reader users only hear "Status: Completed". Consider putting the outcome sentence in the `role=status` text. If the user navigates to another event while a create POST is in flight, the old job can render under the new event (`submit` does not check `eventId`; minor).

N8. **Log label**: `worker.py:149` logs "AI itinerary provider attempt failed" for question jobs too. It carries the code only, so there is no leak. Cosmetic.

N9. **Pre-clean cap**: `AskQuestion.question` has `max_length=2000` (`schemas.py:304`). Raw input longer than 2000 characters that would clean to 300 or fewer gets 422. This is a reasonable DoS bound that the spec does not state. Record it in the spec or accept it.

N10. **404 rule and cancelled items**: an event whose only items are cancelled is *not* 404, because `question_facts` includes cancelled items. Consistent with AEQ-04, but "no published items" in the spec is ambiguous.

N11. **Migration** (`20261022_0009`): additive, single head, and the downgrade deletes question rows before restoring NOT NULL. The downgrade and upgrade cycle passes in the protected test, but that test has no question rows present, so the `DELETE` path is not exercised.

N12. **Untyped result in OpenAPI**: `QuestionJobView.result` is an untyped `dict`, so OpenAPI does not describe the result union. The frontend `questionApi.ts` guards shapes at runtime.

N13. **Spec status**: the spec header still says "2 / Draft" and "Review / run record: Pending". The orchestrator should reconcile this with the recorded approval.

N14. **Frontend** confirmed by reading code and by the passing UI tests:
- Model and programme text is rendered as React text only, with no `dangerouslySetInnerHTML`. The only links are internal and built with `encodeURIComponent`.
- Double submit is guarded by a ref plus `disabled`.
- The polling timer is cleared and aborted on unmount, job change and event change.
- The status line is `role=status`, and error and failure alerts are `role=alert` (MUI default).
- The notice is linked through `aria-describedby`.
- There is no checkbox.

## Baseline adequacy (mutation-style)

Mutants actually run on a scratch copy (targeted test with `-k`):

| Mutant | Result |
| --- | --- |
| Summary digit grounding removed | killed (`summary_is_kept`) |
| Answered stale uses the unknown rule (any change) | killed (`changes_to_uncited`) |
| Unknown stale uses the answered rule | killed (`unknown_result_becomes_stale`) |
| Question active-job filter drops `workflow` | killed (`do_not_block_each_other`) |
| `owned()` drops the `workflow` filter | killed (`foreign_missing_and_non_question`) |
| Claim revision check removed | killed (`fabricated_wrong_revision`) |
| `_matches` type check removed (`claimed == actual`) | **survived**. Equivalent mutant: the strict pydantic schema already rejects bool and float, and `"500" != 500`. Only defence in depth is lost. |
| Claim `value` copied from the model instead of the record | **survived** (`datetime_values_are_compared…`, `answered_result_shows…`). `same_value` accepts any equivalent instant, so a model-formatted datetime string would pass as the shown value. Spec: "value… filled from the authoritative record". |

By reasoning (not run), these would still pass if the behaviour were broken:
- The URL and email bypasses in S1 and the non-Nd numerals in S2: the summary matrix has no bare-domain, scheme-less, fullwidth or markdown cases.
- NFC after removal (S4): the NFC case has no format character between the combining sequence and its base.
- Audit action naming: the test checks that the actions are distinct, not their names. Using `itinerary_job_complete` for questions would pass.
- Cross-workflow request-ID replay (question ID reused for an itinerary, and the reverse) has no test. The implementation gives 409 either way.
- Recovery of stuck question jobs (lease or deadline expiry) has no test. Recovery covers both workflows by code inspection.
- The shared per-minute cap is never exercised for questions (the tests set 90 per minute).
- Migration downgrade with question rows present (N11).
- Frontend: poll error handling (S3), a slow create POST during event navigation, and the destination of the unknown-reason link.

Strong: the outbound isolation and canary tests, the 128-variant invalid-output, obedient-output and altered-value matrices, the instant comparison, stale on every read, change during generation, cancel during the call, per-workflow quotas in both directions, concurrency for create and replay, the Origin matrix, cleanup through the real `--cleanup` subprocess, and the audit and log canaries.

## Could not verify
- I did not run the full backend or frontend suites, the F03-US01, organiser or schema regression (reported by the orchestrator as passed; not re-run here), build, lint, `tsc`, or OpenAPI regeneration drift.
- I made no live SoCLaaS call and did no real-provider validation. The spec requires real-provider evidence and this review provides none.
- Behaviour with multiple workers and under load, and the absence of deadlocks, were checked by inspection only.
- I did not run a browser or check keyboard and screen-reader behaviour beyond the markup and the jsdom tests.
- I did not test a real model's susceptibility to prompt injection. The tests use a fake provider, so they prove the server controls, not the model's behaviour.
- Human teammate review and privacy approval for real data (D06) are still pending.
