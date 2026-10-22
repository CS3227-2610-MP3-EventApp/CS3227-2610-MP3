import { vi } from "vitest";
import { defaultProgrammeResponse, eveningWorkshop, eventA, eventB, freeTalk, json, page } from "./programme";

// Synthetic wire fixtures for F03-US02 (answer-event-questions, spec revision 2). They exercise the UI
// against the documented contract only; grounding, quota, ownership, validation and persistence are
// enforced and tested by the independent real-PostgreSQL API tests.
export const questionsPath = `/api/v1/attendee/events/${eventA.id}/event-questions`;
export const JOB_ID = "00000000-0000-4000-8000-0000000000b1";
export const jobPath = `/api/v1/attendee/ai/question-jobs/${JOB_ID}`;
export const eventRoute = `/attendee/programme/events/${eventA.id}`;
export const cataloguePath = "/attendee/programme";
export const itemRoute = (itemId: string) => `${eventRoute}/items/${itemId}`;
export const QUESTION_TEXT = "When does the evening workshop start and what does it cost?";

export type Item = typeof eveningWorkshop;
export type Wire = Record<string, unknown>;

// A cancelled activity (revision 4) used for the "Cancelled" marker and the reason field.
export const cancelledTalk = {
  ...freeTalk, id: "00000000-0000-4000-8000-000000000024", title: "Cancelled pottery demo", revision: 4,
  state: "cancelled" as const, cancellationReason: "Presenter unavailable",
};

export function factClaim(item: { id: string; revision: number; title: string; state: string }, field: string, value: unknown, overrides: Wire = {}) {
  return { itemId: item.id, itemRevision: item.revision, itemTitle: item.title, itemState: item.state, field, value, ...overrides };
}

// Result shapes from the specification: answered {outcome, summary, claims[], observedProgrammeRevisions}
// and unknown {outcome, reason, observedProgrammeRevisions}.
export function answeredResult(overrides: Wire = {}) {
  return {
    outcome: "answered",
    summary: "The evening workshop starts late and costs a small fee.",
    claims: [
      factClaim(eveningWorkshop, "startsAt", eveningWorkshop.startsAt),
      factClaim(eveningWorkshop, "price", 1250),
      factClaim(eveningWorkshop, "accessibility", null),
      factClaim(eveningWorkshop, "room", "Room A"),
      factClaim(eveningWorkshop, "capacity", 30),
      factClaim(cancelledTalk, "cancellationReason", "Presenter unavailable"),
    ],
    observedProgrammeRevisions: { [eveningWorkshop.id]: eveningWorkshop.revision, [cancelledTalk.id]: cancelledTalk.revision },
    ...overrides,
  };
}

export type UnknownReason = "insufficient_evidence" | "conflicting_evidence" | "out_of_scope";
export function unknownResult(reason: UnknownReason = "insufficient_evidence") {
  return {
    outcome: "unknown", reason,
    observedProgrammeRevisions: { [eveningWorkshop.id]: eveningWorkshop.revision, [freeTalk.id]: freeTalk.revision },
  };
}

export type JobState = "pending" | "running" | "completed" | "failed" | "cancelled";
export function job(state: JobState, extras: Wire = {}) {
  return {
    id: JOB_ID, eventId: eventA.id, state, createdAt: "2026-10-22T03:00:00Z", updatedAt: "2026-10-22T03:00:02Z",
    completedAt: state === "pending" || state === "running" ? null : "2026-10-22T03:00:10Z",
    failureCode: null as string | null, providerMayHaveRun: false, question: QUESTION_TEXT, stale: false,
    result: null as unknown, ...extras,
  };
}

export function problemResponse(status: number, code: string, detail = "Synthetic raw private detail must not render") {
  return new Response(JSON.stringify({ type: "about:blank", title: "Problem", status, detail, instance: questionsPath, code }), {
    status, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store" },
  });
}

export interface Recorded { method: string; path: string; body: Wire | null; credentials?: RequestCredentials }

// Installs a fetch double for the attendee programme and question endpoints and delegates everything
// else (auth) to the previously installed auth fixture. Nothing here implements validation or storage.
export function installEventQuestions() {
  const authFetch = globalThis.fetch;
  const control = {
    requests: [] as Recorded[],
    onCreate: (_body: Wire): Response => json(job("pending"), 202),
    onJob: (): Response => json(job("pending")),
    onCancel: (): Response => json(job("cancelled", { providerMayHaveRun: true })),
  };
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin);
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    if (!url.pathname.startsWith("/api/v1/attendee/")) return authFetch(input, init);
    const raw = init?.body ?? (input instanceof Request && method !== "GET" ? await input.clone().text() : null);
    const body = typeof raw === "string" && raw ? JSON.parse(raw) as Wire : null;
    control.requests.push({ method, path: url.pathname, body, credentials: init?.credentials ?? (input instanceof Request ? input.credentials : undefined) });
    if (url.pathname === questionsPath && method === "POST") return control.onCreate(body ?? {});
    if (url.pathname === jobPath && method === "GET") return control.onJob();
    if (url.pathname === `${jobPath}/cancel` && method === "POST") return control.onCancel();
    if (url.pathname === "/api/v1/attendee/events") return json(page([eventA, eventB]));
    return defaultProgrammeResponse({ url, method });
  }));
  return control;
}
