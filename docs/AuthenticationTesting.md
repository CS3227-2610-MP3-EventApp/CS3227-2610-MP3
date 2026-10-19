# Authentication manual testing

The implementation is on `feat/shared-authentication`. These flows exercise the real API and PostgreSQL, while the dashboard feature cards remain previews. Use synthetic details only for local testing.

## Launch using the existing test database

From the repository root:

```sh
docker compose --profile test up -d test-db
cd backend
uv sync
export DATABASE_URL='postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test'
export ENVIRONMENT=development
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1
```

If an older backend is already running in your terminal on port 8000, stop it with Ctrl+C before restarting. In another terminal, from the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173` or `http://127.0.0.1:5173`. If Vite chooses another port, stop it and free port 5173 or explicitly configure the backend's `TRUSTED_ORIGINS` for that port. The Vite proxy still targets backend port 8000. These commands deliberately use the already configured container on port 5433 to avoid the workstation's existing port-5432 listener.

This database is disposable: the automated backend suite resets its schema. Do not run it concurrently with manual testing or expect manually created accounts to survive a later test-suite run. For daily development, use the separate development database described in the [developer guide](DeveloperGuide.md#backend-foundation).

## Prepare an organiser

Open another terminal, enter `backend/`, and set the same `DATABASE_URL` shown above. Then run:

```sh
uv run python -m app.auth.bootstrap event --id 22222222-2222-4222-8222-222222222222 --title 'Development Event' --timezone Asia/Singapore --starts-at 2027-01-01T09:00:00+08:00 --ends-at 2027-01-01T18:00:00+08:00
uv run python -m app.auth.bootstrap organiser --username dev-organiser --email organiser@example.test --display-name 'Development Organiser' --event-id 22222222-2222-4222-8222-222222222222
```

Choose and confirm an initial password at the hidden prompts. Repeating the same seed commands succeeds without resetting an existing organiser's password or reactivating inactive membership. Use a different account name if you need to repeat the first-login password-change flow from scratch.

## Test flows and expected results

| Flow | Steps | Expected result |
| --- | --- | --- |
| Attendee registration | Attendee tab → Create account; enter valid synthetic details and matching password | Opens attendee workspace; your display name appears; refresh preserves login |
| Business registration | Sign out → Business tab → Create account; enter new identity and business name | Opens business workspace; registration creates the business and owner together |
| Global uniqueness | Try an existing email or username under the other registration role; try an existing business name with different casing or extra spaces | Generic registration conflict; no extra account/business is created |
| Form boundaries | Submit empty fields, invalid email, two-character username, seven-character password, mismatched confirmation, and eight spaces as confirmation for a normal password | Clear associated errors; remains on registration; no account is created |
| Login identity | Sign out, then log in once with username and once with email; vary identifier casing | Both work with the correct role and password |
| Wrong role/credentials | Choose Organiser for an attendee account; separately use a wrong password or nonexistent username | Same generic invalid-credentials message; no organiser access |
| Seeded organiser | Organiser tab → log in with seeded identity and initial password | Password-change screen appears before dashboard; no public organiser registration link |
| Initial password replacement | Attempt the same password; then a different 8–128-character password with matching confirmation | Same password is rejected; valid replacement opens organiser workspace; old password no longer works |
| Other-session revocation | Log into one account in a normal and a private browser window; change password in one; refresh the other | Changing window remains signed in; other window returns to login |
| Logout and direct URLs | Sign out; use browser Back and visit `/attendee`, `/business` or `/organiser` directly | Login is required; browser history cannot restore authentication |
| Backend restart | Stay signed in, stop/restart FastAPI using the same DB URL, refresh | Same account/session restores while within its seven-day lifetime |
| Theme and keyboard | Toggle light/dark, refresh; use Tab/Enter on forms and sign-out | Preference persists; both themes remain readable; actions keyboard-operable |
| Unavailable backend | Stop FastAPI, then submit login or refresh; restart and retry | Visible recoverable error; never claims successful login or logout while server is unavailable |

The Network panel can confirm `/api/v1/auth/me` restores identity and that auth mutations call the API. In browser storage, only the appearance preference is retained; the HttpOnly session cookie cannot be read by JavaScript. The browser controls its cookie attributes. PostgreSQL inspection and direct API permissions are also covered by the automated suite.

## Automated checks

Run from `backend/` with separate development and synthetic test targets:

```sh
export DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
export TEST_DATABASE_URL='postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test'
export EVENTAPP_ALLOW_TEST_DB_RESET=true
uv run pytest
```

The test harness replaces the application connection with the validated test target; it does not use the development DB for test data. From `frontend/`, run `npm test` and `npm run build`. Current verified results: 65 backend tests, 75 frontend tests, and a passing build. A pre-existing bundle-size warning and upstream TestClient deprecation warning remain non-fatal.

Human browser verification is pending. The agent completed real HTTP/proxy and backend/database restart checks, but did not operate Safari after access was denied.
