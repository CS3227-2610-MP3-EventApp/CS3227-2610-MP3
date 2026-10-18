export const roles = ["attendee", "organiser", "business"] as const;
export type Role = typeof roles[number];
export type PreviewSession = { role: Role; displayName: string };
const sessionKey = "eventapp.prototype.session";

export function readSession(): PreviewSession | null {
  try {
    const raw = sessionStorage.getItem(sessionKey);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value === "object" && value !== null && !Array.isArray(value)
      && "role" in value && roles.includes(value.role as Role)
      && "displayName" in value && typeof value.displayName === "string" && value.displayName.trim()) {
      return { role: value.role as Role, displayName: value.displayName.trim() };
    }
    sessionStorage.removeItem(sessionKey);
  } catch {
    // Malformed browser state must never select a workspace.
    try { sessionStorage.removeItem(sessionKey); } catch { /* Storage may be unavailable. */ }
  }
  return null;
}

export function writeSession(session: PreviewSession): boolean {
  try {
    sessionStorage.setItem(sessionKey, JSON.stringify({ role: session.role, displayName: session.displayName.trim() }));
    return true;
  } catch {
    return false;
  }
}

export function clearSession() {
  try { sessionStorage.removeItem(sessionKey); } catch { /* No browser session is available. */ }
}
