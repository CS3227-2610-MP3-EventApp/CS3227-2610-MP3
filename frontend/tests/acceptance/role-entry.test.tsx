import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { roles } from "../fixtures/roles";
import { renderPrototype, tabTo } from "../helpers/renderPrototype";
import { actor, auth } from "../fixtures/auth";

describe("AC01-AC04 role entry", () => {
  test("shows exactly three accessible role tabs with Attendee initially selected", async () => {
    await renderPrototype();

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs.map((tab) => tab.textContent)).toEqual(roles);
    expect(screen.getByRole("tab", { name: "Attendee" })).toHaveAttribute("aria-selected", "true");
  });

  test("switches role tabs with the keyboard", async () => {
    const user = userEvent.setup();
    await renderPrototype();

    const attendee = screen.getByRole("tab", { name: "Attendee" });
    attendee.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Organiser" })).toHaveAttribute("aria-selected", "true");
  });

  test("offers registration only to Attendee and Business", async () => {
    const user = userEvent.setup();
    await renderPrototype();

    expect(screen.getByRole("link", { name: /create account/i })).toHaveAttribute("href", "/register/attendee");
    await user.click(screen.getByRole("tab", { name: "Organiser" }));
    expect(screen.queryByRole("link", { name: /create account/i })).not.toBeInTheDocument();
    expect(screen.getByText(/provisioned by an authorised administrator/i)).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Business" }));
    expect(screen.getByRole("link", { name: /create account/i })).toHaveAttribute("href", "/register/business");
  });

  test("does not expose an organiser registration form by direct route", async () => {
    await renderPrototype("/register/organiser");

    expect(window.location.pathname).toBe("/login");
    expect(screen.queryByRole("heading", { name: /create organiser/i })).not.toBeInTheDocument();
  });

  test("requires login identifier and password before contacting the login boundary", async () => {
    const user = userEvent.setup();
    await renderPrototype();

    await user.click(screen.getByRole("button", { name: /log in/i }));
    expect(screen.getByLabelText(/username or email/i)).toBeInvalid();
    expect(screen.getByLabelText(/^password$/i)).toBeInvalid();
    expect(auth.requests.filter(({ path }) => path.endsWith("/login"))).toHaveLength(0);
  });

  test.each([
    ["Attendee", "attendee", "/attendee"],
    ["Organiser", "organiser", "/organiser"],
    ["Business", "business", "/business"],
  ])("opens the matching %s home only after server authentication", async (role, storedRole, path) => {
    const user = userEvent.setup();
    await renderPrototype();

    await user.click(screen.getByRole("tab", { name: role }));
    await user.type(screen.getByLabelText(/username or email/i), "private@example.test");
    await user.type(screen.getByLabelText(/^password$/i), "NotStored-123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(window.location.pathname).toBe(path));
    expect(await screen.findByText(`Synthetic ${storedRole}`)).toBeVisible();
    expect(window.localStorage).toHaveLength(0);
    expect(window.sessionStorage).toHaveLength(0);
    expect(auth.requests.find(({ path }) => path.endsWith("/login"))?.body).toEqual({ identifier: "private@example.test", password: "NotStored-123", role: storedRole });
  });

  test("supports a complete keyboard-only Attendee login and sign-out journey", async () => {
    const user = userEvent.setup();
    await renderPrototype();
    const identifier = screen.getByLabelText(/username or email/i);
    const password = screen.getByLabelText(/^password$/i);
    const submit = screen.getByRole("button", { name: /log in/i });

    await tabTo(user, identifier);
    await user.type(identifier, "keyboard@example.test");
    await tabTo(user, password);
    await user.type(password, "Keyboard-123");
    await tabTo(user, submit);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(window.location.pathname).toBe("/attendee"));

    const signOut = await screen.findByRole("button", { name: /sign out/i });
    await tabTo(user, signOut);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(window.location.pathname).toBe("/login"));
    expect(window.sessionStorage).toHaveLength(0);
    expect(auth.requests.some(({ path, method }) => path.endsWith("/logout") && method === "POST")).toBe(true);
  });

  test("shows a generic accessible login rejection and retains the chosen role", async () => {
    auth.failure = { status: 401, detail: "Invalid credentials." };
    const user = userEvent.setup();
    await renderPrototype();
    await user.click(screen.getByRole("tab", { name: "Business" }));
    await user.type(screen.getByLabelText(/username or email/i), "unknown@example.test");
    await user.type(screen.getByLabelText(/^password$/i), "Wrong-123");
    await user.click(screen.getByRole("button", { name: /log in/i }));
    expect(await screen.findByText("Invalid credentials.")).toBeVisible();
    expect(screen.getByRole("tab", { name: "Business" })).toHaveAttribute("aria-selected", "true");
    expect(window.location.pathname).toBe("/login");
    expect(window.sessionStorage).toHaveLength(0);
  });

  test("uses the server actor role rather than a selected tab to choose the home", async () => {
    auth.loginActor = actor("attendee");
    const user = userEvent.setup();
    await renderPrototype();
    await user.click(screen.getByRole("tab", { name: "Organiser" }));
    await user.type(screen.getByLabelText(/username or email/i), "synthetic");
    await user.type(screen.getByLabelText(/^password$/i), "Synthetic-123");
    await user.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => expect(window.location.pathname).toBe("/attendee"));
    expect(screen.queryByText("Programme Management")).not.toBeInTheDocument();
  });
});
