import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { renderPrototype, tabTo } from "../helpers/renderPrototype";
import { auth } from "../fixtures/auth";

async function fillRegistration(kind: "attendee" | "business") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/display name/i), "Synthetic Person");
  await user.type(screen.getByLabelText(/^username$/i), "tester");
  await user.type(screen.getByLabelText(/^email$/i), "synthetic@example.test");
  if (kind === "business") await user.type(screen.getByLabelText(/business name/i), "Synthetic Studio");
  await user.type(screen.getByLabelText(/^password$/i), "Example-123");
  await user.type(screen.getByLabelText(/confirm password/i), "Example-123");
  return user;
}

describe("AC03-AC04 and AC07 registration", () => {
  test.each(["attendee", "business"] as const)("describes real %s registration without obsolete synthetic-account claims", async (kind) => {
    await renderPrototype(`/register/${kind}`);
    expect(screen.queryByText(/no persistent account is created|credentials are not authenticated/i)).not.toBeInTheDocument();
  });

  test.each(["attendee", "business"] as const)("shows accessible required-field errors for %s registration", async (kind) => {
    const user = userEvent.setup();
    await renderPrototype(`/register/${kind}`);

    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByLabelText(/display name/i)).toBeInvalid();
    expect(screen.getByLabelText(/^username$/i)).toBeInvalid();
    expect(screen.getByLabelText(/^email$/i)).toBeInvalid();
    expect(screen.getByLabelText(/^password$/i)).toBeInvalid();
    expect(screen.getByLabelText(/confirm password/i)).toBeInvalid();
    for (const input of [
      screen.getByLabelText(/display name/i),
      screen.getByLabelText(/^username$/i),
      screen.getByLabelText(/^email$/i),
      screen.getByLabelText(/^password$/i),
      screen.getByLabelText(/confirm password/i),
    ]) {
      const errorId = input.getAttribute("aria-describedby") ?? input.getAttribute("aria-errormessage");
      expect(errorId, `${input.getAttribute("name") ?? "field"} needs an associated error`).toBeTruthy();
      expect(document.getElementById(errorId ?? "")).toBeVisible();
    }
  });

  test("requires a business name with programmatically associated feedback", async () => {
    const user = userEvent.setup();
    await renderPrototype("/register/business");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    const businessName = screen.getByLabelText(/business name/i);
    expect(businessName).toBeInvalid();
    const errorId = businessName.getAttribute("aria-describedby") ?? businessName.getAttribute("aria-errormessage");
    expect(document.getElementById(errorId ?? "")).toBeVisible();
  });

  test("enforces email, username, password and confirmation boundaries while retaining valid input", async () => {
    const user = userEvent.setup();
    await renderPrototype("/register/attendee");

    await user.type(screen.getByLabelText(/display name/i), "Synthetic Person");
    await user.type(screen.getByLabelText(/^username$/i), "ab");
    await user.type(screen.getByLabelText(/^email$/i), "invalid");
    await user.type(screen.getByLabelText(/^password$/i), "1234567");
    await user.type(screen.getByLabelText(/confirm password/i), "different");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByLabelText(/^username$/i)).toHaveValue("ab");
    expect(screen.getByText(/username.*at least 3/i)).toBeVisible();
    expect(screen.getByText(/valid email/i)).toBeVisible();
    expect(screen.getByText(/password.*at least 8/i)).toBeVisible();
    expect(screen.getByText(/passwords.*match/i)).toBeVisible();
    expect(screen.getByLabelText(/display name/i)).toHaveValue("Synthetic Person");
  });

  test("accepts the exact username and password minimum boundaries", async () => {
    const user = userEvent.setup();
    await renderPrototype("/register/attendee");
    await user.type(screen.getByLabelText(/display name/i), "Boundary Person");
    await user.type(screen.getByLabelText(/^username$/i), "abc");
    await user.type(screen.getByLabelText(/^email$/i), "boundary@example.test");
    await user.type(screen.getByLabelText(/^password$/i), "12345678");
    await user.type(screen.getByLabelText(/confirm password/i), "12345678");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(window.location.pathname).toBe("/attendee"));
  });

  test.each([
    ["attendee", "/attendee"],
    ["business", "/business"],
  ] as const)("creates a server %s account without browser-persisted registration secrets", async (kind, path) => {
    await renderPrototype(`/register/${kind}`);
    const user = await fillRegistration(kind);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(window.location.pathname).toBe(path));
    expect(screen.getByText("Synthetic Person")).toBeVisible();
    expect(window.localStorage).toHaveLength(0);
    expect(window.sessionStorage).toHaveLength(0);
    const request = auth.requests.find(({ path }) => path === `/api/v1/auth/register/${kind}`);
    expect(request?.method).toBe("POST");
    expect(request?.body).toEqual({ displayName: "Synthetic Person", username: "tester", email: "synthetic@example.test", password: "Example-123", ...(kind === "business" ? { businessName: "Synthetic Studio" } : {}) });
  });

  test.each(["attendee", "business"] as const)("supports keyboard-only %s validation, correction and registration", async (kind) => {
    const user = userEvent.setup();
    await renderPrototype(`/register/${kind}`);
    const displayName = screen.getByLabelText(/display name/i);
    const username = screen.getByLabelText(/^username$/i);
    const email = screen.getByLabelText(/^email$/i);
    const businessName = kind === "business" ? screen.getByLabelText(/business name/i) : null;
    const password = screen.getByLabelText(/^password$/i);
    const confirmation = screen.getByLabelText(/confirm password/i);
    const submit = screen.getByRole("button", { name: /create account/i });

    await tabTo(user, submit);
    await user.keyboard("{Enter}");
    expect(displayName).toBeInvalid();
    const errorId = displayName.getAttribute("aria-describedby") ?? displayName.getAttribute("aria-errormessage");
    expect(document.getElementById(errorId ?? "")).toBeVisible();

    await tabTo(user, displayName);
    await user.type(displayName, "Keyboard Person");
    await tabTo(user, username);
    await user.type(username, "key");
    await tabTo(user, email);
    await user.type(email, "keyboard@example.test");
    if (businessName) {
      await tabTo(user, businessName);
      await user.type(businessName, "Keyboard Studio");
    }
    await tabTo(user, password);
    await user.type(password, "12345678");
    await tabTo(user, confirmation);
    await user.type(confirmation, "12345678");
    await tabTo(user, submit);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(window.location.pathname).toBe(`/${kind}`));
  });

  test("retains valid registration input and shows a server failure without opening a workspace", async () => {
    auth.failure = { status: 409, detail: "Registration could not be completed." };
    await renderPrototype("/register/business");
    const user = await fillRegistration("business");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText("Registration could not be completed.")).toBeVisible();
    expect(screen.getByLabelText(/^username$/i)).toHaveValue("tester");
    expect(screen.getByLabelText(/business name/i)).toHaveValue("Synthetic Studio");
    expect(window.location.pathname).toBe("/register/business");
    expect(window.sessionStorage).toHaveLength(0);
  });
});
