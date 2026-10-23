// Developer-owned parser checks; independent acceptance baseline stays unchanged.
import { expect, test } from "vitest";
import { formatMoney, parseSnapshot, ResearchError } from "./api";
const p="11111111-1111-4111-8111-111111111111",id="22222222-2222-4222-8222-222222222222";
function fixture(){return {id,participationId:p,revision:1,createdAt:"2026-10-22T00:00:00Z",status:"complete",isStale:false,request:{category:"printing",brief:"Invented flyers",quantity:100,deliveryArea:"Singapore",neededBy:null},sources:[{sourceId:id,searchResultUrl:"https://supplier.example/item",requestedUrl:"https://supplier.example/item",finalUrl:"https://supplier.example/item",provider:"tavily_page_fetch",retrievedAt:"2026-10-22T00:00:00Z",isStale:false,excerpt:"Invented quote"}],sourceFailures:[],offers:[{id,supplierName:"Invented supplier",productDescription:"Flyers",listedPrice:{amountMinorUnits:"205",currency:"SGD",unitLabel:"pack",quantityBasis:"10"},estimatedItemSubtotalMinorUnits:"2050",estimatedCurrency:"SGD",deliveryEstimate:null,minimumOrderQuantity:null,availability:null,unknownFields:[],qualifications:[],evidenceByField:["supplierName","productDescription","listedPrice.amountMinorUnits","listedPrice.currency","listedPrice.unitLabel","listedPrice.quantityBasis"].map(field=>({field,sourceId:id,evidenceQuote:"Invented quote",sourceLocator:null}))}]};}
test("canonical supported subtotal uses exact minor units",()=>{expect(parseSnapshot(fixture(),p).offers[0].estimatedItemSubtotalMinorUnits).toBe("2050");expect(formatMoney("2050","SGD")).toBe("SGD 20.50");});
test.each(["JPY","KWD"])("foreign %s minor units never silently use SGD decimal scale",currency=>{expect(formatMoney("205",currency)).toBe(`${currency} 205 source minor units (no conversion)`);});
test.each(["date","currency","basis","evidence","field","subtotal","crossCurrency","qualifications","url"])("malformed %s cannot reach source display",kind=>{
 const value=fixture(),offer=value.offers[0];
 if(kind==="date")value.createdAt="1";
 if(kind==="currency")offer.listedPrice.currency="not a currency";
 if(kind==="basis")offer.listedPrice.quantityBasis="0";
 if(kind==="evidence")offer.evidenceByField=[];
 if(kind==="field")offer.evidenceByField[0].field="tool_instruction";
 if(kind==="subtotal")offer.estimatedItemSubtotalMinorUnits="1";
 if(kind==="crossCurrency")offer.listedPrice.currency="JPY";
 if(kind==="qualifications")offer.qualifications=Array.from({length:11},()=>"Unbounded") as never[];
 if(kind==="url")value.sources[0].finalUrl="javascript:alert(1)";
 expect(()=>parseSnapshot(value,p)).toThrow(ResearchError);
});
