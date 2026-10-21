import type { components } from "../api-schema";

export type SetupDetails = components["schemas"]["SetupDetails"];

export interface SetupDraftMemory {
  base: SetupDetails;
  boothLabel: string;
  setupInstructions: string;
  dirty: boolean;
  conflict: boolean;
}

export type SetupWrite = components["schemas"]["SaveSetup"];

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const safeFields = new Set(["boothLabel", "setupInstructions"]);
const messages: Record<string, string> = {
  unauthenticated: "Sign in again.", forbidden: "Access is not permitted.",
  password_change_required: "Change your password before continuing.", not_found: "Setup details are not available.",
  revision_conflict: "Setup details changed elsewhere. Review the latest version before publishing again.",
  validation_error: "Check the highlighted setup details.", internal_error: "Request could not be completed.",
  service_unavailable: "Request could not be completed.",
};

export class SetupApiError extends Error {
  constructor(readonly status: number, readonly code: string, readonly fields: string[] = []) {
    super(messages[code] ?? "Request could not be completed.");
  }
}

async function call<T>(path: string, method: "GET" | "PUT", body?: SetupWrite): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method, credentials: "same-origin", cache: "no-store",
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new SetupApiError(0, "unavailable");
  }
  if (!response.ok) {
    let code = "";
    let fields: string[] = [];
    try {
      const problem: unknown = await response.json();
      if (problem && typeof problem === "object" && !Array.isArray(problem)) {
        const record = problem as Record<string, unknown>;
        if (typeof record.code === "string" && Object.hasOwn(messages, record.code)) code = record.code;
        if (Array.isArray(record.fieldErrors)) fields = record.fieldErrors
          .filter((item): item is { field: string } => !!item && typeof item === "object" && "field" in item && typeof item.field === "string" && safeFields.has(item.field))
          .map((item) => item.field);
      }
    } catch { /* Keep generic safe feedback. */ }
    throw new SetupApiError(response.status, code, fields);
  }
  try { return await response.json() as T; }
  catch { throw new SetupApiError(0, "invalid_response"); }
}

function validScope(eventId: string, participationId: string) {
  if (!uuid.test(eventId) || !uuid.test(participationId)) throw new SetupApiError(422, "validation_error");
}

export const setupApi = {
  organiserGet(eventId: string, participationId: string) {
    validScope(eventId, participationId);
    return call<unknown>(`/api/v1/organiser/events/${encodeURIComponent(eventId)}/participations/${encodeURIComponent(participationId)}/setup`, "GET");
  },
  organiserSave(eventId: string, participationId: string, body: SetupWrite) {
    validScope(eventId, participationId);
    return call<unknown>(`/api/v1/organiser/events/${encodeURIComponent(eventId)}/participations/${encodeURIComponent(participationId)}/setup`, "PUT", body);
  },
  businessGet(participationId: string) {
    if (!uuid.test(participationId)) throw new SetupApiError(422, "validation_error");
    return call<unknown>(`/api/v1/business/participations/${encodeURIComponent(participationId)}/setup`, "GET");
  },
};
