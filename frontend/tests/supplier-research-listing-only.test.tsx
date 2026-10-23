// Developer-owned regression: a listing-only offer (spec r4/D06) renders without raw null/NaN text.
import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { applications, draft, B1, E1 } from "./fixtures/applications";
import { renderPrototype } from "./helpers/renderPrototype";

const P="88888888-8888-4888-8888-888888888888",S="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",O="cccccccc-cccc-4ccc-8ccc-cccccccccccc";

test("listing-only offer shows unknown reasons and never raw null or NaN", async () => {
  applications.install();applications.records=[draft()];const fallback=globalThis.fetch;
  const base=`/api/v1/business/participations/${P}`,stamp="2026-10-22T01:00:00Z";
  const quote="Invented Printer sells Flyer Pack.";
  const reason=(field:string)=>({field,reason:`Fetched evidence does not support ${field}.`});
  const snapshot={id:S,participationId:P,revision:1,createdAt:stamp,status:"partial",isStale:false,
    request:{category:"printing",brief:"Private brief",quantity:100,deliveryArea:"Singapore East",neededBy:null},
    sources:[{sourceId:S,searchResultUrl:"https://supplier.example/item",requestedUrl:"https://supplier.example/item",finalUrl:"https://supplier.example/item",provider:"tavily_page_fetch",retrievedAt:stamp,isStale:false,excerpt:quote}],
    sourceFailures:[],
    offers:[{id:O,supplierName:"Invented Printer",productDescription:"Flyer Pack",
      evidenceByField:["supplierName","productDescription"].map(field=>({field,sourceId:S,evidenceQuote:quote,sourceLocator:null})),
      listedPrice:{amountMinorUnits:null,currency:null,unitLabel:null,quantityBasis:null},
      estimatedItemSubtotalMinorUnits:null,estimatedCurrency:null,deliveryEstimate:null,minimumOrderQuantity:null,availability:null,
      unknownFields:[reason("listedPrice"),reason("deliveryEstimate"),reason("minimumOrderQuantity"),reason("availability"),reason("estimatedItemSubtotalMinorUnits")],
      qualifications:[]}]};
  const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json"}});
  vi.stubGlobal("fetch",vi.fn(async(input:string|URL|Request,init?:RequestInit)=>{
    const path=new URL(typeof input==="object"&&"url" in input?input.url:String(input),location.origin).pathname;
    if(path===base+"/supplier-research")return json({items:[snapshot],total:1,offset:0,limit:20,latestJob:null});
    if(path===base+"/supplier-shortlist")return json({id:null,participationId:P,revision:1,createdAt:null,updatedAt:null,selectedOffers:[]});
    return fallback(input,init);
  }));
  await renderPrototype(`/business/supplier-research?businessId=${B1}&eventId=${E1}&participationId=${P}`);
  await screen.findByText("Invented Printer");
  const text=document.body.textContent??"";
  expect(text).toMatch(/Fetched evidence does not support deliveryEstimate/);
  expect(text).toMatch(/unknown/i);
  expect(text).not.toMatch(/\bnull\b/);
  expect(text).not.toMatch(/\bNaN\b/);
  expect(text).not.toMatch(/undefined/);
});
