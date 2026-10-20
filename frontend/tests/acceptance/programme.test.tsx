import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { auth, seedActor } from "../fixtures/auth";
import { renderPrototype } from "../helpers/renderPrototype";

const event = { id: "22222222-2222-4222-8222-222222222222", title: "Synthetic Convention", timezone: "Asia/Singapore", startsAt: "2027-01-01T00:00:00Z", endsAt: "2027-01-03T00:00:00Z", revision: 1 };
const otherEvent = { ...event, id: "22222222-2222-4222-8222-222222222223", title: "Other Convention" };
const stamp = { revision: 1, createdAt: "2026-10-20T00:00:00Z", updatedAt: "2026-10-20T00:00:00Z" };
const venue = { ...stamp, id: "33333333-3333-4333-8333-333333333333", eventId: event.id, name: "Synthetic Hall", address: "1 Synthetic Road", accessibilityDetails: null };
const room = { ...stamp, id: "44444444-4444-4444-8444-444444444444", eventId: event.id, venueId: venue.id, name: "Orchid Room", maxCapacity: 80, accessibilityDetails: null };
const fields = { roomId: room.id, title: "Synthetic Talk", type: "talk", startsAt: "2027-01-01T01:00:00Z", endsAt: "2027-01-01T02:00:00Z", capacity: 40, priceMinorUnits: 1200, currency: "SGD", accessibilityDetails: "Step-free entrance" };
const draft = { ...stamp, ...fields, id: "55555555-5555-4555-8555-555555555555", eventId: event.id, state: "draft", publishedAt: null as string | null };
type Item = typeof draft;
type RequestRecord = { path: string; method: string; body: Record<string, unknown> };
type User = ReturnType<typeof userEvent.setup>;
type Failure = { method: string; suffix: string; status: number; detail: string; errors?: Record<string, string[]> };
const base = `/api/v1/organiser/events/${event.id}`;
const itemPath = `${base}/programme-items/${draft.id}`;

function json(data: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function storedFields(body: Record<string, unknown>) {
  const stored = { ...body };
  for (const key of ["startsAt", "endsAt"]) {
    if (typeof stored[key] === "string") stored[key] = new Date(stored[key]).toISOString().replace(".000Z", "Z");
  }
  return stored;
}

// HTTP fixtures establish UI integration only, not real validation/auth/persistence.
function programmeServer(options: { unavailable?: boolean; emptyLocations?: boolean; items?: Item[]; events?: typeof event[] } = {}) {
  const previous = globalThis.fetch;
  const requests: RequestRecord[] = [];
  const venues: Record<string, unknown>[] = options.emptyLocations ? [] : [{ ...venue }];
  const rooms: Record<string, unknown>[] = options.emptyLocations ? [] : [{ ...room }];
  const items = (options.items ?? []).map((item) => ({ ...item }));
  let nextFailure: Failure | null = null;
  let findings: Record<string, string[]> = {};
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === "object" && "url" in input ? input.url : String(input), window.location.origin);
    if (!url.pathname.startsWith("/api/v1/organiser/")) return previous(input, init);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    requests.push({ path: url.pathname, method, body });
    const problem = (status: number, detail: string, errors?: Record<string, string[]>) => json({ type: "about:blank", title: status === 409 ? "Conflict" : "Request failed", status, detail, code: status === 409 ? "stale_revision" : "validation_error", instance: url.pathname, ...(errors ? { errors } : {}) }, status);
    if (options.unavailable) return problem(503, "Unable to load programme. Please retry.");
    if (nextFailure && nextFailure.method === method && url.pathname.endsWith(nextFailure.suffix)) {
      const failure = nextFailure; nextFailure = null;
      return problem(failure.status, failure.detail, failure.errors);
    }
    const list = (values: unknown[]) => json({ items: values, total: values.length, limit: 50, offset: 0 });
    if (url.pathname === "/api/v1/organiser/events" && method === "GET") return list(options.events ?? [event]);
    const match = url.pathname.match(/^\/api\/v1\/organiser\/events\/([^/]+)\/(venues|rooms|programme-items)(?:\/([^/]+))?(?:\/(rooms|validate|publish))?$/);
    if (!match) return problem(404, "Unknown programme resource.");
    const [, eventId, resource, id, action] = match;
    const collection = resource === "venues" ? venues : resource === "rooms" ? rooms : items;
    if (method === "GET" && !id) return list(collection.filter((entry) => entry.eventId === eventId));
    const existing = collection.find((entry) => entry.id === id && entry.eventId === eventId);
    if (method === "GET" && existing) return json(existing);
    if (method === "POST" && resource === "venues" && action === "rooms" && existing) {
      const created = { ...stamp, ...body, id: room.id, eventId, venueId: id };
      rooms.push(created); return json(created, 201);
    }
    if (method === "POST" && !id) {
      const created = resource === "venues" ? { ...stamp, ...body, id: venue.id, eventId } : { ...draft, ...storedFields(body), eventId };
      if (resource === "venues") venues.push(created);
      else if (resource === "programme-items") items.push(created as Item);
      else return problem(404, "Create rooms beneath a venue.");
      return json(created, 201);
    }
    if (!existing) return problem(404, "Programme resource not found.");
    if (body.expectedRevision !== existing.revision) return problem(409, "This item changed. Reload and review the current revision.");
    if (resource !== "programme-items") return problem(404, "Unsupported fixture operation.");
    const item = existing as Item;
    if (method === "POST" && action === "validate") return json({ itemId: item.id, revision: item.revision, valid: Object.keys(findings).length === 0, errors: findings });
    if (method === "POST" && action === "publish") {
      Object.assign(item, { state: "published", revision: item.revision + 1, publishedAt: "2026-10-20T01:00:00Z" });
      return json(item);
    }
    if (method === "PATCH") {
      const { expectedRevision: _, ...editable } = storedFields(body);
      Object.assign(item, editable, { revision: item.revision + 1 }); return json(item);
    }
    if (method === "DELETE") { items.splice(items.indexOf(item), 1); return json(null, 204); }
    return problem(404, "Unsupported fixture operation.");
  }));
  return {
    requests, items,
    failNext(failure: Failure) { nextFailure = failure; },
    validationErrors(errors: Record<string, string[]>) { findings = errors; },
    writes() { return requests.filter(({ method }) => method !== "GET"); },
  };
}

async function openProgramme() {
  const user = userEvent.setup();
  await renderPrototype("/organiser");
  await user.click(screen.queryByRole("link", { name: /programme/i }) ?? screen.getByRole("button", { name: /programme/i }));
  return user;
}

async function choose(user: User, label: RegExp, name: string) {
  const control = await screen.findByRole("combobox", { name: label });
  if (control instanceof HTMLSelectElement) await user.selectOptions(control, within(control).getByRole("option", { name }));
  else { await user.click(control); await user.click(await screen.findByRole("option", { name })); }
}

async function replace(user: User, label: RegExp, value: string) {
  const control = screen.getByLabelText(label);
  await user.clear(control); await user.type(control, value);
}

function setLocalTime(label: RegExp, value: string) {
  // datetime-local typing is incomplete in jsdom; dispatch the browser input event.
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

async function fillItem(user: User) {
  await replace(user, /^Title$/i, fields.title);
  await choose(user, /^Type$/i, "Talk");
  await choose(user, /^Room$/i, room.name);
  setLocalTime(/^Starts at$/i, "2027-01-01T09:00");
  setLocalTime(/^Ends at$/i, "2027-01-01T10:00");
  await replace(user, /^Capacity$/i, "40");
  await replace(user, /^Price \(SGD cents\)$/i, "1200");
  await replace(user, /^Accessibility details$/i, fields.accessibilityDetails);
}

function expectCompleteItem(body: Record<string, unknown>, expected = fields) {
  expect(Object.keys(body).sort()).toEqual([...Object.keys(expected), ...(body.expectedRevision === undefined ? [] : ["expectedRevision"])].sort());
  expect(body).toMatchObject({ ...expected, startsAt: expect.any(String), endsAt: expect.any(String) });
  for (const key of ["startsAt", "endsAt"] as const) {
    expect(body[key]).toMatch(/(?:Z|[+-]\d{2}:\d{2})$/);
    expect(new Date(String(body[key])).toISOString()).toBe(new Date(expected[key]).toISOString());
  }
}

describe("organiser programme entry and server states", () => {
  test.each(["light", "dark"])("loads permitted events in %s appearance without publishing anything", async (mode) => {
    localStorage.setItem("eventapp.colorMode", mode); seedActor("organiser");
    const server = programmeServer(); await openProgramme();
    await waitFor(() => expect(server.requests.some(({ path }) => path === "/api/v1/organiser/events")).toBe(true));
    expect(await screen.findByText(/Synthetic Convention/)).toBeVisible();
    expect(screen.getByRole("heading", { name: /programme/i })).toBeVisible();
    expect(server.writes()).toEqual([]); expect(auth.current?.role).toBe("organiser");
  });

  test("distinguishes failed event loading from an empty programme", async () => {
    seedActor("organiser"); programmeServer({ unavailable: true }); await openProgramme();
    expect(await screen.findByRole("alert")).toHaveTextContent(/unable|unavailable|failed|retry/i);
    expect(screen.queryByText(/no programme items/i)).not.toBeInTheDocument();
  });

  test("retains authentication restoration before programme data access", async () => {
    auth.current = null; const server = programmeServer(); await renderPrototype("/organiser/programme");
    expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeVisible(); expect(server.requests).toEqual([]);
  });
});

describe("revision-6 organiser editing (mocked HTTP integration)", () => {
  test("F01-AC01 creates a venue, room and complete private draft using stored IDs", async () => {
    seedActor("organiser"); const server = programmeServer({ emptyLocations: true }); const user = await openProgramme();
    expect(await screen.findByText(/no programme items/i)).toBeVisible();
    await replace(user, /^Venue name$/i, venue.name); await replace(user, /^Venue address$/i, venue.address);
    await user.click(screen.getByRole("button", { name: /^Create venue$/i }));
    await choose(user, /^Venue$/i, venue.name);
    await replace(user, /^Room name$/i, room.name); await replace(user, /^Room capacity$/i, "80");
    await user.click(screen.getByRole("button", { name: /^Create room$/i }));
    await user.click(await screen.findByRole("button", { name: /^New item$/i }));
    await fillItem(user); await user.click(screen.getByRole("button", { name: /^Save draft$/i }));
    expect(await screen.findByRole("button", { name: fields.title })).toBeVisible();
    expect(server.writes().map(({ method, path }) => [method, path])).toEqual([["POST", `${base}/venues`], ["POST", `${base}/venues/${venue.id}/rooms`], ["POST", `${base}/programme-items`]]);
    expect(server.writes()[0].body).toEqual({ name: venue.name, address: venue.address, accessibilityDetails: null });
    expect(server.writes()[1].body).toEqual({ name: room.name, maxCapacity: 80, accessibilityDetails: null });
    expectCompleteItem(server.writes()[2].body);
    expect(server.items[0]).toMatchObject({ ...fields, revision: 1, state: "draft", publishedAt: null });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("F01-AC03/07 saves complete edits with expectedRevision and converts event-local times", async () => {
    seedActor("organiser"); const server = programmeServer({ items: [draft] });
    // Report a UTC browser so implicit browser-zone conversion cannot pass for Singapore.
    const resolved = new Intl.DateTimeFormat().resolvedOptions();
    const browserZone = vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({ ...resolved, timeZone: "UTC" });
    try {
      const user = await openProgramme(); await user.click(await screen.findByRole("button", { name: draft.title }));
      expect(screen.getByLabelText(/^Starts at$/i)).toHaveValue("2027-01-01T09:00");
      expect(screen.getByLabelText(/^Ends at$/i)).toHaveValue("2027-01-01T10:00");
      expect(screen.getByText(/Asia\/Singapore/)).toBeVisible();
      await replace(user, /^Title$/i, "Updated Workshop"); await choose(user, /^Type$/i, "Workshop");
      setLocalTime(/^Starts at$/i, "2027-01-02T00:30"); setLocalTime(/^Ends at$/i, "2027-01-02T01:30");
      await replace(user, /^Capacity$/i, "30"); await replace(user, /^Price \(SGD cents\)$/i, "2500");
      await replace(user, /^Accessibility details$/i, "Hearing loop available");
      await user.click(screen.getByRole("button", { name: /^Save draft$/i }));
      expect(await screen.findByRole("button", { name: "Updated Workshop" })).toBeVisible();
      expect(server.writes()[0]).toMatchObject({ method: "PATCH", path: itemPath, body: { expectedRevision: 1 } });
      expectCompleteItem(server.writes()[0].body, { ...fields, title: "Updated Workshop", type: "workshop", startsAt: "2027-01-01T16:30:00Z", endsAt: "2027-01-01T17:30:00Z", capacity: 30, priceMinorUnits: 2500, accessibilityDetails: "Hearing loop available" });
      expect(await screen.findByText(/^Revision\s*2$/i)).toBeVisible();
      expect(server.items[0].state).toBe("draft"); expect(server.writes()).toHaveLength(1);
    } finally { browserZone.mockRestore(); }
  });

  test("F01-AC03/07 preserves untouched fractional instants on a title-only edit at the event boundary", async () => {
    seedActor("organiser");
    const preciseDraft = { ...draft, startsAt: "2027-01-01T01:00:00.123456Z", endsAt: "2027-01-01T02:00:00.654321Z" };
    const preciseEvent = { ...event, startsAt: preciseDraft.startsAt };
    const server = programmeServer({ items: [preciseDraft], events: [preciseEvent] });
    const user = await openProgramme();
    await user.click(await screen.findByRole("button", { name: preciseDraft.title }));
    await replace(user, /^Title$/i, "Title changed without rescheduling");
    await user.click(screen.getByRole("button", { name: /^Save draft$/i }));
    await waitFor(() => expect(server.writes()).toHaveLength(1));
    // Assert raw HTTP values: JavaScript Date comparisons discard microseconds.
    expect(server.writes()[0]).toEqual({
      method: "PATCH", path: itemPath,
      body: { ...fields, title: "Title changed without rescheduling", startsAt: preciseDraft.startsAt, endsAt: preciseDraft.endsAt, expectedRevision: 1 },
    });
    expect(await screen.findByRole("button", { name: "Title changed without rescheduling" })).toBeVisible();
    expect(await screen.findByText(/^Revision\s*2$/i)).toBeVisible();
    expect(server.items[0].state).toBe("draft");
  });

  test("F01-AC03/AC10 associates server field errors and displays validation findings without changing the draft", async () => {
    seedActor("organiser"); const server = programmeServer({ items: [draft] }); const user = await openProgramme();
    await user.click(await screen.findByRole("button", { name: draft.title }));
    server.failNext({ method: "PATCH", suffix: draft.id, status: 422, detail: "Draft could not be saved.", errors: { capacity: ["Capacity exceeds the current room maximum."] } });
    await replace(user, /^Title$/i, "Unsaved correction"); await user.click(screen.getByRole("button", { name: /^Save draft$/i }));
    expect(await screen.findByText("Capacity exceeds the current room maximum.")).toBeVisible();
    expect(screen.getByLabelText(/^Capacity$/i)).toBeInvalid();
    expect(screen.getByLabelText(/^Capacity$/i)).toHaveAccessibleDescription(/capacity exceeds the current room maximum/i);
    expect(screen.getByLabelText(/^Title$/i)).toHaveValue("Unsaved correction"); expect(server.items[0]).toEqual(draft);
    server.validationErrors({ endsAt: ["End must be within the event dates."] });
    await user.click(screen.getByRole("button", { name: /^Validate$/i }));
    expect(await screen.findByText("End must be within the event dates.")).toBeVisible();
    expect(server.writes().at(-1)).toEqual({ method: "POST", path: `${itemPath}/validate`, body: { expectedRevision: 1 } });
    expect(server.items[0]).toEqual(draft); expect(server.requests.some(({ path }) => path.endsWith("/publish"))).toBe(false);
  });

  test("F01-AC04/07/AC10 requires publish confirmation and makes the returned revision read-only", async () => {
    seedActor("organiser"); const server = programmeServer({ items: [draft] }); const user = await openProgramme();
    await user.click(await screen.findByRole("button", { name: draft.title }));
    await user.click(screen.getByRole("button", { name: /^Publish$/i }));
    let dialog = await screen.findByRole("dialog", { name: /publish/i });
    expect(within(dialog).getByText(new RegExp(draft.title))).toBeVisible(); expect(server.writes()).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: /^Cancel$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); expect(server.items[0]).toEqual(draft);
    await user.click(screen.getByRole("button", { name: /^Publish$/i })); dialog = await screen.findByRole("dialog", { name: /publish/i });
    await user.click(within(dialog).getByRole("button", { name: /^Confirm publish$/i }));
    expect(await screen.findByText(/^Revision\s*2$/i)).toBeVisible();
    expect(screen.getAllByText(/published/i).some((node) => /published/i.test(node.textContent ?? ""))).toBe(true);
    expect(server.writes()).toEqual([{ method: "POST", path: `${itemPath}/publish`, body: { expectedRevision: 1 } }]);
    expect(server.items[0]).toMatchObject({ ...fields, state: "published", revision: 2 });
    for (const action of [/^Save draft$/i, /^Publish$/i, /^Delete$/i]) {
      const button = screen.queryByRole("button", { name: action }); if (button) expect(button).toBeDisabled();
    }
    const title = screen.queryByLabelText(/^Title$/i);
    if (title) expect(title.hasAttribute("readonly") || title.hasAttribute("disabled")).toBe(true);
    await user.click(screen.getByRole("button", { name: draft.title })); expect(server.writes()).toHaveLength(1);
  });

  test("F01-AC07 requires delete confirmation and preserves the visible draft on cancellation", async () => {
    seedActor("organiser"); const server = programmeServer({ items: [draft] }); const user = await openProgramme();
    await user.click(await screen.findByRole("button", { name: draft.title })); await user.click(screen.getByRole("button", { name: /^Delete$/i }));
    let dialog = await screen.findByRole("dialog", { name: /delete/i });
    expect(within(dialog).getByText(new RegExp(draft.title))).toBeVisible(); expect(server.writes()).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: /^Cancel$/i }));
    expect(screen.getByRole("button", { name: draft.title })).toBeVisible(); expect(server.items).toEqual([draft]);
    await user.click(screen.getByRole("button", { name: /^Delete$/i })); dialog = await screen.findByRole("dialog", { name: /delete/i });
    await user.click(within(dialog).getByRole("button", { name: /^Confirm delete$/i }));
    await waitFor(() => expect(screen.queryByRole("button", { name: draft.title })).not.toBeInTheDocument());
    expect(await screen.findByText(/no programme items/i)).toBeVisible();
    expect(server.writes()).toEqual([{ method: "DELETE", path: itemPath, body: { expectedRevision: 1 } }]); expect(server.items).toEqual([]);
  });

  test("F01-AC07 preserves a stale edit until reload shows the winning revision", async () => {
    seedActor("organiser"); const server = programmeServer({ items: [draft] }); const user = await openProgramme();
    await user.click(await screen.findByRole("button", { name: draft.title })); await replace(user, /^Title$/i, "My stale edit");
    Object.assign(server.items[0], { title: "Another organiser's winner", revision: 2 });
    await user.click(screen.getByRole("button", { name: /^Save draft$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/changed|stale|reload|conflict/i);
    expect(screen.getByLabelText(/^Title$/i)).toHaveValue("My stale edit");
    expect(server.items[0]).toMatchObject({ title: "Another organiser's winner", revision: 2, state: "draft" });
    expect(server.writes()).toHaveLength(1); expect(server.writes()[0].body.expectedRevision).toBe(1);
    await user.click(screen.getByRole("button", { name: /^Reload$/i }));
    await waitFor(() => expect(screen.getByLabelText(/^Title$/i)).toHaveValue("Another organiser's winner"));
    expect(screen.getByText(/^Revision\s*2$/i)).toBeVisible();
    await replace(user, /^Title$/i, "Reviewed current draft"); await user.click(screen.getByRole("button", { name: /^Save draft$/i }));
    expect(await screen.findByRole("button", { name: "Reviewed current draft" })).toBeVisible();
    expect(server.writes()[1].body.expectedRevision).toBe(2); expect(server.items[0]).toMatchObject({ title: "Reviewed current draft", revision: 3, state: "draft" });
  });

  test("F01-AC01/07 switching events clears selected draft, unsaved inputs and field errors", async () => {
    seedActor("organiser"); auth.current!.eventMemberships.push({ eventId: otherEvent.id, role: "organiser", status: "active" });
    const server = programmeServer({ items: [draft], events: [event, otherEvent] }); const user = await openProgramme();
    await user.click(await screen.findByRole("button", { name: draft.title })); server.validationErrors({ capacity: ["Current room capacity needs review."] });
    await user.click(screen.getByRole("button", { name: /^Validate$/i })); expect(await screen.findByText("Current room capacity needs review.")).toBeVisible();
    await replace(user, /^Title$/i, "Unsaved first-event edit"); const writesBeforeSwitch = server.writes().length;
    await choose(user, /^Event$/i, otherEvent.title);
    await waitFor(() => expect(server.requests.some(({ path }) => path === `/api/v1/organiser/events/${otherEvent.id}/programme-items`)).toBe(true));
    expect(await screen.findByText(/no programme items/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: draft.title })).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Unsaved first-event edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Current room capacity needs review.")).not.toBeInTheDocument(); expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(server.writes()).toHaveLength(writesBeforeSwitch); expect(server.items[0]).toEqual(draft);
    await user.click(screen.getByRole("button", { name: /^New item$/i })); expect(screen.getByLabelText(/^Title$/i)).toHaveValue("");
    expect(screen.queryByRole("option", { name: room.name })).not.toBeInTheDocument();
  });
});
