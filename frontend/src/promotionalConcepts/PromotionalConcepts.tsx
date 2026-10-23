import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Paper, Snackbar, Stack, TextField, Typography } from "@mui/material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { api, ApiError, applicationApi } from "../api";
import { application, events as parseEvents, type Application, type ApplicationEvent } from "../applications/model";
import { useAuth } from "../Auth";
import { AppearanceControl } from "../Appearance";
import { ConceptError, conceptsApi, factFields, object, parseConcept, parseHistory, parseJob, type Concept, type FactField, type Job } from "./api";

const labels: Record<FactField,string> = {"event.title":"Event title","event.startsAt":"Event start","event.endsAt":"Event end","event.timezone":"Event time zone","setup.boothLabel":"Published booth","setup.setupInstructions":"Published setup instructions"};
type Setup = {revision:number|null; boothLabel:string|null; setupInstructions:string|null};
const active = (job:Job|null)=>!!job&&["pending","running"].includes(job.state);
function jobText(job:Job|null) {
  if(!job)return "";
  if(job.state==="pending")return "Concept generation queued.";
  if(job.state==="running")return "Concept generation in progress.";
  if(job.state==="completed")return job.concept ? "Concept generation completed. A separate private draft was saved." : "Generation completed; its draft has been deleted.";
  if(job.state==="cancelled")return `Concept generation cancelled. ${job.providerMayHaveRun?"The provider may already have run and used quota.":"No provider request was dispatched."}`;
  return ({source_changed:"Generation failed because source facts changed. Reload facts before trying again.",access_revoked:"Generation stopped because access changed.",timed_out:"Generation timed out. Existing drafts remain available.",invalid_output:"The AI response could not be validated. Existing drafts remain available.",quota_exceeded:"The AI usage limit has been reached."} as Record<string,string>)[job.failureCode??""]??"Concept generation failed. Existing drafts remain available for editing.";
}

export function PromotionalConcepts() {
  const {actor,setActor,revalidate}=useAuth(), location=useLocation(), navigate=useNavigate();
  const query=new URLSearchParams(location.search), owners=actor?.businessMemberships.filter(m=>m.status==="active"&&m.role==="owner")??[];
  const businessId=query.get("businessId")??owners[0]?.businessId??"",eventId=query.get("eventId")??"",participationId=query.get("participationId")??"";
  const [events,setEvents]=useState<ApplicationEvent[]>([]),[applications,setApplications]=useState<Application[]>([]),[setup,setSetup]=useState<Setup|null>(null);
  const [items,setItems]=useState<Concept[]>([]),[total,setTotal]=useState(0),[offset,setOffset]=useState(0),[concept,setConcept]=useState<Concept|null>(null),[job,setJob]=useState<Job|null>(null);
  const [brief,setBrief]=useState(""),[selected,setSelected]=useState<FactField[]>(["event.title"]),[dirty,setDirty]=useState(false),[conflict,setConflict]=useState(false);
  const [checking,setChecking]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[deleting,setDeleting]=useState(false);
  const epoch=useRef(0), alive=useRef(true), mutex=useRef(false), actorRef=useRef(actor),dirtyRef=useRef(dirty);
  actorRef.current=actor;dirtyRef.current=dirty;
  const event=events.find(e=>e.eventId===eventId), owner=owners.find(o=>o.businessId===businessId), chosen=applications.find(a=>a.participationId===participationId&&a.eventId===eventId);
  function clearPrivate(){setConcept(null);setItems([]);setJob(null);setSetup(null);setBrief("");setDirty(false);setConflict(false);setDeleting(false);}
  function current(version:number,who:string){return alive.current&&epoch.current===version&&actorRef.current?.id===who;}
  function failure(value:unknown){
    if((value instanceof ConceptError||value instanceof ApiError)&&[401,403,404].includes(value.status)){clearPrivate();setChecking(true);if(value.status===401)revalidate();}
    setError(value instanceof ConceptError ? value.message : "Unable to confirm the request. Reload saved state before retrying.");
  }
  async function ensure(version:number,who:string){
    const fresh=await api.me(); if(!current(version,who))return false;
    if(fresh.id!==who||fresh.role!=="business"||fresh.mustChangePassword||!fresh.businessMemberships.some(m=>m.businessId===businessId&&m.role==="owner"&&m.status==="active"))throw new ConceptError(403,"forbidden");
    setActor(fresh);return true;
  }
  async function readSources(p:string,e:string){
    const raw=await conceptsApi.setup(p);
    if(!object(raw)||raw.participationId!==p||raw.eventId!==e||!Number.isSafeInteger(raw.revision)||!(raw.boothLabel===null||typeof raw.boothLabel==="string")||!(raw.setupInstructions===null||typeof raw.setupInstructions==="string")||!(raw.updatedAt===null||typeof raw.updatedAt==="string"))throw new ConceptError(0,"invalid_response");
    return {revision:raw.updatedAt===null?null:Number(raw.revision),boothLabel:raw.boothLabel as string|null,setupInstructions:raw.setupInstructions as string|null};
  }
  function selectRoute(b:string,e:string,p:string){
    if(dirtyRef.current&&!window.confirm("Discard unsaved concept edits?"))return;
    navigate(`/business/promotional-concepts?businessId=${encodeURIComponent(b)}&eventId=${encodeURIComponent(e)}&participationId=${encodeURIComponent(p)}`);
  }
  async function load(){
    const version=++epoch.current,who=actor?.id;mutex.current=false;setBusy(false);clearPrivate();setSelected(["event.title"]);setEvents([]);setApplications([]);setChecking(true);setError("");setNotice("");
    if(!who||!owner){setError("Access is not permitted.");setChecking(false);return;}
    try{
      if(!await ensure(version,who))return;
      const [es,as]=await Promise.all([applicationApi.events(businessId),applicationApi.list(businessId)]);
      if(!current(version,who))return;
      const summaries=parseEvents(es),apps=Array.isArray(as)?as.map(a=>application(a,{businessId})):(()=>{throw new ConceptError(0,"invalid_response");})();
      setEvents(summaries);setApplications(apps);
      const candidate=apps.find(a=>(!eventId||a.eventId===eventId)&&(!participationId||a.participationId===participationId));
      if(!candidate){setNotice("Create a participation application before planning promotional concepts.");setChecking(false);return;}
      if(!eventId||!participationId){selectRoute(businessId,candidate.eventId,candidate.participationId);return;}
      const [source,history]=await Promise.all([readSources(participationId,eventId),conceptsApi.history(participationId)]);
      if(!current(version,who))return;
      const parsed=parseHistory(history,participationId,eventId);setSetup(source);setItems(parsed.items);setTotal(parsed.total);setOffset(0);setJob(parsed.latestJob);setConcept(parsed.items[0]??null);setChecking(false);
    }catch(value){if(current(version,who)){failure(value);setChecking(false);}}
  }
  useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;epoch.current++;mutex.current=false;};},[actor?.id,businessId,eventId,participationId]);
  useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
  async function operation(action:(version:number,who:string)=>Promise<void>){
    if(mutex.current||!actor)return;mutex.current=true;setBusy(true);setError("");setNotice("");const version=epoch.current,who=actor.id;
    try{if(await ensure(version,who))await action(version,who);}catch(value){if(current(version,who))failure(value);}finally{if(current(version,who)){mutex.current=false;setBusy(false);}}
  }
  async function page(next:number){await operation(async(v,who)=>{const parsed=parseHistory(await conceptsApi.history(participationId,next),participationId,eventId);if(!current(v,who))return;setItems(parsed.items);setTotal(parsed.total);setOffset(next);setJob(parsed.latestJob);});}
  async function openConcept(id:string){
    if(dirty&&!window.confirm("Discard unsaved concept edits?"))return;
    await operation(async(v,who)=>{const parsed=parseConcept(await conceptsApi.read(id),participationId);if(!current(v,who))return;setConcept(parsed);setDirty(false);setConflict(false);setDeleting(false);});
  }
  async function generate(){
    if(!event||!setup||!brief.trim()||Array.from(brief.trim()).length>2000)return;
    await operation(async(v,who)=>{
      try{
        const parsed=parseJob(await conceptsApi.create(participationId,{requestId:crypto.randomUUID(),expectedEventRevision:event.eventRevision,expectedSetupRevision:setup.revision,brief:brief.trim(),factFields:selected,dataSharingConfirmed:true}),participationId,eventId);
        if(!current(v,who))return;setJob(parsed);setNotice("Generation requested. Status is checked automatically; no request is replayed.");
        if(parsed.concept){const saved=parseHistory(await conceptsApi.history(participationId),participationId,eventId);if(!current(v,who))return;setItems(saved.items);setTotal(saved.total);setOffset(0);if(!dirtyRef.current)setConcept(parsed.concept);}
      }catch(value){
        if(!current(v,who))return;
        if(value instanceof ConceptError&&(value.status===0||value.status>=500)){
          const parsed=parseHistory(await conceptsApi.history(participationId),participationId,eventId);if(!current(v,who))return;setJob(parsed.latestJob);setItems(parsed.items);setTotal(parsed.total);setNotice("Request outcome checked against saved job history. No generation request was replayed.");
        }throw value;
      }
    });
  }
  async function refreshJob(cancel=false){await operation(async(v,who)=>{
    if(!job)return;const parsed=parseJob(await (cancel?conceptsApi.cancel(job.id):conceptsApi.job(job.id)),participationId,eventId);if(!current(v,who))return;setJob(parsed);
    if(parsed.concept){const saved=parseHistory(await conceptsApi.history(participationId),participationId,eventId);if(!current(v,who))return;setItems(saved.items);setTotal(saved.total);setOffset(0);if(!dirtyRef.current)setConcept(parsed.concept);else setNotice("A new concept was saved. Your unsaved edits remain open; choose the new draft from history.");}
  });}
  // Active jobs are reread automatically. A tick is skipped while a user action holds the mutex, and its result
  // is discarded if one started meanwhile, so explicit Refresh/Cancel always win.
  const [toast,setToast]=useState<{message:string;severity:"success"|"error"}|null>(null),[pollTick,setPollTick]=useState(0);
  const activeJobId=active(job)?job!.id:null;
  useEffect(()=>{
    if(!activeJobId)return;
    const timer=setTimeout(async()=>{
      const v=epoch.current,who=actorRef.current?.id;
      if(!who||mutex.current){setPollTick(t=>t+1);return;}
      try{
        const parsed=parseJob(await conceptsApi.job(activeJobId),participationId,eventId);
        if(!current(v,who)||mutex.current)return;
        setJob(parsed);
        if(parsed.concept){const saved=parseHistory(await conceptsApi.history(participationId),participationId,eventId);if(!current(v,who))return;setItems(saved.items);setTotal(saved.total);setOffset(0);if(!dirtyRef.current)setConcept(parsed.concept);else setNotice("A new concept was saved. Your unsaved edits remain open; choose the new draft from history.");}
        if(parsed.state==="completed")setToast({message:"Your promotional concepts are ready.",severity:"success"});
        else if(parsed.state==="failed")setToast({message:"Concept generation failed. See the details on the page.",severity:"error"});
      }catch(value){if(current(v,who))failure(value);}
      finally{if(alive.current)setPollTick(t=>t+1);}
    },3000);
    return()=>clearTimeout(timer);
  },[activeJobId,pollTick]); // eslint-disable-line react-hooks/exhaustive-deps
  function edit(patch:Partial<Concept>){if(!concept)return;setConcept({...concept,...patch});setDirty(true);setDeleting(false);}
  async function save(){if(!concept)return;const submitted=concept;await operation(async(v,who)=>{
    try{const value=parseConcept(await conceptsApi.save(submitted.id,{expectedRevision:submitted.revision,posterCopySuggestions:submitted.posterCopySuggestions,freebieConcepts:submitted.freebieConcepts,layoutBrief:submitted.layoutBrief}),participationId);if(!current(v,who))return;setConcept(value);setItems(old=>old.map(c=>c.id===value.id?value:c));setDirty(false);setConflict(false);setNotice("Draft saved.");}
    catch(value){if(value instanceof ConceptError&&value.status===409&&current(v,who))setConflict(true);throw value;}
  });}
  async function remove(){if(!concept)return;const target=concept;await operation(async(v,who)=>{await conceptsApi.remove(target.id,target.revision);if(!current(v,who))return;setItems(old=>old.filter(c=>c.id!==target.id));setTotal(n=>Math.max(0,n-1));setConcept(null);setDirty(false);setDeleting(false);setNotice("Draft deleted locally. This does not delete copies held by the AI provider.");});}
  async function refreshFacts(){if(!concept)return;const target=concept;await operation(async(v,who)=>{
    const [rawEvents,source]=await Promise.all([applicationApi.events(businessId),readSources(participationId,eventId)]);if(!current(v,who))return;
    const summaries=parseEvents(rawEvents),sourceEvent=summaries.find(e=>e.eventId===eventId);if(!sourceEvent)throw new ConceptError(404,"not_found");
    const value=parseConcept(await conceptsApi.refreshFacts(target.id,{expectedRevision:target.revision,expectedEventRevision:sourceEvent.eventRevision,expectedSetupRevision:source.revision,factFields:selected}),participationId);if(!current(v,who))return;
    setEvents(summaries);setSetup(source);setConcept(value);setItems(old=>old.map(c=>c.id===value.id?value:c));setNotice("Selected sourced facts refreshed. Creative text remains unverified.");
  });}
  const choices=applications.filter(a=>a.businessId===businessId);
  return <Box>
    <Snackbar open={!!toast} autoHideDuration={8000} onClose={()=>setToast(null)} anchorOrigin={{vertical:"bottom",horizontal:"right"}}>
      {toast?<Alert severity={toast.severity} variant="filled" onClose={()=>setToast(null)}>{toast.message}</Alert>:undefined}
    </Snackbar>
    <Stack component="header" direction="row" justifyContent="space-between" sx={{p:3,borderBottom:1,borderColor:"divider",flexWrap:"wrap",gap:2}}><Button component={RouterLink} to="/business" sx={{whiteSpace:"nowrap"}}>Business workspace</Button><AppearanceControl/></Stack>
    <Stack component="main" spacing={3} sx={{p:{xs:2,md:4},maxWidth:1100,mx:"auto"}}>
      <Typography component="h1" variant="h2" data-page-heading tabIndex={-1}>Promotional concepts</Typography>
      <Typography>Private poster copy, freebie ideas and layout briefs for your event participation.</Typography>
      {error&&<Alert severity="error">{error}</Alert>}{notice&&<Alert severity="info">{notice}</Alert>}{busy&&<Alert role="status" severity="info">In progress</Alert>}
      <Stack direction={{xs:"column",sm:"row"}} spacing={2}>
        <TextField select label="Business" value={owner?businessId:""} disabled={busy} sx={{minWidth:200}} onChange={e=>selectRoute(e.target.value,"","")}>{owners.map(o=><MenuItem key={o.businessId} value={o.businessId}>{o.businessName}</MenuItem>)}</TextField>
        <TextField select label="Participation" value={chosen?participationId:""} disabled={busy} sx={{minWidth:250}} onChange={e=>{const a=choices.find(x=>x.participationId===e.target.value);if(a)selectRoute(businessId,a.eventId,a.participationId);}}>{choices.map(a=><MenuItem key={a.participationId} value={a.participationId}>{a.eventTitle}</MenuItem>)}</TextField>
        <Button disabled={busy} onClick={()=>{if(!dirty||window.confirm("Discard unsaved concept edits and reload?"))void load();}}>Reload saved state</Button>
      </Stack>
      {checking?<Typography role="status">Checking current access and saved concepts...</Typography>:chosen&&setup&&event?<>
        <Paper variant="outlined" sx={{p:3}}><Stack spacing={2}>
          <Typography component="h2" variant="h5">Generate a concept</Typography>
          <Alert severity="info">Generate sends your brief and only the selected event or published setup facts to the configured AI provider. Include only necessary information; your brief is not automatically scrubbed. Saved drafts remain until you delete them; jobs expire after 30 days. Provider retention is unverified.</Alert>
          <TextField label="Creative brief" multiline minRows={3} value={brief} disabled={busy} onChange={e=>setBrief(e.target.value)} helperText={`${Array.from(brief).length}/2000 characters`}/>
          <Typography component="h3" variant="subtitle1">Select sourced facts to share</Typography>
          {factFields.map(field=>{const value=field==="event.title"?event.title:field==="event.startsAt"?event.startsAt:field==="event.endsAt"?event.endsAt:field==="event.timezone"?event.timezone:field==="setup.boothLabel"?setup.boothLabel:setup.setupInstructions;const available=!field.startsWith("setup.")||setup.revision!==null&&value!==null;return <FormControlLabel key={field} control={<Checkbox checked={selected.includes(field)} disabled={busy||!available&&!selected.includes(field)} onChange={e=>setSelected(old=>e.target.checked?[...old,field]:old.filter(f=>f!==field))}/>} label={`${labels[field]}: ${available?value:"Unavailable"}`}/>;})}
          <Button variant="contained" disabled={busy||active(job)||!brief.trim()||Array.from(brief.trim()).length>2000} onClick={generate}>Generate concepts</Button>
          {active(job)&&<Typography>An AI request is active. Refresh its status or cancel it before generating again.</Typography>}
        </Stack></Paper>
        {job&&<Paper variant="outlined" sx={{p:2}}><Stack spacing={1}><Stack direction="row" spacing={1.5} alignItems="center">{active(job)&&<CircularProgress size={20} aria-hidden="true"/>}<Typography role="status">{jobText(job)}{active(job)&&" Checking automatically; the concepts appear here when they are ready."}</Typography></Stack><Stack direction="row" spacing={2}><Button disabled={busy} onClick={()=>refreshJob()}>Refresh status</Button>{active(job)&&<Button disabled={busy} onClick={()=>refreshJob(true)}>Cancel job</Button>}</Stack></Stack></Paper>}
        <Paper variant="outlined" sx={{p:3}}><Stack spacing={2}><Typography component="h2" variant="h5">Saved private drafts</Typography>{!items.length&&<Typography>No saved concepts yet.</Typography>}{items.map(c=><Button key={c.id} disabled={busy} onClick={()=>openConcept(c.id)} variant={concept?.id===c.id?"outlined":"text"}>Open draft from {new Date(c.createdAt).toLocaleString()} (revision {c.revision})</Button>)}<Stack direction="row" spacing={2}><Button disabled={busy||offset===0} onClick={()=>page(Math.max(0,offset-20))}>Previous drafts</Button><Button disabled={busy||offset+items.length>=total} onClick={()=>page(offset+20)}>More drafts</Button></Stack></Stack></Paper>
        {concept&&<Paper variant="outlined" sx={{p:3}}><Stack spacing={2}>
          <Typography component="h2" variant="h5">Edit private draft</Typography>
          <Alert severity="warning">Unverified creative suggestions. Review every claim before use, including your edits. Only the separate sourced facts below come from authoritative records.</Alert>
          {concept.posterCopySuggestions.map((copy,i)=><Stack key={i} spacing={1}><TextField label={`Poster copy ${i+1}`} multiline minRows={2} value={copy} disabled={busy} onChange={e=>edit({posterCopySuggestions:concept.posterCopySuggestions.map((c,n)=>n===i?e.target.value:c)})}/><Button disabled={busy} onClick={()=>edit({posterCopySuggestions:concept.posterCopySuggestions.filter((_,n)=>n!==i)})}>Remove poster copy {i+1}</Button></Stack>)}
          <Button disabled={busy||concept.posterCopySuggestions.length>=5} onClick={()=>edit({posterCopySuggestions:[...concept.posterCopySuggestions,"New creative suggestion"]})}>Add poster copy</Button>
          {concept.freebieConcepts.map((freebie,i)=><Stack key={i} spacing={1}><TextField label={`Freebie name ${i+1}`} value={freebie.name} disabled={busy} onChange={e=>edit({freebieConcepts:concept.freebieConcepts.map((f,n)=>n===i?{...f,name:e.target.value}:f)})}/><TextField label={`Freebie description ${i+1}`} multiline value={freebie.description} disabled={busy} onChange={e=>edit({freebieConcepts:concept.freebieConcepts.map((f,n)=>n===i?{...f,description:e.target.value}:f)})}/><Button disabled={busy} onClick={()=>edit({freebieConcepts:concept.freebieConcepts.filter((_,n)=>n!==i)})}>Remove freebie {i+1}</Button></Stack>)}
          <Button disabled={busy||concept.freebieConcepts.length>=10} onClick={()=>edit({freebieConcepts:[...concept.freebieConcepts,{name:"New freebie idea",description:"Describe this creative suggestion"}]})}>Add freebie concept</Button>
          <TextField label="Layout brief" multiline minRows={3} value={concept.layoutBrief} disabled={busy} onChange={e=>edit({layoutBrief:e.target.value})}/>
          {conflict&&<Alert severity="warning">Your unsaved text is preserved. Reopen the latest saved draft before saving again.</Alert>}
          <Stack direction="row" spacing={2}><Button variant="contained" disabled={busy||!dirty||conflict} onClick={save}>Save draft</Button><Button disabled={busy} onClick={()=>setDeleting(true)}>Delete draft</Button></Stack>
          <Typography component="h3" variant="h6">Authoritative source facts</Typography>
          {!concept.sourceFacts.length&&<Typography>No factual fields selected.</Typography>}
          {concept.sourceFacts.map(f=><Box key={f.field}><Typography fontWeight={600}>{labels[f.field]}: {f.status==="unavailable"?"Unavailable":f.value}</Typography><Typography variant="caption">{f.status}; observed revision {f.observedRevision}{f.currentRevision!==null?`, current revision ${f.currentRevision}`:""}</Typography></Box>)}
          <Typography variant="body2">Refresh uses the selected facts above and current source revisions. Save creative edits first.</Typography><Button disabled={busy||dirty} onClick={refreshFacts}>Refresh selected facts</Button>
        </Stack></Paper>}
      </>:null}
    </Stack>
    <Dialog open={deleting} onClose={()=>!busy&&setDeleting(false)}><DialogTitle>Delete private draft?</DialogTitle><DialogContent>This removes this saved concept from EventApp. Provider copies are outside local deletion.</DialogContent><DialogActions><Button disabled={busy} onClick={()=>setDeleting(false)}>Keep draft</Button><Button disabled={busy} color="error" onClick={remove}>Confirm delete</Button></DialogActions></Dialog>
  </Box>;
}
