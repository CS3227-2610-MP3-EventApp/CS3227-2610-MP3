import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { type Dayjs } from "dayjs";
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
    if (url.pathname === "/api/v1/organiser/programme-events" && method === "GET") return list(options.events ?? [event]);
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
  const field = screen.getByRole("group", { name: label });
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-");
  const [hours, minutes, seconds = "00"] = time.split(":");
  const meridiem = within(field).queryByRole("spinbutton", { name: /^Meridiem$/i });
  const sections = { Year: year, Month: month, Day: day, Hours: meridiem ? String(Number(hours) % 12 || 12) : hours, Minutes: minutes, Seconds: seconds, ...(meridiem ? { Meridiem: Number(hours) < 12 ? "AM" : "PM" } : {}) };
  // Paste through MUI's public accessible sections; no hidden-input mutation.
  for (const [name, content] of Object.entries(sections)) {
    const section = within(field).queryByRole("spinbutton", { name: new RegExp(`^${name}$`, "i") });
    if (!section && name === "Seconds") continue;
    expect(section).not.toBeNull();
    fireEvent.focus(section!);
    fireEvent.paste(section!, { clipboardData: { getData: () => content } });
  }
  fireEvent.blur(field);
}

function expectLocalTime(label: RegExp, expected: { day: number; hours: number; minutes: number }) {
  const field = screen.getByRole("group", { name: label });
  for (const [section, value] of Object.entries(expected)) {
    expect(within(field).getByRole("spinbutton", { name: new RegExp(`^${section}$`, "i") })).toHaveAttribute("aria-valuenow", String(value));
  }
}

async function fillItem(user: User) {
  await replace(user, /^Title$/i, fields.title);
  await choose(user, /^Type$/i, "Talk");
  await choose(user, /^Room$/i, room.name);
  setLocalTime(/^Starts at$/i, "2027-01-01T09:00");
  setLocalTime(/^Ends at$/i, "2027-01-01T10:00");
  await replace(user, /^Capacity$/i, "40");
  await replace(user, /^Price \(SGD\)$/i, "12.00");
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
    await waitFor(() => expect(server.requests.some(({ path }) => path === "/api/v1/organiser/programme-events")).toBe(true));
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
  }, 30_000);

  test("F01-AC03/07 saves complete edits with expectedRevision and converts event-local times", async () => {
    seedActor("organiser"); const server = programmeServer({ items: [draft] });
    // Report a UTC browser so implicit browser-zone conversion cannot pass for Singapore.
    const resolved = new Intl.DateTimeFormat().resolvedOptions();
    const browserZone = vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({ ...resolved, timeZone: "UTC" });
    try {
      const user = await openProgramme(); await user.click(await screen.findByRole("button", { name: draft.title }));
      expectLocalTime(/^Starts at$/i, { day: 1, hours: 9, minutes: 0 });
      expectLocalTime(/^Ends at$/i, { day: 1, hours: 10, minutes: 0 });
      expect(screen.getByText(/Asia\/Singapore/)).toBeVisible();
      await replace(user, /^Title$/i, "Updated Workshop"); await choose(user, /^Type$/i, "Workshop");
      setLocalTime(/^Starts at$/i, "2027-01-02T00:30"); setLocalTime(/^Ends at$/i, "2027-01-02T01:30");
      await replace(user, /^Capacity$/i, "30"); await replace(user, /^Price \(SGD\)$/i, "25.00");
      await replace(user, /^Accessibility details$/i, "Hearing loop available");
      await user.click(screen.getByRole("button", { name: /^Save draft$/i }));
      expect(await screen.findByRole("button", { name: "Updated Workshop" })).toBeVisible();
      expect(server.writes()[0]).toMatchObject({ method: "PATCH", path: itemPath, body: { expectedRevision: 1 } });
      expectCompleteItem(server.writes()[0].body, { ...fields, title: "Updated Workshop", type: "workshop", startsAt: "2027-01-01T16:30:00Z", endsAt: "2027-01-01T17:30:00Z", capacity: 30, priceMinorUnits: 2500, accessibilityDetails: "Hearing loop available" });
      expect(await screen.findByText(/^Revision\s*2$/i)).toBeVisible();
      expect(server.items[0].state).toBe("draft"); expect(server.writes()).toHaveLength(1);
    } finally { browserZone.mockRestore(); }
  }, 30_000);

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

describe("approved programme UI refinements (mocked HTTP integration)", () => {
  test("the date helper edits actual installed MUI accessible sections and its calendar supports keyboard selection", async () => {
    const changed = vi.fn();
    function PickerHarness() {
      const [value, setValue] = useState<Dayjs | null>(dayjs("2027-01-01T09:00:00"));
      return <LocalizationProvider dateAdapter={AdapterDayjs}><DateTimePicker label="Starts at" value={value} onChange={(next) => { setValue(next); changed(next?.format("YYYY-MM-DDTHH:mm:ss")); }} format="YYYY-MM-DD HH:mm:ss" ampm={false} views={["year", "month", "day", "hours", "minutes", "seconds"]} /></LocalizationProvider>;
    }
    const user = userEvent.setup(); render(<PickerHarness />);
    setLocalTime(/^Starts at$/i, "2027-01-02T10:35:14");
    expectLocalTime(/^Starts at$/i, { day: 2, hours: 10, minutes: 35 });
    expect(changed).toHaveBeenLastCalledWith("2027-01-02T10:35:14");
    const field = screen.getByRole("group", { name: /^Starts at$/i });
    await user.click(within(field).getByRole("button", { name: /choose date/i }));
    const calendar = await screen.findByRole("grid");
    within(calendar).getByRole("gridcell", { name: /^2$/ }).focus();
    await user.keyboard("{ArrowRight}{Enter}");
    const accept = screen.queryByRole("button", { name: /^OK$/i });
    if (accept) await user.click(accept);
    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    expect(changed).toHaveBeenLastCalledWith("2027-01-03T10:35:14");
    await user.click(within(field).getByRole("spinbutton", { name: /^Year$/i }));
    await user.keyboard("{Delete}");
    expect(within(field).getByRole("spinbutton", { name: /^Year$/i })).not.toHaveAttribute("aria-valuenow");
  });

  test("keeps empty Venue and Room labels floated above their choice placeholders", async () => {
    seedActor("organiser"); const server = programmeServer(); const user = await openProgramme();
    const venueControl = await screen.findByRole("combobox", { name: /^Venue$/i });
    expect(venueControl).toHaveDisplayValue("Choose a venue");
    // MUI exposes the shrink state; jsdom cannot establish pixel non-overlap.
    expect(screen.getByText("Venue", { selector: "label" })).toHaveAttribute("data-shrink", "true");
    await user.click(screen.getByRole("button", { name: /^New item$/i }));
    expect(screen.getByRole("combobox", { name: /^Room$/i })).toHaveDisplayValue("Choose a room");
    expect(screen.getByText("Room", { selector: "label" })).toHaveAttribute("data-shrink", "true");
    await choose(user, /^Venue$/i, venue.name); await choose(user, /^Room$/i, room.name);
    expect(screen.getByRole("combobox", { name: /^Venue$/i })).toHaveValue(venue.id);
    expect(screen.getByRole("combobox", { name: /^Room$/i })).toHaveValue(room.id);
    expect(server.writes()).toEqual([]);
  });

  test("uses labelled pencil and trash controls while preserving location editing and delete confirmation", async () => {
    seedActor("organiser"); const server = programmeServer(); const user = await openProgramme();
    for (const [kind, name] of [["venue", venue.name], ["room", room.name]]) {
      for (const action of ["Edit", "Delete"]) {
        const button = await screen.findByRole("button", { name: `${action} ${kind} ${name}` });
        expect(button.querySelector("svg")).not.toBeNull();
        expect(button.textContent?.trim()).toBe("");
      }
    }
    await user.click(screen.getByRole("button", { name: `Edit venue ${venue.name}` }));
    expect(screen.getByLabelText(/^Venue name$/i)).toHaveValue(venue.name);
    await user.click(screen.getByRole("button", { name: /^Cancel venue edit$/i }));
    await user.click(screen.getByRole("button", { name: `Edit room ${room.name}` }));
    expect(screen.getByLabelText(/^Room name$/i)).toHaveValue(room.name);
    expect(screen.getByRole("combobox", { name: /^Venue$/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /^Cancel room edit$/i }));
    expect(screen.getByRole("button", { name: `Delete venue ${venue.name}` })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: `Delete room ${room.name}` }));
    const dialog = await screen.findByRole("dialog", { name: /delete/i });
    expect(within(dialog).getByText(room.name)).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: /^Cancel$/i }));
    expect(server.writes()).toEqual([]);
  });

  test.each([
    ["12.50", 1250], [" 12.50 ", 1250], ["0", 0], ["0.01", 1], ["0.29", 29], ["19.99", 1999], ["1.2", 120], ["21474836.47", 2147483647],
  ])("saves SGD %s as exactly %i integer cents and displays stored dollars", async (input, cents) => {
    seedActor("organiser"); const server = programmeServer({ items: [draft] }); const user = await openProgramme();
    await user.click(await screen.findByRole("button", { name: draft.title }));
    const price = screen.getByLabelText(/^Price \(SGD\)$/i);
    expect(price).toHaveDisplayValue("12.00");
    await replace(user, /^Price \(SGD\)$/i, input);
    await user.click(screen.getByRole("button", { name: /^Save draft$/i }));
    await waitFor(() => expect(server.writes()).toHaveLength(1));
    expect(server.writes()[0]).toEqual({ method: "PATCH", path: itemPath, body: { ...fields, priceMinorUnits: cents, expectedRevision: 1 } });
    expect(await screen.findByText(/^Revision\s*2$/i)).toBeVisible();
    expect(screen.getByLabelText(/^Price \(SGD\)$/i)).toHaveDisplayValue((cents / 100).toFixed(2));
    expect(server.items[0]).toMatchObject({ priceMinorUnits: cents, currency: "SGD", state: "draft" });
  });

  test.each(["-1", "bad", "", "1e2", "+1", "1,000", "0.001", "12.500", "21474836.48", "9999999999999999999"])("rejects invalid dollar amount %j without rounding or sending a mutation", async (input) => {
    seedActor("organiser"); const server = programmeServer({ items: [draft] }); const user = await openProgramme();
    await user.click(await screen.findByRole("button", { name: draft.title }));
    const price = screen.getByLabelText(/^Price \(SGD\)$/i);
    // Inject the exact raw input, including forms that type=number sanitizes.
    fireEvent.change(price, { target: { value: input } });
    await user.click(screen.getByRole("button", { name: /^Save draft$/i }));
    expect(price).toBeInvalid();
    expect(price).toHaveAccessibleDescription(/SGD|decimal|amount|price|number/i);
    expect(server.writes()).toEqual([]); expect(server.items).toEqual([draft]);
    expect(screen.getByText(/^Revision\s*1$/i)).toBeVisible();
  });

  test("opens the activity calendar, selects a day by keyboard, and saves event-zone instants", async () => {
    seedActor("organiser"); const server = programmeServer({ items: [draft] }); const user = await openProgramme();
    await user.click(await screen.findByRole("button", { name: draft.title }));
    const start = screen.getByRole("group", { name: /^Starts at$/i });
    const end = screen.getByRole("group", { name: /^Ends at$/i });
    expect(within(start).getByRole("spinbutton", { name: /^Hours$/i })).toBeVisible();
    expect(within(end).getByRole("button", { name: /choose date/i })).toBeEnabled();
    await user.click(within(start).getByRole("button", { name: /choose date/i }));
    const calendar = await screen.findByRole("grid");
    const day = within(calendar).getByRole("gridcell", { name: /^1$/ });
    day.focus(); await user.keyboard("{ArrowRight}{Enter}");
    const accept = screen.queryByRole("button", { name: /^OK$/i });
    if (accept) await user.click(accept);
    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    expectLocalTime(/^Starts at$/i, { day: 2, hours: 9, minutes: 0 });
    setLocalTime(/^Ends at$/i, "2027-01-02T10:00");
    await user.click(screen.getByRole("button", { name: /^Save draft$/i }));
    await waitFor(() => expect(server.writes()).toHaveLength(1));
    expectCompleteItem(server.writes()[0].body, { ...fields, startsAt: "2027-01-02T01:00:00Z", endsAt: "2027-01-02T02:00:00Z" });
    expect(server.writes()[0].body.expectedRevision).toBe(1);
  });

  test("rejects invalid activity date order and out-of-event dates without changing stored facts", async () => {
    seedActor("organiser"); const server = programmeServer({ items: [draft] }); const user = await openProgramme();
    await user.click(await screen.findByRole("button", { name: draft.title }));
    setLocalTime(/^Ends at$/i, "2027-01-01T08:30");
    await user.click(screen.getByRole("button", { name: /^Save draft$/i }));
    expect(await screen.findByText(/end must follow start/i)).toBeVisible();
    expect(server.writes()).toEqual([]); expect(server.items).toEqual([draft]);
    setLocalTime(/^Starts at$/i, "2026-12-31T09:00");
    setLocalTime(/^Ends at$/i, "2027-01-01T10:00");
    await user.click(screen.getByRole("button", { name: /^Save draft$/i }));
    expect(await screen.findByText(/start must be within the event dates/i)).toBeVisible();
    expect(server.writes()).toEqual([]); expect(server.items).toEqual([draft]);
  });

  test("rejects a DST gap entered through the calendar field without silently moving the activity", async () => {
    seedActor("organiser");
    const gapEvent = { ...event, timezone: "America/New_York", startsAt: "2027-03-14T05:00:00Z", endsAt: "2027-03-15T04:00:00Z" };
    const gapItem = { ...draft, startsAt: "2027-03-14T06:00:00Z", endsAt: "2027-03-14T08:00:00Z" };
    const server = programmeServer({ events: [gapEvent], items: [gapItem] }); const user = await openProgramme();
    await user.click(await screen.findByRole("button", { name: gapItem.title }));
    setLocalTime(/^Starts at$/i, "2027-03-14T02:30:00");
    expectLocalTime(/^Starts at$/i, { day: 14, hours: 2, minutes: 30 });
    await user.click(screen.getByRole("button", { name: /^Save draft$/i }));
    expect(await screen.findByText(/valid local time|not exist/i)).toBeVisible();
    expect(server.writes()).toEqual([]); expect(server.items).toEqual([gapItem]);
  });

  test("rejects a partially cleared activity date and preserves the saved draft", async () => {
    seedActor("organiser"); const server = programmeServer({ items: [draft] }); const user = await openProgramme();
    await user.click(await screen.findByRole("button", { name: draft.title }));
    const start = screen.getByRole("group", { name: /^Starts at$/i });
    await user.click(within(start).getByRole("spinbutton", { name: /^Year$/i }));
    await user.keyboard("{Delete}");
    expect(within(start).getByRole("spinbutton", { name: /^Year$/i })).not.toHaveAttribute("aria-valuenow");
    await user.click(screen.getByRole("button", { name: /^Save draft$/i }));
    expect(await screen.findByText(/valid local time|date.*required|invalid date/i)).toBeVisible();
    expect(server.writes()).toEqual([]); expect(server.items).toEqual([draft]);
  });

  test("requires an explicit DST fold offset and saves the selected occurrence", async () => {
    seedActor("organiser");
    const foldEvent = { ...event, timezone: "America/New_York", startsAt: "2027-11-07T04:00:00Z", endsAt: "2027-11-08T05:00:00Z" };
    const foldItem = { ...draft, startsAt: "2027-11-07T04:30:00Z", endsAt: "2027-11-07T08:00:00Z" };
    const server = programmeServer({ events: [foldEvent], items: [foldItem] }); const user = await openProgramme();
    await user.click(await screen.findByRole("button", { name: foldItem.title }));
    setLocalTime(/^Starts at$/i, "2027-11-07T01:30:00");
    await user.click(screen.getByRole("button", { name: /^Save draft$/i }));
    expect(await screen.findByText(/choose an explicit offset/i)).toBeVisible();
    expect(server.writes()).toEqual([]); expect(server.items).toEqual([foldItem]);
    await choose(user, /^Start offset$/i, "UTC−05:00");
    await user.click(screen.getByRole("button", { name: /^Save draft$/i }));
    await waitFor(() => expect(server.writes()).toHaveLength(1));
    expectCompleteItem(server.writes()[0].body, { ...fields, startsAt: "2027-11-07T06:30:00Z", endsAt: foldItem.endsAt });
    expect(server.writes()[0].body.expectedRevision).toBe(1);
  });

  test("retains published item and parent read-only protections with the new controls", async () => {
    seedActor("organiser");
    const published = { ...draft, state: "published", publishedAt: "2026-10-20T01:00:00Z" };
    const server = programmeServer({ items: [published] }); const user = await openProgramme();
    await user.click(await screen.findByRole("button", { name: published.title }));
    expect(screen.getByLabelText(/^Price \(SGD\)$/i)).toBeDisabled();
    for (const label of [/^Starts at$/i, /^Ends at$/i]) {
      const group = screen.getByRole("group", { name: label });
      for (const section of within(group).getAllByRole("spinbutton")) expect(section).toHaveAttribute("aria-disabled", "true");
      expect(within(group).getByRole("button", { name: /choose date/i })).toBeDisabled();
    }
    await user.click(screen.getByRole("button", { name: `Edit venue ${venue.name}` }));
    expect(screen.getByLabelText(/^Venue name$/i)).toBeDisabled();
    await user.click(screen.getByRole("button", { name: `Edit room ${room.name}` }));
    expect(screen.getByLabelText(/^Room name$/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: `Delete room ${room.name}` })).toBeDisabled();
    expect(server.writes()).toEqual([]); expect(server.items).toEqual([published]);
  });
});
