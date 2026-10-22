// Developer-owned regression for access loss during uncertain-write reconciliation.
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { applications, draft, B1, E1 } from "../../tests/fixtures/applications";
import { renderPrototype } from "../../tests/helpers/renderPrototype";
const P="88888888-8888-4888-8888-888888888888",S="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",O="cccccccc-cccc-4ccc-8ccc-cccccccccccc";
test("access denial during reconciliation clears previously displayed private research",async()=>{
 applications.install();applications.records=[draft()];const fallback=globalThis.fetch;
 const base=`/api/v1/business/participations/${P}`,stamp="2026-10-22T01:00:00Z";
 const snapshot={id:S,participationId:P,revision:1,createdAt:stamp,status:"complete",isStale:false,request:{category:"printing",brief:"Private brief",quantity:100,deliveryArea:"Singapore East",neededBy:null},sources:[{sourceId:S,searchResultUrl:"https://supplier.example/item",requestedUrl:"https://supplier.example/item",finalUrl:"https://supplier.example/item",provider:"tavily_page_fetch",retrievedAt:stamp,isStale:false,excerpt:"Private Supplier Flyers delivery3days"}],sourceFailures:[],offers:[{id:O,supplierName:"Private Supplier",productDescription:"Flyers",evidenceByField:["supplierName","productDescription","deliveryEstimate"].map(field=>({field,sourceId:S,evidenceQuote:"Private Supplier Flyers delivery3days",sourceLocator:null})),listedPrice:{amountMinorUnits:null,currency:null,unitLabel:null,quantityBasis:null},estimatedItemSubtotalMinorUnits:null,estimatedCurrency:null,deliveryEstimate:"3 days",minimumOrderQuantity:null,availability:null,unknownFields:[],qualifications:[]}]};
 let reads=0,writes=0;
 const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json"}});
 vi.stubGlobal("fetch",vi.fn(async(input:string|URL|Request,init?:RequestInit)=>{
  const path=new URL(typeof input==="object"&&"url" in input?input.url:String(input),location.origin).pathname;
  if(path===base+"/supplier-research")return json({items:[snapshot],total:1,offset:0,limit:20,latestJob:null});
  if(path===base+"/supplier-shortlist"){
   if(init?.method==="PUT"){writes++;throw new TypeError("Synthetic lost response");}
   reads++;return reads===1?json({id:null,participationId:P,revision:1,createdAt:null,updatedAt:null,selectedOffers:[]}):json({code:"forbidden"},403);
  }
  return fallback(input,init);
 }));
 await renderPrototype(`/business/supplier-research?businessId=${B1}&eventId=${E1}&participationId=${P}`);
 await screen.findByText("Private Supplier");const user=userEvent.setup();await user.click(screen.getByRole("checkbox",{name:/select offer/i}));await user.click(screen.getByRole("button",{name:/^save shortlist$/i}));
 await waitFor(()=>expect(screen.queryByText("Private Supplier")).not.toBeInTheDocument());
 expect(writes).toBe(1);expect(reads).toBe(2);expect(screen.getByRole("button",{name:/reload saved state/i})).toBeVisible();
 expect(document.body).not.toHaveTextContent("Checking current access");
});
