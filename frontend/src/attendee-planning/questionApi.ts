import { ApiError } from "../api";

export type QuestionJobState = "pending" | "running" | "completed" | "failed" | "cancelled";
export type QuestionField = "title" | "type" | "startsAt" | "endsAt" | "room" | "venueName" | "venueAddress" | "price"
  | "capacity" | "accessibility" | "state" | "cancellationReason";
export type UnknownReason = "insufficient_evidence" | "conflicting_evidence" | "out_of_scope";
export interface QuestionClaim {
  itemId: string; itemRevision: number; itemTitle: string; itemState: string; field: QuestionField; value: string | number | null;
}
export type QuestionResult =
  | { outcome: "answered"; summary: string | null; claims: QuestionClaim[]; observedProgrammeRevisions: Record<string, number> }
  | { outcome: "unknown"; reason: UnknownReason; observedProgrammeRevisions: Record<string, number> };
export interface QuestionJob {
  id: string; eventId: string; state: QuestionJobState; createdAt: string; updatedAt: string; completedAt: string | null;
  failureCode: string | null; providerMayHaveRun: boolean; question: string; stale: boolean; result: QuestionResult | null;
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
const states = ["pending", "running", "completed", "failed", "cancelled"];
const fields = ["title", "type", "startsAt", "endsAt", "room", "venueName", "venueAddress", "price", "capacity", "accessibility", "state", "cancellationReason"];
const reasons = ["insufficient_evidence", "conflicting_evidence", "out_of_scope"];

function claim(value: unknown): value is QuestionClaim {
  return record(value) && text(value.itemId) && Number.isSafeInteger(value.itemRevision) && text(value.itemTitle) && text(value.itemState)
    && fields.includes(String(value.field)) && (value.value === null || text(value.value) || typeof value.value === "number");
}
function result(value: unknown): value is QuestionResult {
  if (!record(value) || !record(value.observedProgrammeRevisions)) return false;
  if (value.outcome === "answered") return (value.summary === null || text(value.summary)) && Array.isArray(value.claims) && value.claims.every(claim);
  return value.outcome === "unknown" && reasons.includes(String(value.reason));
}
function job(value: unknown): value is QuestionJob {
  return record(value) && text(value.id) && text(value.eventId) && states.includes(String(value.state)) && typeof value.providerMayHaveRun === "boolean"
    && text(value.question) && typeof value.stale === "boolean" && (value.failureCode === null || text(value.failureCode))
    && (value.result === null || result(value.result));
}

async function call(path: string, method: string, body: unknown, signal?: AbortSignal): Promise<QuestionJob> {
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
    throw new ApiError(response.status, "The question could not be completed.", code);
  }
  let value: unknown;
  try { value = await response.json(); } catch { throw new ApiError(0, "The response could not be read."); }
  if (!job(value)) throw new ApiError(0, "The question response was incomplete.");
  return value;
}

export const questionApi = {
  create: (eventId: string, body: { requestId: string; question: string }, signal?: AbortSignal) =>
    call(`/api/v1/attendee/events/${encodeURIComponent(eventId)}/event-questions`, "POST", body, signal),
  get: (jobId: string, signal?: AbortSignal) => call(`/api/v1/attendee/ai/question-jobs/${encodeURIComponent(jobId)}`, "GET", undefined, signal),
  cancel: (jobId: string, signal?: AbortSignal) => call(`/api/v1/attendee/ai/question-jobs/${encodeURIComponent(jobId)}/cancel`, "POST", {}, signal),
};
