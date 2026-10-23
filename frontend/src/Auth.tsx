import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import { useLocation, useNavigationType } from "react-router-dom";
import { api, ApiError } from "./api";
import type { CurrentActor } from "./session";
import type { DraftMemory, OrganiserDraftMemory } from "./applications/model";
import type { PreparationMemory } from "./preparation/api";
import type { SetupDraftMemory } from "./setup/api";
import type { DraftMemory as PreparationDraftMemory } from "./preparationDrafts/api";
import { clearMarkers } from "./procurement/markers";
interface AuthValue {
  draftMemory: Map<string, PreparationDraftMemory>;
  actor: CurrentActor | null; setActor: (actor: CurrentActor | null) => void;
  sessionNotice: string; setSessionNotice: (notice: string) => void;
  revalidate: () => void; memory: Map<string, DraftMemory>; destinations: Map<string, string>;
  organiserMemory: Map<string, OrganiserDraftMemory>;
  preparationMemory: Map<string, PreparationMemory>;
  setupMemory: Map<string, SetupDraftMemory>;
}
const AuthContext = createContext<AuthValue | null>(null);
function identity(actor: CurrentActor | null) { return actor ? JSON.stringify([actor.id, actor.role, actor.mustChangePassword]) : ""; }
export function AuthProvider({ children }: { children: ReactNode }) {
  const [actor, updateActor] = useState<CurrentActor | null>(null);
  const actorRef = useRef(actor);
  const memory = useRef(new Map<string, DraftMemory>());
  const organiserMemory = useRef(new Map<string, OrganiserDraftMemory>());
  const preparationMemory = useRef(new Map<string, PreparationMemory>());
  const draftMemory = useRef(new Map<string, PreparationDraftMemory>());
  const setupMemory = useRef(new Map<string, SetupDraftMemory>());
  const destinations = useRef(new Map<string, string>());
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [stillLoading, setStillLoading] = useState(false);
  const [sessionNotice, setSessionNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const epoch = useRef(0);
  const lastAttempt = useRef(0);
  const silentRef = useRef(false);
  const screenRef = useRef({ loading: true, error: "" });
  screenRef.current = { loading, error };
  const location = useLocation();
  const navigationType = useNavigationType();
  // Stable identity: pages list setActor in effect dependencies, and silent revalidation must not refetch them.
  const setActor = useCallback((value: CurrentActor | null) => {
    epoch.current++;
    if (!value || identity(value) !== identity(actorRef.current)) {
      draftMemory.current.clear(); memory.current.clear(); organiserMemory.current.clear(); preparationMemory.current.clear(); setupMemory.current.clear(); destinations.current.clear();
      // Procurement no-retry markers: an actor change clears other actors' markers. Explicit sign-out clears all
      // (see signOut handlers); session expiry alone keeps them so an unconfirmed execute stays fail-closed.
      if (value && value.id !== actorRef.current?.id) clearMarkers(value.id);
      if (identity(value) !== identity(actorRef.current)) setSessionNotice("");
    } else {
      const owns = (businessId: string) => value.businessMemberships.some((membership) => membership.businessId === businessId && membership.status === "active" && membership.role === "owner");
      const assigned = (eventId: string) => value.eventMemberships.some((membership) => membership.eventId === eventId && membership.status === "active" && membership.role === "organiser");
      let lostScope = false;
      for (const key of organiserMemory.current.keys()) {
        const [actorId, eventId] = key.split(":");
        if (actorId !== value.id || value.role !== "organiser" || !assigned(eventId)) {
          organiserMemory.current.delete(key); lostScope = true;
        }
      }
      for (const key of memory.current.keys()) {
        const [actorId, role, businessId, eventId] = key.split(":");
        if (actorId !== value.id || role !== value.role || role === "business" && !owns(businessId) || role === "organiser" && !assigned(eventId)) {
          memory.current.delete(key); lostScope = true;
        }
      }
      for (const key of draftMemory.current.keys()) {
        const [actorId, role, businessId] = key.split(":");
        if (actorId !== value.id || value.role !== "business" || role !== "business" || !owns(businessId) || value.mustChangePassword) draftMemory.current.delete(key);
      }
      for (const key of preparationMemory.current.keys()) {
        const [actorId, role, businessId] = key.split(":");
        if (actorId !== value.id || value.role !== "business" || role !== "business" || !owns(businessId) || value.mustChangePassword) {
          preparationMemory.current.delete(key); lostScope = true;
        }
      }
      for (const key of setupMemory.current.keys()) {
        const [actorId, eventId] = key.split(":");
        if (actorId !== value.id || value.role !== "organiser" || value.mustChangePassword || !assigned(eventId)) {
          setupMemory.current.delete(key); lostScope = true;
        }
      }
      for (const [role, destination] of destinations.current) {
        const params = new URL(destination, window.location.origin).searchParams;
        if (role === "business" && params.has("businessId") && !owns(params.get("businessId")!) || role === "organiser" && params.has("eventId") && !assigned(params.get("eventId")!)) {
          destinations.current.delete(role); lostScope = true;
        }
      }
      if (lostScope || actorRef.current?.businessMemberships.some((membership) => !owns(membership.businessId)) || actorRef.current?.eventMemberships.some((membership) => !assigned(membership.eventId))) setSessionNotice("");
    }
    actorRef.current = value;
    updateActor((current) => current && value && JSON.stringify(current) === JSON.stringify(value) ? current : value);
  }, []);
  // Stable identity: business pages list revalidate in effect dependencies.
  const revalidate = useCallback(() => { epoch.current++; setLoading(true); setAttempt((value) => value + 1); }, []);
  // Window focus and non-restored page show re-check the session in the background: the page stays visible.
  // Navigation, restored (bfcache) pages and recovery keep the concealed, non-silent check, and a silent check
  // never replaces a loading or error screen that is already showing.
  // A check already in flight is confirming identity, so a focus during it is ignored; the error screen retries.
  function silentRevalidate() {
    if (screenRef.current.loading) return;
    if (screenRef.current.error) { revalidate(); return; }
    silentRef.current = true; setAttempt((value) => value + 1);
  }
  useEffect(() => {
    const focus = () => silentRevalidate();
    const pageshow = (event: Event) => { if ((event as PageTransitionEvent).persisted) revalidate(); else silentRevalidate(); };
    window.addEventListener("focus", focus); window.addEventListener("pageshow", pageshow);
    return () => { window.removeEventListener("focus", focus); window.removeEventListener("pageshow", pageshow); };
  }, []);
  useEffect(() => {
    // A guard redirect (replace navigation) from an already-verified, settled session is not a new
    // context; re-checking would briefly unmount the page the redirect just opened.
    if (navigationType === "REPLACE" && !loading && !error && actorRef.current && attempt === lastAttempt.current) return;
    lastAttempt.current = attempt;
    const silent = silentRef.current && !loading && !error;
    silentRef.current = false;
    let active = true;
    const current = ++epoch.current;
    let completionEpoch = current;
    if (!silent) { setLoading(true); setStillLoading(false); setError(""); }
    const started = performance.now();
    const timer = silent ? undefined : setTimeout(() => { if (active && epoch.current === current && performance.now() - started >= 10000) setStillLoading(true); }, 10000);
    try { sessionStorage.removeItem("eventapp.prototype.session"); } catch { /* Optional storage. */ }
    api.me().then((value) => { if (active && epoch.current === current) { setActor(value); completionEpoch = epoch.current; } }).catch((failure: unknown) => {
      if (!active || epoch.current !== current) return;
      if (failure instanceof ApiError && (failure.status === 401 || failure.status === 403)) { setActor(null); completionEpoch = epoch.current; }
      else setError("Temporarily unavailable. Unable to open EventApp. Check your access again.");
    }).finally(() => { if (active && epoch.current === completionEpoch) { clearTimeout(timer); setStillLoading(false); setLoading(false); } });
    return () => { active = false; clearTimeout(timer); epoch.current++; };
  }, [attempt, location.pathname, location.search]);
  const value = { draftMemory: draftMemory.current, actor, setActor, sessionNotice, setSessionNotice, revalidate, memory: memory.current, organiserMemory: organiserMemory.current, preparationMemory: preparationMemory.current, setupMemory: setupMemory.current, destinations: destinations.current };
  return <AuthContext.Provider value={value}>{loading ? <Box component="main" sx={{ p: 4 }}><Typography role="status">{stillLoading ? "Still in progress — checking your session…" : "In progress — checking your session…"}</Typography></Box> : error ? <Box component="main" sx={{ p: 4 }}><Typography component="h1" variant="h2">Check EventApp access</Typography><Alert severity="error" sx={{ my: 2 }}>{error}</Alert><Button onClick={revalidate}>Try again</Button></Box> : children}</AuthContext.Provider>;
}
export function useAuth() { const auth = useContext(AuthContext); if (!auth) throw new Error("Authentication context is unavailable."); return auth; }
