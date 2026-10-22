import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { auth, seedActor } from "../fixtures/auth";
import { defaultProgrammeResponse, eveningWorkshop, eventA, installProgramme, json, page } from "../fixtures/programme";
import { renderPrototype } from "../helpers/renderPrototype";

// SILENT-TCR-01 follow-up (attendee pages): a silent focus or non-restored pageshow session check
// must not remount, refetch or reset the attendee pages whose effects depend on the actor/setActor.
beforeEach(() => { seedActor("attendee"); });

const detailRoute = `/attendee/planning/events/${eventA.id}`;
const planningBase = `/api/v1/attendee/events/${eventA.id}/planning`;
const planningState = {
  eventId: eventA.id, stateRevision: 0,
  preferences: { revision: 0, interests: "", budgetMinorUnits: null, currency: "SGD", accessibilityNeeds: "", minimumGapMinutes: 0 },
  bookmarks: [] as string[],
  draft: { revision: 0, preferenceRevision: 0, items: [] as unknown[], validation: { valid: false, totalMinorUnits: 0, currency: "SGD", issues: [{ code: "empty_itinerary", itemIds: [] as string[] }] } },
  acceptedVersions: [] as unknown[], currentAcceptedVersionId: null as string | null,
};
// Wire fixture for the existing planning page: read-only; every attendee request is recorded.
function installPlanning() {
  const authFetch = globalThis.fetch;
  const requests: { method: string; path: string }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin);
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    if (!url.pathname.startsWith("/api/v1/attendee/")) return authFetch(input, init);
    requests.push({ method, path: url.pathname });
    if (url.pathname === planningBase && method === "GET") return json(planningState);
    if (url.pathname === "/api/v1/attendee/events") return json(page([eventA]));
    return defaultProgrammeResponse({ url, method });
  }));
  return { requests };
}
const meRequests = () => auth.requests.filter((request: { path: string }) => request.path === "/api/v1/auth/me");
const sessionScreen = () => screen.queryByText(/checking your session/i);
const pause = (milliseconds = 150) => act(async () => { await new Promise((resolve) => setTimeout(resolve, milliseconds)); });

describe("silent session re-check on attendee pages", () => {
  test.each(["focus", "pageshow"] as const)("SILENT-TCR-02a the planning page keeps its unsaved value and refetches nothing after a silent %s check", async (type) => {
    const network = installPlanning();
    await renderPrototype(detailRoute);
    await screen.findByRole("button", { name: /save preferences/i });
    const interests = screen.getByRole("textbox", { name: /^interests/i });
    fireEvent.change(interests, { target: { value: "Unsaved attendee interests" } });
    await pause();
    const settled = network.requests.length;
    const before = meRequests().length;
    await act(async () => { window.dispatchEvent(new Event(type)); }); // pageshow is not persisted
    await waitFor(() => expect(meRequests().length).toBeGreaterThan(before));
    await pause();
    expect(sessionScreen()).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^interests/i })).toBe(interests);
    expect(interests).toHaveValue("Unsaved attendee interests");
    expect(network.requests).toHaveLength(settled); // no planning or programme GET was repeated
    expect(network.requests.every((request) => request.method === "GET")).toBe(true);
  });

  test.each(["focus", "pageshow"] as const)("SILENT-TCR-02b the programme page keeps its unsaved search and refetches nothing after a silent %s check", async (type) => {
    const network = installProgramme();
    await renderPrototype(`/attendee/programme/events/${eventA.id}`);
    await screen.findByText(eveningWorkshop.title, { exact: true });
    const search = screen.getByRole("textbox", { name: /search.*title|title.*search|search.*activit|search.*programme/i });
    fireEvent.change(search, { target: { value: "Unsaved programme search" } });
    await pause();
    const settled = network.requests.length;
    const before = meRequests().length;
    await act(async () => { window.dispatchEvent(new Event(type)); });
    await waitFor(() => expect(meRequests().length).toBeGreaterThan(before));
    await pause();
    expect(sessionScreen()).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /search.*title|title.*search|search.*activit|search.*programme/i })).toBe(search);
    expect(search).toHaveValue("Unsaved programme search");
    expect(screen.getByText(eveningWorkshop.title, { exact: true })).toBeVisible();
    expect(network.requests).toHaveLength(settled);
  });
});
