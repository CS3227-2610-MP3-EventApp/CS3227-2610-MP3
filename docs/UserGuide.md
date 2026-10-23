# EventApp user guide

## Create an account

Choose **Attendee** or **Business** on the login page, then select **Create account**. Enter your display name, username, email and an 8–128-character password. Business registration also asks for a new business name and creates you as its initial owner. Confirm your password and submit; successful registration opens your workspace.

Each email and username can belong to only one account across all three roles. Business names must be unique. Registration cannot join an existing business or create an organiser.

## Log in and sign out

Choose your account's role tab and enter its username or email and password. Incorrect credentials or the wrong role show the same generic error. Refreshing the page restores your valid session; sessions expire after seven days. Use **Sign out** to revoke the current session on the server. If the server is unavailable, retry rather than assuming you have signed out.

Organiser accounts are created by the team through the bootstrap command described in the [developer guide](DeveloperGuide.md#shared-authentication-development). An organiser must replace the initial password before opening their workspace and needs an active assignment to an event. A business account needs its active owner membership. Contact the team if your workspace reports no active membership.

## Change your password and appearance

Use **Change password** in your workspace and provide your current password, new password and confirmation. Successful replacement signs out your other sessions and replaces the current session token. Password recovery and email verification are not available in this first slice.

The appearance control switches between light and dark themes. Your explicit choice is saved on the current browser; otherwise EventApp follows the operating system preference.

## Current feature availability

Account registration, login, session restoration, password changes and logout use the backend. Organiser programme management and business application submission/review/decisions are available. Organiser AI application analysis is available for explicitly configured invented-data events. Authenticated attendees can use Explore programme to browse published activities and request synthetic-data AI itinerary suggestions. Business preparation offers a manual checklist, overall spending limit and optional cost breakdowns. AI preparation provides private editable suggestions with selected append-only adoption when configured; promotional concepts, supplier research and procurement proposals are described below.

## Organiser AI application analysis

Open **AI Application Analysis** or **Application Reviews**, select an assigned event and open a submitted application. Edit and save the event's assessment criteria before starting analysis. Each save creates an immutable rubric revision; a conflict preserves your unsaved edits until you choose to reload.

Choose **Analyse application**, confirm the event contains only invented data, and start. A background worker processes the job. Follow pending/running status, cancel if needed, or continue manual review. Cancellation after dispatch may still use provider quota; later output is discarded. Refresh restores the latest owned job.

Reports show criterion findings, exact evidence quotes, source/rubric revisions and bounded possible text matches. Their interpretation requires your judgment. Saving a newer rubric marks old reports stale; **View criteria used** shows the saved version behind a report. Analysis never records an application decision. Reports remain private to their requesting organiser with current event access.

Live analysis requires local SoCLaaS setup and a dedicated allowlisted event containing invented descriptions and assessment instructions. Production analysis is disabled. The [AI testing guide](AIAnalysisTesting.md) explains setup and limits; when AI is unavailable, use the existing manual decision controls.

## Organiser programme management

Open **Programme Management** and select an assigned event. Create a venue with its address, add a room and capacity, then create a complete programme draft. Use the calendar/time controls in the displayed event timezone, choose a room/type and set capacity and a price in SGD dollars (for example, `12.50`). Prices allow zero and at most two decimal places; the backend still stores integer cents. Blank accessibility notes mean unknown. Activities may overlap in one room; each item's capacity must still fit that room.

Save the draft before validating or publishing. **Validate** checks the saved revision without publishing. **Publish** requires confirmation and makes the stored revision visible to authenticated attendees. Published items require the separate change workflow below; their venues/rooms remain locked against editing. Drafts and unused locations can be deleted after confirmation; referenced locations cannot.

If another tab saves first, reload and review its revision before retrying. Publication never silently includes unsaved edits. Detailed walkthroughs and API handoff are in [programme testing](ProgrammeTesting.md).

Venue/room pencil icons open editing; trash icons open deletion confirmation. A room cannot be deleted while any activity references it, and a venue cannot be deleted while it has rooms. For an activity, select its title and use **Delete** in its saved draft details. Published and cancelled activities cannot be hard-deleted.

### Published changes and announcements

Select a published activity, choose **Edit published activity**, review the before/after preview and explicitly confirm. Each change preserves its previous public facts. **Cancel activity** requires a reason and confirmation; cancellation is final. Cancelled activities remain visible, with their reason, and cannot be edited or restored. Existing accepted plans are never silently replaced.

Change history separates verified facts from announcement wording. Create a private manual draft for the latest change, save it, then preview its exact text before **Approve and publish**. A preview expires after 15 minutes; changing the draft or activity requires a new preview. Published announcements are immutable and readable by signed-in attendees for the event. Only one announcement can be published for a change.

AI assistance is optional and available only for configured invented-data events. Confirm the synthetic-data boundary, start a drafting job and review the resulting private wording. AI never publishes. Manual authoring remains available if AI fails. If a write outcome is uncertain, check current state before retrying.

Attendees can open **Event announcements** from the programme and **Notifications** for their private inbox. Accepted-itinerary delivery is explicitly pending the teammate-owned F02 integration; until then the inbox shows an unavailable/pending message, not a successful empty recipient result. See [F05 testing](DisruptionsTesting.md).

## Attendee programme browsing

Sign in as an attendee and choose **Explore programme** in Browse Programme. The frontend has event/activity lists, title/type/date filters, pagination and activity details including event-local times, SGD/free pricing, declared capacity and separate accessibility notes. Missing notes mean unknown; capacity is not remaining inventory. The screen uses the published programme API. Date filters match the activity’s start date in the event timezone, including activities ending the following day; all six types, including Panel, are supported. Retry and session-expiry handling are present. Only published activities appear; this journey does not reserve capacity or buy tickets.

### Attendee AI itinerary suggestions

After selecting an event in attendee planning, set your preferences. The page notes that your preferences and the programme are sent to an external AI service; do not enter personal details. Choose **Generate AI itinerary** to request a background suggestion. The request can be cancelled, is subject to the daily limit, and reports pending, running, completed, failed or cancelled status. A completed result shows the proposed activities, reasons, sources and constraint checks.

AI output is only a suggestion: it is not saved or accepted automatically. Review every activity, especially missing accessibility information, then choose **Save as draft** if the result is still current. If preferences or published programme revisions changed, the result is marked stale and must not be saved; use manual planning or generate a fresh result. Provider failure, unavailable event configuration and infeasible constraints leave the existing planning state unchanged.

### Attendee event questions

On an event's programme page, use **Ask about this event** to type a question (up to 300 characters) and choose **Ask question**. The page notes that your question is sent to an external AI service; do not enter personal details. The answer is prepared in the background (up to a minute) and can be cancelled. A completed answer lists verified facts, each with the activity title, revision, value taken from the programme and a link to the activity; cancelled activities are marked **Cancelled**. An **AI summary** sentence appears only when it passes the server checks, and only the verified facts are checked against the programme. If the programme cannot answer, or its information conflicts, you see an explicit unknown message with a link to browse the programme. If the programme changed after the answer was prepared, no answer is shown and you can choose **Ask again**. Each question is independent, there is a daily limit, and failures never change the programme or your plans. Live answers work only for events the operator has configured with invented data; production is disabled.

## Business preparation

New application contacts default to your account name/email and remain editable. Dates display in the event region with24-hour times. Organisers Save setup privately, then explicitly Publish setup when ready; businesses see only published details. Preparation provides compact tasks, an overall spending limit and optional categorized cost items, with exact estimates/remaining budget. Back to AI preparation returns to your current context. Each source-context checkbox selects only that item for AI sharing; Generate shares the displayed selected fields under the provider disclosure. There is no invented-data pledge. Configuration and provider availability are still required; generation never replaces manual data automatically. See [the testing walkthrough](BusinessPreparationTesting.md) for local setup and checks, or the end-to-end [Business smoke test](BusinessSmokeTest.md) for a follow-along of every Business feature.
## Promotional concepts

From the Business workspace, open **Promotional concepts** and select an existing participation. Add a creative brief and select the event or published setup facts you want to share with the AI provider. **Generate concepts** requests a separate private draft; use **Refresh status** or **Cancel job** while it runs.

Poster copy, freebie concepts and layout notes remain unverified suggestions, including after editing. Check every claim before using it. Authoritative facts appear separately with source freshness. Save edits, reopen older drafts, refresh selected facts explicitly, or delete a saved draft. Drafts belong to their creator and persist until deletion; provider copies are outside local deletion. No publishing, messages, purchases or payments occur. See [the promotional guide](PromotionalConceptsTesting.md) for configuration and verification limits.

## Supplier research

Open **Supplier research** in the Business workspace. Choose an existing participation, category, brief, quantity and coarse Singapore delivery area, then review the Tavily/AI sharing disclosure before researching. Inspect source evidence, retrieval times, unknowns and estimated item subtotals. When **Partial research: some sources could not be used.** appears, you can still save the available offers, including listings with unknown price or delivery. Tick the offers you want, then choose **Save selected offers** beneath the offers or **Save shortlist** above the comparisons. Both buttons save all current shortlist selections for this participation; reload to confirm they persist. Comparisons and selections are private to their creator. Researching again creates separate evidence. Clear and save selections before deleting a referenced comparison. No email, order or payment occurs. See [the supplier guide](SupplierResearchTesting.md) for limits and recovery steps.
