import { displayDate, browserTimezone } from "../displayDate";
import { useEffect, useRef, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, TextField, Typography } from "@mui/material";
import { ApiError } from "../api";
import { analysisApi, type Job, type Report, type Rubric } from "./analysisApi";

const active = (job: Job | null) => job?.state === "pending" || job?.state === "running";
const jobFailures: Record<string, string> = {
  invalid_output: "Analysis failed because the response could not be verified. Review the application or request a new report.",
  timeout: "Analysis timed out. You can request a new report or continue reviewing.",
  job_timeout: "Analysis timed out. You can request a new report or continue reviewing.",
  worker_interrupted: "Analysis was interrupted. Start a new request when the service is available.",
  provider_rate_limited: "Analysis is unavailable because the service usage limit was reached. Try again later.",
  provider_auth_failed: "Analysis is currently unavailable. Contact the platform team or continue reviewing.",
  configuration: "Analysis is currently unavailable. Contact the platform team or continue reviewing.",
  input_too_large: "Analysis could not process this amount of text. Continue reviewing the application.",
  oversized_input: "Analysis could not process this amount of text. Continue reviewing the application.",
};
const safeFailure = (error: unknown) => error instanceof ApiError && error.status === 409
  ? "Changed elsewhere. Your edits are kept; reload the latest rubric before saving again."
  : error instanceof ApiError && [401, 403, 404].includes(error.status)
    ? "Access is unavailable. Sign in again or return to your workspace."
    : error instanceof ApiError && error.status === 429
      ? "The analysis limit has been reached. Try again later."
      : "Analysis could not be completed. Check your input or try again later.";

export default function ApplicationAnalysis({ eventId, applicationId, submittedRevision, onManualReview }: { eventId: string; applicationId: string; submittedRevision: number; onManualReview?: () => void }) {
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [criteria, setCriteria] = useState<Rubric["criteria"]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingRubric, setEditingRubric] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [dialog, setDialog] = useState<"start" | "reload" | null>(null);
  const [historicalRubric, setHistoricalRubric] = useState<Rubric | null>(null);
  const epoch = useRef(0), mutation = useRef(false), requestId = useRef<string | null>(null);
  const settledJobs = useRef(new Set<string>());
  const dirty = !!rubric && JSON.stringify(criteria) !== JSON.stringify(rubric.criteria);
  const invalidCriteria = criteria.some((criterion) => !/^[a-z][a-z0-9-]{0,39}$/.test(criterion.id)
    || !criterion.title.trim() || !criterion.instructions.trim()) || new Set(criteria.map((criterion) => criterion.id)).size !== criteria.length;

  function showError(cause: unknown) {
    setError(safeFailure(cause));
    if (cause instanceof ApiError && [401, 403, 404].includes(cause.status)) {
      setJob(null); setReports([]); setRubric(null); setCriteria([]);
    }
  }

  useEffect(() => {
    const generation = ++epoch.current;
    setLoading(true); setError(""); setStatusError(""); setRubric(null); setCriteria([]); setJob(null); setReports([]); setTotal(0);
    setDialog(null); setHistoricalRubric(null); setBusy(false); mutation.current = false; requestId.current = null; settledJobs.current.clear();
    Promise.all([analysisApi.rubric(eventId), analysisApi.history(eventId, applicationId)])
      .then(([saved, history]) => {
        if (epoch.current !== generation) return;
        if (!Array.isArray(saved.criteria) || !Array.isArray(history.items)) throw new Error("Invalid response");
        setRubric(saved); setCriteria(saved.criteria); setReports(history.items); setTotal(history.total);
        setJob(history.latestJob ?? null);
      }).catch((cause) => { if (epoch.current === generation) showError(cause); })
      .finally(() => { if (epoch.current === generation) setLoading(false); });
    return () => { epoch.current++; };
  }, [eventId, applicationId]);

  useEffect(() => {
    if (!job || !active(job)) return;
    let stopped = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout>;
    const generation = epoch.current;
    async function poll() {
      try {
        const next = await analysisApi.job(job!.id);
        if (stopped || generation !== epoch.current || settledJobs.current.has(next.id)) return;
        if (!active(next)) settledJobs.current.add(next.id);
        failures = 0; setStatusError("");
        setJob(next);
        if (next.report) {
          setReports((previous) => [next.report!, ...previous.filter((report) => report.id !== next.report!.id)]);
          setTotal((previous) => previous + 1);
        }
        if (active(next)) timer = setTimeout(poll, 1500);
      } catch (cause) {
        if (stopped || generation !== epoch.current) return;
        if (cause instanceof ApiError && [401, 403, 404].includes(cause.status)) { showError(cause); return; }
        failures++;
        setStatusError(failures <= 3 ? "Job status is temporarily unavailable. Retrying…" : "Job status is unavailable. Use Reload latest to check again.");
        if (failures <= 3) timer = setTimeout(poll, 1500 * 2 ** (failures - 1));
      }
    }
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [job?.id, job?.state]);

  async function change(operation: () => Promise<void>) {
    if (mutation.current) return;
    mutation.current = true; setBusy(true); setError("");
    const generation = epoch.current;
    try { await operation(); }
    catch (cause) { if (generation === epoch.current) showError(cause); }
    finally { if (generation === epoch.current) { mutation.current = false; setBusy(false); } }
  }

  function save() {
    if (!rubric) return;
    const generation = epoch.current;
    void change(async () => {
      const saved = await analysisApi.saveRubric(eventId, rubric.revision, criteria);
      if (generation !== epoch.current) return;
      setRubric(saved); setCriteria(saved.criteria); setEditingRubric(false); requestId.current = null;
    });
  }

  function start() {
    if (!rubric || dirty || active(job)) return;
    const generation = epoch.current;
    requestId.current ??= crypto.randomUUID();
    void change(async () => {
      const next = await analysisApi.start(eventId, applicationId, {
        requestId: requestId.current!, expectedRubricRevision: rubric.revision,
        expectedSubmittedRevision: submittedRevision, dataSharingConfirmed: true,
      });
      if (generation !== epoch.current) return;
      setJob(next); setDialog(null); requestId.current = null;
    });
  }

  function cancel() {
    if (!job) return;
    const generation = epoch.current;
    void change(async () => {
      const next = await analysisApi.cancel(job.id);
      if (generation === epoch.current) { if (!active(next)) settledJobs.current.add(next.id); setJob(next); }
    });
  }

  function refresh() {
    const generation = epoch.current;
    void change(async () => {
      const [saved, history] = await Promise.all([analysisApi.rubric(eventId), analysisApi.history(eventId, applicationId)]);
      if (generation !== epoch.current) return;
      setRubric(saved); setCriteria(saved.criteria); setReports(history.items); setTotal(history.total); setJob(history.latestJob ?? null); setDialog(null);
      setStatusError("");
    });
  }

  function more() {
    const generation = epoch.current;
    void change(async () => {
      const history = await analysisApi.history(eventId, applicationId, reports.length);
      if (generation === epoch.current) { setReports((previous) => [...previous, ...history.items.filter((report) => !previous.some((old) => old.id === report.id))]); setTotal(history.total); }
    });
  }

  function edit(index: number, key: "id" | "title" | "instructions", value: string) {
    setCriteria((previous) => previous.map((criterion, position) => position === index ? { ...criterion, [key]: value } : criterion));
  }

  function viewRubric(revision: number) {
    const generation = epoch.current;
    void change(async () => {
      const saved = await analysisApi.rubric(eventId, revision);
      if (generation === epoch.current) setHistoricalRubric(saved);
    });
  }

  return <Paper component="section" variant="outlined" sx={{ p: { xs: 2, md: 3 }, minWidth: 0 }}>
    <Stack spacing={3}>
      <Typography component="h2" variant="h2">Application analysis</Typography>
      <Typography color="text.secondary">AI findings support human interpretation and never change an application decision.</Typography>
      <Button component="a" href={`/organiser/applications?eventId=${encodeURIComponent(eventId)}&applicationId=${encodeURIComponent(applicationId)}`} onClick={(event) => {if (onManualReview) {event.preventDefault(); onManualReview();}}} sx={{ alignSelf: "flex-start" }}>Continue manual review</Button>
      {loading && <Typography role="status">Loading analysis…</Typography>}
      {error && <Alert severity="error" role="alert">{error}</Alert>}
      {statusError && <Alert severity="warning" role="status">{statusError}</Alert>}
      {rubric && <>
        <Accordion expanded={editingRubric || rubric.revision === 0 || dirty} onChange={(_, expanded) => setEditingRubric(expanded)} disableGutters elevation={0} sx={{border: 1, borderColor: "divider", borderRadius: 2, "&:before": {display: "none"}}}>
        <AccordionSummary expandIcon={<span aria-hidden="true">⌄</span>}><Typography fontWeight={700}>{rubric.revision === 0 ? "Set up rubric" : "Edit rubric"} · Revision {rubric.revision}</Typography></AccordionSummary>
        <AccordionDetails><Stack spacing={3}>
        <Typography fontWeight={700}>Rubric revision {rubric.revision}{rubric.revision === 0 ? " — save before analysing" : ""}</Typography>
        <Typography variant="body2">Assess only participant type and description, and disclose any missing facts.</Typography>
        {criteria.map((criterion, index) => <Box key={index} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2 }}>
          <Stack spacing={2}>
            <TextField label={`Criterion ${index + 1} ID`} value={criterion.id} onChange={(event) => edit(index, "id", event.target.value)} disabled={busy} slotProps={{ htmlInput: { maxLength: 40 } }} />
            <TextField label={`Criterion ${index + 1} title`} value={criterion.title} onChange={(event) => edit(index, "title", event.target.value)} disabled={busy} slotProps={{ htmlInput: { maxLength: 100 } }} />
            <TextField label={`Criterion ${index + 1} instructions`} value={criterion.instructions} onChange={(event) => edit(index, "instructions", event.target.value)} disabled={busy} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 1000 } }} />
            <Button onClick={() => setCriteria((previous) => previous.filter((_, position) => position !== index))} disabled={busy || criteria.length === 1} sx={{ alignSelf: "flex-start" }}>Remove criterion {index + 1}</Button>
          </Stack>
        </Box>)}
        </Stack></AccordionDetails></Accordion>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 2 }}>
          <Button disabled={busy || criteria.length >= 10} onClick={() => {setEditingRubric(true); setCriteria((previous) => [...previous, { id: `criterion-${crypto.randomUUID().slice(0, 8)}`, title: "", instructions: "" }]);}}>Add criterion</Button>
          <Button variant="outlined" disabled={busy || invalidCriteria || (!dirty && rubric.revision > 0)} onClick={save}>Save rubric</Button>
          <Button disabled={busy} onClick={() => dirty ? setDialog("reload") : refresh()}>Reload latest</Button>
          <Button variant="contained" disabled={busy || dirty || rubric.revision === 0 || active(job)} onClick={() => { setDialog("start"); }}>Analyse application</Button>
        </Stack>
        {dirty && <Typography variant="body2">Save your rubric changes before starting analysis.</Typography>}
        {invalidCriteria && <Alert severity="info">Each criterion needs a unique lowercase ID, a title and assessment instructions.</Alert>}
      </>}
      {!loading && !rubric && <Button onClick={refresh} disabled={busy}>Retry loading</Button>}
      {job && job.state !== "failed" && <Typography role="status" aria-live="polite">Analysis {job.state}</Typography>}
      {job?.state === "failed" && <Alert severity="warning" role="status">{jobFailures[job.failureCode ?? ""] ?? "Analysis failed. You can review the application or try again later."}</Alert>}
      {job?.providerMayHaveRun && job.state === "cancelled" && <Alert severity="info">The provider request may already have been sent and used quota. Any later result is discarded.</Alert>}
      {active(job) && <Button disabled={busy} onClick={cancel} sx={{ alignSelf: "flex-start" }}>Cancel analysis</Button>}
      {reports.map((report) => <Paper variant="outlined" key={report.id} sx={{ p: 2, overflowWrap: "anywhere" }}>
        <Stack spacing={2}>
          <Typography component="h3" variant="h3">Review report</Typography>
          {(report.stale || (!!rubric && report.rubricRevision !== rubric.revision)) && <Alert severity="warning">Stale report — generate a new report for the current rubric.</Alert>}
          <Typography>Rubric {report.rubricRevision}</Typography><Typography>Source revision {report.sourceRevision}</Typography>
          <Typography variant="caption">Created <time dateTime={report.createdAt}>{displayDate(report.createdAt)} ({browserTimezone()})</time></Typography>
          <Button disabled={busy} onClick={() => viewRubric(report.rubricRevision)} sx={{ alignSelf: "flex-start" }}>View criteria used</Button>
          <Typography variant="body2">Limited comparison: up to five same-event submissions with at least 50% normalized word overlap. Unexamined submissions may also match; this is a review prompt.</Typography>
          {report.comparisonRevisions.map((reference) => <Typography key={reference.applicationId} variant="body2">{reference.sourceLabel} · source revision {reference.sourceRevision} · text overlap {Math.round(reference.similarity * 100)}%</Typography>)}
          {report.payload.findings.map((finding) => <Box key={finding.criterionId}>
            <Typography fontWeight={700}>{finding.criterionId}</Typography><Chip size="small" label={finding.status.replaceAll("_", " ")} />
            <Typography sx={{ mt: 1 }}>{finding.explanation}</Typography>
            {finding.evidence.map((evidence, index) => <Box key={index} component="blockquote" sx={{ borderLeft: 3, borderColor: "divider", pl: 2, ml: 0 }}><Typography>{evidence.quote}</Typography><Typography variant="caption">{evidence.sourceLabel} / {evidence.field}</Typography></Box>)}
          </Box>)}
          {report.payload.duplicateFlags.map((flag, index) => <Box key={index}>
            <Typography fontWeight={700}>Possible text match: {flag.sourceLabel}</Typography><Typography>{flag.explanation}</Typography>
            {flag.evidence.map((evidence, position) => <Box component="blockquote" key={position} sx={{ ml: 0, pl: 2, borderLeft: 3, borderColor: "divider" }}><Typography>{evidence.quote}</Typography><Typography variant="caption">{evidence.sourceLabel} / {evidence.field}</Typography></Box>)}
          </Box>)}
        </Stack>
      </Paper>)}
      {!loading && !reports.length && !active(job) && <Typography color="text.secondary">No validated reports yet.</Typography>}
      {reports.length < total && <Button disabled={busy} onClick={more}>Load older reports</Button>}
    </Stack>
    {dialog && <Dialog open transitionDuration={0} onClose={() => !busy && setDialog(null)} aria-labelledby="analysis-confirmation-title" fullWidth maxWidth="sm">
      <DialogTitle id="analysis-confirmation-title">{dialog === "start" ? "Confirm analysis" : "Reload rubric?"}</DialogTitle>
      <DialogContent>
        {dialog === "start" ? <Typography>Application descriptions and assessment criteria will be shared with the AI provider. Account contact fields are excluded. Review the information before starting; this uses your request quota.</Typography> : <Typography>Reloading replaces your unsaved criterion edits with the latest saved rubric.</Typography>}
      </DialogContent>
      <DialogActions><Button onClick={() => setDialog(null)} disabled={busy}>Keep reviewing</Button><Button disabled={busy} onClick={dialog === "start" ? start : refresh}>{dialog === "start" ? "Start analysis" : "Reload rubric"}</Button></DialogActions>
    </Dialog>}
    {historicalRubric && <Dialog open transitionDuration={0} onClose={() => setHistoricalRubric(null)} aria-labelledby="saved-criteria-title" fullWidth maxWidth="sm">
      <DialogTitle id="saved-criteria-title">Saved criteria · revision {historicalRubric.revision}</DialogTitle>
      <DialogContent><Stack spacing={2}>{historicalRubric.criteria.map((criterion) => <Box key={criterion.id}><Typography fontWeight={700}>{criterion.title}</Typography><Typography>{criterion.instructions}</Typography></Box>)}</Stack></DialogContent>
      <DialogActions><Button onClick={() => setHistoricalRubric(null)}>Close</Button></DialogActions>
    </Dialog>}
  </Paper>;
}
