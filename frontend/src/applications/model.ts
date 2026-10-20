import type { components } from "../api-schema";
import { ApiError, errorFeedback } from "../api";
export type Content = components["schemas"]["ApplicationContent"];
export type Application = components["schemas"]["BusinessApplication"];
export type ApplicationEvent = components["schemas"]["ApplicationEvent"];
export type OrganiserEvent = components["schemas"]["OrganiserEventSummary"];
export type ApplicationSettings = components["schemas"]["ApplicationSettings"];
export interface PendingOperation { kind: "create" | "edit" | "submit"; inputEpoch: number; revision: number; content: Content; id?: string; inFlight: boolean; }
export interface DraftMemory { values: Content; saved: Application | null; dirty: boolean; editEpoch: number; uncertain: boolean; operation?: PendingOperation; }
export interface OrganiserDraftMemory {
  intendedOpen?: boolean;
  settingsDirty: boolean;
  reasons: Map<string, string>;
  operation?: {kind: "settings" | "decision"; applicationId?: string; inFlight: boolean};
}
export const blank = (): Content => ({ participantType: "exhibitor", description: "", requestedSpace: "", contactName: "", contactEmail: "" });
export const labels: Record<keyof Content, string> = { participantType: "Participant type", description: "Description", requestedSpace: "Requested space", contactName: "Contact name", contactEmail: "Contact email" };
export const limits = { description: 5000, requestedSpace: 500, contactName: 100, contactEmail: 254 };
export const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;
const date = (value: unknown): value is string => typeof value === "string" && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
export function validate(values: Content): Partial<Record<keyof Content, string>> {
  const errors: Partial<Record<keyof Content, string>> = {};
  if (!["exhibitor", "vendor"].includes(values.participantType)) errors.participantType = "Choose Exhibitor or Vendor.";
  for (const field of Object.keys(limits) as (keyof typeof limits)[]) {
    const text = values[field].trim();
    if (!text || Array.from(text).length > limits[field]) errors[field] = `Enter ${labels[field].toLowerCase()} using 1–${limits[field]} characters.`;
  }
  const email = values.contactEmail.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.contactEmail = "Enter a valid contact email.";
  return errors;
}
function content(value: unknown): value is Content {
  return object(value) && Object.keys(labels).every((key) => typeof value[key] === "string") && Object.keys(validate(value as Content)).length === 0;
}
export function application(value: unknown, scope: { businessId?: string; eventId?: string; id?: string; submitted?: boolean }): Application {
  if (!object(value) || !uuid(value.id) || !uuid(value.businessId) || !uuid(value.eventId) || !uuid(value.participationId) || !positive(value.revision) || !content(value.content)
    || scope.businessId && value.businessId !== scope.businessId || scope.eventId && value.eventId !== scope.eventId || scope.id && value.id !== scope.id
    || typeof value.businessName !== "string" || !value.businessName.trim() || typeof value.eventTitle !== "string" || !value.eventTitle.trim()
    || !["draft", "submitted", "accepted", "rejected"].includes(String(value.status)) || scope.submitted && value.status === "draft"
    || value.status === "draft" && (value.frozenSubmittedContentRevision !== null || value.submittedAt !== null)
    || value.status !== "draft" && (!positive(value.frozenSubmittedContentRevision) || value.frozenSubmittedContentRevision >= value.revision || !date(value.submittedAt))
    || ["draft", "submitted"].includes(String(value.status)) && value.decision !== null
    || ["accepted", "rejected"].includes(String(value.status)) && (!object(value.decision) || value.decision.outcome !== value.status || !date(value.decision.decidedAt) || !(value.decision.reason === null || typeof value.decision.reason === "string" && Array.from(value.decision.reason).length <= 1000) || value.status === "rejected" && (typeof value.decision.reason !== "string" || !value.decision.reason.trim()))) throw new ApiError(502, "Invalid response.");
  return value as Application;
}
export function events(value: unknown, organiser = false): ApplicationEvent[] {
  if (!Array.isArray(value) || value.some((item) => !object(item) || !uuid(item.eventId) || typeof item.title !== "string" || !item.title.trim() || typeof item.timezone !== "string" || !positive(item.eventRevision) || !positive(item.settingsRevision) || typeof item.applicationsOpen !== "boolean" || !date(item.startsAt) || !date(item.endsAt) || !organiser && !(item.applicationId === null || uuid(item.applicationId))) || new Set(value.map((v) => v.eventId)).size !== value.length) throw new ApiError(502, "Invalid response.");
  return value;
}
export function settings(value: unknown, eventId: string): ApplicationSettings {
  if (!object(value) || value.eventId !== eventId || typeof value.applicationsOpen !== "boolean" || !positive(value.revision)) throw new ApiError(502, "Invalid response.");
  return value as unknown as ApplicationSettings;
}
export function feedback(error: unknown) {
  return errorFeedback(error);
}
export const uncertain = (error: unknown) => !(error instanceof ApiError) || error.status === 0 || error.status >= 500;

