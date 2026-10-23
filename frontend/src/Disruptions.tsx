import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Checkbox, Paper, Stack, TextField, Typography } from "@mui/material";
import { ApiError, programmeApi, type EventSummary, type ProgrammeItem } from "./api";
import { disruptionApi, disruptionError, type Announcement, type AnnouncementJob, type AnnouncementSourceFacts, type ProgrammeChange, type PublicationPreview } from "./disruptionApi";

export function ChangeFacts({change}: {change: ProgrammeChange | AnnouncementSourceFacts}) {
  const old = change.oldFacts, next = change.newFacts;
  const format = (instant: string) => new Intl.DateTimeFormat(undefined, {timeZone: next.event.timezone, dateStyle: "medium", timeStyle: "short"}).format(new Date(instant));
  return <Stack spacing={1} sx={{overflowWrap: "anywhere"}}>
    <Typography fontWeight={700}>{change.changeType === "cancelled" ? "Activity cancelled" : "Activity updated"} · Revision {change.fromRevision} → {change.toRevision}</Typography>
    <Typography>{old.title} → {next.title}</Typography>
    <Typography>{format(old.startsAt)} – {format(old.endsAt)} → {format(next.startsAt)} – {format(next.endsAt)} ({next.event.timezone})</Typography>
    <Typography>{old.venue.name} / {old.room.name} → {next.venue.name} / {next.room.name}</Typography>
    <Typography>Capacity: {old.capacity} → {next.capacity} · Price: SGD {(old.priceMinorUnits / 100).toFixed(2)} → {(next.priceMinorUnits / 100).toFixed(2)}</Typography>
    <Typography>Type: {old.type} → {next.type}</Typography>
    <Typography>Accessibility: {old.accessibilityDetails || "Unknown"} → {next.accessibilityDetails || "Unknown"}</Typography>
    {change.reason && <Typography>Reason: {change.reason}</Typography>}
  </Stack>;
}

export function ActivityDisruptions({event, item, blocked, onSaved}: {event: EventSummary; item: ProgrammeItem; blocked: boolean; onSaved: (item: ProgrammeItem) => void}) {
  const [history, setHistory] = useState<ProgrammeChange[]>([]), [total, setTotal] = useState(0);
  const [drafts, setDrafts] = useState<Announcement[]>([]), [draftTotal, setDraftTotal] = useState(0);
  const [draft, setDraft] = useState<Announcement | null>(null), [body, setBody] = useState("");
  const [preview, setPreview] = useState<PublicationPreview | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false), [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false), [loading, setLoading] = useState(true);
  const [job, setJob] = useState<AnnouncementJob | null>(null), [aiOpen, setAiOpen] = useState(false), [synthetic, setSynthetic] = useState(false);
  const requestId = useRef<string | null>(null), alive = useRef(true), lock = useRef(false);
  const latest = history.find((change) => change.toRevision === item.revision);
  const stale = !!draft && draft.changeId !== latest?.id;
  const dirty = !!draft && draft.body !== body;
  const active = job?.state === "pending" || job?.state === "running";
  const disabled = blocked || busy || uncertain;
  useEffect(() => {
    alive.current = true;
    Promise.all([disruptionApi.history(event.id, item.id), disruptionApi.drafts(event.id)])
      .then(([changes, announcements]) => {if (alive.current) {setHistory(changes.items); setTotal(changes.total); setDrafts(announcements.items); setDraftTotal(announcements.total);}})
      .catch((cause) => {if (alive.current) setError(disruptionError(cause));})
      .finally(() => {if (alive.current) setLoading(false);});
    return () => {alive.current = false;};
  }, [event.id, item.id, item.revision]);
  function adopt(value: Announcement) {setDraft(value); setBody(value.body); setPreview(null); setDrafts((prior) => [value, ...prior.filter((other) => other.id !== value.id)]);}
  async function run(operation: () => Promise<void>, mutation = true) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {await operation();} catch (cause) {if (alive.current) {setError(disruptionError(cause)); if (mutation && cause instanceof ApiError && (cause.status === 0 || cause.status >= 500)) setUncertain(true);}}
    finally {lock.current = false; if (alive.current) setBusy(false);}
  }
  async function checkJob() {
    if (!job) return;
    const next = await disruptionApi.job(job.id);
    if (!alive.current) return;
    setJob(next);
    if (next.state === "completed" && next.announcementDraftId) {
      const result = await disruptionApi.draft(event.id, next.announcementDraftId);
      if (alive.current) adopt(result);
    }
  }
  useEffect(() => {
    if (!active || !job) return;
    let stopped = false, failures = 0;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {await checkJob(); failures = 0;} catch {failures++; if (!stopped) setError("AI status is temporarily unavailable. Use Check AI job to restore its saved state.");}
      if (!stopped && failures < 3) timer = setTimeout(poll, 1500);
    }
    timer = setTimeout(poll, 1000);
    return () => {stopped = true; clearTimeout(timer);};
  }, [job?.id, job?.state]);
  return <Paper component="section" variant="outlined" sx={{p: {xs: 2, md: 3}}}><Stack spacing={3}>
    <Typography component="h2" variant="h2">Changes and announcements</Typography>
    {item.state === "published" && <Button color="error" variant="outlined" disabled={disabled} onClick={() => setCancelOpen(true)} sx={{alignSelf: "start"}}>Cancel activity</Button>}
    {error && <Alert severity="warning">{error}</Alert>}
    <Button disabled={busy || blocked} onClick={() => void run(async () => {
      const current = await programmeApi.item(event.id, item.id);
      const [changes, announcements] = await Promise.all([disruptionApi.history(event.id, item.id), disruptionApi.drafts(event.id)]);
      if (!alive.current) return;
      setHistory(changes.items); setTotal(changes.total); setDrafts(announcements.items); setDraftTotal(announcements.total);
      if (draft) {const saved = await disruptionApi.draft(event.id, draft.id); if (!alive.current) return; adopt(saved);}
      setUncertain(false); if (current.revision !== item.revision) onSaved(current);
    }, false)} sx={{alignSelf: "start"}}>Reload saved state</Button>
    <Typography component="h3" variant="h3">Change history</Typography>
    {loading ? <Typography role="status">Loading changes…</Typography> : !history.length ? <Typography color="text.secondary">No changes since publication.</Typography> : history.map((change) => <Paper key={change.id} variant="outlined" sx={{p: 2}}><ChangeFacts change={change}/>{change.recipientSnapshotStatus === "blocked_f02" && <Typography variant="body2" color="text.secondary" sx={{mt: 2}}>Personal notifications pending F02 integration. No recipient snapshot was captured.</Typography>}</Paper>)}
    {history.length < total && <Button disabled={disabled} onClick={() => void run(async () => {const page = await disruptionApi.history(event.id, item.id, history.length); if (alive.current) setHistory((values) => [...values, ...page.items]);}, false)}>Load older changes</Button>}
    <Box><Typography component="h3" variant="h3">Disruption announcement</Typography><Typography color="text.secondary" sx={{mt: 1}}>Published announcements are visible to signed-in attendees. They do not replace personal notifications.</Typography></Box>
    {!latest && <Typography color="text.secondary">Save a programme change before creating an announcement.</Typography>}
    <Stack direction="row" sx={{gap: 2, flexWrap: "wrap"}}><Button disabled={disabled || !latest} onClick={() => {setDraft(null); setBody(""); setPreview(null);}}>New manual draft</Button><Button disabled={disabled || !latest || active} onClick={() => {setSynthetic(false); setAiOpen(true);}}>Generate AI draft</Button></Stack>
    <Stack direction="row" sx={{gap: 1, flexWrap: "wrap"}}>{drafts.filter((value) => history.some((change) => change.id === value.changeId)).map((value) => <Button key={value.id} disabled={disabled} onClick={() => adopt(value)}>Open {value.state} · revision {value.revision}</Button>)}</Stack>
    {drafts.length < draftTotal && <Button disabled={disabled} onClick={() => void run(async () => {const page = await disruptionApi.drafts(event.id, drafts.length); if (alive.current) setDrafts((values) => [...values, ...page.items]);}, false)}>Load older drafts</Button>}
    {latest && <>
      {draft?.sourceFacts && <Paper variant="outlined" sx={{p: 2}}><Typography fontWeight={700} sx={{mb: 1}}>Verified source facts</Typography><ChangeFacts change={draft.sourceFacts}/></Paper>}
      {stale && <Alert severity="warning">This draft references an older programme change. Create a new draft for the current revision.</Alert>}
      <TextField label="Announcement text" value={body} onChange={(e) => {setBody(e.target.value); setPreview(null);}} multiline minRows={4} disabled={disabled || draft?.state === "published"} helperText="Editorial wording requires human review. Verified source facts are displayed separately. Maximum 3,000 characters." slotProps={{htmlInput: {maxLength: 3000}}}/>
      <Stack direction="row" sx={{gap: 2, flexWrap: "wrap"}}><Button disabled={disabled || stale || draft?.state === "published" || !body.trim() || body.trim().length > 3000} onClick={() => void run(async () => {const saved = await disruptionApi.save(event.id, latest.id, body, draft); if (alive.current) adopt(saved);})}>Save announcement draft</Button><Button disabled={disabled || !draft || dirty || stale || draft.state === "published"} onClick={() => void run(async () => {const value = await disruptionApi.preview(event.id, draft!); if (alive.current) setPreview(value);})}>Preview publication</Button></Stack>
    </>}
    {job && <><Typography role="status">AI announcement: {job.state}</Typography>{job.state === "failed" && <Alert severity="warning">The AI draft could not be completed. Check source freshness/configuration or write a draft manually.</Alert>}{job.state === "cancelled" && job.providerMayHaveRun && <Alert severity="info">The request may already have used provider credits. Its late result will be discarded.</Alert>}<Stack direction="row" sx={{gap: 2}}><Button onClick={() => void run(checkJob, false)} disabled={busy}>Check AI job</Button>{active && <Button disabled={busy} onClick={() => void run(async () => {const next = await disruptionApi.cancelJob(job.id); if (alive.current) setJob(next);})}>Cancel AI draft</Button>}</Stack></>}
    {draft?.state === "published" && <Chip label="Announcement published" color="success" sx={{alignSelf: "start"}}/>}
    <Dialog open={cancelOpen} onClose={() => !busy && setCancelOpen(false)} aria-labelledby="cancel-activity-title" fullWidth><DialogTitle id="cancel-activity-title">Cancel activity?</DialogTitle><DialogContent><Stack spacing={2} sx={{pt: 1}}><Typography>{item.title} · revision {item.revision}. Cancellation is final; existing itinerary references remain.</Typography><TextField label="Cancellation reason" value={reason} onChange={(e) => setReason(e.target.value)} multiline required slotProps={{htmlInput: {maxLength: 1000}}}/></Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setCancelOpen(false)}>Keep activity</Button><Button color="error" disabled={disabled || !reason.trim() || reason.trim().length > 1000} onClick={() => void run(async () => {const next = await disruptionApi.cancel(event.id, item, reason); if (alive.current) {setCancelOpen(false); onSaved(next);}})}>Confirm cancellation</Button></DialogActions></Dialog>
    <Dialog open={!!preview} onClose={() => !busy && setPreview(null)} aria-labelledby="announcement-preview-title" fullWidth><DialogTitle id="announcement-preview-title">Approve announcement publication?</DialogTitle><DialogContent><Stack spacing={2}><Typography>Audience: all signed-in attendees of this event. Approval expires at {preview?.expiresAt}.</Typography><Typography sx={{whiteSpace: "pre-wrap"}}>{preview?.body}</Typography>{draft?.sourceFacts && <ChangeFacts change={draft.sourceFacts}/>}</Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setPreview(null)}>Keep editing</Button><Button disabled={disabled || !preview || !draft || Date.parse(preview.expiresAt) <= Date.now()} onClick={() => void run(async () => {const saved = await disruptionApi.publish(event.id, draft!, preview!); if (alive.current) adopt(saved);})}>Approve and publish</Button></DialogActions></Dialog>
    <Dialog open={aiOpen} onClose={() => !busy && setAiOpen(false)} aria-labelledby="announcement-ai-title" fullWidth><DialogTitle id="announcement-ai-title">Generate AI announcement draft?</DialogTitle><DialogContent><Typography>Only verified programme-change facts are sent to SoCLaaS. This uses provider credits and never publishes automatically.</Typography><FormControlLabel control={<Checkbox checked={synthetic} onChange={(e) => setSynthetic(e.target.checked)}/>} label="I confirm this event and its programme contain invented data only."/></DialogContent><DialogActions><Button disabled={busy} onClick={() => setAiOpen(false)}>Cancel</Button><Button disabled={disabled || !synthetic || !latest} onClick={() => void run(async () => {requestId.current ??= crypto.randomUUID(); const next = await disruptionApi.generate(event.id, latest!.id, requestId.current); if (alive.current) {setJob(next); setAiOpen(false); requestId.current = null;}})}>Start AI draft</Button></DialogActions></Dialog>
  </Stack></Paper>;
}
