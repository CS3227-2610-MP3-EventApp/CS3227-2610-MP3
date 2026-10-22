import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Login, Register } from "./Entry";
import { Workspace } from "./Workspace";
import { roles, type Role } from "./session";
import { AppearanceProvider } from "./Appearance";
import { Alert, Typography } from "@mui/material";
import { AuthProvider, useAuth } from "./Auth";
import { ChangePassword } from "./ChangePassword";
import { EntryLayout } from "./components";
import { Programme } from "./Programme";
import { AttendeeUpdates } from "./AttendeeUpdates";

function GuardedWorkspace({ role, children }: { role: Role; children?: ReactNode }) {
  const { actor } = useAuth();
  if (!actor || actor.role !== role) return <Navigate to="/login" replace />;
  if (actor.mustChangePassword) return <Navigate to="/change-password" replace />;
  if ((role === "organiser" && !actor.eventMemberships.length) || (role === "business" && !actor.businessMemberships.length)) {
    return <EntryLayout><Typography component="h1" variant="h2">Workspace unavailable</Typography><Alert severity="warning">No active membership. Access is not permitted.</Alert><ChangePassword signOutOnly /></EntryLayout>;
  }
  return children ?? <Workspace session={actor} />;
}

import { BusinessApplications } from "./applications/BusinessApplications";
import { OrganiserApplications } from "./applications/OrganiserApplications";
function ApplicationRoutes() {
  const location = useLocation();
  useEffect(() => {
    document.title = `EventApp · ${location.pathname === "/login" ? "Log in" : location.pathname.startsWith("/register/") ? "Create account" : location.pathname === "/change-password" ? "Change password" : location.pathname === "/organiser/programme" ? "Programme Management" : location.pathname === "/business/applications" ? "Business applications" : location.pathname === "/organiser/applications" ? "Application reviews" : "Workspace"}`;
    document.querySelector<HTMLElement>("[data-page-heading]")?.focus();
  }, [location.pathname]);
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register/attendee" element={<Register key="attendee" role="attendee" />} />
    <Route path="/register/business" element={<Register key="business" role="business" />} />
    <Route path="/change-password" element={<ChangePassword />} />
    <Route path="/attendee/planning" element={<GuardedWorkspace role="attendee" />} />
    <Route path="/attendee/planning/events/:eventId" element={<GuardedWorkspace role="attendee" />} />
    <Route path="/attendee/programme" element={<GuardedWorkspace role="attendee" />} />
    <Route path="/attendee/notifications" element={<GuardedWorkspace role="attendee"><AttendeeUpdates/></GuardedWorkspace>} />
    <Route path="/attendee/events/:eventId/announcements" element={<GuardedWorkspace role="attendee"><AttendeeUpdates/></GuardedWorkspace>} />
    <Route path="/attendee/programme/events/:eventId" element={<GuardedWorkspace role="attendee" />} />
    <Route path="/attendee/programme/events/:eventId/items/:itemId" element={<GuardedWorkspace role="attendee" />} />
    <Route path="/organiser/programme" element={<GuardedWorkspace role="organiser"><Programme /></GuardedWorkspace>} />
    {roles.map((role) => <Route key={role} path={`/${role}`} element={<GuardedWorkspace role={role} />} />)}
    <Route path="/business/applications" element={<GuardedWorkspace role="business"><BusinessApplications key={location.pathname + location.search} /></GuardedWorkspace>} />
    <Route path="/organiser/applications" element={<GuardedWorkspace role="organiser"><OrganiserApplications key={location.pathname + location.search} /></GuardedWorkspace>} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>;
}

export default function App() {
  return <AppearanceProvider><BrowserRouter><AuthProvider><ApplicationRoutes /></AuthProvider></BrowserRouter></AppearanceProvider>;
}
