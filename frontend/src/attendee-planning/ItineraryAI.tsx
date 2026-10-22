import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Checkbox, FormControlLabel, Paper, Stack, Typography } from "@mui/material";
import { ApiError } from "../api";
import type { PublishedProgrammeItem } from "../programmeTypes";
import { itineraryAiApi, type ItineraryJob } from "./aiApi";
import type { Selection } from "./types";

const POLL_MS = 2000;
const constraintLabels: Record<string, string> = { overlap: "No overlapping activities", budget: "Within budget", accessibility: "Accessibility requirements" };
const createErrors: Record<string, string> = {
  daily_limit: "Daily AI itinerary limit reached. Try again tomorrow or plan manually.",
  active_job: "An AI itinerary request is already active.",
  revision_conflict: "Your preferences changed. Reload and try again.",
};
const stateLabel: Record<string, string> = { pending: "Pending", running: "Running", completed: "Completed", failed: "Failed", cancelled: "Cancelled" };

function requestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function createMessage(failure: unknown): string {
  if (failure instanceof ApiError) {
    if (failure.status === 503) return "AI itinerary suggestions are not available for this event.";
    if (failure.status === 429 || failure.status === 409) return createErrors[failure.code ?? ""] ?? "The AI itinerary request could not be started. Plan manually below.";
  }
  return "The AI itinerary request could not be started. Plan manually below.";
}

interface Props {
  eventId: string; preferenceRevision: number; items: PublishedProgrammeItem[]; disabled: boolean;
  formatTime: (value: string, timezone: string) => string; onSave: (items: Selection[]) => void;
}

export function ItineraryAI({ eventId, preferenceRevision, items, disabled, formatTime, onSave }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [job, setJob] = useState<ItineraryJob | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false), [polls, setPolls] = useState(0);
  const locked = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { setJob(null); setError(""); setConfirmed(false); }, [eventId]);

  const active = job?.state === "pending" || job?.state === "running";
  const jobId = job?.id;
  useEffect(() => {
    if (!active || !jobId) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      itineraryAiApi.get(jobId, controller.signal)
        .then(value => { if (alive.current) setJob(current => current?.id === value.id ? value : current); })
        .catch(() => undefined)
        .finally(() => { if (alive.current && !controller.signal.aborted) setPolls(count => count + 1); });
    }, POLL_MS);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [active, jobId, polls]);

  async function generate() {
    if (locked.current || !confirmed || active) return;
    locked.current = true; setBusy(true); setError(""); setJob(null);
    try {
      const created = await itineraryAiApi.create(eventId, { requestId: requestId(), preferenceRevision, confirmSynthetic: true });
      if (alive.current) setJob(created);
    } catch (failure) { if (alive.current) setError(createMessage(failure)); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  async function cancel() {
    if (!job) return;
    try { const value = await itineraryAiApi.cancel(job.id); if (alive.current) setJob(value); }
    catch { if (alive.current) setError("The AI itinerary request could not be cancelled. Check its status."); }
  }

  const result = job?.state === "completed" ? job.result : null;
  const zone = items[0]?.event.timezone ?? "UTC";
  const byId = new Map(items.map(item => [item.id, item]));
  const feasible = result?.outcome === "feasible" ? result : null;
  const stale = !!feasible && (feasible.preferenceRevision !== preferenceRevision
    || feasible.items.some(item => { const current = byId.get(item.itemId); return !!current && current.revision !== item.itemRevision; }));

  return <Paper component="section" variant="outlined" aria-labelledby="ai-itinerary-heading" sx={{ p: { xs: 2, sm: 3 } }}>
    <Typography component="h2" variant="h2" id="ai-itinerary-heading" sx={{ mb: 1 }}>AI itinerary suggestions</Typography>
    <Typography sx={{ mb: 1 }}>Ask for a suggested plan from the published programme and your preferences. Suggestions are only a starting point; you choose whether to save or accept anything.</Typography>
    <Typography role="status" aria-label="AI itinerary status" sx={{ my: 1 }}>{job ? `Status: ${stateLabel[job.state]}` : "No AI itinerary requested yet."}</Typography>
    <FormControlLabel control={<Checkbox checked={confirmed} onChange={(_, checked) => setConfirmed(checked)} disabled={disabled || active} />} label="I confirm this event uses only synthetic data" />
    <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} sx={{ my: 1 }}>
      <Button variant="contained" disabled={disabled || !confirmed || active || busy} onClick={() => void generate()}>Generate AI itinerary</Button>
      {active && <Button onClick={() => void cancel()}>Cancel AI itinerary</Button>}
    </Stack>
    {error && <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>}
    {job?.state === "failed" && <Alert severity="error" sx={{ my: 1 }}>AI itinerary generation failed. You can plan manually below.</Alert>}
    {job?.state === "cancelled" && job.providerMayHaveRun && <Typography sx={{ my: 1 }}>The AI provider may already have received your request.</Typography>}
    {result?.outcome === "infeasible" && <Box>
      <Typography fontWeight={700}>No feasible itinerary found.</Typography>
      <Box component="ul" role="list" aria-label="Blocking constraints">{result.blockingConstraints.map((entry, index) => <li key={`${entry.constraint}-${index}`}>{entry.detail}</li>)}</Box>
      <Typography>You can still plan manually below.</Typography>
    </Box>}
    {feasible && <Box>
      {stale && <Alert severity="warning" sx={{ my: 1 }}>Stale suggestion: your preferences or the programme have changed. Generate a new itinerary.</Alert>}
      <Box component="ol" role="list" aria-label="AI suggested activities" sx={{ pl: 3 }}>{feasible.items.map(item => {
        const current = byId.get(item.itemId);
        return <li key={item.itemId}>
          <Typography fontWeight={700}>{current?.title ?? "Activity"}</Typography>
          <Typography>{formatTime(item.startsAt, zone)} – {formatTime(item.endsAt, zone)}</Typography>
          <Typography>{item.reason}</Typography>
          <Typography variant="body2">Source: {item.sourceLabel}</Typography>
          {current && current.accessibilityDetails === null && <Typography variant="body2">Accessibility information not provided. You will need to confirm suitability before accepting.</Typography>}
        </li>;
      })}</Box>
      <Box component="ul" role="list" aria-label="Constraint results" sx={{ pl: 3 }}>{feasible.constraintResults.map(entry => <li key={entry.constraint}>{`${constraintLabels[entry.constraint]}: ${entry.passed ? "Passed" : "Not passed"}`}</li>)}</Box>
      {!stale && <Typography sx={{ my: 1 }}>Suggestion only. Nothing is saved until you choose Save as draft.</Typography>}
      {!stale && <Button variant="outlined" disabled={disabled} onClick={() => onSave(feasible.items.map(item => ({ programmeItemId: item.itemId, observedProgrammeRevision: item.itemRevision, accessibilityConfirmed: false })))}>Save as draft</Button>}
    </Box>}
  </Paper>;
}
