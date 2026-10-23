import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { renderPrototype, storedValues } from "./helpers/renderPrototype";
import { applications, submitted, B1, E1 } from "./fixtures/applications";
import { auth } from "./fixtures/auth";
// MERGE-TCR-02: master SILENT-TCR-01 made focus and ordinary pageshow checks silent; a bfcache-restored pageshow
// still conceals and remounts, so these concealment/late-response cases use it as their trigger.
const restoredPageshow = () => Object.assign(new Event("pageshow"), { persisted: true });

// Independent public wire contract: generate-preparation-drafts r3 / shared jobs r3.
// These synthetic server records do not import the implementation or its validators.
const P = "88888888-8888-4888-8888-888888888888";
const J = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const D = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const T = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const L = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const route = `/business/preparation-drafts?businessId=${B1}&eventId=${E1}&participationId=${P}`;
const base = `/api/v1/business/participations/${P}`;
const historyPath = `${base}/preparation-drafts`;
const draftPath = `/api/v1/business/preparation-drafts/${D}`;
const jobPath = `/api/v1/ai/jobs/${J}`;
const time = "2026-10-22T01:00:00Z";
type Task = { title: string; status: string; dueDate: string | null };
type Line = { description: string; quantity: number; unitPriceMinorUnits: number | null; priceBasis: string; quotationBasis: string | null };
function totals(lines: Line[]) {
  const sum = lines.reduce((n, x) => n + BigInt(x.quantity) * BigInt(x.unitPriceMinorUnits ?? 0), 0n).toString();
  const complete = lines.every(x => x.unitPriceMinorUnits !== null);
  return { currency: "SGD", lines, totalMinorUnits: complete ? sum : null, knownSubtotalMinorUnits: sum, isComplete: complete };
}
function canonical() {
  return { id: D, jobId: J, participationId: P, revision: 1,
    sourceRevisions: { event: 1, setup: 2, preparation: 2 },
    sourceFacts: { event: { title: "Synthetic Autumn Fair", startsAt: "2027-01-01T01:00:00Z", endsAt: "2027-01-01T09:00:00Z", timezone: "Asia/Singapore" },
      setup: { boothLabel: "SYNTHETIC-A1", setupInstructions: "Invented setup at nine" } },
    tasks: [{ title: "PRIVATE-SUGGESTED-TASK", status: "not_started", dueDate: null }] as Task[],
    budget: totals([{ description: "PRIVATE-ODD-ESTIMATE", quantity: 999999, unitPriceMinorUnits: 99999999999, priceBasis: "estimate", quotationBasis: null }]),
    createdAt: time, adoptedAt: null as string | null, adoptedPreparationRevision: null as number | null };
}
function install(options: { empty?: boolean; state?: string; lost?: "generate" | "edit" | "adopt"; mismatch?: boolean; malformed?: "scope" | "total" | "basis"; rawError?: boolean } = {}) {
  applications.install(); applications.records = [submitted({ status: "accepted", revision: 3,
    decision: { outcome: "accepted", reason: null, decidedAt: time } })];
  const fallback = globalThis.fetch;
  let value = canonical();
  if (options.malformed === "scope") value.participationId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  if (options.malformed === "total") value.budget.totalMinorUnits = "1";
  if (options.malformed === "basis") value.budget.lines[0].priceBasis = "quotation";
  let manual: { participationId: string; revision: number; tasks: (Task & { id: string })[]; budget: ReturnType<typeof totals> & { lines: (Line & { id: string })[] } } = { participationId: P, revision: 2, tasks: [{ id: T, title: "PRIVATE-MANUAL-CONTEXT", status: "not_started", dueDate: null }],
    budget: { ...totals([{ description: "PRIVATE-MANUAL-LINE", quantity: 1, unitPriceMinorUnits: 0, priceBasis: "estimate", quotationBasis: null }]),
      lines: [{ id: L, description: "PRIVATE-MANUAL-LINE", quantity: 1, unitPriceMinorUnits: 0, priceBasis: "estimate", quotationBasis: null }] } };
  let state = options.state ?? "completed", exists = !options.empty;
  const requests: { path: string; method: string; body: Record<string, unknown> }[] = [];
  const controls: { path: string; wait?: Promise<void>; status?: number; body?: unknown }[] = [];
  const job = () => ({ id: J, eventId: E1, participationId: P, state, createdAt: time, updatedAt: time,
    completedAt: ["completed", "failed", "cancelled"].includes(state) ? time : null,
    failureCode: state === "failed" ? "provider_unavailable" : null, providerMayHaveRun: state !== "pending", draft: state === "completed" ? value : null });
  function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": status >= 400 ? "application/problem+json" : "application/json", "Cache-Control": "no-store" } }); }
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const path = new URL(typeof input === "object" && "url" in input ? input.url : String(input), location.origin).pathname;
    if (![historyPath, draftPath, `${draftPath}/adopt`, jobPath, `${jobPath}/cancel`, `${base}/setup`, `${base}/preparation`].includes(path)) return fallback(input, init);
    const method = init?.method ?? "GET", body = init?.body ? JSON.parse(String(init.body)) : {};
    requests.push({ path, method, body });
    const at = controls.findIndex(x => x.path === path), control = at < 0 ? undefined : controls.splice(at, 1)[0];
    let result: Response;
    let lost = false;
    if (control?.status) result = json(control.body ?? { code: "service_unavailable" }, control.status);
    else if (method !== "GET" && options.rawError) result = json({ code: "validation_error", detail: "PRIVATE-RAW-PROVIDER <script>execute()</script>", fieldErrors: [{ field: "needs", code: "invalid" }] }, 422);
    else if (path === `${base}/setup`) result = json({ participationId: P, eventId: E1, revision: 2, boothLabel: "SYNTHETIC-A1", setupInstructions: "Invented setup at nine", updatedAt: time });
    else if (path === `${base}/preparation`) result = json(manual);
    else if (path === historyPath && method === "POST") { exists = true; state = "pending"; result = json(job(), 202); lost = options.lost === "generate"; }
    else if (path === historyPath) result = json({ items: exists && state === "completed" ? [value] : [], total: exists && state === "completed" ? 1 : 0, limit: 20, offset: 0, latestJob: exists ? job() : null });
    else if (path === `${jobPath}/cancel`) { state = "cancelled"; result = json(job()); }
    else if (path === jobPath) result = json(job());
    else if (path === `${draftPath}/adopt`) {
      const taskIndexes = body.taskIndexes as number[], lineIndexes = body.lineIndexes as number[];
      manual = { ...manual, revision: manual.revision + 1,
        tasks: [...manual.tasks, ...taskIndexes.map((i, n) => ({ ...value.tasks[i], id: `ffffffff-ffff-4fff-8fff-${String(n).padStart(12, "0")}` }))],
        budget: { ...totals([...manual.budget.lines, ...lineIndexes.map(i => value.budget.lines[i])]), lines: [...manual.budget.lines, ...lineIndexes.map((i, n) => ({ ...value.budget.lines[i], id: `99999999-9999-4999-8999-${String(n).padStart(12, "0")}` }))] } };
      value = { ...value, adoptedAt: time, adoptedPreparationRevision: manual.revision };
      if (options.mismatch) value.adoptedPreparationRevision = manual.revision + 1;
      result = json({ draft: value, preparation: manual }); lost = options.lost === "adopt";
    } else if (method === "PUT") {
      value = { ...value, revision: value.revision + 1, tasks: body.tasks, budget: totals(body.budget.lines) };
      if (options.mismatch) value.tasks[0].title = "OTHER-AUTHORITATIVE-EDIT";
      result = json(value); lost = options.lost === "edit";
    } else result = json(value);
    // Snapshot at dispatch, not release: meaningful departed/out-of-order response seam.
    if (control?.wait) await control.wait;
    if (lost) throw new TypeError("Invented response loss");
    return result;
  }));
  return { requests, value: () => value, manual: () => manual,
    writes: () => requests.filter(x => x.method !== "GET"),
    hold: (path: string) => { let release!: () => void; const wait = new Promise<void>(resolve => { release = resolve; }); controls.push({ path, wait }); return release; },
    fail: (path: string, status = 503) => controls.push({ path, status }),
    setState: (next: string) => { state = next; },
    setLines: (lines: Line[]) => { value.budget = totals(lines); } };
}
async function open(hasDraft = true) {
  await renderPrototype(route);
  await screen.findByRole("button", { name: /^generate preparation draft$/i });
  if (hasDraft) await screen.findByDisplayValue("PRIVATE-SUGGESTED-TASK");
}
const user = () => userEvent.setup();
function storage() { return storedValues(localStorage) + storedValues(sessionStorage) + JSON.stringify(history.state) + location.href; }
async function generate() {
  fireEvent.change(screen.getByLabelText(/^needs$/i), { target: { value: "PRIVATE-INVENTED-NEEDS" } });
  await user().click(screen.getByRole("button", { name: /^generate preparation draft$/i }));
}
async function selectTask() { await user().click(screen.getAllByRole("checkbox", { name: /^select task\b/i })[0]); }
async function confirmation() {
  await user().click(screen.getByRole("button", { name: /^adopt selected items$/i }));
  return screen.findByRole("dialog", { name: /^confirm preparation adoption$/i });
}

test("UI01 home enables AI preparation entry and keeps manual preparation available", async () => {
  install(); await renderPrototype("/business");
  expect(await screen.findByRole("link", { name: /AI preparation draft/i })).toHaveAttribute("href", expect.stringContaining("/business/preparation-drafts"));
  expect(screen.getByRole("link", { name: /open preparation/i })).toBeVisible();
});

test("UI01 generation discloses selected data sharing and previews authoritative facts and selected outbound context", async () => {
  const server = install({ empty: true }); await open(false);
  expect(document.body).toHaveTextContent("SYNTHETIC-A1");
  expect(document.body).toHaveTextContent("Invented setup at nine");
  fireEvent.change(screen.getByLabelText(/^needs$/i), { target: { value: "PRIVATE-INVENTED-NEEDS" } });
  const button = screen.getByRole("button", { name: /^generate preparation draft$/i });
  expect(button).toBeEnabled();
  expect(screen.queryByRole("checkbox", {name:/invented data only/i})).not.toBeInTheDocument();
  expect(document.body).toHaveTextContent(/AI provider/i);
  expect(server.writes()).toHaveLength(0);
  await user().click(screen.getByRole("checkbox", { name: /PRIVATE-MANUAL-CONTEXT/i }));
  await user().click(button);
  await waitFor(() => expect(server.writes()).toHaveLength(1));
  const request = server.writes()[0];
  expect(request).toMatchObject({ path: historyPath, method: "POST", body: { expectedPreparationRevision: 2, expectedSetupRevision: 2, expectedEventRevision: 1,
    needs: "PRIVATE-INVENTED-NEEDS", selectedTaskIds: [T], selectedLineIds: [], dataSharingConfirmed: true } });
  expect(request.body.requestId).toMatch(/^[0-9a-f-]{36}$/i);
  expect(Object.keys(request.body).sort()).toEqual(["requestId", "expectedPreparationRevision", "expectedSetupRevision", "expectedEventRevision", "needs", "selectedTaskIds", "selectedLineIds", "dataSharingConfirmed"].sort());
  expect(storage()).not.toMatch(/PRIVATE-|aaaaaaaa-aaaa|bbbbbbbb-bbbb/);
  expect(server.manual().revision).toBe(2);
});

test("UI01 latest pending job restores and cancellation exposes possible usage without blocking manual fallback", async () => {
  const server = install({ state: "running" }); await open(false);
  expect(document.body).toHaveTextContent(/running|in progress/i);
  expect(screen.getByRole("link", { name: /preparation.*budget|manual preparation/i })).toHaveAttribute("href", expect.stringContaining("/business/preparation?"));
  await user().click(screen.getByRole("button", { name: /^cancel(?: job)?$/i }));
  await waitFor(() => expect(server.writes()).toHaveLength(1));
  expect(server.writes()[0].path).toBe(`${jobPath}/cancel`);
  expect(await screen.findByText(/cancelled/i)).toBeVisible();
  expect(document.body).toHaveTextContent(/may.*(?:run|quota|usage|consum)|already.*(?:sent|run)/i);
  expect(server.manual().revision).toBe(2);
});

test("UI01 failed job gives safe failure and usable manual fallback", async () => {
  install({ state: "failed" }); await open(false);
  expect(document.body).toHaveTextContent(/could not|failed|unavailable/i);
  expect(screen.getByRole("link", { name: /preparation.*budget|manual preparation/i })).toBeVisible();
  expect(screen.queryByDisplayValue("PRIVATE-SUGGESTED-TASK")).not.toBeInTheDocument();
});

test("UI02 exact odd BigInt amounts remain editable draft estimates and never change manual data on save", async () => {
  const server = install(); await open();
  const row = screen.getByDisplayValue("PRIVATE-ODD-ESTIMATE").closest("fieldset, [role=group], tr, [role=row]");
  expect(row).not.toBeNull();
  expect(row?.textContent?.replaceAll(",", "")).toMatch(/999998999990000\.01/);
  expect(document.body.textContent?.replaceAll(",", "")).toMatch(/999998999990000\.01/);
  expect(document.body).toHaveTextContent(/estimate/i);
  fireEvent.change(screen.getByLabelText(/^task title$/i), { target: { value: "PRIVATE-EDITED-SUGGESTION" } });
  await user().click(screen.getByRole("button", { name: /^save draft$/i }));
  await waitFor(() => expect(server.writes()).toHaveLength(1));
  expect(server.writes()[0]).toMatchObject({ path: draftPath, method: "PUT", body: { expectedRevision: 1, tasks: [{ title: "PRIVATE-EDITED-SUGGESTION" }] } });
  expect(server.manual().tasks).toHaveLength(1); expect(server.manual().revision).toBe(2);
});

test("UI02 unknown price is incomplete while known zero stays an estimate", async () => {
  const server = install(); server.setLines([
    { description: "SYNTHETIC-ZERO", quantity: 1, unitPriceMinorUnits: 0, priceBasis: "estimate", quotationBasis: null },
    { description: "SYNTHETIC-UNKNOWN", quantity: 1, unitPriceMinorUnits: null, priceBasis: "unknown", quotationBasis: null },
  ]); await open();
  expect(document.body).toHaveTextContent(/incomplete|unknown/i);
  expect(screen.getAllByLabelText(/^unit price/i)[0]).toHaveValue(0);
  expect(screen.getAllByLabelText(/^unit price/i)[1]).toHaveValue(null);
});

test("UI02 selected append-only adoption requires exact preview; cancel writes nothing", async () => {
  const server = install(); await open(); await selectTask();
  let dialog = await confirmation();
  expect(dialog).toHaveTextContent("PRIVATE-SUGGESTED-TASK");
  expect(dialog).not.toHaveTextContent("PRIVATE-ODD-ESTIMATE");
  expect(dialog).toHaveTextContent(/revision/i);
  expect(server.writes()).toHaveLength(0);
  await user().click(within(dialog).getByRole("button", { name: /^cancel$/i }));
  expect(server.writes()).toHaveLength(0);
  dialog = await confirmation();
  await user().click(within(dialog).getByRole("button", { name: /^confirm adoption$/i }));
  await waitFor(() => expect(server.writes()).toHaveLength(1));
  expect(server.writes()[0]).toEqual({ path: `${draftPath}/adopt`, method: "POST", body: { expectedDraftRevision: 1, expectedPreparationRevision: 2,
    expectedSetupRevision: 2, expectedEventRevision: 1, taskIndexes: [0], lineIndexes: [] } });
  expect(server.manual().tasks.map(x => x.title)).toEqual(["PRIVATE-MANUAL-CONTEXT", "PRIVATE-SUGGESTED-TASK"]);
  expect(server.manual().budget.lines).toHaveLength(1);
});

test("UI02 changing editable content invalidates open adoption approval", async () => {
  const server = install(); await open(); await selectTask();
  const title = screen.getByLabelText(/^task title$/i), dialog = await confirmation();
  fireEvent.change(title, { target: { value: "CHANGED-AFTER-PREVIEW" } });
  const confirm = within(dialog).queryByRole("button", { name: /^confirm adoption$/i });
  if (confirm?.isConnected && !confirm.hasAttribute("disabled")) await user().click(confirm);
  expect(server.writes().filter(x => x.path.endsWith("/adopt"))).toHaveLength(0);
  expect(server.manual().revision).toBe(2);
});

test("UI02 changing selection invalidates open adoption approval", async () => {
  const server = install(); await open(); await selectTask();
  const selection = screen.getAllByRole("checkbox", { name: /^select task\b/i })[0];
  const dialog = await confirmation();
  fireEvent.click(selection);
  const confirm = within(dialog).queryByRole("button", { name: /^confirm adoption$/i });
  if (confirm?.isConnected && !confirm.hasAttribute("disabled")) await user().click(confirm);
  expect(server.writes()).toHaveLength(0);
  expect(server.manual().revision).toBe(2);
});

test("UI04 generation rechecks current actor rather than dispatching captured private needs", async () => {
  const server = install({ empty: true }); await open(false);
  fireEvent.change(screen.getByLabelText(/^needs$/i), { target: { value: "PRIVATE-OLD-ACTOR-NEEDS" } });
  auth.current = null;
  await user().click(screen.getByRole("button", { name: /^generate preparation draft$/i }));
  await waitFor(() => expect(screen.queryByDisplayValue("PRIVATE-OLD-ACTOR-NEEDS")).not.toBeInTheDocument());
  expect(server.writes()).toHaveLength(0);
});

test("UI02 confirmation rechecks actor immediately before execution and cannot use former-owner approval", async () => {
  const server = install(); await open(); await selectTask(); const dialog = await confirmation();
  auth.current = { ...auth.current!, id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" };
  await user().click(within(dialog).getByRole("button", { name: /^confirm adoption$/i }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(server.writes()).toHaveLength(0);
  expect(screen.queryByDisplayValue("PRIVATE-SUGGESTED-TASK")).not.toBeInTheDocument();
  expect(server.manual().revision).toBe(2);
});

test("UI03 uncertain generation restores canonical owner job without a second creation", async () => {
  const server = install({ empty: true, lost: "generate" }); await open(false); await generate();
  await waitFor(() => expect(server.requests.filter(x => x.path === historyPath && x.method === "GET").length).toBeGreaterThanOrEqual(2));
  expect(server.writes()).toHaveLength(1);
  expect(document.body).toHaveTextContent(/pending|queued|in progress/i);
  expect(server.manual().revision).toBe(2);
});

test("UI03 uncertain draft save reconciles canonical revision before another explicit save", async () => {
  const server = install({ lost: "edit" }); await open();
  fireEvent.change(screen.getByLabelText(/^task title$/i), { target: { value: "PRIVATE-LOST-EDIT" } });
  await user().click(screen.getByRole("button", { name: /^save draft$/i }));
  await waitFor(() => expect(server.requests.filter(x => x.path === draftPath && x.method === "GET").length).toBeGreaterThanOrEqual(1));
  expect(await screen.findByDisplayValue("PRIVATE-LOST-EDIT")).toBeVisible();
  expect(server.writes()).toHaveLength(1);
  fireEvent.change(screen.getByLabelText(/^task title$/i), { target: { value: "NEXT-EXPLICIT-EDIT" } });
  await user().click(screen.getByRole("button", { name: /^save draft$/i }));
  await waitFor(() => expect(server.writes()).toHaveLength(2));
  expect(server.writes()[1].body.expectedRevision).toBe(2);
  expect(server.manual().revision).toBe(2);
});

test("UI03 lost adoption response reconciles adopted metadata and manual copies with no replay", async () => {
  const server = install({ lost: "adopt" }); await open(); await selectTask(); const dialog = await confirmation();
  await user().click(within(dialog).getByRole("button", { name: /^confirm adoption$/i }));
  await waitFor(() => expect(server.requests.filter(x => x.path === `${base}/preparation`).length).toBeGreaterThanOrEqual(2));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(document.body).toHaveTextContent(/adopted/i);
  expect(server.writes()).toHaveLength(1);
  expect(server.manual().tasks).toHaveLength(2);
  expect(server.manual().revision).toBe(3);
});

test("UI03 mismatching uncertain edit requires review and never silently retries", async () => {
  const server = install({ lost: "edit", mismatch: true }); await open();
  fireEvent.change(screen.getByLabelText(/^task title$/i), { target: { value: "PRIVATE-LOCAL-EDIT" } });
  await user().click(screen.getByRole("button", { name: /^save draft$/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/review|conflict|reconcile|changed/i);
  expect(server.writes()).toHaveLength(1);
  expect(server.manual().revision).toBe(2);
});

test("UI03 actor change before lost-write reconciliation cannot restore former owner's draft", async () => {
  const server = install({ lost: "edit" }); await open();
  fireEvent.change(screen.getByLabelText(/^task title$/i), { target: { value: "PRIVATE-DEPARTED-WRITE" } });
  const release = server.hold(draftPath);
  await user().click(screen.getByRole("button", { name: /^save draft$/i }));
  await waitFor(() => expect(server.writes()).toHaveLength(1));
  auth.current = null;
  await act(async () => { release(); });
  await waitFor(() => expect(screen.queryByDisplayValue("PRIVATE-DEPARTED-WRITE")).not.toBeInTheDocument());
  expect(screen.queryByDisplayValue("PRIVATE-SUGGESTED-TASK")).not.toBeInTheDocument();
  expect(server.writes()).toHaveLength(1);
  expect(storage()).not.toContain("PRIVATE-DEPARTED-WRITE");
});

test.each(["restored pageshow"])("UI04 %s conceals and preserves same-scope unsaved input in memory only", async event => {
  install(); await open();
  fireEvent.change(screen.getByLabelText(/^needs$/i), { target: { value: "PRIVATE-DIRTY-NEEDS" } });
  fireEvent.change(screen.getByLabelText(/^task title$/i), { target: { value: "PRIVATE-DIRTY-SUGGESTION" } });
  const release = applications.hold("/api/v1/auth/me");
  await act(async () => { window.dispatchEvent(restoredPageshow()); });
  await waitFor(() => expect(screen.queryByDisplayValue("PRIVATE-DIRTY-SUGGESTION")).not.toBeInTheDocument());
  await act(async () => { release(); });
  expect(await screen.findByDisplayValue("PRIVATE-DIRTY-SUGGESTION")).toBeVisible();
  expect(screen.getByLabelText(/^needs$/i)).toHaveValue("PRIVATE-DIRTY-NEEDS");
  expect(storage()).not.toMatch(/PRIVATE-|aaaaaaaa-aaaa|bbbbbbbb-bbbb/);
});

test("UI04 failed source reload conceals cached suggestions and offers recovery", async () => {
  const server = install(); await open(); server.fail(historyPath);
  await act(async () => { window.dispatchEvent(restoredPageshow()); });
  expect(await screen.findByRole("alert")).toHaveTextContent(/unavailable|could not|retry|check/i);
  expect(screen.queryByDisplayValue("PRIVATE-SUGGESTED-TASK")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /retry|try again|reload|check access/i })).toBeEnabled();
});

test("UI04 late dispatched private history cannot restore data after actor departure", async () => {
  const server = install(); await open(); const before = server.requests.length;
  const release = server.hold(historyPath);
  await act(async () => { window.dispatchEvent(restoredPageshow()); });
  await waitFor(() => expect(server.requests.slice(before).some(x => x.path === historyPath)).toBe(true));
  auth.current = null;
  await act(async () => { window.dispatchEvent(restoredPageshow()); });
  await waitFor(() => expect(screen.queryByDisplayValue("PRIVATE-SUGGESTED-TASK")).not.toBeInTheDocument());
  await act(async () => { release(); });
  expect(screen.queryByDisplayValue("PRIVATE-SUGGESTED-TASK")).not.toBeInTheDocument();
  expect(storage()).not.toContain("PRIVATE-SUGGESTED-TASK");
});

test("UI04 held response from departed route cannot restore private editor", async () => {
  const server = install(); await open(); const before = server.requests.length;
  const release = server.hold(historyPath);
  await act(async () => { window.dispatchEvent(restoredPageshow()); });
  await waitFor(() => expect(server.requests.slice(before).some(x => x.path === historyPath)).toBe(true));
  await act(async () => { history.pushState({}, "", "/business"); window.dispatchEvent(new PopStateEvent("popstate")); });
  await screen.findByRole("link", { name: /open preparation/i });
  await act(async () => { release(); });
  expect(location.pathname).toBe("/business");
  expect(screen.queryByDisplayValue("PRIVATE-SUGGESTED-TASK")).not.toBeInTheDocument();
});

test.each(["scope", "total", "basis"] as const)("UI04 malformed %s draft is rejected before private editor display", async malformed => {
  install({ malformed }); await renderPrototype(route);
  expect(await screen.findByRole("alert")).toHaveTextContent(/invalid|could not|unavailable|check/i);
  expect(screen.queryByDisplayValue("PRIVATE-SUGGESTED-TASK")).not.toBeInTheDocument();
});

test("UI04 server errors are allowlisted and model text remains inert", async () => {
  const server = install({ rawError: true }); server.value().tasks[0].title = "<img src=x onerror=execute()>PRIVATE-SUGGESTED-TASK";
  await open(false); await screen.findByDisplayValue("<img src=x onerror=execute()>PRIVATE-SUGGESTED-TASK");
  expect(document.querySelector("img[src=x]")).toBeNull();
  await user().click(screen.getByRole("button", { name: /^save draft$/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/check|invalid|could not|review/i);
  expect(document.body).not.toHaveTextContent("PRIVATE-RAW-PROVIDER");
  expect(server.manual().revision).toBe(2);
});
