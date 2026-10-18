import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, CssBaseline, ThemeProvider, type PaletteMode } from "@mui/material";
import { createAppTheme } from "./theme";

const preferenceKey = "eventapp.colorMode";
const AppearanceContext = createContext({ mode: "light" as PaletteMode, toggle: () => {} });

function initialMode(): PaletteMode {
  try {
    const saved = localStorage.getItem(preferenceKey);
    if (saved === "light" || saved === "dark") return saved;
    if (saved !== null) localStorage.removeItem(preferenceKey);
  } catch { /* An unavailable preference never changes entry or session state. */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(initialMode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  useEffect(() => { document.documentElement.dataset.colorMode = mode; }, [mode]);

  function toggle() {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    try { localStorage.setItem(preferenceKey, next); } catch { /* The in-memory choice still applies; no saved-state claim is shown. */ }
  }

  return <AppearanceContext.Provider value={{ mode, toggle }}><ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider></AppearanceContext.Provider>;
}

export function AppearanceControl() {
  const { mode, toggle } = useContext(AppearanceContext);
  const next = mode === "light" ? "dark" : "light";
  return <Button onClick={toggle} aria-label={`Switch to ${next} mode`} variant="outlined" sx={{ flexShrink: 0 }}>
    <span aria-hidden="true">{mode === "light" ? "☾" : "☀"}</span>&nbsp;{next === "dark" ? "Dark" : "Light"} mode
  </Button>;
}
