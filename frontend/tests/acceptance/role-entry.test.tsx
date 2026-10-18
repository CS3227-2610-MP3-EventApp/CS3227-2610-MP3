import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { roles } from "../fixtures/roles";
import { renderPrototype, tabTo } from "../helpers/renderPrototype";

const sessionKey = "eventapp.prototype.session";

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

  test("requires login identifier and password without claiming authentication", async () => {
    const user = userEvent.setup();
    await renderPrototype();

    await user.click(screen.getByRole("button", { name: /log in/i }));
    expect(screen.getByLabelText(/username or email/i)).toBeInvalid();
    expect(screen.getByLabelText(/^password$/i)).toBeInvalid();
    expect(screen.getByText(/credentials are not authenticated/i)).toBeVisible();
  });

  test.each([
    ["Attendee", "attendee", "/attendee", "Attendee Preview"],
    ["Organiser", "organiser", "/organiser", "Organiser Preview"],
    ["Business", "business", "/business", "Business Preview"],
  ])("opens the matching %s home using one exact minimal session", async (role, storedRole, path, previewName) => {
    const user = userEvent.setup();
    await renderPrototype();

    await user.click(screen.getByRole("tab", { name: role }));
    await user.type(screen.getByLabelText(/username or email/i), "private@example.test");
    await user.type(screen.getByLabelText(/^password$/i), "NotStored-123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(window.location.pathname).toBe(path);
    expect(screen.getByText(previewName)).toBeVisible();
    expect(window.localStorage).toHaveLength(0);
    expect(window.sessionStorage).toHaveLength(1);
    expect(window.sessionStorage.key(0)).toBe(sessionKey);
    expect(JSON.parse(window.sessionStorage.getItem(sessionKey) ?? "null")).toStrictEqual({
      role: storedRole,
      displayName: previewName,
    });
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
    expect(window.location.pathname).toBe("/attendee");

    const signOut = screen.getByRole("button", { name: /sign out/i });
    await tabTo(user, signOut);
    await user.keyboard("{Enter}");
    expect(window.location.pathname).toBe("/login");
    expect(window.sessionStorage).toHaveLength(0);
  });
});
