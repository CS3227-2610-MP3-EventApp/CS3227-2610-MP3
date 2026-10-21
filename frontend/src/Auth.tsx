import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import { useLocation } from "react-router-dom";
import { api, ApiError } from "./api";
import type { CurrentActor } from "./session";
import type { DraftMemory, OrganiserDraftMemory } from "./applications/model";
import type { PreparationMemory } from "./preparation/api";
import type { SetupDraftMemory } from "./setup/api";
interface AuthValue {
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
  const setupMemory = useRef(new Map<string, SetupDraftMemory>());
  const destinations = useRef(new Map<string, string>());
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [stillLoading, setStillLoading] = useState(false);
  const [sessionNotice, setSessionNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const epoch = useRef(0);
  const location = useLocation();
  function setActor(value: CurrentActor | null) {
    epoch.current++;
    if (!value || identity(value) !== identity(actorRef.current)) {
      memory.current.clear(); organiserMemory.current.clear(); preparationMemory.current.clear(); setupMemory.current.clear(); destinations.current.clear();
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
    actorRef.current = value; updateActor(value);
  }
  function revalidate() { epoch.current++; setLoading(true); setAttempt((value) => value + 1); }
  useEffect(() => {
    const listener = () => revalidate();
    window.addEventListener("focus", listener); window.addEventListener("pageshow", listener);
    return () => { window.removeEventListener("focus", listener); window.removeEventListener("pageshow", listener); };
  }, []);
  useEffect(() => {
    let active = true;
    const current = ++epoch.current;
    let completionEpoch = current;
    setLoading(true); setStillLoading(false); setError("");
    const started = performance.now();
    const timer = setTimeout(() => { if (active && epoch.current === current && performance.now() - started >= 10000) setStillLoading(true); }, 10000);
    try { sessionStorage.removeItem("eventapp.prototype.session"); } catch { /* Optional storage. */ }
    api.me().then((value) => { if (active && epoch.current === current) { setActor(value); completionEpoch = epoch.current; } }).catch((failure: unknown) => {
      if (!active || epoch.current !== current) return;
      if (failure instanceof ApiError && (failure.status === 401 || failure.status === 403)) { setActor(null); completionEpoch = epoch.current; }
      else setError("Temporarily unavailable. Unable to open EventApp. Check your access again.");
    }).finally(() => { if (active && epoch.current === completionEpoch) { clearTimeout(timer); setStillLoading(false); setLoading(false); } });
    return () => { active = false; clearTimeout(timer); epoch.current++; };
  }, [attempt, location.pathname, location.search]);
  const value = { actor, setActor, sessionNotice, setSessionNotice, revalidate, memory: memory.current, organiserMemory: organiserMemory.current, preparationMemory: preparationMemory.current, setupMemory: setupMemory.current, destinations: destinations.current };
  return <AuthContext.Provider value={value}>{loading ? <Box component="main" sx={{ p: 4 }}><Typography role="status">{stillLoading ? "Still in progress — checking your session…" : "In progress — checking your session…"}</Typography></Box> : error ? <Box component="main" sx={{ p: 4 }}><Typography component="h1" variant="h2">Check EventApp access</Typography><Alert severity="error" sx={{ my: 2 }}>{error}</Alert><Button onClick={revalidate}>Try again</Button></Box> : children}</AuthContext.Provider>;
}
export function useAuth() { const auth = useContext(AuthContext); if (!auth) throw new Error("Authentication context is unavailable."); return auth; }
