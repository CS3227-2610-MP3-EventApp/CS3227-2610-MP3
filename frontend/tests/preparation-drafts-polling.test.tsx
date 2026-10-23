// Developer-owned regression for automatic job status checks (outside the protected baseline).
// The fake server is a trimmed copy of the preparation-drafts acceptance fixture.
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { renderPrototype } from "./helpers/renderPrototype";
import { applications, submitted, B1, E1 } from "./fixtures/applications";

const P = "88888888-8888-4888-8888-888888888888";
const J = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const D = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const T = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const L = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const route = `/business/preparation-drafts?businessId=${B1}&eventId=${E1}&participationId=${P}`;
const base = `/api/v1/business/participations/${P}`;
const historyPath = `${base}/preparation-drafts`;
const jobPath = `/api/v1/ai/jobs/${J}`;
const time = "2026-10-22T01:00:00Z";
type Line = { description: string; quantity: number; unitPriceMinorUnits: number | null; priceBasis: string; quotationBasis: string | null };
function totals(lines: Line[]) {
  const sum = lines.reduce((n, x) => n + BigInt(x.quantity) * BigInt(x.unitPriceMinorUnits ?? 0), 0n).toString();
  const complete = lines.every(x => x.unitPriceMinorUnits !== null);
  return { currency: "SGD", lines, totalMinorUnits: complete ? sum : null, knownSubtotalMinorUnits: sum, isComplete: complete };
}
const draft = { id: D, jobId: J, participationId: P, revision: 1,
  sourceRevisions: { event: 1, setup: 2, preparation: 2 },
  sourceFacts: { event: { title: "Synthetic Autumn Fair", startsAt: "2027-01-01T01:00:00Z", endsAt: "2027-01-01T09:00:00Z", timezone: "Asia/Singapore" },
    setup: { boothLabel: "SYNTHETIC-A1", setupInstructions: "Invented setup at nine" } },
  tasks: [{ title: "AUTO-POLLED-TASK", status: "not_started", dueDate: null }],
  budget: totals([{ description: "Display stand", quantity: 1, unitPriceMinorUnits: 1500, priceBasis: "estimate", quotationBasis: null }]),
  createdAt: time, adoptedAt: null, adoptedPreparationRevision: null };

function install() {
  applications.install();
  applications.records = [submitted({ status: "accepted", revision: 3, decision: { outcome: "accepted", reason: null, decidedAt: time } })];
  const fallback = globalThis.fetch;
  let state = "none";
  const jobReads: string[] = [];
  const job = () => ({ id: J, eventId: E1, participationId: P, state, createdAt: time, updatedAt: time,
    completedAt: state === "completed" || state === "failed" ? time : null, failureCode: state === "failed" ? "provider_unavailable" : null,
    providerMayHaveRun: state !== "pending", draft: state === "completed" ? draft : null });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const path = new URL(typeof input === "object" && "url" in input ? input.url : String(input), location.origin).pathname;
    const method = init?.method ?? "GET";
    if (path === `${base}/setup`) return json({ participationId: P, eventId: E1, revision: 2, boothLabel: "SYNTHETIC-A1", setupInstructions: "Invented setup at nine", updatedAt: time });
    if (path === `${base}/preparation`) return json({ participationId: P, revision: 2, tasks: [{ id: T, title: "Manual task", status: "not_started", dueDate: null }],
      budget: { ...totals([{ description: "Manual line", quantity: 1, unitPriceMinorUnits: 0, priceBasis: "estimate", quotationBasis: null }]),
        lines: [{ id: L, description: "Manual line", quantity: 1, unitPriceMinorUnits: 0, priceBasis: "estimate", quotationBasis: null }] } });
    if (path === historyPath && method === "POST") { state = "pending"; return json(job(), 202); }
    if (path === historyPath) return json({ items: state === "completed" ? [draft] : [], total: state === "completed" ? 1 : 0, limit: 20, offset: 0, latestJob: state === "none" ? null : job() });
    if (path === jobPath) { jobReads.push(state); return json(job()); }
    return fallback(input, init);
  }));
  return { setState: (next: string) => { state = next; }, jobReads };
}

test("an active draft job is checked automatically and announces completion without pressing Refresh", async () => {
  const server = install();
  await renderPrototype(route);
  fireEvent.change(await screen.findByLabelText(/^needs$/i), { target: { value: "Two display tasks" } });
  await userEvent.setup().click(screen.getByRole("button", { name: /^generate preparation draft$/i }));
  expect(await screen.findByText(/checking automatically/i)).toBeVisible();
  expect(document.querySelector(".MuiCircularProgress-root")).not.toBeNull(); // decorative; the status text is announced
  server.setState("running");
  await vi.waitFor(() => expect(server.jobReads).toContain("running"), { timeout: 5000 });
  server.setState("completed");
  expect(await screen.findByText("Your preparation draft is ready.", {}, { timeout: 8000 })).toBeVisible();
  expect(await screen.findByDisplayValue("AUTO-POLLED-TASK")).toBeVisible();
  expect(document.querySelector(".MuiCircularProgress-root")).toBeNull();
  const reads = server.jobReads.length;
  await new Promise(resolve => setTimeout(resolve, 3500));
  expect(server.jobReads).toHaveLength(reads); // polling stops once the job is terminal
}, 30000);
