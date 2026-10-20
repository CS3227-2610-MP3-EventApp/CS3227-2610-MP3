import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { actor, auth } from "../fixtures/auth";
import { renderPrototype, storedValues } from "../helpers/renderPrototype";

const CURRENT = "Synthetic-Current-Password";
const REPLACEMENT = "Synthetic-New-Password";
const HOSTILE = "PRIVATE-PASSWORD https://example.invalid/database <script>bad()</script>";
function fill(current = CURRENT, replacement = REPLACEMENT, confirmation = replacement) {
  for (const [label, value] of [[/^current password$/i, current], [/^new password$/i, replacement], [/^confirm new password$/i, confirmation]] as const) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}
async function changeForm() {
  auth.current = { ...actor("organiser"), mustChangePassword: true };
  await renderPrototype("/organiser");
  await screen.findByLabelText(/^current password$/i);
}
async function submit() { await userEvent.setup().click(screen.getByRole("button", { name: /^change password$/i })); }
function passwordWrites() { return auth.requests.filter((request) => request.path.endsWith("/change-password")); }
function noPrivateStorage() {
  const value = storedValues(window.localStorage) + storedValues(window.sessionStorage) + window.location.href + JSON.stringify(window.history.state);
  for (const marker of [CURRENT, REPLACEMENT, HOSTILE]) expect(value).not.toContain(marker);
}
function overrideError(path: string, status: number, code: string, fields?: { field: string; code: string }[], effect?: () => void) {
  const original = globalThis.fetch;
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const requestPath = new URL(typeof input === "object" && "url" in input ? input.url : String(input), window.location.origin).pathname;
    if (requestPath === path && init?.method === "POST") {
      auth.requests.push({ path: requestPath, method: "POST", body: JSON.parse(String(init.body)), credentials: init.credentials });
      effect?.();
      return new Response(JSON.stringify({ type: "about:blank", title: "Request failed", status, code, detail: HOSTILE, instance: path, ...(fields ? { fieldErrors: fields } : {}) }), { status, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store" } });
    }
    return original(input, init);
  }));
}
function associated(input: HTMLElement, pattern: RegExp) {
  const ids = (input.getAttribute("aria-describedby") ?? input.getAttribute("aria-errormessage") ?? "").split(" ");
  expect(ids.some((id) => pattern.test(document.getElementById(id)?.textContent ?? ""))).toBe(true);
}

describe("Access r4 AC20/21 and shared UI r4 clear, safe reasons", () => {
  test("same current and new password has a specific associated error before any write", async () => {
    await changeForm(); fill(CURRENT, CURRENT); await submit();
    expect(await screen.findByText("The new password must be different from your current password.")).toBeVisible();
    expect(screen.getByLabelText(/^new password$/i)).toBeInvalid();
    associated(screen.getByLabelText(/^new password$/i), /different.*current password/i);
    expect(passwordWrites()).toHaveLength(0); expect(auth.current?.mustChangePassword).toBe(true);
    expect(document.body).toHaveTextContent(/choose.*different|enter.*different/i);
    noPrivateStorage();
  });
  test.each(["current password", "new password", "confirm new password"])("missing%s explains required field and sends no mutation", async (label) => {
    await changeForm(); fill();
    const input = screen.getByLabelText(new RegExp(`^${label}$`, "i"));
    fireEvent.change(input, { target: { value: "" } }); await submit();
    expect(input).toBeInvalid(); associated(input, /this field is required/i);
    expect(passwordWrites()).toHaveLength(0); noPrivateStorage();
  });
  test.each([7, 129])("password length%s gives both limits without a write", async (length) => {
    await changeForm(); fill(CURRENT, "x".repeat(length)); await submit();
    expect(screen.getByLabelText(/^new password$/i)).toBeInvalid();
    associated(screen.getByLabelText(/^new password$/i), /use between 8 and 128 characters/i);
    expect(passwordWrites()).toHaveLength(0); noPrivateStorage();
  });
  test.each([8, 128])("password exact length%s reaches API unchanged without confirmation", async (length) => {
    await changeForm(); const replacement = "x".repeat(length); fill(CURRENT, replacement); await submit();
    await waitFor(() => expect(passwordWrites()).toHaveLength(1));
    expect(passwordWrites()[0].body).toEqual({ currentPassword: CURRENT, newPassword: replacement });
    expect(passwordWrites()[0].credentials).toBe("same-origin"); noPrivateStorage();
  });
  test("confirmation uses exact untrimmed equality with specific guidance", async () => {
    await changeForm(); fill(CURRENT, REPLACEMENT, ` ${REPLACEMENT} `); await submit();
    expect(screen.getByLabelText(/^confirm new password$/i)).toBeInvalid();
    associated(screen.getByLabelText(/^confirm new password$/i), /the passwords do not match/i);
    expect(passwordWrites()).toHaveLength(0); noPrivateStorage();
  });
  test.each([
    ["current_password_incorrect", /^current password$/i, "The current password is incorrect.", /check.*current password/i],
    ["password_unchanged", /^new password$/i, "The new password must be different from your current password.", /choose.*different|enter.*different/i],
  ] as const)("server%s maps fixed field/reason/action without echoing raw detail", async (code, label, expected, action) => {
    overrideError("/api/v1/auth/change-password", 422, code);
    await changeForm(); fill(); await submit();
    expect(await screen.findByText(expected)).toBeVisible();
    expect(screen.getByLabelText(label)).toBeInvalid();
    associated(screen.getByLabelText(label), code === "password_unchanged" ? /different.*current password/i : /current password.*incorrect/i);
    expect(document.body).toHaveTextContent(action);
    expect(document.body).not.toHaveTextContent(HOSTILE);
    expect(screen.getByLabelText(/^current password$/i)).toHaveValue(CURRENT);
    expect(auth.current?.mustChangePassword).toBe(true); expect(passwordWrites()).toHaveLength(1); noPrivateStorage();
  });
  test("server fixed field/code mapping ignores unknown fields and raw details", async () => {
    overrideError("/api/v1/auth/change-password", 422, "validation_error", [{ field: "newPassword", code: "password_length" }, { field: "PRIVATE-UNKNOWN-FIELD", code: "required" }]);
    await changeForm(); fill(); await submit();
    await waitFor(() => expect(screen.getByLabelText(/^new password$/i)).toBeInvalid());
    associated(screen.getByLabelText(/^new password$/i), /use between 8 and 128 characters/i);
    expect(document.body).not.toHaveTextContent(HOSTILE); expect(document.body).not.toHaveTextContent("PRIVATE-UNKNOWN-FIELD"); noPrivateStorage();
  });
  test("unknown error code falls back to useful safe guidance", async () => {
    overrideError("/api/v1/auth/change-password", 422, "PRIVATE-UNKNOWN-CODE");
    await changeForm(); fill(); await submit();
    expect(await screen.findByText(/could not.*(complete|change)|unable.*(complete|change)/i)).toBeVisible();
    expect(document.body).toHaveTextContent(/check.*(details|input)|try again|sign in/i);
    expect(document.body).not.toHaveTextContent(HOSTILE); expect(document.body).not.toHaveTextContent("PRIVATE-UNKNOWN-CODE");
    expect(auth.current?.mustChangePassword).toBe(true); noPrivateStorage();
  });
  test("confirmed invalid session clears password view and asks to sign in again", async () => {
    overrideError("/api/v1/auth/change-password", 401, "unauthenticated", undefined, () => { auth.current = null; });
    await changeForm(); fill(); await submit();
    await waitFor(() => expect(window.location.pathname).toBe("/login"));
    expect(await screen.findByText(/session.*no longer valid|sign in again/i)).toBeVisible();
    expect(screen.queryByLabelText(/^current password$/i)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(HOSTILE); noPrivateStorage();
  });
  test("generic login failure explains what to check without revealing an account", async () => {
    overrideError("/api/v1/auth/login", 401, "invalid_credentials");
    await renderPrototype("/login");
    fireEvent.change(screen.getByLabelText(/username or email/i), { target: { value: "synthetic@example.test" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: CURRENT } });
    await userEvent.setup().click(screen.getByRole("button", { name: /log in/i }));
    expect(await screen.findByText(/check.*(identifier|username|email).*password.*role/i)).toBeVisible();
    expect(document.body).not.toHaveTextContent(HOSTILE); expect(window.location.pathname).toBe("/login"); noPrivateStorage();
  });
  test("registration conflict stays generic and gives safe supported next steps", async () => {
    overrideError("/api/v1/auth/register/attendee", 409, "registration_conflict");
    await renderPrototype("/register/attendee");
    for (const [label, value] of [[/display name/i, "Synthetic Person"], [/^username$/i, "synthetic-person"], [/^email$/i, "synthetic@example.test"], [/^password$/i, CURRENT], [/confirm password/i, CURRENT]] as const) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    await userEvent.setup().click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText(/registration could not be completed/i)).toBeVisible();
    expect(document.body).toHaveTextContent(/check.*details|sign in/i);
    expect(document.body).not.toHaveTextContent(/email.*already|username.*already|business.*already/i);
    expect(document.body).not.toHaveTextContent(HOSTILE); noPrivateStorage();
  });
  test.each([true, false])("lost logout response committed%s reconciles session without claiming revocation or replaying logout", async (committed) => {
    auth.current = actor("attendee");
    const original = globalThis.fetch;
    let logoutCount = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const path = new URL(typeof input === "object" && "url" in input ? input.url : String(input), window.location.origin).pathname;
      if (path.endsWith("/auth/logout")) {
        logoutCount++;
        if (committed) auth.current = null;
        throw new TypeError("Synthetic logout response lost");
      }
      return original(input, init);
    }));
    await renderPrototype("/attendee");
    await userEvent.setup().click(await screen.findByRole("button", { name: /sign out/i }));
    const check = await screen.findByRole("button", { name: /check.*(session|outcome|access)/i });
    expect(document.body).toHaveTextContent(/outcome not confirmed/i);
    await userEvent.setup().click(check);
    await waitFor(() => expect(auth.requests.filter((request) => request.path.endsWith("/me")).length).toBeGreaterThan(1));
    expect(logoutCount).toBe(1);
    await waitFor(() => expect(window.location.pathname).toBe(committed ? "/login" : "/attendee"));
    if (!committed) expect(auth.current?.role).toBe("attendee");
    noPrivateStorage();
  });
  test.each([true, false])("uncertain password-change commit%s is never blindly replayed or called successful", async (committed) => {
    const original = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const path = new URL(typeof input === "object" && "url" in input ? input.url : String(input), window.location.origin).pathname;
      if (path === "/api/v1/auth/change-password") {
        auth.requests.push({ path, method: "POST", body: JSON.parse(String(init?.body)), credentials: init?.credentials });
        if (committed) auth.current = { ...auth.current!, mustChangePassword: false };
        throw new TypeError("Synthetic response lost");
      }
      return original(input, init);
    }));
    await changeForm(); fill(); await submit();
    expect(await screen.findByText(/outcome not confirmed/i)).toBeVisible();
    expect(passwordWrites()).toHaveLength(1);
    const check = screen.queryByRole("button", { name: /check.*(outcome|session|access)/i });
    if (check) await userEvent.setup().click(check);
    await waitFor(() => expect(auth.requests.filter((request) => request.path.endsWith("/me")).length).toBeGreaterThan(1));
    expect(passwordWrites()).toHaveLength(1);
    expect(document.body).not.toHaveTextContent(/password.*(changed successfully|was changed)|completed.*password/i);
    expect(document.body).toHaveTextContent(/sign in.*new password|password.*not confirmed|outcome not confirmed/i); noPrivateStorage();
  });
});
