import { vi } from "vitest";
import { eveningWorkshop, eventA, freeTalk, json, page, defaultProgrammeResponse } from "./programme";

// Synthetic wire fixtures for F03-US01 (generate-feasible-itineraries, spec revision 2).
// They exercise the UI against the documented contract only; server enforcement, grounding,
// quota and persistence are covered by the independent real-PostgreSQL API tests.
export const generationsPath = `/api/v1/attendee/events/${eventA.id}/itinerary-generations`;
export const JOB_ID = "00000000-0000-4000-8000-0000000000a1";
export const jobPath = `/api/v1/attendee/ai/jobs/${JOB_ID}`;
export const planningBase = `/api/v1/attendee/events/${eventA.id}/planning`;
export const detailRoute = `/attendee/planning/events/${eventA.id}`;
export const acceptedId = "00000000-0000-4000-8000-000000000099";

export type Item = typeof eveningWorkshop;
export type Wire = Record<string, unknown>;
export type PlanningWire = ReturnType<typeof planningState>;

export function entry(item: Item = eveningWorkshop, confirmed = false) {
  return {
    programmeItemId: item.id, observedProgrammeRevision: item.revision, accessibilityConfirmed: confirmed,
    currentItem: item, currentProgrammeRevision: item.revision, changed: false,
  };
}

// Preference revision 1 / state revision 2 so that tokens are visibly non-trivial.
export function planningState() {
  return {
    eventId: eventA.id, stateRevision: 2,
    preferences: {
      revision: 1, interests: "Printmaking", budgetMinorUnits: 2000 as number | null, currency: "SGD",
      accessibilityNeeds: "", minimumGapMinutes: 0,
    },
    bookmarks: [] as string[],
    draft: {
      revision: 0, preferenceRevision: 1, items: [] as ReturnType<typeof entry>[],
      validation: { valid: false, totalMinorUnits: 0, currency: "SGD", issues: [{ code: "empty_itinerary", itemIds: [] as string[] }] },
    },
    acceptedVersions: [] as { id: string; version: number; acceptedAt: string }[],
    currentAcceptedVersionId: null as string | null,
  };
}

export function suggestion(item: Item, label: string, reason: string, revision = item.revision) {
  return { itemId: item.id, itemRevision: revision, startsAt: item.startsAt, endsAt: item.endsAt, reason, sourceLabel: label };
}

// Result shapes pinned by human decision (Yik Bing, 2026-10-22): constraintResults [{constraint, passed}],
// blockingConstraints [{constraint, detail}], observedProgrammeRevisions {itemId: revision}.
export function feasibleResult(overrides: Wire = {}) {
  return {
    outcome: "feasible",
    items: [
      suggestion(eveningWorkshop, "item-1", "Matches your interest in printmaking workshops."),
      suggestion(freeTalk, "item-2", "A free talk the next morning keeps you within budget."),
    ],
    constraintResults: [
      { constraint: "overlap", passed: true },
      { constraint: "budget", passed: true },
      { constraint: "accessibility", passed: true },
    ],
    preferenceRevision: 1,
    observedProgrammeRevisions: { [eveningWorkshop.id]: eveningWorkshop.revision, [freeTalk.id]: freeTalk.revision },
    ...overrides,
  };
}

export function infeasibleResult() {
  return {
    outcome: "infeasible",
    blockingConstraints: [{ constraint: "budget", detail: "Every published activity costs more than your SGD 0.00 budget." }],
  };
}

export type JobState = "pending" | "running" | "completed" | "failed" | "cancelled";
export function job(state: JobState, extras: Wire = {}) {
  return {
    id: JOB_ID, eventId: eventA.id, state, createdAt: "2026-10-22T03:00:00Z", updatedAt: "2026-10-22T03:00:02Z",
    completedAt: state === "pending" || state === "running" ? null : "2026-10-22T03:00:10Z",
    failureCode: null as string | null, providerMayHaveRun: false, result: null as unknown, ...extras,
  };
}

export function problemResponse(status: number, code: string, detail = "Synthetic raw private detail must not render") {
  return new Response(JSON.stringify({ type: "about:blank", title: "Problem", status, detail, instance: generationsPath, code }), {
    status, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store" },
  });
}

export interface Recorded { method: string; path: string; body: Wire | null; credentials?: RequestCredentials }

// Installs a fetch double for the attendee planning, programme and AI endpoints and delegates
// everything else (auth) to the previously installed auth fixture.
export function installAttendeeAi() {
  const authFetch = globalThis.fetch;
  const control = {
    requests: [] as Recorded[],
    state: planningState(),
    onCreate: (_body: Wire): Response => json(job("pending"), 202),
    onJob: (): Response => json(job("pending")),
    onCancel: (): Response => json(job("cancelled", { providerMayHaveRun: true })),
    onPlanningWrite: (_method: string, _path: string, _body: Wire | null): Response => { throw new Error("Unassigned planning write"); },
  };
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin);
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    if (!url.pathname.startsWith("/api/v1/attendee/")) return authFetch(input, init);
    const raw = init?.body ?? (input instanceof Request && method !== "GET" ? await input.clone().text() : null);
    const body = typeof raw === "string" && raw ? JSON.parse(raw) as Wire : null;
    control.requests.push({ method, path: url.pathname, body, credentials: init?.credentials ?? (input instanceof Request ? input.credentials : undefined) });
    if (url.pathname === generationsPath && method === "POST") return control.onCreate(body ?? {});
    if (url.pathname === jobPath && method === "GET") return control.onJob();
    if (url.pathname === `${jobPath}/cancel` && method === "POST") return control.onCancel();
    if (url.pathname.startsWith(planningBase)) return method === "GET" ? json(control.state) : control.onPlanningWrite(method, url.pathname, body);
    if (url.pathname === "/api/v1/attendee/events") return json(page([eventA]));
    return defaultProgrammeResponse({ url, method });
  }));
  return control;
}
