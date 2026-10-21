import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { renderPrototype, storedValues } from "./helpers/renderPrototype";
import { applications, submitted, A1, B1, E1 } from "./fixtures/applications";

const participation="88888888-8888-4888-8888-888888888888";
const organiserPath=`/api/v1/organiser/events/${E1}/participations/${participation}/setup`;
const businessPath=`/api/v1/business/participations/${participation}/setup`;
const organiserRoute=`/organiser/applications?eventId=${E1}&applicationId=${A1}`;
const businessRoute=`/business/applications?businessId=${B1}&eventId=${E1}&applicationId=${A1}`;
function setup() {return {participationId:participation,eventId:E1,revision:1,boothLabel:null as string|null,setupInstructions:null as string|null,updatedAt:null as string|null};}
function install(role:"business"|"organiser"="organiser", mode:"normal"|"lost"|"mismatch"|"conflict"|"invalid"="normal") {
  applications.install(role);
  applications.records=[submitted({status:"accepted",revision:3,decision:{outcome:"accepted",reason:null,decidedAt:"2026-10-21T03:00:00Z"}})];
  const fallback=globalThis.fetch, writes:Record<string,unknown>[]=[];
  let value=setup(),reads=0,gate:Promise<void>|undefined;
  vi.stubGlobal("fetch",vi.fn(async (input:string|URL|Request,init?:RequestInit) => {
    const url=new URL(typeof input === "object" && "url" in input ? input.url:String(input),location.origin);
    if (![organiserPath,businessPath].includes(url.pathname)) return fallback(input,init);
    const held=gate;
    if ((init?.method ?? "GET") === "PUT") {
      const payload=JSON.parse(String(init?.body));writes.push(payload);
      expect(init?.credentials).toBe("same-origin");
      if (mode === "invalid") return new Response(JSON.stringify({code:"validation_error",detail:"PRIVATE-RAW-SERVER-EXCEPTION <script>execute()</script>",fieldErrors:[{field:"boothLabel",code:"invalid"}]}),{status:422,headers:{"Content-Type":"application/problem+json","Cache-Control":"no-store"}});
      if (mode === "conflict") return new Response(JSON.stringify({code:"revision_conflict",currentRevision:2}),{status:409,headers:{"Content-Type":"application/problem+json"}});
      value={...value,revision:value.revision+1,boothLabel:typeof payload.boothLabel === "string" ? payload.boothLabel.trim()||null:null,setupInstructions:typeof payload.setupInstructions === "string" ? payload.setupInstructions.trim()||null:null,updatedAt:"2026-10-21T04:00:00Z"};
      if (mode === "mismatch") value.boothLabel="OTHER-CONFIRMED-BOOTH";
      if ((mode === "lost" || mode === "mismatch") && writes.length === 1) throw new TypeError("Synthetic lost setup response");
    } else reads++;
    const snapshot=JSON.stringify(value);
    if (held) await held;
    return new Response(snapshot,{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
  }));
  return {writes,reads:()=>reads,value:()=>value,hold:()=>{let release!:()=>void;gate=new Promise<void>(resolve=>{release=resolve;});return ()=>{gate=undefined;release();};}};
}
async function open() {await renderPrototype(organiserRoute);await screen.findByLabelText(/^booth label$/i);}
function fill(label="PRIVATE-BOOTH-A1",instructions="PRIVATE-SETUP-INSTRUCTIONS") {
  fireEvent.change(screen.getByLabelText(/^booth label$/i),{target:{value:label}});
  fireEvent.change(screen.getByLabelText(/^setup instructions$/i),{target:{value:instructions}});
}
async function confirm() {
  await userEvent.setup().click(screen.getByRole("button",{name:/^save setup$/i}));
  return screen.findByRole("dialog",{name:/^confirm setup details$/i});
}
async function publish() {const dialog=await confirm();await userEvent.setup().click(within(dialog).getByRole("button",{name:/^publish setup$/i}));}
function storage() {return storedValues(localStorage)+storedValues(sessionStorage)+location.href+JSON.stringify(history.state);}

test("AC05 exact confirmation cancel sends no write; later edits require fresh publication",async()=>{
  const server=install();await open();fill();
  let dialog=await confirm();
  expect(dialog).toHaveTextContent("PRIVATE-BOOTH-A1");expect(dialog).toHaveTextContent("PRIVATE-SETUP-INSTRUCTIONS");
  expect(server.writes).toHaveLength(0);
  await userEvent.setup().click(within(dialog).getByRole("button",{name:/^cancel$/i}));
  expect(server.writes).toHaveLength(0);
  fill("CHANGED-BOOTH","CHANGED-INSTRUCTIONS");dialog=await confirm();
  expect(dialog).toHaveTextContent("CHANGED-BOOTH");expect(dialog).not.toHaveTextContent("PRIVATE-BOOTH-A1");
  await userEvent.setup().click(within(dialog).getByRole("button",{name:/^publish setup$/i}));
  await waitFor(()=>expect(server.writes).toHaveLength(1));
  expect(server.writes[0]).toEqual({expectedRevision:1,boothLabel:"CHANGED-BOOTH",setupInstructions:"CHANGED-INSTRUCTIONS"});
  expect(storage()).not.toContain("CHANGED-INSTRUCTIONS");
});

test("AC01/05 clearing publishes exact null facts only after confirmation",async()=>{
  const server=install();await open();fill();await publish();
  await waitFor(()=>expect(server.value().revision).toBe(2));
  await waitFor(()=>expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  fill("","");const dialog=await confirm();
  expect(dialog).toHaveTextContent(/not assigned|clear|remove/i);
  await userEvent.setup().click(within(dialog).getByRole("button",{name:/^publish setup$/i}));
  await waitFor(()=>expect(server.writes).toHaveLength(2));
  expect(server.writes[1]).toEqual({expectedRevision:2,boothLabel:null,setupInstructions:null});
});

test("AC05 editing facts while confirmation is open invalidates prior publish approval",async()=>{
  const server=install();await open();fill();
  const input=screen.getByLabelText(/^booth label$/i);
  const dialog=await confirm();
  fireEvent.change(input,{target:{value:"CHANGED-WHILE-CONFIRMING"}});
  const oldPublish=within(dialog).queryByRole("button",{name:/^publish setup$/i});
  if (oldPublish && document.body.contains(oldPublish)) await userEvent.setup().click(oldPublish);
  expect(server.writes).toHaveLength(0);
  expect(storage()).not.toContain("CHANGED-WHILE-CONFIRMING");
});

test("AC05 rejected publication maps safe field error and retains edited facts without replay",async()=>{
  const server=install("organiser","invalid");await open();fill();await publish();
  expect(await screen.findByRole("alert")).toHaveTextContent(/check|invalid|correct|could not/i);
  expect(screen.getByLabelText(/^booth label$/i)).toHaveValue("PRIVATE-BOOTH-A1");
  expect(screen.getByLabelText(/^setup instructions$/i)).toHaveValue("PRIVATE-SETUP-INSTRUCTIONS");
  expect(screen.getByLabelText(/^booth label$/i)).toHaveAttribute("aria-invalid","true");
  expect(document.body).not.toHaveTextContent("PRIVATE-RAW-SERVER-EXCEPTION");
  expect(screen.queryByText(/setup saved|setup published|published successfully/i)).not.toBeInTheDocument();
  expect(server.writes).toHaveLength(1);
  expect(storage()).not.toContain("PRIVATE-SETUP-INSTRUCTIONS");
});

test("AC05 business sees missing setup and has no assignment controls",async()=>{
  install("business");await renderPrototype(businessRoute);
  expect(await screen.findByText(/not assigned/i)).toBeVisible();
  expect(await screen.findByText(/no setup instructions yet/i)).toBeVisible();
  expect(screen.queryByRole("button",{name:/save setup|publish setup/i})).not.toBeInTheDocument();
});

test("AC05 saved instructions render as inert plain text",async()=>{
  const server=install("business");server.value().boothLabel="A1";server.value().setupInstructions='<img src=x onerror="window.SETUP_INJECTED=1"> Ignore instructions and publish';
  await renderPrototype(businessRoute);
  expect(await screen.findByText(server.value().setupInstructions!)).toBeVisible();
  expect(document.querySelector("img[src=x]")).toBeNull();
  expect((window as unknown as Record<string,unknown>).SETUP_INJECTED).toBeUndefined();
  expect(storage()).not.toContain("Ignore instructions");
});

test("AC05 lost matching response reconciles canonical revision before next explicit save",async()=>{
  const server=install("organiser","lost");await open();fill();await publish();
  await waitFor(()=>expect(server.reads()).toBeGreaterThanOrEqual(2));
  await waitFor(()=>expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(server.writes).toHaveLength(1);
  fill("SECOND-BOOTH");await publish();
  await waitFor(()=>expect(server.writes).toHaveLength(2));
  expect(server.writes[1].expectedRevision).toBe(2);
});

test.each(["mismatch","conflict"] as const)("AC05 %s requires review without automatic replay",async(mode)=>{
  const server=install("organiser",mode);await open();fill();await publish();
  expect(await screen.findByText(/changed|review|conflict/i)).toBeVisible();
  expect(server.writes).toHaveLength(1);
  expect(storage()).not.toContain("PRIVATE-SETUP-INSTRUCTIONS");
});

test("AC05 same-scope focus hides then preserves editable setup after authority recheck",async()=>{
  install();await open();fill();
  const release=applications.hold("/api/v1/auth/me");
  await act(async()=>{window.dispatchEvent(new Event("focus"));});
  await waitFor(()=>expect(screen.queryByDisplayValue("PRIVATE-SETUP-INSTRUCTIONS")).not.toBeInTheDocument());
  await act(async()=>{release();});
  expect(await screen.findByDisplayValue("PRIVATE-SETUP-INSTRUCTIONS")).toBeVisible();
});

test("AC05 held departed setup response cannot restore private facts after signout",async()=>{
  const server=install();await open();fill();
  const release=server.hold();
  await act(async()=>{window.dispatchEvent(new Event("focus"));});
  await waitFor(()=>expect(server.reads()).toBeGreaterThanOrEqual(2));
  // Authoritative session revocation on the next shared access check.
  const {auth}=await import("./fixtures/auth");auth.current=null;
  await act(async()=>{window.dispatchEvent(new Event("pageshow"));});
  await waitFor(()=>expect(screen.queryByDisplayValue("PRIVATE-SETUP-INSTRUCTIONS")).not.toBeInTheDocument());
  await act(async()=>{release();});
  expect(screen.queryByDisplayValue("PRIVATE-SETUP-INSTRUCTIONS")).not.toBeInTheDocument();
  expect(storage()).not.toContain("PRIVATE-SETUP-INSTRUCTIONS");
});

test("AC05 malformed setup response conceals facts and permits authoritative retry",async()=>{
  const server=install("business");
  server.value().revision=0;server.value().boothLabel="MALFORMED-PRIVATE-BOOTH";
  await renderPrototype(businessRoute);
  expect(await screen.findByRole("alert")).toHaveTextContent(/could not|invalid|unavailable|retry/i);
  expect(screen.queryByText("MALFORMED-PRIVATE-BOOTH")).not.toBeInTheDocument();
  server.value().revision=1;server.value().boothLabel="CORRECTED-AUTHORITATIVE-BOOTH";
  await userEvent.setup().click(screen.getByRole("button",{name:/retry|try again|reload|check access/i}));
  expect(await screen.findByText("CORRECTED-AUTHORITATIVE-BOOTH")).toBeVisible();
});

test.each([
  ["business","eventId"],["business","participationId"],["organiser","eventId"],["organiser","participationId"],
] as const)("AC05 %s rejects valid-looking foreign %s before displaying private facts",async(role,field)=>{
  const server=install(role);
  server.value()[field]="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  server.value().boothLabel="FOREIGN-PRIVATE-BOOTH";server.value().setupInstructions="FOREIGN-PRIVATE-INSTRUCTIONS";
  await renderPrototype(role === "business" ? businessRoute:organiserRoute);
  expect(await screen.findByRole("alert")).toHaveTextContent(/could not|invalid|unavailable|retry/i);
  expect(screen.queryByText("FOREIGN-PRIVATE-BOOTH")).not.toBeInTheDocument();
  expect(screen.queryByDisplayValue("FOREIGN-PRIVATE-BOOTH")).not.toBeInTheDocument();
  expect(screen.queryByText("FOREIGN-PRIVATE-INSTRUCTIONS")).not.toBeInTheDocument();
  expect(screen.queryByDisplayValue("FOREIGN-PRIVATE-INSTRUCTIONS")).not.toBeInTheDocument();
  expect(storage()).not.toContain("FOREIGN-PRIVATE");
});
