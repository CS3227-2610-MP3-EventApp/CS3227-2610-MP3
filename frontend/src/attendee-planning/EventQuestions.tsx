import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Link as MuiLink, Paper, Stack, TextField, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { ApiError } from "../api";
import { questionApi, type QuestionClaim, type QuestionField, type QuestionJob, type UnknownReason } from "./questionApi";

const POLL_MS = 2000;
const QUESTION_LIMIT = 300;
const NOTICE = "Your question is sent to an external AI service. Do not enter personal details.";
const stateLabel: Record<string, string> = { pending: "Pending", running: "Running", completed: "Completed", failed: "Failed", cancelled: "Cancelled" };
const fieldLabel: Record<QuestionField, string> = {
  title: "Title", type: "Type", startsAt: "Starts", endsAt: "Ends", room: "Room", venueName: "Venue", venueAddress: "Address",
  price: "Price", capacity: "Capacity", accessibility: "Accessibility", state: "Status", cancellationReason: "Cancellation reason",
};
const unknownCopy: Record<UnknownReason, string> = {
  insufficient_evidence: "The programme does not have enough information to answer this question.",
  conflicting_evidence: "The programme has conflicting information about this question.",
  out_of_scope: "This question is outside the programme information available here.",
};
const createErrors: Record<number, string> = {
  429: "Daily question limit reached. Try again tomorrow or browse the programme.",
  409: "A question is already being answered. Wait for it to finish or cancel it.",
  503: "Event questions are not available for this event. You can still browse the programme.",
  404: "This event has no published programme to ask about. You can still browse the programme.",
};

function requestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function createMessage(failure: unknown): string {
  const status = failure instanceof ApiError ? failure.status : 0;
  return createErrors[status] ?? "The question could not be sent. You can still browse the programme.";
}

interface Props {
  eventId: string; timezone: string;
  formatTime: (value: string, timezone: string) => string; formatPrice: (value: number) => string;
}

function factValue({ claim, timezone, formatTime, formatPrice }: { claim: QuestionClaim; timezone: string } & Pick<Props, "formatTime" | "formatPrice">): string {
  const { field, value } = claim;
  if (value === null) return "Not provided";
  if ((field === "startsAt" || field === "endsAt") && typeof value === "string") return formatTime(value, timezone);
  if (field === "price" && typeof value === "number") return formatPrice(value);
  return String(value);
}

export function EventQuestions({ eventId, timezone, formatTime, formatPrice }: Props) {
  const [question, setQuestion] = useState("");
  const [job, setJob] = useState<QuestionJob | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false), [polls, setPolls] = useState(0);
  const locked = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { setJob(null); setError(""); setQuestion(""); }, [eventId]);

  const active = job?.state === "pending" || job?.state === "running";
  const jobId = job?.id;
  useEffect(() => {
    if (!active || !jobId) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      questionApi.get(jobId, controller.signal)
        .then(value => { if (alive.current) setJob(current => current?.id === value.id ? value : current); })
        .catch(() => undefined)
        .finally(() => { if (alive.current && !controller.signal.aborted) setPolls(count => count + 1); });
    }, POLL_MS);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [active, jobId, polls]);

  async function submit(text: string) {
    if (locked.current || active || !text.trim()) return;
    locked.current = true; setBusy(true); setError(""); setJob(null);
    try {
      const created = await questionApi.create(eventId, { requestId: requestId(), question: text });
      if (alive.current) setJob(created);
    } catch (failure) { if (alive.current) setError(createMessage(failure)); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  async function cancel() {
    if (!job) return;
    try { const value = await questionApi.cancel(job.id); if (alive.current) setJob(value); }
    catch { if (alive.current) setError("The question could not be cancelled. Check its status."); }
  }

  const result = job?.state === "completed" && !job.stale ? job.result : null;
  const answered = result?.outcome === "answered" ? result : null;
  const unknown = result?.outcome === "unknown" ? result : null;
  const statusText = !job ? "No question asked yet."
    : `Status: ${stateLabel[job.state]}${active ? ". An answer can take up to a minute." : ""}`;

  return <Paper component="section" variant="outlined" aria-labelledby="event-questions-heading" sx={{ p: { xs: 2, sm: 3 }, mb: 2.5 }}>
    <Typography component="h2" variant="h2" id="event-questions-heading" sx={{ mb: 1 }}>Ask about this event</Typography>
    <Typography id="event-questions-notice" sx={{ mb: 1 }}>{NOTICE}</Typography>
    <TextField label="Your question" multiline minRows={2} fullWidth value={question}
      onChange={event => setQuestion(event.target.value.slice(0, QUESTION_LIMIT))}
      inputProps={{ maxLength: QUESTION_LIMIT, "aria-describedby": "event-questions-notice event-questions-count" }} />
    <Typography id="event-questions-count" variant="body2" sx={{ mt: 0.5 }}>{`${QUESTION_LIMIT - question.length} characters remaining`}</Typography>
    <Typography role="status" aria-label="Question status" sx={{ my: 1 }}>{statusText}</Typography>
    <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} sx={{ my: 1 }}>
      <Button variant="contained" disabled={!question.trim() || active || busy} onClick={() => void submit(question)}>Ask question</Button>
      {active && <Button onClick={() => void cancel()}>Cancel question</Button>}
    </Stack>
    {error && <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>}
    {job?.state === "failed" && <Alert severity="error" sx={{ my: 1 }}>The question could not be answered. You can still browse the programme.</Alert>}
    {job?.state === "cancelled" && <Typography sx={{ my: 1 }}>Question cancelled. You can still browse the programme.</Typography>}
    {job?.state === "cancelled" && job.providerMayHaveRun && <Typography sx={{ my: 1 }}>The AI provider may already have received your question.</Typography>}
    {job?.state === "completed" && job.stale && <Box>
      <Typography sx={{ my: 1 }}>The programme changed after this answer was prepared, so no answer is shown.</Typography>
      <Button variant="outlined" disabled={busy} onClick={() => void submit(job.question)}>Ask again</Button>
    </Box>}
    {unknown && <Box>
      <Typography sx={{ my: 1 }}>{unknownCopy[unknown.reason]}</Typography>
      <MuiLink component={Link} to="/attendee/programme">Browse the programme</MuiLink>
    </Box>}
    {answered && <Box>
      <Box component="ul" role="list" aria-label="Verified facts" sx={{ pl: 3 }}>{answered.claims.map((claim, index) => <li key={`${claim.itemId}-${claim.field}-${index}`}>
        <Typography fontWeight={700}>{claim.itemTitle}</Typography>
        <Typography variant="body2">{`Revision ${claim.itemRevision}`}</Typography>
        {claim.itemState === "cancelled" && <Typography variant="body2" color="warning.main">Cancelled</Typography>}
        <Typography>{`${fieldLabel[claim.field]}: ${factValue({ claim, timezone, formatTime, formatPrice })}`}</Typography>
        <MuiLink component={Link} to={`/attendee/programme/events/${encodeURIComponent(eventId)}/items/${encodeURIComponent(claim.itemId)}`}>
          {`View activity: ${claim.itemTitle}`}
        </MuiLink>
      </li>)}</Box>
      {answered.summary !== null && <Typography sx={{ my: 1 }}><strong>AI summary</strong> {answered.summary}</Typography>}
      <Typography variant="body2">Only the verified facts are checked against the programme.</Typography>
    </Box>}
  </Paper>;
}
