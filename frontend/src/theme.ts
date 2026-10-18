import { createTheme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

export function appearanceColors(mode: PaletteMode) {
  const dark = mode === "dark";
  return {
    aside: dark ? "#0b1821" : "#142c40",
    asideRaised: dark ? "#1b3342" : "#294556",
    asideText: "#ffffff",
    asideMuted: "#c5d4d8",
    accent: "#9dd8ca",
    tint: dark ? "#213f3b" : "#e5efeb",
    tintBorder: dark ? "#41675d" : "#d1e2da",
    tintText: dark ? "#c5e6d9" : "#33534e",
    lavender: dark ? "#3c304c" : "#f0eaf5",
    lavenderText: dark ? "#dbc2f3" : "#6c5a7f",
  };
}

export function createAppTheme(mode: PaletteMode) {
  const dark = mode === "dark";
  return createTheme({
    palette: {
      mode,
      primary: { main: dark ? "#a5dbce" : "#142c40", contrastText: dark ? "#102e30" : "#ffffff" },
      secondary: { main: dark ? "#94dacb" : "#087f79" },
      background: { default: dark ? "#101d27" : "#f7f8f6", paper: dark ? "#1a2b37" : "#ffffff" },
      text: { primary: dark ? "#edf5f3" : "#142c40", secondary: dark ? "#bacbd0" : "#52646d" },
      divider: dark ? "#405360" : "#d6dfdd",
      error: { main: dark ? "#ffb4ab" : "#b3261e" },
      action: { disabled: dark ? "#b2c3c7" : "#63736d", disabledBackground: dark ? "#263c48" : "#edf1ee" },
    },
    typography: {
      fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
      fontSize: 21,
      h1: { fontSize: "2.4rem", fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1.15, overflowWrap: "anywhere", "@media (min-width:600px)": { fontSize: "3.6rem" } },
      h2: { fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.025em", overflowWrap: "anywhere" },
      body1: { fontSize: "1.5rem", lineHeight: 1.65 },
      body2: { fontSize: "1.3125rem", lineHeight: 1.65 },
      caption: { fontSize: "1.125rem", lineHeight: 1.6 },
      overline: { fontSize: "1.125rem", lineHeight: 1.6 },
      button: { fontSize: "1.3125rem", textTransform: "none", fontWeight: 650, lineHeight: 1.5 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: { styleOverrides: {
        "*": { boxSizing: "border-box" },
        body: { margin: 0 },
        html: { colorScheme: mode },
        "a, button, input, [tabindex]": { scrollMargin: "24px" },
        ":focus-visible": { outline: `3px solid ${dark ? "#94dacb" : "#087f79"}`, outlineOffset: "4px" },
        "::selection": { background: dark ? "#365e59" : "#c7eae4" },
      } },
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: {
        root: { minHeight: 48, borderRadius: 8, fontSize: "1.3125rem", whiteSpace: "normal", overflowWrap: "anywhere" },
        sizeSmall: { fontSize: "1.3125rem" },
        contained: { padding: "11px 20px" },
      } },
      MuiTextField: { defaultProps: { fullWidth: true, variant: "outlined" } },
      MuiInputLabel: { styleOverrides: { root: { fontSize: "1.5rem" } } },
      MuiFormHelperText: { styleOverrides: { root: { fontSize: "1.125rem", marginLeft: 0, marginRight: 0 } } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8 }, input: { font: '400 1.5rem/1.4375 "Avenir Next", "Segoe UI", sans-serif' } } },
      MuiTab: { styleOverrides: { root: { minWidth: 0, padding: "12px 4px", textTransform: "none", fontWeight: 650, fontSize: "1.35rem" } } },
      MuiChip: { styleOverrides: { root: { height: "auto", maxWidth: "100%" }, label: { whiteSpace: "normal", paddingTop: 4, paddingBottom: 4 } } },
    },
  });
}
