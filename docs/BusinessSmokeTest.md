# Business role smoke test

A copy-and-paste walkthrough of every Business feature: F06 (applications, setup, Preparation & Budget, AI Preparation Draft) and F09 (promotional concepts, supplier research, procurement proposals). Every command and form value below is a ready-made example; nothing needs renaming. Each step lists what to do and what you should see.

Commands are given for **Windows PowerShell** and **macOS/Linux (bash/zsh)**. Git Bash on Windows uses the bash commands. Run commands from the repository root unless a step says otherwise.

> EventApp has no website screen for creating events or organiser accounts; an operator CLI does that (by design, see [access-authorised-workspaces](../specs/shared/access-authorised-workspaces.md)). Step 2 runs it once with the example values below. Everything else happens in the website.

## Example values used throughout

| What | Value |
| --- | --- |
| Event | Singapore Makers Weekend 2027, Asia/Singapore, 6 Mar 2027 10:00 – 7 Mar 2027 18:00 |
| Organiser username / email / name | `smoke-organiser` / `smoke-organiser@example.test` / Jordan Lim |
| Organiser initial password (typed at the CLI prompt) | `SmokeOrganiser-Init-2027` |
| Organiser new password (set at first login) | `SmokeOrganiser-Live-2027` |
| Business account name / email / username | Priya Raman / `priya@kopi-and-clay.example.test` / `kopi-and-clay` |
| Business password | `KopiClay-Smoke-2027` |
| Business name | Kopi & Clay Studio |
| Second business (privacy check) | Marcus Goh / `marcus@paper-lantern.example.test` / `paper-lantern` / `PaperLantern-Smoke-2027` / Paper Lantern Press |

Rerunning the guide on the same database? Usernames must be unique, so first recreate the database (see the note in step 1).

## 0. Prerequisites

Docker Desktop, Python 3.12, [uv](https://docs.astral.sh/uv/), and Node.js ^20.19.0 or >=22.12.0.

For the AI steps (9–11) you also need two API keys. They're personal, so the guide can't pre-fill them:

- **SoCLaaS key** (steps 9–11): issued through the NUS SoC LLM service used by this course.
- **Tavily key** (step 11, supplier research only):
  1. Sign up at https://app.tavily.com. The free plan needs no payment card and gives a monthly allowance of API credits; check the current limits on the site.
  2. Copy the API key from the dashboard. It starts with `tvly-`.
  3. Paste it into `backend/.env` in step 3.

  Each supplier research run makes one basic search, so a smoke test uses very few credits.

Without the keys, you can still run every manual step; the AI steps then fail safely.

## 1. Start the database and apply migrations

PowerShell:

```powershell
docker compose up -d db
cd backend
uv sync
$env:DATABASE_URL = "postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp"
uv run alembic upgrade head
```

bash/zsh:

```bash
docker compose up -d db
cd backend
uv sync
export DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
uv run alembic upgrade head
```

If `alembic upgrade head` says it can't locate a revision, or you want a clean rerun, recreate the local development database. This deletes local development data only. Run it from `backend/`, with `DATABASE_URL` set as above; it re-applies the migrations immediately, because an empty schema makes step 2 fail with "Provisioning could not be completed."

```
docker compose exec db psql -U eventapp -d eventapp -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" && uv run alembic upgrade head
```

## 2. Provision the event and organiser (one-time CLI)

Still in `backend/`. This also saves the event ID to the git-ignored file `backend/.env.smoke-event`, so later terminals can load it.

PowerShell:

```powershell
$env:EVENT_ID = uv run python -c "import uuid; print(uuid.uuid4())"
Set-Content -Path .env.smoke-event -Value $env:EVENT_ID
uv run python -m app.auth.bootstrap event --id $env:EVENT_ID --title "Singapore Makers Weekend 2027" --timezone Asia/Singapore --starts-at 2027-03-06T10:00:00+08:00 --ends-at 2027-03-07T18:00:00+08:00
uv run python -m app.auth.bootstrap organiser --username smoke-organiser --email smoke-organiser@example.test --display-name "Jordan Lim" --event-id $env:EVENT_ID
```

bash/zsh:

```bash
export EVENT_ID="$(uv run python -c 'import uuid; print(uuid.uuid4())')"
echo "$EVENT_ID" > .env.smoke-event
uv run python -m app.auth.bootstrap event --id "$EVENT_ID" --title 'Singapore Makers Weekend 2027' --timezone Asia/Singapore --starts-at 2027-03-06T10:00:00+08:00 --ends-at 2027-03-07T18:00:00+08:00
uv run python -m app.auth.bootstrap organiser --username smoke-organiser --email smoke-organiser@example.test --display-name 'Jordan Lim' --event-id "$EVENT_ID"
```

At the hidden password prompts, type `SmokeOrganiser-Init-2027` (passwords are never accepted as command arguments).

## 3. Configure AI (optional, needed for steps 9–11)

Skip this to smoke-test only the manual features; AI steps will then fail safely, which is itself worth checking.

Provider keys are personal and can't be pre-filled. Add yours to the git-ignored file `backend/.env` (never commit them or pass them on the command line):

```dotenv
SOCLAAS_API_KEY=<your key>
SOCLAAS_MODEL=qwen3.6:35b
TAVILY_API_KEY=<your key, for supplier research only>
```

## 4. Start the app (three terminals)

**Terminal A: API.** Paste from the repository root.

PowerShell:

```powershell
cd backend
$env:DATABASE_URL = "postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp"
$env:EVENT_ID = Get-Content .env.smoke-event
$env:ENVIRONMENT = "development"; $env:AI_ENABLED = "true"; $env:AI_SYNTHETIC_ONLY = "false"; $env:AI_REAL_DATA_ENABLED = "true"
$env:AI_ALLOWED_EVENT_IDS = "[`"$env:EVENT_ID`"]"
uv run uvicorn app.main:app --reload --host 127.0.0.1
```

bash/zsh:

```bash
cd backend
export DATABASE_URL='postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp'
export EVENT_ID="$(cat .env.smoke-event)"
export ENVIRONMENT=development AI_ENABLED=true AI_SYNTHETIC_ONLY=false AI_REAL_DATA_ENABLED=true
export AI_ALLOWED_EVENT_IDS="[\"$EVENT_ID\"]"
uv run uvicorn app.main:app --reload --host 127.0.0.1
```

**Terminal B: AI worker** (only needed for steps 9–11). Paste the same block as Terminal A, but replace its last line with:

```
uv run --python 3.12 python -m app.ai.worker
```

**Terminal C: website.**

```
cd frontend
npm ci
npm run dev
```

### Browser windows

Each signed-in role needs its own browser session, because windows that share one session also share one login. Normal windows of a browser share one session, and all of its private windows share another. This guide uses three named windows:

| Name | How to open it | Used in |
| --- | --- | --- |
| **Organiser window** | A normal window of your usual browser (for example Chrome) | Steps 5 and 7 |
| **Business window** | A private window of the same browser (Chrome: Ctrl+Shift+N, or Cmd+Shift+N on macOS; Firefox/Edge: Ctrl+Shift+P, or Cmd+Shift+P) | Steps 6–12 |
| **Second business window** | A *different* browser (for example Firefox or Edge if you use Chrome), or a Chrome Guest profile | Step 12 only |

Don't open a second private window of the same browser for the second business: it would share the Business window's login.

Without keys in `backend/.env`, AI requests simply fail safely.

## 5. Organiser opens applications (organiser window)

In a **normal** browser window, go to http://localhost:5173. This is the **Organiser window**; keep it open.

1. Select the **Organiser** tab and log in:
   - Username or email: `smoke-organiser`
   - Password: `SmokeOrganiser-Init-2027`
2. On the required password-change page:
   - Current password: `SmokeOrganiser-Init-2027`
   - New password: `SmokeOrganiser-Live-2027`
   - Confirm new password: `SmokeOrganiser-Live-2027`

   **Expect:** the organiser workspace. If you're signed out later, log in again as `smoke-organiser` / `SmokeOrganiser-Live-2027`.
3. **Application Reviews** → **Singapore Makers Weekend 2027** → turn on **Accepting applications** → **Save application settings** → **Confirm settings**. **Expect:** the event shows as open.

## 6. Business account and application (business window)

Leave the Organiser window open. Open a **private** window of the same browser (Ctrl+Shift+N in Chrome, Cmd+Shift+N on macOS) and go to http://localhost:5173. This is the **Business window**. Steps 6–12 happen here unless a step names the Organiser window.

1. **Business** → **Create account**:
   - Display name `Priya Raman`
   - Email `priya@kopi-and-clay.example.test`
   - Username `kopi-and-clay`
   - Password `KopiClay-Smoke-2027`
   - Business name `Kopi & Clay Studio`

   **Expect:** the Business workspace showing "03 / AVAILABLE · 00 / PREVIEWS", no "Coming later" buttons, and the Promotional concepts and Supplier research panels.
2. **Open applications** → **Singapore Makers Weekend 2027**. **Expect:** contact name `Priya Raman` and email prefilled and editable.
3. Fill in:
   - Participant type: `Vendor`
   - Description: `Handmade stoneware cups and a pour-over coffee tasting corner.`
   - Requested space: `3m x 3m booth near a power point`

   Then **Save draft** and reload. **Expect:** the draft persists.
4. **Review submission** → **Submit application**. **Expect:** status Submitted and the content read-only.

## 7. Decision and setup (organiser window, then business)

This step switches between the two windows; each item says which to use.

1. **Organiser window:** **Application Reviews** → open the Kopi & Clay Studio application → **Approve application** → **Confirm approval**.
2. In its setup section:
   - Booth label: `Hall B · Booth 12`
   - Setup instructions: `Load in from 8:00 to 9:30 via Gate 3. One 13A power socket and a 1.8m table are provided.`

   Then **Save setup**. **Business window:** reload the application. **Expect:** the setup is *not* visible yet.
3. **Organiser window:** **Publish setup** and confirm. **Business window:** reload. **Expect:** Hall B · Booth 12 and the instructions appear, with status Accepted.

## 8. Preparation & Budget (business window)

1. Home → **Open preparation** → select the Singapore Makers Weekend 2027 participation.
2. Add tasks `Glaze and pack 120 cups` (mark done) and `Print price cards`.
3. Set **Spending limit (SGD)** to `100`.
4. Under **Cost breakdown**, **Add item**: description `Kraft paper bags`, category `Packaging`, quantity `3`, unit price `1.23`.
5. **Save preparation**. **Expect:** estimated spend SGD 3.69 and remaining SGD 96.31.
6. Reload. **Expect:** everything persists.
7. Type `Bring extension cord` into a new task without saving, switch to another app and come back. **Expect:** the page stays visible at the same scroll position, with the text intact.

## 9. AI Preparation Draft (business window)

1. Home → **Open AI preparation draft** → choose Kopi & Clay Studio, Singapore Makers Weekend 2027 and the participation. **Expect:** the published booth facts shown separately from your context choices.
2. In **Needs**, enter `Suggest two display tasks and two material estimates for a pottery and coffee booth; no suppliers or external actions.` Share the task `Print price cards`, read the disclosure, then **Generate preparation draft** → **Refresh job status** until it finishes. Without AI keys, **expect** a safe failure and unchanged Preparation & Budget.
3. With AI, **expect** suggested tasks and costs, with prices shown as *estimate* or *unknown*, never as quotations. Rename the first suggested task to `Set up cup display shelves` → **Save draft** → reload. **Expect:** the edit persists and Preparation & Budget is unchanged.
4. Tick that task and one cost item → **Adopt selected items** → **Confirm adoption**. **Expect:** both appended in Preparation & Budget; adopting again adds no duplicates.
5. Generate again with the same Needs and click **Cancel** while it's pending. **Expect:** state Cancelled and no draft.

## 10. Promotional concepts (business window, AI)

1. Home → **Open promotional concepts** → choose the participation.
2. Brief: `Playful poster and freebie ideas for handmade cups and free coffee tastings.` Tick the event title, start time and booth label.
3. **Generate concepts** → **Refresh status**. **Expect:** poster copy, freebie ideas and a layout brief marked as unverified, with sourced facts shown separately.
4. Change the first poster line to `Sip, hold, take home: Kopi & Clay at Booth 12` → **Save draft** → reload. **Expect:** the edit persists.
5. **Delete draft** → confirm. **Expect:** it disappears from history.

## 11. Supplier research and procurement (business window, AI + Tavily)

1. Home → **Open supplier research** → choose the participation. Enter:
   - Category: **Printing**
   - Research brief: `A6 price cards on 300gsm matte card, single-sided`
   - Quantity: `100`
   - Delivery area: `Central Singapore`
   - Needed by: leave empty

   Then **Research suppliers** → **Refresh status**.
2. **Expect:** 1–3 offers with source host, retrieval time, field quotes and *unknown* where a value isn't sourced; subtotals are estimates. Select the first offer → **Save shortlist** → reload. **Expect:** the selection persists.
3. Try deleting that comparison. **Expect:** blocked until you clear the selection and save.
4. Reselect the offer and save, then click **Procurement proposals from this shortlist**.
5. Choose **Quotation request**, select the entry, and enter:
   - Recipient email: `sales@print-shop.example.test`
   - Request text: `Please quote 100 A6 price cards, 300gsm matte, delivery before 1 Mar 2027.`

   Then **Create proposal** → **Open proposal**.
6. **Approve proposal** → confirm. **Expect:** an expiry time. Then **Simulate approved proposal**. **Expect:** a *simulated* sandbox receipt. Nothing is emailed, ordered or paid.
7. Create a second proposal the same way → **Revise proposal**. **Expect:** a new revision; any earlier approval no longer applies. **Cancel proposal**. **Expect:** final and read-only.

## 12. Privacy and sign-out

1. Open the **Second business window** (a different browser or a Chrome Guest profile, not another private window of the same browser), go to http://localhost:5173 and register the second business: Marcus Goh / `marcus@paper-lantern.example.test` / `paper-lantern` / `PaperLantern-Smoke-2027` / Paper Lantern Press. **Expect:** it cannot see any Kopi & Clay Studio applications, drafts, concepts, research or proposals.
2. In the **Business window** (Kopi & Clay), **Sign out**, then press Back or reopen http://localhost:5173/business/preparation. **Expect:** a sign-in prompt and no private content.
3. To continue testing as Kopi & Clay, select the **Business** tab and log in with username `kopi-and-clay`, password `KopiClay-Smoke-2027`.

## Recording results

Note pass/fail per step, with screenshots where useful, in your session log under `logs/`. A failed AI step should still leave manual data unchanged; report it rather than retrying blindly. Automated test commands are in the [DeveloperGuide](DeveloperGuide.md).

Detailed per-feature guides: [Business applications](BusinessApplicationsTesting.md), [preparation and AI drafts](BusinessPreparationTesting.md), [promotional concepts](PromotionalConceptsTesting.md), [supplier research](SupplierResearchTesting.md), [procurement / sandbox actions](ExternalActionTesting.md).
