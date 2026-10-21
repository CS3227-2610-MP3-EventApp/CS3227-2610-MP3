import { vi } from "vitest";

export type Role = "attendee" | "organiser" | "business";
export function actor(role: Role = "attendee", displayName = `Synthetic ${role}`) {
  return {
    id: "11111111-1111-4111-8111-111111111111", username: "synthetic-user", displayName,
    role, mustChangePassword: false,
    eventMemberships: role === "organiser" ? [{ eventId: "22222222-2222-4222-8222-222222222222", role: "organiser", status: "active" }] : [],
    businessMemberships: role === "business" ? [{ businessId: "33333333-3333-4333-8333-333333333333", businessName: "Synthetic Studio", role: "owner", status: "active" }] : [],
  };
}

// UI fixtures exercise the server contract; backend tests separately use real PostgreSQL.
export const auth = {
  current: null as ReturnType<typeof actor> | null,
  loginActor: null as ReturnType<typeof actor> | null,
  failure: null as null | { status: number; detail: string },
  requests: [] as { path: string; method: string; body: Record<string, unknown>; credentials?: RequestCredentials }[],
  reset() {
    this.current = null;
    this.loginActor = null;
    this.failure = null;
    this.requests = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const path = new URL(typeof input === "object" && "url" in input ? input.url : String(input), window.location.origin).pathname;
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
      this.requests.push({ path, method, body, credentials: init?.credentials });
      let status = 200;
      let data: unknown = this.current;
      if (path === "/api/v1/auth/me") {
        if (!this.current) { status = 401; data = { type: "about:blank", title: "Unauthorized", status, detail: "Authentication required.", instance: path, code: "unauthenticated" }; }
      } else if (this.failure) {
        status = this.failure.status;
        const code = status === 401 ? "invalid_credentials" : status === 409 ? "registration_conflict" : status === 503 ? "service_unavailable" : status === 403 ? "forbidden" : "internal_error";
        data = { type: "about:blank", title: "Request failed", status, detail: this.failure.detail, instance: path, code };
      } else if (path === "/api/v1/auth/logout") {
        this.current = null; status = 204; data = null;
      } else if (path === "/api/v1/auth/change-password") {
        this.current = { ...this.current!, mustChangePassword: false }; data = this.current;
      } else if (path === "/api/v1/auth/login" || path.startsWith("/api/v1/auth/register/")) {
        const role = (body.role ?? path.split("/").at(-1)) as Role;
        this.current = this.loginActor ?? actor(role, typeof body.displayName === "string" ? body.displayName : `Synthetic ${role}`);
        data = this.current; status = path.includes("/register/") ? 201 : 200;
      } else { status = 404; data = { detail: "Not found." }; }
      return new Response(status === 204 ? null : JSON.stringify(data), { status, headers: { "Content-Type": status >= 400 ? "application/problem+json" : "application/json", "Cache-Control": "no-store" } });
    }));
  },
};

export function seedActor(role: Role, displayName = `Synthetic ${role}`) {
  auth.current = actor(role, displayName);
}
