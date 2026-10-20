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

Account registration, login, session restoration, password changes and logout are real backend operations. This branch adds the attendee programme browser described below; its publication backend and real data integration are still pending. Other application, itinerary and AI actions remain previews with disabled controls.

## Browse the programme (frontend awaiting programme backend)

Sign in as an attendee and choose **Browse Programme**. Select an event, then an activity to see its times, venue/room, SGD price, declared capacity and separate activity/room/venue accessibility notes. Times use the event timezone. “Free” means zero price; capacity is not a remaining-ticket count. Missing accessibility information remains unknown.

Search activity titles, combine a type and event-local date, and apply the filters. Use Previous/Next for paged lists. Overnight activities are intended to match every local date they overlap when the programme backend enforces the agreed contract. Retry failed loads; an empty list is distinct from an error. A session-expiry response returns you to login. Activity links support direct navigation once the producer endpoints are available.

This branch does not create or publish events/activities. Against the current backend, the new programme APIs are unavailable, so the browser shows a load error rather than inventing programme data. Automated frontend acceptance checks use synthetic network responses only in tests; they do not establish real publication, server permissions or persistence.
