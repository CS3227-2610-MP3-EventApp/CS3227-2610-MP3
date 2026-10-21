import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useLocation } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../Auth";
import type { CurrentActor } from "../session";
import { SetupApiError, setupApi, type SetupDetails as Details, type SetupDraftMemory, type SetupWrite } from "./api";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const plainText = (value: unknown, maximum: number): value is string | null => value === null || typeof value === "string" && !!value.trim() && value === value.trim() && Array.from(value).length <= maximum;

function parseSetup(value: unknown, eventId: string, participationId: string): Details {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SetupApiError(0, "invalid_response");
  const record = value as Record<string, unknown>;
  const keys = ["participationId", "eventId", "revision", "boothLabel", "setupInstructions", "updatedAt"];
  const timestampValid = record.updatedAt === null || typeof record.updatedAt === "string" && /Z$/.test(record.updatedAt) && Number.isFinite(Date.parse(record.updatedAt));
  if (Object.keys(record).length !== keys.length || keys.some((key) => !Object.hasOwn(record, key)) ||
      record.participationId !== participationId || record.eventId !== eventId || !uuid.test(String(record.participationId)) || !uuid.test(String(record.eventId)) ||
      !Number.isSafeInteger(record.revision) || Number(record.revision) < 1 || !plainText(record.boothLabel, 100) || !plainText(record.setupInstructions, 5000) ||
      !timestampValid || (record.revision === 1 ? record.boothLabel !== null || record.setupInstructions !== null || record.updatedAt !== null : record.updatedAt === null)) {
    throw new SetupApiError(0, "invalid_response");
  }
  return value as Details;
}

function normalize(value: string) { return value.trim() || null; }
function sameFacts(left: Pick<Details, "revision" | "eventId" | "participationId" | "boothLabel" | "setupInstructions">, right: Details) {
  return left.revision === right.revision && left.eventId === right.eventId && left.participationId === right.participationId &&
    left.boothLabel === right.boothLabel && left.setupInstructions === right.setupInstructions;
}
function matchesWrite(body: SetupWrite, value: Details) {
  return body.boothLabel === value.boothLabel && body.setupInstructions === value.setupInstructions;
}

export function SetupDetails({ mode, eventId, participationId, onDirtyChange }: {
  mode: "organiser" | "business";
  eventId: string;
  participationId: string;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { actor, setActor, revalidate, setupMemory } = useAuth();
  const location = useLocation();
  const key = actor ? `${actor.id}:${eventId}:${participationId}` : "";
  const [details, setDetails] = useState<Details | null>(null);
  const [draft, setDraft] = useState<SetupDraftMemory | null>(null);
  const [checking, setChecking] = useState(true), [concealed, setConcealed] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<{ actorId: string; revision: number; body: SetupWrite } | null>(null);
  const [notice, setNotice] = useState("");
  const generation = useRef(0), alive = useRef(true);
  const actorRef = useRef(actor);
  actorRef.current = actor;
  const dirtyCallback = useRef(onDirtyChange);
  dirtyCallback.current = onDirtyChange;
  const allowed = !!actor && !actor.mustChangePassword && (mode === "organiser"
    ? actor.role === "organiser" && actor.eventMemberships.some((membership) => membership.eventId === eventId && membership.role === "organiser" && membership.status === "active")
    : actor.role === "business" && actor.businessMemberships.some((membership) => membership.role === "owner" && membership.status === "active"));

  function remember(value: SetupDraftMemory) {
    if (mode === "organiser" && key) setupMemory.set(key, value);
  }
  function clearMemory() {
    if (key) setupMemory.delete(key);
    dirtyCallback.current?.(false);
  }
  function concealAccessLoss(status: number) {
    if (![401, 403, 404].includes(status)) return;
    clearMemory();
    setDetails(null); setDraft(null); setConfirmation(null); setConcealed(true);
    if (status === 401 || status === 403) revalidate();
  }
  function isCurrent(version: number) {
    return alive.current && generation.current === version;
  }
  function hasOrganiserAuthority(value: CurrentActor | null, actorId: string) {
    return !!value && value.id === actorId && value.role === "organiser" && !value.mustChangePassword &&
      value.eventMemberships.some((membership) => membership.eventId === eventId && membership.role === "organiser" && membership.status === "active");
  }
  function loseFreshAuthority(version: number, fresh?: CurrentActor) {
    if (!isCurrent(version)) return;
    clearMemory(); setDetails(null); setDraft(null); setConfirmation(null); setConcealed(true);
    setError("Setup authority changed. Rechecking your access.");
    if (!isCurrent(version)) return;
    setActor(fresh && actorRef.current?.id === fresh.id ? fresh : null);
  }
  async function refreshOrganiserAuthority(version: number, expectedActorId: string): Promise<boolean> {
    let fresh: CurrentActor;
    try {
      fresh = await api.me();
    } catch {
      if (!isCurrent(version)) return false;
      loseFreshAuthority(version);
      return false;
    }
    if (!isCurrent(version)) return false;
    if (!hasOrganiserAuthority(actorRef.current, expectedActorId) || !hasOrganiserAuthority(fresh, expectedActorId)) {
      loseFreshAuthority(version, fresh);
      return false;
    }
    // Refresh Auth only after both the request generation and exact scoped authority are verified.
    if (!isCurrent(version)) return false;
    setActor(fresh);
    return isCurrent(version) && hasOrganiserAuthority(actorRef.current, expectedActorId);
  }
  function adopt(value: Details) {
    setDetails(value);
    if (mode === "organiser") setDraft({ base: value, boothLabel: value.boothLabel ?? "", setupInstructions: value.setupInstructions ?? "", dirty: false, conflict: false });
    else setDraft(null);
    clearMemory(); setConfirmation(null); setFieldErrors({}); setError(""); setNotice(""); setConcealed(false);
  }

  async function retrieve(version: number) {
    const raw = mode === "organiser" ? await setupApi.organiserGet(eventId, participationId) : await setupApi.businessGet(participationId);
    if (!alive.current || generation.current !== version) return;
    return parseSetup(raw, eventId, participationId);
  }

  async function load() {
    const version = ++generation.current;
    const cachedDraft = key ? setupMemory.get(key) : undefined;
    setChecking(true); setConcealed(true); setError(""); setNotice(""); setDetails(null); setDraft(null); setConfirmation(null);
    dirtyCallback.current?.(!!cachedDraft?.dirty);
    const prefix = actor ? `${actor.id}:` : "";
    for (const oldKey of setupMemory.keys()) if (!oldKey.startsWith(prefix) || oldKey !== key) setupMemory.delete(oldKey);
    if (!allowed || !actor || !uuid.test(eventId) || !uuid.test(participationId)) {
      if (key) setupMemory.delete(key);
      setError("Setup details are not available."); setChecking(false); return;
    }
    try {
      const value = await retrieve(version);
      if (!value || !alive.current || generation.current !== version) return;
      setDetails(value);
      if (mode === "organiser") {
        const cached = setupMemory.get(key);
        if (cached?.dirty) {
          if (sameFacts(cached.base, value)) {
            const restored = { ...cached, base: value };
            setDraft(restored); remember(restored); dirtyCallback.current?.(true);
          } else {
            const conflicted = { ...cached, conflict: true };
            setDraft(conflicted); remember(conflicted); dirtyCallback.current?.(true);
            setError("Setup details changed elsewhere. Review the latest version before publishing again.");
          }
        } else {
          setupMemory.delete(key);
          setDraft({ base: value, boothLabel: value.boothLabel ?? "", setupInstructions: value.setupInstructions ?? "", dirty: false, conflict: false });
        }
      }
      setConcealed(false);
    } catch (failure) {
      if (!alive.current || generation.current !== version) return;
      if (failure instanceof SetupApiError) concealAccessLoss(failure.status);
      setError(failure instanceof SetupApiError ? failure.message : "Request could not be completed.");
    } finally {
      if (alive.current && generation.current === version) setChecking(false);
    }
  }

  useEffect(() => {
    alive.current = true;
    void load();
    const routeAtMount = location.pathname + location.search;
    return () => {
      alive.current = false; generation.current++;
      // AuthProvider unmounts children for focus/pageshow revalidation at the same route.
      // Keep same-scope memory there, but discard it after a real route/context departure.
      if (window.location.pathname + window.location.search !== routeAtMount && key) setupMemory.delete(key);
    };
  // The route key intentionally defines this request generation; focus revalidation is owned once by AuthProvider.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, eventId, participationId, key, location.pathname, location.search, actor?.role, actor?.mustChangePassword, allowed]);

  function change(field: "boothLabel" | "setupInstructions", value: string) {
    if (!details || !draft || mode !== "organiser") return;
    const next = { ...draft, [field]: value };
    next.dirty = normalize(next.boothLabel) !== details.boothLabel || normalize(next.setupInstructions) !== details.setupInstructions;
    next.conflict = draft.conflict;
    setDraft(next); remember(next); setConfirmation(null); setFieldErrors({}); setError(""); setNotice("");
    dirtyCallback.current?.(next.dirty);
  }

  function validateAndConfirm() {
    if (!draft || !details || busy || checking || draft.conflict) return;
    const errors: Record<string, string> = {};
    if (Array.from(draft.boothLabel.trim()).length > 100) errors.boothLabel = "Use no more than 100 characters.";
    if (Array.from(draft.setupInstructions.trim()).length > 5000) errors.setupInstructions = "Use no more than 5,000 characters.";
    if (Object.keys(errors).length) { setFieldErrors(errors); setError("Check the highlighted setup details."); return; }
    setConfirmation({ actorId: actor!.id, revision: details.revision, body: { expectedRevision: details.revision, boothLabel: normalize(draft.boothLabel), setupInstructions: normalize(draft.setupInstructions) } });
  }

  async function reviewLatest() {
    const version = ++generation.current;
    let loaded = false;
    setChecking(true); setConcealed(true); setError("");
    try {
      const latest = await retrieve(version);
      if (!latest || !alive.current || generation.current !== version) return;
      adopt(latest); setNotice("Latest setup details loaded. Review and make any changes before publishing."); loaded = true;
    } catch (failure) {
      if (!alive.current || generation.current !== version) return;
      if (failure instanceof SetupApiError) concealAccessLoss(failure.status);
      setError(failure instanceof SetupApiError ? failure.message : "Request could not be completed.");
    } finally { if (alive.current && generation.current === version) { setChecking(false); setConcealed(!loaded); } }
  }

  async function reconcile(body: SetupWrite, version: number, expectedActorId: string) {
    try {
      if (!await refreshOrganiserAuthority(version, expectedActorId) || !isCurrent(version)) return;
      const latest = await retrieve(version);
      if (!latest || !isCurrent(version) || !hasOrganiserAuthority(actorRef.current, expectedActorId)) return;
      setDetails(latest);
      if (matchesWrite(body, latest)) {
        adopt(latest); setNotice("Setup publication confirmed from the latest saved details.");
      } else {
        const current = draft;
        if (current) { const next = { ...current, conflict: true }; setDraft(next); remember(next); dirtyCallback.current?.(true); }
        setError("The latest setup does not match this edit. Review it before publishing again."); setConcealed(false);
      }
    } catch (failure) {
      if (!alive.current || generation.current !== version) return;
      if (failure instanceof SetupApiError) concealAccessLoss(failure.status);
      setConcealed(true); setError("Unable to confirm access and saved setup. Check again before continuing.");
    }
  }

  async function publish() {
    if (!confirmation || !draft || !details || busy || confirmation.actorId !== actor?.id || confirmation.revision !== details.revision || draft.conflict) return;
    const body: SetupWrite = { ...confirmation.body };
    const expectedActorId = confirmation.actorId;
    if (body.boothLabel !== normalize(draft.boothLabel) || body.setupInstructions !== normalize(draft.setupInstructions)) { setConfirmation(null); return; }
    const version = generation.current;
    setBusy(true); setError(""); setNotice("");
    try {
      if (!await refreshOrganiserAuthority(version, expectedActorId) || !isCurrent(version)) return;
      if (actorRef.current?.id !== expectedActorId || !hasOrganiserAuthority(actorRef.current, expectedActorId)) {
        loseFreshAuthority(version); return;
      }
      const raw = await setupApi.organiserSave(eventId, participationId, body);
      if (!isCurrent(version) || !hasOrganiserAuthority(actorRef.current, expectedActorId)) { loseFreshAuthority(version); return; }
      const response = parseSetup(raw, eventId, participationId);
      if (response.revision !== details.revision + 1 || !matchesWrite(body, response)) throw new SetupApiError(0, "invalid_response");
      if (!isCurrent(version) || !hasOrganiserAuthority(actorRef.current, expectedActorId)) { loseFreshAuthority(version); return; }
      adopt(response); setNotice("Setup details published.");
    } catch (failure) {
      if (!isCurrent(version) || !hasOrganiserAuthority(actorRef.current, expectedActorId)) { loseFreshAuthority(version); return; }
      if (failure instanceof SetupApiError && failure.status === 422) {
        const mapped: Record<string, string> = {};
        failure.fields.forEach((field) => { mapped[field] = "Check this field."; });
        setFieldErrors(mapped); setError(failure.message); setConfirmation(null);
      } else if (failure instanceof SetupApiError && failure.status === 409) {
        setConfirmation(null); setError(failure.message);
        if (draft) { const conflicted = { ...draft, conflict: true }; setDraft(conflicted); remember(conflicted); dirtyCallback.current?.(true); }
      } else if (failure instanceof SetupApiError && (failure.status === 0 || failure.status >= 500)) {
        setConfirmation(null); setNotice("Publication outcome not confirmed. Checking the latest setup.");
        await reconcile(body, version, expectedActorId);
      } else {
        if (failure instanceof SetupApiError) concealAccessLoss(failure.status);
        setConfirmation(null); setError(failure instanceof SetupApiError ? failure.message : "Request could not be completed.");
      }
    } finally { if (alive.current && generation.current === version) setBusy(false); }
  }

  const visible = !checking && !concealed && !!details && (mode === "business" || !!draft);
  return <Box component="section" aria-label="Setup details" sx={{ mt: 2 }}>
    <Typography component="h2" variant="h2" sx={{ mb: 1 }}>Setup details</Typography>
    {checking && <Typography role="status">Checking setup details…</Typography>}
    {error && <Alert severity="error">{error}</Alert>}
    {concealed && !checking && <Button onClick={() => void load()}>Retry setup details</Button>}
    {visible && mode === "business" && details && <Stack spacing={1}>
      <Typography><strong>Booth label:</strong> {details.boothLabel ?? "Not assigned"}</Typography>
      <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}><strong>Setup instructions:</strong> {details.setupInstructions ?? "No setup instructions yet"}</Typography>
    </Stack>}
    {visible && mode === "organiser" && draft && details && <Stack spacing={2}>
      <Typography>Setup revision {details.revision}</Typography>
      <TextField label="Booth label" value={draft.boothLabel} onChange={(event) => change("boothLabel", event.target.value)} error={!!fieldErrors.boothLabel} helperText={fieldErrors.boothLabel ?? "Optional. Maximum 100 characters."} />
      <TextField label="Setup instructions" multiline minRows={3} value={draft.setupInstructions} onChange={(event) => change("setupInstructions", event.target.value)} error={!!fieldErrors.setupInstructions} helperText={fieldErrors.setupInstructions ?? "Optional. Maximum 5,000 characters."} />
      {draft.conflict && <Button onClick={() => void reviewLatest()}>Reload latest setup</Button>}
      <Button variant="contained" onClick={validateAndConfirm} disabled={busy || checking || draft.conflict}>Save setup</Button>
      {notice && <Typography role="status" aria-live="polite">{notice}</Typography>}
      {confirmation && <Dialog open transitionDuration={0} aria-labelledby="setup-confirmation-title" onClose={() => !busy && setConfirmation(null)}>
        <DialogTitle id="setup-confirmation-title">Confirm setup details</DialogTitle>
        <DialogContent>
          <Typography>Event setup for the selected accepted application. Revision {confirmation.revision}.</Typography>
          <Typography>Booth label: {confirmation.body.boothLabel ?? "Not assigned (clear this label)"}</Typography>
          <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>Setup instructions: {confirmation.body.setupInstructions ?? "No setup instructions (clear these instructions)"}</Typography>
        </DialogContent>
        <DialogActions><Button disabled={busy} onClick={() => setConfirmation(null)}>Cancel</Button><Button disabled={busy || confirmation.actorId !== actor?.id || confirmation.revision !== details.revision} onClick={() => void publish()}>Publish setup</Button></DialogActions>
      </Dialog>}
    </Stack>}
  </Box>;
}
