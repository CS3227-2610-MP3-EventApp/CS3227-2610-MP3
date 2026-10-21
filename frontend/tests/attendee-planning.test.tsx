import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { seedActor } from "./fixtures/auth";
import { renderPrototype } from "./helpers/renderPrototype";
import { defaultProgrammeResponse, eveningWorkshop, eventA, freeTalk, json, page } from "./fixtures/programme";

// Wire fixtures test observable UI behavior, not server enforcement/persistence.
// Those obligations are covered by independent real-PostgreSQL API tests.
const base = `/api/v1/attendee/events/${eventA.id}/planning`;
const detailRoute = `/attendee/planning/events/${eventA.id}`;
const acceptedId = "00000000-0000-4000-8000-000000000099";
function emptyState() {
  return { eventId: eventA.id, stateRevision: 0,
    preferences: { revision: 0, interests: "", budgetMinorUnits: null as number | null, currency: "SGD", accessibilityNeeds: "", minimumGapMinutes: 0 },
    bookmarks: [] as string[], draft: { revision: 0, preferenceRevision: 0, items: [] as ReturnType<typeof entry>[], validation: { valid: false, totalMinorUnits: 0, currency: "SGD", issues: [{ code: "empty_itinerary", itemIds: [] as string[] }] } },
    acceptedVersions: [] as { id: string; version: number; acceptedAt: string }[], currentAcceptedVersionId: null as string | null };
}
function entry(item = eveningWorkshop, confirmed = false) {
  return { programmeItemId: item.id, observedProgrammeRevision: item.revision, accessibilityConfirmed: confirmed,
    currentItem: item, currentProgrammeRevision: item.revision, changed: false };
}
let state: ReturnType<typeof emptyState>;
let requests: { method: string; path: string; body: Record<string, unknown> | null; credentials?: RequestCredentials }[];
let respond: (method: string, path: string, body: Record<string, unknown> | null) => Response | Promise<Response>;
beforeEach(() => {
  seedActor("attendee"); state = emptyState(); requests = [];
  const authFetch = globalThis.fetch;
  respond = (method) => { if (method === "GET") return json(state); throw new Error("Unassigned planning write"); };
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin);
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    if (!url.pathname.startsWith("/api/v1/attendee/")) return authFetch(input, init);
    if (url.pathname.startsWith(base)) {
      const raw = init?.body ?? (input instanceof Request && method !== "GET" ? await input.clone().text() : null);
      const body = typeof raw === "string" && raw ? JSON.parse(raw) as Record<string, unknown> : null;
      requests.push({ method, path: url.pathname, body, credentials: init?.credentials ?? (input instanceof Request ? input.credentials : undefined) });
      return respond(method, url.pathname, body);
    }
    if (url.pathname === "/api/v1/attendee/events") return json(page([eventA]));
    return defaultProgrammeResponse({ url, method });
  }));
});
const button = (name: RegExp) => screen.getByRole("button", { name });
async function open() { await renderPrototype(detailRoute); await screen.findByRole("button", { name: /save preferences/i }); }
function problem(code: string, status = 409) {
  return new Response(JSON.stringify({ type: "about:blank", title: "Conflict", status, detail: "Synthetic raw private detail must not render", instance: base, code, currentState: state }), { status, headers: { "Content-Type": "application/problem+json" } });
}

test("F02-UI01 My Itinerary is an enabled keyboard-accessible entry to published events", async () => {
  const user = userEvent.setup();
  await renderPrototype("/attendee");
  const action = screen.queryByRole("link", { name: /my itinerary/i }) ?? screen.queryByRole("button", { name: /my itinerary/i });
  expect(action).not.toBeNull(); expect(action).toBeEnabled();
  (action as HTMLElement).focus(); await user.keyboard("{Enter}");
  await user.click(await screen.findByText(eventA.title, { exact: true }));
  await screen.findByRole("button", { name: /save preferences/i });
  expect(requests.some(x => x.path === base && x.method === "GET")).toBe(true);
  expect(requests.every(x => ["include", "same-origin"].includes(x.credentials ?? ""))).toBe(true);
});

test("F02-UI02 exact SGD dollars and private text save through the revisioned preference API", async () => {
  const user = userEvent.setup(); await open();
  await user.type(screen.getByRole("textbox", { name: /^interests/i }), "Art");
  await user.type(screen.getByLabelText(/budget.*SGD|SGD.*budget/i), "12.50");
  await user.type(screen.getByRole("textbox", { name: /accessibility needs/i }), "Step-free");
  respond = (method, path, body) => {
    if (method === "GET") return json(state);
    expect(path).toBe(base + "/preferences");
    expect(body).toEqual({ expectedStateRevision: 0, interests: "Art", budgetMinorUnits: 1250, currency: "SGD", accessibilityNeeds: "Step-free", minimumGapMinutes: 0 });
    state = { ...state, stateRevision: 1, preferences: { ...state.preferences, revision: 1, interests: "Art", budgetMinorUnits: 1250, accessibilityNeeds: "Step-free" } };
    return json(state);
  };
  await user.click(button(/save preferences/i));
  await waitFor(() => expect(requests.some(x => x.method === "PUT")).toBe(true));
  expect(requests.find(x => x.method === "PUT")?.body).toEqual({ expectedStateRevision: 0, interests: "Art", budgetMinorUnits: 1250, currency: "SGD", accessibilityNeeds: "Step-free", minimumGapMinutes: 0 });
  expect(screen.getByRole("textbox", { name: /^interests/i })).toHaveValue("Art");
});

test("F02-UI03 unknown accessibility remains unknown and confirmation is explicit", async () => {
  state.preferences = { ...state.preferences, revision: 1, accessibilityNeeds: "Step-free" };
  state.stateRevision = 2; state.draft = { revision: 1, preferenceRevision: 1, items: [entry()], validation: { valid: false, totalMinorUnits: 1250, currency: "SGD", issues: [{ code: "accessibility_unconfirmed", itemIds: [eveningWorkshop.id] }] } };
  await open();
  expect(await screen.findByText(/accessibility information not provided|accessibility.*unknown/i)).toBeVisible();
  const confirmation = screen.getByRole("checkbox", { name: /confirm.*suitab|suitab.*confirm/i });
  expect(confirmation).not.toBeChecked();
  expect(screen.queryByText(/guaranteed accessible|verified accessible/i)).not.toBeInTheDocument();
});

test("F02-UI04 overlapping draft shows warning and preserves the accepted version", async () => {
  state.currentAcceptedVersionId = acceptedId;
  state.acceptedVersions = [{ id: acceptedId, version: 1, acceptedAt: "2026-10-20T10:00:00Z" }];
  state.draft = { revision: 2, preferenceRevision: 0, items: [entry()], validation: { valid: false, totalMinorUnits: 1250, currency: "SGD", issues: [{ code: "overlap", itemIds: [eveningWorkshop.id] }] } };
  await open();
  expect(await screen.findByText(/overlap/i)).toBeVisible();
  expect(screen.getByRole("button", { name: /save draft/i })).toBeEnabled();
  const accept = button(/accept itinerary/i);
  if (!accept.hasAttribute("disabled")) {
    respond = (method) => method === "GET" ? json(state) : problem("constraint_violation");
    await userEvent.setup().click(accept);
    expect(await screen.findByText(/overlap|constraint|cannot.*accept/i)).toBeVisible();
  }
  expect(state.currentAcceptedVersionId).toBe(acceptedId);
  expect(requests.filter(x => x.method !== "GET").every(x => x.path === base + "/accept")).toBe(true);
});

test("F02-UI05 acceptance is explicit and submits current revision tokens", async () => {
  state.stateRevision = 3; state.preferences.revision = 1;
  state.draft = { revision: 2, preferenceRevision: 1, items: [entry(freeTalk)], validation: { valid: true, totalMinorUnits: 0, currency: "SGD", issues: [] } };
  await open(); expect(requests.every(x => x.method === "GET")).toBe(true);
  respond = (method, path, body) => {
    if (method === "GET") return json(state);
    expect(path).toBe(base + "/accept");
    expect(body).toEqual({ expectedStateRevision: 3, expectedDraftRevision: 2, expectedPreferenceRevision: 1 });
    state = { ...state, stateRevision: 4, currentAcceptedVersionId: acceptedId, acceptedVersions: [{ id: acceptedId, version: 1, acceptedAt: "2026-10-20T10:00:00Z" }] };
    return json(state);
  };
  await userEvent.setup().click(button(/accept itinerary/i));
  await waitFor(() => expect(requests.some(x => x.path.endsWith("/accept"))).toBe(true));
  expect(requests.find(x => x.path.endsWith("/accept"))?.body).toEqual({ expectedStateRevision: 3, expectedDraftRevision: 2, expectedPreferenceRevision: 1 });
});

test("F02-UI06 stale preference save reports conflict without exposing raw server detail", async () => {
  const user = userEvent.setup(); await open();
  await user.type(screen.getByRole("textbox", { name: /^interests/i }), "Unsaved");
  respond = (method) => method === "GET" ? json(state) : problem("stale_revision");
  await user.click(button(/save preferences/i));
  expect(await screen.findByText(/changed|conflict|reload|stale/i)).toBeVisible();
  expect(screen.queryByText(/Synthetic raw private detail/)).not.toBeInTheDocument();
  expect(state.preferences.interests).toBe("");
});

test("F02-UI07 failed read offers retry and never fabricates a successful empty save", async () => {
  respond = () => problem("service_unavailable", 503);
  await renderPrototype(detailRoute);
  const retry = await screen.findByRole("button", { name: /retry|try again/i });
  respond = () => json(state);
  await userEvent.setup().click(retry);
  await screen.findByRole("button", { name: /save preferences/i });
  expect(requests.every(x => x.method === "GET")).toBe(true);
});

test("F02-UI08 owner deletion requires confirmation and current revision", async () => {
  state.stateRevision = 5; state.preferences.interests = "Private interests";
  await open(); const user = userEvent.setup();
  await user.click(button(/delete.*planning|delete.*data/i));
  expect(requests.every(x => x.method === "GET")).toBe(true);
  const confirm = await screen.findByRole("button", { name: /confirm.*delet|^delete$/i });
  respond = (method, path, body) => {
    if (method === "DELETE") { expect(path).toBe(base); expect(body).toEqual({ expectedStateRevision: 5 }); state = { ...emptyState(), stateRevision: 6 }; return new Response(null, { status: 204 }); }
    return json(state);
  };
  await user.click(confirm);
  await waitFor(() => expect(requests.some(x => x.method === "DELETE")).toBe(true));
  expect(requests.find(x => x.method === "DELETE")?.body).toEqual({ expectedStateRevision: 5 });
  await waitFor(() => expect(screen.getByRole("textbox", { name: /^interests/i })).toHaveValue(""));
});

test("F02-UI09 bookmark and manual draft controls persist independently with current tokens", async () => {
  const user = userEvent.setup(); await open();
  const itemScope = () => {
    const title = screen.getAllByText(eveningWorkshop.title, { exact: true })[0];
    const region = title.closest("article") ?? title.closest("li") ?? title.closest("section");
    expect(region, "Each programme activity needs a semantically grouped set of actions").not.toBeNull();
    return within(region as HTMLElement);
  };
  respond = (method, path, body) => {
    if (method === "GET") return json(state);
    if (path === base + "/bookmarks/" + eveningWorkshop.id) {
      state = { ...state, stateRevision: state.stateRevision + 1, bookmarks: method === "PUT" ? [eveningWorkshop.id] : [] };
      return json(state);
    }
    if (path === base + "/draft") {
      const submitted = body?.items as { programmeItemId: string }[];
      state = { ...state, stateRevision: state.stateRevision + 1, draft: { revision: state.draft.revision + 1, preferenceRevision: 0, items: submitted.length ? [entry()] : [], validation: { valid: submitted.length > 0, totalMinorUnits: submitted.length ? 1250 : 0, currency: "SGD", issues: [] } } };
      return json(state);
    }
    throw new Error("Unassigned central journey write");
  };
  await user.click(itemScope().getByRole("button", { name: /^bookmark|add.*bookmark/i }));
  await waitFor(() => expect(requests.some(x => x.method === "PUT" && x.path.endsWith("/bookmarks/" + eveningWorkshop.id))).toBe(true));
  expect(requests.find(x => x.path.endsWith("/bookmarks/" + eveningWorkshop.id))?.body).toEqual({ expectedStateRevision: 0 });
  expect(requests.some(x => x.path.endsWith("/draft") && x.method !== "GET")).toBe(false);
  await user.click(itemScope().getByRole("button", { name: /add.*(?:draft|itinerary|plan)/i }));
  await user.click(button(/save draft/i));
  await waitFor(() => expect(requests.some(x => x.path.endsWith("/draft") && x.method === "PUT")).toBe(true));
  const draftWrite = requests.find(x => x.path.endsWith("/draft") && x.method === "PUT");
  expect(draftWrite?.body).toEqual({ expectedStateRevision: 1, expectedPreferenceRevision: 0, items: [{ programmeItemId: eveningWorkshop.id, observedProgrammeRevision: eveningWorkshop.revision, accessibilityConfirmed: false }] });
  expect(requests.some(x => x.path.endsWith("/accept"))).toBe(false);
  await user.click(itemScope().getByRole("button", { name: /remove.*bookmark|unbookmark/i }));
  await waitFor(() => expect(requests.some(x => x.method === "DELETE")).toBe(true));
  expect(requests.find(x => x.method === "DELETE")?.body).toEqual({ expectedStateRevision: 2 });
  const remove = screen.getByRole("button", { name: /remove.*(?:draft|itinerary|plan)/i });
  await user.click(remove); await user.click(button(/save draft/i));
  await waitFor(() => expect(requests.filter(x => x.path.endsWith("/draft") && x.method === "PUT")).toHaveLength(2));
  expect(requests.filter(x => x.path.endsWith("/draft") && x.method === "PUT")[1].body).toEqual({ expectedStateRevision: 3, expectedPreferenceRevision: 0, items: [] });
});
