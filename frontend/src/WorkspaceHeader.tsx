import { Button, Link, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { AppearanceControl } from "./Appearance";
import { Brand } from "./components";

export function WorkspaceHeader({role = "organiser"}: {role?: "organiser" | "attendee"}) {
  return <Stack component="header" direction="row" alignItems="center" justifyContent="space-between" sx={{ p: { xs: 2.5, md: 3 }, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", flexWrap: "wrap", gap: 2 }}>
    <Link component={RouterLink} to={`/${role}`} underline="none" aria-label={`EventApp ${role} home`}><Brand /></Link>
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 2 }}><Button component={RouterLink} to={`/${role}`}>Workspace overview</Button><AppearanceControl /></Stack>
  </Stack>;
}
