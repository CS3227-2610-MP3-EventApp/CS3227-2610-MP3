import { vi } from "vitest";

// Synthetic wire examples only: this fixture deliberately does not implement filtering,
// publication, cookie validation, access control or persistence.
export const programmeRoot = "/api/v1/programme";
export const eventA = {
  id: "00000000-0000-4000-8000-000000000011", title: "Synthetic Singapore Festival",
  timezone: "Asia/Singapore", startsAt: "2026-10-20T00:00:00Z", endsAt: "2026-10-22T00:00:00Z", revision: 2,
};
export const eventB = {
  ...eventA, id: "00000000-0000-4000-8000-000000000012", title: "Synthetic Second Festival",
};
export const eveningWorkshop = {
  id: "00000000-0000-4000-8000-000000000021", eventId: eventA.id, eventTimezone: "Asia/Singapore",
  title: "Evening workshop", type: "workshop", startsAt: "2026-10-20T15:30:00Z", endsAt: "2026-10-20T17:00:00Z",
  revision: 3, state: "published", priceMinorUnits: 1250, currency: "SGD", capacity: 30,
  accessibilityDetails: null as string | null,
  room: {
    id: "00000000-0000-4000-8000-000000000031", name: "Room A", accessibilityDetails: "Lift to room",
    venue: {
      id: "00000000-0000-4000-8000-000000000041", name: "Demo Hall", address: "1 Example Road",
      accessibilityDetails: "Step-free main entrance",
    },
  },
};
export const freeTalk = {
  ...eveningWorkshop, id: "00000000-0000-4000-8000-000000000022", title: "Free community talk",
  type: "talk", priceMinorUnits: 0, startsAt: "2026-10-21T02:00:00Z", endsAt: "2026-10-21T03:00:00Z",
};
export const secondEventItem = {
  ...freeTalk, id: "00000000-0000-4000-8000-000000000023", eventId: eventB.id, title: "Second event performance", type: "performance",
};
export const literalTitleItem = { ...eveningWorkshop, title: "Straße 100%_Ready \\ 'workshop'" };

export function page<T>(items: T[], offset = 0, hasMore = false, limit = 20) {
  return { items, limit, offset, hasMore };
}
export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
export function problem(status: 401 | 403 | 404 | 422 | 503, path: string) {
  const values = {
    401: ["Unauthorized", "unauthenticated", "Authentication required."],
    403: ["Forbidden", "forbidden", "Access is not permitted."],
    404: ["Not Found", "not_found", "Resource not found."],
    422: ["Unprocessable Entity", "validation_error", "Request validation failed."],
    503: ["Service Unavailable", "service_unavailable", "Request could not be completed."],
  } as const;
  const [title, code, detail] = values[status];
  return new Response(JSON.stringify({ type: "about:blank", title, status, detail, instance: path, code }), {
    status, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store" },
  });
}
export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}
export interface ProgrammeRequest { url: URL; method: string; credentials?: RequestCredentials }
export type ProgrammeResponder = (request: ProgrammeRequest) => Response | Promise<Response>;
export const itemsPath = (eventId = eventA.id) => `${programmeRoot}/events/${eventId}/items`;
export const detailPath = (itemId = eveningWorkshop.id, eventId = eventA.id) => `${itemsPath(eventId)}/${itemId}`;

export function defaultProgrammeResponse({ url }: ProgrammeRequest): Response {
  if (url.pathname === `${programmeRoot}/events`) return json(page([eventA, eventB]));
  if (url.pathname === itemsPath()) return json(page([eveningWorkshop, freeTalk]));
  if (url.pathname === itemsPath(eventB.id)) return json(page([secondEventItem]));
  if (url.pathname === detailPath()) return json(eveningWorkshop);
  if (url.pathname === detailPath(freeTalk.id)) return json(freeTalk);
  if (url.pathname === detailPath(secondEventItem.id, eventB.id)) return json(secondEventItem);
  throw new Error(`Unassigned programme fixture response: ${url.pathname}`);
}

export function installProgramme() {
  // setup.ts installs auth.reset() first. Preserve that fixture, including /me,
  // login and logout, instead of replacing actor restoration with local authority.
  const authFetch = globalThis.fetch;
  const requests: ProgrammeRequest[] = [];
  const boundary = { requests, respond: defaultProgrammeResponse as ProgrammeResponder };
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === "object" && "url" in input ? input.url : String(input), window.location.origin);
    if (!url.pathname.startsWith(`${programmeRoot}/`)) return authFetch(input, init);
    const request = {
      url, method: init?.method ?? (input instanceof Request ? input.method : "GET"),
      credentials: init?.credentials ?? (input instanceof Request ? input.credentials : undefined),
    };
    requests.push(request);
    // Do not cancel held promises: a response can already have crossed the network
    // when cancellation happens. UI must still reject stale selection/identity data.
    return (await boundary.respond(request)).clone();
  }));
  return boundary;
}
