import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import { request, ApiError } from "./api";
import { ChangeFacts } from "./Disruptions";
import type { Announcement } from "./disruptionApi";
import type { components } from "./api-schema";
import { WorkspaceHeader } from "./WorkspaceHeader";

type Notice = components["schemas"]["Notification"];
type Page<T> = {items: T[]; total: number; limit: number; offset: number};
export function AttendeeUpdates() {
  const {eventId} = useParams();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]), [notices, setNotices] = useState<Notice[]>([]);
  const [page, setPage] = useState(0), [total, setTotal] = useState(0), [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [pendingId, setPendingId] = useState("");
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(""); setAnnouncements([]); setNotices([]);
    const path = eventId ? `/attendee/events/${encodeURIComponent(eventId)}/announcements` : "/attendee/notifications";
    request<Page<Announcement | Notice>>(`${path}?limit=50&offset=${page * 50}`, "GET", undefined, "domain").then((value) => {
      if (!alive) return;
      if (!Array.isArray(value.items)) throw new Error("Invalid response");
      setTotal(value.total);
      if (eventId) setAnnouncements(value.items as Announcement[]); else setNotices(value.items as Notice[]);
    }).catch((cause) => {
      if (!alive) return;
      setError(cause instanceof ApiError && cause.status === 503 && !eventId ? "Personal notifications are pending F02 accepted-itinerary integration. No inbox or recipient data is being fabricated." : "Updates could not be loaded. Check your access or try again.");
    }).finally(() => {if (alive) setLoading(false);});
    return () => {alive = false;};
  }, [eventId, page, attempt]);
  async function markRead(notice: Notice) {
    if (pendingId) return;
    setPendingId(notice.id); setError("");
    try {
      const saved = await request<Notice>(`/attendee/notifications/${notice.id}/read`, "POST", {}, "domain");
      setNotices((values) => values.map((value) => value.id === saved.id ? saved : value));
    } catch {setError("Could not confirm read status. Reload before retrying.");}
    finally {setPendingId("");}
  }
  return <Box sx={{minHeight: "100dvh"}}><WorkspaceHeader role="attendee"/><Stack component="main" spacing={3} sx={{maxWidth: 1100, mx: "auto", p: {xs: 2.5, md: 4}}}>
    <Typography component="h1" variant="h1" data-page-heading tabIndex={-1}>{eventId ? "Event announcements" : "Notifications"}</Typography>
    <Stack direction="row" sx={{gap: 2, flexWrap: "wrap"}}><Button component={RouterLink} to="/attendee/notifications">Notifications</Button><Button component={RouterLink} to={eventId ? `/attendee/programme/events/${eventId}` : "/attendee/programme"}>Browse programme</Button><Button disabled={loading} onClick={() => setAttempt((value) => value + 1)}>Reload updates</Button></Stack>
    {loading ? <Typography role="status">Loading updates…</Typography> : error ? <Alert severity="warning">{error}</Alert> : <>
      {!eventId && <Typography>{notices.filter((notice) => !notice.readAt).length} unread on this page</Typography>}
      {!(announcements.length || notices.length) && <Paper variant="outlined" sx={{p: 3}}><Typography>No {eventId ? "published announcements" : "notifications"} yet.</Typography></Paper>}
      {announcements.map((announcement) => <Paper component="article" key={announcement.id} variant="outlined" sx={{p: 3}}><Stack spacing={2}><Typography component="h2" variant="h2">Programme update</Typography><Typography variant="caption">Published {announcement.publishedAt}</Typography><Typography sx={{whiteSpace: "pre-wrap", overflowWrap: "anywhere"}}>{announcement.body}</Typography><Typography fontWeight={700}>Verified historical change facts</Typography><ChangeFacts change={announcement.sourceFacts}/><Button component={RouterLink} to={`/attendee/programme/events/${announcement.eventId}/items/${announcement.sourceFacts.itemId}`}>View current activity details</Button></Stack></Paper>)}
      {notices.map((notice) => <Paper component="article" key={notice.id} variant="outlined" sx={{p: 3}}><Stack spacing={2}><Chip label={notice.readAt ? "Read" : "Unread"} sx={{alignSelf: "start"}}/><Typography component="h2" variant="h2">Accepted itinerary activity changed</Typography><Typography>Historical change facts—not necessarily the latest programme revision.</Typography><ChangeFacts change={notice.change}/><Stack direction="row" sx={{gap: 2, flexWrap: "wrap"}}><Button component={RouterLink} to={`/attendee/programme/events/${notice.eventId}/items/${notice.itemId}`}>View current activity details</Button><Button disabled={!!notice.readAt || !!pendingId} onClick={() => void markRead(notice)}>Mark as read</Button></Stack></Stack></Paper>)}
      <Stack direction="row" sx={{gap: 2}}><Button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</Button><Typography>Page {page + 1}</Typography><Button disabled={(page + 1) * 50 >= total} onClick={() => setPage((value) => value + 1)}>Next</Button></Stack>
    </>}
  </Stack></Box>;
}
