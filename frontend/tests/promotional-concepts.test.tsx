import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { renderPrototype, storedValues } from "./helpers/renderPrototype";
import { applications, draft, B1, E1 } from "./fixtures/applications";

// Independently specified F09 r3 wire records. No app validators/components imported.
const P="88888888-8888-4888-8888-888888888888", C="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", J="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const route=`/business/promotional-concepts?businessId=${B1}&eventId=${E1}&participationId=${P}`;
const base=`/api/v1/business/participations/${P}`, list=`${base}/promotional-concepts`, detail=`/api/v1/business/promotional-concepts/${C}`, jobPath=`/api/v1/ai/jobs/${J}`;
const stamp="2026-10-22T01:00:00Z";
function canonical(){return {id:C,participationId:P,revision:1,sourceRevisions:{event:1,setup:null},factFields:["event.title"],sourceFacts:[{field:"event.title",value:"Synthetic Autumn Fair",observedRevision:1,currentRevision:1,status:"current"}],posterCopySuggestions:["PRIVATE-COPY <script>execute()</script> https://example.test"],freebieConcepts:[{name:"PRIVATE-FREEBIE",description:"Invented creative sticker"}],layoutBrief:"PRIVATE-LAYOUT",createdAt:stamp,updatedAt:stamp};}
function install(options:{empty?:boolean;state?:string;unavailable?:boolean;saveFails?:boolean}={}){
  applications.install();applications.records=[draft()];const fallback=globalThis.fetch;
  let value=canonical(),exists=!options.empty,state=options.state??"completed";
  if(options.unavailable)value.sourceFacts=[{field:"event.title",value:null as unknown as string,observedRevision:1,currentRevision:null as unknown as number,status:"unavailable"}];
  const calls:{path:string;method:string;body:Record<string,unknown>;search:string}[]=[];
  const json=(body:unknown,status=200)=>new Response(status===204?null:JSON.stringify(body),{status,headers:{"Content-Type":status>=400?"application/problem+json":"application/json","Cache-Control":"no-store"}});
  const job=()=>({id:J,eventId:E1,participationId:P,state,createdAt:stamp,updatedAt:stamp,completedAt:state==="pending"?null:stamp,failureCode:state==="failed"?"provider_unavailable":null,providerMayHaveRun:state!=="pending",concept:state==="completed"&&exists?value:null});
  vi.stubGlobal("fetch",vi.fn(async(input:string|URL|Request,init?:RequestInit)=>{
    const url=new URL(typeof input==="object"&&"url" in input?input.url:String(input),location.origin);const path=url.pathname,method=init?.method??"GET",body=init?.body?JSON.parse(String(init.body)):{};
    if(![list,detail,jobPath,jobPath+"/cancel",base+"/setup"].includes(path))return fallback(input,init);
    calls.push({path,method,body,search:url.search});
    if(path===base+"/setup")return json({participationId:P,eventId:E1,revision:1,boothLabel:null,setupInstructions:null,updatedAt:null});
    if(path===list&&method==="POST"){state="pending";return json(job(),202);}
    if(path===list)return json({items:exists?[value]:[],total:exists?1:0,limit:20,offset:0,latestJob:options.empty?null:job()});
    if(path===jobPath+"/cancel"){state="cancelled";return json(job());}
    if(path===jobPath)return json(job());
    if(method==="DELETE"){exists=false;return json(null,204);}
    if(method==="PUT"){
      if(options.saveFails)return json({code:"revision_conflict",detail:"PRIVATE-RAW-PROVIDER"},409);
      value={...value,posterCopySuggestions:body.posterCopySuggestions,freebieConcepts:body.freebieConcepts,layoutBrief:body.layoutBrief,revision:value.revision+1};return json(value);
    }
    return exists?json(value):json({code:"not_found"},404);
  }));
  return {calls,value:()=>value,writes:()=>calls.filter(x=>x.method!=="GET")};
}
const user=()=>userEvent.setup();
async function open(){await renderPrototype(route);await screen.findByRole("button",{name:/^generate concepts$/i});}
const storage=()=>storedValues(localStorage)+storedValues(sessionStorage)+JSON.stringify(history.state)+location.href;

test("PCUI01 private concepts entry is reachable from business home",async()=>{
  install();await renderPrototype("/business");expect(await screen.findByRole("link",{name:/promotional concepts/i})).toHaveAttribute("href",expect.stringContaining("/business/promotional-concepts"));
});
test("PCUI02 unaccepted participation can generate after data disclosure with only selected facts",async()=>{
  const server=install({empty:true});await open();expect(document.body).toHaveTextContent(/AI provider/i);expect(document.body).toHaveTextContent(/brief/i);
  fireEvent.change(screen.getByLabelText(/^creative brief$/i),{target:{value:"PRIVATE-CREATIVE-BRIEF"}});
  await user().click(screen.getByRole("button",{name:/^generate concepts$/i}));
  await waitFor(()=>expect(server.writes()).toHaveLength(1));const call=server.writes()[0];
  expect(call).toMatchObject({path:list,method:"POST",body:{brief:"PRIVATE-CREATIVE-BRIEF",expectedEventRevision:1,expectedSetupRevision:null,dataSharingConfirmed:true}});
  expect(call.body.requestId).toMatch(/^[0-9a-f-]{36}$/i);expect(Array.isArray(call.body.factFields)).toBe(true);
  expect(Object.keys(call.body).sort()).toEqual(["requestId","brief","expectedEventRevision","expectedSetupRevision","factFields","dataSharingConfirmed"].sort());
  expect(storage()).not.toMatch(/PRIVATE-|bbbbbbbb-bbbb|aaaaaaaa-aaaa/);
});
test("PCUI03 creative text stays unverified and inert, while structured facts have separate provenance",async()=>{
  install();await open();await screen.findByDisplayValue(/PRIVATE-COPY/);
  expect(document.body).toHaveTextContent(/unverified|creative suggestion/i);expect(document.body).toHaveTextContent(/source|authoritative/i);
  expect(screen.queryByRole("link",{name:/example.test/i})).not.toBeInTheDocument();expect(document.querySelector("script")).toBeNull();
  expect(screen.getByLabelText(/^layout brief$/i)).toHaveValue("PRIVATE-LAYOUT");expect(storage()).not.toMatch(/PRIVATE-|bbbbbbbb-bbbb/);
});
test("PCUI04 saved copy edits use current revision and remain editable after rejected save",async()=>{
  const server=install({saveFails:true});await open();await screen.findByDisplayValue(/PRIVATE-COPY/);
  fireEvent.change(screen.getByLabelText(/^poster copy 1$/i),{target:{value:"PRIVATE-USER-EDIT"}});
  await user().click(screen.getByRole("button",{name:/^save draft$/i}));await waitFor(()=>expect(server.writes()).toHaveLength(1));
  expect(server.writes()[0]).toMatchObject({path:detail,method:"PUT",body:{expectedRevision:1,posterCopySuggestions:["PRIVATE-USER-EDIT"]}});
  expect(screen.getByLabelText(/^poster copy 1$/i)).toHaveValue("PRIVATE-USER-EDIT");expect(document.body).not.toHaveTextContent("PRIVATE-RAW-PROVIDER");expect(server.value().revision).toBe(1);
});
test("PCUI05 unavailable source never displays its former value and does not erase private prose",async()=>{
  install({unavailable:true});await open();await screen.findByDisplayValue(/PRIVATE-COPY/);expect(document.body).toHaveTextContent(/unavailable|unknown/i);
  expect(document.body).not.toHaveTextContent(/verified marketing|publish.ready/i);
});
test("PCUI06 cancellation preserves saved draft and exposes safe terminal feedback",async()=>{
  const server=install({state:"running"});await open();await user().click(await screen.findByRole("button",{name:/^cancel(?: job)?$/i}));
  await waitFor(()=>expect(server.writes()).toHaveLength(1));expect(server.writes()[0].path).toBe(jobPath+"/cancel");expect(await screen.findByText(/cancelled/i)).toBeVisible();expect(server.value().revision).toBe(1);
});


test("PCUI07 successful creative/freebie save survives remount and exact deletion removes it",async()=>{
  const server=install();const view=await renderPrototype(route);await screen.findByDisplayValue(/PRIVATE-COPY/);
  fireEvent.change(screen.getByLabelText(/^poster copy 1$/i),{target:{value:"PRIVATE-EDITED-COPY"}});
  fireEvent.change(screen.getByLabelText(/^freebie name 1$/i),{target:{value:"PRIVATE-EDITED-FREEBIE"}});
  fireEvent.change(screen.getByLabelText(/^freebie description 1$/i),{target:{value:"Edited invented concept"}});
  await user().click(screen.getByRole("button",{name:/^save draft$/i}));await waitFor(()=>expect(server.value().revision).toBe(2));
  expect(server.writes()[0].body).toEqual({expectedRevision:1,posterCopySuggestions:["PRIVATE-EDITED-COPY"],freebieConcepts:[{name:"PRIVATE-EDITED-FREEBIE",description:"Edited invented concept"}],layoutBrief:"PRIVATE-LAYOUT"});
  view.unmount();await open();await screen.findByDisplayValue("PRIVATE-EDITED-FREEBIE");expect(screen.getByLabelText(/^poster copy 1$/i)).toHaveValue("PRIVATE-EDITED-COPY");
  await user().click(screen.getByRole("button",{name:/^delete draft$/i}));
  const confirm=screen.queryByRole("button",{name:/^confirm delete$/i});if(confirm)await user().click(confirm);
  await waitFor(()=>expect(server.writes().some(x=>x.method==="DELETE")).toBe(true));
  expect(server.writes().find(x=>x.method==="DELETE")?.search).toBe("?expectedRevision=2");
  await waitFor(()=>expect(screen.queryByDisplayValue("PRIVATE-EDITED-COPY")).not.toBeInTheDocument());
});
