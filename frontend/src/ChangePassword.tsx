import { useState, type FormEvent } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./Auth";
import { api, ApiError } from "./api";
import { EntryLayout } from "./components";

export function ChangePassword({ signOutOnly = false }: { signOutOnly?: boolean }) {
  const { actor, setActor } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const newPasswordLength = Array.from(newPassword).length;
  if (!actor) return <Navigate to="/login" replace />;

  async function signOut() {
    setPending(true);
    setError("");
    try { await api.logout(); setActor(null); navigate("/login", { replace: true }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to sign out."); }
    finally { setPending(false); }
  }

  const signOutControl = <><Button disabled={pending} onClick={signOut}>Sign out</Button>{error && <Alert severity="error">{error}</Alert>}</>;
  if (signOutOnly) return signOutControl;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setSubmitted(true);
    setError("");
    if (!currentPassword || newPasswordLength < 8 || newPasswordLength > 128 || newPassword !== confirmation) return;
    setPending(true);
    try {
      const updated = await api.changePassword({ currentPassword, newPassword });
      setActor(updated);
      setCurrentPassword(""); setNewPassword(""); setConfirmation("");
      navigate(`/${updated.role}`, { replace: true });
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) {
        // A wrong current password and an expired session have distinct server details.
        if (failure.message === "Authentication required.") { setActor(null); navigate("/login", { replace: true }); }
      }
      setError(failure instanceof Error ? failure.message : "Unable to change password.");
    } finally { setPending(false); }
  }

  return <EntryLayout>
    <Typography component="h1" variant="h1" data-page-heading tabIndex={-1}>Choose your password.</Typography>
    <Typography color="text.secondary" sx={{ my: 2 }}>{actor.mustChangePassword ? "Replace your initial password to open your workspace." : "Update the password for your EventApp account."}</Typography>
    <Box component="form" noValidate onSubmit={submit}>
      <Stack spacing={2.5}>
        <TextField label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} error={submitted && !currentPassword} helperText={submitted && !currentPassword ? "Enter your current password." : undefined} />
        <TextField label="New password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} error={submitted && (newPasswordLength < 8 || newPasswordLength > 128)} helperText="Use 8–128 characters." />
        <TextField label="Confirm new password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} error={submitted && confirmation !== newPassword} helperText={submitted && confirmation !== newPassword ? "Passwords must match." : undefined} />
        {error && <Alert severity="error">{error}</Alert>}
        <Button disabled={pending} variant="contained" type="submit">{pending ? "Changing password…" : "Change password"}</Button>
        <Button disabled={pending} onClick={signOut}>Sign out</Button>
      </Stack>
    </Box>
  </EntryLayout>;
}
