import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, Box, Button, Divider, Link, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { EntryLayout } from "./components";
import { roles, type Role } from "./session";
import { api, ApiError, errorAction, errorCategory, fieldMessage } from "./api";
import { uncertain } from "./applications/model";
import { useAuth } from "./Auth";
import { useFeedback } from "./applications/shared";

export const roleNames: Record<Role, string> = { attendee: "Attendee", organiser: "Organiser", business: "Business" };

export function Login() {
  const [role, setRole] = useState<Role>("attendee");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const progress = useFeedback();
  const { setActor, sessionNotice, setSessionNotice } = useAuth();
  const [action, setAction] = useState(""), [category, setCategory] = useState(""), [unknown, setUnknown] = useState(false);
  const alive = useRef(true), lock = useRef(false);
  useEffect(() => {alive.current = true; return () => {alive.current = false;};}, []);
  async function checkSession() {
    if (lock.current) return; lock.current = true; setPending(true); progress.start();
    try {const value = await api.me(); if (!alive.current) return; setActor(value); setSessionNotice("Outcome not confirmed - current session checked. Review your account before retrying the original action."); navigate(value.mustChangePassword ? "/change-password" : `/${value.role}`);}
    catch (failure) {if (!alive.current) return; if (failure instanceof ApiError && [401,403].includes(failure.status)) {setActor(null); setUnknown(false); setError("Outcome not confirmed - no authenticated session was found."); setAction("Sign in to check your account before trying registration again.");} else {setError("Outcome not confirmed - unable to check your session."); setAction("Check session again.");}}
    finally {if (alive.current) {lock.current = false; setPending(false); progress.finish("");}}
  }
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!focusTarget) return;
    document.getElementById(focusTarget)?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || unknown) return;
    setError("");
    setSubmitted(true); setFieldErrors({});
    if (!identifier.trim() || !password.length) {
      setCategory("Needs correction"); setError("Check the marked fields."); setAction("Correct your input, then try again.");
      setFocusTarget(!identifier.trim() ? "login-identifier" : "login-password");
      return;
    }
    lock.current = true; setPending(true); progress.start();
    try {
      const actor = await api.login({ identifier: identifier.trim(), password, role });
      if (!alive.current) return;
      setActor(actor);
      setPassword("");
      navigate(actor.mustChangePassword ? "/change-password" : `/${actor.role}`);
    } catch (failure) { if (alive.current) {setError(uncertain(failure) ? "Outcome not confirmed - the server result could not be confirmed." : failure instanceof ApiError ? failure.message : "The request could not be completed."); setAction(uncertain(failure) ? "Check session before trying again." : errorAction(failure)); setCategory(uncertain(failure) ? "" : errorCategory(failure)); setUnknown(uncertain(failure)); if (failure instanceof ApiError) setFieldErrors(Object.fromEntries(failure.fieldErrors.filter((field) => ["identifier","password"].includes(field.field)).map((field) => [field.field,fieldMessage(field.code)])));} }
    finally { if (alive.current) {lock.current = false; setPending(false); progress.finish("");} }
  }

  return <EntryLayout>
    <Typography variant="overline" sx={{ color: "secondary.main", fontWeight: 700, letterSpacing: 2 }}>YOUR EVENT STARTS HERE</Typography>
    <Typography component="h1" variant="h1" data-page-heading tabIndex={-1} sx={{ mt: 1, mb: 1.5 }}>Welcome back.</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>Choose your workspace and log in.</Typography>
    <Tabs value={role} onChange={(_, value: Role) => { setRole(value); setSubmitted(false); setError(""); }} selectionFollowsFocus variant="fullWidth" aria-label="Workspace role" sx={{ mt: 3, mb: 3, borderBottom: 1, borderColor: "divider", "& .MuiTabs-indicator": { bgcolor: "secondary.main", height: 3 } }}>
      {roles.map((value) => <Tab key={value} value={value} label={roleNames[value]} disabled={pending || unknown} wrapped id={`tab-${value}`} aria-controls={`panel-${value}`} />)}
    </Tabs>
    <Box role="tabpanel" id={`panel-${role}`} aria-labelledby={`tab-${role}`}>
      <Box component="form" noValidate onSubmit={submit}>
        <Stack spacing={2.5}>
          <TextField id="login-identifier" name="identifier" label="Username or email" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} slotProps={{ htmlInput: { "aria-required": true } }} error={!!fieldErrors.identifier || submitted && !identifier.trim()} helperText={fieldErrors.identifier || (submitted && !identifier.trim() ? "This field is required." : undefined)} />
          <TextField id="login-password" name="password" label="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} slotProps={{ htmlInput: { "aria-required": true } }} error={!!fieldErrors.password || submitted && !password.length} helperText={fieldErrors.password || (submitted && !password.length ? "This field is required." : undefined)} />
          {pending && <Alert role="status" severity="info">{progress.status}</Alert>}{sessionNotice && <Alert severity="warning">{sessionNotice}</Alert>}{error && <Alert severity="error">{category && <Typography>{category}</Typography>}<Typography>{error}</Typography>{action && <Typography>{action}</Typography>}</Alert>}{unknown && <Button onClick={checkSession} disabled={pending}>Check session</Button>}
          <Button disabled={pending || unknown} variant="contained" type="submit" fullWidth>{pending ? "Logging in…" : `Log in to ${roleNames[role]}`} <Box component="span" aria-hidden="true" sx={{ ml: 1 }}>→</Box></Button>
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
  const progress = useFeedback();
  const { setActor, sessionNotice, setSessionNotice } = useAuth();
  const [action, setAction] = useState(""), [category, setCategory] = useState(""), [unknown, setUnknown] = useState(false);
  const alive = useRef(true), lock = useRef(false);
  useEffect(() => {alive.current = true; return () => {alive.current = false;};}, []);
  async function checkSession() {
    if (lock.current) return; lock.current = true; setPending(true); progress.start();
    try {const value = await api.me(); if (!alive.current) return; setActor(value); setSessionNotice("Outcome not confirmed - current session checked. Review your account before retrying the original action."); navigate(value.mustChangePassword ? "/change-password" : `/${value.role}`);}
    catch (failure) {if (!alive.current) return; if (failure instanceof ApiError && [401,403].includes(failure.status)) {setActor(null); setUnknown(false); setError("Outcome not confirmed - no authenticated session was found."); setAction("Sign in to check your account before trying registration again.");} else {setError("Outcome not confirmed - unable to check your session."); setAction("Check session again.");}}
    finally {if (alive.current) {lock.current = false; setPending(false); progress.finish("");}}
  }
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const fields: Field[] = ["displayName", "username", "email", ...(role === "business" ? ["businessName" as const] : []), "password", "confirmation"];

  useEffect(() => {
    if (!focusTarget) return;
    document.getElementById(focusTarget)?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || unknown) return;
    setError("");
    const next: Partial<Record<Field, string>> = {};
    for (const field of fields) if (!(field === "password" || field === "confirmation" ? values[field].length : values[field].trim().length)) next[field] = "This field is required.";
    if (values.username.trim() && values.username.trim().length < 3) next.username = "Username must be at least 3 characters.";
    else if (values.username.trim() && !/^[A-Za-z0-9_.-]{3,32}$/.test(values.username.trim())) next.username = "Use 3–32 letters, numbers, dots, hyphens or underscores.";
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = "Enter a valid email address.";
    const passwordLength = Array.from(values.password).length;
    if (passwordLength && passwordLength < 8) next.password = "Use between 8 and 128 characters.";
    if (passwordLength > 128) next.password = "Use between 8 and 128 characters.";
    if (values.confirmation.length && values.password !== values.confirmation) next.confirmation = "The passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length) {
      setCategory("Needs correction"); setError("Check the marked fields."); setAction("Correct your input, then try again.");
      const firstInvalid = fields.find((field) => next[field]);
      if (firstInvalid) setFocusTarget(`register-${firstInvalid}`);
      return;
    }
    lock.current = true; setPending(true); progress.start();
    try {
      const body = { displayName: values.displayName.trim(), username: values.username.trim(), email: values.email.trim(), password: values.password };
      const actor = await (role === "business" ? api.registerBusiness({ ...body, businessName: values.businessName.trim() }) : api.registerAttendee(body));
      if (!alive.current) return;
      setActor(actor);
      navigate(`/${actor.role}`);
    } catch (failure) { if (alive.current) {setError(uncertain(failure) ? "Outcome not confirmed - the server result could not be confirmed." : failure instanceof ApiError ? failure.message : "The request could not be completed."); setAction(uncertain(failure) ? "Check session before trying again." : errorAction(failure)); setCategory(uncertain(failure) ? "" : errorCategory(failure)); setUnknown(uncertain(failure)); if (failure instanceof ApiError) setErrors(Object.fromEntries(failure.fieldErrors.filter((field) => fields.includes(field.field as Field)).map((field) => [field.field,fieldMessage(field.code)])));} }
    finally { if (alive.current) {lock.current = false; setPending(false); progress.finish("");} }
  }

  return <EntryLayout>
    <Link component={RouterLink} to="/login" color="text.secondary" underline="hover" sx={{ fontSize: 21, display: "inline-block", mb: 3 }}>← Back to log in</Link>
    <Typography component="h1" variant="h1" data-page-heading tabIndex={-1} sx={{ mb: 1.5 }}>Your next chapter.</Typography>
    <Typography color="text.secondary" sx={{ mb: 2.5 }}>Create an {role === "attendee" ? "attendee" : "initial business owner"} account.</Typography>
    {role === "business" && <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Create a new business with you as its initial owner.</Typography>}
    <Box component="form" noValidate onSubmit={submit} sx={{ mt: 3 }}>
      <Stack spacing={2.5}>
        {fields.map((field) => <TextField key={field} id={`register-${field}`} name={field} label={fieldLabels[field]} value={values[field]} type={field === "password" || field === "confirmation" ? "password" : field === "email" ? "email" : "text"} autoComplete="off" slotProps={{ htmlInput: { "aria-required": true } }} onChange={(event) => setValues({ ...values, [field]: event.target.value })} error={Boolean(errors[field])} helperText={errors[field]} />)}
        {pending && <Alert role="status" severity="info">{progress.status}</Alert>}{sessionNotice && <Alert severity="warning">{sessionNotice}</Alert>}{error && <Alert severity="error">{category && <Typography>{category}</Typography>}<Typography>{error}</Typography>{action && <Typography>{action}</Typography>}</Alert>}{unknown && <Button onClick={checkSession} disabled={pending}>Check session</Button>}
        <Button disabled={pending || unknown} variant="contained" type="submit" fullWidth>{pending ? "Creating account…" : "Create account"} <Box component="span" aria-hidden="true" sx={{ ml: 1 }}>→</Box></Button>
      </Stack>
    </Box>
    <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 2.5, textAlign: "center" }}>One account and one role per email address.</Typography>
  </EntryLayout>;
}
