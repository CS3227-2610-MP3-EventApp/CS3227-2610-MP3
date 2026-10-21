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

Account registration, login, session restoration, password changes and logout use the backend. Organiser programme management and business application submission/review/decisions are available. Organiser AI application analysis is available for explicitly configured invented-data events. Attendee itinerary and business preparation AI remain previews. Authenticated attendee programme reads are available through the API; attendee browsing screens remain a teammate-owned follow-up.

## Organiser AI application analysis

Open **AI Application Analysis** or **Application Reviews**, select an assigned event and open a submitted application. Edit and save the event's assessment criteria before starting analysis. Each save creates an immutable rubric revision; a conflict preserves your unsaved edits until you choose to reload.

Choose **Analyse application**, confirm the event contains only invented data, and start. A background worker processes the job. Follow pending/running status, cancel if needed, or continue manual review. Cancellation after dispatch may still use provider quota; later output is discarded. Refresh restores the latest owned job.

Reports show criterion findings, exact evidence quotes, source/rubric revisions and bounded possible text matches. Their interpretation requires your judgment. Saving a newer rubric marks old reports stale; **View criteria used** shows the saved version behind a report. Analysis never records an application decision. Reports remain private to their requesting organiser with current event access.

Live analysis requires local SoCLaaS setup and a dedicated allowlisted event containing invented descriptions and assessment instructions. Production analysis is disabled. The [AI testing guide](AIAnalysisTesting.md) explains setup and limits; when AI is unavailable, use the existing manual decision controls.

## Organiser programme management

Open **Programme Management** and select an assigned event. Create a venue with its address, add a room and capacity, then create a complete programme draft. Use the calendar/time controls in the displayed event timezone, choose a room/type and set capacity and a price in SGD dollars (for example, `12.50`). Prices allow zero and at most two decimal places; the backend still stores integer cents. Blank accessibility notes mean unknown. Activities may overlap in one room; each item's capacity must still fit that room.

Save the draft before validating or publishing. **Validate** checks the saved revision without publishing. **Publish** requires confirmation and makes the stored revision visible to authenticated attendee API consumers. Published items are read-only, and their venues/rooms are locked against editing. Drafts and unused locations can be deleted after confirmation; referenced locations cannot.

If another tab saves first, reload and review its revision before retrying. Publication never silently includes unsaved edits. Detailed walkthroughs and API handoff are in [programme testing](ProgrammeTesting.md).

Venue/room pencil icons open editing; trash icons open deletion confirmation. A room cannot be deleted while any activity references it, and a venue cannot be deleted while it has rooms. For an activity, select its title and use **Delete** in its saved draft details. Published activities cannot be deleted: future cancellation will preserve their IDs/history rather than silently remove public facts. Cancellation is not implemented in this slice.
