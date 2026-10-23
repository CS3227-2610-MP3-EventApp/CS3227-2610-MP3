import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Link as MuiLink, Paper, Stack, TextField, Typography } from "@mui/material";
import { Link, useLocation, useParams } from "react-router-dom";
import { ApiError } from "../api";
import { useAuth } from "../Auth";
import { programmeApi } from "../programmeApi";
import type { EventSummary, ProgrammePage, PublishedProgrammeItem } from "../programmeTypes";
import { planningApi } from "./api";
import { ItineraryAI } from "./ItineraryAI";
import type { AcceptedPlan, DraftItem, PlanningState, Selection } from "./types";

const issueText: Record<string, string> = {
  overlap: "Activities overlap. Remove one before accepting.", minimum_gap: "The gap between activities is shorter than your minimum gap.",
  budget_exceeded: "The activity total exceeds your budget.", accessibility_unconfirmed: "Confirm each activity's suitability for your accessibility needs.",
  stale_programme: "Programme details changed. Review current activities and save your draft again.", stale_preferences: "Preferences changed. Review and save your draft again.", empty_itinerary: "Add an activity before accepting your itinerary.",
};
function money(cents: number): string { return `SGD ${Math.floor(cents / 100).toLocaleString("en-SG")}.${String(cents % 100).padStart(2, "0")}`; }
function localTime(value: string, timezone: string): string {
  try { return new Intl.DateTimeFormat("en-GB", { timeZone: timezone, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value)); }
  catch { return "Time unavailable"; }
}
function budgetValue(value: string): number | null {
  if (!value.trim()) return null;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error("Enter a budget in SGD dollars with at most two decimal places.");
  const amount = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount > 2147483647) throw new Error("Enter a budget from SGD 0.00 to SGD 21,474,836.47.");
  return amount;
}
type FormValues = { interests: string; budget: string; needs: string; gap: string };
const initialForm: FormValues = { interests: "", budget: "", needs: "", gap: "0" };
const selection = (item: DraftItem | Selection): Selection => ({ programmeItemId: item.programmeItemId, observedProgrammeRevision: item.observedProgrammeRevision, accessibilityConfirmed: item.accessibilityConfirmed });

export function AttendeePlanning() {
  const { eventId } = useParams();
  const location = useLocation();
  const { actor, setActor } = useAuth();
  const [state, setState] = useState<PlanningState | null>(null);
  const [events, setEvents] = useState<ProgrammePage<EventSummary> | null>(null);
  const [programme, setProgramme] = useState<ProgrammePage<PublishedProgrammeItem> | null>(null);
  const [form, setForm] = useState<FormValues>(initialForm);
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [formDirty, setFormDirty] = useState(false), [draftDirty, setDraftDirty] = useState(false);
  const [loading, setLoading] = useState(true), [pending, setPending] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [reloadRequired, setReloadRequired] = useState(false), [reload, setReload] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [history, setHistory] = useState<AcceptedPlan | null>(null);
  const epoch = useRef(0), locked = useRef(false);
  const controllers = useRef<Set<AbortController>>(new Set());

  function adopt(value: PlanningState, resetEdits = true) {
    setState(value);
    if (resetEdits) {
      const prefs = value.preferences;
      setForm({ interests: prefs.interests, budget: prefs.budgetMinorUnits === null ? "" : `${Math.floor(prefs.budgetMinorUnits / 100)}.${String(prefs.budgetMinorUnits % 100).padStart(2, "0")}`, needs: prefs.accessibilityNeeds, gap: String(prefs.minimumGapMinutes) });
      setDraft(value.draft.items); setFormDirty(false); setDraftDirty(false);
    }
  }
  function failureMessage(failure: unknown): string {
    const problem = failure instanceof ApiError ? failure : new ApiError(0, "Unable to complete the request. Reload to check your saved data.");
    if (problem.status === 401) setActor(null);
    return problem.message;
  }
  useEffect(() => {
    const turn = ++epoch.current, controller = new AbortController();
    controllers.current.add(controller); locked.current = false;
    setState(null); setProgramme(null); setEvents(null); setDraft([]); setForm(initialForm); setHistory(null);
    setFormDirty(false); setDraftDirty(false); setLoading(true); setPending(false); setError(""); setNotice(""); setReloadRequired(false); setDeleteOpen(false);
    const load = eventId
      ? Promise.all([planningApi.get(eventId, controller.signal), programmeApi.items(eventId, { q: "", type: "", date: "" }, 0, controller.signal)])
        .then(([value, items]) => { if (turn === epoch.current) { adopt(value); setProgramme(items); } })
      : programmeApi.events(0, controller.signal).then(value => { if (turn === epoch.current) setEvents(value); });
    load.catch(failure => { if (turn === epoch.current && !controller.signal.aborted) setError(failureMessage(failure)); })
      .finally(() => { controllers.current.delete(controller); if (turn === epoch.current) setLoading(false); });
    return () => { ++epoch.current; for (const request of controllers.current) request.abort(); controllers.current.clear(); };
  }, [eventId, actor?.id, location.key, reload]);

  async function write(action: (signal: AbortSignal) => Promise<PlanningState>, message: string, resetEdits = true, onResult?: (value: PlanningState) => void) {
    if (locked.current || reloadRequired || !eventId || !state) return;
    const turn = epoch.current, controller = new AbortController();
    controllers.current.add(controller); locked.current = true; setPending(true); setError(""); setNotice("");
    try { const result = await action(controller.signal); if (turn === epoch.current) { adopt(result, resetEdits); onResult?.(result); setHistory(null); setNotice(message); } }
    catch (failure) {
      if (turn !== epoch.current || controller.signal.aborted) return;
      setError(failureMessage(failure));
      const status = failure instanceof ApiError ? failure.status : 0;
      if (status === 0 || status === 409 || status >= 500) setReloadRequired(true);
    } finally { controllers.current.delete(controller); if (turn === epoch.current) { locked.current = false; setPending(false); } }
  }
  async function page(offset: number) {
    if (locked.current) return;
    const turn = epoch.current, controller = new AbortController();
    controllers.current.add(controller); locked.current = true; setPending(true); setError("");
    try {
      if (eventId) { const value = await programmeApi.items(eventId, { q: "", type: "", date: "" }, offset, controller.signal); if (turn === epoch.current) setProgramme(value); }
      else { const value = await programmeApi.events(offset, controller.signal); if (turn === epoch.current) setEvents(value); }
    } catch (failure) { if (turn === epoch.current && !controller.signal.aborted) setError(failureMessage(failure)); }
    finally { controllers.current.delete(controller); if (turn === epoch.current) { locked.current = false; setPending(false); } }
  }
  function updateForm(key: keyof FormValues, value: string) { setForm(current => ({ ...current, [key]: value })); setFormDirty(true); }
  function savePreferences() {
    if (!eventId || !state) return;
    setError(""); setNotice("");
    try {
      const budget = budgetValue(form.budget);
      if (!/^\d+$/.test(form.gap) || Number(form.gap) > 1440) throw new Error("Enter a minimum gap from 0 to 1440 whole minutes.");
      if (Array.from(form.interests.trim()).length > 1000 || Array.from(form.needs.trim()).length > 2000) throw new Error("Use up to 1000 characters for interests and 2000 for accessibility needs.");
      const unsavedDraft = draftDirty ? draft : null;
      void write(signal => planningApi.write(eventId, "/preferences", "PUT", { expectedStateRevision: state.stateRevision, interests: form.interests.trim(), budgetMinorUnits: budget, currency: "SGD", accessibilityNeeds: form.needs.trim(), minimumGapMinutes: Number(form.gap) }, signal), "Preferences saved. Review your draft and renew any accessibility confirmations.", true, result => {
        if (unsavedDraft) { setDraft(unsavedDraft.map(item => ({ ...item, accessibilityConfirmed: result.preferences.revision === state.preferences.revision ? item.accessibilityConfirmed : false }))); setDraftDirty(true); }
      });
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Check your preferences."); }
  }
  function add(item: PublishedProgrammeItem) {
    if (draft.some(value => value.programmeItemId === item.id)) return;
    if (draft.length >= 500) { setError("A draft can contain up to 500 activities."); return; }
    setDraft(current => [...current, { programmeItemId: item.id, observedProgrammeRevision: item.revision, accessibilityConfirmed: false, currentItem: item, currentProgrammeRevision: item.revision, changed: false }]); setDraftDirty(true);
  }
  function bookmark(itemId: string, exists: boolean) {
    if (!eventId || !state) return;
    void write(signal => planningApi.write(eventId, `/bookmarks/${encodeURIComponent(itemId)}`, exists ? "DELETE" : "PUT", { expectedStateRevision: state.stateRevision }, signal), exists ? "Bookmark removed." : "Activity bookmarked.", false);
  }
  function saveDraft() {
    if (!eventId || !state) return;
    void write(signal => planningApi.write(eventId, "/draft", "PUT", { expectedStateRevision: state.stateRevision, expectedPreferenceRevision: state.preferences.revision, items: draft.map(selection) }, signal), "Draft saved. Review its validation before accepting.");
  }
  function saveSuggestion(items: Selection[]) {
    if (!eventId || !state) return;
    void write(signal => planningApi.write(eventId, "/draft", "PUT", { expectedStateRevision: state.stateRevision, expectedPreferenceRevision: state.preferences.revision, items }, signal), "Draft saved. Review its validation before accepting.");
  }
  function accept() {
    if (!eventId || !state) return;
    void write(signal => planningApi.write(eventId, "/accept", "POST", { expectedStateRevision: state.stateRevision, expectedDraftRevision: state.draft.revision, expectedPreferenceRevision: state.preferences.revision }, signal), "Itinerary accepted. Your earlier versions remain saved.");
  }
  function deletePlanning() {
    if (!eventId || !state) return;
    setDeleteOpen(false);
    void write(async signal => { await planningApi.remove(eventId, state.stateRevision, signal); return planningApi.get(eventId, signal); }, "Your planning data for this event was deleted.");
  }
  async function viewVersion(id: string) {
    if (!eventId || locked.current) return;
    const turn = epoch.current, controller = new AbortController();
    controllers.current.add(controller); locked.current = true; setPending(true); setError("");
    try { const value = await planningApi.accepted(eventId, id, controller.signal); if (turn === epoch.current) setHistory(value); }
    catch (failure) { if (turn === epoch.current && !controller.signal.aborted) setError(failureMessage(failure)); }
    finally { controllers.current.delete(controller); if (turn === epoch.current) { locked.current = false; setPending(false); } }
  }
  const blocked = pending || reloadRequired;
  const currentPage = eventId ? programme : events;
  const sortedDraft = [...draft].sort((left, right) => Date.parse(left.currentItem.startsAt) - Date.parse(right.currentItem.startsAt) || Date.parse(left.currentItem.endsAt) - Date.parse(right.currentItem.endsAt) || left.programmeItemId.localeCompare(right.programmeItemId));
  const overlapNames = new Map<string, string[]>();
  for (let index = 0; index < sortedDraft.length; index++) {
    const item = sortedDraft[index];
    for (let laterIndex = index + 1; laterIndex < sortedDraft.length; laterIndex++) {
      const later = sortedDraft[laterIndex];
      if (Date.parse(later.currentItem.startsAt) >= Date.parse(item.currentItem.endsAt)) break;
      const itemConflicts = overlapNames.get(item.programmeItemId) ?? [];
      itemConflicts.push(later.currentItem.title);
      overlapNames.set(item.programmeItemId, itemConflicts);
      const laterConflicts = overlapNames.get(later.programmeItemId) ?? [];
      laterConflicts.push(item.currentItem.title);
      overlapNames.set(later.programmeItemId, laterConflicts);
    }
  }
  const localOverlap = overlapNames.size > 0;
  return <Box>
    <Stack direction="row" useFlexGap flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={1} sx={{ mb: 3 }}>
      <Typography component="h1" variant="h1" data-page-heading tabIndex={-1} sx={{ fontSize: { xs: 32, sm: 43 } }}>My Itinerary</Typography>
      <Button component={Link} to={eventId ? "/attendee/planning" : "/attendee"}>{eventId ? "Choose another event" : "Back to workspace"}</Button>
    </Stack>
    {loading && <Typography role="status">Loading planning data…</Typography>}
    {pending && <Typography role="status">Saving or loading…</Typography>}
    {error && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" disabled={pending} onClick={() => setReload(value => value + 1)}>{state ? "Reload saved data" : "Retry"}</Button>}>{error}</Alert>}
    {notice && <Alert severity="success" role="status" sx={{ mb: 2 }}>{notice}</Alert>}
    {reloadRequired && <Typography sx={{ mb: 2 }}>Reload saved data to confirm the outcome before making another change. Reloading replaces unsaved edits.</Typography>}
    {!loading && !eventId && <Stack gap={2}>
      {events?.items.length === 0 && <Typography>No published events are available yet.</Typography>}
      {events?.items.map(event => <Paper component="article" variant="outlined" sx={{ p: 2 }} key={event.id}><Typography component="h2" variant="h2"><MuiLink component={Link} to={`/attendee/planning/events/${encodeURIComponent(event.id)}`}>{event.title}</MuiLink></Typography><Typography>{localTime(event.startsAt, event.timezone)} · {event.timezone}</Typography></Paper>)}
    </Stack>}
    {!loading && eventId && state && <Stack gap={3}>
      <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography component="h2" variant="h2" sx={{ mb: 2 }}>Your preferences</Typography>
        <Box component="form" onSubmit={event => { event.preventDefault(); savePreferences(); }} sx={{ display: "grid", gap: 2 }}>
          <TextField label="Interests" value={form.interests} onChange={event => updateForm("interests", event.target.value)} disabled={blocked} helperText="Optional preferences to guide your choices." />
          <TextField label="Budget (SGD)" value={form.budget} onChange={event => updateForm("budget", event.target.value)} disabled={blocked} slotProps={{ htmlInput: { inputMode: "decimal" } }} helperText="Optional hard spending limit. Leave blank for no limit; 0 allows free activities only." />
          <TextField label="Accessibility needs" value={form.needs} onChange={event => updateForm("needs", event.target.value)} disabled={blocked} multiline helperText="Private to you. Review each activity and confirm suitability when needs are recorded." />
          <TextField label="Minimum gap (minutes)" value={form.gap} onChange={event => updateForm("gap", event.target.value)} disabled={blocked} slotProps={{ htmlInput: { inputMode: "numeric" } }} helperText="0 allows adjacent activities. This does not estimate travel time." />
          <Button type="submit" variant="contained" disabled={blocked}>Save preferences</Button>
        </Box>
      </Paper>
      <ItineraryAI eventId={eventId} preferenceRevision={state.preferences.revision} items={programme?.items ?? []} disabled={blocked} formatTime={localTime} onSave={saveSuggestion} />
      <Box component="section">
        <Typography component="h2" variant="h2" sx={{ mb: 2 }}>Published activities</Typography>
        <Stack gap={2}>{programme?.items.map(item => <Paper component="article" variant="outlined" sx={{ p: 2 }} key={item.id}>
          <Typography component="h3" variant="h2" sx={{ fontSize: 24 }}>{item.title}</Typography>
          <Typography>{localTime(item.startsAt, item.event.timezone)} – {localTime(item.endsAt, item.event.timezone)}</Typography>
          <Typography>{item.venue.name} · {item.room.name} · {money(item.priceMinorUnits)}</Typography>
          <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
            <Button disabled={blocked} onClick={() => bookmark(item.id, state.bookmarks.includes(item.id))}>{state.bookmarks.includes(item.id) ? "Remove bookmark" : "Bookmark"}</Button>
            <Button disabled={blocked || draft.some(value => value.programmeItemId === item.id)} onClick={() => add(item)}>Add to draft</Button>
            <Button component={Link} to={`/attendee/programme/events/${encodeURIComponent(eventId)}/items/${encodeURIComponent(item.id)}`}>Activity details</Button>
          </Stack>
        </Paper>)}</Stack>
        {programme?.items.length === 0 && <Typography>No published activities are available.</Typography>}
      </Box>
      <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography component="h2" variant="h2" sx={{ mb: 1 }}>Bookmarks</Typography>
        {!state.bookmarks.length && <Typography>No bookmarks yet.</Typography>}
        {state.bookmarks.map(id => <Box key={id} sx={{ my: 1 }}><MuiLink component={Link} to={`/attendee/programme/events/${encodeURIComponent(eventId)}/items/${encodeURIComponent(id)}`}>{programme?.items.find(item => item.id === id)?.title ?? draft.find(item => item.programmeItemId === id)?.currentItem.title ?? "Bookmarked activity"}</MuiLink>{!programme?.items.some(item => item.id === id) && <Button disabled={blocked} onClick={() => bookmark(id, true)}>Remove bookmark</Button>}</Box>)}
      </Paper>
      <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography component="h2" variant="h2" sx={{ mb: 2 }}>Draft itinerary</Typography>
        {draft.length === 0 && <Typography>No activities in your draft yet.</Typography>}
        <Stack gap={2}>{sortedDraft.map(item => {
          const overlappingWith = overlapNames.get(item.programmeItemId);
          return <Paper component="article" variant="outlined" aria-label={`${item.currentItem.title}${overlappingWith ? ", overlaps another activity" : ""}`} key={item.programmeItemId} sx={{ p: 2, borderWidth: overlappingWith ? 2 : 1, borderColor: overlappingWith ? "warning.main" : "divider" }}>
          <Typography component="h3" fontWeight={700}>{item.currentItem.title}</Typography>
          {overlappingWith && <Alert severity="warning" sx={{ my: 1 }}>Overlaps with: {overlappingWith.join(", ")}</Alert>}
          <Typography>{localTime(item.currentItem.startsAt, item.currentItem.event.timezone)} – {localTime(item.currentItem.endsAt, item.currentItem.event.timezone)} · {money(item.currentItem.priceMinorUnits)}</Typography>
          <Typography>{item.currentItem.venue.name} · {item.currentItem.room.name}</Typography>
          <Typography>Activity accessibility: {item.currentItem.accessibilityDetails ?? "Accessibility information not provided"}</Typography>
          {item.currentItem.venue.accessibilityDetails && <Typography>Venue accessibility: {item.currentItem.venue.accessibilityDetails}</Typography>}
          {item.currentItem.room.accessibilityDetails && <Typography>Room accessibility: {item.currentItem.room.accessibilityDetails}</Typography>}
          {state.preferences.accessibilityNeeds && <FormControlLabel control={<Checkbox checked={item.accessibilityConfirmed} disabled={blocked} onChange={(_, checked) => { setDraft(current => current.map(value => value.programmeItemId === item.programmeItemId ? { ...value, accessibilityConfirmed: checked } : value)); setDraftDirty(true); }} />} label={`I confirm suitability for my accessibility needs: ${item.currentItem.title}`} />}
          {item.changed && <Typography color="error">Programme details changed. Remove and add this activity again to review its current revision.</Typography>}
          <Button disabled={blocked} onClick={() => { setDraft(current => current.filter(value => value.programmeItemId !== item.programmeItemId)); setDraftDirty(true); }}>Remove from draft</Button>
        </Paper>;
        })}</Stack>
        {draftDirty ? <Alert severity="info" sx={{ my: 2 }}>Unsaved draft changes. Save the draft to check all constraints before accepting.</Alert> : <>
          <Typography sx={{ my: 2 }}>Activity total: {money(state.draft.validation.totalMinorUnits)}</Typography>
          {state.draft.validation.issues.map((issue, index) => <Alert severity="warning" key={`${issue.code}-${index}`} sx={{ my: 1 }}>{issueText[issue.code] ?? "This draft needs review before acceptance."}</Alert>)}
        </>}
        {draftDirty && localOverlap && <Alert severity="warning" sx={{ my: 1 }}>{issueText.overlap}</Alert>}
        {formDirty && <Typography sx={{ my: 1 }}>Save your preference edits before saving or accepting the draft. Saving preferences renews accessibility confirmations.</Typography>}
        <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
          <Button disabled={blocked || formDirty} variant="outlined" onClick={saveDraft}>Save draft</Button>
          <Button disabled={blocked || formDirty || draftDirty || !state.draft.validation.valid} variant="contained" onClick={accept}>Accept itinerary</Button>
        </Stack>
      </Paper>
      <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography component="h2" variant="h2">Accepted versions</Typography>
        {state.acceptedVersions.length === 0 && <Typography>No accepted itinerary yet.</Typography>}
        {state.acceptedVersions.map(version => <Box key={version.id} sx={{ my: 1 }}><Button disabled={pending} onClick={() => void viewVersion(version.id)}>View version {version.version}{version.id === state.currentAcceptedVersionId ? " (current)" : ""}</Button><Typography variant="body2">Accepted {new Date(version.acceptedAt).toLocaleString("en-SG")}</Typography></Box>)}
        {history && <Box sx={{ mt: 2 }}>
          <Typography component="h3" fontWeight={700}>Accepted version {history.version}</Typography>
          <Typography>Total at acceptance: {money(history.totalMinorUnits)}</Typography>
          {history.needsAttention && <Alert severity="warning">This accepted plan needs attention because programme details or preferences changed.</Alert>}
          {history.items.map(item => <Box key={item.programmeItemId} sx={{ my: 2 }}>
            <Typography fontWeight={700}>{item.acceptedItem.title}</Typography>
            <Typography>At acceptance: {localTime(item.acceptedItem.startsAt, item.acceptedItem.event.timezone)} – {localTime(item.acceptedItem.endsAt, item.acceptedItem.event.timezone)} · {money(item.acceptedItem.priceMinorUnits)}</Typography>
            <Typography>Accepted location: {item.acceptedItem.venue.name} · {item.acceptedItem.room.name}</Typography>
            {item.currentItem ? <>
              <Typography>Current details: {localTime(item.currentItem.startsAt, item.currentItem.event.timezone)} – {localTime(item.currentItem.endsAt, item.currentItem.event.timezone)} · {money(item.currentItem.priceMinorUnits)}</Typography>
              <Typography>Current location: {item.currentItem.venue.name} · {item.currentItem.room.name}</Typography>
              <Typography>Current activity accessibility: {item.currentItem.accessibilityDetails ?? "Accessibility information not provided"}</Typography>
            </> : <Typography color="error">Current activity details are unavailable. This accepted entry remains saved for your review.</Typography>}
            {item.changed && <Typography color="warning.main">Activity details have changed since acceptance.</Typography>}
          </Box>)}
        </Box>}
      </Paper>
      <Button color="error" disabled={blocked} onClick={() => setDeleteOpen(true)}>Delete planning data</Button>
    </Stack>}
    {!loading && currentPage && <Stack direction="row" justifyContent="space-between" sx={{ my: 2 }}><Button disabled={pending || currentPage.offset === 0} onClick={() => void page(Math.max(0, currentPage.offset - currentPage.limit))}>Previous activities{eventId ? "" : " / events"}</Button><Button disabled={pending || currentPage.offset + currentPage.limit >= currentPage.total} onClick={() => void page(currentPage.offset + currentPage.limit)}>Next activities{eventId ? "" : " / events"}</Button></Stack>}
    <Dialog open={deleteOpen} onClose={() => { if (!pending) setDeleteOpen(false); }} aria-labelledby="planning-delete-title"><DialogTitle id="planning-delete-title">Delete this event's planning data?</DialogTitle><DialogContent>This removes your preferences, bookmarks, draft and all accepted versions for this event. Programme activities and your account remain available.</DialogContent><DialogActions><Button disabled={pending} onClick={() => setDeleteOpen(false)}>Cancel</Button><Button color="error" disabled={blocked} onClick={deletePlanning}>Confirm deletion</Button></DialogActions></Dialog>
  </Box>;
}
