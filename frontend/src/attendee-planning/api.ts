import { ApiError } from "../api";
import type { PublishedProgrammeItem } from "../programmeTypes";
import type { AcceptedPlan, PlanningState } from "./types";

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (value: unknown, minimum = 0): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
const text = (value: unknown): value is string => typeof value === "string";
const instant = (value: unknown) => text(value) && /T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && Number.isFinite(Date.parse(value));
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(text);
function programme(value: unknown, eventId: string): value is PublishedProgrammeItem {
  if (!record(value) || !record(value.event) || !record(value.venue) || !record(value.room)) return false;
  return text(value.id) && value.eventId === eventId && value.event.id === eventId && text(value.event.title) && text(value.event.timezone)
    && instant(value.startsAt) && instant(value.endsAt) && instant(value.publishedAt) && text(value.title) && value.state === "published"
    && ["talk", "workshop", "panel", "booth", "performance", "other"].includes(String(value.type)) && integer(value.revision, 1)
    && value.currency === "SGD" && integer(value.priceMinorUnits) && integer(value.capacity, 1)
    && text(value.venue.name) && text(value.venue.address) && text(value.room.name)
    && [value.accessibilityDetails, value.venue.accessibilityDetails, value.room.accessibilityDetails].every(x => x === null || text(x));
}
function preferences(value: unknown): boolean {
  return record(value) && integer(value.revision) && text(value.interests) && text(value.accessibilityNeeds)
    && (value.budgetMinorUnits === null || integer(value.budgetMinorUnits)) && value.currency === "SGD" && integer(value.minimumGapMinutes);
}
function selection(value: unknown): boolean {
  return record(value) && text(value.programmeItemId) && integer(value.observedProgrammeRevision, 1) && typeof value.accessibilityConfirmed === "boolean";
}
function state(value: unknown, eventId: string): value is PlanningState {
  if (!record(value) || !record(value.draft) || !record(value.draft.validation)) return false;
  const draft = value.draft, validation = value.draft.validation;
  return value.eventId === eventId && integer(value.stateRevision) && preferences(value.preferences) && strings(value.bookmarks)
    && new Set(value.bookmarks).size === value.bookmarks.length && integer(draft.revision) && integer(draft.preferenceRevision)
    && Array.isArray(draft.items) && draft.items.length <= 500 && draft.items.every(x => record(x) && selection(x) && programme(x.currentItem, eventId)
      && x.currentItem.id === x.programmeItemId && integer(x.currentProgrammeRevision, 1) && x.currentProgrammeRevision === x.currentItem.revision && typeof x.changed === "boolean")
    && new Set(draft.items.map(x => (x as Record<string, unknown>).programmeItemId)).size === draft.items.length
    && typeof validation.valid === "boolean" && integer(validation.totalMinorUnits) && validation.currency === "SGD" && Array.isArray(validation.issues)
    && validation.issues.every(x => record(x) && text(x.code) && strings(x.itemIds))
    && Array.isArray(value.acceptedVersions) && value.acceptedVersions.every(x => record(x) && text(x.id) && integer(x.version, 1) && instant(x.acceptedAt))
    && (value.currentAcceptedVersionId === null || text(value.currentAcceptedVersionId) && value.acceptedVersions.some(x => x.id === value.currentAcceptedVersionId));
}
function accepted(value: unknown, eventId: string, id: string): value is AcceptedPlan {
  return record(value) && value.id === id && value.eventId === eventId && integer(value.version, 1) && integer(value.draftRevision)
    && integer(value.preferenceRevision) && instant(value.acceptedAt) && record(value.preferencesSnapshot)
    && preferences({ ...value.preferencesSnapshot, revision: value.preferenceRevision }) && integer(value.totalMinorUnits) && value.currency === "SGD"
    && typeof value.needsAttention === "boolean" && Array.isArray(value.items) && value.items.every(x => record(x) && selection(x)
      && programme(x.acceptedItem, eventId) && x.acceptedItem.id === x.programmeItemId
      && (x.currentItem === null || programme(x.currentItem, eventId) && x.currentItem.id === x.programmeItemId) && typeof x.changed === "boolean");
}
const messages: Record<string, string> = {
  stale_revision: "Your planning data changed. Reload it before trying again.", stale_programme: "Programme details changed. Reload and review your draft.",
  constraint_violation: "This itinerary cannot be accepted. Review the budget, timing and accessibility warnings.",
};
async function request<T>(eventId: string, suffix: string, method: string, body: unknown, signal: AbortSignal | undefined, validate: (value: unknown) => value is T): Promise<T> {
  let response: Response;
  try { response = await fetch(`/api/v1/attendee/events/${encodeURIComponent(eventId)}/planning${suffix}`, { method, credentials: "same-origin", signal, headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch (failure) { if (failure instanceof DOMException && failure.name === "AbortError") throw failure; throw new ApiError(0, "Unable to reach EventApp. Reload to check whether your change was saved."); }
  if (!response.ok) {
    let code = "";
    try { const problem: unknown = await response.json(); if (record(problem) && text(problem.code) && Object.hasOwn(messages, problem.code)) code = problem.code; } catch { /* Keep safe response category. */ }
    const fallback: Record<number, string> = { 401: "Sign in again to view your planning data.", 403: "This account cannot access attendee planning.", 404: "This event or planning record is unavailable.", 409: "Your planning data changed. Reload and review it.", 422: "Check your planning values and try again.", 503: "Planning is temporarily unavailable. Reload to check your saved data." };
    throw new ApiError(response.status, messages[code] ?? fallback[response.status] ?? "The request could not be completed. Reload to check your saved data.", code);
  }
  if (response.status === 204) return undefined as T;
  let value: unknown;
  try { value = await response.json(); } catch { throw new ApiError(0, "The response could not be read. Reload to check your saved data."); }
  if (!validate(value)) throw new ApiError(0, "The planning response was incomplete. Reload to check your saved data.");
  return value;
}
export const planningApi = {
  get: (eventId: string, signal?: AbortSignal) => request(eventId, "", "GET", undefined, signal, (value): value is PlanningState => state(value, eventId)),
  write: (eventId: string, suffix: string, method: string, body: unknown, signal?: AbortSignal) => request(eventId, suffix, method, body, signal, (value): value is PlanningState => state(value, eventId)),
  remove: (eventId: string, expectedStateRevision: number, signal?: AbortSignal) => request<void>(eventId, "", "DELETE", { expectedStateRevision }, signal, (value): value is void => value === undefined),
  accepted: (eventId: string, id: string, signal?: AbortSignal) => request(eventId, `/accepted/${encodeURIComponent(id)}`, "GET", undefined, signal, (value): value is AcceptedPlan => accepted(value, eventId, id)),
};
