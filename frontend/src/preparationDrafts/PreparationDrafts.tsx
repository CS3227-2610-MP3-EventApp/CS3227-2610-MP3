import { displayDate } from "../displayDate";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Link, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../Auth";
import { api, ApiError, applicationApi } from "../api";
import { application, events as parseEvents, uuid, type Application, type ApplicationEvent } from "../applications/model";
import { PreparationApiError, preparationApi, type PreparationDocument, type PreparationLine, type PreparationTask } from "../preparation/api";
import { ApplicationLayout } from "../applications/shared";
import { DraftApiError, draftApi, type AdoptWrite, type BusinessJob, type DraftDocument, type DraftLine, type DraftMemory, type DraftTask } from "./api";

const statusValues = ["not_started", "in_progress", "done"] as const;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const positive = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0;
const iso = (v: unknown): v is string => typeof v === "string" && /Z$/.test(v) && Number.isFinite(Date.parse(v));

function parseManual(value: unknown, participationId: string): PreparationDocument {
  if (!object(value) || value.participationId !== participationId || !positive(value.revision) || !Array.isArray(value.tasks) || !object(value.budget) || value.budget.currency !== "SGD" || !Array.isArray(value.budget.lines)) throw new PreparationApiError(0, "invalid_response");
  const tasks = value.tasks as PreparationTask[], lines = value.budget.lines as PreparationLine[], budget = value.budget;
  if (tasks.length > 200 || lines.length > 200 || tasks.some(t => !object(t) || !uuid(t.id) || typeof t.title !== "string" || !t.title.trim() || Array.from(t.title).length > 160 || !statusValues.includes(t.status as typeof statusValues[number]) || !(t.dueDate === null || typeof t.dueDate === "string")) || lines.some(l => !object(l) || !uuid(l.id) || typeof l.description !== "string" || !l.description.trim() || !Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 1_000_000 || !(l.unitPriceMinorUnits === null || Number.isSafeInteger(l.unitPriceMinorUnits) && l.unitPriceMinorUnits >= 0 && l.unitPriceMinorUnits <= 100_000_000_000) || !["unknown", "estimate", "quotation"].includes(l.priceBasis) || (l.unitPriceMinorUnits === null ? l.priceBasis !== "unknown" || l.quotationBasis !== null : l.priceBasis === "unknown") || (l.priceBasis === "quotation" ? typeof l.quotationBasis !== "string" || !l.quotationBasis.trim() : l.quotationBasis !== null))) throw new PreparationApiError(0, "invalid_response");
  const subtotal = lines.reduce((sum, line) => sum + (line.unitPriceMinorUnits === null ? 0n : BigInt(line.quantity) * BigInt(line.unitPriceMinorUnits)), 0n);
  const complete = lines.every(line => line.unitPriceMinorUnits !== null);
  if (budget.knownSubtotalMinorUnits !== subtotal.toString() || budget.totalMinorUnits !== (complete ? subtotal.toString() : null) || budget.isComplete !== complete) throw new PreparationApiError(0, "invalid_response");
  return value as unknown as PreparationDocument;
}
function parseSetup(value: unknown, eventId: string, participationId: string) {
  if (!object(value) || value.eventId !== eventId || value.participationId !== participationId || !positive(value.revision) || !(value.boothLabel === null || typeof value.boothLabel === "string") || !(value.setupInstructions === null || typeof value.setupInstructions === "string")) throw new DraftApiError(0, "invalid_response");
  return value as { revision: number; boothLabel: string | null; setupInstructions: string | null };
}
function parseDraft(value: unknown, participationId: string): DraftDocument {
  if (!object(value) || !uuid(value.id) || !uuid(value.jobId) || value.participationId !== participationId || !positive(value.revision) || !object(value.sourceRevisions) || !positive(value.sourceRevisions.event) || !positive(value.sourceRevisions.setup) || !positive(value.sourceRevisions.preparation) || !object(value.sourceFacts) || !object(value.sourceFacts.event) || !object(value.sourceFacts.setup) || typeof value.sourceFacts.event.title !== "string" || !iso(value.sourceFacts.event.startsAt) || !iso(value.sourceFacts.event.endsAt) || typeof value.sourceFacts.event.timezone !== "string" || !(value.sourceFacts.setup.boothLabel === null || typeof value.sourceFacts.setup.boothLabel === "string") || !(value.sourceFacts.setup.setupInstructions === null || typeof value.sourceFacts.setup.setupInstructions === "string") || !Array.isArray(value.tasks) || value.tasks.length > 200 || !object(value.budget) || value.budget.currency !== "SGD" || !Array.isArray(value.budget.lines) || value.budget.lines.length > 200 || !iso(value.createdAt) || !(value.adoptedAt === null || iso(value.adoptedAt)) || !(value.adoptedPreparationRevision === null || positive(value.adoptedPreparationRevision)) || (value.adoptedAt === null) !== (value.adoptedPreparationRevision === null)) throw new DraftApiError(0, "invalid_response");
  const tasks = value.tasks as DraftTask[], lines = value.budget.lines as DraftLine[], budget = value.budget;
  if (tasks.some(t => !object(t) || Object.hasOwn(t, "id") || typeof t.title !== "string" || !t.title.trim() || Array.from(t.title).length > 160 || !statusValues.includes(t.status as typeof statusValues[number]) || !(t.dueDate === null || typeof t.dueDate === "string")) || lines.some(l => !object(l) || Object.hasOwn(l, "id") || typeof l.description !== "string" || !l.description.trim() || Array.from(l.description).length > 160 || !Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 1_000_000 || !(l.unitPriceMinorUnits === null || Number.isSafeInteger(l.unitPriceMinorUnits) && l.unitPriceMinorUnits >= 0 && l.unitPriceMinorUnits <= 100_000_000_000) || !["unknown", "estimate", "quotation"].includes(l.priceBasis) || (l.unitPriceMinorUnits === null ? l.priceBasis !== "unknown" || l.quotationBasis !== null : l.priceBasis === "unknown") || (l.priceBasis === "quotation" ? typeof l.quotationBasis !== "string" || !l.quotationBasis.trim() || Array.from(l.quotationBasis).length > 500 : l.quotationBasis !== null))) throw new DraftApiError(0, "invalid_response");
  const sum = lines.reduce((n, l) => n + (l.unitPriceMinorUnits === null ? 0n : BigInt(l.quantity) * BigInt(l.unitPriceMinorUnits)), 0n), complete = lines.every(l => l.unitPriceMinorUnits !== null);
  if (sum > 20_000_000_000_000_000_000n || budget.knownSubtotalMinorUnits !== sum.toString() || budget.totalMinorUnits !== (complete ? sum.toString() : null) || budget.isComplete !== complete) throw new DraftApiError(0, "invalid_response");
  return value as unknown as DraftDocument;
}
function parseJob(value: unknown, participationId: string): BusinessJob {
  if (!object(value) || !uuid(value.id) || value.participationId !== participationId || !uuid(value.eventId) || !["pending", "running", "completed", "failed", "cancelled"].includes(String(value.state)) || !iso(value.createdAt) || !iso(value.updatedAt) || !(value.completedAt === null || iso(value.completedAt)) || !(value.failureCode === null || typeof value.failureCode === "string") || typeof value.providerMayHaveRun !== "boolean" || !(value.draft === null || object(value.draft))) throw new DraftApiError(0, "invalid_response");
  return value as unknown as BusinessJob;
}
function money(value: bigint | string) { const n = BigInt(value); return `${(n / 100n).toLocaleString("en-SG")}.${String(n % 100n).padStart(2, "0")}`; }
function centsText(value: number | null) { if (value === null) return ""; const n = BigInt(value); return `${n / 100n}.${String(n % 100n).padStart(2, "0")}`; }
function parseCents(text: string): number | null | undefined {
  const s = text.trim(); if (!s) return null; if (!/^\d+(?:\.\d{0,2})?$/.test(s)) return undefined;
  const [whole, fraction = ""] = s.split("."), n = BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
  return n <= 100_000_000_000n ? Number(n) : undefined;
}
function jobMessage(job: BusinessJob | null) {
  if (!job) return "";
  if (job.state === "pending" || job.state === "running") return `Preparation draft ${job.state === "pending" ? "queued" : "in progress"}.`;
  if (job.state === "cancelled") return `Preparation draft cancelled. ${job.providerMayHaveRun ? "The provider request may already have run and used quota." : "No provider request was dispatched."}`;
  if (job.state === "failed") return job.failureCode === "provider_unavailable" ? "Draft generation failed because the provider is unavailable. Manual preparation remains available." : "Draft generation failed. Review the source and try again later; manual preparation remains available.";
  return "";
}

export function PreparationDrafts() {
  const { actor, setActor, revalidate, draftMemory } = useAuth();
  const location = useLocation(), navigate = useNavigate();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const owners = actor?.businessMemberships.filter(m => m.role === "owner" && m.status === "active") ?? [];
  const businessId = query.get("businessId") ?? owners[0]?.businessId ?? "";
  const businessName = owners.find(m => m.businessId === businessId)?.businessName ?? "";
  const validOwner = !!actor && actor.role === "business" && !actor.mustChangePassword && owners.some(m => m.businessId === businessId);
  const [events, setEvents] = useState<ApplicationEvent[]>([]), [apps, setApps] = useState<Application[]>([]);
  const eventId = query.get("eventId") ?? "", participationId = query.get("participationId") ?? "";
  const scopeKey = actor ? `${actor.id}:business:${businessId}:${eventId}:${participationId}` : "";
  const [setup, setSetup] = useState<{ revision: number; boothLabel: string | null; setupInstructions: string | null } | null>(null);
  const [manual, setManual] = useState<PreparationDocument | null>(null);
  const [mem, setMem] = useState<DraftMemory | null>(null);
  const [confirming, setConfirming] = useState(false), [busy, setBusy] = useState(false), [checking, setChecking] = useState(true), [concealed, setConcealed] = useState(true);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const approval = useRef<DraftDocument | null>(null);
  const generation = useRef(0), alive = useRef(true), memRef = useRef<DraftMemory | null>(null), actorRef = useRef(actor);
  actorRef.current = actor;
  const event = events.find(e => e.eventId === eventId);
  const participationApps = apps.filter(a => a.businessId === businessId);
  const chosen = participationApps.find(a => a.eventId === eventId && a.participationId === participationId);
  const editable = !!mem?.draft && !mem.conflict && mem.draft.adoptedAt === null;
  const dirty = !!mem?.dirty;
  const manualUrl = `/business/preparation?businessId=${encodeURIComponent(businessId)}${eventId ? `&eventId=${encodeURIComponent(eventId)}` : ""}${participationId ? `&participationId=${encodeURIComponent(participationId)}` : ""}`;

  const putMemory = useCallback((value: DraftMemory | null) => {
    memRef.current = value; setMem(value);
    if (value && scopeKey) draftMemory.set(scopeKey, value);
  }, [draftMemory, scopeKey]);
  function purgeOtherScopes(keep: string) {
    if (!actor) return;
    for (const key of draftMemory.keys()) if (!key.startsWith(`${actor.id}:business:`) || key !== keep) draftMemory.delete(key);
  }
  function accessLoss(failure: unknown) {
    if (failure instanceof ApiError && [401, 403].includes(failure.status) || failure instanceof DraftApiError && [401, 403].includes(failure.status) || failure instanceof PreparationApiError && [401, 403].includes(failure.status)) {
      if (scopeKey) draftMemory.delete(scopeKey); putMemory(null); setSetup(null); setManual(null); setEvents([]); setApps([]); setConcealed(true);
      if (failure instanceof ApiError && failure.status === 401 || failure instanceof DraftApiError && failure.status === 401 || failure instanceof PreparationApiError && failure.status === 401) revalidate();
      return true;
    }
    return false;
  }
  const ensureActor = useCallback(async (version: number, expectedId: string) => {
    let fresh;
    try { fresh = await api.me(); }
    catch (failure) { if (version !== generation.current || !alive.current) return false; accessLoss(failure); setError("Access could not be confirmed. Private draft controls are hidden."); return false; }
    if (version !== generation.current || !alive.current) return false;
    const matches = fresh.id === expectedId && fresh.role === "business" && !fresh.mustChangePassword && fresh.businessMemberships.some(m => m.businessId === businessId && m.role === "owner" && m.status === "active");
    if (!matches || actorRef.current?.id !== expectedId) {
      if (scopeKey) draftMemory.delete(scopeKey); putMemory(null); setSetup(null); setManual(null); setConcealed(true); setError("Your business access changed. Reopen the workspace after checking your access.");
      if (version === generation.current && alive.current) setActor(fresh.id === expectedId ? fresh : null);
      return false;
    }
    if (version !== generation.current || !alive.current) return false;
    setActor(fresh);
    return version === generation.current && alive.current && actorRef.current?.id === expectedId;
  }, [actorRef, businessId, draftMemory, putMemory, revalidate, scopeKey, setActor]);

  const load = useCallback(async (retry = false) => {
    const current = ++generation.current;
    setChecking(true); setConcealed(true); setError(""); setNotice("");
    if (!validOwner || !actor || !businessId) { putMemory(null); setError("Access is not permitted."); setChecking(false); return; }
    const cached = scopeKey ? draftMemory.get(scopeKey) : undefined;
    if (cached) putMemory(cached); else putMemory({ businessId, eventId, participationId, needs: "", inventedConfirmed: false, selectedTaskIds: [], selectedLineIds: [], selectedTaskIndexes: [], selectedLineIndexes: [], draft: null, dirty: false, conflict: false, job: null });
    purgeOtherScopes(scopeKey);
    try {
      const fresh = await api.me();
      if (current !== generation.current || !alive.current) return;
      if (fresh.id !== actor.id || fresh.role !== "business" || fresh.mustChangePassword || !fresh.businessMemberships.some(m => m.businessId === businessId && m.role === "owner" && m.status === "active")) throw new DraftApiError(403, "forbidden");
      const [rawEvents, rawApps] = await Promise.all([applicationApi.events(businessId), applicationApi.list(businessId)]);
      if (current !== generation.current || !alive.current) return;
      const summaries = parseEvents(rawEvents), applications = Array.isArray(rawApps) ? rawApps.map(v => application(v, { businessId })) : (() => { throw new DraftApiError(0, "invalid_response"); })();
      setEvents(summaries); setApps(applications);
      const selectedEvent = eventId || summaries[0]?.eventId || "";
      const selectedApp = applications.find(a => a.eventId === selectedEvent && (!participationId || a.participationId === participationId));
      if (!selectedEvent || !selectedApp) { setChecking(false); setConcealed(false); if (!eventId && selectedEvent) navigate(`/business/preparation-drafts?businessId=${encodeURIComponent(businessId)}&eventId=${encodeURIComponent(selectedEvent)}`, { replace: true }); return; }
      if (!eventId || !participationId) { navigate(`/business/preparation-drafts?businessId=${encodeURIComponent(businessId)}&eventId=${encodeURIComponent(selectedEvent)}&participationId=${encodeURIComponent(selectedApp.participationId)}`, { replace: true }); return; }
      if (selectedApp.participationId !== participationId) throw new DraftApiError(404, "not_found");
      const [rawSetup, rawManual, rawHistory] = await Promise.all([setupGet(participationId), preparationApi.get(participationId), draftApi.history(participationId)]);
      if (current !== generation.current || !alive.current) return;
      const sourceSetup = parseSetup(rawSetup, eventId, participationId), sourceManual = parseManual(rawManual, participationId);
      if (!object(rawHistory) || !Array.isArray(rawHistory.items) || !Number.isSafeInteger(rawHistory.total) || !positive(rawHistory.limit) || !Number.isSafeInteger(rawHistory.offset) || !(rawHistory.latestJob === null || object(rawHistory.latestJob))) throw new DraftApiError(0, "invalid_response");
      let historyDraft: DraftDocument | null = null;
      for (const item of rawHistory.items) { const parsed = parseDraft(item, participationId); if (!historyDraft || parsed.createdAt > historyDraft.createdAt) historyDraft = parsed; }
      const latestJob = rawHistory.latestJob === null ? null : parseJob(rawHistory.latestJob, participationId);
      if (latestJob?.state === "completed" && latestJob.draft) historyDraft = parseDraft(latestJob.draft, participationId);
      const existing = scopeKey ? draftMemory.get(scopeKey) : undefined;
      if (existing?.dirty && existing.draft && historyDraft && existing.draft.id === historyDraft.id) {
        if (existing.draft.revision === historyDraft.revision) putMemory(existing);
        else { putMemory({ ...existing, conflict: true }); setError("The saved draft changed elsewhere. Review its latest version before editing again."); }
      } else {
        const next = existing ?? { businessId, eventId, participationId, needs: "", inventedConfirmed: false, selectedTaskIds: [], selectedLineIds: [], selectedTaskIndexes: [], selectedLineIndexes: [], draft: null, dirty: false, conflict: false, job: null };
        next.draft = historyDraft; next.job = latestJob; next.dirty = false; next.conflict = false; putMemory(next);
      }
      setSetup(sourceSetup); setManual(sourceManual); setConcealed(false); setActor(fresh);
    } catch (failure) {
      if (current !== generation.current || !alive.current) return;
      const denied = accessLoss(failure);
      if (!denied) setError(failure instanceof Error ? failure.message : "Request could not be completed.");
      if (retry && !denied) setConcealed(true);
    } finally { if (current === generation.current && alive.current) setChecking(false); }
  }, [actor?.id, businessId, eventId, participationId, validOwner, scopeKey, draftMemory, putMemory, navigate, setActor]);

  // Small local wrapper keeps route/input validation centralized in the module-owned adapter.
  async function setupGet(id: string) { return fetch(`/api/v1/business/participations/${encodeURIComponent(id)}/setup`, { credentials: "same-origin", cache: "no-store" }).then(async response => { if (!response.ok) throw new DraftApiError(response.status, response.status === 401 ? "unauthenticated" : response.status === 403 ? "forbidden" : "not_found"); return response.json(); }); }

  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; generation.current++; memRef.current = null; }; }, [load]);

  function update(patch: Partial<DraftMemory>) { const current = memRef.current; if (!current) return; putMemory({ ...current, ...patch }); approval.current = null; setConfirming(false); }
  function updateTask(index: number, patch: Partial<DraftTask>) { const current = memRef.current; if (!current?.draft) return; const tasks = current.draft.tasks.map((task, i) => i === index ? { ...task, ...patch } : task); putMemory({ ...current, draft: { ...current.draft, tasks }, dirty: true }); approval.current = null; setConfirming(false); }
  function updateLine(index: number, patch: Partial<DraftLine>) { const current = memRef.current; if (!current?.draft) return; const lines = current.draft.budget.lines.map((line, i) => i === index ? { ...line, ...patch } : line); putMemory({ ...current, draft: { ...current.draft, budget: exactBudget(lines) }, dirty: true }); approval.current = null; setConfirming(false); }
  function exactBudget(lines: DraftLine[]) { const known = lines.reduce((n, line) => n + (line.unitPriceMinorUnits === null ? 0n : BigInt(line.quantity) * BigInt(line.unitPriceMinorUnits)), 0n), complete = lines.every(line => line.unitPriceMinorUnits !== null); return { currency: "SGD" as const, lines, totalMinorUnits: complete ? known.toString() : null, knownSubtotalMinorUnits: known.toString(), isComplete: complete }; }
  function addTask() { const current = memRef.current; if (!current?.draft || current.draft.tasks.length >= 200) return; update({ draft: { ...current.draft, tasks: [...current.draft.tasks, { title: "New suggested task", status: "not_started", dueDate: null }] }, dirty: true }); }
  function addLine() { const current = memRef.current; if (!current?.draft || current.draft.budget.lines.length >= 200) return; update({ draft: { ...current.draft, budget: exactBudget([...current.draft.budget.lines, { description: "New estimated item", quantity: 1, unitPriceMinorUnits: null, priceBasis: "unknown", quotationBasis: null }]) }, dirty: true }); }
  function select(which: "task" | "line", index: number, checked: boolean) {
    const current = memRef.current; if (!current?.draft) return;
    const key = which === "task" ? "selectedTaskIndexes" : "selectedLineIndexes";
    const selected = checked ? [...current[key], index] : current[key].filter(value => value !== index);
    update({ [key]: selected } as Partial<DraftMemory>);
  }
  function selectedIndexes(which: "task" | "line") { return [...(which === "task" ? mem?.selectedTaskIndexes : mem?.selectedLineIndexes) ?? []].sort((a,b) => a-b); }
  function toggleSource(kind: "task" | "line", id: string, checked: boolean) { const current = memRef.current; if (!current) return; const key = kind === "task" ? "selectedTaskIds" : "selectedLineIds"; update({ [key]: checked ? [...current[key], id] : current[key].filter(v => v !== id) } as Partial<DraftMemory>); }

  async function reconcileGeneration(expected: number) {
    const raw = await draftApi.history(participationId);
    if (expected !== generation.current || !alive.current) return;
    if (!object(raw) || !Array.isArray(raw.items) || !(raw.latestJob === null || object(raw.latestJob))) throw new DraftApiError(0, "invalid_response");
    const job = raw.latestJob ? parseJob(raw.latestJob, participationId) : null;
    const current = memRef.current; if (current) putMemory({ ...current, job, draft: job?.state === "completed" && job.draft ? parseDraft(job.draft, participationId) : current.draft });
  }
  async function generate() {
    const current = memRef.current, currentActor = actor;
    if (!current || !currentActor || !setup || !manual || !event || !current.needs.trim() || Array.from(current.needs.trim()).length > 2000 || busy || current.job && ["pending", "running"].includes(current.job.state)) return;
    const version = ++generation.current; setBusy(true); setError(""); setNotice("");
    try {
      if (!await ensureActor(version, currentActor.id)) return;
      const body = { requestId: crypto.randomUUID(), expectedPreparationRevision: manual.revision, expectedSetupRevision: setup.revision, expectedEventRevision: event.eventRevision, needs: current.needs.trim(), selectedTaskIds: current.selectedTaskIds, selectedLineIds: current.selectedLineIds, dataSharingConfirmed: true };
      const result = await draftApi.create(participationId, body);
      if (version !== generation.current || !alive.current || actorRef.current?.id !== currentActor.id) return;
      const job = parseJob(result, participationId); putMemory({ ...current, job, draft: job.state === "completed" && job.draft ? parseDraft(job.draft, participationId) : current.draft, dirty: false });
      if (["pending", "running"].includes(job.state)) setNotice("Preparation draft request started. You can refresh its status or cancel it.");
    } catch (failure) {
      if (version !== generation.current || !alive.current) return;
      if (failure instanceof DraftApiError && [0, 409, 500, 503].includes(failure.status)) { try { if (!await ensureActor(version, currentActor.id)) return; await reconcileGeneration(version); setNotice("Request outcome checked against your latest job history. No request was replayed."); if (failure.status === 503) setError("AI preparation is not available. Check the API and worker provider configuration; you can continue with manual preparation."); } catch { setError("Request outcome is uncertain. Refresh history before trying again."); } }
      else { accessLoss(failure); setError(failure instanceof Error ? failure.message : "Request could not be completed."); }
    } finally { if (version === generation.current && alive.current) setBusy(false); }
  }
  async function refreshJob() {
    const current = memRef.current, currentActor = actor; if (!current || !current.job || !currentActor || busy) return;
    const version = ++generation.current; setBusy(true); setError("");
    try { if (!await ensureActor(version, currentActor.id)) return; const raw = await draftApi.job(current.job.id); if (version !== generation.current || !alive.current) return; const job = parseJob(raw, participationId); putMemory({ ...current, job, draft: job.state === "completed" && job.draft ? parseDraft(job.draft, participationId) : current.draft }); }
    catch (failure) { if (version === generation.current && alive.current) { accessLoss(failure); setError(failure instanceof Error ? failure.message : "Request could not be completed."); } }
    finally { if (version === generation.current && alive.current) setBusy(false); }
  }
  async function cancelJob() {
    const current = memRef.current, currentActor = actor; if (!current?.job || !currentActor || busy) return;
    const version = ++generation.current; setBusy(true); setError("");
    try { if (!await ensureActor(version, currentActor.id)) return; const raw = await draftApi.cancel(current.job.id); if (version !== generation.current || !alive.current) return; const job = parseJob(raw, participationId); putMemory({ ...current, job }); }
    catch (failure) { if (version === generation.current && alive.current) { accessLoss(failure); setError(failure instanceof Error ? failure.message : "Request could not be completed."); } }
    finally { if (version === generation.current && alive.current) setBusy(false); }
  }
  async function saveDraft() {
    const current = memRef.current, currentActor = actor; if (!current?.draft || !currentActor || busy || current.conflict || current.draft.adoptedAt) return;
    const draft = current.draft;
    const invalidTask = draft.tasks.some(t => !t.title.trim() || Array.from(t.title.trim()).length > 160 || !statusValues.includes(t.status) || !(t.dueDate === null || /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)));
    const invalidLine = draft.budget.lines.some(l => !l.description.trim() || Array.from(l.description.trim()).length > 160 || !Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 1_000_000 || (l.unitPriceMinorUnits !== null && (!Number.isSafeInteger(l.unitPriceMinorUnits) || l.unitPriceMinorUnits < 0 || l.unitPriceMinorUnits > 100_000_000_000)) || (l.unitPriceMinorUnits === null ? l.priceBasis !== "unknown" || l.quotationBasis !== null : l.priceBasis === "unknown") || (l.priceBasis === "quotation" && !l.quotationBasis?.trim()));
    if (invalidTask || invalidLine) { setError("Check task titles, dates and budget lines before saving."); return; }
    const body = { expectedRevision: draft.revision, tasks: draft.tasks, budget: { currency: "SGD" as const, lines: draft.budget.lines } };
    const version = ++generation.current; setBusy(true); setError("");
    try { if (!await ensureActor(version, currentActor.id)) return; const raw = await draftApi.save(draft.id, body); if (version !== generation.current || !alive.current) return; const saved = parseDraft(raw, participationId); if (saved.revision !== draft.revision + 1 || saved.id !== draft.id) throw new DraftApiError(0, "invalid_response"); putMemory({ ...current, draft: saved, dirty: false }); setNotice("Private draft saved. Manual preparation has not changed."); }
    catch (failure) {
      if (version !== generation.current || !alive.current) return;
      if (failure instanceof DraftApiError && [0, 409, 500, 503].includes(failure.status)) { try { if (!await ensureActor(version, currentActor.id)) return; const raw = await draftApi.read(draft.id); if (version !== generation.current || !alive.current) return; const latest = parseDraft(raw, participationId); if (latest.id === draft.id && latest.revision === draft.revision + 1 && sameEditable(body, latest)) putMemory({ ...current, draft: latest, dirty: false }); else putMemory({ ...current, conflict: true }); setError("Save outcome checked against the latest draft. Review before another save."); } catch { if (version === generation.current && alive.current) setError("Save outcome is uncertain. Refresh the draft before another save."); } }
      else { accessLoss(failure); const fields = failure instanceof DraftApiError ? failure.fields : []; setFieldErrors(Object.fromEntries(fields.map(f => [f, "Check this field."]))); setError(failure instanceof Error ? failure.message : "Request could not be completed."); }
    } finally { if (version === generation.current && alive.current) setBusy(false); }
  }
  function sameEditable(body: { tasks: DraftTask[]; budget: { lines: DraftLine[] } }, saved: DraftDocument) { return JSON.stringify(body.tasks) === JSON.stringify(saved.tasks) && JSON.stringify(body.budget.lines) === JSON.stringify(saved.budget.lines); }
  function beginAdoption() { const current = memRef.current; if (current?.dirty) return; if (!current?.draft || !manual || !setup || !event || (!selectedIndexes("task").length && !selectedIndexes("line").length)) return; approval.current = current.draft; setConfirming(true); }
  async function adopt() {
    const current = memRef.current, currentActor = actor; if (!current?.draft || approval.current !== current.draft || !currentActor || !manual || !setup || !event || busy) return;
    const taskIndexes = selectedIndexes("task"), lineIndexes = selectedIndexes("line"), draft = current.draft;
    if (!taskIndexes.length && !lineIndexes.length) { setConfirming(false); return; }
    const version = ++generation.current; setBusy(true); setError(""); setConfirming(false);
    const body: AdoptWrite = { expectedDraftRevision: draft.revision, expectedPreparationRevision: manual.revision, expectedSetupRevision: setup.revision, expectedEventRevision: event.eventRevision, taskIndexes, lineIndexes };
    try {
      if (!await ensureActor(version, currentActor.id)) return;
      if (!manual || !setup || !event || current.draft !== memRef.current?.draft) return;
      const raw = await draftApi.adopt(draft.id, body);
      if (version !== generation.current || !alive.current || actorRef.current?.id !== currentActor.id) return;
      if (!object(raw) || !object(raw.draft) || !object(raw.preparation)) throw new DraftApiError(0, "invalid_response");
      const saved = parseDraft(raw.draft, participationId), updated = parseManual(raw.preparation, participationId);
      if (saved.id !== draft.id || !saved.adoptedAt || saved.adoptedPreparationRevision !== updated.revision || updated.revision !== manual.revision + 1) throw new DraftApiError(0, "invalid_response");
      setManual(updated); putMemory({ ...current, draft: saved, dirty: false, conflict: false }); setNotice("Selected items appended to manual Preparation & Budget.");
    } catch (failure) {
      if (version !== generation.current || !alive.current) return;
      if (failure instanceof DraftApiError && [0, 409, 500, 503].includes(failure.status)) {
        try { if (!await ensureActor(version, currentActor.id)) return; const [rawDraft, rawManual] = await Promise.all([draftApi.read(draft.id), preparationApi.get(participationId)]); if (version !== generation.current || !alive.current) return; const latest = parseDraft(rawDraft, participationId), updated = parseManual(rawManual, participationId); setManual(updated); if (latest.adoptedAt && latest.adoptedPreparationRevision === updated.revision) { putMemory({ ...current, draft: latest, dirty: false }); setNotice("Adoption confirmed from authoritative draft and manual preparation."); } else { putMemory({ ...current, draft: latest, conflict: true }); setError("Adoption was not confirmed. Review the latest draft and manual preparation before trying again."); } }
        catch { if (version === generation.current && alive.current) setError("Adoption outcome is uncertain. Refresh draft and manual preparation before another attempt."); }
      } else { accessLoss(failure); setError(failure instanceof Error ? failure.message : "Request could not be completed."); }
    } finally { if (version === generation.current && alive.current) setBusy(false); }
  }

  const taskSource = manual?.tasks ?? [], lineSource = manual?.budget.lines ?? [];
  return <ApplicationLayout title="AI Preparation Draft" role="business" dirty={dirty}>
    <Stack spacing={3}>
      <Typography>Private AI suggestions only. Review every item; nothing changes manual preparation until you explicitly adopt selected items.</Typography>
      <Alert role="note" severity="info">Generating a draft shares event and published setup details, your needs and selected preparation items with the AI provider. Review the selected information before continuing. Account contacts are excluded.</Alert>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField select label="Business" value={owners.some(m => m.businessId === businessId) ? businessId : ""} onChange={e => navigate(`/business/preparation-drafts?businessId=${encodeURIComponent(e.target.value)}`)}>{owners.map(m => <MenuItem key={m.businessId} value={m.businessId}>{m.businessName}</MenuItem>)}</TextField>
        <TextField select label="Event" value={eventId} onChange={e => navigate(`/business/preparation-drafts?businessId=${encodeURIComponent(businessId)}&eventId=${encodeURIComponent(e.target.value)}`)}>{events.map(e => <MenuItem key={e.eventId} value={e.eventId}>{e.title}</MenuItem>)}</TextField>
        <TextField select label="Existing participation" value={participationId} onChange={e => navigate(`/business/preparation-drafts?businessId=${encodeURIComponent(businessId)}&eventId=${encodeURIComponent(eventId)}&participationId=${encodeURIComponent(e.target.value)}`)}>{participationApps.filter(a => a.eventId === eventId).map(a => <MenuItem key={a.participationId} value={a.participationId}>{a.eventTitle} · {a.status} · {a.participationId.slice(0, 8)}</MenuItem>)}</TextField>
      </Stack>
      <Link component={RouterLink} to={manualUrl}>Open Preparation &amp; Budget</Link>
      {checking && <Typography role="status">Checking sources and latest draft…</Typography>}
      {error && <Alert role="alert" severity="error">{error}</Alert>}
      {notice && <Typography role="status" aria-live="polite">{notice}</Typography>}
      {concealed && !checking && <Button onClick={() => void load(true)}>Retry source and draft load</Button>}
      {!checking && !chosen && <Alert severity="info">Choose an existing participation owned by this business. No application decision or assigned booth is required.</Alert>}
      {!concealed && chosen && event && setup && manual && mem && <>
        <Paper component="section" aria-label="Authoritative event and setup facts" variant="outlined" sx={{ p: 2 }}>
          <Typography component="h2" variant="h2">Authoritative event and setup facts</Typography>
          <Typography>{event.title} · {displayDate(event.startsAt, event.timezone)} – {displayDate(event.endsAt, event.timezone)} ({event.timezone}) · event revision {event.eventRevision}</Typography>
          <Typography>Participation type: {chosen.content.participantType}</Typography>
          <Typography>Booth label: {setup.boothLabel ?? "Not assigned / unknown"}</Typography>
          <Typography sx={{ whiteSpace: "pre-wrap" }}>Setup instructions: {setup.setupInstructions ?? "No setup instructions / unknown"} · setup revision {setup.revision}</Typography>
          <Typography>Manual preparation revision {manual.revision}</Typography>
        </Paper>
        <Paper component="section" aria-label="Manual context to share" variant="outlined" sx={{ p: 2 }}>
          <Typography component="h2" variant="h2">Select manual context to share</Typography>
          <Typography>Only checked task and cost-item details are sent with your needs. Unchecked context is not included.</Typography>
          {taskSource.map(task => <FormControlLabel key={task.id} control={<Checkbox checked={mem.selectedTaskIds.includes(task.id)} onChange={(_, checked) => toggleSource("task", task.id, checked)} />} label={`Share task context: ${task.title}`} sx={{display:"flex",width:"100%",alignItems:"flex-start",m:0}} />)}
          {lineSource.map(line => <FormControlLabel key={line.id} control={<Checkbox checked={mem.selectedLineIds.includes(line.id)} onChange={(_, checked) => toggleSource("line", line.id, checked)} />} label={`Share budget context: ${line.description}`} sx={{display:"flex",width:"100%",alignItems:"flex-start",m:0}} />)}
          {!taskSource.length && !lineSource.length && <Typography>No saved manual task or budget lines to select.</Typography>}
        </Paper>
        <TextField label="Needs" multiline minRows={3} value={mem.needs} error={!!fieldErrors.needs} helperText={fieldErrors.needs ?? "Describe what you need to prepare (maximum 2,000 characters)."} onChange={e => update({ needs: e.target.value, dirty: dirty || !!mem.draft })} />
        {!mem.needs.trim() && <Typography>Describe your preparation needs to enable generation.</Typography>}
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="contained" onClick={() => void generate()} disabled={busy || !mem.needs.trim() || Array.from(mem.needs.trim()).length > 2000 || !setup || !manual || !!mem.job && ["pending", "running"].includes(mem.job.state)}>Generate preparation draft</Button>
          {mem.job && <Button onClick={() => void refreshJob()} disabled={busy}>Refresh job status</Button>}
          {mem.job && ["pending", "running"].includes(mem.job.state) && <Button onClick={() => void cancelJob()} disabled={busy}>Cancel</Button>}
        </Stack>
        {mem.job && <Alert role="status" severity={mem.job.state === "failed" ? "error" : "info"}>{jobMessage(mem.job) || `Latest job: ${mem.job.state}.`}</Alert>}
        {mem.draft && !["pending", "running"].includes(mem.job?.state ?? "") && <Paper component="section" aria-label="Private preparation draft" variant="outlined" sx={{ p: 2 }}>
          <Typography component="h2" variant="h2">Private preparation draft</Typography>
          <Typography>Draft revision {mem.draft.revision} · source event/setup/preparation {mem.draft.sourceRevisions.event}/{mem.draft.sourceRevisions.setup}/{mem.draft.sourceRevisions.preparation}. Suggestions are not authoritative facts.</Typography>
          {mem.draft.adoptedAt && <Alert severity="success">Adopted into manual preparation revision {mem.draft.adoptedPreparationRevision}.</Alert>}
          {mem.draft.tasks.map((task, index) => <Paper component="fieldset" key={index} variant="outlined" sx={{ my: 1, p: 1.5 }}><Typography component="legend">Suggested task {index + 1}</Typography>
            <FormControlLabel control={<Checkbox aria-label={`Select task ${index + 1}: ${task.title}`} checked={selectedIndexes("task").includes(index)} onChange={(_, checked) => select("task", index, checked)} disabled={!!mem.draft?.adoptedAt} />} label="Select task" />
            <TextField label="Task title" value={task.title} onChange={e => updateTask(index, { title: e.target.value })} disabled={!editable} />
            <TextField select label="Task status" value={task.status} onChange={e => updateTask(index, { status: e.target.value as DraftTask["status"] })} disabled={!editable}>{statusValues.map(s => <MenuItem key={s} value={s}>{s.replace("_", " ")}</MenuItem>)}</TextField>
            <TextField type="date" label="Task due date" value={task.dueDate ?? ""} onChange={e => updateTask(index, { dueDate: e.target.value || null })} slotProps={{ inputLabel: { shrink: true } }} disabled={!editable} />
          </Paper>)}
          {mem.draft.budget.lines.map((line, index) => <Paper component="fieldset" key={index} variant="outlined" sx={{ my: 1, p: 1.5 }}><Typography component="legend">Cost item {index + 1}</Typography>
            <FormControlLabel control={<Checkbox aria-label={`Select cost item ${index + 1}: ${line.description}`} checked={selectedIndexes("line").includes(index)} onChange={(_, checked) => select("line", index, checked)} disabled={!!mem.draft?.adoptedAt} />} label="Select cost item" />
            <TextField label="Category (optional)" value={line.category ?? ""} onChange={e => updateLine(index, {category:e.target.value || null})} disabled={!editable} />
            <TextField label="Item description" value={line.description} onChange={e => updateLine(index, { description: e.target.value })} disabled={!editable} />
            <TextField type="number" label="Quantity" value={line.quantity} inputProps={{ min: 1, max: 1_000_000 }} onChange={e => { const quantity = Number(e.target.value); if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 1_000_000) updateLine(index, { quantity }); }} disabled={!editable} />
            <TextField label="Unit price (SGD)" type="number" value={centsText(line.unitPriceMinorUnits)} inputProps={{ min: 0, step: "0.01" }} onChange={e => { const parsed = parseCents(e.target.value); if (parsed !== undefined) updateLine(index, { unitPriceMinorUnits: parsed, priceBasis: parsed === null ? "unknown" : line.priceBasis === "unknown" ? "estimate" : line.priceBasis, quotationBasis: parsed === null ? null : line.quotationBasis }); }} disabled={!editable} />
            <TextField select label="Price basis" value={line.priceBasis} onChange={e => updateLine(index, { priceBasis: e.target.value as DraftLine["priceBasis"], quotationBasis: e.target.value === "quotation" ? line.quotationBasis ?? "" : null })} disabled={!editable || line.unitPriceMinorUnits === null}>{["unknown", "estimate", "quotation"].map(value => <MenuItem key={value} value={value} disabled={value === "unknown" && line.unitPriceMinorUnits !== null}>{value}</MenuItem>)}</TextField>
            {line.priceBasis === "quotation" && <TextField label="Quotation basis" value={line.quotationBasis ?? ""} onChange={e => updateLine(index, { quotationBasis: e.target.value })} disabled={!editable} />}
            <Typography>Item amount: {line.unitPriceMinorUnits === null ? "Unknown" : `SGD ${money(BigInt(line.quantity) * BigInt(line.unitPriceMinorUnits))}`} · {line.priceBasis === "unknown" ? "Unknown cost" : line.priceBasis}</Typography>
          </Paper>)}
          {editable && <Stack direction="row" spacing={1}><Button onClick={addTask} disabled={mem.draft.tasks.length >= 200}>Add task</Button><Button onClick={addLine} disabled={mem.draft.budget.lines.length >= 200}>Add item</Button><Button onClick={() => void saveDraft()} disabled={busy}>Save draft</Button></Stack>}
          <Typography>Total: {mem.draft.budget.totalMinorUnits === null ? "Incomplete — one or more prices are unknown" : `SGD ${money(mem.draft.budget.totalMinorUnits)}`} · Known subtotal SGD {money(mem.draft.budget.knownSubtotalMinorUnits)}</Typography>
          {dirty && <Typography>Save draft changes before previewing adoption.</Typography>}
          {!mem.draft.adoptedAt && <><Button onClick={beginAdoption} disabled={busy || dirty || (!selectedIndexes("task").length && !selectedIndexes("line").length) || mem.conflict}>Adopt selected items</Button>{confirming && <Dialog open={confirming} onClose={() => { approval.current = null; setConfirming(false); }} aria-labelledby="preparation-adoption-title"><DialogTitle id="preparation-adoption-title">Confirm preparation adoption</DialogTitle><DialogContent>
            <Typography>Target {businessName} · {event?.title}; draft revision {mem.draft.revision}, manual preparation revision {manual.revision}, setup revision {setup.revision}, event revision {event?.eventRevision}.</Typography>
            {selectedIndexes("task").map(i => <Typography key={`t${i}`}>Task: {mem.draft!.tasks[i]?.title}</Typography>)}
            {selectedIndexes("line").map(i => <Typography key={`l${i}`}>Cost item: {mem.draft!.budget.lines[i]?.description} · {mem.draft!.budget.lines[i]?.unitPriceMinorUnits === null ? "Unknown" : `SGD ${money(BigInt(mem.draft!.budget.lines[i]!.quantity) * BigInt(mem.draft!.budget.lines[i]!.unitPriceMinorUnits!))}`}</Typography>)}
            <Typography>Selected items append to manual preparation; existing items are preserved.</Typography>
          </DialogContent><DialogActions><Button onClick={() => { approval.current = null; setConfirming(false); }}>Cancel</Button><Button onClick={() => void adopt()} disabled={busy}>Confirm adoption</Button></DialogActions></Dialog>}</>}
        </Paper>}
      </>}
    </Stack>
  </ApplicationLayout>;
}
