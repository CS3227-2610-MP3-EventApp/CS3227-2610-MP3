import type { components } from "../api-schema";

export type DraftTask = { title: string; status: "not_started" | "in_progress" | "done"; dueDate: string | null };
export type DraftLine = { category?: string | null; description: string; quantity: number; unitPriceMinorUnits: number | null; priceBasis: "unknown" | "estimate" | "quotation"; quotationBasis: string | null };
export type DraftDocument = { id: string; jobId: string; participationId: string; revision: number; sourceRevisions: { event: number; setup: number; preparation: number }; sourceFacts: { event: { title: string; startsAt: string; endsAt: string; timezone: string }; setup: { boothLabel: string | null; setupInstructions: string | null } }; tasks: DraftTask[]; budget: { currency: "SGD"; lines: DraftLine[]; totalMinorUnits: string | null; knownSubtotalMinorUnits: string; isComplete: boolean }; createdAt: string; adoptedAt: string | null; adoptedPreparationRevision: number | null };
export type BusinessJob = components["schemas"]["BusinessPreparationJob"];
export type DraftWrite = { expectedRevision: number; tasks: DraftTask[]; budget: { currency: "SGD"; lines: DraftLine[] } };
export type AdoptWrite = { expectedDraftRevision: number; expectedPreparationRevision: number; expectedSetupRevision: number; expectedEventRevision: number; taskIndexes: number[]; lineIndexes: number[] };
export type DraftMemory = {
  businessId: string; eventId: string; participationId: string;
  needs: string; inventedConfirmed: boolean; selectedTaskIds: string[]; selectedLineIds: string[]; selectedTaskIndexes: number[]; selectedLineIndexes: number[];
  draft: DraftDocument | null; dirty: boolean; conflict: boolean; job: BusinessJob | null;
};

const fieldAllowlist = new Set(["requestId", "expectedPreparationRevision", "expectedSetupRevision", "expectedEventRevision", "needs", "selectedTaskIds", "selectedLineIds", "syntheticDataConfirmed", "expectedRevision", "tasks", "title", "status", "dueDate", "budget", "currency", "lines", "description", "quantity", "unitPriceMinorUnits", "priceBasis", "quotationBasis", "expectedDraftRevision", "taskIndexes", "lineIndexes"]);
const codeMessages: Record<string, string> = {
  unauthenticated: "Sign in again.", forbidden: "Access is not permitted.", password_change_required: "Change your password before continuing.",
  not_found: "This preparation draft is not available.", revision_conflict: "The draft changed elsewhere. Review the latest version.",
  source_changed: "Event, setup or manual preparation changed. Review the latest facts before continuing.", already_adopted: "This draft has already been adopted.",
  request_conflict: "This request identifier was used for different inputs.", active_job: "A preparation draft request is already in progress.",
  validation_error: "Check the highlighted preparation draft fields.", quota_exceeded: "The daily preparation draft limit has been reached.",
  service_unavailable: "Preparation drafts are temporarily unavailable.", configuration_error: "Preparation drafts are not configured.", internal_error: "Request could not be completed.",
};
export class DraftApiError extends Error {
  constructor(readonly status: number, readonly code: string, readonly fields: string[] = []) {
    super(codeMessages[code] ?? (status === 401 ? "Sign in again." : status === 403 ? "Access is not permitted." : "Request could not be completed."));
  }
}
async function call<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(path, { method, credentials: "same-origin", cache: "no-store", ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) }); }
  catch { throw new DraftApiError(0, "unavailable"); }
  if (!response.ok) {
    let code = "", fields: string[] = [];
    try {
      const problem: unknown = await response.json();
      if (problem && typeof problem === "object" && !Array.isArray(problem)) {
        const record = problem as Record<string, unknown>;
        if (typeof record.code === "string" && Object.hasOwn(codeMessages, record.code)) code = record.code;
        if (Array.isArray(record.fieldErrors)) fields = record.fieldErrors.filter((entry): entry is { field: string } => !!entry && typeof entry === "object" && "field" in entry && typeof entry.field === "string" && fieldAllowlist.has(entry.field)).map((entry) => entry.field);
      }
    } catch { /* Never render arbitrary server/provider detail. */ }
    throw new DraftApiError(response.status, code, fields);
  }
  try { return await response.json() as T; } catch { throw new DraftApiError(0, "invalid_response"); }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function id(value: string) { if (!uuid.test(value)) throw new DraftApiError(422, "validation_error"); return encodeURIComponent(value); }
export const draftApi = {
  history: (participationId: string) => call<unknown>(`/api/v1/business/participations/${id(participationId)}/preparation-drafts`),
  create: (participationId: string, body: unknown) => call<unknown>(`/api/v1/business/participations/${id(participationId)}/preparation-drafts`, "POST", body),
  read: (draftId: string) => call<unknown>(`/api/v1/business/preparation-drafts/${id(draftId)}`),
  save: (draftId: string, body: DraftWrite) => call<unknown>(`/api/v1/business/preparation-drafts/${id(draftId)}`, "PUT", body),
  adopt: (draftId: string, body: AdoptWrite) => call<unknown>(`/api/v1/business/preparation-drafts/${id(draftId)}/adopt`, "POST", body),
  job: (jobId: string) => call<unknown>(`/api/v1/ai/jobs/${id(jobId)}`),
  cancel: (jobId: string) => call<unknown>(`/api/v1/ai/jobs/${id(jobId)}/cancel`, "POST", {}),
};
