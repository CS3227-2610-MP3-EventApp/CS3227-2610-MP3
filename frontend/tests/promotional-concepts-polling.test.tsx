// Developer-owned regression for automatic promotional job status checks (outside the protected baseline).
// The fake server is a trimmed copy of the promotional-concepts acceptance fixture.
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { renderPrototype } from "./helpers/renderPrototype";
import { applications, draft, B1, E1 } from "./fixtures/applications";

const P="88888888-8888-4888-8888-888888888888", C="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", J="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const route=`/business/promotional-concepts?businessId=${B1}&eventId=${E1}&participationId=${P}`;
const base=`/api/v1/business/participations/${P}`, list=`${base}/promotional-concepts`, jobPath=`/api/v1/ai/jobs/${J}`;
const stamp="2026-10-22T01:00:00Z";
function canonical(){return {id:C,participationId:P,revision:1,sourceRevisions:{event:1,setup:null},factFields:["event.title"],sourceFacts:[{field:"event.title",value:"Synthetic Autumn Fair",observedRevision:1,currentRevision:1,status:"current"}],posterCopySuggestions:["PRIVATE-COPY <script>execute()</script> https://example.test"],freebieConcepts:[{name:"PRIVATE-FREEBIE",description:"Invented creative sticker"}],layoutBrief:"PRIVATE-LAYOUT",createdAt:stamp,updatedAt:stamp};}
function install(){
  applications.install();applications.records=[draft()];const fallback=globalThis.fetch;
  const value=canonical();let state="none";const jobReads:string[]=[];
  const json=(b:unknown,status=200)=>new Response(JSON.stringify(b),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
  const job=()=>({id:J,eventId:E1,participationId:P,state,createdAt:stamp,updatedAt:stamp,completedAt:["completed","failed"].includes(state)?stamp:null,failureCode:state==="failed"?"provider_unavailable":null,providerMayHaveRun:state!=="pending",concept:state==="completed"?value:null});
  vi.stubGlobal("fetch",vi.fn(async(input:string|URL|Request,init?:RequestInit)=>{
    const path=new URL(typeof input==="object"&&"url" in input?input.url:String(input),location.origin).pathname,method=init?.method??"GET";
    if(path===base+"/setup")return json({participationId:P,eventId:E1,revision:1,boothLabel:null,setupInstructions:null,updatedAt:null});
    if(path===list&&method==="POST"){state="pending";return json(job(),202);}
    if(path===list){const done=state==="completed";return json({items:done?[value]:[],total:done?1:0,limit:20,offset:0,latestJob:state==="none"?null:job()});}
    if(path===jobPath){jobReads.push(state);return json(job());}
    return fallback(input,init);
  }));
  return {setState:(next:string)=>{state=next;},jobReads};
}

test("an active concept job is checked automatically and announces completion without pressing Refresh",async()=>{
  const server=install();
  await renderPrototype(route);await screen.findByRole("button",{name:/^generate concepts$/i});
  fireEvent.change(screen.getByLabelText(/^creative brief$/i),{target:{value:"Poster ideas"}});
  await userEvent.setup().click(screen.getByRole("button",{name:/^generate concepts$/i}));
  expect(await screen.findByText(/checking automatically/i)).toBeVisible();
  expect(document.querySelector(".MuiCircularProgress-root")).not.toBeNull(); // decorative; the status text is announced
  server.setState("running");
  await vi.waitFor(()=>expect(server.jobReads).toContain("running"),{timeout:5000});
  server.setState("completed");
  expect(await screen.findByText("Your promotional concepts are ready.",{},{timeout:8000})).toBeVisible();
  expect(screen.getByText(/concept generation completed/i)).toBeVisible();
  expect(document.querySelector(".MuiCircularProgress-root")).toBeNull();
  const reads=server.jobReads.length;
  await new Promise(resolve=>setTimeout(resolve,3500));
  expect(server.jobReads).toHaveLength(reads); // polling stops once the job is terminal
},30000);
