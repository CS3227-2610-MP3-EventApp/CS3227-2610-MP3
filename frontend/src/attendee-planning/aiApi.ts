import { ApiError } from "../api";

export type JobState = "pending" | "running" | "completed" | "failed" | "cancelled";
export interface SuggestedItem { itemId: string; itemRevision: number; startsAt: string; endsAt: string; reason: string; sourceLabel: string }
export interface ConstraintResult { constraint: "overlap" | "budget" | "accessibility"; passed: boolean }
export interface BlockingConstraint { constraint: string; detail: string }
export type ItineraryResult =
  | { outcome: "feasible"; items: SuggestedItem[]; constraintResults: ConstraintResult[]; preferenceRevision: number; observedProgrammeRevisions: Record<string, number> }
  | { outcome: "infeasible"; blockingConstraints: BlockingConstraint[] };
export interface ItineraryJob {
  id: string; eventId: string; state: JobState; createdAt: string; updatedAt: string; completedAt: string | null;
  failureCode: string | null; providerMayHaveRun: boolean; result: ItineraryResult | null;
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
const states = ["pending", "running", "completed", "failed", "cancelled"];
const constraints = ["overlap", "budget", "accessibility"];

function suggestedItem(value: unknown): value is SuggestedItem {
  return record(value) && text(value.itemId) && Number.isSafeInteger(value.itemRevision) && text(value.startsAt) && text(value.endsAt)
    && text(value.reason) && text(value.sourceLabel);
}
function result(value: unknown): value is ItineraryResult {
  if (!record(value)) return false;
  if (value.outcome === "feasible") {
    return Array.isArray(value.items) && value.items.every(suggestedItem) && Array.isArray(value.constraintResults)
      && value.constraintResults.every(x => record(x) && constraints.includes(String(x.constraint)) && typeof x.passed === "boolean")
      && Number.isSafeInteger(value.preferenceRevision) && record(value.observedProgrammeRevisions);
  }
  return value.outcome === "infeasible" && Array.isArray(value.blockingConstraints)
    && value.blockingConstraints.every(x => record(x) && text(x.constraint) && text(x.detail));
}
function job(value: unknown): value is ItineraryJob {
  return record(value) && text(value.id) && text(value.eventId) && states.includes(String(value.state)) && typeof value.providerMayHaveRun === "boolean"
    && (value.failureCode === null || text(value.failureCode)) && (value.result === null || result(value.result));
}

async function call(path: string, method: string, body: unknown, signal?: AbortSignal): Promise<ItineraryJob> {
  let response: Response;
  try {
    response = await fetch(path, { method, credentials: "same-origin", signal, headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (failure) {
    if (failure instanceof DOMException && failure.name === "AbortError") throw failure;
    throw new ApiError(0, "Unable to reach EventApp.");
  }
  if (!response.ok) {
    let code = "";
    try { const problem: unknown = await response.json(); if (record(problem) && text(problem.code)) code = problem.code; } catch { /* Use the status category only. */ }
    throw new ApiError(response.status, "The AI itinerary request could not be completed.", code);
  }
  let value: unknown;
  try { value = await response.json(); } catch { throw new ApiError(0, "The response could not be read."); }
  if (!job(value)) throw new ApiError(0, "The AI itinerary response was incomplete.");
  return value;
}

export const itineraryAiApi = {
  create: (eventId: string, body: { requestId: string; preferenceRevision: number; confirmSynthetic: true }, signal?: AbortSignal) =>
    call(`/api/v1/attendee/events/${encodeURIComponent(eventId)}/itinerary-generations`, "POST", body, signal),
  get: (jobId: string, signal?: AbortSignal) => call(`/api/v1/attendee/ai/jobs/${encodeURIComponent(jobId)}`, "GET", undefined, signal),
  cancel: (jobId: string, signal?: AbortSignal) => call(`/api/v1/attendee/ai/jobs/${encodeURIComponent(jobId)}/cancel`, "POST", {}, signal),
};
