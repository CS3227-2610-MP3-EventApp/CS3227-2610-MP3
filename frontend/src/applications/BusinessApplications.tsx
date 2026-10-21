import { memo, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../Auth";
import { applicationApi, ApiError } from "../api";
import { application, blank, events as parseEvents, feedback, labels, limits, uncertain, validate, type Application, type ApplicationEvent, type Content, type DraftMemory, type PendingOperation } from "./model";
import { ApplicationLayout, ContentSummary, Feedback, Frozen, useFeedback } from "./shared";
import { SetupDetails } from "../setup/SetupDetails";
const ContentField = memo(function ContentField({ field, value, error, edit }: { field: keyof typeof limits; value: string; error?: string; edit: (field: keyof Content, value: string) => void }) {
  return <TextField id={`application-${field}`} name={field} label={labels[field]} value={value} onChange={(event) => edit(field, event.target.value)} multiline={field === "description" || field === "requestedSpace"} rows={field === "description" ? 3 : field === "requestedSpace" ? 2 : undefined} type={field === "contactEmail" ? "email" : "text"} autoComplete="off" error={!!error} helperText={error ?? `Required. Maximum ${limits[field]} characters after trimming.`} slotProps={{ input: { inputComponent: field === "description" || field === "requestedSpace" ? "textarea" : "input" }, htmlInput: { "aria-required": true, rows: field === "description" ? 3 : field === "requestedSpace" ? 2 : undefined } }} />;
});
type Operation = PendingOperation;
export function BusinessApplications() {
  const { actor, memory, destinations, revalidate } = useAuth();
  const location = useLocation(), navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const businesses = actor!.businessMemberships.filter((value) => value.status === "active" && value.role === "owner");
  const businessId = query.get("businessId") ?? businesses[0]?.businessId ?? "";
  const owned = businesses.some((value) => value.businessId === businessId);
  const [eventList, setEventList] = useState<ApplicationEvent[]>([]);
  const [eventId, setEventId] = useState(query.get("eventId") ?? "");
  const [draft, setDraft] = useState<DraftMemory | null>(null);
  const [, render] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<keyof Content, string>>>({});
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [reading, setReading] = useState(false);
  const [switchTo, setSwitchTo] = useState<string | null>(null);
  const epoch = useRef(0), lock = useRef(false), operation = useRef<Operation | null>(null);
  const { status, start, finish } = useFeedback();
  const visible = owned && !!draft && eventList.some((event) => event.eventId === eventId);
  function repaint() { render((value) => value + 1); }
  function denied(error: unknown) { if (error instanceof ApiError && (error.status === 401 || error.status === 403)) { memory.clear(); revalidate(); } }
  useEffect(() => {
    const current = ++epoch.current;
    let active = true;
    setDraft(null); setEventList([]); start();
    const prefix = `${actor!.id}:business:${businessId}:`;
    const explicitEvent = query.get("eventId");
    // A selected scope change is authoritative even when its discovery is empty or denied.
    for (const key of memory.keys()) if (!key.startsWith(prefix) || explicitEvent !== null && key !== `${prefix}${explicitEvent}`) memory.delete(key);
    if (!owned) { finish("Access denied"); return; }
    destinations.set("business", location.pathname + location.search);
    (async () => {
      try {
        const discovered = parseEvents(await applicationApi.events(businessId));
        if (!active || epoch.current !== current) return;
        setEventList(discovered);
        const chosen = query.get("eventId") ?? discovered[0]?.eventId ?? "";
        setEventId(chosen);
        if (!chosen && discovered.length === 0) { for (const key of memory.keys()) if (key.startsWith(prefix)) memory.delete(key); finish("No results — no open events or existing applications for this business."); return; }
        const event = discovered.find((value) => value.eventId === chosen);
        if (!event) { finish("Access denied — event not available for this business."); return; }
        const key = `${actor!.id}:business:${businessId}:${chosen}`;
        for (const previous of memory.keys()) if (previous !== key) memory.delete(previous);
        if (!query.has("businessId") || !query.has("eventId")) {
          const canonical = new URLSearchParams({ businessId, eventId: chosen });
          const applicationId = query.get("applicationId");
          if (applicationId) canonical.set("applicationId", applicationId);
          navigate(`/business/applications?${canonical}`, { replace: true });
          return;
        }
        const existing = memory.get(key);
        const model: DraftMemory = existing ?? { values: blank(), saved: null, dirty: false, editEpoch: 0, uncertain: false };
        memory.set(key, model);
        const id = query.get("applicationId") ?? event.applicationId;
        if (id) {
          const inputEpoch = model.editEpoch;
          const saved = application(await applicationApi.get(id), { businessId, eventId: chosen, id });
          if (!active || epoch.current !== current) return;
          model.saved = saved;
          if (saved.status !== "draft") { model.uncertain = false; model.operation = undefined; }
          if (saved.status !== "draft" || !model.dirty && model.editEpoch === inputEpoch) { model.values = { ...saved.content }; model.dirty = false; }
        }
        if (!active || epoch.current !== current) return;
        operation.current = model.operation ?? null;
        setDraft(model); finish(model.uncertain ? "Outcome not confirmed — check the original operation before any further write." : "");
      } catch (error) { if (active && epoch.current === current) { finish(feedback(error)); denied(error); } }
    })();
    return () => { active = false; epoch.current++; };
  }, [businessId, location.search, actor!.id]);
  function changeScope(path: string) {
    if (draft?.dirty) { setSwitchTo(path); return; }
    memory.clear(); navigate(path);
  }
  function chooseBusiness(id: string) { changeScope(`/business/applications?businessId=${encodeURIComponent(id)}`); }
  function chooseEvent(id: string) { changeScope(`/business/applications?businessId=${encodeURIComponent(businessId)}&eventId=${encodeURIComponent(id)}`); }
  const change = useCallback((field: keyof Content, value: string) => {
    if (!draft || draft.saved && draft.saved.status !== "draft") return;
    draft.values = { ...draft.values, [field]: value }; draft.dirty = true; draft.editEpoch++; setErrors((previous) => previous[field] ? ({ ...previous, [field]: undefined }) : previous); repaint();
  }, [draft]);
  function adopt(saved: Application, inputEpoch: number) {
    if (!draft) return;
    draft.saved = saved; draft.uncertain = false; draft.operation = undefined;
    if (saved.status !== "draft" || draft.editEpoch === inputEpoch) { draft.values = { ...saved.content }; draft.dirty = false; }
    repaint();
  }
  async function reconcile(original: Operation, generation: number) {
    if (!draft || lock.current) return;
    if (original.inFlight) { finish("Outcome not confirmed — the original request is still in progress. Check again after it settles."); return; }
    lock.current = true; setReading(true);
    try {
      let id = original.id;
      if (!id) {
        const list = await applicationApi.list(businessId);
        if (epoch.current !== generation) return;
        if (!Array.isArray(list)) throw new ApiError(502, "Invalid response.");
        const matches = list.map((item) => application(item, { businessId })).filter((item) => item.eventId === eventId);
        if (matches.length > 1) throw new ApiError(502, "Invalid response.");
        id = matches[0]?.id;
      }
      if (!id) { draft.uncertain = false; repaint(); finish("Outcome not confirmed. No saved application was found. Review your input before saving again."); return; }
      const saved = application(await applicationApi.get(id), { businessId, eventId, id });
      if (epoch.current !== generation) return;
      const committed = saved.status !== "draft" || original.kind === "create" || original.kind === "edit" && saved.revision > original.revision && (Object.keys(labels) as (keyof Content)[]).every((field) => saved.content[field] === original.content[field]);
      if (committed) { adopt(saved, original.inputEpoch); finish("Completed — authoritative saved application retrieved."); }
      else { draft.saved = saved; draft.uncertain = false; repaint(); finish(saved.revision > original.revision ? "Changed elsewhere — your input is retained. Refresh the saved draft to compare." : "Outcome not confirmed. The latest saved draft does not confirm this operation; review before trying again."); }
    } catch (error) { if (epoch.current === generation) { finish("Outcome not confirmed — unable to retrieve authoritative state."); denied(error); } }
    finally { if (epoch.current === generation) { lock.current = false; setReading(false); } }
  }
  async function mutate(kind: Operation["kind"]) {
    if (!draft || lock.current || draft.uncertain || draft.saved && draft.saved.status !== "draft") return;
    if (kind !== "submit") {
      const invalid = validate(draft.values); setErrors(invalid);
      if (Object.keys(invalid).length) { finish("Needs correction"); document.getElementById(`application-${Object.keys(invalid)[0]}`)?.focus(); return; }
    }
    const saved = draft.saved;
    if (kind === "submit" && (!saved || draft.dirty)) return;
    const input: Content = { ...draft.values };
    for (const field of Object.keys(limits) as (keyof typeof limits)[]) input[field] = input[field].trim();
    input.contactEmail = input.contactEmail.toLowerCase();
    const original: Operation = { kind, inputEpoch: draft.editEpoch, revision: saved?.revision ?? 0, content: input, id: saved?.id, inFlight: true };
    operation.current = original; draft.operation = original; draft.uncertain = true;
    const generation = epoch.current;
    lock.current = true; setBusy(true); start();
    let recover = false;
    try {
      const response = kind === "submit" ? await applicationApi.submit(saved!.id, saved!.revision) : saved ? await applicationApi.edit(saved.id, { ...input, expectedRevision: saved.revision }) : await applicationApi.create({ businessId, eventId, ...input });
      if (epoch.current !== generation) return;
      const next = application(response, { businessId, eventId, ...(saved ? { id: saved.id } : {}) });
      if (kind === "submit" && (next.status !== "submitted" || next.frozenSubmittedContentRevision !== saved!.revision || next.revision !== saved!.revision + 1 || !(Object.keys(labels) as (keyof Content)[]).every((field) => next.content[field] === saved!.content[field])) || kind !== "submit" && (next.status !== "draft" || next.revision !== (saved?.revision ?? 0) + 1)) throw new ApiError(502, "Invalid response.");
      adopt(next, original.inputEpoch); setConfirm(false); finish("Completed");
    } catch (error) {
      if (epoch.current !== generation) return;
      if (uncertain(error) || error instanceof ApiError && ["application_exists", "application_submitted"].includes(error.code)) {
        draft.uncertain = true; repaint(); setConfirm(false); finish("Outcome not confirmed"); recover = true;
      } else {
        draft.uncertain = false; draft.operation = undefined; repaint();
        finish(feedback(error));
        if (error instanceof ApiError && error.status === 422) setErrors(Object.fromEntries(error.fields.filter((field) => field in labels).map((field) => [field, `Check ${labels[field as keyof Content].toLowerCase()}.`])));
        denied(error);
      }
    } finally {
      original.inFlight = false;
      if (epoch.current === generation) { lock.current = false; setBusy(false); if (recover) void reconcile(original, generation); }
    }
  }
  async function refresh() {
    if (!draft?.saved || lock.current) return;
    const generation = epoch.current;
    lock.current = true; setReading(true); start();
    const inputEpoch = draft.editEpoch;
    try {
      const saved = application(await applicationApi.get(draft.saved.id), { businessId, eventId, id: draft.saved.id });
      if (epoch.current !== generation) return;
      adopt(saved, inputEpoch); setErrors({}); finish("Completed — latest saved draft retrieved.");
    } catch (error) { if (epoch.current === generation) { finish(feedback(error)); denied(error); } }
    finally { if (epoch.current === generation) { lock.current = false; setReading(false); } }
  }
  function save(event: FormEvent) { event.preventDefault(); void mutate(draft?.saved ? "edit" : "create"); }
  return <ApplicationLayout title="Business applications" role="business" dirty={!!draft?.dirty}>
    <Stack spacing={3}>
      <TextField select label="Business" value={owned ? businessId : ""} onChange={(event) => chooseBusiness(event.target.value)} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}>{businesses.map((value) => <option key={value.businessId} value={value.businessId}>{value.businessName}</option>)}</TextField>
      
      {!!eventList.length && <TextField select label="Event" value={eventId} onChange={(event) => chooseEvent(event.target.value)} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}>{eventList.map((event) => <option key={event.eventId} value={event.eventId}>{event.title}</option>)}</TextField>}
      {eventList.filter((event) => event.eventId === eventId).map((event) => <Box key={event.eventId}><Typography>{event.title}</Typography><Typography>{event.startsAt} - {event.endsAt} ({event.timezone})</Typography><Typography>{event.applicationsOpen ? "Applications open" : "Applications are closed for this event. Keep editing your saved draft or choose an open event."}</Typography></Box>)}
      <Feedback status={status} />
      {visible && draft!.saved && draft!.saved.status !== "draft" ? <><Frozen value={draft!.saved} /><SetupDetails mode="business" eventId={draft!.saved.eventId} participationId={draft!.saved.participationId} /></> : visible && <Box component="form" noValidate onSubmit={save}>
        <Stack spacing={3}>
          {draft!.saved && <Typography>Saved revision: {draft!.saved.revision}</Typography>}
          <TextField id="application-participantType" select label="Participant type" value={draft!.values.participantType} onChange={(event) => change("participantType", event.target.value)} error={!!errors.participantType} helperText={errors.participantType} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}><option value="exhibitor">Exhibitor</option><option value="vendor">Vendor</option></TextField>
          {(Object.keys(limits) as (keyof typeof limits)[]).map((field) => <ContentField key={field} field={field} value={draft!.values[field]} error={errors[field]} edit={change} />)}
          {draft!.dirty && <Typography variant="body2">Unsaved input. Save this complete draft before reviewing submission.</Typography>}
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 2 }}><Button type="submit" variant="contained" disabled={busy || reading || draft!.uncertain}>Save draft</Button>{draft!.saved && <Button disabled={busy || reading || draft!.uncertain || draft!.dirty || !eventList.find((event) => event.eventId === eventId)?.applicationsOpen} variant="outlined" onClick={() => setConfirm(true)}>Review submission</Button>}</Stack>
          {/Changed elsewhere/.test(status) && draft!.saved && <Button onClick={refresh} disabled={busy || reading}>Refresh saved draft</Button>}
          {draft!.uncertain && !reading && !busy && <Button onClick={() => operation.current && reconcile(operation.current, epoch.current)} disabled={busy || reading}>Check outcome</Button>}
        </Stack>
      </Box>}
    </Stack>
    {confirm && visible && draft!.saved?.status === "draft" && <Dialog transitionDuration={0} open onClose={() => !busy && setConfirm(false)} aria-labelledby="submission-title" fullWidth maxWidth="sm">
      <DialogTitle id="submission-title">Confirm submission</DialogTitle><DialogContent sx={{ overflowWrap: "anywhere" }}>
        <Typography>Business: {businesses.find((value) => value.businessId === businessId)?.businessName}</Typography><Typography>Event: {eventList.find((value) => value.eventId === eventId)?.title}</Typography><Typography>Saved revision: {draft?.saved?.revision}. Submitting freezes this exact content; it cannot be edited afterwards.</Typography>
        {draft?.saved && <ContentSummary value={draft.saved} />}
      </DialogContent><DialogActions sx={{ flexWrap: "wrap" }}><Button disabled={busy} onClick={() => setConfirm(false)}>Cancel</Button><Button disabled={busy} onClick={() => mutate("submit")} variant="contained">Submit application</Button></DialogActions>
    </Dialog>}
    {switchTo !== null && <Dialog transitionDuration={0} open onClose={() => setSwitchTo(null)} aria-labelledby="switch-title"><DialogTitle id="switch-title">Change context?</DialogTitle><DialogContent>Unsaved input is private to this business and event. Continuing clears it.</DialogContent><DialogActions><Button onClick={() => setSwitchTo(null)}>Stay</Button><Button onClick={() => { memory.clear(); navigate(switchTo!); setSwitchTo(null); }}>Continue</Button></DialogActions></Dialog>}
  </ApplicationLayout>;
}
