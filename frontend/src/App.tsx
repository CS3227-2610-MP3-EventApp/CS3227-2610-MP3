import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Login, Register } from "./Entry";
import { Workspace } from "./Workspace";
import { readSession, roles, type Role } from "./session";
import { AppearanceProvider } from "./Appearance";

function GuardedWorkspace({ role }: { role: Role }) {
  const session = readSession();
  return session?.role === role ? <Workspace session={session} /> : <Navigate to="/login" replace />;
}

function ApplicationRoutes() {
  const location = useLocation();
  // Entry routes stay viewable, but malformed state is discarded on every route.
  readSession();
  useEffect(() => {
    document.title = `EventApp · ${location.pathname === "/login" ? "Log in" : location.pathname.startsWith("/register/") ? "Create account preview" : "Workspace preview"}`;
    document.querySelector<HTMLElement>("[data-page-heading]")?.focus();
  }, [location.pathname]);
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register/attendee" element={<Register key="attendee" role="attendee" />} />
    <Route path="/register/business" element={<Register key="business" role="business" />} />
    {roles.map((role) => <Route key={role} path={`/${role}`} element={<GuardedWorkspace role={role} />} />)}
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>;
}

export default function App() {
  return <AppearanceProvider><BrowserRouter><ApplicationRoutes /></BrowserRouter></AppearanceProvider>;
}
