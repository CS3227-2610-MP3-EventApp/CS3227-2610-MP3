import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import { AppearanceProvider } from "./Appearance";
import { ApplicationLayout } from "./applications/shared";
import { seedActor } from "../tests/fixtures/auth";
import { renderPrototype } from "../tests/helpers/renderPrototype";
import { A1, E1, applications, submitted } from "../tests/fixtures/applications";

test("organiser cards omit availability and use matching primary links", async () => {
  seedActor("organiser", "Test organiser");
  await renderPrototype("/organiser");
  expect(screen.queryByText("Available")).not.toBeInTheDocument();
  expect(screen.queryByText(/03 \/ AVAILABLE/)).not.toBeInTheDocument();
  for (const name of ["Open programme", "Review applications", "Open analysis"]) {
    expect(screen.getByRole("link", { name })).toHaveClass("MuiButton-contained");
  }
  expect(screen.getByRole("link", {name: "Review applications"})).toHaveAttribute("href", "/organiser/applications#review");
  expect(screen.getByRole("link", {name: "Open analysis"})).toHaveAttribute("href", "/organiser/applications#analysis");
});

test("application tabs retain selected application and unsaved rubric edits", async () => {
  const user = userEvent.setup();
  applications.install("organiser");
  applications.records = [submitted()];
  applications.once(`/api/v1/organiser/events/${E1}/analysis-rubric`, "GET", {status: 200, value: {eventId: E1, revision: 1, criteria: [{id: "clarity", title: "Clarity", instructions: "Assess clarity."}]}});
  applications.once(`/api/v1/organiser/events/${E1}/applications/${A1}/analyses`, "GET", {status: 200, value: {items: [], total: 0, limit: 20, offset: 0, latestJob: null}});
  await renderPrototype(`/organiser/applications?eventId=${E1}&applicationId=${A1}#analysis`);
  const edit = await screen.findByRole("button", {name: /Edit rubric/});
  expect(screen.getByRole("tab", {name: "AI Analysis"})).toHaveAttribute("aria-selected", "true");
  await user.click(edit);
  const title = screen.getByRole("textbox", {name: "Criterion 1 title"});
  await user.clear(title);
  await user.type(title, "Edited clarity");
  await user.click(screen.getByRole("tab", {name: "Application Review"}));
  expect(screen.getByRole("button", {name: "Approve application"})).toBeVisible();
  await user.click(screen.getByRole("tab", {name: "AI Analysis"}));
  expect(screen.getByRole("textbox", {name: "Criterion 1 title"})).toHaveValue("Edited clarity");
  expect(window.location.search).toContain(`applicationId=${A1}`);
  expect(applications.requests.filter((request) => request.path.endsWith("analysis-rubric"))).toHaveLength(1);
});

test("organiser application header matches programme navigation and preserves unsaved confirmation", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><AppearanceProvider><ApplicationLayout role="organiser" title="Application Reviews" dirty>Content</ApplicationLayout></AppearanceProvider></MemoryRouter>);
  const header = within(screen.getByRole("banner"));
  expect(header.getByRole("link", { name: "EventApp organiser home" })).toHaveAttribute("href", "/organiser");
  await user.click(header.getByRole("link", { name: "Workspace overview" }));
  expect(screen.getByRole("dialog", { name: "Unsaved input" })).toBeVisible();
});
