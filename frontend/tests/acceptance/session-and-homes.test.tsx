import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { homes } from "../fixtures/roles";
import { renderPrototype, storedValues } from "../helpers/renderPrototype";

function seedSession(value: unknown) {
  window.sessionStorage.setItem("eventapp.prototype.session", typeof value === "string" ? value : JSON.stringify(value));
}

describe("AC05-AC06 and AC10 session lifecycle", () => {
  test("redirects a missing session away from a role home", async () => {
    await renderPrototype("/organiser");
    expect(window.location.pathname).toBe("/login");
    expect(screen.queryByText("Programme Management")).not.toBeInTheDocument();
  });

  test("preserves valid state when rejecting a mismatched home", async () => {
    seedSession({ role: "attendee", displayName: "Synthetic Attendee" });
    await renderPrototype("/organiser");

    expect(window.location.pathname).toBe("/login");
    expect(storedValues(window.sessionStorage)).toContain("Synthetic Attendee");
    expect(screen.queryByText("Programme Management")).not.toBeInTheDocument();
  });

  test.each([
    "not-json",
    JSON.stringify(null),
    JSON.stringify({ role: "admin", displayName: "Forged" }),
    JSON.stringify({ role: "attendee", displayName: "   " }),
    JSON.stringify({ role: "business" }),
  ])("clears malformed session state: %s", async (value) => {
    seedSession(value);
    await renderPrototype("/attendee");

    expect(window.location.pathname).toBe("/login");
    expect(window.sessionStorage).toHaveLength(0);
  });

  test("ignores extra fields and derives no authority from them", async () => {
    seedSession({ role: "attendee", displayName: "Synthetic Attendee", admin: true });
    await renderPrototype("/organiser");

    expect(window.location.pathname).toBe("/login");
    expect(screen.queryByText("Programme Management")).not.toBeInTheDocument();
  });

  test("preserves a matching session for direct navigation", async () => {
    seedSession({ role: "business", displayName: "Synthetic Business" });
    await renderPrototype("/business");

    expect(window.location.pathname).toBe("/business");
    expect(screen.getByText("Synthetic Business")).toBeVisible();
  });

  test("restores a matching role home after an application remount", async () => {
    seedSession({ role: "business", displayName: "Synthetic Business" });
    const firstRender = await renderPrototype("/business");
    expect(screen.getByText("Synthetic Business")).toBeVisible();
    firstRender.unmount();

    await renderPrototype("/business");
    expect(window.location.pathname).toBe("/business");
    expect(screen.getByText("Synthetic Business")).toBeVisible();
  });

  test("keeps valid state across a history transition to its matching route", async () => {
    seedSession({ role: "attendee", displayName: "Synthetic Attendee" });
    await renderPrototype("/login");
    window.history.pushState({}, "", "/attendee");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(await screen.findByText("Synthetic Attendee")).toBeVisible();
  });

  test("sign-out clears state and browser history cannot restore the home", async () => {
    const user = userEvent.setup();
    seedSession({ role: "organiser", displayName: "Synthetic Organiser" });
    await renderPrototype("/organiser");
    await user.click(screen.getByRole("button", { name: /sign out/i }));

    expect(window.location.pathname).toBe("/login");
    expect(window.sessionStorage).toHaveLength(0);
    window.history.back();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(screen.queryByText("Programme Management")).not.toBeInTheDocument();
  });

  test("unknown routes return to login without creating state", async () => {
    await renderPrototype("/definitely-not-a-feature");
    expect(window.location.pathname).toBe("/login");
    expect(window.sessionStorage).toHaveLength(0);
    expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
  });
});

describe("AC08-AC09 role homes", () => {
  test.each(Object.entries(homes))("shows only the agreed %s cards and truthful unfinished state", async (role, cards) => {
    seedSession({ role, displayName: `Synthetic ${role}` });
    await renderPrototype(`/${role}`);

    for (const card of cards) expect(screen.getByText(card)).toBeVisible();
    const otherCards = Object.entries(homes).filter(([otherRole]) => otherRole !== role).flatMap(([, values]) => values);
    for (const card of otherCards) expect(screen.queryByText(card)).not.toBeInTheDocument();
    const unavailableActions = screen.getAllByRole("button", { name: /coming later/i });
    expect(unavailableActions).toHaveLength(3);
    const pathBefore = window.location.pathname;
    for (const action of unavailableActions) {
      expect(action).toBeDisabled();
      action.click();
      expect(window.location.pathname).toBe(pathBefore);
    }
    expect(screen.getByText(/credentials are not authenticated/i)).toBeVisible();
  });

  test("keeps login and sign-out keyboard operable at the approved narrow viewport", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 360 });
    const user = userEvent.setup();
    await renderPrototype();
    await user.tab();
    expect(document.activeElement).not.toBe(document.body);

    seedSession({ role: "attendee", displayName: "Synthetic Attendee" });
    await renderPrototype("/attendee");
    const signOut = screen.getByRole("button", { name: /sign out/i });
    signOut.focus();
    await user.keyboard("{Enter}");
    expect(window.location.pathname).toBe("/login");
  });
});
