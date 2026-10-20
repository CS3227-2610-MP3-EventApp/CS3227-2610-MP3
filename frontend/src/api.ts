import type { components } from "./api-schema";
import type { CurrentActor } from "./session";
export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly code = "", public readonly fields: string[] = [], public readonly fieldErrors: {field: string; code: string}[] = [], public readonly currentApplication?: unknown) { super(message); }
}
const allowedFields = ["participantType", "description", "requestedSpace", "contactName", "contactEmail", "businessId", "eventId", "expectedRevision", "applicationsOpen", "outcome", "reason", "identifier", "role", "displayName", "username", "email", "businessName", "password", "currentPassword", "newPassword", "request"];
const reasons: Record<string, string> = {
  invalid_credentials: "Invalid credentials.", unauthenticated: "Authentication required.", forbidden: "Access is not permitted.", password_change_required: "Password change required.", registration_conflict: "Registration could not be completed.", validation_error: "Request validation failed.", current_password_incorrect: "The current password is incorrect.", password_unchanged: "The new password must be different from your current password.", not_found: "Resource not found.", application_exists: "Application already exists.", revision_conflict: "Application revision changed.", event_revision_conflict: "Event settings changed.", applications_closed: "Applications are closed for this event.", application_submitted: "Application has already been submitted.", application_decided: "Application already has a decision.", eligibility_retired: "Business eligibility approvals are no longer used.", internal_error: "Request could not be completed.", service_unavailable: "Request could not be completed.",
};
export const fieldMessage = (code: string) => code === "required" ? "This field is required." : code === "password_length" ? "Use between 8 and 128 characters." : "Check this field.";
export function errorAction(error: unknown) {
  const code = error instanceof ApiError ? error.code : "";
  if (code === "invalid_credentials") return "Check your identifier, password and selected role, then try again.";
  if (code === "registration_conflict") return "Check your details or sign in.";
  if (code === "current_password_incorrect") return "Check your current password and try again.";
  if (code === "password_unchanged") return "Choose a different password.";
  if (code === "unauthenticated") return "Sign in again.";
  if (code === "forbidden") return "This account cannot perform this action. Return to your workspace.";
  if (code === "applications_closed") return "Keep editing your saved draft or choose an open event.";
  if (code === "event_revision_conflict") return "Refresh application settings before saving again.";
  if (code === "revision_conflict" || code === "application_decided") return "Refresh the latest application before deciding or saving.";
  if (code === "not_found") return "Refresh open events or return to your workspace.";
  return "Check your input or refresh the latest state before trying again.";
}
export function errorCategory(error: unknown) {
  if (!(error instanceof ApiError)) return "Temporarily unavailable";
  if (error.code === "applications_closed") return "Needs correction";
  if (error.status === 401) return "Sign in required";
  if (error.status === 403) return "Access denied";
  if (error.status === 422) return "Needs correction";
  if (error.status === 409) return "Changed elsewhere";
  if (error.status === 404) return "Not available";
  return "Temporarily unavailable";
}
export const errorFeedback = (error: unknown) => `${errorCategory(error)} — ${error instanceof ApiError ? error.message : "The request could not be completed."} ${errorAction(error)}`;
async function request<T>(path: string, method = "GET", body?: unknown, domain = false, withStatus = false): Promise<T> {
  let response: Response;
  try { response = await fetch(`/api/v1${domain ? "" : "/auth"}${path}`, { method, credentials: "same-origin", cache: "no-store", ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) }); }
  catch { throw new ApiError(0, "Unable to reach EventApp. Please try again."); }
  if (!response.ok) {
    let detail = "The request could not be completed.", code = "", fields: string[] = [], fieldErrors: {field: string; code: string}[] = [], currentApplication: unknown;
    try {
      const problem = await response.json();
      if (typeof problem?.code === "string" && Object.hasOwn(reasons, problem.code) && (domain || !["current_password_incorrect", "password_unchanged"].includes(problem.code) || path === "/change-password")) { code = problem.code; detail = reasons[code]; }
      if (code === "validation_error" && Array.isArray(problem?.fieldErrors)) fieldErrors = problem.fieldErrors.filter((f: { field?: unknown; code?: unknown }) => typeof f?.field === "string" && allowedFields.includes(f.field) && ["required", "password_length", "invalid"].includes(String(f.code))).map((f: {field: string; code: string}) => ({field: f.field, code: f.code}));
      fields = fieldErrors.map((f) => f.field);
      if (domain && response.status === 409 && ["application_decided", "revision_conflict"].includes(code)) currentApplication = problem.currentApplication;
    } catch { /* Keep a safe generic error. */ }
    throw new ApiError(response.status, detail, code, fields, fieldErrors, currentApplication);
  }
  try { const value = response.status === 204 ? undefined : await response.json(); return (withStatus ? { value, status: response.status } : value) as T; }
  catch { throw new ApiError(0, "Invalid response."); }
}
type S = components["schemas"];
export const api = {
  me: () => request<CurrentActor>("/me"),
  login: (body: S["LoginRequest"]) => request<CurrentActor>("/login", "POST", body),
  registerAttendee: (body: S["AttendeeRegistration"]) => request<CurrentActor>("/register/attendee", "POST", body),
  registerBusiness: (body: S["BusinessRegistration"]) => request<CurrentActor>("/register/business", "POST", body),
  changePassword: (body: S["PasswordChangeRequest"]) => request<CurrentActor>("/change-password", "POST", body),
  logout: () => request<void>("/logout", "POST"),
};
export const applicationApi = {
  events: (businessId: string) => request<unknown>(`/business/application-events?businessId=${encodeURIComponent(businessId)}`, "GET", undefined, true),
  list: (businessId: string) => request<unknown>(`/business/applications?businessId=${encodeURIComponent(businessId)}`, "GET", undefined, true),
  get: (id: string) => request<unknown>(`/business/applications/${encodeURIComponent(id)}`, "GET", undefined, true),
  create: (body: S["ApplicationContent"] & { businessId: string; eventId: string }) => request<unknown>("/business/applications", "POST", body, true),
  edit: (id: string, body: S["ApplicationContent"] & { expectedRevision: number }) => request<unknown>(`/business/applications/${encodeURIComponent(id)}`, "PUT", body, true),
  submit: (id: string, expectedRevision: number) => request<unknown>(`/business/applications/${encodeURIComponent(id)}/submit`, "POST", { expectedRevision }, true),
  organiserEvents: () => request<unknown>("/organiser/events", "GET", undefined, true),
  settings: (eventId: string) => request<unknown>(`/organiser/events/${encodeURIComponent(eventId)}/application-settings`, "GET", undefined, true),
  saveSettings: (eventId: string, expectedRevision: number, applicationsOpen: boolean) => request<unknown>(`/organiser/events/${encodeURIComponent(eventId)}/application-settings`, "PUT", {expectedRevision, applicationsOpen}, true),
  decide: (eventId: string, id: string, expectedRevision: number, outcome: "accepted" | "rejected", reason: string | null) => request<unknown>(`/organiser/events/${encodeURIComponent(eventId)}/applications/${encodeURIComponent(id)}/decision`, "POST", {expectedRevision, outcome, reason}, true),
  reviews: (eventId: string) => request<unknown>(`/organiser/events/${encodeURIComponent(eventId)}/applications`, "GET", undefined, true),
  review: (eventId: string, id: string) => request<unknown>(`/organiser/events/${encodeURIComponent(eventId)}/applications/${encodeURIComponent(id)}`, "GET", undefined, true),
};
