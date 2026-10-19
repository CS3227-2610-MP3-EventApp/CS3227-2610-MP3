import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import { api, ApiError } from "./api";
import type { CurrentActor } from "./session";

const AuthContext = createContext<{
  actor: CurrentActor | null;
  setActor: (actor: CurrentActor | null) => void;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [actor, setActor] = useState<CurrentActor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    // The previous prototype stored a role here. It must never restore authority.
    try { sessionStorage.removeItem("eventapp.prototype.session"); } catch { /* Browser storage is optional. */ }
    api.me().then((value) => { if (active) setActor(value); }).catch((failure: unknown) => {
      if (!active) return;
      if (failure instanceof ApiError && failure.status === 401) setActor(null);
      else setError(failure instanceof Error ? failure.message : "Unable to restore your session.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  if (loading) return <Box component="main" sx={{ p: 4 }}><Typography role="status">Loading your session…</Typography></Box>;
  if (error) return <Box component="main" sx={{ p: 4 }}>
    <Typography component="h1" variant="h2">Unable to open EventApp</Typography>
    <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
    <Button onClick={() => setAttempt((value) => value + 1)}>Try again</Button>
  </Box>;
  return <AuthContext.Provider value={{ actor, setActor }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("Authentication context is unavailable.");
  return auth;
}
