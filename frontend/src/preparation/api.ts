import type { components } from "../api-schema";
export type PreparationTask = components["schemas"]["TaskView"];
export type PreparationLine = components["schemas"]["BudgetLineView"];
export type PreparationDocument = components["schemas"]["PreparationView"];
export type PreparationWrite = components["schemas"]["ReplacePreparation"];
export type PreparationEditableTask = Omit<PreparationTask, "id"> & { id?: string };
export type PreparationEditableLine = Omit<PreparationLine, "id" | "unitPriceMinorUnits"> & { id?: string; unitPriceMinorUnits: number | null; priceText: string };
export type PreparationDraft = { limitText?: string; tasks: PreparationEditableTask[]; lines: PreparationEditableLine[]; revision: number; saved: PreparationDocument };
export type PreparationMemory = { businessId: string; eventId: string; participationId: string; draft: PreparationDraft; conflict: boolean };

export class PreparationApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly fields: string[] = []) {
    super(code === "revision_conflict" ? "Preparation changed elsewhere. Review the latest version." :
      code === "validation_error" ? "Check the highlighted preparation fields." :
      code === "not_found" ? "This preparation record is not available." :
      status === 401 ? "Sign in again." : status === 403 ? "Access is not permitted." :
      "Request could not be completed.");
  }
}

const fieldsAllowed = new Set(["expectedRevision", "tasks", "title", "status", "dueDate", "budget", "currency", "lines", "description", "quantity", "unitPriceMinorUnits", "priceBasis", "quotationBasis", "id"]);

async function call<T>(participationId: string, method: "GET" | "PUT", body?: PreparationWrite): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/business/participations/${encodeURIComponent(participationId)}/preparation`, {
      method, credentials: "same-origin", cache: "no-store",
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
  } catch { throw new PreparationApiError(0, "unavailable"); }
  if (!response.ok) {
    let code = "", fields: string[] = [];
    try {
      const problem = await response.json();
      if (typeof problem?.code === "string") code = problem.code;
      if (Array.isArray(problem?.fieldErrors)) fields = problem.fieldErrors
        .filter((item: { field?: unknown }) => typeof item.field === "string" && fieldsAllowed.has(item.field))
        .map((item: { field: string }) => item.field);
    } catch { /* Keep a generic safe error. */ }
    throw new PreparationApiError(response.status, code, fields);
  }
  try { return await response.json() as T; }
  catch { throw new PreparationApiError(0, "invalid_response"); }
}

export const preparationApi = {
  get: (participationId: string) => call<unknown>(participationId, "GET"),
  save: (participationId: string, body: PreparationWrite) => call<unknown>(participationId, "PUT", body),
};
