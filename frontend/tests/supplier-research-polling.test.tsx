// Developer-owned regression for automatic supplier research job status checks (outside the protected baseline).
// The fake server is a trimmed copy of the supplier-research acceptance fixture.
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { renderPrototype } from "./helpers/renderPrototype";
import { applications, draft, B1, E1 } from "./fixtures/applications";

const P="88888888-8888-4888-8888-888888888888",S="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",O="cccccccc-cccc-4ccc-8ccc-cccccccccccc",J="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",R="dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const route=`/business/supplier-research?businessId=${B1}&eventId=${E1}&participationId=${P}`;
const base=`/api/v1/business/participations/${P}`,list=base+"/supplier-research",shortlist=base+"/supplier-shortlist",jobpath=`/api/v1/ai/jobs/${J}`;
const time="2026-10-22T01:00:00Z";
function snapshot(){return {id:S,participationId:P,revision:1,createdAt:time,status:"complete",request:{category:"printing",brief:"PRIVATE-RESEARCH-BRIEF",quantity:100,deliveryArea:"Singapore East",neededBy:"2027-01-01"},sources:[{sourceId:R,searchResultUrl:"https://supplier.example.test/product",requestedUrl:"https://supplier.example.test/product",finalUrl:"https://supplier.example.test/product",provider:"tavily_page_fetch",retrievedAt:time,isStale:false,excerpt:"Invented Printer Flyer Pack SGD2.05 per10. Delivery3days"}],offers:[{id:O,supplierName:"Invented Printer",productDescription:"Flyer Pack <script>execute()</script>",evidenceByField:["supplierName","productDescription","listedPrice.amountMinorUnits","listedPrice.currency","listedPrice.unitLabel","listedPrice.quantityBasis","deliveryEstimate"].map(field=>({field,sourceId:R,evidenceQuote:"Invented Printer Flyer Pack SGD2.05 per10. Delivery3days",sourceLocator:null})),listedPrice:{amountMinorUnits:"205",currency:"SGD",unitLabel:"pack",quantityBasis:"10"},estimatedItemSubtotalMinorUnits:"2050",estimatedCurrency:"SGD",deliveryEstimate:"3 days",minimumOrderQuantity:null,availability:null,unknownFields:[{field:"shipping",reason:"Not stated"},{field:"tax",reason:"Not stated"}],qualifications:["Observed listing; not quotation"]}],sourceFailures:[],isStale:false};}
function install(){
 applications.install();applications.records=[draft()];const fallback=globalThis.fetch;const value=snapshot();let state="none";const jobReads:string[]=[];
 const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
 const job=()=>({id:J,eventId:E1,participationId:P,state,createdAt:time,updatedAt:time,completedAt:["completed","failed"].includes(state)?time:null,failureCode:state==="failed"?"provider_unavailable":null,providerMayHaveRun:state!=="pending",snapshot:state==="completed"?value:null});
 vi.stubGlobal("fetch",vi.fn(async(input:string|URL|Request,init?:RequestInit)=>{
  const path=new URL(typeof input==="object"&&"url" in input?input.url:String(input),location.origin).pathname,method=init?.method??"GET";
  if(path===list&&method==="POST"){state="pending";return json(job(),202);}
  if(path===list){const done=state==="completed";return json({items:done?[value]:[],total:done?1:0,limit:20,offset:0,latestJob:state==="none"?null:job()});}
  if(path===shortlist)return json({id:null,participationId:P,revision:1,createdAt:null,updatedAt:null,selectedOffers:[]});
  if(path===jobpath){jobReads.push(state);return json(job());}
  return fallback(input,init);
 }));
 return {setState:(next:string)=>{state=next;},jobReads};
}

test("an active supplier research job is checked automatically and announces completion without pressing Refresh",async()=>{
 const server=install();
 await renderPrototype(route);await screen.findByRole("button",{name:/^research suppliers$/i});
 fireEvent.change(screen.getByLabelText(/^research brief$/i),{target:{value:"A6 price cards"}});
 fireEvent.change(screen.getByLabelText(/^quantity$/i),{target:{value:"100"}});
 fireEvent.change(screen.getByLabelText(/^delivery area$/i),{target:{value:"Central Singapore"}});
 await userEvent.setup().click(screen.getByRole("button",{name:/^research suppliers$/i}));
 expect(await screen.findByText(/checking automatically/i)).toBeVisible();
 expect(document.querySelector(".MuiCircularProgress-root")).not.toBeNull(); // decorative; the status text is announced
 server.setState("running");
 await vi.waitFor(()=>expect(server.jobReads).toContain("running"),{timeout:5000});
 server.setState("completed");
 expect(await screen.findByText("Your supplier comparison is ready.",{},{timeout:8000})).toBeVisible();
 expect((await screen.findAllByText(/Invented Printer/)).length).toBeGreaterThan(0);
 expect(document.querySelector(".MuiCircularProgress-root")).toBeNull();
 const reads=server.jobReads.length;
 await new Promise(resolve=>setTimeout(resolve,3500));
 expect(server.jobReads).toHaveLength(reads); // polling stops once the job is terminal
},30000);
