# Cross-platform run guide

- Date/timezone and session owner: 2026-10-20 Asia/Singapore / Isaac.
- Feature/task, branch and source revision: Developer startup documentation / `master` at `07a5666` before these edits.
- Source coverage: Visible conversation and tool results in this session; no external history used.
- AI factual check: Checked against `docs/DeveloperGuide.md`, `compose.yaml`, backend settings and test configuration, and Vite proxy configuration.
- Human verification: Approved by the team on 2026-10-22.

## Prompts and interactions

The user asked for a comprehensive project status and next steps, then asked how to run and test the current code. Follow-up questions exposed the root-directory `uv sync` error, Vite proxy errors while the backend was not running, Docker Compose stop/down confusion, and the remaining test database attached to the Compose network. The user then asked to correct the Developer Guide command order, requested equivalent macOS/Linux instructions, asked for complete copyable API endpoints, explanations of organiser provisioning, a concise bullet-point version of that explanation, and explicit frontend login/password-change steps after provisioning.

No subagents were invoked. The Vite proxy configuration confirmed that `/api` targets `127.0.0.1:8000`; backend settings confirmed the default frontend trusted origins; the test harness confirmed that it requires distinct `DATABASE_URL` and `TEST_DATABASE_URL` values and redirects application connections to the test target.

## Decisions and actions

Updated `docs/DeveloperGuide.md` to document the startup sequence: start PostgreSQL, wait for it to accept connections, install backend dependencies, set the database URL, apply migrations, start FastAPI, check API/database readiness, and only then start Vite. Added PowerShell and bash/zsh command alternatives for startup, organiser provisioning, backend tests and frontend checks. Clarified separate-terminal environment variables and the destructive reset boundary of the synthetic test database. Replaced API path fragments with complete liveness, readiness and OpenAPI URLs. Explained the `event` and `organiser` CLI subcommands, their arguments, stable event-ID relationship, database target, hidden initial-password prompts, and repeat behavior, then condensed that walkthrough into five short technical bullets. Added the post-provisioning frontend login steps and required initial-password replacement, noting that the backend must connect to the same development database used by the CLI.

No product decisions, implementation changes, commits, or agent handoffs were made.

## Verification and limitations

`git diff --check` completed with no reported issues after the guide updates. Services and tests were not run. Human verification of this summary and documentation is pending.

## Reflection and next steps

The primary confusion came from presenting frontend startup before documenting that its API proxy depends on a running backend. The guide now makes service readiness part of the ordered procedure, gives shell-specific environment-variable syntax, and makes the API links directly usable. A teammate should verify the commands on macOS/Linux; no such execution was performed in this session.
