import { Alert, Box, Chip, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

export function Brand({ light = false }: { light?: boolean }) {
  return <Stack direction="row" spacing={1.2} alignItems="center">
    <Box aria-hidden="true" sx={{ width: 34, height: 34, bgcolor: light ? "#c4e8df" : "primary.main", color: light ? "#142c40" : "white", borderRadius: "10px", display: "grid", placeItems: "center", fontSize: 23, fontWeight: 700 }}>e</Box>
    <Typography component="span" sx={{ fontSize: 22, fontWeight: 750, letterSpacing: "-0.8px", color: light ? "white" : "primary.main" }}>EventApp<span style={{ color: light ? "#91d7ca" : "#087f79" }}>.</span></Typography>
  </Stack>;
}

export function PrototypeNotice() {
  return <Alert icon={false} severity="info" sx={{ bgcolor: "#edf6f3", color: "#33534e", border: "1px solid #d5e7e0", borderRadius: 2, "& .MuiAlert-message": { p: 0 } }}>
    <Typography variant="body2"><strong>UI prototype</strong> — credentials are not authenticated and no persistent account is created. Use synthetic details only.</Typography>
  </Alert>;
}

export function EntryLayout({ children }: { children: ReactNode }) {
  return <Box component="main" sx={{ minHeight: "100dvh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(360px, 0.9fr) minmax(0, 1.1fr)" } }}>
    <Box component="aside" sx={{ color: "#fff", bgcolor: "primary.main", p: { xs: 3, md: 6, lg: 8 }, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <Brand light />
      <Box sx={{ my: { xs: 4, md: "auto" }, py: { md: 7 }, maxWidth: 420 }}>
        <Chip label="A little planning. A lot of possibility." size="small" sx={{ bgcolor: "#294556", color: "#c7e8e0", fontSize: 11, mb: 3, maxWidth: "100%", height: "auto", "& .MuiChip-label": { whiteSpace: "normal", py: 0.7 } }} />
        <Typography component="p" sx={{ fontSize: { xs: "2.3rem", md: "3.3rem" }, fontWeight: 650, letterSpacing: "-0.055em", lineHeight: 1.12, mb: 2.5 }}>Great events.<br /><Box component="span" sx={{ color: "#9dd8ca" }}>Shared experiences.</Box></Typography>
        <Typography sx={{ color: "#c5d0d5", maxWidth: 335, fontSize: 15 }}>One place to discover, organise and bring your next event to life.</Typography>
        <Box aria-hidden="true" sx={{ display: { xs: "none", md: "block" }, mt: 5, p: 3, border: "1px solid #43606e", borderRadius: 3, bgcolor: "#1d394b", transform: "rotate(-3deg)" }}>
          <Stack direction="row" justifyContent="space-between" mb={3}><Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.4 }}>YOUR NEXT CHAPTER</Typography><Typography sx={{ color: "#9dd8ca" }}>↗</Typography></Stack>
          {[['01', 'Discover something new', '#9dd8ca'], ['02', 'Make a plan that fits', '#d6d4ac'], ['03', 'Bring people together', '#a4bed2']].map(([number, text, color]) => <Stack key={number} direction="row" spacing={2} alignItems="center" sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: "#294556" }}><Typography sx={{ color, fontSize: 13 }}>{number}</Typography><Typography sx={{ fontSize: 13 }}>{text}</Typography><Box sx={{ ml: "auto !important", color }}>•</Box></Stack>)}
        </Box>
      </Box>
      <Typography variant="body2" sx={{ color: "#b4c5cb", fontSize: 12 }}>Thoughtfully connected, from the first idea.</Typography>
    </Box>
    <Box sx={{ p: { xs: 3, sm: 5, md: 6 }, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Box sx={{ width: "100%", maxWidth: 460 }}>{children}</Box>
    </Box>
  </Box>;
}
