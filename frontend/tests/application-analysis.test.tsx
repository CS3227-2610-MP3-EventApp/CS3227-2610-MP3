import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import ApplicationAnalysis from "../src/applications/ApplicationAnalysis";
import { createAppTheme } from "../src/theme";
import { applications, content, submitted } from "./fixtures/applications";
import { renderPrototype } from "./helpers/renderPrototype";

const eventId = "22222222-2222-4222-8222-222222222222";
const applicationId = "66666666-6666-4666-8666-666666666666";
const rubricPath = `/api/v1/organiser/events/${eventId}/analysis-rubric`;
const analysesPath = `/api/v1/organiser/events/${eventId}/applications/${applicationId}/analyses`;
const jobPath = "/api/v1/ai/jobs/job-analysis-1";
const criterion = {
  id: "event-relevance",
  title: "Event relevance",
  instructions: "Assess relevance to the event.",
};
const criteria = [
  criterion,
  { id: "proposal-clarity", title: "Proposal clarity", instructions: "Assess clarity and completeness." },
  { id: "distinctiveness", title: "Distinctiveness", instructions: "Assess what makes the proposal distinct." },
];

type Rubric = { eventId: string; revision: number; criteria: typeof criterion[] };
type Job = {
  id: string;
  eventId: string;
  applicationId: string;
  state: "pending" | "running" | "completed" | "failed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  failureCode: string | null;
  providerMayHaveRun: boolean;
  report: null | {
    id: string;
    createdAt: string;
    sourceRevision: number;
    rubricRevision: number;
    comparisonRevisions: { applicationId: string; sourceRevision: number; sourceLabel: string; similarity: number }[];
    stale: boolean;
    payload: {
      findings: { criterionId: string; status: string; explanation: string; evidence: { sourceLabel: string; field: string; quote: string }[] }[];
      duplicateFlags: { sourceLabel: string; explanation: string; evidence: { sourceLabel: string; field: string; quote: string }[] }[];
    };
  };
};

const rubric = (revision = 4, criteria: typeof criterion[] = [criterion]): Rubric => ({ eventId, revision, criteria });
const job = (state: Job["state"], extras: Partial<Job> = {}): Job => ({
  id: "job-analysis-1", eventId, applicationId, state,
  createdAt: "2026-10-21T03:00:00Z", updatedAt: "2026-10-21T03:00:02Z",
  completedAt: null, failureCode: null, providerMayHaveRun: false, report: null, ...extras,
});

type Request = { url: string; method: string; body?: unknown };
type Api = {
  rubric?: Rubric;
  saveRubric?: (body: { expectedRevision: number; criteria: typeof criterion[] }) => { status?: number; body: unknown };
  createJob?: (body: Record<string, unknown>) => { status?: number; body: unknown };
  readJob?: () => Job;
  cancelJob?: () => Job;
};

function installApi(api: Api = {}) {
  const requests: Request[] = [];
  const currentRubric = api.rubric ?? rubric();
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const method = init.method ?? "GET";
    const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    requests.push({ url, method, body });
    let status = 200;
    let response: unknown;
    if (url === rubricPath && method === "GET") response = currentRubric;
    else if (url === rubricPath && method === "PUT") {
      const result = api.saveRubric?.(body);
      status = result?.status ?? 200;
      response = result?.body ?? rubric(currentRubric.revision + 1, body.criteria);
    } else if (url.startsWith(analysesPath) && method === "GET") response = { items: [], total: 0, limit: 20, offset: 0 };
    else if (url === analysesPath && method === "POST") {
      const result = api.createJob?.(body);
      status = result?.status ?? 202;
      response = result?.body ?? job("pending");
    } else if (url === jobPath && method === "GET") response = api.readJob?.() ?? job("pending");
    else if (url === `${jobPath}/cancel` && method === "POST") response = api.cancelJob?.() ?? job("cancelled", { providerMayHaveRun: true });
    else throw new Error(`Unexpected frontend request: ${method} ${url}`);
    return new Response(JSON.stringify(response), { status, headers: { "Content-Type": "application/json" } });
  }));
  return requests;
}

async function openAnalysis(mode: "light" | "dark" = "light") {
  render(<ThemeProvider theme={createAppTheme(mode)}><ApplicationAnalysis eventId={eventId} applicationId={applicationId} submittedRevision={1} /></ThemeProvider>);
  await screen.findByRole("heading", { name: /analysis|rubric/i });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("organiser application analysis acceptance", () => {
  test("AC07 saves a rubric as a new revision using the revision that was loaded", async () => {
    const requests = installApi();
    await openAnalysis();

    const instructions = await screen.findByLabelText(/instructions/i);
    fireEvent.change(instructions, { target: { value: "Assess relevance and concrete fit for the event." } });
    await userEvent.setup().click(screen.getByRole("button", { name: /save rubric/i }));

    await waitFor(() => expect(screen.getByText(/revision\s*5/i)).toBeVisible());
    const write = requests.find((request) => request.url === rubricPath && request.method === "PUT");
    expect(write?.body).toEqual({
      expectedRevision: 4,
      criteria: [{ ...criterion, instructions: "Assess relevance and concrete fit for the event." }],
    });
    expect(requests.filter((request) => request.url === rubricPath && request.method === "PUT")).toHaveLength(1);
  });

  test("AC07 a stale rubric save preserves the organiser's unsaved edit and reports the conflict", async () => {
    const requests = installApi({ saveRubric: () => ({ status: 409, body: { code: "revision_conflict", detail: "Rubric revision changed." } }) });
    await openAnalysis();
    const updated = "My unsaved rubric edit";
    const instructions = await screen.findByLabelText(/instructions/i);
    fireEvent.change(instructions, { target: { value: updated } });
    await userEvent.setup().click(screen.getByRole("button", { name: /save rubric/i }));

    expect(await screen.findByText(/changed elsewhere|revision.*changed|conflict/i)).toBeVisible();
    expect(screen.getByLabelText(/instructions/i)).toHaveValue(updated);
    expect(requests.filter((request) => request.url === rubricPath && request.method === "PUT")).toHaveLength(1);
  });

  test("AC01 and AC09 require explicit synthetic-data confirmation before creating a job", async () => {
    const requests = installApi();
    await openAnalysis();
    await userEvent.setup().click(await screen.findByRole("button", { name: /analy[sz]e application/i }));
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: /start analysis|confirm/i });
    expect(within(dialog).getByText(/synthetic|invented/i)).toBeVisible();
    expect(confirm).toBeDisabled();
    expect(requests.filter((request) => request.url === analysesPath && request.method === "POST")).toHaveLength(0);

    await userEvent.setup().click(within(dialog).getByRole("checkbox", { name: /synthetic|invented/i }));
    await userEvent.setup().click(confirm);
    await waitFor(() => expect(requests.some((request) => request.url === analysesPath && request.method === "POST")).toBe(true));
    const create = requests.find((request) => request.url === analysesPath && request.method === "POST");
    expect(create?.body).toMatchObject({
      expectedRubricRevision: 4,
      expectedSubmittedRevision: 1,
      syntheticDataConfirmed: true,
    });
    expect((create?.body as { requestId?: string }).requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test("AC01 and F10-AC01 show pending then running status and accept cancellation", async () => {
    let reads = 0;
    const requests = installApi({
      readJob: () => ++reads === 1 ? job("pending") : job("running"),
      cancelJob: () => job("cancelled", { providerMayHaveRun: true }),
    });
    await openAnalysis();
    await userEvent.setup().click(await screen.findByRole("button", { name: /analy[sz]e application/i }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.setup().click(within(dialog).getByRole("checkbox", { name: /synthetic|invented/i }));
    await userEvent.setup().click(within(dialog).getByRole("button", { name: /start analysis|confirm/i }));

    expect(await screen.findByText(/pending/i)).toBeVisible();
    expect(await screen.findByText(/running/i, {}, { timeout: 7000 })).toBeVisible();
    await userEvent.setup().click(await screen.findByRole("button", { name: /cancel analysis|cancel job/i }));
    expect(await screen.findByText(/cancelled/i)).toBeVisible();
    expect(screen.getByText(/provider.*may.*(sent|run|used)|usage.*may.*occurred/i)).toBeVisible();
    expect(requests.some((request) => request.url === `${jobPath}/cancel` && request.method === "POST")).toBe(true);
  });

  test("AC02 and AC08 show stale report provenance, exact evidence and bounded-comparison limits", async () => {
    const completed = job("completed", {
      completedAt: "2026-10-21T03:01:00Z",
      report: {
        id: "report-1", createdAt: "2026-10-21T03:01:00Z", sourceRevision: 1, rubricRevision: 3,
        comparisonRevisions: [{ applicationId: "77777777-7777-4777-8777-777777777777", sourceRevision: 7, sourceLabel: "comparison-1", similarity: 0.6 }], stale: true,
        payload: {
          findings: [
            { criterionId: criterion.id, status: "supported", explanation: "The proposal describes a relevant activity.", evidence: [{ sourceLabel: "target", field: "description", quote: "A community printmaking workshop" }] },
            { criterionId: "proposal-clarity", status: "concern", explanation: "The proposal leaves setup timing unclear.", evidence: [{ sourceLabel: "target", field: "description", quote: "A community printmaking workshop" }] },
            { criterionId: "distinctiveness", status: "insufficient_evidence", explanation: "The submitted text does not explain what makes this proposal distinct.", evidence: [] },
          ],
          duplicateFlags: [{ sourceLabel: "comparison-1", explanation: "Some wording overlaps with another submitted description; this is a review prompt only.", evidence: [{ sourceLabel: "comparison-1", field: "description", quote: "A community printmaking workshop" }] }],
        },
      },
    });
    installApi({ rubric: rubric(4, criteria), readJob: () => completed });
    await openAnalysis("dark");
    await userEvent.setup().click(await screen.findByRole("button", { name: /analy[sz]e application/i }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.setup().click(within(dialog).getByRole("checkbox", { name: /synthetic|invented/i }));
    await userEvent.setup().click(within(dialog).getByRole("button", { name: /start analysis|confirm/i }));

    expect(await screen.findByText(/stale/i)).toBeVisible();
    expect(screen.getByText(/rubric.*3|3.*rubric/i)).toBeVisible();
    expect(screen.getByText(/revision.*1|source.*1/i)).toBeVisible();
    const comparisonLabels = screen.getAllByText(/comparison-1|comparison 1/i);
    expect(comparisonLabels.length).toBeGreaterThan(0);
    comparisonLabels.forEach((element) => expect(element).toBeVisible());
    expect(screen.getByText(/revision.*7|7.*revision/i)).toBeVisible();
    const evidenceQuotes = screen.getAllByText("A community printmaking workshop");
    expect(evidenceQuotes.length).toBeGreaterThan(0);
    evidenceQuotes.forEach((element) => expect(element).toBeVisible());
    expect(screen.getByText(/supported/i)).toBeVisible();
    expect(screen.getByText(/concern/i)).toBeVisible();
    expect(screen.getByText(/insufficient evidence/i)).toBeVisible();
    expect(screen.getByText(/some wording overlaps/i)).toBeVisible();
    expect(screen.getByText(/bounded|limited comparison|up to five/i)).toBeVisible();
    expect(document.body).not.toHaveTextContent(/overall approval score/i);
    expect(document.body).not.toHaveTextContent(/duplicate.*fraud|fraud.*duplicate/i);
  });

  test("F10-AC05 exposes a safe failure and leaves manual review available", async () => {
    const failed = job("failed", { failureCode: "provider_authentication" });
    installApi({ readJob: () => failed });
    await openAnalysis();
    await userEvent.setup().click(await screen.findByRole("button", { name: /analy[sz]e application/i }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.setup().click(within(dialog).getByRole("checkbox", { name: /synthetic|invented/i }));
    await userEvent.setup().click(within(dialog).getByRole("button", { name: /start analysis|confirm/i }));

    expect(await screen.findByText(/failed|unavailable|could not/i)).toBeVisible();
    expect(screen.getByText(/manual review/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /manual review/i })).toHaveAttribute("href", `/organiser/applications?eventId=${eventId}&applicationId=${applicationId}`);
    expect(document.body).not.toHaveTextContent(/provider_authentication|api[_ -]?key|sk-[a-z0-9]+/i);
    expect(document.body).not.toHaveTextContent(/accepted|rejected/i);
  });

  test("the organiser App route renders analysis for the selected submitted application", async () => {
    applications.install("organiser");
    applications.records = [submitted()];
    const applicationFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = new URL(String(input), window.location.origin);
      if (url.pathname === rubricPath && (init.method ?? "GET") === "GET") {
        return new Response(JSON.stringify(rubric()), { headers: { "Content-Type": "application/json" } });
      }
      if (url.pathname === analysesPath && (init.method ?? "GET") === "GET") {
        return new Response(JSON.stringify({ items: [], total: 0, limit: 20, offset: 0 }), { headers: { "Content-Type": "application/json" } });
      }
      return applicationFetch(input, init);
    }));

    await renderPrototype(`/organiser/applications?eventId=${eventId}&applicationId=${applicationId}`);

    expect(await screen.findByText(content.description)).toBeVisible();
    expect(await screen.findByRole("heading", { name: /application analysis/i })).toBeVisible();
    expect(applications.records[0].decision).toBeNull();
    expect(applications.writes()).toHaveLength(0);
  });
});
