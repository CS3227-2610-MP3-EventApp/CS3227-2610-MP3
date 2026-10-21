# Test Business applications locally

F06-US01 covers open-event browsing and private draft/create/edit/review/submit. F04-US01 and the status/reason portion of F06-US02 add organiser approval/rejection and the business outcome. Booth/setup and AI remain separate. See [submit r4](../specs/applications/submit-business-applications.md), [decision r2](../specs/applications/decide-applications-and-show-outcomes.md) and [current implementation evidence](../workflow/agents/runs/2026-10-21-open-participation-requests.md). The approved slice is implemented and In review; the run records passing automated/browser evidence and pending human checks. Human/NVDA review is recorded separately.

For all backend and frontend automated tests, use [Run all automated tests in Git Bash](DeveloperGuide.md#run-all-automated-tests-in-git-bash-windows). The website steps below cover manual testing.

## Git Bash startup

Start Docker Desktop. From the repository root in terminal 1:

```bash
docker compose up -d db
docker compose exec db pg_isready -U eventapp -d eventapp
cd backend
uv sync
export DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1
```

Repeat the readiness check until PostgreSQL accepts connections before running migrations. Migrations are additive; do not reset retained development data. The disposable automated-test database on port5433 is separate and is reset by its suite.

In terminal 2, from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open the local URL Vite prints, usually `http://localhost:5173`.

For a fresh synthetic organiser/event, open terminal 3 from the repository root:

```bash
cd backend
export DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
EVENT_ID="$(uv run python -c 'import uuid; print(uuid.uuid4())')"
ORG_USERNAME="manual-org-$(date +%s)"

uv run python -m app.auth.bootstrap event \
  --id "$EVENT_ID" \
  --title 'Manual Test Event' \
  --timezone Asia/Singapore \
  --starts-at 2027-01-01T09:00:00+08:00 \
  --ends-at 2027-01-01T18:00:00+08:00

uv run python -m app.auth.bootstrap organiser \
  --username "$ORG_USERNAME" \
  --email "${ORG_USERNAME}@example.test" \
  --display-name 'Manual Organiser' \
  --event-id "$EVENT_ID"

echo "Organiser username: $ORG_USERNAME"
echo "Event ID: $EVENT_ID"
```

Enter an initial password at the hidden prompts and remember it for first sign-in. A new organiser must replace that password in the website before opening its workspace. The generated identifiers avoid overwriting an existing event/account. Alternatively, use an existing assigned organiser and its existing event/password; provisioning does not reset credentials. These are local synthetic records, not production accounts.

## Website journey to verify

Use synthetic accounts and contact data. Keep the Business and organiser sessions in separate browser profiles or normal/incognito windows, because accounts share a session cookie within one browser profile.

1. Sign in as the organiser. On the initial password-change screen, try the initial password again: expect "The new password must be different from your current password." Try an incorrect current password with a different valid replacement: expect a specific current-password error without being signed out. Required fields, 8-128 character bounds and confirmation mismatch must explain how to correct them. Then use a valid different password.
2. Open **Application Reviews**. The assigned-event selector must show **Manual Test Event** (or your event title), rather than a UUID alone. Applications start closed. Turn on **Accepting applications**, choose **Save application settings**, check the exact event/change, then **Confirm settings**. Cancelling this confirmation must send no change.
3. In a separate Business session, register a synthetic Business account and open **Applications**. Select the named open event; no Business ID exchange or prior grant is needed. Complete participant type, description, requested space, contact name and contact email, then **Save draft**. Reload and verify the saved draft returns.
4. Check the organiser submitted list: the private draft must be absent. Close applications, then return to the existing Business draft: it remains visible/editable, but submission is unavailable until reopening. A different business without an existing application must not discover this closed event.
5. Reopen applications. Edit and save the draft. Choose **Review submission**, verify the exact saved content/revision and freeze warning, and cancel once. Open review again and **Submit application**. Expect read-only frozen content and pending organiser decision, with no edit/resubmit control.
6. In Application Reviews, open that submitted application, identified by business name. Choose **Reject application**: an empty/whitespace reason must explain that a reason is required. Enter a synthetic applicant-visible reason; review **Confirm decision**, then **Confirm rejection**. Alternatively choose **Approve application**, optionally supply a reason, and **Confirm approval**. Use another synthetic business/application to exercise the other outcome. Cancel sends no write; repeated activation must produce only one decision.
7. Reopen the Business record: it must show its own authoritative Accepted/Rejected status, shared reason and decision time, with the original frozen content unchanged. No booth/setup details should be invented. A second decision is unavailable; stale sessions must refresh the current state rather than overwrite it.
8. Close applications after submission and confirm organiser review/decision still works. Restart FastAPI against the same database and reload both sessions: settings, frozen application and decision remain. Sign out and revisit protected history: private content must not return.

Check recoverable errors preserve same-scope input, stale conflicts offer explicit refresh, and ambiguous write responses reconcile authoritative state before another attempt. Test keyboard order/error focus, Chrome+NVDA, 320 CSS-pixel width, actual400% browser zoom and reduced motion; record observed results separately. Automated DOM checks or reflow simulation do not establish human screen-reader/zoom conformance.

## API checks

Use separate private cookie sessions. Every mutation needs the exact trusted Origin, normally `http://localhost:5173`. Keep passwords/cookies out of scripts and logs. Never run automated destructive test suites against retained development data.

- `GET /api/v1/organiser/events` returns only the current organiser's assigned named summaries; CurrentActor v1 is unchanged.
- `GET /api/v1/organiser/events/EVENT_UUID/application-settings` returns `{eventId,applicationsOpen,revision}`, initially false/revision1. PUT the same path with `{"expectedRevision":1,"applicationsOpen":true}`. Use the actual loaded revision for subsequent changes. Same-value updates at current revision are unchanged; stale requests conflict.
- `GET /api/v1/business/application-events?businessId=BUSINESS_UUID` returns open events plus this business's own existing applications, with names/dates/timezone and availability. Discovery creates no records. Legacy `/business-approvals` GET/POST returns scoped410 and creates no grants.
- Create with `POST /api/v1/business/applications` and JSON below while open. Expect201 and one private draft/participation per business/event.

```json
{"businessId":"BUSINESS_UUID","eventId":"EVENT_UUID","participantType":"exhibitor","description":"Synthetic studio application","requestedSpace":"One table","contactName":"Synthetic Contact","contactEmail":"contact@example.test"}
```

- GET own detail `/api/v1/business/applications/APPLICATION_UUID` or list `?businessId=BUSINESS_UUID`. PUT detail with `expectedRevision` and all five content fields (omit business/event selectors); editing remains permitted while closed. Stale revision409 preserves state.
- POST detail `/submit` with `{"expectedRevision":CURRENT_INTEGER_REVISION}` while open. It freezes content revision n and produces record revision n+1. Repeated submit/edit fails without changing frozen content/time.
- Organiser GET `/api/v1/organiser/events/EVENT_UUID/applications` and detail `/APPLICATION_UUID` exclude drafts (detail404). Submitted/decided records include businessName, eventTitle and nullable decision.
- POST organiser detail `/decision` with `{"expectedRevision":SUBMITTED_RECORD_REVISION,"outcome":"rejected","reason":"Synthetic reason"}` or accepted with optional/null reason. Decision increments record revision, preserves frozen revision/time, and returns BusinessApplication v2. Rejection requires1-1000 trimmed characters; acceptance max1000. Once decided, repeated/competing calls return409 with only the authorised currentApplication. Use the submitted RECORD revision, not frozen content revision.

Record denial/state-preservation checks: unauthenticated/wrong-role/unrelated/revoked actors; draft/wrong-event organiser access; missing/untrusted Origin; strict types/unknown fields; absent versus unlisted closed event create; settings/edit/decision conflicts; no-store on success/error. Verify other businesses cannot see contacts/reasons. Confirm no booth/publication/preparation side effects. Preserve fresh synthetic records across API/database restart; do not reseed to simulate persistence. Record actual observations and failures, not inferred passes.
