import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { actor, auth, seedActor } from "../fixtures/auth";
import { renderPrototype, tabTo } from "../helpers/renderPrototype";
import {
  defaultProgrammeResponse, deferred, detailPath, eveningWorkshop, eventA, eventB, freeTalk,
  installProgramme, itemsPath, json, literalTitleItem, page, problem, programmeRoot, secondEventItem,
} from "../fixtures/programme";

type User = ReturnType<typeof userEvent.setup>;
let network: ReturnType<typeof installProgramme>;
beforeEach(() => { seedActor("attendee"); network = installProgramme(); });

// Enter via the existing home card. No new browser route is invented here.
// Accept either a named link/button or the card's single accessible action.
function browseAction() {
  const named = screen.queryByRole("link", { name: /browse programme/i })
    ?? screen.queryByRole("button", { name: /browse programme/i });
  if (named) return named;
  const card = screen.getByRole("heading", { name: "Browse Programme" }).closest("article");
  expect(card, "Browse Programme needs an accessible enabled action").not.toBeNull();
  const scope = within(card as HTMLElement);
  return scope.queryByRole("link") ?? scope.getByRole("button");
}
async function enterBrowse(user: User) {
  const action = browseAction();
  expect(action, "approved Browse Programme journey must be enabled").toBeEnabled();
  await user.click(action);
}
async function openBrowse(user: User) {
  await renderPrototype("/attendee");
  await enterBrowse(user);
}
async function openEvent(user: User, title = eventA.title) {
  await user.click(await screen.findByText(title, { exact: true }));
}
async function openItems(user: User) {
  await openBrowse(user);
  await openEvent(user);
  await screen.findByText(eveningWorkshop.title, { exact: true });
}
function titleSearch() { return screen.getByRole("textbox", { name: /search.*title|title.*search|search.*activit|search.*programme/i }); }
function typeFilter() { return screen.getByRole("combobox", { name: /type/i }); }
function dateFilter() { return screen.getByLabelText(/date/i); }
async function applyFilters(user: User) {
  // Both live filtering and an explicit labelled Apply/Search control are allowed.
  const submit = screen.queryByRole("button", { name: /^(apply(?: filters)?|search|filter)$/i });
  if (submit) await user.click(submit);
}
async function chooseType(user: User, label: string, token: string) {
  const control = typeFilter();
  if (control instanceof HTMLSelectElement) {
    expect(within(control).getByRole("option", { name: label })).toHaveValue(token);
    await user.selectOptions(control, token);
  } else { await user.click(control); await user.click(await screen.findByRole("option", { name: label })); }
}
function matchingRequest(path: string, query: Record<string, string>) {
  return network.requests.find(({ url }) => url.pathname === path
    && Object.entries(query).every(([key, value]) => url.searchParams.get(key) === value));
}
function effectiveOffset(url: URL) { return Number(url.searchParams.get("offset") ?? "0"); }
const twentyItems = [eveningWorkshop, ...Array.from({ length: 19 }, (_, index) => ({
  ...eveningWorkshop, id: `00000000-0000-4000-8000-${String(100 + index).padStart(12, "0")}`,
  title: `Additional activity ${index + 1}`,
}))];
function expectNoNextPage() {
  const next = screen.queryByRole("button", { name: /next/i });
  if (next) expect(next).toBeDisabled();
  else expect(next).not.toBeInTheDocument();
}
async function nextPage(user: User) { await user.click(screen.getByRole("button", { name: /next/i })); }
async function retry(user: User) { await user.click(screen.getByRole("button", { name: /retry|try again/i })); }
async function settle(action: () => void) { await act(async () => { action(); await Promise.resolve(); }); }

describe("programme browsing consumer acceptance (rev7; network fixtures, not a server)", () => {
  test("PB01 opens visible events with keyboard and credentialed read requests", async () => {
    const user = userEvent.setup();
    await renderPrototype("/attendee");
    const action = browseAction();
    expect(action).toBeEnabled();
    await tabTo(user, action, 40);
    await user.keyboard("{Enter}");
    expect(await screen.findByText(eventA.title, { exact: true })).toBeVisible();
    expect(screen.getByText(eventB.title, { exact: true })).toBeVisible();
    const reads = network.requests.filter(({ url }) => url.pathname === `${programmeRoot}/events`);
    expect(reads.length).toBeGreaterThan(0);
    expect(reads.every(({ method, credentials }) => method === "GET" && (credentials === "include" || credentials === "same-origin"))).toBe(true);
    expect(auth.current?.eventMemberships).toEqual([]);
  });

  test("PB02 opens event items then exact detail with price, capacity and separate accessibility evidence", async () => {
    const user = userEvent.setup();
    await openItems(user);
    await user.click(screen.getByText(eveningWorkshop.title, { exact: true }));
    await waitFor(() => expect(network.requests.some(({ url }) => url.pathname === detailPath())).toBe(true));
    expect(await screen.findByText("SGD 12.50", { exact: false })).toBeVisible();
    expect(screen.getByText(/capacity.*30|30.*capacity|^30$/i)).toBeVisible();
    expect(screen.getByText("Room A", { exact: false })).toBeVisible();
    expect(screen.getByText("Demo Hall", { exact: false })).toBeVisible();
    expect(screen.getByText("1 Example Road", { exact: false })).toBeVisible();
    expect(screen.getByText("Lift to room", { exact: false })).toBeVisible();
    expect(screen.getByText("Step-free main entrance", { exact: false })).toBeVisible();
    expect(screen.getByText("Accessibility information not provided", { exact: false })).toBeVisible();
    expect(screen.queryByText(/seats remaining|tickets remaining|guaranteed accessible/i)).not.toBeInTheDocument();
    expect(network.requests.every(({ method, credentials }) => method === "GET" && (credentials === "include" || credentials === "same-origin"))).toBe(true);
  });

  test("PB03 displays overnight times in the event timezone and zero price as Free", async () => {
    const user = userEvent.setup();
    await openItems(user);
    expect(screen.getByText(/^free$/i)).toBeVisible();
    await user.click(screen.getByText(eveningWorkshop.title, { exact: true }));
    await waitFor(() => expect(network.requests.some(({ url }) => url.pathname === detailPath())).toBe(true));
    // The jsdom runtime is run with TZ=UTC: these are Singapore-local 23:30 / 01:00.
    expect(screen.getByText(/23:30|11:30\s*p\.?m\.?/i)).toBeVisible();
    expect(screen.getByText(/01:00|1:00\s*a\.?m\.?/i)).toBeVisible();
    expect(screen.getByText(/20.*oct|oct.*20|2026-10-20/i)).toBeVisible();
    expect(screen.getByText(/21.*oct|oct.*21|2026-10-21/i)).toBeVisible();
  });

  test("PB04 sends literal title text and combines type/date filters in one event-scoped request", async () => {
    const user = userEvent.setup();
    await openItems(user);
    const query = "STRASSE 100%_Ready \\ 'workshop'";
    network.respond = (request) => request.url.pathname === itemsPath()
      ? json(page([literalTitleItem])) : defaultProgrammeResponse(request);
    await user.type(titleSearch(), query);
    await chooseType(user, "Workshop", "workshop");
    fireEvent.change(dateFilter(), { target: { value: "2026-10-21" } });
    await applyFilters(user);
    await waitFor(() => expect(matchingRequest(itemsPath(), { q: query, type: "workshop", date: "2026-10-21" })).toBeDefined());
    expect(await screen.findByText(literalTitleItem.title, { exact: true })).toBeVisible();
    expect(screen.queryByText(freeTalk.title, { exact: true })).not.toBeInTheDocument();
    // We assert transport + rendering only; the fixture does not implement casefold/AND.
  });

  test("PB05 clearing title search removes the title restriction and resets a later item page", async () => {
    const user = userEvent.setup();
    network.respond = (request) => request.url.pathname === itemsPath()
      ? json(page(effectiveOffset(request.url) === 0 ? twentyItems : [freeTalk], effectiveOffset(request.url), effectiveOffset(request.url) === 0)) : defaultProgrammeResponse(request);
    await openItems(user);
    await nextPage(user);
    await waitFor(() => expect(matchingRequest(itemsPath(), { offset: "20" })).toBeDefined());
    await user.type(titleSearch(), "Workshop");
    await applyFilters(user);
    await waitFor(() => expect(network.requests.some(({ url }) => url.pathname === itemsPath()
      && url.searchParams.get("q") === "Workshop" && effectiveOffset(url) === 0)).toBe(true));
    await user.clear(titleSearch());
    await applyFilters(user);
    await waitFor(() => {
      const last = network.requests.filter(({ url }) => url.pathname === itemsPath()).at(-1)!;
      expect(last.url.searchParams.get("q") ?? "").toBe("");
      expect(effectiveOffset(last.url)).toBe(0);
    });
  });

  test("PB06 uses event-page hasMore and offset 20 without inventing totals", async () => {
    const user = userEvent.setup();
    const firstTwenty = Array.from({ length: 20 }, (_, index) => ({
      ...eventA, id: `00000000-0000-4000-8000-${String(100 + index).padStart(12, "0")}`, title: `Page one event ${index + 1}`,
    }));
    network.respond = (request) => request.url.pathname === `${programmeRoot}/events`
      ? json(effectiveOffset(request.url) === 0 ? page(firstTwenty, 0, true) : page([{ ...eventB, id: "00000000-0000-4000-8000-000000000999" }], 20, false))
      : defaultProgrammeResponse(request);
    await openBrowse(user);
    expect(await screen.findByText("Page one event 1", { exact: true })).toBeVisible();
    await nextPage(user);
    expect(await screen.findByText(eventB.title, { exact: true })).toBeVisible();
    expect(screen.queryByText("Page one event 1", { exact: true })).not.toBeInTheDocument();
    const last = network.requests.at(-1)!;
    expect(last.url.searchParams.get("offset")).toBe("20");
    expect(Number(last.url.searchParams.get("limit") ?? "20")).toBe(20);
    expectNoNextPage();
  });

  test("PB07 advances item pages and stops at hasMore false", async () => {
    const user = userEvent.setup();
    network.respond = (request) => request.url.pathname === itemsPath()
      ? json(effectiveOffset(request.url) === 0 ? page(twentyItems, 0, true) : page([freeTalk], 20, false))
      : defaultProgrammeResponse(request);
    await openItems(user);
    await nextPage(user);
    expect(await screen.findByText(freeTalk.title, { exact: true })).toBeVisible();
    expect(screen.queryByText(eveningWorkshop.title, { exact: true })).not.toBeInTheDocument();
    expect(matchingRequest(itemsPath(), { offset: "20" })).toBeDefined();
    expectNoNextPage();
  });

  test("PB08 shows loading before a delayed event list, then replaces it with results", async () => {
    const user = userEvent.setup(); const held = deferred<Response>();
    network.respond = () => held.promise;
    await openBrowse(user);
    expect(screen.getByRole("status")).toHaveTextContent(/load/i);
    expect(screen.queryByText(eventA.title, { exact: true })).not.toBeInTheDocument();
    await settle(() => held.resolve(json(page([eventA]))));
    expect(await screen.findByText(eventA.title, { exact: true })).toBeVisible();
    expect(screen.queryByText(/no .*events|no events/i)).not.toBeInTheDocument();
  });

  test("PB09 distinguishes an empty event catalogue from failed loading", async () => {
    const user = userEvent.setup(); network.respond = () => json(page([]));
    await openBrowse(user);
    expect(await screen.findByText(/no .*events|no events/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /retry|try again/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/failed|could not|unable to load/i)).not.toBeInTheDocument();
  });

  test("PB10 distinguishes no matching activities from a failed search", async () => {
    const user = userEvent.setup(); await openItems(user);
    network.respond = (request) => request.url.pathname === itemsPath() ? json(page([])) : defaultProgrammeResponse(request);
    await user.type(titleSearch(), "No matching synthetic title"); await applyFilters(user);
    expect(await screen.findByText(/no .*activit|no .*items|no .*matches|nothing .*match/i)).toBeVisible();
    expect(screen.queryByText(eveningWorkshop.title, { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry|try again/i })).not.toBeInTheDocument();
  });

  test.each(["network", "storage"] as const)("PB11 displays a recoverable %s failure instead of an empty event list", async (failure) => {
    const user = userEvent.setup();
    network.respond = ({ url }) => { if (failure === "network") throw new TypeError("Failed to fetch"); return problem(503, url.pathname); };
    await openBrowse(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(/failed|could not|unable|unavailable/i);
    expect(screen.queryByText(/no .*events|no events/i)).not.toBeInTheDocument();
    network.respond = defaultProgrammeResponse; await retry(user);
    expect(await screen.findByText(eventA.title, { exact: true })).toBeVisible();
  });

  test("PB12 preserves valid query/type/date on failed search retry", async () => {
    const user = userEvent.setup(); await openItems(user);
    network.respond = ({ url }) => problem(503, url.pathname);
    await user.type(titleSearch(), "Evening"); await chooseType(user, "Workshop", "workshop");
    fireEvent.change(dateFilter(), { target: { value: "2026-10-21" } }); await applyFilters(user);
    await screen.findByRole("alert");
    expect(titleSearch()).toHaveValue("Evening"); expect(dateFilter()).toHaveValue("2026-10-21");
    network.respond = defaultProgrammeResponse; const before = network.requests.length;
    await retry(user);
    expect(await screen.findByText(eveningWorkshop.title, { exact: true })).toBeVisible();
    expect(network.requests.slice(before).some(({ url }) => url.pathname === itemsPath()
      && url.searchParams.get("q") === "Evening" && url.searchParams.get("type") === "workshop"
      && url.searchParams.get("date") === "2026-10-21")).toBe(true);
  });

  test.each([403, 404] as const)("PB13 presents %s detail rejection without retaining stale item facts", async (status) => {
    const user = userEvent.setup(); await openItems(user);
    network.respond = ({ url }) => problem(status, url.pathname);
    await user.click(screen.getByText(eveningWorkshop.title, { exact: true }));
    expect(await screen.findByText(status === 403 ? /not permitted|forbidden|access.*denied/i : /not found|unavailable|no longer available/i)).toBeVisible();
    expect(screen.queryByText("Step-free main entrance", { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByText("SGD 12.50", { exact: false })).not.toBeInTheDocument();
  });

  test("PB14 clears protected programme facts on 401 and suppresses the old response", async () => {
    const user = userEvent.setup(); const old = deferred<Response>(); await openItems(user);
    network.respond = (request) => request.url.pathname === itemsPath() && request.url.searchParams.get("q") === "old selection"
      ? old.promise : defaultProgrammeResponse(request);
    fireEvent.change(titleSearch(), { target: { value: "old selection" } }); await applyFilters(user);
    await waitFor(() => expect(matchingRequest(itemsPath(), { q: "old selection" })).toBeDefined());
    network.respond = ({ url }) => problem(401, url.pathname);
    fireEvent.change(titleSearch(), { target: { value: "expired selection" } }); await applyFilters(user);
    await waitFor(() => expect(matchingRequest(itemsPath(), { q: "expired selection" })).toBeDefined());
    await waitFor(() => expect(screen.queryByText(eveningWorkshop.title, { exact: true })).not.toBeInTheDocument());
    expect((await screen.findAllByText(/authentication required|session.*expired|log in/i))[0]).toBeVisible();
    await settle(() => old.resolve(json(page([{ ...eveningWorkshop, title: "EXPIRED SESSION RESPONSE" }]))));
    expect(screen.queryByText("EXPIRED SESSION RESPONSE")).not.toBeInTheDocument();
  });

  test("PB15 ignores an older filter response after a newer search result", async () => {
    const user = userEvent.setup(); const old = deferred<Response>(); await openItems(user);
    network.respond = (request) => request.url.pathname === itemsPath()
      ? request.url.searchParams.get("q") === "old" ? old.promise : json(page([freeTalk])) : defaultProgrammeResponse(request);
    await user.type(titleSearch(), "old"); await applyFilters(user);
    await waitFor(() => expect(matchingRequest(itemsPath(), { q: "old" })).toBeDefined());
    await user.clear(titleSearch()); await user.type(titleSearch(), "new"); await applyFilters(user);
    expect(await screen.findByText(freeTalk.title, { exact: true })).toBeVisible();
    await settle(() => old.resolve(json(page([{ ...eveningWorkshop, title: "STALE FILTER RESPONSE" }]))));
    expect(screen.queryByText("STALE FILTER RESPONSE")).not.toBeInTheDocument();
    expect(screen.getByText(freeTalk.title, { exact: true })).toBeVisible();
  });

  test("PB16 a previous event response cannot replace the selected event", async () => {
    const user = userEvent.setup(); const old = deferred<Response>();
    network.respond = (request) => request.url.pathname === itemsPath() ? old.promise : defaultProgrammeResponse(request);
    await openBrowse(user); const cataloguePath = window.location.pathname + window.location.search;
    await openEvent(user);
    await waitFor(() => expect(network.requests.some(({ url }) => url.pathname === itemsPath())).toBe(true));
    // Revisit the actual discovered catalogue URL; no new route path is prescribed.
    const back = screen.queryByRole("link", { name: /back.*events|all events|back to programme/i })
      ?? screen.queryByRole("button", { name: /back.*events|all events|back to programme/i });
    if (back) await user.click(back);
    else await act(async () => { window.history.pushState({}, "", cataloguePath); window.dispatchEvent(new PopStateEvent("popstate")); });
    await openEvent(user, eventB.title);
    expect(await screen.findByText(secondEventItem.title, { exact: true })).toBeVisible();
    await settle(() => old.resolve(json(page([{ ...eveningWorkshop, title: "STALE EVENT RESPONSE" }]))));
    expect(screen.queryByText("STALE EVENT RESPONSE")).not.toBeInTheDocument();
    expect(screen.getByText(secondEventItem.title, { exact: true })).toBeVisible();
  });

  test("PB17 logout and another login cannot restore the previous actor's in-flight response", async () => {
    const user = userEvent.setup(); const old = deferred<Response>(); await openItems(user);
    network.respond = ({ url }) => url.pathname === itemsPath() ? old.promise : json(page([eventA]));
    await user.type(titleSearch(), "pending"); await applyFilters(user);
    await waitFor(() => expect(matchingRequest(itemsPath(), { q: "pending" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByLabelText(/username or email/i)).toBeVisible();
    expect(auth.requests.some(({ path, method }) => path.endsWith("/logout") && method === "POST")).toBe(true);
    expect(screen.queryByText(eveningWorkshop.title, { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("PREVIOUS ACTOR RESPONSE")).not.toBeInTheDocument();
    auth.loginActor = { ...actor("attendee", "Another synthetic attendee"), id: "11111111-1111-4111-8111-111111111112" };
    await user.type(screen.getByLabelText(/username or email/i), "another-synthetic");
    await user.type(screen.getByLabelText(/^password$/i), "Synthetic-123");
    await user.click(screen.getByRole("button", { name: /log in/i }));
    expect(await screen.findByText("Another synthetic attendee")).toBeVisible();
    const freshTitle = "NEW ACTOR FRESH ITEM";
    network.respond = (request) => request.url.pathname === itemsPath()
      ? json(page([{ ...eveningWorkshop, title: freshTitle }])) : defaultProgrammeResponse(request);
    await enterBrowse(user);
    expect(await screen.findByText(eventA.title, { exact: true })).toBeVisible();
    const cataloguePath = window.location.pathname + window.location.search;
    await openEvent(user);
    expect(await screen.findByText(freshTitle, { exact: true })).toBeVisible();
    await settle(() => old.resolve(json(page([{ ...eveningWorkshop, title: "PREVIOUS ACTOR RESPONSE" }]))));
    expect(screen.queryByText("PREVIOUS ACTOR RESPONSE")).not.toBeInTheDocument();
    expect(screen.getByText(freshTitle, { exact: true })).toBeVisible();
    const back = screen.queryByRole("link", { name: /back.*events|all events|back to programme/i })
      ?? screen.queryByRole("button", { name: /back.*events|all events|back to programme/i });
    if (back) await user.click(back);
    else await act(async () => { window.history.pushState({}, "", cataloguePath); window.dispatchEvent(new PopStateEvent("popstate")); });
    await openEvent(user);
    expect(await screen.findByText(freshTitle, { exact: true })).toBeVisible();
    expect(screen.queryByText("PREVIOUS ACTOR RESPONSE")).not.toBeInTheDocument();
  });

  test("PB18 renders programme text literally rather than interpreting markup", async () => {
    const user = userEvent.setup(); const title = '<img src=x onerror="alert(1)"> synthetic activity';
    network.respond = (request) => request.url.pathname === itemsPath() ? json(page([{ ...eveningWorkshop, title }])) : defaultProgrammeResponse(request);
    await openBrowse(user); await openEvent(user);
    expect(await screen.findByText(title, { exact: true })).toBeVisible();
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });

  test.each(["organiser", "business"] as const)("PB19 %s home and forged attendee state make no programme requests", async (role) => {
    seedActor(role); sessionStorage.setItem("eventapp.prototype.session", JSON.stringify({ role: "attendee", displayName: "Forged" }));
    await renderPrototype(`/${role}`);
    expect(screen.queryByText("Browse Programme", { exact: true })).not.toBeInTheDocument();
    expect(network.requests).toEqual([]);
    const first = window.location.pathname;
    expect(first).toBe(`/${role}`);
  });

  test.each(["organiser", "business", "mandatory-change", "unauthenticated"] as const)(
    "PB22 discovered browse/item/detail URLs reject %s identity before programme fetch", async (identity) => {
      const user = userEvent.setup(); const view = await renderPrototype("/attendee");
      await enterBrowse(user); await screen.findByText(eventA.title, { exact: true });
      const paths = new Set([window.location.pathname + window.location.search]);
      await openEvent(user); await screen.findByText(eveningWorkshop.title, { exact: true });
      paths.add(window.location.pathname + window.location.search);
      await user.click(screen.getByText(eveningWorkshop.title, { exact: true }));
      await waitFor(() => expect(network.requests.some(({ url }) => url.pathname === detailPath())).toBe(true));
      paths.add(window.location.pathname + window.location.search); view.unmount();
      for (const path of paths) {
        auth.current = identity === "unauthenticated" ? null : identity === "mandatory-change"
          ? { ...actor("organiser"), mustChangePassword: true } : actor(identity);
        sessionStorage.setItem("eventapp.prototype.session", JSON.stringify({ role: "attendee", displayName: "Forged" }));
        network.requests.length = 0;
        const rejected = await renderPrototype(path);
        expect(network.requests).toEqual([]);
        expect(screen.queryByText(eventA.title, { exact: true })).not.toBeInTheDocument();
        expect(screen.queryByText(eveningWorkshop.title, { exact: true })).not.toBeInTheDocument();
        expect(screen.queryByText("Step-free main entrance", { exact: false })).not.toBeInTheDocument();
        rejected.unmount();
      }
    },
  );

  test("PB23 exposes all five approved type filters and sends their exact tokens", async () => {
    const user = userEvent.setup(); await openItems(user);
    for (const [label, token] of [["Talk", "talk"], ["Workshop", "workshop"], ["Booth", "booth"], ["Performance", "performance"], ["Other", "other"]]) {
      const before = network.requests.length;
      await chooseType(user, label, token); await applyFilters(user);
      await waitFor(() => expect(network.requests.slice(before).some(({ url }) => url.pathname === itemsPath()
        && url.searchParams.get("type") === token)).toBe(true));
    }
  });

  test("PB24 remounts a discovered direct-detail URL using only its projected event timezone", async () => {
    const user = userEvent.setup(); const initial = await renderPrototype("/attendee");
    await enterBrowse(user); await openEvent(user); await screen.findByText(eveningWorkshop.title, { exact: true });
    await user.click(screen.getByText(eveningWorkshop.title, { exact: true }));
    await waitFor(() => expect(network.requests.some(({ url }) => url.pathname === detailPath())).toBe(true));
    const directPath = window.location.pathname + window.location.search;
    initial.unmount(); sessionStorage.clear(); localStorage.clear(); network.requests.length = 0;
    network.respond = ({ url }) => url.pathname === detailPath() ? json(eveningWorkshop) : problem(503, url.pathname);
    await renderPrototype(directPath);
    expect(await screen.findByText(eveningWorkshop.title, { exact: true })).toBeVisible();
    expect(screen.getByText(/23:30|11:30\s*p\.?m\.?/i)).toBeVisible();
    expect(screen.getByText(/01:00|1:00\s*a\.?m\.?/i)).toBeVisible();
    expect(network.requests.some(({ url }) => url.pathname === detailPath())).toBe(true);
    expect(network.requests.every(({ url }) => url.pathname === detailPath())).toBe(true);
  });

  test("PB21 shows a generic invalid-query failure without treating it as empty results", async () => {
    const user = userEvent.setup(); await openItems(user);
    network.respond = ({ url }) => problem(422, url.pathname);
    await user.type(titleSearch(), "Valid title"); await applyFilters(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(/validation|invalid|request.*failed/i);
    expect(screen.queryByText(/no .*activit|no .*matches/i)).not.toBeInTheDocument();
  });

  test("PB20 unauthenticated attendee home cannot fetch programme using browser role state", async () => {
    auth.current = null; sessionStorage.setItem("eventapp.prototype.session", JSON.stringify({ role: "attendee", displayName: "Forged" }));
    await renderPrototype("/attendee");
    expect(window.location.pathname).toBe("/login"); expect(network.requests).toEqual([]);
    expect(screen.queryByText(eventA.title, { exact: true })).not.toBeInTheDocument();
  });
});
