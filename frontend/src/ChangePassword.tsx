import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./Auth";
import { api, ApiError, errorAction, errorCategory, fieldMessage } from "./api";
import { EntryLayout } from "./components";
import { useFeedback } from "./applications/shared";
import { uncertain } from "./applications/model";
import { clearMarkers } from "./procurement/markers";
export function ChangePassword({ signOutOnly = false }: { signOutOnly?: boolean }) {
  const {actor, setActor, setSessionNotice} = useAuth(), navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState(""), [newPassword, setNewPassword] = useState(""), [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({}), [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false), [unknown, setUnknown] = useState<"password" | "logout" | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const alive = useRef(true), lock = useRef(false); const {status, start, finish} = useFeedback();
  useEffect(() => {alive.current = true; return () => {alive.current = false;};}, []);
  if (!actor) return <Navigate to="/login" replace />;
  async function check() {
    if (lock.current) return; lock.current = true; setPending(true); start();
    try {
      const value = await api.me(); if (!alive.current) return;
      if (value.id !== actor!.id || value.role !== actor!.role) {
        setCurrentPassword(""); setNewPassword(""); setConfirmation("");
        setErrors({}); setError(null); setUnknown(null); setSessionChecked(false); finish("");
        setActor(value);
        navigate(value.mustChangePassword ? "/change-password" : `/${value.role}`, {replace: true});
        return;
      }
      if (unknown === "logout") {setActor(value); setUnknown(null); finish("Outcome not confirmed - your session is still active. Review before signing out again.");}
      else {setActor(value); setSessionChecked(true); finish("Outcome not confirmed - session checked, but the password change is not confirmed. Sign in with your intended new password.");}
    } catch (failure) {
      if (!alive.current) return;
      if (failure instanceof ApiError && [401,403].includes(failure.status)) {setActor(null); setSessionNotice("Sign in required - Sign in again. For an uncertain password change, use your intended new password."); navigate("/login", {replace: true});}
      else finish("Outcome not confirmed - unable to check your session. Check session again.");
    } finally {if (alive.current) {lock.current = false; setPending(false);}}
  }
  async function signOut() {
    if (lock.current || unknown) return; lock.current = true; setPending(true); setError(null); start();
    try {await api.logout(); clearMarkers(null); if (!alive.current) return; setActor(null); navigate("/login", {replace: true});}
    catch (failure) {if (alive.current) {if (uncertain(failure)) {setUnknown("logout"); finish("Outcome not confirmed - the sign-out result could not be confirmed. Check session before trying again.");} else {setError(failure); finish("");}}}
    finally {if (alive.current) {lock.current = false; setPending(false);}}
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (lock.current || unknown) return;
    const next: Record<string,string> = {};
    if (!currentPassword) next.currentPassword = "This field is required.";
    if (!newPassword) next.newPassword = "This field is required.";
    else if (Array.from(newPassword).length < 8 || Array.from(newPassword).length > 128) next.newPassword = "Use between 8 and 128 characters.";
    else if (newPassword === currentPassword) next.newPassword = "The new password must be different from your current password.";
    if (!confirmation) next.confirmation = "This field is required.";
    else if (newPassword !== confirmation) next.confirmation = "The passwords do not match.";
    setErrors(next); setError(null);
    if (Object.keys(next).length) {finish("Needs correction - Check the marked fields." + (newPassword === currentPassword ? " Choose a different password." : "")); document.getElementById(`change-${Object.keys(next)[0]}`)?.focus(); return;}
    lock.current = true; setPending(true); start();
    try {
      const value = await api.changePassword({currentPassword,newPassword}); if (!alive.current) return;
      setCurrentPassword(""); setNewPassword(""); setConfirmation(""); setActor(value); navigate(`/${value.role}`, {replace: true});
    } catch (failure) {
      if (!alive.current) return;
      if (failure instanceof ApiError && failure.status === 401) {setActor(null); setSessionNotice("Sign in required - Sign in again."); navigate("/login", {replace: true}); return;}
      if (uncertain(failure)) {setUnknown("password"); finish("Outcome not confirmed - the server result could not be confirmed. Check session, then sign in with your intended new password.");}
      else {
        const mapped: Record<string,string> = {};
        if (failure instanceof ApiError) {
          if (failure.code === "password_unchanged") mapped.newPassword = failure.message;
          else if (failure.code === "current_password_incorrect") mapped.currentPassword = failure.message;
          else for (const field of failure.fieldErrors) if (["currentPassword","newPassword"].includes(field.field)) mapped[field.field] = fieldMessage(field.code);
        }
        setErrors(mapped); setError(failure); finish("");
      }
    } finally {if (alive.current) {lock.current = false; setPending(false);}}
  }
  const feedback = <>{status && <Alert role="status" severity="info">{status}</Alert>}{error != null && <Alert severity="error"><Typography>{errorCategory(error)}</Typography>{!Object.values(errors).includes(error instanceof ApiError ? error.message : "") && <Typography>{error instanceof ApiError ? error.message : "The request could not be completed."}</Typography>}<Typography>{errorAction(error)}</Typography></Alert>}{unknown && <Button disabled={pending} onClick={check}>Check session</Button>}{unknown === "password" && sessionChecked && <Button onClick={() => navigate("/login")}>Sign in with intended new password</Button>}</>;
  if (signOutOnly) return <><Button disabled={pending || !!unknown} onClick={signOut}>Sign out</Button>{feedback}</>;
  return <EntryLayout><Typography component="h1" variant="h1" data-page-heading tabIndex={-1}>Choose your password.</Typography><Typography color="text.secondary" sx={{my:2}}>{actor.mustChangePassword ? "Replace your initial password to open your workspace." : "Update the password for your EventApp account."}</Typography>
    <Box component="form" noValidate onSubmit={submit}><Stack spacing={2.5}>
      <TextField id="change-currentPassword" label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} error={!!errors.currentPassword} helperText={errors.currentPassword} />
      <TextField id="change-newPassword" label="New password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} error={!!errors.newPassword} helperText={errors.newPassword || "Use between 8 and 128 characters."} />
      <TextField id="change-confirmation" label="Confirm new password" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} error={!!errors.confirmation} helperText={errors.confirmation} />
      {feedback}<Button disabled={pending || !!unknown} variant="contained" type="submit">{pending ? "Changing password..." : "Change password"}</Button><Button disabled={pending || !!unknown} onClick={signOut}>Sign out</Button>
    </Stack></Box></EntryLayout>;
}
