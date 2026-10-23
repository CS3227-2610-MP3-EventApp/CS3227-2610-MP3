// F09-US03 acceptance tests, designed from review-procurement-proposals r15 (Draft, human-approved 2026-10-23),
// approve-external-actions r2 and compare-suppliers r5. They model server wire behaviour with synthetic data and do
// not mirror any implementation. The spec fixes no labels, so queries use role + tolerant name patterns; see the test plan.
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { renderPrototype, storedValues } from "../helpers/renderPrototype";
import { actor, auth } from "../fixtures/auth";
import { draft } from "../fixtures/applications";

const P = "88888888-8888-4888-8888-888888888888", P2 = "99999999-9999-4999-8999-999999999999";
const B1 = "33333333-3333-4333-8333-333333333333", E1 = "22222222-2222-4222-8222-222222222222", ACTOR = "11111111-1111-4111-8111-111111111111";
const S1 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", S2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02", SL = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const uid = (n: number) => `${n.toString(16).padStart(8, "0")}-0000-4000-8000-000000000000`;
const O1 = uid(0x101), O2 = uid(0x102), O3 = uid(0x103), O4 = uid(0x104);
const PR1 = uid(0x501);
const ROUTE = `/business/procurement-proposals?participationId=${P}`;
const BASE = "/api/v1/business", LIST = `${BASE}/action-proposals`;
const URL1 = "https://supplier.example/item", STAMP = "2026-10-22T01:00:00Z";

interface Req { url: URL; path: string; method: string; body: any; headers: Headers; credentials?: RequestCredentials }
interface Item { snapshotId: string; offerId: string; quantity: number; subtotal: string | null; reason?: string | null; name?: string; desc: string }
interface Rev { revision: number; actionType: string; items: Item[]; recipientEmail: string | null; requestText: string | null; state: string; approvals: any[]; receipt: any }
interface Prop { id: string; participationId: string; revs: Rev[]; view?: (v: any) => void; payload?: (p: any) => void; history?: (v: any) => void }
type Handler = (r: Req) => Response | Promise<Response> | undefined;

const json = (v: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(v), { status, headers: { "Content-Type": status >= 400 ? "application/problem+json" : "application/json", "Cache-Control": "no-store" } });
const problem = (status: number, code: string | undefined) => json({ type: "about:blank", title: "SECRET-TITLE", status, detail: "SECRET-DETAIL", instance: "/SECRET-INSTANCE", ...(code ? { code } : {}) }, status);
const digest = (n: number) => n.toString(16).padStart(64, "0");
const plus = (d: string, m: number) => new Date(Date.parse(d) + m * 60000).toISOString().replace(".000Z", "Z");

function approval(rev: number, n: number, state = "valid", by = ACTOR) {
  const at = `2026-10-23T01:0${n}:00Z`;
  return { approvalId: uid(0xa00 + n), proposalRevision: rev, approvedBy: by, approvedAt: at, expiresAt: plus(at, 15), payloadDigest: digest(rev), state };
}
function receipt(rev: number, approvalId: string, outcome = "simulated", key = uid(0xf00)) {
  return { executionId: uid(0xe01), proposalRevision: rev, approvalId, actorId: ACTOR, idempotencyKey: key, startedAt: "2026-10-23T01:05:00Z", completedAt: "2026-10-23T01:05:01Z", outcome, reasonCode: outcome === "simulated" ? null : "SECRET_REASON" };
}
const item = (offerId: string, subtotal: string | null, o: Partial<Item> = {}): Item => ({ snapshotId: S1, offerId, quantity: 2, subtotal, desc: "Flyer Pack A", ...o });
function rev(items: Item[], o: Partial<Rev> = {}): Rev {
  return { revision: 1, actionType: "purchase_cart", items, recipientEmail: null, requestText: null, state: "open", approvals: [], receipt: null, ...o };
}
const prop = (revs: Rev[], o: Partial<Prop> = {}): Prop => ({ id: PR1, participationId: P, revs, ...o });
const defaultProp = (o: Partial<Rev> = {}) => prop([rev([item(O1, "1250"), item(O2, null)], o)]);

function payloadOf(r: Rev) {
  return { seller: { supplierName: "Invented Printer", sourceOrigin: { scheme: "https", host: "supplier.example", port: 443 } },
    items: r.items.map((i) => ({ snapshotId: i.snapshotId, snapshotRevision: 1, offerId: i.offerId, quantity: i.quantity, supplierName: i.name ?? "Invented Printer", productDescription: i.desc,
      listedPrice: { amountMinorUnits: "777777", currency: "SGD", unitLabel: null, quantityBasis: null },
      estimatedItemSubtotalMinorUnits: i.subtotal, estimatedCurrency: i.subtotal === null ? null : "SGD", unknownReason: i.subtotal === null ? (i.reason ?? "source_price_unknown") : null,
      sources: [{ sourceId: S1, requestedUrl: URL1, finalUrl: URL1, retrievedAt: STAMP, sourceRevision: 1 }] })),
    ...(r.actionType === "quotation_request" ? { recipientEmail: r.recipientEmail, requestText: r.requestText } : {}) };
}
function revisionView(p: Prop, r: Rev, current: boolean) {
  const payload = payloadOf(r);
  if (current) p.payload?.(payload);
  return { proposalRevision: r.revision, actionType: r.actionType, payload, shortlistId: SL, shortlistRevision: 1, payloadDigest: digest(r.revision), state: r.state,
    createdAt: STAMP, updatedAt: STAMP, approvals: r.approvals, executionReceipt: r.receipt };
}
function serialize(p: Prop) {
  const r = p.revs[p.revs.length - 1];
  const v: any = { proposalId: p.id, ...revisionView(p, r, true), creatorId: ACTOR, businessId: B1, participationId: p.participationId, mode: "simulation",
    recipientVerification: r.actionType === "quotation_request" && r.recipientEmail ? "unverified" : null,
    revisions: p.revs.map((x) => revisionView(p, x, x === r)) };
  p.history?.(v);
  p.view?.(v);
  return v;
}

const snapOffer = (id: string, name: string, desc: string, subtotal: string | null) => ({ id, supplierName: name, productDescription: desc,
  evidenceByField: [], listedPrice: { amountMinorUnits: "777777", currency: "SGD", unitLabel: null, quantityBasis: null },
  estimatedItemSubtotalMinorUnits: subtotal, estimatedCurrency: subtotal === null ? null : "SGD", deliveryEstimate: null, minimumOrderQuantity: null, availability: null, unknownFields: [], qualifications: [] });
const snapshot = (id: string, offers: any[], participationId = P) => ({ id, participationId, revision: 1, createdAt: STAMP, status: "succeeded", isStale: false,
  request: { category: "printing", brief: "Synthetic brief", quantity: 100, deliveryArea: "Singapore East", neededBy: null },
  sources: [{ sourceId: S1, searchResultUrl: URL1, requestedUrl: URL1, finalUrl: URL1, provider: "tavily_page_fetch", retrievedAt: STAMP, isStale: false, excerpt: "Synthetic excerpt" }],
  sourceFailures: [], offers });

class World {
  requests: Req[] = []; handlers: Handler[] = []; proposals: Prop[] = [];
  shortlist: any = { id: SL, participationId: P, revision: 1, createdAt: STAMP, updatedAt: STAMP,
    selectedOffers: [{ snapshotId: S1, offerId: O1 }, { snapshotId: S1, offerId: O2 }, { snapshotId: S1, offerId: O3 }, { snapshotId: S2, offerId: O4 }] };
  snapshots: Record<string, any> = {
    [S1]: snapshot(S1, [snapOffer(O1, "Invented Printer", "Flyer Pack A", "1250"), snapOffer(O2, "Invented Printer", "Poster Pack B", null), snapOffer(O3, "Invented Printer", "Sticker Pack C", "0")]),
    [S2]: snapshot(S2, [snapOffer(O4, "Second Seller", "Banner D", "500")]),
  };
  on(h: Handler) { this.handlers.unshift(h); }
  count(method: string, re: RegExp) { return this.requests.filter((r) => r.method === method && re.test(r.path)).length; }
  find(p: string) { return this.proposals.find((x) => x.id === p)!; }
  respond(r: Req): Response | Promise<Response> | undefined {
    for (const h of this.handlers) { const out = h(r); if (out) return out; }
    const m = r.path.match(/^\/api\/v1\/business\/action-proposals\/([^/]+)(\/[a-z]+)?$/);
    if (r.method === "GET" && r.path === `${BASE}/participations/${P}/supplier-shortlist`) return json(this.shortlist);
    const snap = r.path.match(/^\/api\/v1\/business\/supplier-research\/([^/]+)$/);
    if (r.method === "GET" && snap) return this.snapshots[snap[1]] ? json(this.snapshots[snap[1]]) : problem(404, "not_found");
    if (r.method === "GET" && r.path === `${BASE}/participations/${P}/supplier-research`) return json({ items: [], total: 0, offset: 0, limit: 20, latestJob: null });
    if (r.method === "GET" && r.path === LIST) {
      const limit = Number(r.url.searchParams.get("limit")), offset = Number(r.url.searchParams.get("offset") ?? 0);
      return json({ items: this.proposals.slice(offset, offset + limit).map(serialize), total: this.proposals.length, limit, offset });
    }
    if (r.method === "GET" && m && !m[2]) { const p = this.find(m[1]); return p ? json(serialize(p)) : problem(404, "not_found"); }
    if (r.method === "POST" && r.path === LIST) {
      const items = r.body.items.map((i: any) => {
        const o = Object.values(this.snapshots).flatMap((s: any) => s.offers).find((x: any) => x.id === i.offerId);
        return { snapshotId: i.snapshotId, offerId: i.offerId, quantity: i.quantity, subtotal: o.estimatedItemSubtotalMinorUnits, desc: o.productDescription };
      });
      const p = prop([rev(items, { actionType: r.body.actionType, recipientEmail: r.body.recipientEmail ?? null, requestText: r.body.requestText ?? null })], { id: uid(0x600 + this.proposals.length) });
      this.proposals.push(p); return json(serialize(p), 201);
    }
    if (r.method === "POST" && m?.[2] === "/revisions") {
      const p = this.find(m[1]), last = p.revs.at(-1)!;
      p.revs.push(rev(last.items, { revision: last.revision + 1, actionType: last.actionType, recipientEmail: r.body.recipientEmail ?? null, requestText: r.body.requestText ?? null }));
      return json(serialize(p), 201);
    }
    if (r.method === "POST" && m?.[2] === "/approvals") {
      const p = this.find(m[1]), last = p.revs.at(-1)!, a = approval(last.revision, last.approvals.length + 1);
      last.approvals.push(a); return json(a, 201);
    }
    if (r.method === "POST" && m?.[2] === "/cancel") { const p = this.find(m[1]); p.revs.at(-1)!.state = "cancelled"; return json(serialize(p)); }
    const ex = r.path.match(/^\/api\/v1\/business\/action-approvals\/([^/]+)\/execute$/);
    if (r.method === "POST" && ex) {
      const p = this.proposals.find((x) => x.revs.at(-1)!.approvals.some((a) => a.approvalId === ex[1]))!, last = p.revs.at(-1)!;
      last.approvals.forEach((a) => { if (a.approvalId === ex[1]) a.state = "consumed"; });
      last.receipt = receipt(last.revision, ex[1], "simulated", r.body.idempotencyKey); last.state = "simulated"; return json(last.receipt);
    }
    return undefined;
  }
  install() {
    auth.current = actor("business");
    const fallback = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "object" && "url" in input ? input.url : String(input), window.location.origin);
      const r: Req = { url, path: url.pathname, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : {}, headers: new Headers(init?.headers), credentials: init?.credentials };
      this.requests.push(r);
      return (await this.respond(r)) ?? fallback(input, init);
    }));
    return this;
  }
}

const text = () => (document.body.textContent ?? "").replace(/[\s\u00a0]+/g, " ");
const buttons = (re: RegExp) => screen.queryAllByRole("button", { name: re });
const live = (b: HTMLElement) => !(b as HTMLButtonElement).disabled && b.getAttribute("aria-disabled") !== "true";
const enabled = (re: RegExp) => buttons(re).some(live);
const settle = (t = 200) => act(async () => { await new Promise((r) => setTimeout(r, t)); });
const REVISE = /revis/i, APPROVE = /^approve|approve (this |current )?(proposal|revision)/i, SIMULATE = /simulat/i, CANCEL = /cancel/i;
const controls = () => [enabled(REVISE), enabled(APPROVE), enabled(SIMULATE), enabled(CANCEL)];
const NONE = [false, false, false, false];
type User = ReturnType<typeof userEvent.setup>;

async function open(w: World, query = `participationId=${P}`) {
  w.install();
  return renderPrototype(`/business/procurement-proposals?${query}`);
}
// The spec does not say whether detail is inline or behind an open action; tolerate either.
async function review(user: User, pattern = /Invented Printer|Flyer Pack A/) {
  await waitFor(() => expect(text()).toMatch(/proposal/i));
  await settle(100);
  if (!pattern.test(text()) || screen.queryAllByRole("table").length === 0) {
    const opener = screen.queryAllByRole("link", { name: /open|view|review|details/i })[0] ?? buttons(/open|view|review|details/i)[0];
    if (opener) await user.click(opener);
  }
  await waitFor(() => expect(text()).toMatch(pattern));
  await settle(100);
}
async function confirmIfAsked(user: User, name = /confirm|approve|yes|save|submit|cancel proposal/i) {
  const dialog = screen.queryByRole("dialog");
  if (dialog) await user.click(within(dialog).getAllByRole("button").find((b) => name.test(b.textContent ?? ""))!);
}
async function approve(user: User) {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  await user.click(buttons(APPROVE).find(live)!);
  await confirmIfAsked(user);
}
const simulate = (user: User) => user.click(buttons(SIMULATE).find(live)!);
const markerLine = () => storedValues(window.localStorage).split("\n").find((l) => l.includes(PR1)) ?? "";
const markerCount = () => (markerLine() ? 1 : 0);
const executes = (w: World) => w.count("POST", /\/execute$/);
const hold = () => { let release!: (r: Response) => void; const promise = new Promise<Response>((r) => { release = r; }); return { promise, release }; };
const detailReads = (w: World) => w.count("GET", /action-proposals\/[^/]+$/);
const readyProp = () => prop([rev([item(O1, "1250")], { approvals: [approval(1, 1)] })]);

afterEach(() => { vi.restoreAllMocks(); });
describe("AC01 route, context and shortlist resolution", () => {
  test("supplier research exposes an additive link to the proposals route carrying only the participation", async () => {
    // Supplier research validates the participation through the existing application interfaces before showing the link.
    const w = new World(); const user = userEvent.setup();
    w.on((r) => r.method === "GET" && r.path === `${BASE}/application-events` ? json([{ eventId: E1, title: "Synthetic Autumn Fair", timezone: "Asia/Singapore", startsAt: "2027-01-01T01:00:00Z", endsAt: "2027-01-01T09:00:00Z", eventRevision: 1, applicationsOpen: true, settingsRevision: 1, applicationId: draft().id }]) : undefined);
    w.on((r) => r.method === "GET" && r.path === `${BASE}/applications` ? json([draft({ participationId: P })]) : undefined);
    w.install();
    await renderPrototype(`/business/supplier-research?businessId=${B1}&eventId=${E1}&participationId=${P}`);
    const link = await screen.findByRole("link", { name: /procurement proposals?/i });
    const href = new URL(link.getAttribute("href")!, location.origin);
    expect(href.pathname).toBe("/business/procurement-proposals"); expect([...href.searchParams.keys()]).toEqual(["participationId"]); expect(href.searchParams.get("participationId")).toBe(P);
    await user.click(link);
    expect(window.location.pathname).toBe("/business/procurement-proposals");
  });

  test.each([["not a UUID", "participationId=not-a-uuid"], ["duplicate values", `participationId=${P}&participationId=${P2}`], ["missing value", ""]])(
    "%s gives an unavailable state without any private request", async (_n, query) => {
      const w = new World(); await open(w, query);
      await waitFor(() => expect(text()).toMatch(/unavailable/i));
      expect(w.requests.filter((r) => /supplier-shortlist|action-proposals|supplier-research\//.test(r.path))).toEqual([]);
    });

  test("a shortlist for another participation shows nothing and keeps proposal rows hidden", async () => {
    const w = new World(); w.proposals = [defaultProp()]; w.shortlist.participationId = P2; await open(w);
    await waitFor(() => expect(text()).toMatch(/unavailable/i)); await settle();
    expect(text()).not.toMatch(/Invented Printer|Flyer Pack/); expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  test("empty state appears only for a valid shortlist with no saved references", async () => {
    const w = new World(); w.shortlist.selectedOffers = []; await open(w);
    await waitFor(() => expect(text()).toMatch(/no (saved )?(shortlist|offers|entries)|shortlist is empty|nothing saved/i));
    expect(w.count("GET", /supplier-research\//)).toBe(0);
  });

  test("each unique snapshot is resolved once through the authorized interface and every entry stays individually selectable, including unknown price", async () => {
    const w = new World(); await open(w);
    expect(await screen.findByRole("checkbox", { name: /Poster Pack B/ })).toBeEnabled();
    for (const name of [/Flyer Pack A/, /Sticker Pack C/, /Banner D/]) expect(screen.getByRole("checkbox", { name })).toBeEnabled();
    expect(w.requests.filter((r) => r.path === `${BASE}/supplier-research/${S1}`)).toHaveLength(1);
    expect(w.requests.filter((r) => r.path === `${BASE}/supplier-research/${S2}`)).toHaveLength(1);
    expect(w.requests.filter((r) => /supplier-research\//.test(r.path)).every((r) => r.method === "GET")).toBe(true);
  });

  test.each<[string, (w: World) => void]>([
    ["snapshot read fails", (w) => w.on((r) => r.path.endsWith(S1) ? problem(500, "internal_error") : undefined)],
    ["snapshot missing", (w) => { delete w.snapshots[S1]; }],
    ["snapshot belongs to another participation", (w) => { w.snapshots[S1] = snapshot(S1, w.snapshots[S1].offers, P2); }],
    ["snapshot id differs from the reference", (w) => { w.snapshots[S1] = { ...w.snapshots[S1], id: S2 }; }],
    ["referenced offer missing", (w) => { w.snapshots[S1].offers = w.snapshots[S1].offers.filter((o: any) => o.id !== O1); }],
    ["offer appears twice", (w) => { w.snapshots[S1].offers.push(w.snapshots[S1].offers[0]); }],
    ["snapshot malformed", (w) => { w.snapshots[S1] = { id: S1, participationId: P }; }],
  ])("%s: unavailable, never empty, create disabled, proposal history still usable", async (_n, tamper) => {
    const w = new World(); w.proposals = [defaultProp()]; tamper(w); await open(w);
    await waitFor(() => expect(text()).toMatch(/unavailable/i)); await settle();
    expect(text()).not.toMatch(/no (saved )?(shortlist|offers|entries)|shortlist is empty|nothing saved/i);
    screen.queryAllByRole("checkbox").forEach((c) => expect(c).toBeDisabled());
    expect(buttons(/^create/i).some(live)).toBe(false);
    expect(text()).toMatch(/Invented Printer|Flyer Pack A/);
  });

  test("one snapshot at a time: other-snapshot entries are disabled with an explanation, never auto-split or sent", async () => {
    const w = new World(); await open(w); const user = userEvent.setup();
    const first = await screen.findByRole("checkbox", { name: /Flyer Pack A/ });
    await user.click(first);
    const other = screen.getByRole("checkbox", { name: /Banner D/ });
    expect(other).toBeDisabled(); expect(other).toHaveAccessibleDescription(/snapshot|clear/i);
    expect(screen.getByRole("checkbox", { name: /Poster Pack B/ })).toBeEnabled();
    expect(w.count("POST", /action-proposals/)).toBe(0);
    await user.click(first);
    expect(screen.getByRole("checkbox", { name: /Banner D/ })).toBeEnabled();
  });
});

describe("AC01/AC05 creating proposals", () => {
  const choose = async (user: User, names: RegExp[]) => { for (const n of names) await user.click(await screen.findByRole("checkbox", { name: n })); };
  const submit = () => buttons(/create/i).find((b) => !/revision/i.test(b.textContent ?? ""))!;

  test("purchase/cart create sends only identifiers and quantities, offers no quotation fields and shows the source-derived result", async () => {
    const w = new World(); await open(w); const user = userEvent.setup();
    await user.click(await screen.findByRole("radio", { name: /purchase|cart/i }));
    await choose(user, [/Flyer Pack A/, /Poster Pack B/]);
    expect(screen.queryByLabelText(/recipient/i)).toBeNull(); expect(screen.queryByLabelText(/request text|message/i)).toBeNull();
    await user.click(submit());
    await waitFor(() => expect(w.count("POST", /action-proposals$/)).toBe(1));
    const body = w.requests.find((r) => r.method === "POST")!.body;
    expect(Object.keys(body).sort()).toEqual(["actionType", "expectedShortlistRevision", "items", "participationId", "shortlistId"]);
    expect(body).toMatchObject({ participationId: P, actionType: "purchase_cart", shortlistId: SL, expectedShortlistRevision: 1 });
    expect(body.items.map((i: any) => Object.keys(i).sort())).toEqual([["offerId", "quantity", "snapshotId"], ["offerId", "quantity", "snapshotId"]]);
    expect(body.items.map((i: any) => i.offerId).sort()).toEqual([O1, O2].sort());
    await waitFor(() => expect(text()).toMatch(/purchase|cart/i)); expect(text()).toMatch(/Invented Printer/);
  });

  test("quotation request sends optional recipient/text, labels recipient unverified and keeps quote text out of URL, storage and console", async () => {
    const w = new World(); await open(w); const user = userEvent.setup();
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
    await user.click(await screen.findByRole("radio", { name: /quotation/i }));
    await choose(user, [/Flyer Pack A/]);
    const email = screen.getByLabelText(/recipient/i), body = screen.getByLabelText(/request text|message|details/i);
    expect(email).toHaveAttribute("autocomplete", "off"); expect(body).toHaveAttribute("spellcheck", "false");
    await user.type(email, "synthetic.person@example.test"); await user.type(body, "PRIVATE-QUOTE-TEXT");
    expect(text()).toMatch(/unverified/i);
    await user.click(submit());
    await waitFor(() => expect(w.count("POST", /action-proposals$/)).toBe(1));
    expect(w.requests.find((r) => r.method === "POST")!.body).toMatchObject({ actionType: "quotation_request", recipientEmail: "synthetic.person@example.test", requestText: "PRIVATE-QUOTE-TEXT" });
    await waitFor(() => expect(text()).toMatch(/PRIVATE-QUOTE-TEXT/));
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    for (const secret of ["synthetic.person@example.test", "PRIVATE-QUOTE-TEXT"]) {
      expect(location.href).not.toContain(secret); expect(storedValues(window.localStorage)).not.toContain(secret); expect(storedValues(window.sessionStorage)).not.toContain(secret);
      spies.forEach((s) => expect(JSON.stringify(s.mock.calls)).not.toContain(secret));
    }
  });

  test.each<[number, string, RegExp]>([[422, "validation_error", /cannot be accepted/i], [409, "stale_source", /changed|reload|review/i], [409, "revision_conflict", /changed|reload|review/i]])(
    "create rejected with %s %s preserves selection and fields, reloads canonical data and never retries", async (status, code, message) => {
      const w = new World(); w.on((r) => r.method === "POST" ? problem(status, code) : undefined); await open(w); const user = userEvent.setup();
      await user.click(await screen.findByRole("radio", { name: /quotation/i }));
      await choose(user, [/Flyer Pack A/]); await user.type(screen.getByLabelText(/recipient/i), "keep.me@example.test");
      const lists = w.count("GET", /action-proposals$/);
      await user.click(submit());
      await waitFor(() => expect(text()).toMatch(message)); await settle();
      expect(w.count("POST", /action-proposals$/)).toBe(1);
      expect(w.count("GET", /action-proposals$/)).toBeGreaterThan(lists);
      expect(screen.getByRole("checkbox", { name: /Flyer Pack A/ })).toBeChecked(); expect(screen.getByLabelText(/recipient/i)).toHaveValue("keep.me@example.test");
      expect(text()).not.toMatch(/SECRET-/);
    });

  test("create timeout reloads the list before another create may start and is never repeated", async () => {
    const w = new World(); w.on((r) => r.method === "POST" && r.path === LIST ? Promise.reject(new TypeError("network")) : undefined); await open(w); const user = userEvent.setup();
    await choose(user, [/Flyer Pack A/]);
    const base = w.count("GET", /action-proposals$/);
    const reload = hold(); w.on((r) => r.method === "GET" && r.path === LIST ? reload.promise : undefined);
    await user.click(submit());
    await waitFor(() => expect(w.count("GET", /action-proposals$/)).toBeGreaterThan(base));
    await settle();
    expect(buttons(/create/i).some((b) => live(b) && !/revision/i.test(b.textContent ?? ""))).toBe(false);
    expect(w.count("POST", /action-proposals$/)).toBe(1);
    w.handlers.shift(); reload.release(json({ items: [], total: 0, limit: 100, offset: 0 }));
    await waitFor(() => expect(buttons(/create/i).some((b) => live(b) && !/revision/i.test(b.textContent ?? ""))).toBe(true));
    expect(w.count("POST", /action-proposals$/)).toBe(1);
  });
});

describe("AC01 amounts and unknowns", () => {
  const render = async (items: Item[]) => { const w = new World(); w.proposals = [prop([rev(items)])]; await open(w); await review(userEvent.setup()); return w; };

  test("complete total only when every line is known; unknown never counted as zero", async () => {
    await render([item(O1, "1250"), item(O3, "5")]);
    expect(text()).toMatch(/SGD 12\.50/); expect(text()).toMatch(/SGD 0\.05/); expect(text()).toMatch(/total[^.]{0,40}SGD 12\.55/i);
    expect(text()).not.toMatch(/known-items subtotal/i);
  });
  test("some unknown: labelled Known-items subtotal for known lines with the count of unknown line items", async () => {
    await render([item(O1, "1250"), item(O2, null), item(O3, null, { reason: "quantity_mismatch" })]);
    expect(text()).toMatch(/Known-items subtotal[^S]{0,20}SGD 12\.50/i); expect(text()).toMatch(/2 (line )?items? (with )?unknown|unknown[^.]{0,30}\b2\b/i);
    expect(text()).not.toMatch(/(?<!items )\btotal:? SGD 12\.50/i);
  });
  test("all unknown: no numeric subtotal and all item prices stated unknown", async () => {
    await render([item(O1, null), item(O2, null, { reason: "arithmetic_overflow" })]);
    expect(text()).toMatch(/all item prices are unknown/i); expect(text()).not.toMatch(/SGD\s?\d/);
  });
  test("known zero is shown as SGD 0.00 and is distinct from unknown", async () => {
    await render([item(O3, "0"), item(O2, null)]);
    expect(text()).toMatch(/SGD 0\.00/); expect(text()).toMatch(/Known-items subtotal[^S]{0,20}SGD 0\.00/i);
  });
  test("maximum line and 100-line maximum aggregate use exact en-SG grouping with two decimals", async () => {
    const max = "999999999999999999";
    await render(Array.from({ length: 100 }, (_v, i) => item(uid(0x300 + i), max)));
    expect(text()).toContain("SGD 9,999,999,999,999,999.99"); expect(text()).toContain("SGD 999,999,999,999,999,999.00");
    expect(text()).not.toMatch(/e\+|E\+|NaN|Infinity/);
  });
  test("listedPrice is never presented as an estimate or used in calculations", async () => {
    await render([item(O2, null)]);
    expect(text()).not.toMatch(/7,?777\.77|777777/);
  });
  test("source text and user text are inert; source URLs are never fetched", async () => {
    const w = new World(); w.proposals = [prop([rev([item(O1, "1250", { name: "<img src=x onerror=alert(1)> Seller", desc: "<b>bold</b>" })], { actionType: "quotation_request", recipientEmail: "a@example.test", requestText: "<script>x</script>" })], { payload: (p) => { p.seller.supplierName = p.items[0].supplierName; } })];
    await open(w); await review(userEvent.setup(), /Seller/);
    expect(document.querySelector("img, script, b")).toBeNull(); expect(text()).toContain("<script>x</script>");
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(w.requests.some((r) => r.url.origin !== location.origin)).toBe(false);
  });
  test("revision history is ordered by numeric revision, not response order", async () => {
    const w = new World(); const p = prop([1, 2, 10].map((n) => rev([item(O1, "1250")], { revision: n })));
    p.history = (v) => { v.revisions = [10, 2, 1].map((n) => v.revisions.find((x: any) => x.proposalRevision === n)); };
    w.proposals = [p]; await open(w); await review(userEvent.setup());
    const nums = [...text().matchAll(/revision (\d+)/gi)].map((m) => Number(m[1])).filter((n, i, a) => a.indexOf(n) === i && [1, 2, 10].includes(n));
    expect(nums).toHaveLength(3);
    const asc = [...nums].sort((x, y) => x - y);
    expect([asc, [...asc].reverse()]).toContainEqual(nums);
  });
});
describe("AC01/AC02 DTO validation and control gating", () => {
  type T = (i: any) => void;
  const amountCases: [string, T][] = [
    ["known amount without currency", (i) => { i.estimatedCurrency = null; }], ["unknown amount with currency", (i) => { i.estimatedItemSubtotalMinorUnits = null; i.unknownReason = "source_price_unknown"; }],
    ["unknown without reason", (i) => { i.estimatedItemSubtotalMinorUnits = null; i.estimatedCurrency = null; i.unknownReason = null; }], ["unknown with invalid reason", (i) => { i.estimatedItemSubtotalMinorUnits = null; i.estimatedCurrency = null; i.unknownReason = "mystery"; }],
    ["known amount with reason", (i) => { i.unknownReason = "source_price_unknown"; }], ["leading zeroes", (i) => { i.estimatedItemSubtotalMinorUnits = "0012"; }], ["negative", (i) => { i.estimatedItemSubtotalMinorUnits = "-5"; }],
    ["decimal string", (i) => { i.estimatedItemSubtotalMinorUnits = "12.50"; }], ["number type", (i) => { i.estimatedItemSubtotalMinorUnits = 1250; }], ["exponent", (i) => { i.estimatedItemSubtotalMinorUnits = "1e3"; }],
    ["above maximum", (i) => { i.estimatedItemSubtotalMinorUnits = "1000000000000000000"; }], ["wrong currency", (i) => { i.estimatedCurrency = "USD"; }], ["missing amount field", (i) => { delete i.estimatedItemSubtotalMinorUnits; }],
  ];
  test.each(amountCases)("malformed current amount (%s): data error, no monetary rows, only Cancel remains available", async (_n, tamper) => {
    const w = new World(); w.proposals = [prop([rev([item(O1, "1250"), item(O2, null)], { approvals: [approval(1, 1)] })], { payload: (p) => tamper(p.items[0]) })];
    await open(w); await review(userEvent.setup(), /proposal/i); await settle();
    expect(text()).toMatch(/data error|invalid data|cannot be (shown|displayed)|malformed/i);
    expect(text()).not.toMatch(/SGD\s?\d|Known-items subtotal|all item prices are unknown/i);
    expect(controls()).toEqual([false, false, false, true]);
  });

  const payloadCases: [string, (p: any) => void][] = [
    ["final URL on another origin", (p) => { p.items[0].sources[0].finalUrl = "https://other.example/item"; }], ["http final URL", (p) => { p.items[0].sources[0].finalUrl = "http://supplier.example/item"; }],
    ["source origin port 0", (p) => { p.seller.sourceOrigin.port = 0; }], ["source origin scheme http", (p) => { p.seller.sourceOrigin.scheme = "http"; }], ["empty seller", (p) => { p.seller.supplierName = ""; }],
    ["item seller differs", (p) => { p.items[0].supplierName = "Someone Else"; }], ["quantity 0", (p) => { p.items[0].quantity = 0; }], ["quantity above bound", (p) => { p.items[0].quantity = 1000001; }],
    ["duplicate items", (p) => { p.items[1] = { ...p.items[0] }; }], ["two snapshots", (p) => { p.items[1].snapshotId = S2; }], ["javascript source URL", (p) => { p.items[0].sources[0].finalUrl = "javascript:alert(1)"; }],
    ["bad retrieval timestamp", (p) => { p.items[0].sources[0].retrievedAt = "yesterday"; }],
  ];
  test.each(payloadCases)("malformed non-amount payload (%s): no proposal controls at all", async (_n, tamper) => {
    const w = new World(); w.proposals = [prop([rev([item(O1, "1250"), item(O2, null)])], { payload: tamper })]; await open(w); await review(userEvent.setup(), /proposal/i); await settle();
    expect(controls()).toEqual(NONE); expect(text()).not.toMatch(/SGD\s?\d/);
  });

  const viewCases: [string, (v: any) => void][] = [
    ["creator is another actor", (v) => { v.creatorId = uid(0x999); }], ["other business", (v) => { v.businessId = uid(0x998); }], ["mode live", (v) => { v.mode = "live"; }], ["digest upper-case", (v) => { v.payloadDigest = digest(1).replace(/0/g, "A"); }],
    ["digest differs from history", (v) => { v.payloadDigest = digest(7); }], ["max history revision differs", (v) => { v.proposalRevision = 3; }], ["history empty", (v) => { v.revisions = []; }],
    ["invalid proposal id", (v) => { v.proposalId = "nope"; }], ["invalid revision metadata", (v) => { v.proposalRevision = "x"; v.revisions[0].proposalRevision = "x"; }],
    ["quotation without recipient verification", (v) => { v.actionType = "quotation_request"; v.revisions[0].actionType = "quotation_request"; }],
    ["approval for another digest", (v) => { v.approvals = [{ ...approval(1, 1), payloadDigest: digest(9) }]; v.revisions[0].approvals = v.approvals; }],
    ["approval by another actor", (v) => { v.approvals = [approval(1, 1, "valid", uid(0x997))]; v.revisions[0].approvals = v.approvals; }],
    ["open proposal with consumed approval", (v) => { v.approvals = [approval(1, 1, "consumed")]; v.revisions[0].approvals = v.approvals; }],
    ["open proposal with receipt", (v) => { v.executionReceipt = receipt(1, uid(0xa01)); v.revisions[0].executionReceipt = v.executionReceipt; }],
    ["simulated without receipt", (v) => { v.state = "simulated"; v.revisions[0].state = "simulated"; }],
    ["top-level differs from highest entry", (v) => { v.shortlistRevision = 5; }],
  ];
  test.each(viewCases)("malformed DTO (%s) disables every mutation, including Cancel", async (_n, tamper) => {
    const w = new World(); w.proposals = [prop([rev([item(O1, "1250")])], { view: tamper })]; await open(w); await review(userEvent.setup(), /proposal/i); await settle();
    expect(controls()).toEqual(NONE);
  });

  test("a malformed historical revision does not hide the valid current revision or its controls", async () => {
    const w = new World(); const p = prop([rev([item(O1, "1250")]), rev([item(O1, "1250")], { revision: 2 })], { history: (v) => { v.revisions[0].payload.items[0].estimatedCurrency = "USD"; } });
    w.proposals = [p]; await open(w); await review(userEvent.setup());
    expect(text()).toMatch(/SGD 12\.50/); expect(controls()).toEqual([true, true, false, true]);
  });

  const state = (s: string, o: Partial<Rev> = {}) => rev([item(O1, "1250")], { state: s, ...o });
  test.each<[string, () => Rev, boolean[]]>([
    ["open, no approval", () => state("open"), [true, true, false, true]],
    ["open, valid approval", () => state("open", { approvals: [approval(1, 1)] }), [true, false, true, true]],
    ["open, all approvals expired", () => state("open", { approvals: [approval(1, 1, "expired")] }), [true, true, false, true]],
    ["cancelled", () => state("cancelled", { approvals: [approval(1, 1, "cancelled")] }), NONE],
    ["simulated", () => state("simulated", { approvals: [approval(1, 1, "consumed")], receipt: receipt(1, uid(0xa01)) }), NONE],
    ["failed", () => state("failed", { approvals: [approval(1, 1, "consumed")], receipt: receipt(1, uid(0xa01), "failed") }), NONE],
    ["uncertain", () => state("uncertain", { approvals: [approval(1, 1, "consumed")], receipt: receipt(1, uid(0xa01), "uncertain") }), NONE],
  ])("state matrix: %s", async (_n, make, expected) => {
    const w = new World(); w.proposals = [prop([make()])]; await open(w); await review(userEvent.setup()); expect(controls()).toEqual(expected);
  });

  test.each(["failed", "uncertain"])("%s receipt is terminal: no retry or reconciliation control, no success claim, opaque reason never rendered", async (outcome) => {
    const w = new World(); w.proposals = [prop([state(outcome, { approvals: [approval(1, 1, "consumed")], receipt: receipt(1, uid(0xa01), outcome) })])]; await open(w); await review(userEvent.setup());
    expect(buttons(/retry|reconcil|try again/i)).toHaveLength(0); expect(text()).not.toMatch(/SECRET_REASON|successfully simulated|success\b/i); expect(text()).toMatch(new RegExp(outcome, "i"));
  });

  test("with several qualifying approvals Simulate uses the latest by (approvedAt, approvalId)", async () => {
    const w = new World(); const a1 = approval(1, 1), a2 = approval(1, 2); w.proposals = [prop([state("open", { approvals: [a1, a2] })])]; await open(w); const user = userEvent.setup(); await review(user);
    await simulate(user); await waitFor(() => expect(executes(w)).toBe(1));
    expect(w.requests.find((r) => /execute$/.test(r.path))!.path).toContain(a2.approvalId);
  });

  test.each<[string, string, string, boolean]>([["past expiresAt but server-valid", "valid", "2000-01-01T00:00:00Z", true], ["future expiresAt but server-expired", "expired", "2999-01-01T00:00:00Z", false]])(
    "client clock is not authority: %s", async (_n, st, expiresAt, canSimulate) => {
      const a = { ...approval(1, 1, st), expiresAt }; const w = new World(); w.proposals = [prop([state("open", { approvals: [a] })])]; await open(w); await review(userEvent.setup());
      expect(enabled(SIMULATE)).toBe(canSimulate);
    });
});

describe("AC02/AC04 mutations", () => {
  const prepared = async (p: Prop = readyProp()) => { const w = new World(); w.proposals = [p]; await open(w); const user = userEvent.setup(); await review(user); return { w, user }; };
  const plain = () => prop([rev([item(O1, "1250")])]);

  test("approval sends only the displayed revision, shows approver/revision/expiry, stays unsimulated and creates no receipt", async () => {
    const { w, user } = await prepared(plain()); await approve(user);
    await waitFor(() => expect(w.count("POST", /approvals$/)).toBe(1));
    expect(w.requests.find((r) => /approvals$/.test(r.path))!.body).toEqual({ proposalRevision: 1 });
    await waitFor(() => expect(text()).toMatch(/approved/i)); expect(text()).toMatch(/not (yet )?simulated/i); expect(text()).toMatch(/expir/i); expect(text()).toMatch(/revision 1/i);
    expect(executes(w)).toBe(0); expect(controls()).toEqual([true, false, true, true]);
  });

  test("simulation sends only a UUID idempotency key, clears the marker and shows a terminal simulated receipt without retry controls", async () => {
    const { w, user } = await prepared(); await simulate(user);
    await waitFor(() => expect(text()).toMatch(/simulated/i)); await settle();
    const req = w.requests.find((r) => /execute$/.test(r.path))!;
    expect(Object.keys(req.body)).toEqual(["idempotencyKey"]); expect(req.body.idempotencyKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(markerCount()).toBe(0); expect(controls()).toEqual(NONE); expect(buttons(/retry|reconcil/i)).toHaveLength(0);
  });

  test("marker is persisted before Execute is dispatched and holds only actor, proposal and revision", async () => {
    let at = ""; const { w, user } = await prepared();
    w.on((r) => { if (/execute$/.test(r.path)) at = markerLine(); return undefined; });
    await simulate(user); await waitFor(() => expect(executes(w)).toBe(1));
    expect(at).toContain(PR1); expect(at).toContain(ACTOR);
    expect(Object.values(JSON.parse(at.slice(at.indexOf("{")))).sort()).toEqual([1, ACTOR, PR1].sort());
    expect(at).not.toContain(w.requests.find((r) => /execute$/.test(r.path))!.body.idempotencyKey); expect(at).not.toMatch(/Invented|Flyer|1250/);
  });

  test.each(["getItem", "setItem"] as const)("unavailable storage (%s throws) fails closed: Execute is not sent", async (method) => {
    const { w, user } = await prepared();
    vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new DOMException("denied", "SecurityError"); });
    await simulate(user).catch(() => undefined); await settle(); expect(executes(w)).toBe(0); expect(enabled(SIMULATE)).toBe(false);
  });

  test.each<[string, (w: World) => void]>([
    ["network abort", (w) => w.on((r) => /execute$/.test(r.path) ? Promise.reject(new DOMException("aborted", "AbortError")) : undefined)],
    ["malformed 2xx", (w) => w.on((r) => /execute$/.test(r.path) ? new Response("<html>", { status: 200 }) : undefined)],
    ["2xx wrong receipt shape", (w) => w.on((r) => /execute$/.test(r.path) ? json({ outcome: "simulated" }) : undefined)],
    ["HTTP 500", (w) => w.on((r) => /execute$/.test(r.path) ? problem(500, "internal_error") : undefined)],
    ["unknown status", (w) => w.on((r) => /execute$/.test(r.path) ? problem(418, "teapot") : undefined)],
    ["execution_claimed 409", (w) => w.on((r) => /execute$/.test(r.path) ? problem(409, "execution_claimed") : undefined)],
  ])("indeterminate (%s): marker retained, canonical detail reloaded, no retry, Approve/Simulate stay disabled", async (_n, script) => {
    const { w, user } = await prepared(); script(w);
    const details = detailReads(w); await simulate(user);
    await waitFor(() => expect(detailReads(w)).toBeGreaterThan(details)); await settle(400);
    expect(executes(w)).toBe(1); expect(markerCount()).toBe(1); expect(enabled(APPROVE)).toBe(false); expect(enabled(SIMULATE)).toBe(false); expect(text()).not.toMatch(/SECRET-/);
  });

  test.each<[number, string]>([[409, "stale_source"], [409, "revision_conflict"], [409, "expired"], [409, "cancelled"], [409, "idempotency_conflict"], [422, "validation_error"], [429, "quota_exceeded"], [503, "service_unavailable"]])(
    "non-committing %s %s: not repeated, canonical reload, marker cleared once an open no-receipt state is confirmed", async (status, code) => {
      const { w, user } = await prepared(); w.on((r) => /execute$/.test(r.path) ? problem(status, code) : undefined);
      const details = detailReads(w); await simulate(user);
      await waitFor(() => expect(detailReads(w)).toBeGreaterThan(details)); await settle(300);
      expect(executes(w)).toBe(1); expect(markerCount()).toBe(0); expect(text()).not.toMatch(/SECRET-/); expect(text()).not.toMatch(/successfully|has been simulated/i);
      expect(w.count("POST", /approvals$/)).toBe(0);
    });

  test("non-committing result with a failed canonical reload retains the marker and fails closed", async () => {
    const { w, user } = await prepared(); w.on((r) => /execute$/.test(r.path) ? problem(409, "expired") : undefined);
    w.on((r) => r.method === "GET" && /action-proposals\/[^/]+$/.test(r.path) ? problem(500, "internal_error") : undefined);
    await simulate(user); await settle(400); expect(markerCount()).toBe(1); expect(controls().slice(1, 3)).toEqual([false, false]); expect(executes(w)).toBe(1);
  });

  test("a second explicit simulation intent uses a fresh idempotency key", async () => {
    const { w, user } = await prepared(); let n = 0;
    w.on((r) => /execute$/.test(r.path) && n++ === 0 ? problem(503, "service_unavailable") : undefined);
    await simulate(user); await waitFor(() => expect(markerCount()).toBe(0)); await waitFor(() => expect(enabled(SIMULATE)).toBe(true)); await simulate(user);
    await waitFor(() => expect(executes(w)).toBe(2)); const keys = w.requests.filter((r) => /execute$/.test(r.path)).map((r) => r.body.idempotencyKey); expect(new Set(keys).size).toBe(2);
  });

  test("duplicate in-flight clicks send one request and every proposal mutation is disabled while it is in flight", async () => {
    const { w, user } = await prepared(); const h = hold(); w.on((r) => /execute$/.test(r.path) ? h.promise : undefined);
    const button = buttons(SIMULATE).find(live)!; await user.click(button); fireEvent.click(button); fireEvent.click(button);
    await settle(); expect(executes(w)).toBe(1); expect(controls()).toEqual(NONE); expect(screen.queryAllByRole("progressbar").length + screen.queryAllByRole("status").length).toBeGreaterThan(0);
    h.release(json(receipt(1, uid(0xa01))));
  });

  async function learnMarker() {
    const { w, user } = await prepared(); w.on((r) => /execute$/.test(r.path) ? hold().promise : undefined);
    await simulate(user); await waitFor(() => expect(markerCount()).toBe(1));
    const [key, value] = (Object.entries({ ...window.localStorage }) as [string, string][]).find(([, v]) => v.includes(PR1))!;
    document.body.innerHTML = ""; localStorage.removeItem(key); return { key, value };
  }

  test("a marker that survives a reload keeps Approve/Simulate disabled while Revise/Cancel stay available; a malformed marker fails closed", async () => {
    const { key, value } = await learnMarker();
    localStorage.setItem(key, value); const w2 = new World(); w2.proposals = [readyProp()]; await open(w2); await review(userEvent.setup());
    expect(controls()).toEqual([true, false, false, true]);
    document.body.innerHTML = ""; localStorage.setItem(key, value.replace(PR1, "not-a-uuid")); const w3 = new World(); w3.proposals = [readyProp()]; await open(w3);
    await settle(400); expect(enabled(SIMULATE)).toBe(false); expect(executes(w3)).toBe(0);
  });

  test("cross-tab: a marker written elsewhere suppresses Simulate; a clear elsewhere reloads canonical detail before re-enabling", async () => {
    const { key, value } = await learnMarker();
    const w = new World(); w.proposals = [readyProp()]; await open(w); await review(userEvent.setup()); expect(enabled(SIMULATE)).toBe(true);
    localStorage.setItem(key, value); act(() => { window.dispatchEvent(new StorageEvent("storage", { key, newValue: value, storageArea: localStorage })); });
    await waitFor(() => expect(enabled(SIMULATE)).toBe(false));
    const reload = hold(); w.on((r) => r.method === "GET" && /action-proposals\/[^/]+$/.test(r.path) ? reload.promise : undefined); const before = detailReads(w);
    localStorage.removeItem(key); act(() => { window.dispatchEvent(new StorageEvent("storage", { key, oldValue: value, newValue: null, storageArea: localStorage })); });
    await waitFor(() => expect(detailReads(w)).toBeGreaterThan(before)); expect(enabled(SIMULATE)).toBe(false);
  });

  test("sign-out clears the marker", async () => {
    const { w, user } = await prepared(); w.on((r) => /execute$/.test(r.path) ? hold().promise : undefined);
    await simulate(user); await waitFor(() => expect(markerCount()).toBe(1)); await user.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(markerCount()).toBe(0));
  });

  test("a new revision invalidates the earlier approval and requires fresh approval", async () => {
    const { w, user } = await prepared();
    await user.click(buttons(REVISE).find(live)!);
    const save = buttons(/save|create|submit|revision/i).find((b) => live(b) && /save|submit|revision/i.test(b.textContent ?? "")); if (save) await user.click(save);
    await waitFor(() => expect(w.count("POST", /revisions$/)).toBe(1));
    expect(w.requests.find((r) => /revisions$/.test(r.path))!.body.expectedProposalRevision).toBe(1);
    await waitFor(() => expect(text()).toMatch(/revision 2/i)); expect(enabled(SIMULATE)).toBe(false); expect(enabled(APPROVE)).toBe(true); expect(markerCount()).toBe(0);
  });

  test("cancel sends only the expected revision and leaves a terminal proposal with no controls", async () => {
    const { w, user } = await prepared(plain()); vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(buttons(CANCEL).find(live)!); await confirmIfAsked(user);
    await waitFor(() => expect(w.count("POST", /cancel$/)).toBe(1)); expect(w.requests.find((r) => /cancel$/.test(r.path))!.body).toEqual({ expectedProposalRevision: 1 });
    await waitFor(() => expect(text()).toMatch(/cancelled/i)); expect(controls()).toEqual(NONE);
  });

  test.each<[string, RegExp]>([["approvals", APPROVE], ["revisions", REVISE], ["cancel", CANCEL]])("timeout on %s reloads canonical detail and disables all mutations until the reload succeeds", async (suffix, button) => {
    const { w, user } = await prepared(plain()); vi.spyOn(window, "confirm").mockReturnValue(true); const end = new RegExp(suffix + "$"); const reload = hold();
    w.on((r) => r.method === "GET" && /action-proposals\/[^/]+$/.test(r.path) && w.count("POST", end) > 0 ? reload.promise : undefined);
    w.on((r) => r.method === "POST" && end.test(r.path) ? Promise.reject(new TypeError("timeout")) : undefined);
    await user.click(buttons(button).find(live)!); await confirmIfAsked(user);
    await settle(300); expect(controls()).toEqual(NONE); expect(w.count("POST", end)).toBeLessThanOrEqual(1);
  });
});
describe("AC01/AC03 creator-wide list pagination and fail-closed filtering", () => {
  const many = (n: number, otherEvery = 0) => Array.from({ length: n }, (_v, i) => {
    const foreign = otherEvery > 0 && i % otherEvery === 0;
    return prop([rev([item(uid(0x700 + i), "100", { name: foreign ? `Foreign Seller ${i}` : undefined })])], { id: uid(0x800 + i), participationId: foreign ? P2 : P });
  });
  const page = (r: Req, offset: string) => r.method === "GET" && r.path === LIST && r.url.searchParams.get("offset") === offset;

  test("pages with limit=100 and expected offsets, retains only the current participation and never shows the creator-wide total or foreign rows", async () => {
    const w = new World(); w.proposals = many(250, 2); await open(w); await waitFor(() => expect(w.count("GET", /action-proposals$/)).toBeGreaterThanOrEqual(3)); await settle();
    const pages = w.requests.filter((r) => r.method === "GET" && r.path === LIST).map((r) => [r.url.searchParams.get("limit"), r.url.searchParams.get("offset")]);
    expect(pages.slice(0, 3)).toEqual([["100", "0"], ["100", "100"], ["100", "200"]]);
    expect(text()).not.toMatch(/Foreign Seller|\b250\b/);
  });

  test("a valid owner with only foreign-participation proposals sees the empty list after all pages load", async () => {
    const w = new World(); w.proposals = many(120).map((p) => ({ ...p, participationId: P2 })); await open(w); await waitFor(() => expect(w.count("GET", /action-proposals$/)).toBeGreaterThanOrEqual(2)); await settle();
    expect(text()).toMatch(/no proposals|no (saved )?proposals yet|empty/i); expect(text()).not.toMatch(/Foreign|\b120\b/);
  });

  test("a list shift during pagination restarts once and then succeeds", async () => {
    const w = new World(); w.proposals = many(150); let shifted = false;
    w.on((r) => { if (page(r, "100") && !shifted) { shifted = true; w.proposals.push({ ...many(1)[0], id: uid(0x9ff) }); } return undefined; });
    await open(w); await waitFor(() => expect(w.count("GET", /action-proposals$/)).toBeGreaterThanOrEqual(4)); await settle(); expect(text()).not.toMatch(/unavailable/i);
  });

  test.each<[string, (w: World) => void]>([
    ["page failure", (w) => w.on((r) => page(r, "100") ? problem(500, "internal_error") : undefined)],
    ["limit mismatch", (w) => w.on((r) => page(r, "100") ? json({ items: [], total: 150, limit: 50, offset: 100 }) : undefined)],
    ["offset mismatch", (w) => w.on((r) => page(r, "100") ? json({ items: [], total: 150, limit: 100, offset: 0 }) : undefined)],
    ["short page", (w) => w.on((r) => page(r, "100") ? json({ items: [], total: 150, limit: 100, offset: 100 }) : undefined)],
    ["duplicate proposal id across pages", (w) => { w.proposals[120] = { ...w.proposals[120], id: w.proposals[0].id }; }],
    ["persistent total change", (w) => { let n = 0; w.on((r) => { if (page(r, "0")) w.proposals.push({ ...many(1)[0], id: uid(0xa00 + n++) }); return undefined; }); }],
    ["more than 10,000 proposals", (w) => w.on((r) => r.method === "GET" && r.path === LIST ? json({ items: [], total: 10001, limit: 100, offset: Number(r.url.searchParams.get("offset")) }) : undefined)],
  ])("%s discards all partial data, shows a generic unavailable state and disables mutations", async (_n, script) => {
    const w = new World(); w.proposals = many(150); script(w); await open(w); await waitFor(() => expect(text()).toMatch(/unavailable|could not be completed/i)); await settle();
    expect(text()).not.toMatch(/Invented Printer/); expect(controls()).toEqual(NONE); expect(text()).not.toMatch(/SECRET-|10,?001/);
  });
});

describe("AC03 authorization and error mapping", () => {
  test.each<[number, string, RegExp]>([[401, "unauthenticated", /sign in/i], [403, "forbidden", /not permitted/i], [403, "password_change_required", /not permitted/i], [404, "not_found", /unavailable/i]])(
    "list %s %s shows a fixed message and clears private state", async (status, code, message) => {
      const w = new World(); w.proposals = [defaultProp()]; w.on((r) => r.method === "GET" && r.path === LIST ? problem(status, code) : undefined); await open(w);
      await waitFor(() => expect(text()).toMatch(message)); expect(text()).not.toMatch(/SECRET-|Invented Printer|Flyer Pack/); expect(controls()).toEqual(NONE);
    });

  test.each<[number, string | undefined, RegExp]>([[403, "forbidden", /not permitted/i], [404, "not_found", /unavailable/i], [409, "revision_conflict", /reload|review|changed/i], [422, "validation_error", /cannot be accepted/i],
    [429, "quota_exceeded", /later|limit/i], [503, "service_unavailable", /temporarily unavailable|reload/i], [500, "internal_error", /could not be completed/i], [405, "method_not_allowed", /could not be completed/i],
    [409, "mystery_code", /could not be completed/i], [403, "not_found", /could not be completed/i], [500, undefined, /could not be completed/i]])(
    "approval response %s %s maps to fixed text and never renders server prose", async (status, code, message) => {
      const w = new World(); w.proposals = [defaultProp()]; w.on((r) => r.method === "POST" && /approvals$/.test(r.path) ? problem(status, code) : undefined);
      await open(w); const user = userEvent.setup(); await review(user); const logs = (["log", "info", "warn", "error"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
      await approve(user); await waitFor(() => expect(text()).toMatch(message)); expect(text()).not.toMatch(/SECRET-/); logs.forEach((s) => expect(JSON.stringify(s.mock.calls)).not.toMatch(/SECRET-/));
      if (status === 403 && code === "forbidden") expect(text()).not.toMatch(/Invented Printer|Flyer Pack/);
    });

  test("a non-JSON error body is a generic failure and is not rendered", async () => {
    const w = new World(); w.proposals = [defaultProp()]; w.on((r) => r.method === "POST" && /approvals$/.test(r.path) ? new Response("<html>SECRET-HTML</html>", { status: 502 }) : undefined);
    await open(w); const user = userEvent.setup(); await review(user); await approve(user); await waitFor(() => expect(text()).toMatch(/could not be completed/i)); expect(text()).not.toMatch(/SECRET-HTML/);
  });

  test.each([null, "attendee", "organiser"] as const)("role %s never triggers private proposal requests", async (role) => {
    const w = new World(); w.install(); auth.current = role ? actor(role) : null; await renderPrototype(ROUTE); await settle();
    expect(window.location.pathname).toBe("/login");
    expect(w.requests.filter((r) => /action-proposals|supplier-shortlist/.test(r.path))).toEqual([]); expect(text()).not.toMatch(/Invented Printer/);
  });
});

describe("AC06 privacy, egress, state clearing and accessibility", () => {
  test("every request stays on the EventApp origin, credentialed, JSON, with no external network or beacon", async () => {
    const w = new World(); w.proposals = [readyProp()]; const opened = vi.spyOn(window, "open").mockImplementation(() => null); const beacon = vi.fn(); Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: beacon });
    await open(w); const user = userEvent.setup(); await review(user); await simulate(user); await waitFor(() => expect(text()).toMatch(/simulated/i));
    expect(w.requests.every((r) => r.url.origin === location.origin && r.path.startsWith("/api/v1/"))).toBe(true); expect(opened).not.toHaveBeenCalled(); expect(beacon).not.toHaveBeenCalled();
    expect(w.requests.every((r) => r.credentials !== "omit")).toBe(true); expect(w.requests.filter((r) => r.method === "POST").every((r) => /json/i.test(r.headers.get("Content-Type") ?? ""))).toBe(true);
    document.querySelectorAll("a[href^='http']").forEach((a) => expect(a.getAttribute("rel") ?? "").toMatch(/noopener|noreferrer/));
  });

  test("a bfcache restore clears entered quotation text", async () => {
    const w = new World(); await open(w); const user = userEvent.setup(); await user.click(await screen.findByRole("radio", { name: /quotation/i })); await user.click(await screen.findByRole("checkbox", { name: /Flyer Pack A/ }));
    await user.type(screen.getByLabelText(/request text|message|details/i), "PRIVATE-QUOTE-TEXT");
    const event = new Event("pageshow"); Object.defineProperty(event, "persisted", { value: true }); act(() => { window.dispatchEvent(event); });
    await waitFor(() => expect(text()).not.toContain("PRIVATE-QUOTE-TEXT")); expect((screen.queryByLabelText(/request text|message|details/i) as HTMLInputElement | null)?.value ?? "").toBe("");
  });

  test("a 401 on a mutation clears private rows and quote text", async () => {
    const w = new World(); w.proposals = [prop([rev([item(O1, "1250")], { actionType: "quotation_request", recipientEmail: "a@example.test", requestText: "PRIVATE-QUOTE-TEXT" })])];
    w.on((r) => r.method === "POST" ? problem(401, "unauthenticated") : undefined); await open(w); const user = userEvent.setup(); await review(user, /PRIVATE-QUOTE-TEXT/); await approve(user);
    await waitFor(() => expect(text()).toMatch(/sign in/i)); expect(text()).not.toMatch(/PRIVATE-QUOTE-TEXT|Invented Printer|a@example.test/);
  });

  test("status is announced as text, controls and fields are named, items are in a semantic table and focus is managed after errors", async () => {
    const w = new World(); w.proposals = [defaultProp()]; w.on((r) => r.method === "POST" && /approvals$/.test(r.path) ? problem(409, "revision_conflict") : undefined);
    await open(w); const user = userEvent.setup(); await review(user);
    expect(screen.getAllByRole("table").length).toBeGreaterThan(0); expect(screen.getAllByRole("columnheader").length).toBeGreaterThan(1);
    document.querySelectorAll("input,select,textarea,button").forEach((el) => { const e = el as HTMLInputElement; expect(e.labels?.length || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.textContent?.trim()).toBeTruthy(); });
    buttons(APPROVE).find(live)!.focus(); await user.keyboard("{Enter}"); await confirmIfAsked(user);
    const alert = await screen.findByRole("alert"); expect(alert.textContent).toMatch(/changed|reload|review/i);
    await waitFor(() => expect(document.activeElement).not.toBe(document.body));
  });
});