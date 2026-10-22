import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { seedActor } from "../tests/fixtures/auth";
import { renderPrototype } from "../tests/helpers/renderPrototype";
import { ActivityDisruptions } from "./Disruptions";
import { disruptionApi, type Announcement, type ProgrammeChange } from "./disruptionApi";
import type { EventSummary, ProgrammeItem } from "./api";

test("published activity offers explicit revision-checked cancellation with a required reason", async () => {
  seedActor("organiser");
  const originalFetch = globalThis.fetch;
  const event = {id: "22222222-2222-4222-8222-222222222222", title: "Invented event", timezone: "Asia/Singapore", startsAt: "2027-01-01T00:00:00Z", endsAt: "2027-01-02T00:00:00Z", revision: 1};
  const item = {id: "55555555-5555-4555-8555-555555555555", eventId: event.id, roomId: "room", title: "Published workshop", type: "workshop", startsAt: "2027-01-01T01:00:00Z", endsAt: "2027-01-01T02:00:00Z", capacity: 10, priceMinorUnits: 0, currency: "SGD", accessibilityDetails: null, state: "published", revision: 2, createdAt: event.startsAt, updatedAt: event.startsAt, publishedAt: event.startsAt};
  const writes: unknown[] = [];
  const response = (body: unknown) => new Response(JSON.stringify(body), {headers: {"Content-Type": "application/json"}});
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const path = String(input).split("?")[0];
    if (path.includes("/auth/")) return originalFetch(input, init);
    if (path.endsWith("/organiser/programme-events")) return response({items: [event], total: 1, limit: 50, offset: 0});
    if (path.endsWith("/cancel")) {writes.push(JSON.parse(String(init.body))); return response({...item, state: "cancelled", revision: 3, cancellationReason: "Venue unavailable"});}
    if (path.includes("/changes")) return response({items: [], total: 0, limit: 50, offset: 0});
    if (path.includes("/announcements")) return response({items: [], total: 0, limit: 50, offset: 0});
    if (path.includes("/programme-items")) return response({items: [item], total: 1, limit: 50, offset: 0});
    return response({items: [], total: 0, limit: 50, offset: 0});
  }));
  const user = userEvent.setup();
  await renderPrototype("/organiser/programme");
  await user.click(await screen.findByRole("button", {name: item.title}));
  expect(screen.getByRole("button", {name: "Edit published activity"})).toBeVisible();
  await user.click(screen.getByRole("button", {name: "Cancel activity"}));
  const dialog = within(screen.getByRole("dialog", {name: "Cancel activity?"}));
  expect(dialog.getByRole("button", {name: "Confirm cancellation"})).toBeDisabled();
  await user.type(dialog.getByRole("textbox", {name: "Cancellation reason"}), "Venue unavailable");
  await user.click(dialog.getByRole("button", {name: "Confirm cancellation"}));
  expect(writes).toEqual([{expectedRevision: 2, confirmed: true, reason: "Venue unavailable"}]);
});

test("manual announcement requires saved exact-text preview before explicit publication", async () => {
  const event: EventSummary = {id: "event", title: "Invented event", timezone: "Asia/Singapore", startsAt: "2027-01-01T00:00:00Z", endsAt: "2027-01-02T00:00:00Z", revision: 1};
  const item: ProgrammeItem = {id: "item", eventId: event.id, roomId: "room", title: "Changed workshop", type: "workshop", startsAt: "2027-01-01T01:00:00Z", endsAt: "2027-01-01T02:00:00Z", capacity: 10, priceMinorUnits: 500, currency: "SGD", accessibilityDetails: null, state: "published", revision: 3, createdAt: event.startsAt, updatedAt: event.startsAt, publishedAt: event.startsAt};
  const facts = {...item, state: "published" as const, publishedAt: event.startsAt, event, venue: {id: "venue", name: "Invented hall", address: "1 Invented Road", accessibilityDetails: null}, room: {id: "room", name: "Studio", maxCapacity: 10, accessibilityDetails: null}};
  const change: ProgrammeChange = {id: "change", eventId: event.id, itemId: item.id, fromRevision: 2, toRevision: 3, oldFacts: {...facts, title: "Original workshop", revision: 2}, newFacts: facts, changeType: "updated", reason: null, actorUserId: "actor", occurredAt: event.startsAt, recipientSnapshotStatus: "blocked_f02"};
  const draft: Announcement = {id: "draft", eventId: event.id, changeId: change.id, body: "Please review the updated workshop.", revision: 1, state: "draft", createdAt: event.startsAt, updatedAt: event.startsAt, publishedAt: null, sourceFacts: {changeId: change.id, itemId: item.id, fromRevision: 2, toRevision: 3, changeType: "updated", reason: null, oldFacts: change.oldFacts, newFacts: facts}};
  const preview = {previewId: "preview", announcementId: draft.id, revision: 1, body: draft.body, expiresAt: new Date(Date.now() + 900000).toISOString()};
  vi.spyOn(disruptionApi, "history").mockResolvedValue({items: [change], total: 51, limit: 50, offset: 0});
  vi.spyOn(disruptionApi, "drafts").mockResolvedValue({items: [], total: 0, limit: 50, offset: 0});
  const save = vi.spyOn(disruptionApi, "save").mockResolvedValue(draft);
  const showPreview = vi.spyOn(disruptionApi, "preview").mockResolvedValue(preview);
  const publish = vi.spyOn(disruptionApi, "publish").mockResolvedValue({...draft, state: "published", publishedAt: event.startsAt});
  render(<ActivityDisruptions event={event} item={item} blocked={false} onSaved={vi.fn()}/>);
  const user = userEvent.setup();
  const text = await screen.findByRole("textbox", {name: "Announcement text"});
  expect(screen.getByRole("button", {name: "Preview publication"})).toBeDisabled();
  await user.type(text, draft.body);
  await user.click(screen.getByRole("button", {name: "Save announcement draft"}));
  await waitFor(() => expect(save).toHaveBeenCalledWith(event.id, change.id, draft.body, null));
  await user.click(screen.getByRole("button", {name: "Preview publication"}));
  const dialog = within(await screen.findByRole("dialog", {name: "Approve announcement publication?"}));
  expect(dialog.getByText(draft.body)).toBeVisible();
  expect(showPreview).toHaveBeenCalledWith(event.id, draft);
  expect(publish).not.toHaveBeenCalled();
  await user.click(dialog.getByRole("button", {name: "Approve and publish"}));
  await screen.findByText("Announcement published");
  expect(publish).toHaveBeenCalledWith(event.id, draft, preview);
  expect(text).toBeDisabled();
});
