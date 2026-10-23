import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";
import { seedActor } from "../../tests/fixtures/auth";
import { QUESTION_TEXT, eventRoute, installEventQuestions, jobPath, problemResponse } from "../../tests/fixtures/attendee-event-questions";
import { eveningWorkshop } from "../../tests/fixtures/programme";
import { renderPrototype } from "../../tests/helpers/renderPrototype";

// Developer-owned check (outside the protected baseline): a failing status poll must end, not retry forever.
let ai: ReturnType<typeof installEventQuestions>;
beforeEach(() => {
  seedActor("attendee");
  ai = installEventQuestions();
});

test("a status poll that is denied or missing stops polling and says the status could not be loaded", async () => {
  ai.onJob = () => problemResponse(404, "not_found");
  await renderPrototype(eventRoute);
  await screen.findByRole("link", { name: eveningWorkshop.title });
  const region = screen.getByRole("region", { name: "Ask about this event" });
  const user = userEvent.setup();
  await user.click(within(region).getByRole("textbox", { name: "Your question" }));
  await user.paste(QUESTION_TEXT);
  await user.click(within(region).getByRole("button", { name: "Ask question" }));
  expect(await within(region).findByRole("alert", {}, { timeout: 7000 })).toHaveTextContent("The question status could not be loaded.");
  const polls = () => ai.requests.filter((request) => request.method === "GET" && request.path === jobPath).length;
  const settled = polls();
  await new Promise((resolve) => setTimeout(resolve, 2500));
  expect(polls()).toBe(settled);
  expect(within(region).queryByRole("button", { name: "Cancel question" })).toBeNull();
  await waitFor(() => expect(within(region).getByRole("button", { name: "Ask question" })).toBeEnabled());
}, 40000);
