import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, FormControl, InputLabel, Link as MuiLink, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "./api";
import { useAuth } from "./Auth";
import { programmeApi } from "./programmeApi";
import type { EventSummary, ProgrammePage, PublishedProgrammeItem } from "./programmeTypes";
import { EventQuestions } from "./attendee-planning/EventQuestions";

const types = [["Talk", "talk"], ["Workshop", "workshop"], ["Panel", "panel"], ["Booth", "booth"], ["Performance", "performance"], ["Other", "other"]] as const;
const cataloguePath = "/attendee/programme";
const eventPath = (eventId: string) => `${cataloguePath}/events/${encodeURIComponent(eventId)}`;
const itemPath = (eventId: string, itemId: string) => `${eventPath(eventId)}/items/${encodeURIComponent(itemId)}`;

function localTime(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: timezone, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
  } catch { return "Time unavailable"; }
}

function price(value: number) {
  if (value === 0) return "Free";
  const major = Math.floor(value / 100);
  const minor = value % 100;
  return `SGD ${new Intl.NumberFormat("en-SG", { maximumFractionDigits: 0 }).format(major)}.${String(minor).padStart(2, "0")}`;
}

function EventCard({ event }: { event: EventSummary }) {
  return <Paper component="article" variant="outlined" sx={{ p: 2.5 }}>
    <Typography component="h2" variant="h2" sx={{ fontSize: 26 }}><MuiLink component={Link} underline="hover" color="inherit" to={eventPath(event.id)}>{event.title}</MuiLink></Typography>
    <Typography color="text.secondary" sx={{ mt: 1 }}>{localTime(event.startsAt, event.timezone)} – {localTime(event.endsAt, event.timezone)} · {event.timezone}</Typography>
  </Paper>;
}

function ItemCard({ eventId, item }: { eventId: string; item: PublishedProgrammeItem }) {
  return <Paper component="article" variant="outlined" sx={{ p: 2.5 }}>
    {item.state === "cancelled" && <Chip label="Cancelled" color="warning" sx={{mb: 1}}/>}
    <Typography component="h3" variant="h2" sx={{ fontSize: 24 }}><MuiLink component={Link} underline="hover" color="inherit" to={itemPath(eventId, item.id)}>{item.title}</MuiLink></Typography>
    <Typography color="text.secondary" sx={{ mt: 1 }}>{types.find(([, token]) => token === item.type)?.[0] ?? "Activity"} · {localTime(item.startsAt, item.event.timezone)} – {localTime(item.endsAt, item.event.timezone)}</Typography>
    <Typography sx={{ mt: 1 }}><span>{price(item.priceMinorUnits)}</span> · Capacity: {item.capacity}</Typography>
  </Paper>;
}

function AccessibilityLine({ label, value }: { label: string; value: string | null }) {
  return <Typography><strong>{label}:</strong> {value ?? "Accessibility information not provided"}</Typography>;
}

function Pager({ page, offset, onPage }: { page: ProgrammePage<unknown> | null; offset: number; onPage: (offset: number) => void }) {
  return <Stack direction="row" spacing={1} justifyContent="space-between" sx={{ mt: 2 }}>
    <Button disabled={offset === 0} onClick={() => onPage(Math.max(0, offset - (page?.limit ?? 20)))}>Previous</Button>
    <Button disabled={!page || page.offset + page.limit >= page.total} onClick={() => page && onPage(page.offset + page.limit)}>Next</Button>
  </Stack>;
}

export function AttendeeProgramme() {
  const location = useLocation();
  const navigate = useNavigate();
  const { eventId, itemId } = useParams();
  const { actor, setActor } = useAuth();
  const view = itemId ? "detail" : eventId ? "items" : "events";
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventPage, setEventPage] = useState<ProgrammePage<EventSummary> | null>(null);
  const [items, setItems] = useState<PublishedProgrammeItem[]>([]);
  const [itemPage, setItemPage] = useState<ProgrammePage<PublishedProgrammeItem> | null>(null);
  const [detail, setDetail] = useState<PublishedProgrammeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageOffsets, setPageOffsets] = useState<Record<string, number>>({});
  const offset = pageOffsets[location.pathname] ?? 0;
  const [titleDraft, setTitleDraft] = useState("");
  const [typeDraft, setTypeDraft] = useState("");
  const [dateDraft, setDateDraft] = useState("");
  const [filters, setFilters] = useState({ q: "", type: "", date: "" });
  const selectedEvent = useMemo(() => events.find((event) => event.id === eventId), [events, eventId]);

  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    setLoading(true); setError("");
    if (view === "events") { setEvents([]); setEventPage(null); }
    if (view === "items") { setItems([]); setItemPage(null); }
    if (view === "detail") setDetail(null);
    const load = view === "events"
      ? programmeApi.events(offset, controller.signal).then((page) => { if (current) { setEvents(page.items); setEventPage(page); } })
      : view === "items" && eventId
        ? programmeApi.items(eventId, filters, offset, controller.signal).then((page) => { if (current) { setItems(page.items); setItemPage(page); } })
        : view === "detail" && eventId && itemId
          ? programmeApi.item(eventId, itemId, controller.signal).then((value) => { if (current) setDetail(value); })
          : Promise.reject(new ApiError(404, "This programme page is unavailable."));
    load.catch((failure: unknown) => {
      if (!current) return;
      const apiFailure = failure instanceof ApiError ? failure : new ApiError(0, "Unable to load the programme. Please try again.");
      setError(apiFailure.message);
      if (apiFailure.status === 401) setActor(null);
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [view, eventId, itemId, offset, filters, actor?.id, location.key, setActor]);

  function applyFilters() {
    if (Array.from(titleDraft.trim()).length > 200) {
      setError("Search titles can contain up to 200 characters.");
      return;
    }
    setFilters({ q: titleDraft, type: typeDraft, date: dateDraft });
    setPageOffsets((current) => ({ ...current, [location.pathname]: 0 }));
  }
  function setCurrentOffset(value: number) { setPageOffsets((current) => ({ ...current, [location.pathname]: value })); }
  function retry() {
    setError("");
    // Changing the location key reruns the same validated request and retains filters.
    navigate(`${location.pathname}${location.search}`, { replace: true, state: { retry: Date.now() } });
  }

  return <Box>
    <Stack direction="row" alignItems="center" justifyContent="space-between" useFlexGap flexWrap="wrap" gap={1.5} sx={{ mb: 2.5 }}>
      <Typography component="h1" variant="h1" data-page-heading tabIndex={-1} sx={{ fontSize: { xs: 32, sm: 43 } }}>
        {view === "events" ? "Browse Programme" : view === "items" ? selectedEvent?.title ?? "Event Programme" : detail?.title ?? "Activity Details"}
      </Typography>
      <Button component={Link} to={view === "events" ? "/attendee" : view === "detail" ? eventPath(eventId ?? "") : cataloguePath}>
        {view === "events" ? "Back to workspace" : view === "detail" ? "Back to activities" : "Back to events"}
      </Button>
    </Stack>
    <Stack direction="row" sx={{gap: 2, flexWrap: "wrap", mb: 2}}><Button component={Link} to="/attendee/notifications">Notifications</Button>{eventId && <Button component={Link} to={`/attendee/events/${eventId}/announcements`}>Event announcements</Button>}</Stack>
    {view === "items" && selectedEvent && <Typography color="text.secondary" sx={{ mb: 2 }}>{selectedEvent.timezone} · {localTime(selectedEvent.startsAt, selectedEvent.timezone)} – {localTime(selectedEvent.endsAt, selectedEvent.timezone)}</Typography>}
    {view === "items" && <Box component="form" onSubmit={(event) => { event.preventDefault(); applyFilters(); }} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr auto" }, gap: 1.5, mb: 2.5, alignItems: "start" }}>
      <TextField label="Search activity titles" value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} />
      <FormControl fullWidth><InputLabel id="programme-type-label">Type</InputLabel><Select labelId="programme-type-label" label="Type" value={typeDraft} onChange={(event) => setTypeDraft(event.target.value)}><MenuItem value="">All types</MenuItem>{types.map(([label, token]) => <MenuItem key={token} value={token}>{label}</MenuItem>)}</Select></FormControl>
      <TextField label="Date" type="date" value={dateDraft} onChange={(event) => setDateDraft(event.target.value)} InputLabelProps={{ shrink: true }} helperText="Matches the activity start date in the event timezone." />
      <Button type="submit" variant="contained" sx={{ height: 56 }}>Apply filters</Button>
    </Box>}
    {view === "items" && eventId && <EventQuestions eventId={eventId} timezone={selectedEvent?.timezone ?? items[0]?.event.timezone ?? "UTC"} formatTime={localTime} formatPrice={price} />}
    {loading && <Typography role="status" sx={{ my: 2 }}>Loading programme…</Typography>}
    {error && <Alert severity="error" role="alert" action={<Button color="inherit" onClick={retry}>Retry</Button>}>{error}</Alert>}
    {!loading && !error && view === "events" && events.length === 0 && <Typography sx={{ my: 2 }}>No events are available yet.</Typography>}
    {!loading && !error && view === "items" && items.length === 0 && <Typography sx={{ my: 2 }}>No activities match these filters.</Typography>}
    {!loading && !error && view === "events" && <Stack spacing={1.5}>{events.map((event) => <EventCard key={event.id} event={event} />)}</Stack>}
    {!loading && !error && view === "items" && <Stack spacing={1.5}>{items.map((item) => <ItemCard key={item.id} eventId={eventId ?? item.eventId} item={item} />)}</Stack>}
    {!loading && !error && view === "detail" && detail && <Paper component="article" variant="outlined" sx={{ p: { xs: 2.5, md: 3.5 } }}>
      {detail.state === "cancelled" && <Alert severity="warning" sx={{mb: 2}}>This activity has been cancelled. {detail.cancellationReason} Existing itinerary entries are retained until you change your plan.</Alert>}
      <Typography color="text.secondary">{types.find(([, token]) => token === detail.type)?.[0] ?? "Activity"} · {detail.event.timezone}</Typography>
      <Typography sx={{ mt: 1 }}>{localTime(detail.startsAt, detail.event.timezone)} – {localTime(detail.endsAt, detail.event.timezone)}</Typography>
      <Typography sx={{ mt: 1 }}>{price(detail.priceMinorUnits)} · Capacity: {detail.capacity}</Typography>
      <Typography component="h2" variant="h2" sx={{ mt: 3 }}>Location</Typography>
      <Typography>{detail.room.name}</Typography><Typography>{detail.venue.name}</Typography><Typography>{detail.venue.address}</Typography>
      <Typography component="h2" variant="h2" sx={{ mt: 3 }}>Accessibility information</Typography>
      <Stack spacing={0.5} sx={{ mt: 1 }}><AccessibilityLine label="Activity" value={detail.accessibilityDetails} /><AccessibilityLine label="Room" value={detail.room.accessibilityDetails} /><AccessibilityLine label="Venue" value={detail.venue.accessibilityDetails} /></Stack>
    </Paper>}
    {view === "events" && !loading && !error && <Pager page={eventPage} offset={offset} onPage={setCurrentOffset} />}
    {view === "items" && !loading && !error && <Pager page={itemPage} offset={offset} onPage={setCurrentOffset} />}
  </Box>;
}
