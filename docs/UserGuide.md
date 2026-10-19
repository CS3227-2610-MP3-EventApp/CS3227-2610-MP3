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

Account registration, login, session restoration, password changes and logout are real backend operations. Programme, application, itinerary and AI cards remain labelled previews with disabled actions until their own capabilities are delivered. Published-programme browsing will require attendee login.
