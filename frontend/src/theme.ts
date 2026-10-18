import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: { main: "#142c40" },
    secondary: { main: "#087f79" },
    background: { default: "#f7f8f6", paper: "#ffffff" },
    text: { primary: "#142c40", secondary: "#52646d" },
    divider: "#e1e7e6",
  },
  typography: {
    fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
    h1: { fontSize: "2.4rem", fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1.15 },
    h2: { fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.025em" },
    body1: { lineHeight: 1.7 },
    body2: { lineHeight: 1.65 },
    button: { textTransform: "none", fontWeight: 650 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: { styleOverrides: {
      "*": { boxSizing: "border-box" },
      body: { margin: 0 },
      "a, button, input, [tabindex]": { scrollMargin: "24px" },
      ":focus-visible": { outline: "3px solid #087f79", outlineOffset: "4px" },
      "::selection": { background: "#c7eae4" },
    } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: {
      root: { minHeight: 44, borderRadius: 8 },
      contained: { padding: "11px 20px" },
    } },
    MuiTextField: { defaultProps: { fullWidth: true, variant: "outlined" } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8, backgroundColor: "#fff" } } },
    MuiTab: { styleOverrides: { root: { minWidth: 0, textTransform: "none", fontWeight: 650, fontSize: "0.9rem" } } },
  },
});
