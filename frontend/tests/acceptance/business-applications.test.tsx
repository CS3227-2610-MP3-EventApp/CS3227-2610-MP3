import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { renderPrototype, storedValues, tabTo } from "../helpers/renderPrototype";
import { actor, auth } from "../fixtures/auth";
import { A1, A2, B1, B2, E1, E2, applications, content, draft, problem, submitted } from "../fixtures/applications";

const businessRoute = `/business/applications?businessId=${B1}&eventId=${E1}`;
const savedRoute = `${businessRoute}&applicationId=${A1}`;
const organiserRoute = `/organiser/applications?eventId=${E1}`;
const applicationPath = `/api/v1/business/applications/${A1}`;
const discoveryPath = "/api/v1/business/application-events";
const heading = () => screen.findByRole("heading", { name: "Business applications", level: 1 });
const description = () => screen.getByLabelText(/^description$/i);

async function business(saved = false, many = false) {
  applications.install("business", many);
  if (saved) applications.records = [draft()];
  const result = await renderPrototype(saved ? savedRoute : businessRoute);
  await heading();
  await screen.findByLabelText(/^description$/i);
  if (saved) await waitFor(() => expect(description()).toHaveValue(content.description));
  return result;
}
function fill(values: Partial<typeof content> = {}) {
  const value = { ...content, ...values };
  for (const [label, text] of [[/^description$/i, value.description], [/^requested space$/i, value.requestedSpace], [/^contact name$/i, value.contactName], [/^contact email$/i, value.contactEmail]] as const) {
    fireEvent.change(screen.getByLabelText(label), { target: { value: text } });
  }
}
async function choose(label: RegExp, name: string) {
  const user = userEvent.setup();
  const input = screen.getByRole("combobox", { name: label });
  if (input instanceof HTMLSelectElement) {
    const option = within(input).getByRole("option", { name });
    await user.selectOptions(input, option);
  } else {
    await user.click(input); await user.click(await screen.findByRole("option", { name }));
  }
}
async function save() {
  await userEvent.setup().click(screen.getByRole("button", { name: /^save draft$/i }));
}
async function review() {
  await userEvent.setup().click(screen.getByRole("button", { name: /^review submission$/i }));
  return screen.findByRole("dialog", { name: /^confirm submission$/i });
}
function expectNoPrivateStorage(...values: string[]) {
  const stored = storedValues(window.localStorage) + storedValues(window.sessionStorage) + window.location.href + JSON.stringify(window.history.state);
  for (const value of values) expect(stored).not.toContain(value);
}
function expectCredentialedWrites() {
  for (const request of applications.writes()) {
    expect(request.credentials).toBe("same-origin");
    expect(request.headers.get("Content-Type")).toContain("application/json");
    expect(request.headers.has("Origin")).toBe(false); // Browser supplies trusted Origin; JS must not fake it.
  }
  expect(applications.requests.every((request) => request.path.startsWith("/api/v1/"))).toBe(true);
}
afterEach(() => { vi.useRealTimers(); });

describe("F06 frontend AC09-AC17: approved contexts and complete drafts", () => {
  test("AC09 discovers approved events for the selected owned business without writing on navigation", async () => {
    await business(false, true);
    expect(screen.getByRole("combobox", { name: /^business$/i })).toHaveTextContent("Synthetic Studio");
    expect(screen.getByRole("combobox", { name: /^event$/i })).toHaveTextContent("Synthetic Autumn Fair");
    expect(screen.getByText(B1, { exact: false })).toBeVisible();
    expect(screen.queryByText("Synthetic Winter Market")).not.toBeInTheDocument();
    expect(applications.requests.some((request) => request.url === `${discoveryPath}?businessId=${B1}`)).toBe(true);
    expect(applications.writes()).toHaveLength(0);
    await choose(/^business$/i, "Synthetic Second Studio");
    expect(await screen.findByText(/no results/i)).toBeVisible();
    expect(screen.queryByLabelText(/^description$/i)).not.toBeInTheDocument();
    expect(applications.requests.some((request) => request.url === `${discoveryPath}?businessId=${B2}`)).toBe(true);
    expect(applications.writes()).toHaveLength(0);
  });

  test.each(["exhibitor", "vendor"])("AC09 saves one complete %s draft using canonical returned values", async (participantType) => {
    await business();
    await choose(/^participant type$/i, participantType === "vendor" ? "Vendor" : "Exhibitor");
    fill({ description: "  Synthetic handmade ceramics  ", contactEmail: "Contact@Example.test" });
    await save();
    await waitFor(() => expect(applications.records).toHaveLength(1));
    await waitFor(() => expect(description()).toHaveValue(content.description));
    expect(screen.getByLabelText(/^contact email$/i)).toHaveValue(content.contactEmail);
    expect(await screen.findByText(/completed/i)).toBeVisible();
    expect(screen.getByText(/revision\s*:?\s*1/i)).toBeVisible();
    const write = applications.writes()[0];
    expect(write.path).toBe("/api/v1/business/applications");
    expect(write.method).toBe("POST");
    expect(Object.keys(write.body).sort()).toEqual(["businessId", "eventId", ...Object.keys(content)].sort());
    expect(write.body).toMatchObject({ businessId: B1, eventId: E1, participantType });
    expect(applications.writes()).toHaveLength(1);
    expectCredentialedWrites();
    expectNoPrivateStorage(content.description, content.contactEmail, content.contactName);
  });

  test("AC09/10 reopens the saved application and replaces complete content at its loaded revision", async () => {
    await business(true);
    fill({ description: "Updated synthetic ceramics" });
    await save();
    await waitFor(() => expect(applications.records[0].revision).toBe(2));
    expect(applications.writes()).toHaveLength(1);
    expect(applications.writes()[0]).toMatchObject({ path: applicationPath, method: "PUT", body: { expectedRevision: 1, ...content, description: "Updated synthetic ceramics" } });
    expect(Object.keys(applications.writes()[0].body).sort()).toEqual(["expectedRevision", ...Object.keys(content)].sort());
    expect(await screen.findByText(/revision\s*:?\s*2/i)).toBeVisible();
    expectCredentialedWrites();
  });

  test("AC09 discovery reopens the existing pair even without an application ID in the URL", async () => {
    applications.install(); applications.records = [draft()];
    await renderPrototype(businessRoute); await heading();
    await screen.findByLabelText(/^description$/i);
    await waitFor(() => expect(description()).toHaveValue(content.description));
    fill({ description: "Existing pair edit" }); await save();
    await waitFor(() => expect(applications.writes()).toHaveLength(1));
    expect(applications.writes()[0].method).toBe("PUT");
    expect(applications.records).toHaveLength(1);
  });

  test.each([
    ["description", /^description$/i, " "],
    ["requestedSpace", /^requested space$/i, " "],
    ["contactName", /^contact name$/i, " "],
    ["contactEmail", /^contact email$/i, "invalid-email"],
  ] as const)("AC09/14/16 rejects invalid %s with associated safe feedback and no write", async (_field, label, invalid) => {
    await business(); fill();
    fireEvent.change(screen.getByLabelText(label), { target: { value: invalid } });
    await save();
    expect(screen.getByLabelText(label)).toBeInvalid();
    const input = screen.getByLabelText(label);
    const ids = (input.getAttribute("aria-describedby") ?? input.getAttribute("aria-errormessage") ?? "").split(" ").filter(Boolean);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.some((id) => document.getElementById(id)?.textContent?.trim())).toBe(true);
    expect(applications.writes()).toHaveLength(0);
    expect(screen.getByLabelText(/^contact name$/i)).toHaveValue(_field === "contactName" ? invalid : content.contactName);
  });

  test.each([["description", /^description$/i, 5000], ["requestedSpace", /^requested space$/i, 500], ["contactName", /^contact name$/i, 100]] as const)("AC09 accepts exact %s maximum and rejects one outside", async (field, label, limit) => {
    await business(); fill();
    fireEvent.change(screen.getByLabelText(label), { target: { value: "x".repeat(limit + 1) } });
    await save();
    expect(screen.getByLabelText(label)).toBeInvalid();
    expect(applications.writes()).toHaveLength(0);
    fireEvent.change(screen.getByLabelText(label), { target: { value: "x".repeat(limit) } });
    await save();
    await waitFor(() => expect(applications.records).toHaveLength(1));
    expect(applications.records[0].content[field]).toHaveLength(limit);
  });

  test("AC14 maps fixed server validation fields without rendering hostile details or unknown names", async () => {
    await business(); fill();
    applications.once("/api/v1/business/applications", "POST", { status: 422, value: problem(422, "validation_error", {
      detail: "PRIVATE-SERVER-ECHO<script>bad()</script>", fieldErrors: [{ field: "contactEmail", code: "invalid" }, { field: "PRIVATE-UNKNOWN-FIELD", code: "invalid" }],
    }) });
    await save();
    expect(await screen.findByText(/needs correction/i)).toBeVisible();
    expect(screen.getByLabelText(/^contact email$/i)).toBeInvalid();
    expect(document.body).not.toHaveTextContent("PRIVATE-SERVER-ECHO");
    expect(document.body).not.toHaveTextContent("PRIVATE-UNKNOWN-FIELD");
    expect(description()).toHaveValue(content.description);
    expect(applications.records).toHaveLength(0);
  });

  test("AC09 accepts a valid254-character email and rejects255 without losing other input", async () => {
    await business(); fill();
    const maximum = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;
    expect(maximum).toHaveLength(254);
    fireEvent.change(screen.getByLabelText(/^contact email$/i), { target: { value: maximum + "d" } });
    await save(); expect(screen.getByLabelText(/^contact email$/i)).toBeInvalid();
    expect(applications.writes()).toHaveLength(0);
    fireEvent.change(screen.getByLabelText(/^contact email$/i), { target: { value: maximum } });
    await save(); await waitFor(() => expect(applications.records).toHaveLength(1));
    expect(applications.records[0].content.contactEmail).toBe(maximum);
  });
});

describe("F06 frontend AC10/11/14: saved review, conflicts and uncertain outcomes", () => {
  test("AC11 review/cancel are read-only and final confirmation submits exactly the saved revision", async () => {
    await business(true);
    const dialog = await review();
    for (const value of Object.values(content).filter((value) => value !== "exhibitor")) expect(dialog).toHaveTextContent(value);
    expect(dialog).toHaveTextContent(/cannot.*edit|frozen|freeze/i);
    expect(applications.writes()).toHaveLength(0);
    await userEvent.setup().click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(applications.writes()).toHaveLength(0);
    const next = await review();
    const release = applications.hold(`${applicationPath}/submit`, "POST");
    const submit = within(next).getByRole("button", { name: /^submit application$/i });
    await userEvent.setup().dblClick(submit);
    expect(applications.writes()).toHaveLength(1);
    expect(applications.writes()[0]).toMatchObject({ path: `${applicationPath}/submit`, method: "POST", body: { expectedRevision: 1 } });
    expect(screen.queryByText(/awaiting.*decision/i)).not.toBeInTheDocument();
    await act(async () => { release(); });
    expect(await screen.findByText(/awaiting.*decision/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /^save draft$|^review submission$|^submit application$/i })).not.toBeInTheDocument();
    expect(applications.records[0]).toMatchObject({ status: "submitted", revision: 2, frozenSubmittedContentRevision: 1, content });
    expect(document.body).toHaveTextContent(content.description);
    expect(document.body).toHaveTextContent(content.contactEmail);
    expect(document.body).toHaveTextContent(/(?:frozen|submitted).*revision\s*:?\s*1/i);
    expect(document.querySelector('time[datetime="2026-10-21T01:00:00Z"]') || screen.queryByText(/2026-10-21|21.*Oct|Oct.*21|21\/10\/2026/i)).toBeTruthy();
    expectCredentialedWrites();
  });

  test("AC11 never submits dirty input as the saved revision", async () => {
    await business(true); fill({ description: "Unsaved private proposal" });
    const reviewButton = screen.getByRole("button", { name: /^review submission$/i });
    if (reviewButton.hasAttribute("disabled")) expect(reviewButton).toBeDisabled();
    else {
      await userEvent.setup().click(reviewButton);
      const dialog = screen.queryByRole("dialog", { name: /^confirm submission$/i });
      if (dialog) { expect(dialog).toHaveTextContent(content.description); expect(dialog).not.toHaveTextContent("Unsaved private proposal"); }
      expect(screen.queryAllByText(/save.*before.*submit|unsaved/i).length > 0 || !!dialog).toBe(true);
    }
    expect(applications.writes()).toHaveLength(0);
  });

  test("AC10 preserves unsaved input on stale edit and refreshes only by explicit recovery", async () => {
    await business(true); fill({ description: "Unsaved version" });
    applications.records[0] = draft({ revision: 2, content: { ...content, description: "Newer server version" } });
    await save();
    expect(await screen.findByText(/changed elsewhere/i)).toBeVisible();
    expect(description()).toHaveValue("Unsaved version");
    expect(applications.records[0].content.description).toBe("Newer server version");
    await userEvent.setup().click(screen.getByRole("button", { name: /^refresh saved draft$/i }));
    const warning = screen.queryByRole("dialog");
    if (warning) await userEvent.setup().click(within(warning).getByRole("button", { name: /refresh|discard/i }));
    await waitFor(() => expect(description()).toHaveValue("Newer server version"));
    expect(applications.writes()).toHaveLength(1);
  });

  test.each(["create", "edit", "submit"] as const)("AC14 reconciles a lost committed %s response without another write", async (operation) => {
    await business(operation !== "create");
    const path = operation === "create" ? "/api/v1/business/applications" : operation === "submit" ? `${applicationPath}/submit` : applicationPath;
    const method = operation === "edit" ? "PUT" : "POST";
    applications.once(path, method, { lost: true, commit: true });
    if (operation === "submit") {
      const dialog = await review(); await userEvent.setup().click(within(dialog).getByRole("button", { name: /^submit application$/i }));
    } else { fill({ description: "Saved despite lost response" }); await save(); }
    // Either explicit Check outcome or immediate read reconciliation is supported; neither may retry a write.
    await waitFor(() => expect(applications.writes()).toHaveLength(1));
    const check = screen.queryByRole("button", { name: /^check outcome$/i });
    if (check) await userEvent.setup().click(check);
    await waitFor(() => expect(applications.requests.slice(applications.requests.findIndex((request) => request.method === method && request.path === path) + 1)
      .some((request) => request.method === "GET" && (request.path === "/api/v1/business/applications" || request.path === applicationPath))).toBe(true));
    if (operation === "submit") expect(await screen.findByText(/awaiting.*decision/i)).toBeVisible();
    else await waitFor(() => expect(description()).toHaveValue("Saved despite lost response"));
    expect(applications.writes()).toHaveLength(1);
    expect(applications.records).toHaveLength(1);
  });

  test("AC14 an unresolved write cannot be labelled completed or blindly retried", async () => {
    await business(); fill();
    applications.once("/api/v1/business/applications", "POST", { lost: true });
    applications.once("/api/v1/business/applications", "GET", { status: 503 });
    await save();
    expect(await screen.findByText(/outcome not confirmed/i)).toBeVisible();
    const check = screen.queryByRole("button", { name: /^check outcome$/i });
    if (check) await userEvent.setup().click(check);
    expect(applications.writes()).toHaveLength(1);
    expect(screen.queryByText(/^completed$/i)).not.toBeInTheDocument();
    expect(description()).toHaveValue(content.description);
  });

  test("AC14/15 delayed outcome reconciliation cannot overwrite newer dirty input", async () => {
    await business(true); fill({ description: "First operation content" });
    applications.once(applicationPath, "PUT", { lost: true, commit: true });
    const release = applications.hold(applicationPath);
    await save();
    await screen.findByText(/outcome not confirmed/i);
    const check = screen.queryByRole("button", { name: /^check outcome$/i });
    if (check) await userEvent.setup().click(check);
    await waitFor(() => expect(applications.requests.filter((request) => request.path === applicationPath && request.method === "GET").length).toBeGreaterThan(1));
    fill({ description: "Newer unsaved operation content" });
    await act(async () => { release(); });
    expect(description()).toHaveValue("Newer unsaved operation content");
    expect(applications.writes()).toHaveLength(1);
    expect(applications.records[0].content.description).toBe("First operation content");
  });

  test("AC11/14 authoritative submitted conflict is reconciled as frozen, never offered another submission", async () => {
    await business(true);
    applications.records[0] = submitted();
    const dialog = await review(); await userEvent.setup().click(within(dialog).getByRole("button", { name: /^submit application$/i }));
    const check = screen.queryByRole("button", { name: /^check outcome$/i });
    if (check) await userEvent.setup().click(check);
    expect(await screen.findByText(/awaiting.*decision/i)).toBeVisible();
    expect(applications.writes()).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /^save draft$|^review submission$/i })).not.toBeInTheDocument();
  });
});

describe("F06 frontend AC12: organiser eligibility and frozen review", () => {
  test("AC12 opens a frozen application from the visible submitted list", async () => {
    applications.install("organiser"); applications.records = [submitted()];
    await renderPrototype(organiserRoute);
    await screen.findByRole("heading", { name: /^application reviews$/i });
    await userEvent.setup().click(await screen.findByRole("button", { name: /view application|open application|view submitted/i }));
    expect(await screen.findByText(content.description)).toBeVisible();
    expect(document.body).toHaveTextContent(content.contactEmail);
    expect(applications.requests.some((request) => request.path === `/api/v1/organiser/events/${E1}/applications/${A1}`)).toBe(true);
    expect(applications.writes()).toHaveLength(0);
  });
  test("AC12 grants/replays a known ID for the assigned event without directory lookup", async () => {
    applications.install("organiser", true);
    await renderPrototype(organiserRoute);
    await screen.findByRole("heading", { name: /^application reviews$/i, level: 1 });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/^business id$/i), B2);
    await user.click(screen.getByRole("button", { name: /^approve business$/i }));
    expect(await screen.findByText(/completed/i)).toBeVisible();
    expect(applications.writes()[0]).toMatchObject({ path: `/api/v1/organiser/events/${E1}/business-approvals`, method: "POST", body: { businessId: B2 } });
    const grant = applications.approvals.find((value) => value.businessId === B2);
    await user.clear(screen.getByLabelText(/^business id$/i)); await user.type(screen.getByLabelText(/^business id$/i), B2);
    await user.click(screen.getByRole("button", { name: /^approve business$/i }));
    await waitFor(() => expect(applications.writes()).toHaveLength(2));
    expect(applications.approvals.filter((value) => value.businessId === B2)).toEqual([grant]);
    expect(screen.queryByLabelText(/business name|contact email/i)).not.toBeInTheDocument();
    expect(applications.requests.some((request) => /directory|search|lookup/.test(request.path))).toBe(false);
    expectCredentialedWrites();
  });

  test("AC12 rejects invalid known IDs locally with no approval mutation", async () => {
    applications.install("organiser"); await renderPrototype(organiserRoute);
    const input = await screen.findByLabelText(/^business id$/i);
    fireEvent.change(input, { target: { value: "not-an-id" } });
    await userEvent.setup().click(screen.getByRole("button", { name: /^approve business$/i }));
    expect(input).toBeInvalid(); expect(applications.writes()).toHaveLength(0);
  });

  test("AC12 shows only submitted selected-event content as plain text, without decision controls", async () => {
    applications.install("organiser", true);
    const injected = "<img src=x onerror=alert(1)> javascript:alert('synthetic')";
    applications.records = [draft({ id: A2, content: { ...content, description: "PRIVATE-DRAFT-MARKER" } }), submitted({ content: { ...content, description: injected } })];
    await renderPrototype(`${organiserRoute}&applicationId=${A1}`);
    expect(await screen.findByText(injected)).toBeVisible();
    expect(document.body).not.toHaveTextContent("PRIVATE-DRAFT-MARKER");
    expect(document.querySelector("img[src='x']")).toBeNull();
    expect(document.querySelector("a[href^='javascript:']")).toBeNull();
    expect(screen.queryByRole("button", { name: /^accept$|^reject$|booth|AI analysis/i })).not.toBeInTheDocument();
    await choose(/^event$/i, E2);
    expect(await screen.findByText(/no results/i)).toBeVisible();
    expect(document.body).not.toHaveTextContent(injected);
    expect(applications.writes()).toHaveLength(0);
  });

  test("AC12 malformed organiser response cannot expose a draft as a submitted application", async () => {
    applications.install("organiser");
    applications.once(`/api/v1/organiser/events/${E1}/applications/${A1}`, "GET", { status: 200,
      value: draft({ content: { ...content, description: "INJECTED-PRIVATE-DRAFT" } }) });
    await renderPrototype(`${organiserRoute}&applicationId=${A1}`);
    await screen.findByRole("heading", { name: /^application reviews$/i });
    expect(await screen.findByText(/temporarily unavailable|access denied|not available|invalid.*response/i)).toBeVisible();
    expect(document.body).not.toHaveTextContent("INJECTED-PRIVATE-DRAFT");
  });
});

describe("F06 frontend AC13/15/16: scoped memory, revalidation and safe late responses", () => {
  test.each([null, "attendee", "organiser"] as const)("AC13 direct business route never exposes private data to %s", async (role) => {
    applications.install(); applications.records = [draft()]; auth.current = role ? actor(role) : null;
    await renderPrototype(savedRoute);
    await waitFor(() => expect(window.location.pathname).not.toBe("/business/applications"));
    expect(document.body).not.toHaveTextContent(content.contactEmail);
    expect(applications.writes()).toHaveLength(0);
  });

  test("AC13/15 focus revalidation conceals private content until same-scope confirmation", async () => {
    await business(true); fill({ description: "Unsaved scope-specific words" });
    const release = applications.hold("/api/v1/auth/me");
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    await waitFor(() => expect(screen.queryByDisplayValue("Unsaved scope-specific words")).not.toBeInTheDocument());
    expect(document.body).not.toHaveTextContent(content.contactEmail);
    await act(async () => { release(); });
    await screen.findByLabelText(/^description$/i);
    await waitFor(() => expect(description()).toHaveValue("Unsaved scope-specific words"));
    expect(applications.writes()).toHaveLength(0);
  });

  test("AC13/15 pageshow and failed identity revalidation keep memory concealed until authorised recovery", async () => {
    await business(true); fill({ description: "Retained only in private memory" });
    applications.once("/api/v1/auth/me", "GET", { status: 503 });
    await act(async () => { window.dispatchEvent(new Event("pageshow")); });
    expect(await screen.findByText(/temporarily unavailable|unable to open/i)).toBeVisible();
    expect(screen.queryByDisplayValue("Retained only in private memory")).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(content.contactEmail);
    await userEvent.setup().click(screen.getByRole("button", { name: /try again|retry|check access/i }));
    await screen.findByLabelText(/^description$/i);
    await waitFor(() => expect(description()).toHaveValue("Retained only in private memory"));
    expectNoPrivateStorage("Retained only in private memory", content.contactEmail);
  });

  test("AC13/15 confirmed membership loss purges private form and confirmation", async () => {
    await business(true); await review();
    auth.current = { ...actor("business"), businessMemberships: [] };
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.body).not.toHaveTextContent(content.description);
    expect(document.body).not.toHaveTextContent(content.contactEmail);
    expect(applications.writes()).toHaveLength(0);
  });

  test.each([401, 403])("AC13 a current protected%s revalidates identity and conceals revoked private input", async (status) => {
    await business(true); fill({ description: "Revoked current-scope content" });
    const previousMeCount = applications.requests.filter((request) => request.path === "/api/v1/auth/me").length;
    applications.once(applicationPath, "PUT", { status, value: problem(status, status === 401 ? "unauthenticated" : "forbidden") });
    auth.current = status === 401 ? null : { ...actor("business"), businessMemberships: [] };
    await save();
    await waitFor(() => expect(applications.requests.filter((request) => request.path === "/api/v1/auth/me").length).toBeGreaterThan(previousMeCount));
    expect(screen.queryByDisplayValue("Revoked current-scope content")).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(content.contactEmail);
    expect(applications.records[0].content.description).toBe(content.description);
  });

  test("AC15 warns before dirty SPA navigation, preserves same-scope memory and requests reload warning", async () => {
    await business(true); fill({ description: "Unsaved across same-scope navigation" });
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
    await userEvent.setup().click(screen.getByRole("link", { name: /workspace|overview/i }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/unsaved/i);
    await userEvent.setup().click(within(dialog).getByRole("button", { name: /stay|cancel/i }));
    expect(description()).toHaveValue("Unsaved across same-scope navigation");
    await userEvent.setup().click(screen.getByRole("link", { name: /workspace|overview/i }));
    const exit = await screen.findByRole("dialog");
    await userEvent.setup().click(within(exit).getByRole("button", { name: /leave|continue|keep.*memory/i }));
    await waitFor(() => expect(window.location.pathname).toBe("/business"));
    await userEvent.setup().click(screen.getByRole("link", { name: /^open applications$/i }));
    await screen.findByLabelText(/^description$/i);
    await waitFor(() => expect(description()).toHaveValue("Unsaved across same-scope navigation"));
    expect(applications.writes()).toHaveLength(0);
    expectNoPrivateStorage("Unsaved across same-scope navigation", content.contactEmail);
  });

  test("AC15 a full App remount recovers server-saved content rather than unsaved private input", async () => {
    const first = await business(true); fill({ description: "Never saved before reload" });
    first.unmount();
    await renderPrototype(savedRoute); await heading();
    await screen.findByLabelText(/^description$/i);
    await waitFor(() => expect(description()).toHaveValue(content.description));
    expect(description()).not.toHaveValue("Never saved before reload");
    expect(applications.writes()).toHaveLength(0);
  });

  test("AC13 ignores a departed-context response after A to B to A without overwriting newer input", async () => {
    applications.install("business", true); applications.records = [draft()];
    const release = applications.hold(applicationPath);
    await renderPrototype(savedRoute); await heading();
    await choose(/^business$/i, "Synthetic Second Studio");
    await screen.findByText(/no results/i);
    await choose(/^business$/i, "Synthetic Studio");
    await screen.findByLabelText(/^description$/i);
    fill({ description: "Newer A input" });
    await act(async () => { release(); });
    expect(description()).toHaveValue("Newer A input");
    expect(applications.writes()).toHaveLength(0);
  });

  test.each([
    ["foreign business", { businessId: B2 }], ["foreign event", { eventId: E2 }], ["wrong application", { id: A2 }],
    ["negative revision", { revision: -1 }], ["fractional revision", { revision: 1.5 }],
    ["missing frozen fields", { status: "submitted", frozenSubmittedContentRevision: null, submittedAt: null }],
  ] as const)("AC13/14 rejects independently invalid %s response data", async (_case, fields) => {
    applications.install();
    applications.once(applicationPath, "GET", { status: 200, value: draft({ ...fields, content: { ...content, description: "FOREIGN-PRIVATE-RESPONSE" } }) });
    await renderPrototype(savedRoute); await heading();
    expect(await screen.findByText(/temporarily unavailable|access denied|not available|invalid.*response/i)).toBeVisible();
    expect(document.body).not.toHaveTextContent("FOREIGN-PRIVATE-RESPONSE");
    expect(applications.writes()).toHaveLength(0);
  });

  test.each([401, 403])("AC13 late old-scope%s cannot clear a newer actor's authorised input", async (status) => {
    applications.install("business", true); applications.records = [draft()];
    const release = applications.hold(applicationPath, "GET", { status, value: problem(status, status === 401 ? "unauthenticated" : "forbidden") });
    await renderPrototype(savedRoute); await heading();
    // Simulate a newer, independently established session while the old scoped read is still outstanding.
    auth.current = { ...actor("business", "New Synthetic Owner"), id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" };
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    await screen.findByLabelText(/^description$/i);
    fill({ description: "New actor current private input" });
    await act(async () => { release(); });
    expect(description()).toHaveValue("New actor current private input");
    expect(window.location.pathname).toBe("/business/applications");
    expect(screen.queryByText(/sign in required|access denied/i)).not.toBeInTheDocument();
    expect(applications.writes()).toHaveLength(0);
  });

  test("AC16 supports keyboard validation, correction, saved review and confirmation", async () => {
    await business();
    const user = userEvent.setup();
    await tabTo(user, screen.getByRole("button", { name: /^save draft$/i }), 40); await user.keyboard("{Enter}");
    expect(description()).toBeInvalid();
    for (const [label, value] of [[/^description$/i, content.description], [/^requested space$/i, content.requestedSpace], [/^contact name$/i, content.contactName], [/^contact email$/i, content.contactEmail]] as const) {
      const input = screen.getByLabelText(label); await tabTo(user, input, 40); await user.type(input, value);
    }
    await tabTo(user, screen.getByRole("button", { name: /^save draft$/i }), 40); await user.keyboard("{Enter}");
    expect(await screen.findByText(/completed/i)).toBeVisible();
    await tabTo(user, screen.getByRole("button", { name: /^review submission$/i }), 40); await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: /^confirm submission$/i });
    await tabTo(user, within(dialog).getByRole("button", { name: /^submit application$/i }), 20); await user.keyboard("{Enter}");
    expect(await screen.findByText(/awaiting.*decision/i)).toBeVisible();
    expect(applications.records[0].status).toBe("submitted");
  });

  test("AC14/16 pending feedback appears immediately, adds still-in-progress at ten seconds and terminal state wins", async () => {
    await business(); fill();
    const release = applications.hold("/api/v1/business/applications", "POST");
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: /^save draft$/i }));
    await act(async () => { await vi.advanceTimersByTimeAsync(199); });
    expect(screen.queryByText(/still in progress/i)).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(screen.getByRole("status")).toHaveTextContent(/in progress/i);
    await act(async () => { await vi.advanceTimersByTimeAsync(9799); });
    expect(screen.queryByText(/still in progress/i)).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(screen.getByText(/still in progress/i)).toBeVisible();
    await act(async () => { release(); await vi.advanceTimersByTimeAsync(1); });
    expect(screen.getByText(/completed/i)).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(screen.queryByText(/still in progress/i)).not.toBeInTheDocument();
    expect(applications.writes()).toHaveLength(1);
  });
});
