import { useEffect, useState, type FormEvent } from "react";
import { Alert, Box, Button, Divider, Link, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { EntryLayout } from "./components";
import { roles, type Role } from "./session";
import { api } from "./api";
import { useAuth } from "./Auth";

export const roleNames: Record<Role, string> = { attendee: "Attendee", organiser: "Organiser", business: "Business" };

export function Login() {
  const [role, setRole] = useState<Role>("attendee");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const { setActor } = useAuth();
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!focusTarget) return;
    document.getElementById(focusTarget)?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setSubmitted(true);
    if (!identifier.trim() || !password.length) {
      setFocusTarget(!identifier.trim() ? "login-identifier" : "login-password");
      return;
    }
    setPending(true);
    try {
      const actor = await api.login({ identifier: identifier.trim(), password, role });
      setActor(actor);
      setPassword("");
      navigate(actor.mustChangePassword ? "/change-password" : `/${actor.role}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to log in."); }
    finally { setPending(false); }
  }

  return <EntryLayout>
    <Typography variant="overline" sx={{ color: "secondary.main", fontWeight: 700, letterSpacing: 2 }}>YOUR EVENT STARTS HERE</Typography>
    <Typography component="h1" variant="h1" data-page-heading tabIndex={-1} sx={{ mt: 1, mb: 1.5 }}>Welcome back.</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>Choose your workspace and log in.</Typography>
    <Tabs value={role} onChange={(_, value: Role) => { setRole(value); setSubmitted(false); setError(""); }} selectionFollowsFocus variant="fullWidth" aria-label="Workspace role" sx={{ mt: 3, mb: 3, borderBottom: 1, borderColor: "divider", "& .MuiTabs-indicator": { bgcolor: "secondary.main", height: 3 } }}>
      {roles.map((value) => <Tab key={value} value={value} label={roleNames[value]} wrapped id={`tab-${value}`} aria-controls={`panel-${value}`} />)}
    </Tabs>
    <Box role="tabpanel" id={`panel-${role}`} aria-labelledby={`tab-${role}`}>
      <Box component="form" noValidate onSubmit={submit}>
        <Stack spacing={2.5}>
          <TextField id="login-identifier" name="identifier" label="Username or email" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} slotProps={{ htmlInput: { "aria-required": true } }} error={submitted && !identifier.trim()} helperText={submitted && !identifier.trim() ? "Enter a username or email." : undefined} />
          <TextField id="login-password" name="password" label="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} slotProps={{ htmlInput: { "aria-required": true } }} error={submitted && !password.length} helperText={submitted && !password.length ? "Enter a password." : undefined} />
          {error && <Alert severity="error">{error}</Alert>}
          <Button disabled={pending} variant="contained" type="submit" fullWidth>{pending ? "Logging in…" : `Log in to ${roleNames[role]}`} <Box component="span" aria-hidden="true" sx={{ ml: 1 }}>→</Box></Button>
        </Stack>
      </Box>
      <Divider sx={{ my: 3 }} />
      {role === "organiser"
        ? <Typography variant="body2" color="text.secondary">Organiser accounts are provisioned by an authorised administrator. Self-registration is not available.</Typography>
        : <Typography variant="body2" color="text.secondary" textAlign="center">New to EventApp? <Link component={RouterLink} to={`/register/${role}`} sx={{ color: "secondary.main", fontWeight: 700 }}>Create account</Link></Typography>}
    </Box>
    <Typography variant="caption" component="p" color="text.secondary" sx={{ mt: 4, textAlign: "center" }}>Your next experience starts here.</Typography>
  </EntryLayout>;
}

type Field = "displayName" | "username" | "email" | "businessName" | "password" | "confirmation";
const fieldLabels: Record<Field, string> = { displayName: "Display name", username: "Username", email: "Email", businessName: "Business name", password: "Password", confirmation: "Confirm password" };

export function Register({ role }: { role: "attendee" | "business" }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<Field, string>>({ displayName: "", username: "", email: "", businessName: "", password: "", confirmation: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const { setActor } = useAuth();
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const fields: Field[] = ["displayName", "username", "email", ...(role === "business" ? ["businessName" as const] : []), "password", "confirmation"];

  useEffect(() => {
    if (!focusTarget) return;
    document.getElementById(focusTarget)?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const next: Partial<Record<Field, string>> = {};
    for (const field of fields) if (!(field === "password" || field === "confirmation" ? values[field].length : values[field].trim().length)) next[field] = `${fieldLabels[field]} is required.`;
    if (values.username.trim() && values.username.trim().length < 3) next.username = "Username must be at least 3 characters.";
    else if (!/^[A-Za-z0-9_.-]{3,32}$/.test(values.username.trim())) next.username = "Use 3–32 letters, numbers, dots, hyphens or underscores.";
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = "Enter a valid email address.";
    const passwordLength = Array.from(values.password).length;
    if (passwordLength && passwordLength < 8) next.password = "Password must be at least 8 characters.";
    if (passwordLength > 128) next.password = "Password must be at most 128 characters.";
    if (values.confirmation.length && values.password !== values.confirmation) next.confirmation = "Passwords must match.";
    setErrors(next);
    if (Object.keys(next).length) {
      const firstInvalid = fields.find((field) => next[field]);
      if (firstInvalid) setFocusTarget(`register-${firstInvalid}`);
      return;
    }
    setPending(true);
    try {
      const body = { displayName: values.displayName.trim(), username: values.username.trim(), email: values.email.trim(), password: values.password };
      const actor = await (role === "business" ? api.registerBusiness({ ...body, businessName: values.businessName.trim() }) : api.registerAttendee(body));
      setActor(actor);
      navigate(`/${actor.role}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to create your account."); }
    finally { setPending(false); }
  }

  return <EntryLayout>
    <Link component={RouterLink} to="/login" color="text.secondary" underline="hover" sx={{ fontSize: 21, display: "inline-block", mb: 3 }}>← Back to log in</Link>
    <Typography component="h1" variant="h1" data-page-heading tabIndex={-1} sx={{ mb: 1.5 }}>Your next chapter.</Typography>
    <Typography color="text.secondary" sx={{ mb: 2.5 }}>Create an {role === "attendee" ? "attendee" : "initial business owner"} account.</Typography>
    {role === "business" && <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Create a new business with you as its initial owner.</Typography>}
    <Box component="form" noValidate onSubmit={submit} sx={{ mt: 3 }}>
      <Stack spacing={2.5}>
        {fields.map((field) => <TextField key={field} id={`register-${field}`} name={field} label={fieldLabels[field]} value={values[field]} type={field === "password" || field === "confirmation" ? "password" : field === "email" ? "email" : "text"} autoComplete="off" slotProps={{ htmlInput: { "aria-required": true } }} onChange={(event) => setValues({ ...values, [field]: event.target.value })} error={Boolean(errors[field])} helperText={errors[field]} />)}
        {error && <Alert severity="error">{error}</Alert>}
        <Button disabled={pending} variant="contained" type="submit" fullWidth>{pending ? "Creating account…" : "Create account"} <Box component="span" aria-hidden="true" sx={{ ml: 1 }}>→</Box></Button>
      </Stack>
    </Box>
    <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 2.5, textAlign: "center" }}>One account and one role per email address.</Typography>
  </EntryLayout>;
}
