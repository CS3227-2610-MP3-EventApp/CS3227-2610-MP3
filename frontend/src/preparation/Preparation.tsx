import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Divider, Stack, TextField, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../Auth";
import { ApiError, api, applicationApi } from "../api";
import { ApplicationLayout, useFeedback } from "../applications/shared";
import { application, type Application } from "../applications/model";
import { PreparationApiError, preparationApi, type PreparationDocument, type PreparationEditableLine, type PreparationEditableTask, type PreparationDraft, type PreparationLine, type PreparationTask, type PreparationWrite } from "./api";

type EditableTask = PreparationEditableTask;
type EditableLine = PreparationEditableLine;
type Draft = PreparationDraft;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses = ["not_started", "in_progress", "done"] as const;
const dateOnly = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  if (year < 1) return false;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

function centsText(cents: number | null) {
  if (cents === null) return "";
  const value = BigInt(cents);
  return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}
function parseCents(value: string): number | null | undefined {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d+(?:\.\d{0,2})?$/.test(text)) return undefined;
  const [whole, fraction = ""] = text.split(".");
  const cents = BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
  return cents <= 100_000_000_000n ? Number(cents) : undefined;
}
function formatMoney(cents: bigint | number | string) {
  const value = BigInt(cents);
  const major = value / 100n;
  const fractional = String(value % 100n).padStart(2, "0");
  return `${major.toLocaleString("en-SG")}.${fractional}`;
}
function parseDocument(value: unknown, participationId: string): PreparationDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PreparationApiError(0, "invalid_response");
  const record = value as Record<string, unknown>, budget = record.budget as Record<string, unknown>;
  if (!uuidPattern.test(participationId) || record.participationId !== participationId || !Number.isSafeInteger(record.revision) || Number(record.revision) < 1 ||
      !Array.isArray(record.tasks) || record.tasks.length > 200 || !budget || budget.currency !== "SGD" ||
      !Array.isArray(budget.lines) || budget.lines.length > 200 || typeof budget.knownSubtotalMinorUnits !== "string" ||
      !/^\d+$/.test(budget.knownSubtotalMinorUnits) || !(budget.totalMinorUnits === null || typeof budget.totalMinorUnits === "string" && /^\d+$/.test(budget.totalMinorUnits)) ||
      typeof budget.isComplete !== "boolean") throw new PreparationApiError(0, "invalid_response");
  const tasks = record.tasks as PreparationTask[], lines = budget.lines as PreparationLine[];
  if (tasks.some((task) => !task || typeof task.id !== "string" || !uuidPattern.test(task.id) || typeof task.title !== "string" || !task.title.trim() || Array.from(task.title.trim()).length > 160 || !statuses.includes(task.status) || !(task.dueDate === null || dateOnly(task.dueDate))) ||
      new Set(tasks.map((task) => task.id)).size !== tasks.length ||
      lines.some((line) => !line || typeof line.id !== "string" || !uuidPattern.test(line.id) || typeof line.description !== "string" || !line.description.trim() || Array.from(line.description.trim()).length > 160 || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 1_000_000 ||
        !(line.unitPriceMinorUnits === null || Number.isSafeInteger(line.unitPriceMinorUnits) && line.unitPriceMinorUnits >= 0 && line.unitPriceMinorUnits <= 100_000_000_000) ||
        !["unknown", "estimate", "quotation"].includes(line.priceBasis) ||
        (line.unitPriceMinorUnits === null ? line.priceBasis !== "unknown" || line.quotationBasis !== null : line.priceBasis === "unknown") ||
        (line.priceBasis === "quotation" ? typeof line.quotationBasis !== "string" || !line.quotationBasis.trim() || Array.from(line.quotationBasis.trim()).length > 500 : line.quotationBasis !== null)) ||
      new Set(lines.map((line) => line.id)).size !== lines.length) throw new PreparationApiError(0, "invalid_response");
  const complete = lines.every((line) => line.unitPriceMinorUnits !== null);
  const subtotal = lines.reduce((total, line) => total + (line.unitPriceMinorUnits === null ? 0n : BigInt(line.quantity) * BigInt(line.unitPriceMinorUnits)), 0n);
  if (subtotal > 20_000_000_000_000_000_000n || BigInt(budget.knownSubtotalMinorUnits) > 20_000_000_000_000_000_000n || budget.isComplete !== complete || budget.knownSubtotalMinorUnits !== subtotal.toString() || budget.totalMinorUnits !== (complete ? subtotal.toString() : null)) throw new PreparationApiError(0, "invalid_response");
  return value as PreparationDocument;
}
function editableDocument(value: PreparationDocument): Draft {
  return { revision: value.revision, saved: value,
    tasks: value.tasks.map((task) => ({ ...task })),
    lines: value.budget.lines.map((line) => ({ ...line, priceText: centsText(line.unitPriceMinorUnits) })) };
}
function writeBody(draft: Draft): PreparationWrite {
  return { expectedRevision: draft.revision,
    tasks: draft.tasks.map(({ id, ...task }) => ({ ...(id ? { id } : {}), ...task })),
    budget: { currency: "SGD", lines: draft.lines.map(({ id, priceText: _priceText, ...line }) => ({ ...(id ? { id } : {}), ...line })) } };
}
function matchesSubmitted(body: PreparationWrite, saved: PreparationDocument) {
  if (body.tasks.length !== saved.tasks.length || body.budget.lines.length !== saved.budget.lines.length) return false;
  const tasksMatch = body.tasks.every((task, index) => {
    const actual = saved.tasks[index];
    return (!task.id || task.id === actual.id) && task.title === actual.title && task.status === actual.status && task.dueDate === actual.dueDate;
  });
  const linesMatch = body.budget.lines.every((line, index) => {
    const actual = saved.budget.lines[index];
    return (!line.id || line.id === actual.id) && line.description === actual.description && line.quantity === actual.quantity &&
      line.unitPriceMinorUnits === actual.unitPriceMinorUnits && line.priceBasis === actual.priceBasis && line.quotationBasis === actual.quotationBasis;
  });
  return tasksMatch && linesMatch;
}

export function Preparation() {
  const { actor, setActor, revalidate, preparationMemory } = useAuth();
  const location = useLocation(), navigate = useNavigate();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const businessId = query.get("businessId") ?? actor?.businessMemberships.find((membership) => membership.role === "owner")?.businessId ?? "";
  const eventId = query.get("eventId") ?? "";
  const participationId = query.get("participationId") ?? "";
  const membership = actor?.businessMemberships.find((value) => value.businessId === businessId && value.role === "owner" && value.status === "active");
  const { status, start, finish } = useFeedback();
  const [records, setRecords] = useState<Application[]>([]), [draft, setDraft] = useState<Draft | null>(null);
  const [checking, setChecking] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}), [conflict, setConflict] = useState(false);
  const [concealed, setConcealed] = useState(false);
  const [budgetPage, setBudgetPage] = useState(0);
  const generation = useRef(0), alive = useRef(true), docRef = useRef<Draft | null>(null), discardOnLoad = useRef(false);
  const memoryPrefix = actor ? actor.id + ":business:" + businessId + ":" : "";
  const memoryKey = memoryPrefix + eventId + ":" + participationId;
  const selected = records.find((record) => record.businessId === businessId && record.eventId === eventId && record.participationId === participationId);
  const hasSelection = !!businessId && !!eventId && !!participationId;
  const allowed = !!membership && actor?.role === "business" && !actor.mustChangePassword;

  function remember(value: Draft, hasConflict = false) {
    if (actor && businessId && eventId && participationId) preparationMemory.set(memoryKey, { businessId, eventId, participationId, draft: value, conflict: hasConflict });
  }
  function purgeMemory(keepKey?: string) {
    if (!actor) return;
    const prefix = actor.id + ":business:";
    for (const key of preparationMemory.keys()) if (key.startsWith(prefix) && key !== keepKey) preparationMemory.delete(key);
  }
  function adopt(value: PreparationDocument) {
    const next = editableDocument(value); docRef.current = next; setDraft(next); remember(next); setConflict(false); setFieldErrors({}); setError(""); setConcealed(false);
  }
  function clearPrivate() { purgeMemory(); docRef.current = null; setDraft(null); setConflict(false); setFieldErrors({}); setConcealed(false); }
  function isDirty(value: Draft) {
    const body = writeBody(value);
    return JSON.stringify(body.tasks) !== JSON.stringify(value.saved.tasks) || JSON.stringify(body.budget.lines) !== JSON.stringify(value.saved.budget.lines);
  }
  const load = useCallback(async (showProgress = true) => {
    const current = ++generation.current;
    const privateDraft = docRef.current;
    if (privateDraft && isDirty(privateDraft) && !preparationMemory.has(memoryKey)) remember(privateDraft);
    setDraft(null);
    setChecking(true); setConcealed(true); setError("");
    if (showProgress) start();
    purgeMemory(hasSelection ? memoryKey : undefined);
    try {
      if (!allowed || !membership) throw new PreparationApiError(403, "forbidden");
      const currentActor = await api.me();
      if (current !== generation.current || !alive.current) return;
      if (currentActor.id !== actor?.id || currentActor.role !== "business" || currentActor.mustChangePassword ||
          !currentActor.businessMemberships.some((value) => value.businessId === businessId && value.role === "owner" && value.status === "active")) {
        clearPrivate(); setRecords([]); setError("Access is not permitted."); setActor(currentActor); return;
      }
      const raw = await applicationApi.list(businessId);
      if (current !== generation.current || !alive.current) return;
      if (!Array.isArray(raw)) throw new PreparationApiError(0, "invalid_response");
      const own = raw.map((item) => application(item, { businessId }));
      setRecords(own);
      if (hasSelection) {
        const matching = own.find((record) => record.eventId === eventId && record.participationId === participationId);
        if (!matching) { clearPrivate(); setError("Choose an existing application owned by this business."); return; }
        const rawDocument = await preparationApi.get(participationId);
        if (current !== generation.current || !alive.current) return;
        const value = parseDocument(rawDocument, participationId);
        const cached = preparationMemory.get(memoryKey);
        if (discardOnLoad.current) {
          preparationMemory.delete(memoryKey); discardOnLoad.current = false; adopt(value);
        } else if (cached && isDirty(cached.draft)) {
          if (matchesSubmitted(writeBody(editableDocument(cached.draft.saved)), value)) {
            const retained = { ...cached.draft, revision: value.revision, saved: value };
            docRef.current = retained; setDraft(retained); setConflict(cached.conflict); remember(retained, cached.conflict);
            setError(cached.conflict ? "Preparation changed elsewhere. Review the latest version before saving again." : "");
            setConcealed(false);
          } else {
            docRef.current = cached.draft; setDraft(cached.draft); setConflict(true); remember(cached.draft, true);
            setError("The latest saved version changed; review it before saving again."); setConcealed(false);
          }
        } else adopt(value);
      } else clearPrivate();
      setActor(currentActor);
    } catch (failure) {
      if (current !== generation.current || !alive.current) return;
      if (failure instanceof ApiError && [401, 403].includes(failure.status) || failure instanceof PreparationApiError && [401, 403].includes(failure.status)) {
        clearPrivate(); setError("Access is not permitted."); revalidate();
      } else setError(failure instanceof Error ? failure.message : "Request could not be completed.");
    } finally {
      if (current === generation.current && alive.current) { setChecking(false); if (showProgress) finish(""); }
    }
  }, [allowed, actor?.id, businessId, eventId, participationId, hasSelection, memoryKey]);

  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; generation.current++; docRef.current = null; }; }, [load]);

  function updateTask(index: number, patch: Partial<EditableTask>) {
    if (!draft) return;
    const next = { ...draft, tasks: draft.tasks.map((task, row) => row === index ? { ...task, ...patch } : task) };
    docRef.current = next; setDraft(next); remember(next, conflict);
  }
  function updateLine(index: number, patch: Partial<EditableLine>) {
    if (!draft) return;
    const next = { ...draft, lines: draft.lines.map((line, row) => row === index ? { ...line, ...patch } : line) };
    docRef.current = next; setDraft(next); remember(next, conflict);
  }
  function addTask() {
    if (!draft) return;
    const next = { ...draft, tasks: [...draft.tasks, { title: "", status: "not_started" as const, dueDate: null }] };
    docRef.current = next; setDraft(next); remember(next, conflict);
  }
  function addLine() {
    if (!draft) return;
    const next = { ...draft, lines: [...draft.lines, { description: "", quantity: 1, unitPriceMinorUnits: null, priceText: "", priceBasis: "unknown" as const, quotationBasis: null }] };
    docRef.current = next; setDraft(next); remember(next, conflict); setBudgetPage(Math.floor(draft.lines.length / 20));
  }
  function removeTask(index: number) { if (draft) { const next = { ...draft, tasks: draft.tasks.filter((_, row) => row !== index) }; docRef.current = next; setDraft(next); remember(next, conflict); } }
  function removeLine(index: number) { if (draft) { const next = { ...draft, lines: draft.lines.filter((_, row) => row !== index) }; docRef.current = next; setDraft(next); remember(next, conflict); setBudgetPage((page) => Math.min(page, Math.max(0, Math.ceil(next.lines.length / 20) - 1))); } }

  async function reconcile(body: PreparationWrite, version: number) {
    try {
      const currentActor = await api.me();
      if (!alive.current || generation.current !== version) return;
      if (currentActor.id !== actor?.id || currentActor.role !== "business" || currentActor.mustChangePassword ||
          !currentActor.businessMemberships.some((value) => value.businessId === businessId && value.role === "owner" && value.status === "active")) {
        clearPrivate(); setActor(currentActor); setError("Access is not permitted."); return;
      }
      const raw = await applicationApi.list(businessId);
      if (!alive.current || generation.current !== version) return;
      if (!Array.isArray(raw) || !raw.some((item) => {
        try { const value = application(item, { businessId }); return value.eventId === eventId && value.participationId === participationId; } catch { return false; }
      })) { clearPrivate(); setError("Access is not permitted."); return; }
      const rawDocument = await preparationApi.get(participationId);
      if (!alive.current || generation.current !== version) return;
      const value = parseDocument(rawDocument, participationId);
      if (matchesSubmitted(body, value)) {
        // Adopt server allocated IDs and the authoritative revision before any later edit.
        adopt(value); finish("Saved state confirmed. The latest preparation is ready to edit.");
      } else {
        setConflict(true); remember(docRef.current ?? draft!, true); setError("The latest saved version changed; review it before saving again.");
      }
    } catch (failure) {
      if (alive.current && generation.current === version) {
        if (failure instanceof ApiError && [401, 403].includes(failure.status) || failure instanceof PreparationApiError && [401, 403].includes(failure.status)) {
          clearPrivate(); setError("Access is not permitted."); revalidate();
        } else {
          setConcealed(true); setError("Unable to confirm access and saved state. Check again before continuing.");
        }
      }
    }
  }

  function refreshLatest() {
    discardOnLoad.current = true;
    void load();
  }

  async function save() {
    if (!draft || saving || checking || conflict) return;
    const errors: Record<string, string> = {};
    if (draft.tasks.length > 200) errors.tasks = "Use no more than 200 tasks.";
    draft.tasks.forEach((task, index) => { const title = task.title.trim(); if (!title || Array.from(title).length > 160) errors[`task-${index}-title`] = "Enter a task title using 1–160 characters."; });
    if (draft.lines.length > 200) errors.lines = "Use no more than 200 budget lines.";
    draft.lines.forEach((line, index) => {
      const cents = parseCents(line.priceText);
      if (!line.description.trim() || Array.from(line.description.trim()).length > 160) errors[`line-${index}-description`] = "Enter a description using 1–160 characters.";
      if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 1_000_000) errors[`line-${index}-quantity`] = "Enter a quantity from 1 to 1,000,000.";
      if (cents === undefined) errors[`line-${index}-price`] = "Enter an SGD amount with up to two decimal places and within the limit.";
      if (line.priceBasis === "quotation" && (cents === null || !line.quotationBasis?.trim() || Array.from(line.quotationBasis.trim()).length > 500)) errors[`line-${index}-quote`] = "A quotation needs a known price and a basis using 1–500 characters.";
    });
    if (Object.keys(errors).length) { setFieldErrors(errors); finish("Check the highlighted preparation fields."); document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(); return; }
    const normalized: Draft = { ...draft,
      tasks: draft.tasks.map((task) => ({ ...task, title: task.title.trim() })),
      lines: draft.lines.map((line) => {
        const cents = parseCents(line.priceText)!;
        return { ...line, description: line.description.trim(), unitPriceMinorUnits: cents,
          priceBasis: cents === null ? "unknown" : line.priceBasis === "quotation" ? "quotation" : "estimate",
          quotationBasis: line.priceBasis === "quotation" ? line.quotationBasis?.trim() ?? null : null };
      }) };
    const body = writeBody(normalized), version = generation.current;
    setSaving(true); start();
    try {
      const response = parseDocument(await preparationApi.save(participationId, body), participationId);
      if (generation.current !== version || !alive.current) return;
      adopt(response); finish("Preparation saved.");
    } catch (failure) {
      if (generation.current !== version || !alive.current) return;
      if (failure instanceof PreparationApiError && failure.status === 422) {
        const mapped: Record<string, string> = {};
        failure.fields.forEach((field) => { mapped[field] = `Check ${field}.`; });
        setFieldErrors(mapped); finish(failure.message);
      } else if (failure instanceof PreparationApiError && failure.status === 409) {
        setConflict(true); remember(draft, true); setError(failure.message); finish(failure.message);
      } else if (failure instanceof PreparationApiError && (failure.status === 0 || failure.status >= 500)) {
        finish("Outcome not confirmed. Checking the latest saved preparation.");
        await reconcile(body, version);
      } else {
        if (failure instanceof PreparationApiError && [401, 403].includes(failure.status)) { clearPrivate(); revalidate(); }
        setError(failure instanceof Error ? failure.message : "Request could not be completed."); finish(failure instanceof Error ? failure.message : "Request could not be completed.");
      }
    } finally { if (generation.current === version && alive.current) setSaving(false); }
  }

  const dirty = !!draft && !!docRef.current && isDirty(draft);
  const chosen = selected;
  const shown = !checking && !concealed && !!draft && !!chosen && allowed;
  const lineSubtotal = draft?.lines.reduce((total, line) => {
    const cents = parseCents(line.priceText);
    return cents === null || cents === undefined || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 1_000_000 ? total : total + BigInt(line.quantity) * BigInt(cents);
  }, 0n) ?? 0n;
  const complete = !!draft && draft.lines.every((line) => parseCents(line.priceText) !== null && parseCents(line.priceText) !== undefined);

  return <ApplicationLayout title="Preparation" role="business" dirty={dirty}>
    <Stack spacing={3}>
      {checking && <Typography role="status">Checking access and preparation…</Typography>}
      {error && <Alert severity="error">{error}</Alert>}
      {concealed && !checking && <Button onClick={() => void load()}>Retry access check</Button>}
      {!checking && !hasSelection && <Stack spacing={2}>
        <Typography>Select an existing application to open its private preparation checklist and budget.</Typography>
        {records.map((record) => <Box key={record.participationId} component="article" sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2 }}>
          <Typography component="h2" variant="h2">{record.eventTitle}</Typography><Typography>{record.status === "accepted" ? "Accepted" : record.status === "rejected" ? "Rejected" : record.status === "submitted" ? "Submitted" : "Draft"}</Typography>
          <Button onClick={() => navigate(`/business/preparation?${new URLSearchParams({ businessId, eventId: record.eventId, participationId: record.participationId })}`)}>Open preparation</Button>
        </Box>)}
        {records.length === 0 && <Typography>No existing applications are available for this business.</Typography>}
      </Stack>}
      {shown && draft && chosen && <>
        <Typography>{chosen.eventTitle} · {chosen.status === "accepted" ? "Accepted" : chosen.status === "rejected" ? "Rejected" : chosen.status === "submitted" ? "Submitted" : "Draft"} · Saved revision {draft.revision}</Typography>
        <Typography component="h2" variant="h2">Checklist</Typography>
        {draft.tasks.map((task, index) => <Box component="fieldset" role="group" key={task.id ?? `task-${index}`} sx={{ m: 0, minWidth: 0, border: 1, borderColor: "divider", borderRadius: 2, p: 2 }}>
          <Typography component="legend">Task {index + 1}</Typography><Stack spacing={2}>
            <TextField label="Task title" value={task.title} error={!!fieldErrors[`task-${index}-title`] || !!fieldErrors.title} helperText={fieldErrors[`task-${index}-title`] ?? fieldErrors.title ?? "Required. Maximum 160 characters."} onChange={(event) => updateTask(index, { title: event.target.value })} />
            <TextField select label="Task status" value={task.status} onChange={(event) => updateTask(index, { status: event.target.value as EditableTask["status"] })} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}>{statuses.map((value) => <option key={value} value={value}>{value === "not_started" ? "Not started" : value === "in_progress" ? "In progress" : "Done"}</option>)}</TextField>
            <TextField label="Due date" type="date" value={task.dueDate ?? ""} onChange={(event) => updateTask(index, { dueDate: event.target.value || null })} slotProps={{ inputLabel: { shrink: true } }} />
            <Button color="error" onClick={() => removeTask(index)}>Remove task</Button>
          </Stack>
        </Box>)}
        <Button onClick={addTask} disabled={draft.tasks.length >= 200}>Add task</Button>
        <Divider />
        <Typography component="h2" variant="h2">Budget (SGD)</Typography>
        {draft.lines.slice(budgetPage * 20, budgetPage * 20 + 20).map((line, pageIndex) => {
          const index = budgetPage * 20 + pageIndex;
          const cents = parseCents(line.priceText);
          const amount = cents === null || cents === undefined || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 1_000_000 ? null : BigInt(line.quantity) * BigInt(cents);
          return <Box component="fieldset" role="group" key={line.id ?? `line-${index}`} sx={{ m: 0, minWidth: 0, border: 1, borderColor: "divider", borderRadius: 2, p: 2 }}>
            <Typography component="legend">Budget line {index + 1}</Typography><Stack spacing={2}>
              <TextField label="Description" value={line.description} error={!!fieldErrors[`line-${index}-description`] || !!fieldErrors.description} helperText={fieldErrors[`line-${index}-description`] ?? fieldErrors.description ?? "Required. Maximum 160 characters."} onChange={(event) => updateLine(index, { description: event.target.value })} />
              <TextField label="Quantity" type="number" value={line.quantity} error={!!fieldErrors[`line-${index}-quantity`] || !!fieldErrors.quantity} helperText={fieldErrors[`line-${index}-quantity`] ?? fieldErrors.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} />
              <TextField label="Unit price (SGD)" type="number" inputMode="decimal" value={line.priceText} slotProps={{ htmlInput: { min: 0, max: 1_000_000_000, step: "0.01" } }} error={!!fieldErrors[`line-${index}-price`] || !!fieldErrors.unitPriceMinorUnits} helperText={fieldErrors[`line-${index}-price`] ?? fieldErrors.unitPriceMinorUnits ?? "Leave blank when unknown. Enter up to two decimal places."} onChange={(event) => {
                const priceText = event.target.value, parsed = parseCents(priceText);
                updateLine(index, { priceText, unitPriceMinorUnits: typeof parsed === "number" ? parsed : null, priceBasis: parsed === null ? "unknown" : line.priceBasis === "quotation" ? "quotation" : "estimate", quotationBasis: parsed === null ? null : line.quotationBasis });
              }} />
              <TextField select label="Price basis" value={line.priceBasis} onChange={(event) => updateLine(index, { priceBasis: event.target.value as EditableLine["priceBasis"], quotationBasis: event.target.value === "quotation" ? line.quotationBasis : null })} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}><option value="unknown">Unknown price</option><option value="estimate">Estimate</option><option value="quotation">Quotation</option></TextField>
              {line.priceBasis === "quotation" && <TextField label="Quotation basis" value={line.quotationBasis ?? ""} error={!!fieldErrors[`line-${index}-quote`] || !!fieldErrors.quotationBasis} helperText={fieldErrors[`line-${index}-quote`] ?? fieldErrors.quotationBasis ?? "Record the plain-text basis for this quotation."} onChange={(event) => updateLine(index, { quotationBasis: event.target.value })} />}
              <Typography>{amount === null ? "Line amount unknown" : `Line amount: SGD ${formatMoney(amount)}`} · {line.priceBasis === "estimate" ? "Estimate" : line.priceBasis === "quotation" ? "Quotation" : "Unknown price"}</Typography>
              <Button color="error" onClick={() => removeLine(index)}>Remove budget line</Button>
            </Stack>
          </Box>;
        })}
        {draft.lines.length > 20 && <Stack direction="row" spacing={2} alignItems="center"><Button onClick={() => setBudgetPage((page) => Math.max(0, page - 1))} disabled={budgetPage === 0}>Previous budget page</Button><Typography>Budget lines {budgetPage * 20 + 1}–{Math.min(draft.lines.length, budgetPage * 20 + 20)} of {draft.lines.length}</Typography><Button onClick={() => setBudgetPage((page) => Math.min(Math.ceil(draft.lines.length / 20) - 1, page + 1))} disabled={budgetPage >= Math.ceil(draft.lines.length / 20) - 1}>Next budget page</Button></Stack>}
        <Button onClick={addLine} disabled={draft.lines.length >= 200}>Add budget line</Button>
        <Typography aria-live="polite">Known subtotal: SGD {formatMoney(lineSubtotal)}. {complete ? `Total: SGD ${formatMoney(lineSubtotal)}` : "Total incomplete because one or more prices are unknown."}</Typography>
        {conflict && <Button onClick={refreshLatest}>Reload latest preparation</Button>}
        <Button variant="contained" onClick={() => void save()} disabled={saving || checking || conflict}>Save preparation</Button>
        <Typography role="status" aria-live="polite">{saving ? "Saving preparation…" : status}</Typography>
      </>}
    </Stack>
  </ApplicationLayout>;
}
