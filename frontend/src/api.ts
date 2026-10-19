import type { components } from "./api-schema";
import type { CurrentActor } from "./session";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/auth${path}`, {
      method, credentials: "same-origin",
      ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
  } catch { throw new ApiError(0, "Unable to reach EventApp. Please try again."); }
  if (!response.ok) {
    let detail = "Request could not be completed.";
    try {
      const problem: unknown = await response.json();
      if (problem && typeof problem === "object" && "detail" in problem && typeof problem.detail === "string") detail = problem.detail;
    } catch { /* An unavailable service may return a non-JSON response. */ }
    throw new ApiError(response.status, detail);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export const api = {
  me: () => request<CurrentActor>("/me"),
  login: (body: components["schemas"]["LoginRequest"]) => request<CurrentActor>("/login", "POST", body),
  registerAttendee: (body: components["schemas"]["AttendeeRegistration"]) => request<CurrentActor>("/register/attendee", "POST", body),
  registerBusiness: (body: components["schemas"]["BusinessRegistration"]) => request<CurrentActor>("/register/business", "POST", body),
  changePassword: (body: components["schemas"]["PasswordChangeRequest"]) => request<CurrentActor>("/change-password", "POST", body),
  logout: () => request<void>("/logout", "POST"),
};
