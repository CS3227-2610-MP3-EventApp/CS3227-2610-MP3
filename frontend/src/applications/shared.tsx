import { displayDate, browserTimezone } from "../displayDate";
import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { AppearanceControl } from "../Appearance";
import { WorkspaceHeader } from "../WorkspaceHeader";
import type { Application } from "./model";
import { labels } from "./model";
import type { ReactNode } from "react";
export function useFeedback() {
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dispatch = useRef(0);
  function finish(value: string) { dispatch.current++; clearTimeout(timer.current); setStatus(value); }
  function start() {
    const epoch = ++dispatch.current, started = performance.now();
    clearTimeout(timer.current); setStatus("In progress");
    timer.current = setTimeout(() => { if (dispatch.current === epoch && performance.now() - started >= 10000) setStatus("Still in progress"); }, 10000);
  }
  useEffect(() => () => { dispatch.current++; clearTimeout(timer.current); }, []);
  return { status, start, finish };
}
export function Feedback({ status }: { status: string }) { return status ? <Alert role="status" severity={/correction|denied|unavailable|elsewhere|confirmed|available|required/i.test(status) ? "warning" : "info"} sx={{ my: 2, overflowWrap: "anywhere" }}>{status}</Alert> : null; }
export function Frozen({ value }: { value: Application }) {
  return <Box sx={{ overflowWrap: "anywhere" }}>
    <Typography component="h2" variant="h2">{value.status === "accepted" ? "Accepted" : value.status === "rejected" ? "Rejected" : "Submitted - awaiting an organiser decision"}</Typography>
    <Typography>Business: {value.businessName}</Typography><Typography>Event: {value.eventTitle}</Typography>
    <Typography>Submitted content is frozen. Submission is a request for participation. No booth or setup has been assigned.</Typography>
    {value.decision && <><Typography>Decision at <time dateTime={value.decision.decidedAt}>{displayDate(value.decision.decidedAt)} ({browserTimezone()})</time></Typography>{value.decision.reason && <Typography sx={{whiteSpace: "pre-wrap"}}>{value.decision.reason}</Typography>}</>}
    <Typography>Frozen submitted revision: {value.frozenSubmittedContentRevision}</Typography>
    {value.submittedAt && <Typography>Submitted at <time dateTime={value.submittedAt}>{displayDate(value.submittedAt)} ({browserTimezone()})</time></Typography>}
    <ContentSummary value={value} />
  </Box>;
}
export function ContentSummary({ value }: { value: Application }) {
  return <Box component="dl" sx={{ m: 0, overflowWrap: "anywhere", "& dt": { fontWeight: 700, mt: 2 }, "& dd": { m: 0, whiteSpace: "pre-wrap" } }}>{(Object.keys(labels) as (keyof typeof labels)[]).map((field) => <Box key={field}><Typography component="dt">{labels[field]}</Typography><Typography component="dd">{value.content[field]}</Typography></Box>)}</Box>;
}
export function ApplicationLayout({ title, role, dirty = false, children, wide = false }: { title: string; role: "business" | "organiser"; dirty?: boolean; wide?: boolean; children: ReactNode }) {
  const navigate = useNavigate();
  const [destination, setDestination] = useState<string | null>(null);
  useEffect(() => {
    const reload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    const click = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!dirty || !link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.getAttribute("href")!, window.location.href);
      if (url.origin === window.location.origin && url.href !== window.location.href) { event.preventDefault(); event.stopPropagation(); setDestination(url.pathname + url.search); }
    };
    window.addEventListener("beforeunload", reload); document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", reload); document.removeEventListener("click", click, true); };
  }, [dirty]);
  return <Box sx={{ minHeight: "100dvh", minWidth: 0 }}>
    {role === "organiser" ? <WorkspaceHeader /> : <Stack component="header" direction="row" sx={{ p: { xs: 2, md: 3 }, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
      <Link component={RouterLink} to={`/${role}`}>{role === "business" ? "Business" : "Organiser"} workspace / Overview</Link><AppearanceControl />
    </Stack>}
    <Box component="main" sx={{ p: { xs: 2, md: 4 }, maxWidth: wide ? "none" : role === "organiser" ? 1500 : 1100, mx: "auto", minWidth: 0 }}>
      <Typography component="h1" variant="h1" data-page-heading tabIndex={-1} sx={{ mb: 3 }}>{title}</Typography>
      <Paper elevation={0} sx={{ p: role === "organiser" ? 0 : { xs: 2, md: 3 }, border: role === "organiser" ? 0 : 1, bgcolor: role === "organiser" ? "transparent" : "background.paper", borderColor: "divider", minWidth: 0, "& .MuiInputBase-root": { minWidth: 0 } }}>{children}</Paper>
    </Box>
    {destination !== null && <Dialog transitionDuration={0} open onClose={() => setDestination(null)} aria-labelledby="unsaved-title"><DialogTitle id="unsaved-title">Unsaved input</DialogTitle><DialogContent>Your unsaved input will stay in memory while you visit this workspace. Reloading or changing business, event or account clears it.</DialogContent><DialogActions sx={{ flexWrap: "wrap" }}><Button onClick={() => setDestination(null)}>Stay</Button><Button onClick={() => { const path = destination!; setDestination(null); navigate(path); }}>Leave and keep in memory</Button></DialogActions></Dialog>}
  </Box>;
}

