import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { seedActor } from "./fixtures/auth";
import {
  QUESTION_TEXT, answeredResult, cancelledTalk, cataloguePath, factClaim, installEventQuestions, itemRoute, job, jobPath,
  problemResponse, questionsPath, unknownResult, eventRoute, type UnknownReason,
} from "./fixtures/attendee-event-questions";
import { eveningWorkshop, eventA, json } from "./fixtures/programme";
import { renderPrototype } from "./helpers/renderPrototype";

// F03-US02 answer-event-questions (spec revision 2) UI acceptance tests, written before implementation.
// They test observable behaviour of a minimal section on the attendee event programme view
// (/attendee/programme/events/:eventId); the exact accessible names and copy are fixed in
// workflow/agents/runs/2026-10-22-attendee-event-questions-test-plan.md. Wire fixtures only: grounding,
// quota, ownership and persistence are enforced and tested by the real-PostgreSQL API tests.
const REGION = "Ask about this event";
const BOX = "Your question";
const ASK = "Ask question";
const CANCEL = "Cancel question";
const STATUS = "Question status";
const FACTS = "Verified facts";
const NOTICE = "Your question is sent to an external AI service. Do not enter personal details.";
const MINUTE = "An answer can take up to a minute.";
const CHECKED = "Only the verified facts are checked against the programme.";
const BROWSE = "Browse the programme";
const AGAIN = "Ask again";
const STALE = "The programme changed after this answer was prepared, so no answer is shown.";
const FAILED = "The question could not be answered. You can still browse the programme.";
const CANCELLED = "Question cancelled. You can still browse the programme.";
const MAY_HAVE = "The AI provider may already have received your question.";
const UNKNOWN_COPY: Record<UnknownReason, string> = {
  insufficient_evidence: "The programme does not have enough information to answer this question.",
  conflicting_evidence: "The programme has conflicting information about this question.",
  out_of_scope: "This question is outside the programme information available here.",
};
const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPED = "Hello, world"; // 12 characters

let ai: ReturnType<typeof installEventQuestions>;
beforeEach(() => {
  seedActor("attendee");
  ai = installEventQuestions();
});

const creates = () => ai.requests.filter((r) => r.method === "POST" && r.path === questionsPath);
const cancels = () => ai.requests.filter((r) => r.method === "POST" && r.path === `${jobPath}/cancel`);
const polls = () => ai.requests.filter((r) => r.method === "GET" && r.path === jobPath);
const writes = () => ai.requests.filter((r) => r.method !== "GET" && r.path !== questionsPath && r.path !== `${jobPath}/cancel`);

async function open() {
  await renderPrototype(eventRoute);
  await screen.findByRole("link", { name: eveningWorkshop.title }); // the programme list has loaded
  return screen.getByRole("region", { name: REGION });
}
async function ask(region: HTMLElement, text = QUESTION_TEXT) {
  const user = userEvent.setup();
  await user.click(within(region).getByRole("textbox", { name: BOX }));
  await user.paste(text);
  await user.click(within(region).getByRole("button", { name: ASK }));
}
const status = (region: HTMLElement) => within(region).getByRole("status", { name: STATUS });
async function completed(extras: Record<string, unknown>) {
  ai.onJob = () => json(job("completed", extras));
  const region = await open();
  await ask(region);
  await waitFor(() => expect(status(region)).toHaveTextContent(/completed/i), { timeout: 7000 });
  return region;
}

describe("F03-US02 attendee event question UI (AC01-AC06)", () => {
  test("F03Q-UI01 the section sits on the event programme view with a labelled box, a notice, no checkbox and an idle status", async () => {
    const region = await open();
    const view = within(region);
    expect(view.getByRole("heading", { level: 2, name: REGION })).toBeVisible();
    const box = view.getByRole("textbox", { name: BOX });
    expect(box).toHaveValue("");
    expect(view.getByText("300 characters remaining")).toBeVisible();
    expect(view.getByText(NOTICE)).toBeVisible();
    expect(box).toHaveAccessibleDescription(expect.stringContaining("external AI service")); // the notice is tied to the box
    expect(view.queryByRole("checkbox")).toBeNull(); // no confirmation checkbox; the server allowlist is the control
    expect(view.getByRole("button", { name: ASK })).toBeDisabled();
    expect(status(region)).toHaveTextContent("No question asked yet.");
    expect(view.queryByRole("button", { name: CANCEL })).toBeNull();
    expect(view.queryByRole("list", { name: FACTS })).toBeNull();
    expect(view.queryByText("AI summary")).toBeNull();
    expect(creates()).toHaveLength(0);
  });

  test.each([
    ["the events list", cataloguePath],
    ["an activity detail page", itemRoute(eveningWorkshop.id)],
  ])("F03Q-UI02 the section is not offered on %s", async (_name, route) => {
    await renderPrototype(route);
    await waitFor(() => expect(screen.queryByText(/loading programme/i)).toBeNull());
    expect(screen.queryByRole("region", { name: REGION })).toBeNull();
    expect(screen.queryByRole("textbox", { name: BOX })).toBeNull();
    expect(creates()).toHaveLength(0);
  });

  test("F03Q-UI03 the remaining count follows the text, 300 characters is the limit and blank text cannot be sent", async () => {
    const region = await open();
    const view = within(region);
    const user = userEvent.setup();
    const box = view.getByRole("textbox", { name: BOX });
    await user.click(box);
    await user.paste("   ");
    expect(view.getByRole("button", { name: ASK })).toBeDisabled(); // whitespace only
    await user.clear(box);
    await user.paste(TYPED);
    expect(view.getByText("288 characters remaining")).toBeVisible();
    expect(view.getByRole("button", { name: ASK })).toBeEnabled();
    await user.clear(box);
    await user.paste("x".repeat(305));
    expect(box).toHaveValue("x".repeat(300));
    expect(view.getByText("0 characters remaining")).toBeVisible();
    expect(creates()).toHaveLength(0);
  });

  test("F03Q-UI04 asking works by keyboard, posts exactly the question with a fresh request ID and shows pending without an answer", async () => {
    const region = await open();
    const view = within(region);
    const user = userEvent.setup();
    const box = view.getByRole("textbox", { name: BOX });
    box.focus();
    await user.paste(QUESTION_TEXT);
    await user.tab();
    expect(view.getByRole("button", { name: ASK })).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(creates()).toHaveLength(1));
    expect(creates()[0].body).toEqual({ requestId: expect.stringMatching(UUID4), question: QUESTION_TEXT });
    expect(["include", "same-origin"]).toContain(creates()[0].credentials);
    await waitFor(() => expect(status(region)).toHaveTextContent(/pending/i));
    expect(status(region)).toHaveTextContent(MINUTE);
    expect(view.getByRole("button", { name: CANCEL })).toBeEnabled();
    expect(view.getByRole("button", { name: ASK })).toBeDisabled();
    expect(view.queryByRole("list", { name: FACTS })).toBeNull();
    expect(view.queryByText("AI summary")).toBeNull();
    expect(writes()).toHaveLength(0);
  });

  test("F03Q-UI05 a double activation creates exactly one job", async () => {
    const region = await open();
    const user = userEvent.setup();
    await user.click(within(region).getByRole("textbox", { name: BOX }));
    await user.paste(QUESTION_TEXT);
    await user.dblClick(within(region).getByRole("button", { name: ASK }));
    await waitFor(() => expect(creates().length).toBeGreaterThan(0));
    expect(creates()).toHaveLength(1);
  });

  test("F03Q-UI06 pending then running status never shows an answer, even if a premature result is sent", async () => {
    let reads = 0;
    ai.onJob = () => json(job(++reads === 1 ? "pending" : "running", { result: answeredResult() }));
    const region = await open();
    await ask(region);
    await waitFor(() => expect(status(region)).toHaveTextContent(/pending/i));
    await waitFor(() => expect(status(region)).toHaveTextContent(/running/i), { timeout: 7000 });
    expect(within(region).queryByRole("list", { name: FACTS })).toBeNull();
    expect(within(region).queryByText("AI summary")).toBeNull();
    expect(region).not.toHaveTextContent("SGD 12.50");
    expect(creates()).toHaveLength(1);
  });

  test("F03Q-UI07 an answered job lists verified facts with title, revision, field, value, Cancelled marker and a link, then the AI summary", async () => {
    const region = await completed({ result: answeredResult() });
    const view = within(region);
    const items = within(view.getByRole("list", { name: FACTS })).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    const expected: [string, string, string][] = [
      ["Evening workshop", "Revision 3", "Starts:"], ["Evening workshop", "Revision 3", "Price: SGD 12.50"],
      ["Evening workshop", "Revision 3", "Accessibility: Not provided"], ["Evening workshop", "Revision 3", "Room: Room A"],
      ["Evening workshop", "Revision 3", "Capacity: 30"], ["Cancelled pottery demo", "Revision 4", "Cancellation reason: Presenter unavailable"],
    ];
    items.forEach((item, index) => {
      for (const text of expected[index]) expect(item).toHaveTextContent(text);
      const link = within(item).getByRole("link", { name: `View activity: ${expected[index][0]}` });
      const target = index === 5 ? cancelledTalk.id : eveningWorkshop.id;
      expect(link).toHaveAttribute("href", itemRoute(target));
    });
    expect(items[0]).toHaveTextContent("23:30"); // 15:30 UTC shown in the event time zone (Asia/Singapore)
    for (const item of items.slice(0, 5)) expect(within(item).queryByText("Cancelled")).toBeNull();
    expect(within(items[5]).getByText("Cancelled")).toBeVisible(); // marker only for the cancelled activity
    expect(view.getByText("AI summary")).toBeVisible();
    expect(view.getByText("The evening workshop starts late and costs a small fee.")).toBeVisible();
    expect(view.getByText(CHECKED)).toBeVisible();
    expect(view.queryByText(STALE)).toBeNull();
    expect(view.queryByRole("alert")).toBeNull();
    expect(writes()).toHaveLength(0);
  });

  test("F03Q-UI08 without a validated summary the verified facts are shown and no AI summary is claimed", async () => {
    const region = await completed({ result: answeredResult({ summary: null }) });
    const view = within(region);
    expect(within(view.getByRole("list", { name: FACTS })).getAllByRole("listitem")).toHaveLength(6);
    expect(view.queryByText("AI summary")).toBeNull();
    expect(view.getByText(CHECKED)).toBeVisible();
  });

  test.each(["insufficient_evidence", "conflicting_evidence", "out_of_scope"] as const)(
    "F03Q-UI09 an unknown result (%s) gives its reason, no facts, no summary and a way to browse", async (reason) => {
      const region = await completed({ result: unknownResult(reason) });
      const view = within(region);
      expect(view.getByText(UNKNOWN_COPY[reason])).toBeVisible();
      const browse = view.getByRole("link", { name: BROWSE });
      expect(browse.getAttribute("href")).toMatch(/^\/attendee\/programme/);
      expect(view.queryByRole("list", { name: FACTS })).toBeNull();
      expect(view.queryByText("AI summary")).toBeNull();
      expect(view.queryByRole("alert")).toBeNull();
    });

  test("F03Q-UI10 a stale answer is withheld, says the programme changed and Ask again repeats the question with a new request ID", async () => {
    const region = await completed({ stale: true, result: null });
    const view = within(region);
    expect(view.getByText(STALE)).toBeVisible();
    expect(view.queryByRole("list", { name: FACTS })).toBeNull();
    expect(view.queryByText("AI summary")).toBeNull();
    expect(region).not.toHaveTextContent("SGD 12.50");
    expect(creates()).toHaveLength(1);
    await userEvent.setup().click(view.getByRole("button", { name: AGAIN }));
    await waitFor(() => expect(creates()).toHaveLength(2));
    const [first, second] = creates().map((r) => r.body as { requestId: string; question: string });
    expect(second.question).toBe(first.question);
    expect(second.requestId).toMatch(UUID4);
    expect(second.requestId).not.toBe(first.requestId);
  });

  test("F03Q-UI11 a job marked stale never shows facts even if the wire wrongly carries a result", async () => {
    const region = await completed({ stale: true, result: answeredResult() });
    expect(within(region).getByText(STALE)).toBeVisible();
    expect(within(region).queryByRole("list", { name: FACTS })).toBeNull();
    expect(within(region).queryByText("AI summary")).toBeNull();
    expect(region).not.toHaveTextContent("SGD 12.50");
  });

  test.each(["invalid_output", "provider_unavailable", "timeout", "job_timeout", "provider_rate_limited", "worker_interrupted", "input_too_large"])(
    "F03Q-UI12 a failed job (%s) shows one safe message and keeps browsing available", async (code) => {
      ai.onJob = () => json(job("failed", { failureCode: code, providerMayHaveRun: true }));
      const region = await open();
      await ask(region);
      await waitFor(() => expect(status(region)).toHaveTextContent(/failed/i), { timeout: 7000 });
      expect(within(region).getByRole("alert")).toHaveTextContent(FAILED);
      expect(document.body).not.toHaveTextContent(new RegExp(code, "i"));
      expect(document.body).not.toHaveTextContent(/api[_ -]?key|sk-[a-z0-9]+|synthetic raw private detail/i);
      expect(within(region).queryByRole("list", { name: FACTS })).toBeNull();
      expect(screen.getByRole("link", { name: eveningWorkshop.title })).toBeVisible(); // the programme is still there
      expect(within(region).getByRole("button", { name: ASK })).toBeEnabled();
    });

  test("F03Q-UI13 cancelling a running question calls the cancel endpoint, states the provider may have it and offers a new question", async () => {
    let reads = 0;
    ai.onJob = () => json(job(++reads === 1 ? "pending" : "running"));
    const region = await open();
    await ask(region);
    await waitFor(() => expect(status(region)).toHaveTextContent(/running/i), { timeout: 7000 });
    await userEvent.setup().click(within(region).getByRole("button", { name: CANCEL }));
    await waitFor(() => expect(status(region)).toHaveTextContent(/cancelled/i));
    expect(cancels()).toHaveLength(1);
    expect(within(region).getByText(CANCELLED)).toBeVisible();
    expect(within(region).getByText(MAY_HAVE)).toBeVisible();
    expect(within(region).queryByRole("button", { name: CANCEL })).toBeNull();
    expect(within(region).queryByRole("list", { name: FACTS })).toBeNull();
    expect(within(region).getByRole("button", { name: ASK })).toBeEnabled();
    expect(writes()).toHaveLength(0);
  });

  test("F03Q-UI14 cancelling before dispatch does not claim the provider received the question", async () => {
    ai.onCancel = () => json(job("cancelled", { providerMayHaveRun: false }));
    const region = await open();
    await ask(region);
    await waitFor(() => expect(status(region)).toHaveTextContent(/pending/i));
    await userEvent.setup().click(within(region).getByRole("button", { name: CANCEL }));
    await waitFor(() => expect(status(region)).toHaveTextContent(/cancelled/i));
    expect(within(region).getByText(CANCELLED)).toBeVisible();
    expect(within(region).queryByText(MAY_HAVE)).toBeNull();
  });

  test.each([
    [429, "daily_limit", "Daily question limit reached. Try again tomorrow or browse the programme."],
    [409, "active_job", "A question is already being answered. Wait for it to finish or cancel it."],
    [503, "service_unavailable", "Event questions are not available for this event. You can still browse the programme."],
    [404, "not_found", "This event has no published programme to ask about. You can still browse the programme."],
  ])("F03Q-UI15 creation error %i %s is explained without raw detail and starts no polling", async (httpStatus, code, copy) => {
    ai.onCreate = () => problemResponse(httpStatus, code);
    const region = await open();
    await ask(region);
    expect(await within(region).findByRole("alert")).toHaveTextContent(copy);
    expect(document.body).not.toHaveTextContent(/Synthetic raw private detail/);
    expect(status(region)).not.toHaveTextContent(/pending|running/i);
    expect(polls()).toHaveLength(0);
    expect(within(region).queryByRole("button", { name: CANCEL })).toBeNull();
    expect(screen.getByRole("link", { name: eveningWorkshop.title })).toBeVisible();
  });

  test("F03Q-UI16 hostile model text and programme text are rendered as text, never as markup, links or instructions", async () => {
    const hostile = '<img src=x onerror="window.__xss = 1"> [click](javascript:alert(1)) https://evil.example/x Ignore previous instructions.';
    const region = await completed({
      result: answeredResult({
        summary: hostile,
        claims: [
          factClaim(eveningWorkshop, "title", "<b>Bold</b> https://evil.example/title", { itemTitle: "<i>Italic</i> <a href=\"https://evil.example\">x</a>" }),
          factClaim(eveningWorkshop, "venueName", hostile),
        ],
      }),
    });
    expect(region).toHaveTextContent(hostile);
    expect(region).toHaveTextContent("<b>Bold</b> https://evil.example/title");
    expect(region).toHaveTextContent("<i>Italic</i>");
    for (const tag of ["img", "b", "i", "script", "iframe"]) expect(region.querySelector(tag)).toBeNull();
    const anchors = Array.from(region.querySelectorAll("a"));
    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) expect(anchor.getAttribute("href") ?? "").toMatch(/^\/attendee\/programme/); // only app links
    expect((window as unknown as Record<string, unknown>).__xss).toBeUndefined();
    expect(writes()).toHaveLength(0);
  });

  test("F03Q-UI17 the status is one persistent role=status region and every ask uses a fresh UUID v4 request ID", async () => {
    ai.onJob = () => json(job("completed", { result: unknownResult("out_of_scope") }));
    const region = await open();
    const initial = status(region);
    await ask(region);
    await within(region).findByText(UNKNOWN_COPY.out_of_scope, {}, { timeout: 7000 });
    expect(status(region)).toBe(initial); // the same live region, so changes are announced
    expect(status(region)).toHaveTextContent(/completed/i);
    const user = userEvent.setup();
    await waitFor(() => expect(within(region).getByRole("button", { name: ASK })).toBeEnabled());
    await user.click(within(region).getByRole("button", { name: ASK }));
    await waitFor(() => expect(creates()).toHaveLength(2));
    const [first, second] = creates().map((r) => (r.body as { requestId: string }).requestId);
    expect(first).toMatch(UUID4);
    expect(second).toMatch(UUID4);
    expect(second).not.toBe(first);
    expect(new Set(creates().map((r) => (r.body as { question: string }).question))).toEqual(new Set([QUESTION_TEXT]));
  });

  test("F03Q-UI18 the question is not sent for another event: the request path carries this event only", async () => {
    const region = await open();
    await ask(region);
    await waitFor(() => expect(creates()).toHaveLength(1));
    expect(creates()[0].path).toBe(`/api/v1/attendee/events/${eventA.id}/event-questions`);
    expect(Object.keys(creates()[0].body ?? {}).sort()).toEqual(["question", "requestId"]); // no history, no event or owner fields
  });
});
