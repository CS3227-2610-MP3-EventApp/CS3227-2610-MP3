import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import ApplicationAnalysis from "./ApplicationAnalysis";

afterEach(() => vi.unstubAllGlobals());

test("status polling recovers from a temporary read failure without creating another analysis", async () => {
  const eventId = "22222222-2222-4222-8222-222222222222", applicationId = "66666666-6666-4666-8666-666666666666";
  const base = `/api/v1/organiser/events/${eventId}`;
  const job = { id: "job-1", eventId, applicationId, state: "pending", createdAt: "2026-10-21T00:00:00Z", updatedAt: "2026-10-21T00:00:00Z", completedAt: null, failureCode: null, providerMayHaveRun: false, report: null };
  let reads = 0, starts = 0;
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input), method = init?.method ?? "GET";
    if (url === `${base}/analysis-rubric`) return json({ eventId, revision: 1, criteria: [{ id: "clarity", title: "Clarity", instructions: "Assess supplied facts." }] });
    if (url.includes(`/applications/${applicationId}/analyses`)) {
      if (method === "POST") { starts++; return json(job); }
      return json({ items: [], total: 0, limit: 20, offset: 0, latestJob: null });
    }
    if (url === "/api/v1/ai/jobs/job-1") {
      if (++reads === 1) throw new Error("Synthetic network failure");
      return json({ ...job, state: "completed", report: {
        id: "report-1", createdAt: job.createdAt, sourceRevision: 1, rubricRevision: 1, comparisonRevisions: [], stale: false,
        payload: { findings: [{ criterionId: "clarity", status: "insufficient_evidence", explanation: "More description is needed.", evidence: [] }], duplicateFlags: [] },
      } });
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  }));
  render(<ApplicationAnalysis eventId={eventId} applicationId={applicationId} submittedRevision={1} />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Analyse application" }));
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("checkbox"));
  await user.click(within(dialog).getByRole("button", { name: "Start analysis" }));
  expect(await screen.findByText(/Job status is temporarily unavailable/)).toBeVisible();
  expect(await screen.findByText("Analysis completed", {}, { timeout: 5000 })).toBeVisible();
  expect(reads).toBe(2);
  expect(starts).toBe(1);
  expect(screen.queryByText(/Job status is temporarily unavailable/)).not.toBeInTheDocument();
});
