import { vi } from "vitest";
import { actor, auth } from "./auth";

// Independent r2 wire fixtures. These model observable server state, not frontend internals.
export const B1 = "33333333-3333-4333-8333-333333333333";
export const B2 = "44444444-4444-4444-8444-444444444444";
export const E1 = "22222222-2222-4222-8222-222222222222";
export const E2 = "55555555-5555-4555-8555-555555555555";
export const A1 = "66666666-6666-4666-8666-666666666666";
export const A2 = "77777777-7777-4777-8777-777777777777";
export const content = {
  participantType: "exhibitor", description: "Synthetic handmade ceramics",
  requestedSpace: "One table", contactName: "Synthetic Contact", contactEmail: "contact@example.test",
};
export interface Application {
  id: string; businessId: string; eventId: string; participationId: string;
  status: "draft" | "submitted"; revision: number; content: typeof content;
  frozenSubmittedContentRevision: number | null; submittedAt: string | null;
}
export function draft(overrides: Partial<Application> = {}): Application {
  return { id: A1, businessId: B1, eventId: E1, participationId: "88888888-8888-4888-8888-888888888888",
    status: "draft", revision: 1, content: { ...content }, frozenSubmittedContentRevision: null, submittedAt: null, ...overrides };
}
export function submitted(overrides: Partial<Application> = {}): Application {
  return draft({ status: "submitted", revision: 2, frozenSubmittedContentRevision: 1,
    submittedAt: "2026-10-21T01:00:00Z", ...overrides });
}
export interface RecordedRequest {
  url: string; path: string; method: string; body: Record<string, unknown>; credentials?: RequestCredentials; headers: Headers;
}
interface Control {
  match: (request: RecordedRequest) => boolean;
  status?: number; value?: unknown; lost?: boolean; commit?: boolean;
  wait?: Promise<void>;
}
function response(value: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(value), { status,
    headers: { "Content-Type": status >= 400 ? "application/problem+json" : "application/json", "Cache-Control": "no-store" } });
}
export function problem(status: number, code: string, extra: Record<string, unknown> = {}) {
  return { type: "about:blank", title: "Request failed", status, detail: "Request could not be completed.", instance: "/api/v1/business/applications", code, ...extra };
}

export const applications = {
  records: [] as Application[], approvals: [] as { id: string; eventId: string; businessId: string; approvedAt: string }[],
  events: [{ eventId: E1, title: "Synthetic Autumn Fair", timezone: "Asia/Singapore", startsAt: "2027-01-01T01:00:00Z", endsAt: "2027-01-01T09:00:00Z", eventRevision: 1 },
    { eventId: E2, title: "Synthetic Winter Market", timezone: "Asia/Singapore", startsAt: "2027-02-01T01:00:00Z", endsAt: "2027-02-01T09:00:00Z", eventRevision: 1 }],
  requests: [] as RecordedRequest[], controls: [] as Control[],
  install(role: "business" | "organiser" = "business", many = false) {
    auth.current = actor(role);
    if (many && role === "business") auth.current.businessMemberships.push({ businessId: B2, businessName: "Synthetic Second Studio", role: "owner", status: "active" });
    if (many && role === "organiser") auth.current.eventMemberships.push({ eventId: E2, role: "organiser", status: "active" });
    this.records = []; this.requests = []; this.controls = [];
    this.approvals = [{ id: "99999999-9999-4999-8999-999999999999", eventId: E1, businessId: B1, approvedAt: "2026-10-21T00:00:00Z" }];
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "object" && "url" in input ? input.url : String(input), window.location.origin);
      const request: RecordedRequest = { url: url.pathname + url.search, path: url.pathname, method: init?.method ?? "GET",
        body: init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}, credentials: init?.credentials, headers: new Headers(init?.headers) };
      this.requests.push(request);
      const index = this.controls.findIndex((control) => control.match(request));
      const control = index < 0 ? undefined : this.controls.splice(index, 1)[0];
      // A held response captures its dispatch-time result, enabling genuine out-of-order tests.
      let actual: Response;
      if (control && !control.commit && (control.value !== undefined || control.status !== undefined || control.lost)) {
        actual = response(control.value ?? problem(control.status ?? 503, "service_unavailable"), control.status ?? 503);
      } else if (url.pathname.startsWith("/api/v1/auth/")) actual = await originalFetch(input, init);
      else actual = this.dispatch(request, url);
      if (control?.wait) await control.wait;
      if (control?.lost) throw new TypeError("Synthetic response lost");
      if (control?.commit && control.value !== undefined) return response(control.value, control.status ?? 200);
      return actual;
    }));
  },
  writes() { return this.requests.filter((request) => request.method !== "GET" && !request.path.includes("/auth/")); },
  once(path: string, method: string, options: Omit<Control, "match">) {
    this.controls.push({ match: (request) => request.path === path && request.method === method, ...options });
  },
  hold(path: string, method = "GET", options: Omit<Control, "match" | "wait"> = {}) {
    let release!: () => void;
    const wait = new Promise<void>((resolve) => { release = resolve; });
    this.once(path, method, { ...options, wait });
    return release;
  },
  dispatch(request: RecordedRequest, url: URL): Response {
    const { path, method, body } = request;
    if (!auth.current) return response(problem(401, "unauthenticated"), 401);
    if (path === "/api/v1/business/application-events") {
      const businessId = url.searchParams.get("businessId");
      return response(this.events.filter((event) => this.approvals.some((grant) => grant.businessId === businessId && grant.eventId === event.eventId))
        .map((event) => ({ ...event, applicationId: this.records.find((record) => record.businessId === businessId && record.eventId === event.eventId)?.id ?? null })));
    }
    if (path === "/api/v1/business/applications" && method === "GET") return response(this.records.filter((record) => record.businessId === url.searchParams.get("businessId")));
    if (path === "/api/v1/business/applications" && method === "POST") {
      if (this.records.some((record) => record.businessId === body.businessId && record.eventId === body.eventId)) return response(problem(409, "application_exists"), 409);
      const saved = draft({ id: this.records.length ? A2 : A1, businessId: String(body.businessId), eventId: String(body.eventId), content: normalized(body) });
      this.records.push(saved); return response(saved, 201);
    }
    const businessDetail = path.match(/^\/api\/v1\/business\/applications\/([^/]+)(\/submit)?$/);
    if (businessDetail) {
      const record = this.records.find((value) => value.id === businessDetail[1]);
      if (!record) return response(problem(404, "not_found"), 404);
      if (method === "GET") return response(record);
      if (record.status === "submitted") return response(problem(409, "application_submitted"), 409);
      if (body.expectedRevision !== record.revision) return response(problem(409, "revision_conflict"), 409);
      if (method === "PUT") { record.content = normalized(body); record.revision += 1; return response(record); }
      if (method === "POST" && businessDetail[2]) {
        record.frozenSubmittedContentRevision = record.revision; record.revision += 1; record.status = "submitted"; record.submittedAt = "2026-10-21T01:00:00Z";
        return response(record);
      }
    }
    const organiser = path.match(/^\/api\/v1\/organiser\/events\/([^/]+)\/(business-approvals|applications)(?:\/([^/]+))?$/);
    if (organiser) {
      const [, eventId, kind, id] = organiser;
      if (kind === "business-approvals") {
        if (method === "GET") return response(this.approvals.filter((grant) => grant.eventId === eventId));
        const existing = this.approvals.find((grant) => grant.eventId === eventId && grant.businessId === body.businessId);
        if (existing) return response(existing);
        const grant = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", eventId, businessId: String(body.businessId), approvedAt: "2026-10-21T02:00:00Z" };
        this.approvals.push(grant); return response(grant, 201);
      }
      const records = this.records.filter((record) => record.eventId === eventId && record.status === "submitted");
      if (!id) return response(records);
      const record = records.find((value) => value.id === id);
      return record ? response(record) : response(problem(404, "not_found"), 404);
    }
    return response(problem(404, "not_found"), 404);
  },
};

function normalized(body: Record<string, unknown>): typeof content {
  return { participantType: String(body.participantType), description: String(body.description).trim(), requestedSpace: String(body.requestedSpace).trim(),
    contactName: String(body.contactName).trim(), contactEmail: String(body.contactEmail).trim().toLowerCase() };
}
