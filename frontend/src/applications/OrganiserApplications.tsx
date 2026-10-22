import { displayDate } from "../displayDate";
import { useEffect, useRef, useState } from "react";
import { Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Paper, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../Auth";
import { applicationApi, ApiError } from "../api";
import { application, events, feedback, settings, uncertain, type Application, type ApplicationSettings, type OrganiserDraftMemory, type OrganiserEvent } from "./model";
import { ApplicationLayout, ContentSummary, Feedback, Frozen, useFeedback } from "./shared";
import ApplicationAnalysis from "./ApplicationAnalysis";
import { SetupDetails } from "../setup/SetupDetails";
export function OrganiserApplications() {
  const { actor, revalidate, destinations, organiserMemory, setupMemory } = useAuth();
  const location = useLocation(), navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const applicationId = query.get("applicationId");
  const tab = location.hash === "#analysis" ? "analysis" : "review";
  function tabPath(value: string, id = applicationId, nextEvent = eventId) {
    const params = new URLSearchParams({eventId: nextEvent});
    if (id) params.set("applicationId", id);
    return `/organiser/applications?${params}#${value}`;
  }
  const eventId = query.get("eventId") ?? actor!.eventMemberships[0]?.eventId ?? "";
  const assigned = actor!.eventMemberships.some((item) => item.eventId === eventId && item.status === "active" && item.role === "organiser");
  const memoryKey = `${actor!.id}:${eventId}`;
  const draft = useRef<OrganiserDraftMemory | null>(null);
  const [summaries, setSummaries] = useState<OrganiserEvent[]>([]), [records, setRecords] = useState<Application[]>([]), [selected, setSelected] = useState<Application | null>(null);
  const [savedSettings, setSavedSettings] = useState<ApplicationSettings | null>(null), [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<"settings" | "accepted" | "rejected" | null>(null);
  const [reason, setReason] = useState(""), [reasonError, setReasonError] = useState("");
  const [setupDirty, setSetupDirty] = useState(false);
  const [busy, setBusy] = useState(false), [unknown, setUnknown] = useState<"settings" | "decision" | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const epoch = useRef(0), lock = useRef(false);
  const { status, start, finish } = useFeedback();
  const event = summaries.find((item) => item.eventId === eventId);
  function denied(error: unknown) {
    if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
      organiserMemory.delete(memoryKey); draft.current = null;
      for (const key of setupMemory.keys()) if (key.startsWith(`${actor!.id}:${eventId}:`)) setupMemory.delete(key);
      setSelected(null); setRecords([]); setSavedSettings(null); setReason(""); setConfirmation(null); setUnknown(null);
      if (error.status !== 404) revalidate();
    }
  }
  function adopt(value: Application) {
    setSelected(value); setRecords((prior) => prior.map((item) => item.id === value.id ? value : item));
    if (value.decision) {draft.current?.reasons.delete(value.id); setReason("");}
  }
  function changeOpen(value: boolean) {
    if (draft.current) {draft.current.intendedOpen = value; draft.current.settingsDirty = value !== savedSettings?.applicationsOpen;}
    setOpen(value);
  }
  function changeReason(value: string) {
    if (selected) draft.current?.reasons.set(selected.id, value);
    setReason(value); setReasonError("");
  }
  function changeContext(path: string) {
    if (draft.current?.settingsDirty || setupDirty) {setDestination(path); return;}
    organiserMemory.delete(memoryKey); navigate(path);
  }
  useEffect(() => {
    const generation = ++epoch.current; let active = true;
    setSummaries([]); setRecords([]); setSelected(null); setSavedSettings(null); start();
    // An explicit event/application departure purges old private input, including history navigation.
    for (const key of organiserMemory.keys()) if (key !== memoryKey) organiserMemory.delete(key);
    const model = organiserMemory.get(memoryKey) ?? {settingsDirty: false, reasons: new Map<string, string>()};
    for (const id of model.reasons.keys()) if (id !== query.get("applicationId")) model.reasons.delete(id);
    if (model.operation?.kind === "decision" && model.operation.applicationId !== query.get("applicationId")) model.operation = undefined;
    organiserMemory.set(memoryKey, model); draft.current = model;
    setReason(""); setUnknown(null);
    if (!assigned) { organiserMemory.delete(memoryKey); draft.current = null; finish("Access denied - This account cannot access this event. Return to your workspace."); return; }
    destinations.set("organiser", location.pathname + location.search);
    (async () => {
      try {
        const named = events(await applicationApi.organiserEvents(), true).filter((item) => actor!.eventMemberships.some((membership) => membership.eventId === item.eventId && membership.status === "active" && membership.role === "organiser"));
        if (!active || epoch.current !== generation) return;
        setSummaries(named);
        if (!query.has("eventId")) { navigate(tabPath(tab), {replace: true}); }
        if (!named.some((item) => item.eventId === eventId)) throw new ApiError(403, "Access is not permitted.", "forbidden");
        const [list, setting] = await Promise.all([applicationApi.reviews(eventId), applicationApi.settings(eventId)]);
        if (!active || epoch.current !== generation) return;
        if (!Array.isArray(list)) throw new ApiError(502, "Invalid response.");
        const parsed = list.map((value) => application(value, {eventId, submitted: true}));
        const validated = settings(setting, eventId);
        const id = query.get("applicationId");
        if (id) {
          const detail = application(await applicationApi.review(eventId, id), {eventId, id, submitted: true});
          if (!active || epoch.current !== generation) return;
          const setupKey = `${actor!.id}:${eventId}:${detail.participationId}`;
          for (const key of setupMemory.keys()) if (key.startsWith(`${actor!.id}:`) && key !== setupKey) setupMemory.delete(key);
          setSelected(detail);
          if (detail.decision) model.reasons.delete(id);
          else setReason(model.reasons.get(id) ?? "");
        }
        setRecords(parsed); setSavedSettings(validated);
        setOpen(model.settingsDirty && model.intendedOpen !== undefined ? model.intendedOpen : validated.applicationsOpen);
        setUnknown(model.operation?.kind ?? null);
        finish(model.operation ? "Outcome not confirmed - check the original operation before any further write." : parsed.length || id ? "" : "No results - no submitted applications for this event.");
      } catch (error) { if (active && epoch.current === generation) { finish(feedback(error)); denied(error); } }
    })();
    return () => { active = false; epoch.current++; };
  }, [eventId, applicationId, actor!.id]);
  async function readOutcome(kind: "settings" | "decision", conflict = false) {
    if (lock.current) return;
    if (draft.current?.operation?.inFlight) {finish("Outcome not confirmed - the original request is still in progress. Check again after it settles."); return;}
    const generation = epoch.current; lock.current = true; setBusy(true); start();
    try {
      if (kind === "settings") {
        const latest = settings(await applicationApi.settings(eventId), eventId);
        if (epoch.current !== generation) return;
        setSavedSettings(latest); setUnknown(null);
        if (draft.current) {draft.current.operation = undefined; draft.current.settingsDirty = latest.applicationsOpen !== open;}
        finish(latest.applicationsOpen === open ? "Completed - authoritative application settings retrieved." : "Outcome not confirmed - the latest settings do not match your intended choice. Your choice is retained; review it before saving again.");
      } else if (selected) {
        const latest = application(await applicationApi.review(eventId, selected.id), {eventId, id: selected.id, submitted: true});
        if (epoch.current !== generation) return;
        adopt(latest); setUnknown(null); if (draft.current) draft.current.operation = undefined;
        finish(latest.decision ? (conflict ? "Changed elsewhere - Application already has a decision. The current decision is shown." : "Completed - authoritative decision retrieved.") : conflict ? "Changed elsewhere - Application revision changed. Review the latest application before deciding." : "Outcome not confirmed - no decision is recorded. Review the latest application before deciding.");
      }
    } catch (error) { if (epoch.current === generation) { finish("Outcome not confirmed - the server result could not be confirmed. Check outcome again."); denied(error); } }
    finally { if (epoch.current === generation) { lock.current = false; setBusy(false); } }
  }
  async function confirm() {
    if (lock.current || unknown || draft.current?.operation || !confirmation || !savedSettings) return;
    const kind = confirmation === "settings" ? "settings" : "decision";
    const outcome = confirmation;
    const message = reason.trim();
    if (kind === "decision" && ((outcome === "rejected" && !message) || Array.from(message).length > 1000)) { setReasonError("Enter a reason using 1-1,000 characters for rejection; approval reasons are optional up to 1,000 characters."); return; }
    if (kind === "decision" && (!selected || selected.status !== "submitted")) return;
    const generation = epoch.current; lock.current = true; setBusy(true); start();
    const model = draft.current;
    const operation: NonNullable<OrganiserDraftMemory["operation"]> = {kind, applicationId: kind === "decision" ? selected!.id : undefined, inFlight: true};
    if (model) model.operation = operation;
    let conflict = false;
    try {
      if (kind === "settings") {
        const latest = settings(await applicationApi.saveSettings(eventId, savedSettings.revision, open), eventId);
        if (epoch.current !== generation) return;
        setSavedSettings(latest); setOpen(latest.applicationsOpen);
        if (model) {model.settingsDirty = false; model.intendedOpen = latest.applicationsOpen;}
      } else {
        const before = selected!;
        const latest = application(await applicationApi.decide(eventId, before.id, before.revision, outcome as "accepted" | "rejected", message || null), {eventId, businessId: before.businessId, id: before.id, submitted: true});
        if (epoch.current !== generation) return;
        if (latest.status !== outcome || latest.revision !== before.revision + 1 || latest.frozenSubmittedContentRevision !== before.frozenSubmittedContentRevision || latest.submittedAt !== before.submittedAt || JSON.stringify(latest.content) !== JSON.stringify(before.content)) throw new ApiError(502, "Invalid response.");
        adopt(latest); setReason("");
      }
      setConfirmation(null); finish("Completed");
      if (model) model.operation = undefined;
    } catch (error) {
      if (epoch.current !== generation) return;
      if (uncertain(error)) { setUnknown(kind); setConfirmation(null); finish("Outcome not confirmed - the server result could not be confirmed. Check outcome before trying again."); }
      else {
        if (model) model.operation = undefined;
        finish(feedback(error));
        if (error instanceof ApiError && error.status === 422 && error.fields.includes("reason")) setReasonError("Check the decision reason: rejection requires 1-1,000 characters."); else setConfirmation(null);
        conflict = kind === "decision" && error instanceof ApiError && ["revision_conflict", "application_decided"].includes(error.code);
        if (conflict && error instanceof ApiError) {
          try {
            const current = application(error.currentApplication, {eventId, businessId: selected!.businessId, id: selected!.id, submitted: true});
            adopt(current);
          } catch { conflict = false; if (model) model.operation = operation; setUnknown("decision"); finish("Temporarily unavailable - Invalid response. Check outcome to retrieve the latest application."); }
        }
        denied(error);
      }
    } finally { operation.inFlight = false; if (epoch.current === generation) { lock.current = false; setBusy(false); if (conflict) void readOutcome("decision", true); } }
  }
  return <ApplicationLayout title="Applications" role="organiser" dirty={!!draft.current?.settingsDirty || setupDirty}><Stack spacing={4}>
    <Paper variant="outlined" sx={{p: {xs: 2, md: 3}}}><Stack spacing={2}>
    <TextField label="Event" select value={event ? eventId : ""} onChange={(e) => changeContext(tabPath(tab, null, e.target.value))} slotProps={{select: {native: true}, inputLabel: {shrink: true}}}>{summaries.map((item) => <option key={item.eventId} value={item.eventId}>{item.title}</option>)}</TextField>
    {event && <Typography>{displayDate(event.startsAt, event.timezone)} - {displayDate(event.endsAt, event.timezone)} ({event.timezone})</Typography>}
    <Feedback status={status} />
    {unknown && <Button disabled={busy} onClick={() => readOutcome(unknown)}>Check outcome</Button>}
    {savedSettings && <Box><FormControlLabel control={<Checkbox checked={open} disabled={busy || !!unknown} onChange={(e) => changeOpen(e.target.checked)} />} label="Accepting applications" /><Stack direction="row" sx={{gap: 2, flexWrap: "wrap"}}><Button disabled={busy || !!unknown} onClick={() => setConfirmation("settings")}>Save application settings</Button>{/settings.*changed/i.test(status) && <Button disabled={busy} onClick={() => readOutcome("settings")}>Refresh application settings</Button>}</Stack></Box>}
    </Stack></Paper>
    <Box sx={{display: "grid", gridTemplateColumns: {xs: "minmax(0, 1fr)", lg: "280px minmax(0, 1fr)"}, gap: 4, alignItems: "start"}}>
    {savedSettings && <Paper component="aside" variant="outlined" sx={{p: 2, minWidth: 0}}><Typography component="h2" variant="h2" sx={{mb: 2}}>Submitted applications</Typography><Stack spacing={2}>{records.map((record) => <Box key={record.id} sx={{border: 1, borderColor: selected?.id === record.id ? "primary.main" : "divider", borderRadius: 2, p: 2, overflowWrap: "anywhere"}}><Stack spacing={1}><Typography fontWeight={700}>{record.businessName}</Typography><Chip label={record.status} size="small" sx={{alignSelf: "start"}}/><Button aria-current={selected?.id === record.id ? "true" : undefined} onClick={() => changeContext(tabPath(tab, record.id))}>View application</Button></Stack></Box>)}</Stack></Paper>}
    <Box sx={{minWidth: 0}}>
    <Tabs value={tab} onChange={(_, value: string) => navigate(tabPath(value))} aria-label="Application workspace" variant="fullWidth" sx={{borderBottom: 1, borderColor: "divider", mb: 3}}><Tab id="application-review-tab" aria-controls="application-review-panel" value="review" label="Application Review"/><Tab id="application-analysis-tab" aria-controls="application-analysis-panel" value="analysis" label="AI Analysis"/></Tabs>
    {!selected && <Paper variant="outlined" sx={{p: 4}}><Typography variant="h2">Choose an application</Typography><Typography color="text.secondary" sx={{mt: 2}}>Select a submitted application to {tab === "analysis" ? "review its rubric and AI reports" : "inspect its details and make a decision"}.</Typography></Paper>}
    {selected && <>
    <Box role="tabpanel" id="application-review-panel" aria-labelledby="application-review-tab" hidden={tab !== "review"}><Stack spacing={3}><Paper variant="outlined" sx={{p: {xs: 2, md: 3}}}><Frozen value={selected}/><Typography color="text.secondary" sx={{mt: 2}}>Record revision: {selected.revision}</Typography></Paper><Paper variant="outlined" sx={{p: {xs: 2, md: 3}}}><Typography variant="h2" component="h2" sx={{mb: 2}}>Application decision</Typography>{selected.status === "submitted" ? <Stack direction="row" sx={{gap: 2, flexWrap: "wrap"}}><Button variant="contained" disabled={busy || !!unknown} onClick={() => {setConfirmation("accepted"); setReasonError("");}}>Approve application</Button><Button variant="outlined" disabled={busy || !!unknown} onClick={() => {setConfirmation("rejected"); setReasonError("");}}>Reject application</Button></Stack> : <Typography>This application has already been {selected.status}. Its decision is final.</Typography>}</Paper>{selected.status === "accepted" && <SetupDetails mode="organiser" eventId={selected.eventId} participationId={selected.participationId} onDirtyChange={setSetupDirty} />}</Stack></Box>
    <Box role="tabpanel" id="application-analysis-panel" aria-labelledby="application-analysis-tab" hidden={tab !== "analysis"}><Typography variant="h2" sx={{mb: 2}}>{selected.businessName}</Typography><ApplicationAnalysis key={`${eventId}:${selected.id}`} eventId={eventId} applicationId={selected.id} submittedRevision={selected.frozenSubmittedContentRevision!} onManualReview={() => navigate(tabPath("review"))}/></Box>
    </>}
    </Box></Box>
  </Stack>
  {confirmation && <Dialog open transitionDuration={0} onClose={() => !busy && setConfirmation(null)} aria-labelledby="confirmation-title" fullWidth maxWidth="sm"><DialogTitle id="confirmation-title">{confirmation === "settings" ? "Confirm application settings" : "Confirm decision"}</DialogTitle><DialogContent sx={{overflowWrap: "anywhere"}}>
    <Typography>Event: {event?.title}</Typography>
    {confirmation === "settings" ? <Typography>Applications will be {open ? "open" : "closed"}.</Typography> : selected && <><Typography>Business: {selected.businessName}</Typography><Typography>Outcome: {confirmation === "accepted" ? "Accepted" : "Rejected"}. This decision is final.</Typography><Typography>Record revision: {selected.revision}; frozen content revision: {selected.frozenSubmittedContentRevision}</Typography><ContentSummary value={selected} /><TextField fullWidth margin="normal" label="Decision reason" value={reason} onChange={(e) => changeReason(e.target.value)} error={!!reasonError} helperText={reasonError || (confirmation === "rejected" ? "Required. Use 1-1,000 characters. Shared with the applicant." : "Optional. Maximum 1,000 characters. Shared with the applicant.")} multiline slotProps={{htmlInput: {"aria-required": confirmation === "rejected"}}} /></>}
  </DialogContent><DialogActions sx={{flexWrap: "wrap"}}><Button disabled={busy} onClick={() => setConfirmation(null)}>Cancel</Button><Button disabled={busy} onClick={confirm}>{confirmation === "settings" ? "Confirm settings" : confirmation === "accepted" ? "Confirm approval" : "Confirm rejection"}</Button></DialogActions></Dialog>}
  {destination !== null && <Dialog open transitionDuration={0} onClose={() => setDestination(null)} aria-labelledby="organiser-unsaved-title"><DialogTitle id="organiser-unsaved-title">Unsaved input</DialogTitle><DialogContent>Changing event or application clears private unsaved input for the current context.</DialogContent><DialogActions><Button onClick={() => setDestination(null)}>Stay</Button><Button onClick={() => {const path = destination; organiserMemory.delete(memoryKey); if (selected) setupMemory.delete(`${actor!.id}:${eventId}:${selected.participationId}`); setSetupDirty(false); setDestination(null); navigate(path);}}>Continue and discard input</Button></DialogActions></Dialog>}
  </ApplicationLayout>;
}
