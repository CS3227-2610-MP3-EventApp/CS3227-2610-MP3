import type { components } from "./api-schema";
import type { CurrentActor } from "./session";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly errors: Record<string, string[]> = {}) { super(message); }
}

async function request<T>(path: string, method = "GET", body?: unknown, scope = "auth"): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/${scope}${path}`, {
      method, credentials: "same-origin",
      ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
  } catch { throw new ApiError(0, "Unable to reach EventApp. Please try again."); }
  if (!response.ok) {
    let detail = "Request could not be completed.";
    const errors: Record<string, string[]> = {};
    try {
      const problem: unknown = await response.json();
      if (problem && typeof problem === "object" && "detail" in problem && typeof problem.detail === "string") detail = problem.detail;
      if (problem && typeof problem === "object" && "errors" in problem && problem.errors && typeof problem.errors === "object") {
        for (const [field, messages] of Object.entries(problem.errors)) {
          if (Array.isArray(messages) && messages.every((message) => typeof message === "string")) errors[field] = messages;
        }
      }
    } catch { /* An unavailable service may return a non-JSON response. */ }
    throw new ApiError(response.status, detail, errors);
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

export type EventSummary = components["schemas"]["EventSummary"];
export type Venue = components["schemas"]["Venue"];
export type Room = components["schemas"]["Room"];
export type ProgrammeItem = components["schemas"]["ProgrammeItem"];
export type VenueFields = components["schemas"]["VenueFields"];
export type RoomFields = components["schemas"]["RoomFields"];
export type ItemFields = components["schemas"]["ItemFields"];

async function allPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let total = Infinity;
  while (items.length < total) {
    const page = await request<{ items: T[]; total: number; limit: number; offset: number }>(`${path}?limit=100&offset=${items.length}`, "GET", undefined, "organiser");
    items.push(...page.items);
    total = page.total;
    if (!page.items.length) break;
  }
  return items;
}

const eventPath = (eventId: string) => `/events/${encodeURIComponent(eventId)}`;
export const programmeApi = {
  events: () => allPages<EventSummary>("/events"),
  venues: (eventId: string) => allPages<Venue>(`${eventPath(eventId)}/venues`),
  rooms: (eventId: string) => allPages<Room>(`${eventPath(eventId)}/rooms`),
  items: (eventId: string) => allPages<ProgrammeItem>(`${eventPath(eventId)}/programme-items`),
  item: (eventId: string, id: string) => request<ProgrammeItem>(`${eventPath(eventId)}/programme-items/${id}`, "GET", undefined, "organiser"),
  saveVenue: (eventId: string, body: VenueFields, current?: Venue) => request<Venue>(`${eventPath(eventId)}/venues${current ? `/${current.id}` : ""}`, current ? "PATCH" : "POST", { ...body, ...(current ? { expectedRevision: current.revision } : {}) }, "organiser"),
  saveRoom: (eventId: string, venueId: string, body: RoomFields, current?: Room) => request<Room>(`${eventPath(eventId)}${current ? `/rooms/${current.id}` : `/venues/${venueId}/rooms`}`, current ? "PATCH" : "POST", { ...body, ...(current ? { expectedRevision: current.revision } : {}) }, "organiser"),
  saveItem: (eventId: string, body: ItemFields, current?: ProgrammeItem) => request<ProgrammeItem>(`${eventPath(eventId)}/programme-items${current ? `/${current.id}` : ""}`, current ? "PATCH" : "POST", { ...body, ...(current ? { expectedRevision: current.revision } : {}) }, "organiser"),
  delete: (eventId: string, resource: "venues" | "rooms" | "programme-items", current: { id: string; revision: number }) => request<void>(`${eventPath(eventId)}/${resource}/${current.id}`, "DELETE", { expectedRevision: current.revision }, "organiser"),
  validate: (eventId: string, item: ProgrammeItem) => request<components["schemas"]["ValidationResult"]>(`${eventPath(eventId)}/programme-items/${item.id}/validate`, "POST", { expectedRevision: item.revision }, "organiser"),
  publish: (eventId: string, item: ProgrammeItem) => request<ProgrammeItem>(`${eventPath(eventId)}/programme-items/${item.id}/publish`, "POST", { expectedRevision: item.revision }, "organiser"),
};
