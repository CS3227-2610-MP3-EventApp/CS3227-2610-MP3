import { Alert, Box, Button, Chip, Divider, Paper, Stack, Typography, useTheme } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { Brand } from "./components";
import { roleNames } from "./Entry";
import { type CurrentActor, type Role } from "./session";
import { api, ApiError, errorFeedback } from "./api";
import { useAuth } from "./Auth";
import { AppearanceControl } from "./Appearance";
import { appearanceColors } from "./theme";
import { AttendeeProgramme } from "./AttendeeProgramme";
import { useFeedback } from "./applications/shared";

const workspaceContent: Record<Role, { intro: string; subtitle: string; cards: [string, string, string][] }> = {
  attendee: {
    intro: "Find your kind of experience.",
    subtitle: "Discover what’s on, shape your day and make the most of every moment.",
    cards: [
      ["Browse Programme", "Explore activities, discover new interests and find your next great experience.", "▦"],
      ["My Itinerary", "Bring your favourites together in a day that feels like you.", "▤"],
      ["Event Assistant", "A little guidance for your next event, powered by AI in a future release.", "✧"],
    ],
  },
  organiser: {
    intro: "Bring the bigger picture together.",
    subtitle: "A considered space for the programme, the people and the details behind a great event.",
    cards: [
      ["Programme Management", "Shape the activities and experiences that bring your event to life.", "▦"],
      ["Application Reviews", "Keep business applications and considered decisions in one place.", "▤"],
      ["AI Application Analysis", "Explore future AI support for reviewing application information.", "✧"],
    ],
  },
  business: {
    intro: "Make your next opportunity count.",
    subtitle: "From the first application to the finishing touches, give your event plans a home.",
    cards: [
      ["Applications", "Keep track of your business’s next event opportunities and applications.", "▦"],
      ["Preparation & Budget", "Bring tasks, practical details and event costs into focus.", "▤"],
      ["AI Preparation Draft", "Explore future AI support for a thoughtful first preparation plan.", "✧"],
    ],
  },
};

export function Workspace({ session }: { session: CurrentActor }) {
  const navigate = useNavigate();
  const location = useLocation();
  const browsingProgramme = session.role === "attendee" && location.pathname.startsWith("/attendee/programme");
  const { setActor, destinations, sessionNotice, setSessionNotice } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const progress = useFeedback();
  const [unknown, setUnknown] = useState(false);
  const alive = useRef(true), lock = useRef(false);
  useEffect(() => {alive.current = true; return () => {alive.current = false;};}, []);
  async function checkSession() {
    if (lock.current) return; lock.current = true; setPending(true); progress.start();
    try {const value = await api.me(); if (!alive.current) return; setActor(value); setUnknown(false); setSessionNotice("Outcome not confirmed - your session is still active. Review before signing out again.");}
    catch (failure) {if (!alive.current) return; if (failure instanceof ApiError && [401,403].includes(failure.status)) {setActor(null); setSessionNotice("Sign in required - Sign in again."); navigate("/login", {replace:true});} else setSessionNotice("Outcome not confirmed - unable to check your session. Check session again.");}
    finally {if (alive.current) {lock.current = false; setPending(false); progress.finish("");}}
  }
  async function signOut() {
    if (lock.current || unknown) return;
    lock.current = true; setPending(true); progress.start(); setError(""); setSessionNotice("");
    try { await api.logout(); if (!alive.current) return; setActor(null); navigate("/login", { replace: true }); }
    catch (failure) {if (alive.current) {if (!(failure instanceof ApiError) || failure.status === 0 || failure.status >= 500) {setUnknown(true); setError(failure instanceof ApiError && failure.status >= 500 ? "Request could not be completed." : "Unable to reach EventApp. Please try again."); setSessionNotice("Outcome not confirmed - the sign-out result could not be confirmed. Check session before trying again.");} else setSessionNotice(errorFeedback(failure));}}
    finally {if (alive.current) {lock.current = false; setPending(false); progress.finish("");}}
  }
  const content = workspaceContent[session.role];
  const colors = appearanceColors(useTheme().palette.mode);
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "272px minmax(0, 1fr)" }, minHeight: "100dvh" }}>
    <Box component="aside" sx={{ bgcolor: colors.aside, color: colors.asideText, p: 3, display: "flex", flexDirection: "column", gap: 4 }}>
      <Brand light />
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <Typography variant="overline" sx={{ fontSize: 15, letterSpacing: 1.5, color: colors.asideMuted }}>YOUR WORKSPACE</Typography>
        <Typography sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: colors.asideRaised, borderLeft: `3px solid ${colors.accent}`, fontSize: 21 }}><Box aria-hidden="true" component="span" sx={{ mr: 1.5 }}>▦</Box>Overview</Typography>
      </Box>
      <Box sx={{ mt: "auto", display: { xs: "none", md: "block" } }}>
        <Divider sx={{ borderColor: "#3b5362", mb: 2 }} />
        <Typography variant="body2" sx={{ color: colors.asideMuted }}>{roleNames[session.role]} workspace</Typography>
        <Typography variant="caption" sx={{ color: colors.accent }}>Your EventApp account</Typography>
      </Box>
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Stack component="header" direction="row" alignItems="center" justifyContent="space-between" sx={{ px: { xs: 2.5, lg: 5 }, py: 2, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", flexWrap: "wrap", gap: 2 }}>
        <Typography variant="body2" fontWeight={650}>{roleNames[session.role]} <Box component="span" sx={{ color: "text.secondary", mx: 1 }}>/</Box> Overview</Typography>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}><AppearanceControl /><Button size="small" onClick={() => navigate("/change-password")}>Change password</Button><Button disabled={pending || unknown} size="small" onClick={signOut}>Sign out <Box component="span" aria-hidden="true" sx={{ ml: 1 }}>↗</Box></Button></Stack>
      </Stack>
      <Box component="main" sx={{ p: { xs: 2.5, md: 4, lg: 5 }, maxWidth: 1500, mx: "auto" }}>
        {pending && <Alert role="status" severity="info">{progress.status}</Alert>}
        {(sessionNotice || error) && <Alert severity="error">{sessionNotice && <Typography>{sessionNotice}</Typography>}{error && <Typography>{error}</Typography>}</Alert>}
        {unknown && <Button disabled={pending} onClick={checkSession}>Check session</Button>}
        {browsingProgramme ? <AttendeeProgramme /> : <>
        <Box sx={{ mt: 5, mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}><Box aria-hidden="true" sx={{ width: 7, height: 7, bgcolor: "secondary.main", borderRadius: "50%" }} /><Typography variant="overline" color="secondary.main" sx={{ fontWeight: 700, letterSpacing: 1.6 }}>A SPACE FOR WHAT’S NEXT</Typography></Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Welcome,</Typography>
          <Typography component="h1" variant="h1" data-page-heading tabIndex={-1}>{session.displayName}</Typography>
          <Typography sx={{ color: "text.secondary", mt: 1.5, maxWidth: 650 }}>{content.subtitle}</Typography>
        </Box>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, bgcolor: colors.tint, border: `1px solid ${colors.tintBorder}`, mb: 5, position: "relative", overflow: "hidden" }}>
          <Box aria-hidden="true" sx={{ position: "absolute", right: -45, top: -60, width: 240, height: 240, border: `35px solid ${colors.tintBorder}`, borderRadius: "50%", opacity: 0.65 }} />
          <Box sx={{ position: "relative", maxWidth: 470 }}>
            <Chip label={session.role === "attendee" ? "WORKSPACE PREVIEW" : "YOUR WORKSPACE"} size="small" sx={{ bgcolor: "background.paper", color: colors.tintText, fontSize: 15, fontWeight: 700, letterSpacing: 1, mb: 2 }} />
            <Typography component="p" sx={{ fontSize: { xs: 32, sm: 43.5 }, lineHeight: 1.25, fontWeight: 650, letterSpacing: "-0.7px", overflowWrap: "anywhere" }}>{content.intro}</Typography>
            <Typography variant="body2" sx={{ mt: 1.5, color: colors.tintText }}>{session.role === "organiser" ? "Prepare your event programme, manage locations and publish activities when they are ready." : session.role === "business" ? "Applications are available below. Other features remain previews." : "A first look at your EventApp workspace. Explore the direction below; feature actions are coming later."}</Typography>
          </Box>
        </Paper>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 2.5, flexWrap: "wrap", gap: 1.5 }}><Typography component="h2" variant="h2">Your starting points</Typography><Typography variant="caption" color="text.secondary">{session.role === "organiser" ? "02 / AVAILABLE · 01 / PREVIEW" : session.role === "business" ? "01 / AVAILABLE · 02 / PREVIEWS" : "03 / PREVIEWS"}</Typography></Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 2.5 }}>
          {content.cards.map(([title, description, glyph], index) => <Paper component="article" key={title} elevation={0} sx={{ p: 3, border: 1, borderColor: "divider", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%", mb: 3 }}><Box aria-hidden="true" sx={{ display: "grid", placeItems: "center", width: 54, height: 54, fontSize: 37.5, color: index === 2 ? colors.lavenderText : "secondary.main", bgcolor: index === 2 ? colors.lavender : colors.tint, borderRadius: 2 }}>{glyph}</Box><Typography variant="caption" color="text.secondary">0{index + 1}</Typography></Stack>
            <Typography component="h3" variant="h2" sx={{ fontSize: 27, mb: 1 }}>{title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{description}</Typography>
            {session.role === "attendee" && index === 0 ? <Button component={RouterLink} to="/attendee/programme" variant="outlined" size="small" sx={{ mt: "auto" }}>Explore programme</Button> : session.role === "organiser" && index === 0 ? <><Chip label="Available" size="small" sx={{ mb: 2 }} /><Button variant="contained" size="small" sx={{ mt: "auto" }} onClick={() => navigate("/organiser/programme")}>Open programme</Button></> : (session.role === "business" && index === 0 || session.role === "organiser" && index === 1) ? <><Chip label="Available" size="small" sx={{ mb: 2 }} /><Button component={RouterLink} to={destinations.get(session.role) ?? `/${session.role}/applications`} variant="outlined" size="small" sx={{ mt: "auto" }}>{session.role === "business" ? "Open applications" : "Review applications"}</Button></> : <><Chip label="Preview" size="small" sx={{ mb: 2 }} /><Button disabled variant="outlined" size="small" sx={{ mt: "auto", "&.Mui-disabled": { color: "action.disabled", borderColor: "divider" } }}>Coming later</Button></>}
          </Paper>)}
        </Box>
        <Typography variant="caption" component="p" color="text.secondary" sx={{ mt: 4 }}>EventApp · Made for experiences that bring us together.</Typography>
        </>}
      </Box>
    </Box>
  </Box>;
}
