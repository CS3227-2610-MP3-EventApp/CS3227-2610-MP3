import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Checkbox, FormControlLabel, Link, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { api, ApiError, applicationApi } from "../api";
import { application, events as parseEvents, type Application, type ApplicationEvent } from "../applications/model";
import { useAuth } from "../Auth";
import { AppearanceControl } from "../Appearance";
import { ResearchError, researchApi, parseHistory, parseShortlist, parseJob, parseSnapshot, formatMoney, type Snapshot, type Shortlist, type Reference, type Job } from "./api";

const active=(j:Job|null)=>!!j&&["pending","running"].includes(j.state);
export function SupplierResearch(){
 const {actor,setActor,revalidate}=useAuth(),location=useLocation(),navigate=useNavigate();
 const query=new URLSearchParams(location.search),owners=actor?.businessMemberships.filter(m=>m.status==="active"&&m.role==="owner")??[];
 const businessId=query.get("businessId")??owners[0]?.businessId??"",eventId=query.get("eventId")??"",participationId=query.get("participationId")??"";
 const [events,setEvents]=useState<ApplicationEvent[]>([]),[applications,setApplications]=useState<Application[]>([]),[items,setItems]=useState<Snapshot[]>([]),[total,setTotal]=useState(0),[offset,setOffset]=useState(0);
 const [saved,setSaved]=useState<Shortlist|null>(null),[selected,setSelected]=useState<Reference[]>([]),[job,setJob]=useState<Job|null>(null);
 const [category,setCategory]=useState("printing"),[brief,setBrief]=useState(""),[quantity,setQuantity]=useState("100"),[area,setArea]=useState(""),[neededBy,setNeededBy]=useState("");
 const [checking,setChecking]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[conflict,setConflict]=useState(false),[uncertain,setUncertain]=useState(false);
 const epoch=useRef(0),alive=useRef(true),mutex=useRef(false),actorRef=useRef(actor),dirtyRef=useRef(false);actorRef.current=actor;
 const dirty=JSON.stringify(selected)!==JSON.stringify(saved?.selectedOffers??[]);dirtyRef.current=dirty;
 const owner=owners.find(m=>m.businessId===businessId),chosen=applications.find(a=>a.participationId===participationId&&a.eventId===eventId);
 function current(v:number,who:string){return alive.current&&epoch.current===v&&actorRef.current?.id===who;}
 function clear(){setItems([]);setSaved(null);setSelected([]);setJob(null);setBrief("");setArea("");setNeededBy("");setConflict(false);setUncertain(false);}
 function failure(value:unknown){if((value instanceof ResearchError||value instanceof ApiError)&&[401,403,404].includes(value.status)){clear();setChecking(false);if(value.status===401)void revalidate();}setError(value instanceof ResearchError?value.message:"Unable to confirm the request. Reload saved state before retrying.");}
 async function ensure(v:number,who:string){const fresh=await api.me();if(!current(v,who))return false;if(fresh.id!==who||fresh.role!=="business"||fresh.mustChangePassword||!fresh.businessMemberships.some(m=>m.businessId===businessId&&m.role==="owner"&&m.status==="active"))throw new ResearchError(403,"forbidden");setActor(fresh);return true;}
 function route(b:string,e:string,p:string){if(dirtyRef.current&&!window.confirm("Discard unsaved shortlist changes?"))return;navigate(`/business/supplier-research?businessId=${encodeURIComponent(b)}&eventId=${encodeURIComponent(e)}&participationId=${encodeURIComponent(p)}`);}
 async function load(){const v=++epoch.current,who=actor?.id;mutex.current=false;setBusy(false);clear();setEvents([]);setApplications([]);setChecking(true);setError("");setNotice("");if(!who||!owner){setChecking(false);setError("Access is not permitted.");return;}try{if(!await ensure(v,who))return;const [es,as]=await Promise.all([applicationApi.events(businessId),applicationApi.list(businessId)]);if(!current(v,who))return;const parsedEvents=parseEvents(es),apps=Array.isArray(as)?as.map(a=>application(a,{businessId})):(()=>{throw new ResearchError(0,"invalid_response");})();setEvents(parsedEvents);setApplications(apps);const candidate=apps.find(a=>(!eventId||a.eventId===eventId)&&(!participationId||a.participationId===participationId));if(!candidate){setNotice("Create a participation application before researching suppliers.");setChecking(false);return;}if(!eventId||!participationId){route(businessId,candidate.eventId,candidate.participationId);return;}const [h,s]=await Promise.all([researchApi.history(participationId),researchApi.shortlist(participationId)]);if(!current(v,who))return;const history=parseHistory(h,participationId,eventId),shortlist=parseShortlist(s,participationId);setItems(history.items);setTotal(history.total);setOffset(0);setJob(history.latestJob);setSaved(shortlist);setSelected(shortlist.selectedOffers);setChecking(false);}catch(value){if(current(v,who)){failure(value);setChecking(false);}}}
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;epoch.current++;mutex.current=false;};},[actor?.id,businessId,eventId,participationId]);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
 async function operation(action:(v:number,who:string)=>Promise<void>){if(mutex.current||!actor)return;mutex.current=true;setBusy(true);setError("");setNotice("");const v=epoch.current,who=actor.id;try{if(await ensure(v,who))await action(v,who);}catch(value){if(current(v,who))failure(value);}finally{if(current(v,who)){mutex.current=false;setBusy(false);}}}
 async function history(v:number,who:string,next=0){const h=parseHistory(await researchApi.history(participationId,next),participationId,eventId);if(current(v,who)){setItems(h.items);setTotal(h.total);setOffset(next);setJob(h.latestJob);}}
 const valid=brief.trim()&&Array.from(brief.trim()).length<=1000&&area.trim()&&Array.from(area.trim()).length<=100&&/^[1-9][0-9]*$/.test(quantity)&&Number(quantity)<=1000000;
 async function generate(){if(!valid)return;await operation(async(v,who)=>{try{const result=parseJob(await researchApi.create(participationId,{requestId:crypto.randomUUID(),category,brief:brief.trim(),quantity:Number(quantity),deliveryArea:area.trim(),...(neededBy?{neededBy}:{}),dataSharingConfirmed:true}),participationId,eventId);if(!current(v,who))return;setJob(result);setNotice("Research requested. Refresh status to check progress; requests are not replayed automatically.");if(result.snapshot)await history(v,who);}catch(value){if(current(v,who)&&value instanceof ResearchError&&(value.status===0||value.status>=500)){await history(v,who);if(current(v,who))setNotice("Checked saved job history after an uncertain request. No research request was replayed.");}throw value;}});}
 async function refresh(cancel=false){await operation(async(v,who)=>{if(!job)return;const result=parseJob(await(cancel?researchApi.cancel(job.id):researchApi.job(job.id)),participationId,eventId);if(!current(v,who))return;setJob(result);if(result.snapshot)await history(v,who);});}
 async function save(){if(!saved)return;await operation(async(v,who)=>{try{const result=parseShortlist(await researchApi.save(participationId,{expectedRevision:saved.revision,selectedOffers:selected}),participationId);if(!current(v,who))return;setSaved(result);setSelected(result.selectedOffers);setConflict(false);setNotice("Private shortlist saved.");}catch(value){if(current(v,who)&&value instanceof ResearchError){if(value.code==="revision_conflict")setConflict(true);if(value.status===0||value.status>=500){try{const canonical=parseShortlist(await researchApi.shortlist(participationId),participationId);if(!current(v,who))return;setSaved(canonical);if(JSON.stringify(canonical.selectedOffers)===JSON.stringify(selected)){setConflict(false);setNotice("Saved shortlist confirmed after an uncertain response.");return;}setConflict(true);}catch(reconcileError){if(reconcileError instanceof ResearchError&&[401,403,404].includes(reconcileError.status))throw reconcileError;if(current(v,who))setUncertain(true);}}}throw value;}});}
 async function reloadShortlist(){if(dirty&&!window.confirm("Discard unsaved selections and reload the saved shortlist?"))return;await operation(async(v,who)=>{const result=parseShortlist(await researchApi.shortlist(participationId),participationId);if(current(v,who)){setSaved(result);setSelected(result.selectedOffers);setConflict(false);}});}
 async function remove(s:Snapshot){
  if(!window.confirm("Delete this saved comparison? Clear and save its shortlist selections first."))return;
  await operation(async(v,who)=>{
   try {await researchApi.remove(s.id);if(current(v,who))await history(v,who);}
   catch(value){
    if(current(v,who)&&value instanceof ResearchError&&(value.status===0||value.status>=500)){
     try{
      let exists=true;
      try{parseSnapshot(await researchApi.read(s.id),participationId);}
      catch(readError){if(readError instanceof ResearchError&&readError.status===404)exists=false;else throw readError;}
      await history(v,who);if(!current(v,who))return;
      if(!exists){setNotice("Deletion confirmed against saved state after an uncertain response.");return;}
      setUncertain(true);
     }catch(reconcileError){if(reconcileError instanceof ResearchError&&[401,403,404].includes(reconcileError.status))throw reconcileError;if(current(v,who))setUncertain(true);}
    }
    throw value;
   }
  });
 }
 function toggle(snapshotId:string,offerId:string,checked:boolean){setSelected(old=>checked?[...old,{snapshotId,offerId}]:old.filter(r=>r.snapshotId!==snapshotId||r.offerId!==offerId));}
 const status=job?.state==="failed"?({access_revoked:"Research stopped because access changed.",timed_out:"Research timed out. Saved comparisons remain available.",invalid_output:"Research could not be grounded in the retrieved pages."} as Record<string,string>)[job.failureCode??""]??"Supplier research failed. Saved comparisons remain available.":job?.state==="cancelled"?`Research cancelled. ${job.providerMayHaveRun?"A provider may already have run and used quota.":"No provider request was dispatched."}`:job?.state==="completed"?"Research completed. Its comparison is saved separately from the job.":job?`Research ${job.state}.`:"";
 return <Box sx={{maxWidth:1100,mx:"auto",p:{xs:2,md:4},overflowWrap:"anywhere"}}><Stack spacing={3}>
  <Stack direction="row" sx={{flexWrap:"wrap",gap:2,alignItems:"center",justifyContent:"space-between"}}><Button component={RouterLink} to="/business" onClick={e=>{if(dirty&&!window.confirm("Discard unsaved shortlist changes?"))e.preventDefault();}}>Business workspace</Button><AppearanceControl/></Stack>
  <Typography component="h1" variant="h2" data-page-heading tabIndex={-1}>Supplier research</Typography>
  {error&&<Alert severity="error">{error}</Alert>}{notice&&<Alert severity="info">{notice}</Alert>}
  <Stack direction={{xs:"column",sm:"row"}} spacing={2}>
   <TextField select label="Business" value={businessId} disabled={busy} onChange={e=>route(e.target.value,"","")}>{owners.map(m=><MenuItem key={m.businessId} value={m.businessId}>{m.businessName}</MenuItem>)}</TextField>
   <TextField select label="Event" value={eventId} disabled={busy||checking} onChange={e=>{const a=applications.find(a=>a.eventId===e.target.value);if(a)route(businessId,e.target.value,a.participationId);}}>{events.filter(e=>applications.some(a=>a.eventId===e.eventId)).map(e=><MenuItem key={e.eventId} value={e.eventId}>{e.title}</MenuItem>)}</TextField>
  </Stack>
  <Button disabled={busy} onClick={()=>{if(!dirty||window.confirm("Discard unsaved shortlist changes and reload saved state?"))void load();}}>Reload saved state</Button>{uncertain&&<Alert severity="warning">A write could not be reconciled. Reload saved state before making further changes.</Alert>}{checking?<Typography role="status">Checking current access…</Typography>:chosen&&saved&&<>
   <Paper variant="outlined" sx={{p:3}}><Stack spacing={2}>
    <Typography component="h2" variant="h5">Research a new comparison</Typography>
    <Alert severity="info">Your category, research brief, quantity, coarse Singapore delivery area and optional needed-by date go to Tavily for discovery and SoCLaaS for AI extraction with fetched public page text. Use only necessary information; do not include street addresses or contacts. Free text is not automatically scrubbed. Comparisons remain until deleted; jobs expire after 30 days. Provider retention is unverified.</Alert>
    <TextField select label="Category" value={category} disabled={busy} onChange={e=>setCategory(e.target.value)}><MenuItem value="printing">Printing</MenuItem><MenuItem value="snacks">Snacks</MenuItem><MenuItem value="freebies">Freebies</MenuItem></TextField>
    <TextField label="Research brief" multiline minRows={2} value={brief} disabled={busy} onChange={e=>setBrief(e.target.value)} helperText={`${Array.from(brief).length}/1000 characters`}/>
    <TextField label="Quantity" type="number" value={quantity} disabled={busy} onChange={e=>setQuantity(e.target.value)}/>
    <TextField label="Delivery area" value={area} disabled={busy} onChange={e=>setArea(e.target.value)} helperText="Coarse Singapore region only, up to 100 characters"/>
    <TextField label="Needed by" type="date" value={neededBy} disabled={busy} onChange={e=>setNeededBy(e.target.value)} slotProps={{inputLabel:{shrink:true}}}/>
    <Button variant="contained" disabled={busy||uncertain||active(job)||!valid} onClick={generate}>Research suppliers</Button>
    <Typography variant="body2">Each research request creates a new comparison. Existing evidence and shortlist selections stay saved.</Typography>
   </Stack></Paper>
   {job&&<Paper variant="outlined" sx={{p:2}}><Stack spacing={1}><Typography role="status">{status}</Typography><Stack direction="row" spacing={2}><Button disabled={busy} onClick={()=>refresh()}>Refresh status</Button>{active(job)&&<Button disabled={busy} onClick={()=>refresh(true)}>Cancel job</Button>}</Stack></Stack></Paper>}
   <Paper variant="outlined" sx={{p:3}}><Stack spacing={2}><Typography component="h2" variant="h5">Private shortlist</Typography><Typography>{selected.length} selected offers. Saved revision {saved.revision}.{dirty?" Unsaved selections.":""}</Typography><Stack direction="row" sx={{flexWrap:"wrap",gap:2}}><Button variant="contained" disabled={busy||uncertain||conflict||selected.length>100} onClick={save}>Save shortlist</Button><Button disabled={busy} onClick={reloadShortlist}>Reload saved shortlist</Button><Button disabled={busy||!selected.length} onClick={()=>setSelected([])}>Clear selections</Button></Stack><Link component={RouterLink} to={`/business/procurement-proposals?${new URLSearchParams({participationId})}`} onClick={e=>{if(dirty&&!window.confirm("Discard unsaved shortlist changes?"))e.preventDefault();}}>Procurement proposals from this shortlist</Link>{conflict&&<Alert severity="warning">Your selections are retained. Reload the saved shortlist to resolve the conflict.</Alert>}</Stack></Paper>
   <Typography component="h2" variant="h5">Saved comparisons</Typography>
   <Alert severity="warning">Observed listings and calculated item subtotals are estimates, not quotations. Tax, shipping and fees are excluded from subtotals. Source links do not verify seller identity, reliability, safety, suitability or current inventory. Review the evidence before making decisions.</Alert>
   {!items.length&&<Typography>No saved comparisons yet.</Typography>}
   {items.map(s=><Paper key={s.id} variant="outlined" sx={{p:3}}><Stack spacing={2}>
    <Typography component="h3" variant="h6">{s.request.category}: {s.request.quantity} units — {new Date(s.createdAt).toLocaleString()}</Typography>
    <Typography>{s.request.brief} · {s.request.deliveryArea}{s.request.neededBy?` · Needed by ${s.request.neededBy}`:""}</Typography>
    {s.status==="partial"&&<Alert severity="warning">Partial research: some sources could not be used. You can still select and save the available offers below.</Alert>}{s.isStale&&<Alert severity="warning">Stale evidence: a source is older than 24 hours. Research again for a separate fresh comparison.</Alert>}
    {s.sourceFailures.map(f=><Alert key={f.sourceId} severity="warning">{f.displayMessage}</Alert>)}
    {s.offers.map(o=><Paper key={o.id} variant="outlined" sx={{p:2}}><Stack spacing={1}>
     <Typography component="h4" variant="h6">{o.supplierName}</Typography><Typography>{o.productDescription}</Typography>
     <FormControlLabel label={`Select offer: ${o.supplierName}`} control={<Checkbox disabled={busy} checked={selected.some(r=>r.snapshotId===s.id&&r.offerId===o.id)} onChange={e=>toggle(s.id,o.id,e.target.checked)}/>}/>
     <Typography>Observed listing: {formatMoney(o.listedPrice.amountMinorUnits,o.listedPrice.currency)}{o.listedPrice.quantityBasis?` per ${o.listedPrice.quantityBasis} units`:""}{o.listedPrice.unitLabel?` (${o.listedPrice.unitLabel})`:""}</Typography>
     <Typography>Estimated item subtotal: {formatMoney(o.estimatedItemSubtotalMinorUnits,o.estimatedCurrency)} · Shipping and tax excluded; unknown unless stated in source evidence.</Typography>
     <Typography>Delivery: {o.deliveryEstimate??"Unknown"} · Minimum order: {o.minimumOrderQuantity??"Unknown"} · Availability: {o.availability??"Unknown"}</Typography>
     {o.unknownFields.map((u,i)=><Typography key={i} variant="body2">{u.field}: unknown — {u.reason}</Typography>)}{o.qualifications.map((q,i)=><Typography key={i} variant="body2">{q}</Typography>)}
     <Typography component="h5" variant="subtitle1">Field evidence</Typography>{o.evidenceByField.map((e,i)=>{const source=s.sources.find(src=>src.sourceId===e.sourceId)!;return <Typography key={i} variant="body2">{e.field}: “{e.evidenceQuote}” · <Link href={source.finalUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{new URL(source.finalUrl).hostname}</Link> · {source.provider} · Retrieved {new Date(source.retrievedAt).toLocaleString()}{source.isStale?" (stale)":""}</Typography>;})}
    </Stack></Paper>)}
    <Button variant="contained" disabled={busy||uncertain||conflict||selected.length>100} onClick={save}>Save selected offers</Button>
    <Typography component="h4" variant="subtitle1">Retrieved sources</Typography>
    {s.sources.map(source=><Box key={source.sourceId} component="details"><Typography component="summary" sx={{cursor:"pointer"}}>{new URL(source.finalUrl).hostname} · Retrieved {new Date(source.retrievedAt).toLocaleString()}{source.isStale?" · Stale":""}</Typography><Stack spacing={1} sx={{mt:1}}><Typography variant="body2">Discovery URL: <Link href={source.searchResultUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{source.searchResultUrl}</Link></Typography><Typography variant="body2">Requested URL: {source.requestedUrl}</Typography><Typography variant="body2">Final source: <Link href={source.finalUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{source.finalUrl}</Link> · {source.provider}</Typography><Typography variant="body2">Captured untrusted excerpt: {source.excerpt}</Typography></Stack></Box>)}
    <Button color="error" disabled={busy||uncertain} onClick={()=>remove(s)}>Delete comparison</Button>
   </Stack></Paper>)}
   <Stack direction="row" spacing={2}><Button disabled={busy||offset===0} onClick={()=>operation((v,w)=>history(v,w,Math.max(0,offset-20)))}>Previous comparisons</Button><Button disabled={busy||offset+items.length>=total} onClick={()=>operation((v,w)=>history(v,w,offset+20))}>More comparisons</Button></Stack>
  </>}
 </Stack></Box>;
}
