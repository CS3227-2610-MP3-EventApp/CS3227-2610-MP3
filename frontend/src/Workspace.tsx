import { Box, Button, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Brand, PrototypeNotice } from "./components";
import { roleNames } from "./Entry";
import { clearSession, type PreviewSession, type Role } from "./session";

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

export function Workspace({ session }: { session: PreviewSession }) {
  const navigate = useNavigate();
  const content = workspaceContent[session.role];
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "248px minmax(0, 1fr)" }, minHeight: "100dvh" }}>
    <Box component="aside" sx={{ bgcolor: "primary.main", color: "white", p: 3, display: "flex", flexDirection: "column", gap: 4 }}>
      <Brand light />
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <Typography variant="overline" sx={{ fontSize: 10, letterSpacing: 1.5, color: "#b2c6cc" }}>YOUR WORKSPACE</Typography>
        <Typography sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: "#2a4757", borderLeft: "3px solid #9dd8ca", fontSize: 14 }}><Box aria-hidden="true" component="span" sx={{ mr: 1.5 }}>▦</Box>Overview</Typography>
      </Box>
      <Box sx={{ mt: "auto", display: { xs: "none", md: "block" } }}>
        <Divider sx={{ borderColor: "#3b5362", mb: 2 }} />
        <Typography variant="body2" sx={{ color: "#c5d4d8" }}>{roleNames[session.role]} workspace</Typography>
        <Typography variant="caption" sx={{ color: "#9dd8ca" }}>Presentation preview only</Typography>
      </Box>
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Stack component="header" direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ px: { xs: 3, lg: 5 }, py: 2, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", flexWrap: "wrap", rowGap: 1 }}>
        <Typography variant="body2" fontWeight={650}>{roleNames[session.role]} <Box component="span" sx={{ color: "text.secondary", mx: 1 }}>/</Box> Overview</Typography>
        <Button size="small" onClick={() => { clearSession(); navigate("/login", { replace: true }); }}>Sign out <Box component="span" aria-hidden="true" sx={{ ml: 1 }}>↗</Box></Button>
      </Stack>
      <Box component="main" sx={{ p: { xs: 3, md: 4, lg: 5 }, maxWidth: 1300, mx: "auto" }}>
        <PrototypeNotice />
        <Box sx={{ mt: 5, mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}><Box aria-hidden="true" sx={{ width: 7, height: 7, bgcolor: "secondary.main", borderRadius: "50%" }} /><Typography variant="overline" color="secondary.main" sx={{ fontWeight: 700, letterSpacing: 1.6 }}>A SPACE FOR WHAT’S NEXT</Typography></Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Welcome,</Typography>
          <Typography component="h1" variant="h1" data-page-heading tabIndex={-1} sx={{ fontSize: { xs: "2rem", md: "2.7rem" }, overflowWrap: "anywhere" }}>{session.displayName}</Typography>
          <Typography sx={{ color: "text.secondary", mt: 1.5, maxWidth: 650 }}>{content.subtitle}</Typography>
        </Box>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, bgcolor: "#e5efeb", border: "1px solid #d1e2da", mb: 5, position: "relative", overflow: "hidden" }}>
          <Box aria-hidden="true" sx={{ position: "absolute", right: -45, top: -60, width: 240, height: 240, border: "35px solid #d1e3dc", borderRadius: "50%", opacity: 0.65 }} />
          <Box sx={{ position: "relative", maxWidth: 470 }}>
            <Chip label="WORKSPACE PREVIEW" size="small" sx={{ bgcolor: "#fff", color: "#366157", fontSize: 10, fontWeight: 700, letterSpacing: 1, mb: 2 }} />
            <Typography component="p" sx={{ fontSize: { xs: 24, sm: 29 }, lineHeight: 1.25, fontWeight: 650, letterSpacing: "-0.7px" }}>{content.intro}</Typography>
            <Typography variant="body2" sx={{ mt: 1.5, color: "#426459" }}>A first look at your EventApp workspace. Explore the direction below; feature actions are coming later.</Typography>
          </Box>
        </Paper>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={2} sx={{ mb: 2.5 }}><Typography component="h2" variant="h2">Your starting points</Typography><Typography variant="caption" color="text.secondary">03 / PREVIEWS</Typography></Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" }, gap: 2.5 }}>
          {content.cards.map(([title, description, glyph], index) => <Paper component="article" key={title} elevation={0} sx={{ p: 3, border: 1, borderColor: "divider", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%", mb: 3 }}><Box aria-hidden="true" sx={{ display: "grid", placeItems: "center", width: 44, height: 44, fontSize: 25, color: index === 2 ? "#6c5a7f" : "secondary.main", bgcolor: index === 2 ? "#f0eaf5" : "#edf5f1", borderRadius: 2 }}>{glyph}</Box><Typography variant="caption" color="text.secondary">0{index + 1}</Typography></Stack>
            <Typography component="h3" variant="h2" sx={{ fontSize: 18, mb: 1 }}>{title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{description}</Typography>
            <Button disabled variant="outlined" size="small" sx={{ mt: "auto", "&.Mui-disabled": { color: "#63736d", borderColor: "#dbe3df" } }}>Coming later</Button>
          </Paper>)}
        </Box>
        <Typography variant="caption" component="p" color="text.secondary" sx={{ mt: 4 }}>EventApp · Made for experiences that bring us together.</Typography>
      </Box>
    </Box>
  </Box>;
}
