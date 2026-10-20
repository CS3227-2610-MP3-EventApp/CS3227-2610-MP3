import { useEffect, useState, type FormEvent } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, TextField, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { AppearanceControl } from "./Appearance";
import { Brand } from "./components";
import { ApiError, programmeApi, type EventSummary, type ItemFields, type ProgrammeItem, type Room, type Venue } from "./api";
import { localTime, localTimeChoices } from "./programmeTime";
import { useAuth } from "./Auth";

type Errors = Record<string, string[]>;
const types: ItemFields["type"][] = ["talk", "workshop", "panel", "booth", "performance", "other"];
const panel = { p: { xs: 2, md: 3 }, border: 1, borderColor: "divider" };
const actions = { flexWrap: "wrap", gap: 1.5 };
const optionalText = (value: string) => value.trim() || null;
const integer = (value: string, minimum: number) => /^\d+$/.test(value) && Number.isInteger(Number(value)) && Number(value) >= minimum && Number(value) <= 2147483647;
function fieldError(errors: Errors, field: string) { return { error: !!errors[field]?.length, helperText: errors[field]?.join(" ") }; }
function textErrors(name: string, value: string, maximum: number, required = true): string[] {
  if (required && !value.trim()) return [`${name} is required.`];
  return Array.from(value.trim()).length > maximum ? [`${name} must be at most ${maximum} characters.`] : [];
}
function findings(values: Record<string, string[]>): Errors { return Object.fromEntries(Object.entries(values).filter(([, errors]) => errors.length)); }

export function Programme() {
  const navigate = useNavigate();
  const { setActor } = useAuth();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  function accessFailure(failure: unknown) {
    if (failure instanceof ApiError && failure.status === 401) { setActor(null); navigate("/login", { replace: true }); }
  }
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    programmeApi.events().then((values) => {
      if (!active) return;
      setEvents(values); setEventId((current) => values.some((event) => event.id === current) ? current : values[0]?.id ?? "");
    }).catch((failure: unknown) => {
      if (!active) return;
      accessFailure(failure); setError(failure instanceof Error ? failure.message : "Unable to load events.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  const selected = events.find((event) => event.id === eventId);
  return <Box sx={{ minHeight: "100dvh" }}>
    <Stack component="header" direction="row" alignItems="center" justifyContent="space-between" sx={{ p: { xs: 2.5, md: 3 }, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", ...actions }}>
      <Brand /><Stack direction="row" sx={actions}><Button onClick={() => navigate("/organiser")}>Workspace overview</Button><AppearanceControl /></Stack>
    </Stack>
    <Box component="main" sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 1500, mx: "auto" }}>
      <Typography component="h1" variant="h1" data-page-heading tabIndex={-1} sx={{ mb: 2 }}>Programme Management</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Prepare locations and complete drafts, then validate and publish each activity.</Typography>
      {loading ? <Typography role="status">Loading your events…</Typography> : error ? <Alert severity="error" action={<Button onClick={() => setAttempt((value) => value + 1)}>Reload</Button>}>{error}</Alert> : !events.length ? <Alert severity="info">No permitted events are available.</Alert> : <>
        <TextField id="programme-event" label="Event" select value={eventId} onChange={(event) => setEventId(event.target.value)} slotProps={{ select: { native: true } }} sx={{ maxWidth: 700, mb: 3 }}>
          {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
        </TextField>
        {selected && <EventProgramme key={selected.id} event={selected} onAccessFailure={accessFailure} />}
      </>}
    </Box>
  </Box>;
}

function EventProgramme({ event, onAccessFailure }: { event: EventSummary; onAccessFailure: (failure: unknown) => void }) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<ProgrammeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<ProgrammeItem | null>(null);
  const [editing, setEditing] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [locationKey, setLocationKey] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [confirmation, setConfirmation] = useState<{ action: "publish" | "delete"; resource: "venues" | "rooms" | "programme-items"; record: Venue | Room | ProgrammeItem } | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError("");
    Promise.all([programmeApi.venues(event.id), programmeApi.rooms(event.id), programmeApi.items(event.id)]).then(([nextVenues, nextRooms, nextItems]) => {
      if (!active) return;
      setVenues(nextVenues); setRooms(nextRooms); setItems(nextItems);
    }).catch((failure: unknown) => {
      if (!active) return;
      onAccessFailure(failure); setLoadError(failure instanceof Error ? failure.message : "Unable to load programme.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [event.id, attempt]);

  async function perform<T>(operation: () => Promise<T>, success: (value: T) => void, fieldErrors?: (value: Errors) => void) {
    if (pending || conflict || forbidden) return;
    setPending(true); setError(""); fieldErrors?.({});
    try { success(await operation()); }
    catch (failure) {
      onAccessFailure(failure);
      setError(failure instanceof Error ? failure.message : "Request could not be completed.");
      if (failure instanceof ApiError) {
        fieldErrors?.(failure.errors); setConflict(failure.status === 409); setForbidden(failure.status === 403);
      }
    } finally { setPending(false); }
  }
  async function reload() {
    if (pending) return;
    setPending(true); setError(""); setConfirmation(null);
    try {
      const [nextVenues, nextRooms, nextItems, current] = await Promise.all([
        programmeApi.venues(event.id), programmeApi.rooms(event.id), programmeApi.items(event.id),
        selected ? programmeApi.item(event.id, selected.id).catch((failure: unknown) => { if (failure instanceof ApiError && failure.status === 404) return null; throw failure; }) : Promise.resolve(null),
      ]);
      setVenues(nextVenues); setRooms(nextRooms); setItems(nextItems); setSelected(current);
      setEditing(selected ? !!current : editing); setEditorKey((value) => value + 1); setLocationKey((value) => value + 1);
      setConflict(false); setForbidden(false);
    } catch (failure) { onAccessFailure(failure); setError(failure instanceof Error ? failure.message : "Unable to reload programme."); }
    finally { setPending(false); }
  }
  function select(item: ProgrammeItem | null) {
    if (pending || conflict || forbidden) return;
    setSelected(item); setEditing(true); setEditorKey((value) => value + 1); setError("");
  }
  function updateItem(value: ProgrammeItem) {
    setItems((current) => current.some((item) => item.id === value.id) ? current.map((item) => item.id === value.id ? value : item) : [...current, value]);
    setSelected(value); setEditorKey((key) => key + 1);
  }
  async function confirm() {
    if (!confirmation) return;
    const chosen = confirmation;
    await perform(async () => {
      if (chosen.action === "publish") return programmeApi.publish(event.id, chosen.record as ProgrammeItem);
      await programmeApi.delete(event.id, chosen.resource, chosen.record); return null;
    }, (result) => {
      setConfirmation(null);
      if (result) updateItem(result);
      else if (chosen.resource === "programme-items") { setItems((values) => values.filter((value) => value.id !== chosen.record.id)); setSelected(null); setEditing(false); }
      else if (chosen.resource === "venues") { setVenues((values) => values.filter((value) => value.id !== chosen.record.id)); setLocationKey((value) => value + 1); }
      else { setRooms((values) => values.filter((value) => value.id !== chosen.record.id)); setLocationKey((value) => value + 1); }
    });
    setConfirmation(null);
  }
  const blocked = pending || conflict || forbidden;
  const displayInstant = (value: string) => new Intl.DateTimeFormat(undefined, { timeZone: event.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  return <Stack spacing={3}>
    <Typography color="text.secondary">Times use {event.timezone}. Event runs {displayInstant(event.startsAt)} – {displayInstant(event.endsAt)}.</Typography>
    {loading ? <Typography role="status">Loading programme…</Typography> : loadError ? <Alert severity="error" action={<Button onClick={() => setAttempt((value) => value + 1)}>Reload</Button>}>{loadError}</Alert> : <>
      {error && <Alert severity="error" action={<Button disabled={pending} onClick={reload}>Reload</Button>}>{error}{conflict && " Reload and review the current revision before trying again."}</Alert>}
      <LocationManager key={locationKey} eventId={event.id} venues={venues} rooms={rooms} items={items} blocked={blocked} perform={perform} onVenue={(value) => setVenues((values) => values.some((venue) => venue.id === value.id) ? values.map((venue) => venue.id === value.id ? value : venue) : [...values, value])} onRoom={(value) => setRooms((values) => values.some((room) => room.id === value.id) ? values.map((room) => room.id === value.id ? value : room) : [...values, value])} onDelete={(resource, record) => setConfirmation({ action: "delete", resource, record })} />
      <Paper elevation={0} sx={panel}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={actions}><Typography component="h2" variant="h2">Activities</Typography><Button disabled={blocked} variant="outlined" onClick={() => select(null)}>New item</Button></Stack>
        {!items.length ? <Typography color="text.secondary" sx={{ mt: 2 }}>No programme items yet.</Typography> : <Stack spacing={1} sx={{ mt: 2 }}>
          {items.map((item) => <Stack key={item.id} direction="row" alignItems="center" sx={actions}><Button disabled={blocked} onClick={() => select(item)} aria-pressed={selected?.id === item.id}>{item.title}</Button><Chip size="small" label={item.state} /><Typography variant="caption" color="text.secondary">{displayInstant(item.startsAt)}</Typography></Stack>)}
        </Stack>}
      </Paper>
      {editing && <ItemEditor key={editorKey} event={event} rooms={rooms} venues={venues} item={selected} blocked={blocked} perform={perform} onSaved={updateItem} onPublish={() => selected && setConfirmation({ action: "publish", resource: "programme-items", record: selected })} onDelete={() => selected && setConfirmation({ action: "delete", resource: "programme-items", record: selected })} />}
    </>}
    {confirmation && <Dialog open onClose={() => !pending && setConfirmation(null)} aria-labelledby="programme-confirm-title" fullWidth maxWidth="sm">
      <DialogTitle id="programme-confirm-title">{confirmation?.action === "publish" ? "Publish programme item?" : "Delete this record?"}</DialogTitle>
      <DialogContent><Typography>{confirmation && ("title" in confirmation.record ? confirmation.record.title : confirmation.record.name)}</Typography><Typography sx={{ mt: 2 }}>{confirmation?.action === "publish" ? "This revision and its location facts will become visible to attendees and read-only. Confirm after reviewing the saved facts." : "Confirm deletion. This record will be removed if it is unused and deletion is permitted."}</Typography></DialogContent>
      <DialogActions sx={{ p: 3, ...actions }}><Button disabled={pending} onClick={() => setConfirmation(null)}>Cancel</Button><Button disabled={blocked} variant="contained" color={confirmation?.action === "publish" ? "primary" : "error"} onClick={confirm}>{confirmation?.action === "publish" ? "Confirm publish" : "Confirm delete"}</Button></DialogActions>
    </Dialog>}
  </Stack>;
}

type Perform = <T>(operation: () => Promise<T>, success: (value: T) => void, errors?: (value: Errors) => void) => Promise<void>;
function LocationManager({ eventId, venues, rooms, items, blocked, perform, onVenue, onRoom, onDelete }: {
  eventId: string; venues: Venue[]; rooms: Room[]; items: ProgrammeItem[]; blocked: boolean; perform: Perform;
  onVenue: (value: Venue) => void; onRoom: (value: Room) => void;
  onDelete: (resource: "venues" | "rooms", record: Venue | Room) => void;
}) {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [venueName, setVenueName] = useState("");
  const [address, setAddress] = useState("");
  const [venueAccess, setVenueAccess] = useState("");
  const [venueErrors, setVenueErrors] = useState<Errors>({});
  const [room, setRoom] = useState<Room | null>(null);
  const [venueId, setVenueId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [roomAccess, setRoomAccess] = useState("");
  const [roomErrors, setRoomErrors] = useState<Errors>({});
  const publishedRoomIds = new Set(items.filter((item) => item.state === "published").map((item) => item.roomId));
  const venueLocked = !!venue && rooms.some((value) => value.venueId === venue.id && publishedRoomIds.has(value.id));
  const roomLocked = !!room && publishedRoomIds.has(room.id);
  function editVenue(value: Venue | null) { setVenue(value); setVenueName(value?.name ?? ""); setAddress(value?.address ?? ""); setVenueAccess(value?.accessibilityDetails ?? ""); setVenueErrors({}); }
  function editRoom(value: Room | null) { setRoom(value); setVenueId(value?.venueId ?? ""); setRoomName(value?.name ?? ""); setMaxCapacity(value ? String(value.maxCapacity) : ""); setRoomAccess(value?.accessibilityDetails ?? ""); setRoomErrors({}); }
  function saveVenue(event: FormEvent) {
    event.preventDefault();
    const errors = findings({ name: textErrors("Venue name", venueName, 200), address: textErrors("Venue address", address, 500), accessibilityDetails: textErrors("Accessibility details", venueAccess, 2000, false) });
    setVenueErrors(errors); if (Object.keys(errors).length || venueLocked) return;
    void perform(() => programmeApi.saveVenue(eventId, { name: venueName.trim(), address: address.trim(), accessibilityDetails: optionalText(venueAccess) }, venue ?? undefined), (value) => { onVenue(value); editVenue(null); }, setVenueErrors);
  }
  function saveRoom(event: FormEvent) {
    event.preventDefault();
    const errors = findings({ venueId: venues.some((value) => value.id === venueId) ? [] : ["Choose a venue."], name: textErrors("Room name", roomName, 200), maxCapacity: integer(maxCapacity, 1) ? [] : ["Enter a whole number from 1 to 2147483647."], accessibilityDetails: textErrors("Accessibility details", roomAccess, 2000, false) });
    setRoomErrors(errors); if (Object.keys(errors).length || roomLocked) return;
    void perform(() => programmeApi.saveRoom(eventId, venueId, { name: roomName.trim(), maxCapacity: Number(maxCapacity), accessibilityDetails: optionalText(roomAccess) }, room ?? undefined), (value) => { onRoom(value); editRoom(null); }, setRoomErrors);
  }
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3 }}>
    <Paper component="section" elevation={0} sx={panel}>
      <Typography component="h2" variant="h2" sx={{ mb: 2 }}>Venues</Typography>
      {!venues.length && <Typography color="text.secondary" sx={{ mb: 2 }}>No venues yet. Add a venue before a room.</Typography>}
      <Stack spacing={1} sx={{ mb: 2 }}>{venues.map((value) => <Stack key={value.id} direction="row" sx={actions} alignItems="center"><Typography sx={{ flex: 1 }}>{value.name}</Typography><Button disabled={blocked} onClick={() => editVenue(value)}>Edit venue {value.name}</Button><Button color="error" disabled={blocked || rooms.some((current) => current.venueId === value.id)} onClick={() => onDelete("venues", value)}>Delete venue {value.name}</Button></Stack>)}</Stack>
      <Box component="form" noValidate onSubmit={saveVenue}><Stack spacing={2}>
        {venue && <Stack direction="row" sx={actions}><Typography>Editing venue · revision {venue.revision}</Typography><Button disabled={blocked} onClick={() => editVenue(null)}>Cancel venue edit</Button></Stack>}
        {venueLocked && <Alert severity="info">This venue is read-only because a published item uses it.</Alert>}
        <TextField id="venue-name" label="Venue name" value={venueName} onChange={(event) => setVenueName(event.target.value)} disabled={blocked || venueLocked} {...fieldError(venueErrors, "name")} />
        <TextField id="venue-address" label="Venue address" value={address} onChange={(event) => setAddress(event.target.value)} disabled={blocked || venueLocked} {...fieldError(venueErrors, "address")} />
        <TextField id="venue-access" label="Venue accessibility details" value={venueAccess} onChange={(event) => setVenueAccess(event.target.value)} multiline minRows={2} disabled={blocked || venueLocked} {...fieldError(venueErrors, "accessibilityDetails")} />
        <Button type="submit" variant="outlined" disabled={blocked || venueLocked}>{venue ? "Save venue" : "Create venue"}</Button>
      </Stack></Box>
    </Paper>
    <Paper component="section" elevation={0} sx={panel}>
      <Typography component="h2" variant="h2" sx={{ mb: 2 }}>Rooms</Typography>
      {!rooms.length && <Typography color="text.secondary" sx={{ mb: 2 }}>No rooms yet.</Typography>}
      <Stack spacing={1} sx={{ mb: 2 }}>{rooms.map((value) => <Stack key={value.id} direction="row" sx={actions} alignItems="center"><Typography sx={{ flex: 1 }}>{value.name} · maximum {value.maxCapacity}</Typography><Button disabled={blocked} onClick={() => editRoom(value)}>Edit room {value.name}</Button><Button color="error" disabled={blocked || items.some((item) => item.roomId === value.id)} onClick={() => onDelete("rooms", value)}>Delete room {value.name}</Button></Stack>)}</Stack>
      <Box component="form" noValidate onSubmit={saveRoom}><Stack spacing={2}>
        {room && <Stack direction="row" sx={actions}><Typography>Editing room · revision {room.revision}</Typography><Button disabled={blocked} onClick={() => editRoom(null)}>Cancel room edit</Button></Stack>}
        {roomLocked && <Alert severity="info">This room is read-only because a published item uses it.</Alert>}
        <TextField id="room-venue" label="Venue" select value={venueId} onChange={(event) => setVenueId(event.target.value)} disabled={blocked || !!room} slotProps={{ select: { native: true } }} {...fieldError(roomErrors, "venueId")}><option value="">Choose a venue</option>{venues.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}</TextField>
        <TextField id="room-name" label="Room name" value={roomName} onChange={(event) => setRoomName(event.target.value)} disabled={blocked || roomLocked} {...fieldError(roomErrors, "name")} />
        <TextField id="room-capacity" label="Room capacity" type="number" value={maxCapacity} onChange={(event) => setMaxCapacity(event.target.value)} disabled={blocked || roomLocked} slotProps={{ htmlInput: { min: 1, max: 2147483647, step: 1 } }} {...fieldError(roomErrors, "maxCapacity")} />
        <TextField id="room-access" label="Room accessibility details" value={roomAccess} onChange={(event) => setRoomAccess(event.target.value)} multiline minRows={2} disabled={blocked || roomLocked} {...fieldError(roomErrors, "accessibilityDetails")} />
        <Button type="submit" variant="outlined" disabled={blocked || roomLocked || !venues.length}>{room ? "Save room" : "Create room"}</Button>
      </Stack></Box>
    </Paper>
  </Box>;
}

function ItemEditor({ event, rooms, venues, item, blocked, perform, onSaved, onPublish, onDelete }: {
  event: EventSummary; rooms: Room[]; venues: Venue[]; item: ProgrammeItem | null; blocked: boolean; perform: Perform;
  onSaved: (item: ProgrammeItem) => void; onPublish: () => void; onDelete: () => void;
}) {
  const originalChoice = (instant: string) => new Date(instant).toISOString().replace(/\.\d{3}Z$/, ".000Z");
  const [title, setTitle] = useState(item?.title ?? "");
  const [type, setType] = useState<ItemFields["type"]>(item?.type ?? "talk");
  const [roomId, setRoomId] = useState(item?.roomId ?? "");
  const [startsAt, setStartsAt] = useState(item ? localTime(item.startsAt, event.timezone) : "");
  const [endsAt, setEndsAt] = useState(item ? localTime(item.endsAt, event.timezone) : "");
  const [startChoice, setStartChoice] = useState(item ? originalChoice(item.startsAt) : "");
  const [endChoice, setEndChoice] = useState(item ? originalChoice(item.endsAt) : "");
  const [capacity, setCapacity] = useState(item ? String(item.capacity) : "");
  const [price, setPrice] = useState(item ? String(item.priceMinorUnits) : "");
  const [access, setAccess] = useState(item?.accessibilityDetails ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [validation, setValidation] = useState("");
  const [dirty, setDirty] = useState(false);
  const published = item?.state === "published";
  const disabled = blocked || published;
  const startChoices = localTimeChoices(startsAt, event.timezone);
  const endChoices = localTimeChoices(endsAt, event.timezone);
  function resolve(value: string, choices: ReturnType<typeof localTimeChoices>, choice: string, original?: string) {
    // Preserve server precision beyond the wall-clock control and JavaScript Date.
    if (original && value === localTime(original, event.timezone) && choice === originalChoice(original)) return original;
    return choices.length === 1 ? choices[0].instant : choices.find((candidate) => candidate.instant === choice)?.instant;
  }
  function changed() { setDirty(true); setValidation(""); }
  function save(submit: FormEvent) {
    submit.preventDefault();
    if (published) return;
    const start = resolve(startsAt, startChoices, startChoice, item?.startsAt);
    const end = resolve(endsAt, endChoices, endChoice, item?.endsAt);
    const room = rooms.find((value) => value.id === roomId);
    const next = findings({
      title: textErrors("Title", title, 200), roomId: room ? [] : ["Choose a room."], type: types.includes(type) ? [] : ["Choose an activity type."],
      startsAt: start ? [] : [startChoices.length ? "Choose an explicit offset for this repeated local time." : "Enter a valid local time. This time may not exist in the event timezone."],
      endsAt: end ? [] : [endChoices.length ? "Choose an explicit offset for this repeated local time." : "Enter a valid local time. This time may not exist in the event timezone."],
      capacity: !integer(capacity, 1) ? ["Enter a whole number from 1 to 2147483647."] : room && Number(capacity) > room.maxCapacity ? ["Capacity exceeds the room maximum."] : [],
      priceMinorUnits: integer(price, 0) ? [] : ["Enter whole SGD cents from 0 to 2147483647."], accessibilityDetails: textErrors("Accessibility details", access, 2000, false),
    });
    if (start && (Date.parse(start) < Date.parse(event.startsAt) || Date.parse(start) >= Date.parse(event.endsAt))) next.startsAt = ["Start must be within the event dates."];
    if (end && (Date.parse(end) > Date.parse(event.endsAt) || Date.parse(end) <= Date.parse(event.startsAt))) next.endsAt = ["End must be within the event dates."];
    if (start && end && Date.parse(end) <= Date.parse(start)) next.endsAt = ["End must follow start."];
    setErrors(next); if (Object.keys(next).length || !start || !end) return;
    void perform(() => programmeApi.saveItem(event.id, { title: title.trim(), type, roomId, startsAt: start, endsAt: end, capacity: Number(capacity), priceMinorUnits: Number(price), currency: "SGD", accessibilityDetails: optionalText(access) }, item ?? undefined), onSaved, setErrors);
  }
  async function validate() {
    if (!item || published) return;
    setValidation("");
    await perform(() => programmeApi.validate(event.id, item), (result) => { setErrors(result.errors); setValidation(result.valid ? "Saved revision is valid. Publication will independently validate it again." : "Saved revision has validation findings. Correct the draft before publication."); }, setErrors);
  }
  function offsetField(label: string, choices: ReturnType<typeof localTimeChoices>, value: string, change: (value: string) => void) {
    return choices.length > 1 && <TextField id={`item-${label.toLowerCase()}-offset`} label={`${label} offset`} select value={value} onChange={(event) => { change(event.target.value); changed(); }} disabled={disabled} slotProps={{ select: { native: true } }} helperText="This local time occurs twice. Choose its UTC offset."><option value="">Choose offset</option>{choices.map((choice) => <option key={choice.instant} value={choice.instant}>UTC{choice.offset}</option>)}</TextField>;
  }
  return <Paper component="section" elevation={0} sx={panel}>
    <Stack spacing={2.5} component="form" noValidate onSubmit={save}>
      <Stack direction="row" alignItems="center" sx={actions}><Typography component="h2" variant="h2">{item ? "Item details" : "New programme item"}</Typography>{item && <><Chip label={item.state} /><Typography>Revision {item.revision}</Typography></>}</Stack>
      {published && <Alert severity="info">Published items are read-only. Their published venue and room facts are also protected.</Alert>}
      {dirty && item && <Typography variant="body2" color="text.secondary">You have unsaved changes. Validation checks the saved revision. Save before publication.</Typography>}
      <TextField id="item-title" label="Title" value={title} onChange={(event) => { setTitle(event.target.value); changed(); }} disabled={disabled} {...fieldError(errors, "title")} />
      <TextField id="item-type" label="Type" select value={type} onChange={(event) => { setType(event.target.value as ItemFields["type"]); changed(); }} disabled={disabled} slotProps={{ select: { native: true } }} {...fieldError(errors, "type")}>{types.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</TextField>
      <TextField id="item-room" label="Room" select value={roomId} onChange={(event) => { setRoomId(event.target.value); changed(); }} disabled={disabled} slotProps={{ select: { native: true } }} {...fieldError(errors, "roomId")}><option value="">Choose a room</option>{rooms.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}</TextField>
      {roomId && <Typography variant="body2" color="text.secondary">Venue: {venues.find((venue) => venue.id === rooms.find((room) => room.id === roomId)?.venueId)?.name ?? "Unknown"}. Capacity is per item; activities may overlap in the same room.</Typography>}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
        <Stack spacing={2}><TextField id="item-start" label="Starts at" type="datetime-local" value={startsAt} onChange={(event) => { setStartsAt(event.target.value); setStartChoice(""); changed(); }} disabled={disabled} slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 1 } }} {...fieldError(errors, "startsAt")} />{offsetField("Start", startChoices, startChoice, setStartChoice)}</Stack>
        <Stack spacing={2}><TextField id="item-end" label="Ends at" type="datetime-local" value={endsAt} onChange={(event) => { setEndsAt(event.target.value); setEndChoice(""); changed(); }} disabled={disabled} slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 1 } }} {...fieldError(errors, "endsAt")} />{offsetField("End", endChoices, endChoice, setEndChoice)}</Stack>
      </Box>
      <TextField id="item-capacity" label="Capacity" type="number" value={capacity} onChange={(event) => { setCapacity(event.target.value); changed(); }} disabled={disabled} slotProps={{ htmlInput: { min: 1, max: 2147483647, step: 1 } }} {...fieldError(errors, "capacity")} />
      <TextField id="item-price" label="Price (SGD cents)" type="number" value={price} onChange={(event) => { setPrice(event.target.value); changed(); }} disabled={disabled} slotProps={{ htmlInput: { min: 0, max: 2147483647, step: 1 } }} {...fieldError(errors, "priceMinorUnits")} />
      <TextField id="item-access" label="Accessibility details" value={access} onChange={(event) => { setAccess(event.target.value); changed(); }} multiline minRows={2} disabled={disabled} {...fieldError(errors, "accessibilityDetails")} />
      <Typography variant="caption" color="text.secondary">Blank accessibility details mean unknown. Price is in whole SGD cents (1200 = SGD 12.00).</Typography>
      {validation && <Typography role="status">{validation}</Typography>}
      <Stack direction="row" sx={actions}><Button type="submit" variant="contained" disabled={disabled}>Save draft</Button>{item && <><Button disabled={disabled} onClick={validate}>Validate</Button><Button disabled={disabled || dirty} variant="outlined" onClick={onPublish}>Publish</Button><Button disabled={disabled} color="error" onClick={onDelete}>Delete</Button></>}</Stack>
    </Stack>
  </Paper>;
}
