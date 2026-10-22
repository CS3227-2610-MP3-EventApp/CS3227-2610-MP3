import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { renderPrototype, storedValues } from "./helpers/renderPrototype";
import { applications, draft, B1, E1, E2, A2 } from "./fixtures/applications";
import { auth } from "./fixtures/auth";

const participation = draft().participationId;
const route = `/business/preparation?businessId=${B1}&eventId=${E1}&participationId=${participation}`;
const endpoint = `/api/v1/business/participations/${participation}/preparation`;
const otherParticipation = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
function fixture(lines: Record<string, unknown>[] = []) {
  return { participationId: participation, revision: 2,
    tasks: [{ id: "99999999-9999-4999-8999-999999999999", title: "PRIVATE-PREPARATION-MARKER", status: "not_started", dueDate: null }],
    budget: { currency: "SGD", lines, totalMinorUnits: "0" as string | null, knownSubtotalMinorUnits: "0", isComplete: true } };
}
function install(value = fixture(), mode: "normal" | "lost" | "mismatch" | "error" = "normal") {
  applications.install(); applications.records = [draft()];
  const fallback = globalThis.fetch;
  const writes: Record<string, unknown>[] = [];
  let reads = 0;
  let failGet = false;
  let hold: Promise<void> | undefined;
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === "object" && "url" in input ? input.url : String(input), window.location.origin);
    if (url.pathname === `/api/v1/business/participations/${otherParticipation}/preparation`) {
      const other=fixture(); other.participationId=otherParticipation; other.tasks[0].title="OTHER-PARTICIPATION-TASK";
      return new Response(JSON.stringify(other),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
    }
    if (url.pathname !== endpoint) return fallback(input, init);
    const pending = hold;
    if ((init?.method ?? "GET") === "GET") {
      reads++;
      if (failGet) {failGet=false; return new Response(JSON.stringify({code:"service_unavailable"}),{status:503,headers:{"Content-Type":"application/problem+json"}});}
    }
    else {
      const body = JSON.parse(String(init?.body)); writes.push(body);
      if (mode === "error") return new Response(JSON.stringify({code:"validation_error",detail:"<script>PRIVATE-SERVER-EXCEPTION</script>",fieldErrors:[{field:"tasks",code:"invalid"}]}),{status:422,headers:{"Content-Type":"application/problem+json"}});
      value = { ...value, revision: value.revision + 1, tasks: body.tasks.map((task: Record<string, unknown>,n:number) => ({...task,id:task.id ?? `bbbbbbbb-bbbb-4bbb-8bbb-${String(n).padStart(12,"0")}`})), budget: { ...value.budget, ...body.budget } };
      if (mode === "mismatch") value.tasks[0].title = "OTHER-AUTHORITATIVE-EDIT";
      if ((mode === "lost" || mode === "mismatch") && writes.length === 1) throw new TypeError("Synthetic lost response");
    }
    const snapshot = JSON.stringify(value);
    if (pending) await pending;
    return new Response(snapshot,{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
  }));
  return { writes, reads: () => reads, failNextGet: () => {failGet=true;}, hold: () => { let release!: () => void; hold=new Promise<void>(resolve => {release=resolve;}); return () => {hold=undefined;release();}; } };
}
async function open() {
  await renderPrototype(route);
  await screen.findByRole("heading", { name: /preparation/i, level: 1 });
  await screen.findByDisplayValue("PRIVATE-PREPARATION-MARKER");
}
function privateStorage() { return storedValues(localStorage) + storedValues(sessionStorage) + JSON.stringify(history.state) + location.href; }

test("AC01/09 owned application selects preparation; labelled edit saves and never stores private input", async () => {
  const server = install(); await open();
  const title = screen.getByLabelText(/^task title$/i);
  fireEvent.change(title,{target:{value:"PRIVATE-EDITED-TASK"}});
  await userEvent.setup().click(screen.getByRole("button",{name:/^save preparation$/i}));
  await waitFor(() => expect(server.writes).toHaveLength(1));
  expect(server.writes[0]).toMatchObject({expectedRevision:2,tasks:[{title:"PRIVATE-EDITED-TASK"}]});
  expect(privateStorage()).not.toContain("PRIVATE-EDITED-TASK");
  expect(privateStorage()).not.toContain("PRIVATE-PREPARATION-MARKER");
});

test("AC02 exact huge currency totals render without floating point loss", async () => {
  const value = fixture(Array.from({length:200}, (_,n) => ({ id:`aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12,"0")}`,description:"Maximum",quantity:1000000,unitPriceMinorUnits:100000000000,priceBasis:"estimate",quotationBasis:null })));
  value.budget.totalMinorUnits = "20000000000000000000";
  value.budget.knownSubtotalMinorUnits = "20000000000000000000";
  install(value); await open();
  expect(document.body.textContent?.replaceAll(",", "")).toMatch(/200000000000000000\.00/);
  expect(document.body).toHaveTextContent(/SGD/);
  expect(screen.getAllByLabelText(/^quantity$/i)[0]).toHaveValue(1000000);
  expect(screen.getAllByLabelText(/^unit price/i)[0]).toHaveValue(1000000000);
});

test("AC02 odd huge totals and item amounts retain the final cent", async () => {
  const value = fixture([{id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",description:"Odd huge line",quantity:999999,unitPriceMinorUnits:99999999999,priceBasis:"estimate",quotationBasis:null}]);
  value.budget.totalMinorUnits = "99999899999000001";
  value.budget.knownSubtotalMinorUnits = "99999899999000001";
  install(value); await open();
  const row=screen.getByDisplayValue("Odd huge line").closest("fieldset, tr, [role=group], [role=row]");
  expect(row).not.toBeNull();
  expect(row?.textContent?.replaceAll(",", "")).toMatch(/999998999990000\.01/);
  expect(document.body.textContent?.replaceAll(",", "")).toMatch(/999998999990000\.01/);
});

test("AC03 unknown price visibly marks incomplete total rather than complete zero", async () => {
  const value = fixture([{id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",description:"Unknown material",quantity:1,unitPriceMinorUnits:null,priceBasis:"unknown",quotationBasis:null}]);
  value.budget.totalMinorUnits = null; value.budget.isComplete = false;
  install(value); await open();
  expect(document.body).toHaveTextContent(/incomplete|unknown/i);
});

test("AC09 uncertain save reloads authoritative same-scope state without replay", async () => {
  const server = install(fixture(),"lost"); await open();
  await userEvent.setup().click(screen.getByRole("button",{name:/^add task$/i}));
  fireEvent.change(screen.getAllByLabelText(/^task title$/i).at(-1)!,{target:{value:"NEW-CANONICAL-TASK"}});
  fireEvent.change(screen.getAllByLabelText(/^task title$/i)[0],{target:{value:"PRIVATE-LOST-RESPONSE"}});
  await userEvent.setup().click(screen.getByRole("button",{name:/^save preparation$/i}));
  await waitFor(() => expect(server.reads()).toBeGreaterThanOrEqual(2));
  expect(server.writes).toHaveLength(1);
  expect(await screen.findByDisplayValue("PRIVATE-LOST-RESPONSE")).toBeVisible();
  expect(privateStorage()).not.toContain("PRIVATE-LOST-RESPONSE");
  fireEvent.change(screen.getAllByLabelText(/^task title$/i)[0],{target:{value:"SECOND-SAVE"}});
  await userEvent.setup().click(screen.getByRole("button",{name:/^save preparation$/i}));
  await waitFor(() => expect(server.writes).toHaveLength(2));
  expect(server.writes[1]).toMatchObject({expectedRevision:3,tasks:[{title:"SECOND-SAVE"},{id:"bbbbbbbb-bbbb-4bbb-8bbb-000000000001",title:"NEW-CANONICAL-TASK"}]});
});

test("AC09 uncertain mismatching authoritative state never blindly replays", async () => {
  const server = install(fixture(),"mismatch"); await open();
  fireEvent.change(screen.getByLabelText(/^task title$/i),{target:{value:"PRIVATE-LOCAL-EDIT"}});
  await userEvent.setup().click(screen.getByRole("button",{name:/^save preparation$/i}));
  await waitFor(() => expect(server.reads()).toBeGreaterThanOrEqual(2));
  expect(await screen.findByText(/reconcile|changed.*review|review.*changed|conflict/i)).toBeVisible();
  expect(server.writes).toHaveLength(1);
});

test("AC09 confirmed identity loss purges draft and ignores late private response", async () => {
  const server=install(); await open();
  fireEvent.change(screen.getByLabelText(/^task title$/i),{target:{value:"PRIVATE-DEPARTED-DRAFT"}});
  const release=server.hold();
  await act(async () => {window.dispatchEvent(new Event("focus"));});
  await waitFor(() => expect(server.reads()).toBeGreaterThanOrEqual(2));
  auth.current=null;
  await act(async () => {window.dispatchEvent(new Event("pageshow"));});
  await waitFor(() => expect(screen.queryByDisplayValue("PRIVATE-DEPARTED-DRAFT")).not.toBeInTheDocument());
  await act(async () => {release();});
  expect(screen.queryByDisplayValue("PRIVATE-PREPARATION-MARKER")).not.toBeInTheDocument();
  expect(screen.queryByDisplayValue("PRIVATE-DEPARTED-DRAFT")).not.toBeInTheDocument();
  expect(privateStorage()).not.toContain("PRIVATE-DEPARTED-DRAFT");
});

test("AC09 switching participation ignores an earlier held private response", async () => {
  const server=install();
  applications.records.push(draft({id:A2,eventId:E2,eventTitle:"Synthetic Winter Market",participationId:otherParticipation}));
  await open();
  const release=server.hold();
  await act(async () => {window.dispatchEvent(new Event("focus"));});
  await waitFor(() => expect(server.reads()).toBeGreaterThanOrEqual(2));
  await act(async () => {
    history.pushState({},"",`/business/preparation?businessId=${B1}&eventId=${E2}&participationId=${otherParticipation}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  expect(await screen.findByDisplayValue("OTHER-PARTICIPATION-TASK")).toBeVisible();
  await act(async () => {release();});
  expect(screen.queryByDisplayValue("PRIVATE-PREPARATION-MARKER")).not.toBeInTheDocument();
  expect(screen.getByDisplayValue("OTHER-PARTICIPATION-TASK")).toBeVisible();
});

test("AC09 recoverable validation retains editable input and hides arbitrary server details", async () => {
  const server = install(fixture(),"error"); await open();
  fireEvent.change(screen.getByLabelText(/^task title$/i),{target:{value:"PRIVATE-INVALID-DRAFT"}});
  await userEvent.setup().click(screen.getByRole("button",{name:/^save preparation$/i}));
  await waitFor(() => expect(server.writes).toHaveLength(1));
  expect(await screen.findByText(/check.*task|task.*invalid|review.*field|check.*field|could not.*save|correct.*field/i)).toBeVisible();
  expect(screen.getByLabelText(/^task title$/i)).toHaveValue("PRIVATE-INVALID-DRAFT");
  expect(document.body).not.toHaveTextContent("PRIVATE-SERVER-EXCEPTION");
});

test.each(["focus","pageshow"])("AC09 same-scope %s authority remount preserves unsaved draft in memory", async (event) => {
  install(); await open();
  fireEvent.change(screen.getByLabelText(/^task title$/i),{target:{value:"PRIVATE-SAME-SCOPE-DRAFT"}});
  const release=applications.hold("/api/v1/auth/me");
  await act(async () => {window.dispatchEvent(new Event(event));});
  await waitFor(() => expect(screen.queryByDisplayValue("PRIVATE-SAME-SCOPE-DRAFT")).not.toBeInTheDocument());
  await act(async () => {release();});
  expect(await screen.findByDisplayValue("PRIVATE-SAME-SCOPE-DRAFT")).toBeVisible();
  expect(privateStorage()).not.toContain("PRIVATE-SAME-SCOPE-DRAFT");
});

test("AC09 failed local reload conceals cached private editor and offers retry", async () => {
  const server=install(fixture(),"mismatch"); await open();
  fireEvent.change(screen.getByLabelText(/^task title$/i),{target:{value:"PRIVATE-RELOAD-DRAFT"}});
  await userEvent.setup().click(screen.getByRole("button",{name:/^save preparation$/i}));
  const reload=await screen.findByRole("button",{name:/reload latest preparation/i});
  server.failNextGet();
  await userEvent.setup().click(reload);
  expect(await screen.findByRole("alert")).toHaveTextContent(/could not|unavailable|check|retry/i);
  expect(screen.queryByDisplayValue("PRIVATE-RELOAD-DRAFT")).not.toBeInTheDocument();
  expect(screen.queryByDisplayValue("PRIVATE-PREPARATION-MARKER")).not.toBeInTheDocument();
  const retry=screen.getByRole("button",{name:/retry|try again|reload latest|check access/i});
  expect(retry).toBeEnabled();
  await userEvent.setup().click(retry);
  expect(await screen.findByLabelText(/^task title$/i)).toBeVisible();
});

test("AC09 late departed local authority response cannot clear or replace new context", async () => {
  install(fixture(),"mismatch");
  applications.records.push(draft({id:A2,eventId:E2,eventTitle:"Synthetic Winter Market",participationId:otherParticipation}));
  await open();
  fireEvent.change(screen.getByLabelText(/^task title$/i),{target:{value:"TRIGGER-CONFLICT"}});
  await userEvent.setup().click(screen.getByRole("button",{name:/^save preparation$/i}));
  const reload=await screen.findByRole("button",{name:/reload latest preparation/i});
  const stale={...auth.current!,id:"dddddddd-dddd-4ddd-8ddd-dddddddddddd"};
  const release=applications.hold("/api/v1/auth/me","GET",{value:stale});
  const before=applications.requests.filter(r=>r.path === "/api/v1/auth/me").length;
  await userEvent.setup().click(reload);
  await waitFor(() => expect(applications.requests.filter(r=>r.path === "/api/v1/auth/me").length).toBeGreaterThan(before));
  await act(async () => {history.pushState({},"",`/business/preparation?businessId=${B1}&eventId=${E2}&participationId=${otherParticipation}`);window.dispatchEvent(new PopStateEvent("popstate"));});
  expect(await screen.findByDisplayValue("OTHER-PARTICIPATION-TASK")).toBeVisible();
  fireEvent.change(screen.getByLabelText(/^task title$/i),{target:{value:"NEW-SCOPE-PRIVATE-DRAFT"}});
  await act(async () => {release();});
  expect(screen.getByDisplayValue("NEW-SCOPE-PRIVATE-DRAFT")).toBeVisible();
  expect(screen.queryByDisplayValue("TRIGGER-CONFLICT")).not.toBeInTheDocument();
});

test("AC09 malformed server known-price unknown-basis document is rejected before display", async () => {
  const value=fixture([{id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",description:"MALFORMED-PRICE-BASIS",quantity:1,unitPriceMinorUnits:100,priceBasis:"unknown",quotationBasis:null}]);
  value.budget.knownSubtotalMinorUnits="100";value.budget.totalMinorUnits="100";
  install(value); await renderPrototype(route);
  expect(await screen.findByRole("alert")).toHaveTextContent(/could not|invalid|unavailable/i);
  expect(screen.queryByDisplayValue("MALFORMED-PRICE-BASIS")).not.toBeInTheDocument();
});
