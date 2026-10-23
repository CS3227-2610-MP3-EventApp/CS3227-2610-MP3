import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { renderPrototype, storedValues } from "./helpers/renderPrototype";
import { applications, draft, B1, E1 } from "./fixtures/applications";

const P="88888888-8888-4888-8888-888888888888",S="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",O="cccccccc-cccc-4ccc-8ccc-cccccccccccc",J="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",R="dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const route=`/business/supplier-research?businessId=${B1}&eventId=${E1}&participationId=${P}`;
const base=`/api/v1/business/participations/${P}`,list=base+"/supplier-research",shortlist=base+"/supplier-shortlist",detail=`/api/v1/business/supplier-research/${S}`,jobpath=`/api/v1/ai/jobs/${J}`;
const time="2026-10-22T01:00:00Z";
function snapshot(){return {id:S,participationId:P,revision:1,createdAt:time,status:"complete",request:{category:"printing",brief:"PRIVATE-RESEARCH-BRIEF",quantity:100,deliveryArea:"Singapore East",neededBy:"2027-01-01"},sources:[{sourceId:R,searchResultUrl:"https://supplier.example.test/product",requestedUrl:"https://supplier.example.test/product",finalUrl:"https://supplier.example.test/product",provider:"tavily_page_fetch",retrievedAt:time,isStale:false,excerpt:"Invented Printer Flyer Pack SGD2.05 per10. Delivery3days"}],offers:[{id:O,supplierName:"Invented Printer",productDescription:"Flyer Pack <script>execute()</script>",evidenceByField:["supplierName","productDescription","listedPrice.amountMinorUnits","listedPrice.currency","listedPrice.unitLabel","listedPrice.quantityBasis","deliveryEstimate"].map(field=>({field,sourceId:R,evidenceQuote:"Invented Printer Flyer Pack SGD2.05 per10. Delivery3days",sourceLocator:null})),listedPrice:{amountMinorUnits:"205",currency:"SGD",unitLabel:"pack",quantityBasis:"10"},estimatedItemSubtotalMinorUnits:"2050",estimatedCurrency:"SGD",deliveryEstimate:"3 days",minimumOrderQuantity:null,availability:null,unknownFields:[{field:"shipping",reason:"Not stated"},{field:"tax",reason:"Not stated"}],qualifications:["Observed listing; not quotation"]}],sourceFailures:[],isStale:false};}
function install(options:{empty?:boolean;partial?:boolean;stale?:boolean;failed?:boolean;saveFails?:boolean}={}){
 applications.install();applications.records=[draft()];const fallback=globalThis.fetch;let exists=!options.empty;const value=snapshot();if(options.partial){value.status="partial";value.sourceFailures=[{sourceId:"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",code:"unsafe_destination",displayMessage:"A source was blocked"}] as never[];}if(options.stale){value.isStale=true;value.sources[0].isStale=true;}
 let selection:{id:string|null;participationId:string;revision:number;createdAt:string|null;updatedAt:string|null;selectedOffers:{snapshotId:string;offerId:string}[]}={id:null,participationId:P,revision:1,createdAt:null,updatedAt:null,selectedOffers:[]};let state=options.failed?"failed":"completed";
 const calls:{path:string;method:string;body:Record<string,unknown>;search:string}[]=[];
 const json=(body:unknown,status=200)=>new Response(status===204?null:JSON.stringify(body),{status,headers:{"Content-Type":status>=400?"application/problem+json":"application/json","Cache-Control":"no-store"}});
 const job=()=>({id:J,eventId:E1,participationId:P,state,createdAt:time,updatedAt:time,completedAt:time,failureCode:options.failed?"provider_unavailable":null,providerMayHaveRun:true,snapshot:exists&&state==="completed"?value:null});
 vi.stubGlobal("fetch",vi.fn(async(input:string|URL|Request,init?:RequestInit)=>{
  const url=new URL(typeof input==="object"&&"url" in input?input.url:String(input),location.origin),path=url.pathname,method=init?.method??"GET",body=init?.body?JSON.parse(String(init.body)):{};
  if(![list,shortlist,detail,jobpath,jobpath+"/cancel"].includes(path))return fallback(input,init);
  calls.push({path,method,body,search:url.search});
  if(path===list&&method==="POST"){state="pending";return json(job(),202);}
  if(path===list)return json({items:exists?[value]:[],total:exists?1:0,limit:20,offset:0,latestJob:options.empty?null:job()});
  if(path===shortlist&&method==="PUT"){
   if(options.saveFails)return json({code:"revision_conflict",detail:"PRIVATE-RAW-TAVILY-KEY"},409);
   selection={...selection,id:R,revision:selection.revision+1,createdAt:time,updatedAt:time,selectedOffers:body.selectedOffers};return json(selection);
  }
  if(path===shortlist)return json(selection);
  if(path===jobpath+"/cancel"){state="cancelled";return json(job());}
  if(path===jobpath)return json(job());
  if(method==="DELETE"){if(selection.selectedOffers.length)return json({code:"in_use"},409);exists=false;return json(null,204);}
  return exists?json(value):json({code:"not_found"},404);
 }));return {calls,value,selection:()=>selection,writes:()=>calls.filter(x=>x.method!=="GET")};
}
const user=()=>userEvent.setup();
async function open(){return renderPrototype(route);}
const storage=()=>storedValues(localStorage)+storedValues(sessionStorage)+JSON.stringify(history.state)+location.href;

test("SRUI01 supplier research has a business home entry",async()=>{install();await renderPrototype("/business");expect(await screen.findByRole("link",{name:/supplier research/i})).toHaveAttribute("href",expect.stringContaining("/business/supplier-research"));});
test("SRUI02 disclose Tavily and AI fields before researching an unaccepted participation",async()=>{
 const server=install({empty:true});await open();await screen.findByRole("button",{name:/^research suppliers$/i});
 expect(document.body).toHaveTextContent(/Tavily/i);expect(document.body).toHaveTextContent(/AI|SoCLaaS/i);
 fireEvent.change(screen.getByLabelText(/^research brief$/i),{target:{value:"PRIVATE-NEW-RESEARCH"}});fireEvent.change(screen.getByLabelText(/^quantity$/i),{target:{value:"100"}});fireEvent.change(screen.getByLabelText(/^delivery area$/i),{target:{value:"Singapore East"}});
 await user().click(screen.getByRole("button",{name:/^research suppliers$/i}));await waitFor(()=>expect(server.writes()).toHaveLength(1));
 expect(server.writes()[0]).toMatchObject({path:list,method:"POST",body:{brief:"PRIVATE-NEW-RESEARCH",quantity:100,deliveryArea:"Singapore East",dataSharingConfirmed:true}});
 expect(server.writes()[0].body.requestId).toMatch(/^[0-9a-f-]{36}$/i);expect(server.writes()[0].body).not.toHaveProperty("businessId");expect(server.writes()[0].body).not.toHaveProperty("expectedEventRevision");expect(storage()).not.toMatch(/PRIVATE-|bbbbbbbb-bbbb/);
});
test("SRUI03 sourced offers show observed price unknown fees provenance and no trust warranty",async()=>{
 install();await open();await screen.findByText("Invented Printer");expect(document.body).toHaveTextContent(/unknown|not stated/i);expect(document.body).toHaveTextContent(/shipping/i);expect(document.body).toHaveTextContent(/tax/i);expect(document.body).toHaveTextContent(/not.*quot|observed listing/i);expect(document.body).toHaveTextContent(/20\.50/);
 const links=screen.getAllByRole("link");expect(links.some(x=>x.getAttribute("href")==="https://supplier.example.test/product")).toBe(true);expect(document.querySelector("script")).toBeNull();expect(storage()).not.toMatch(/PRIVATE-|bbbbbbbb-bbbb/);
});
test("SRUI04 shortlist saves exact offer references with CAS and reopens across remount",async()=>{
 const server=install();const view=await open();await screen.findByText("Invented Printer");await user().click(screen.getByRole("checkbox",{name:/select.*offer/i}));await user().click(screen.getByRole("button",{name:/^save shortlist$/i}));await waitFor(()=>expect(server.selection().revision).toBe(2));
 expect(server.writes()[0]).toMatchObject({path:shortlist,method:"PUT",body:{expectedRevision:1,selectedOffers:[{snapshotId:S,offerId:O}]}});view.unmount();await open();expect(await screen.findByRole("checkbox",{name:/select.*offer/i})).toBeChecked();
});
test("SRUI05 stale and partial results disclose limitations and keep shortlist usable",async()=>{
 install({partial:true,stale:true});await open();await screen.findByText("Invented Printer");expect(document.body).toHaveTextContent(/partial/i);expect(document.body).toHaveTextContent(/stale|older than|24.hour/i);expect(document.body).toHaveTextContent(/blocked/i);expect(screen.getByRole("button",{name:/^save shortlist$/i})).toBeVisible();
});
test("SRUI06 failed shortlist save retains selected work and hides provider details",async()=>{
 const server=install({saveFails:true});await open();await screen.findByText("Invented Printer");await user().click(screen.getByRole("checkbox",{name:/select.*offer/i}));await user().click(screen.getByRole("button",{name:/^save shortlist$/i}));await waitFor(()=>expect(server.writes()).toHaveLength(1));expect(screen.getByRole("checkbox",{name:/select.*offer/i})).toBeChecked();expect(document.body).not.toHaveTextContent("PRIVATE-RAW-TAVILY-KEY");expect(server.selection().revision).toBe(1);
});
