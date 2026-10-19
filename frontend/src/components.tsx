import { Box, Chip, Stack, Typography, useTheme } from "@mui/material";
import type { ReactNode } from "react";
import { AppearanceControl } from "./Appearance";
import { appearanceColors } from "./theme";

export function Brand({ light = false }: { light?: boolean }) {
  return <Stack direction="row" spacing={1.2} alignItems="center">
    <Box aria-hidden="true" sx={{ width: 46, height: 46, flexShrink: 0, bgcolor: light ? "#c4e8df" : "primary.main", color: light ? "#142c40" : "background.paper", borderRadius: "10px", display: "grid", placeItems: "center", fontSize: 34.5, fontWeight: 700 }}>e</Box>
    <Typography component="span" sx={{ fontSize: 33, fontWeight: 750, letterSpacing: "-0.8px", color: light ? "white" : "primary.main" }}>EventApp<span style={{ color: light ? "#91d7ca" : "#087f79" }}>.</span></Typography>
  </Stack>;
}

export function EntryLayout({ children }: { children: ReactNode }) {
  const colors = appearanceColors(useTheme().palette.mode);
  return <Box component="main" sx={{ minHeight: "100dvh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(320px, 0.85fr) minmax(0, 1.15fr)" } }}>
    <Box component="aside" sx={{ color: colors.asideText, bgcolor: colors.aside, p: { xs: 3, md: 4, lg: 6 }, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <Brand light />
      <Box sx={{ my: { xs: 4, md: "auto" }, py: { md: 7 }, maxWidth: 420 }}>
        <Chip label="A little planning. A lot of possibility." size="small" sx={{ bgcolor: colors.asideRaised, color: "#c7e8e0", fontSize: 16.5, mb: 3, maxWidth: "100%", height: "auto", "& .MuiChip-label": { whiteSpace: "normal", py: 0.7 } }} />
        <Typography component="p" sx={{ fontSize: { xs: "2.8rem", md: "4rem" }, fontWeight: 650, letterSpacing: "-0.055em", lineHeight: 1.12, mb: 2.5, overflowWrap: "anywhere" }}>Great events.<br /><Box component="span" sx={{ color: colors.accent }}>Shared experiences.</Box></Typography>
        <Typography sx={{ color: colors.asideMuted, maxWidth: 420, fontSize: 22.5 }}>One place to discover, organise and bring your next event to life.</Typography>
        <Box aria-hidden="true" sx={{ display: { xs: "none", md: "block" }, mt: 5, p: 3, border: "1px solid #43606e", borderRadius: 3, bgcolor: colors.asideRaised }}>
          <Stack direction="row" justifyContent="space-between" mb={3}><Typography sx={{ fontSize: 18, fontWeight: 700, letterSpacing: 1.4 }}>YOUR NEXT CHAPTER</Typography><Typography sx={{ color: colors.accent }}>↗</Typography></Stack>
          {[['01', 'Discover something new', '#9dd8ca'], ['02', 'Make a plan that fits', '#d6d4ac'], ['03', 'Bring people together', '#a4bed2']].map(([number, text, color]) => <Stack key={number} direction="row" spacing={2} alignItems="center" sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: colors.aside }}><Typography sx={{ color, fontSize: 19.5 }}>{number}</Typography><Typography sx={{ fontSize: 19.5 }}>{text}</Typography><Box sx={{ ml: "auto !important", color }}>•</Box></Stack>)}
        </Box>
      </Box>
      <Typography variant="body2" sx={{ color: colors.asideMuted, fontSize: 18 }}>Thoughtfully connected, from the first idea.</Typography>
    </Box>
    <Box sx={{ minWidth: 0, p: { xs: 2.5, sm: 5, md: 4 }, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Box sx={{ width: "100%", maxWidth: 580 }}><Box sx={{ display: "flex", justifyContent: "flex-end", mb: 4 }}><AppearanceControl /></Box>{children}</Box>
    </Box>
  </Box>;
}
