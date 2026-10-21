import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { homes } from "../fixtures/roles";
import { actor, auth, seedActor, type Role } from "../fixtures/auth";
import { renderPrototype, tabTo } from "../helpers/renderPrototype";

describe("server actor restoration and session lifecycle", () => {
  test("redirects an unauthenticated direct home request after consulting me", async () => {
    await renderPrototype("/organiser");
    expect(window.location.pathname).toBe("/login");
    expect(screen.queryByText("Programme Management")).not.toBeInTheDocument();
  });

  test.each([
    "not-json", JSON.stringify(null), JSON.stringify({ role: "admin", displayName: "Forged" }),
    JSON.stringify({ role: "organiser", displayName: "Forged", admin: true }),
    JSON.stringify({ role: "attendee", displayName: "   " }), JSON.stringify({ role: "business" }),
  ])("never accepts browser session authority: %s", async (value) => {
    window.sessionStorage.setItem("eventapp.prototype.session", value);
    await renderPrototype("/organiser");
    expect(window.location.pathname).toBe("/login");
    expect(screen.queryByText("Programme Management")).not.toBeInTheDocument();
  });

  test("rejects a mismatched home without discarding the verified actor", async () => {
    seedActor("attendee");
    const first = await renderPrototype("/organiser");
    expect(window.location.pathname).toBe("/login");
    expect(auth.current?.role).toBe("attendee");
    first.unmount();
    await renderPrototype("/attendee");
    expect(await screen.findByText("Synthetic attendee")).toBeVisible();
  });

  test("restores the server actor across a remount with empty browser storage", async () => {
    seedActor("business");
    const first = await renderPrototype("/business");
    expect(await screen.findByText("Synthetic business")).toBeVisible();
    first.unmount();
    await renderPrototype("/business");
    expect(await screen.findByText("Synthetic business")).toBeVisible();
    expect(auth.requests.filter(({ path }) => path.endsWith("/me"))).toHaveLength(2);
    expect(window.sessionStorage).toHaveLength(0);
    expect(window.localStorage).toHaveLength(0);
  });

  test("rechecks authentication on remount after server expiry or revocation", async () => {
    seedActor("attendee");
    const first = await renderPrototype("/attendee");
    first.unmount();
    auth.current = null;
    await renderPrototype("/attendee");
    expect(window.location.pathname).toBe("/login");
    expect(screen.queryByText("Browse Programme")).not.toBeInTheDocument();
  });

  test("sign-out calls the server and history cannot restore a protected home", async () => {
    seedActor("organiser");
    const user = userEvent.setup();
    await renderPrototype("/organiser");
    await user.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(window.location.pathname).toBe("/login"));
    expect(auth.requests.some(({ path, method }) => path.endsWith("/logout") && method === "POST")).toBe(true);
    window.history.pushState({}, "", "/organiser");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await waitFor(() => expect(window.location.pathname).toBe("/login"));
    expect(screen.queryByText("Programme Management")).not.toBeInTheDocument();
  });

  test("failed logout shows an error and does not claim server revocation", async () => {
    seedActor("attendee");
    const user = userEvent.setup();
    await renderPrototype("/attendee");
    auth.failure = { status: 500, detail: "Request could not be completed." };
    await user.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByText("Request could not be completed.")).toBeVisible();
    expect(window.location.pathname).toBe("/attendee");
    expect(auth.current?.role).toBe("attendee");
  });

  test("unknown routes return to login without inventing identity", async () => {
    await renderPrototype("/definitely-not-a-feature");
    expect(window.location.pathname).toBe("/login");
    expect(window.sessionStorage).toHaveLength(0);
  });

  test("mandatory organiser password replacement precedes workspace access", async () => {
    auth.current = { ...actor("organiser"), mustChangePassword: true };
    const user = userEvent.setup();
    await renderPrototype("/organiser");
    expect(screen.queryByText("Programme Management")).not.toBeInTheDocument();
    await user.type(await screen.findByLabelText(/current password/i), "Initial-123");
    await user.type(screen.getByLabelText(/^new password$/i), "Replacement-123");
    await user.type(screen.getByLabelText(/confirm.*password/i), "Replacement-123");
    await user.click(screen.getByRole("button", { name: /change password|replace password/i }));
    expect(await screen.findByText("Programme Management")).toBeVisible();
    expect(auth.requests.find(({ path }) => path.endsWith("/change-password"))?.body).toEqual({ currentPassword: "Initial-123", newPassword: "Replacement-123" });
    expect(window.sessionStorage).toHaveLength(0);
  });

  test.each(["organiser", "business"] as const)("denies the %s home with no active memberships", async (role) => {
    auth.current = { ...actor(role), eventMemberships: [], businessMemberships: [] };
    await renderPrototype(`/${role}`);
    expect(screen.queryByText(role === "organiser" ? "Programme Management" : "Applications")).not.toBeInTheDocument();
    expect(await screen.findByText(/no active|no .*membership|not permitted|access.*denied/i)).toBeVisible();
  });
});

describe("role homes preserve presentation and accessibility", () => {
  test.each(Object.entries(homes))("shows only the agreed %s cards and disabled future actions", async (role, cards) => {
    seedActor(role as Role);
    await renderPrototype(`/${role}`);
    for (const card of cards) expect(await screen.findByText(card)).toBeVisible();
    for (const card of Object.entries(homes).filter(([other]) => other !== role).flatMap(([, values]) => values)) expect(screen.queryByText(card)).not.toBeInTheDocument();
    const unavailable = screen.getAllByRole("button", { name: /coming later/i });
    expect(unavailable).toHaveLength(role === "organiser" ? 1 : 2);
    for (const button of unavailable) expect(button).toBeDisabled();
    if (role === "attendee") {
      // BROWSE-TCR-01: only Browse Programme progresses beyond the prototype.
      for (const title of ["My Itinerary", "Event Assistant"]) {
        const card = screen.getByRole("heading", { name: title }).closest("article")!;
        expect(within(card).getByRole("button", { name: /coming later/i })).toBeDisabled();
      }
      const browseCard = screen.getByRole("heading", { name: "Browse Programme" }).closest("article")!;
      const browse = screen.queryByRole("link", { name: /browse programme/i })
        ?? screen.queryByRole("button", { name: /browse programme/i })
        ?? within(browseCard).queryByRole("link") ?? within(browseCard).getByRole("button");
      expect(browse).toBeEnabled();
    }
    if (role === "business") {
      const entry = screen.getByRole("link", { name: role === "business" ? /^open applications$/i : /^review applications$/i });
      expect(entry).toHaveAttribute("href", `/${role}/applications`);
      expect(entry).not.toHaveAttribute("aria-disabled", "true");
    }
    if (role === "organiser") {
      const programmeAction = screen.queryByRole("link", { name: /programme/i }) ?? screen.getByRole("button", { name: /programme/i });
      expect(programmeAction).not.toBeDisabled();
      const applicationAction = screen.getByRole("link", { name: /^review applications$/i });
      expect(applicationAction).toHaveAttribute("href", "/organiser/applications");
    }
    expect(screen.queryByText(/credentials are not authenticated/i)).not.toBeInTheDocument();
  });

  test("keeps login and sign-out keyboard operable at the approved narrow viewport", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 360 });
    const user = userEvent.setup();
    const first = await renderPrototype();
    await user.tab();
    expect(document.activeElement).not.toBe(document.body);
    first.unmount();
    seedActor("attendee");
    await renderPrototype("/attendee");
    const signOut = screen.getByRole("button", { name: /sign out/i });
    await tabTo(user, signOut);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(window.location.pathname).toBe("/login"));
  });
});
