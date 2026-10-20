import { ApiError } from "./api";
import type { EventSummary, ProgrammePage, PublishedProgrammeItem } from "./programmeTypes";

const root = "/api/v1/programme";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validPage<T>(value: unknown, isItem: (item: unknown) => boolean): value is ProgrammePage<T> {
  return isRecord(value) && Array.isArray(value.items) && value.items.every(isItem)
    && Number.isInteger(value.limit) && Number.isInteger(value.offset) && typeof value.hasMore === "boolean";
}

function validEvent(value: unknown): value is EventSummary {
  return isRecord(value) && typeof value.id === "string" && typeof value.title === "string"
    && typeof value.timezone === "string" && typeof value.startsAt === "string" && typeof value.endsAt === "string"
    && Number.isInteger(value.revision);
}

function validProgrammeItem(value: unknown): value is PublishedProgrammeItem {
  if (!isRecord(value) || !isRecord(value.room) || !isRecord(value.room.venue)) return false;
  const venue = value.room.venue;
  const room = value.room;
  return typeof value.id === "string" && typeof value.eventId === "string" && typeof value.eventTimezone === "string"
    && typeof value.title === "string" && ["talk", "workshop", "booth", "performance", "other"].includes(String(value.type))
    && typeof value.startsAt === "string" && typeof value.endsAt === "string" && value.state === "published"
    && Number.isInteger(value.revision) && Number.isSafeInteger(value.priceMinorUnits) && Number(value.priceMinorUnits) >= 0
    && value.currency === "SGD" && Number.isInteger(value.capacity) && Number(value.capacity) > 0
    && (value.accessibilityDetails === null || typeof value.accessibilityDetails === "string")
    && typeof room.id === "string" && typeof room.name === "string"
    && (room.accessibilityDetails === null || typeof room.accessibilityDetails === "string")
    && typeof venue.id === "string" && typeof venue.name === "string" && typeof venue.address === "string"
    && (venue.accessibilityDetails === null || typeof venue.accessibilityDetails === "string");
}

async function get<T>(path: string, signal: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${root}${path}`, { method: "GET", credentials: "same-origin", signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "Unable to load the programme. Please try again.");
  }
  if (!response.ok) {
    try { await response.json(); } catch { /* Keep the safe fallback. */ }
    const messages: Record<number, string> = {
      401: "Authentication required. Please log in again.",
      403: "Access is not permitted for this account.",
      404: "This programme item is no longer available.",
      422: "The programme request is invalid. Check the filters and try again.",
      503: "The programme is temporarily unavailable. Please try again.",
    };
    throw new ApiError(response.status, messages[response.status] ?? "The programme request failed. Please try again.");
  }
  let body: unknown;
  try { body = await response.json(); }
  catch { throw new ApiError(0, "The programme response could not be read. Please try again."); }
  const route = path.split("?", 1)[0];
  const valid = route === "/events" ? validPage<EventSummary>(body, validEvent)
    : route.endsWith("/items") ? validPage<PublishedProgrammeItem>(body, validProgrammeItem)
      : validProgrammeItem(body);
  if (!valid) throw new ApiError(0, "The programme response was incomplete. Please try again.");
  return body as T;
}

export const programmeApi = {
  events: (offset: number, signal: AbortSignal) => get<ProgrammePage<EventSummary>>(`/events?${new URLSearchParams({ limit: "20", offset: String(offset) })}`, signal),
  items: (eventId: string, filters: { q: string; type: string; date: string }, offset: number, signal: AbortSignal) => {
    const query = new URLSearchParams({ limit: "20", offset: String(offset) });
    if (filters.q.trim()) query.set("q", filters.q.trim());
    if (filters.type) query.set("type", filters.type);
    if (filters.date) query.set("date", filters.date);
    return get<ProgrammePage<PublishedProgrammeItem>>(`/events/${encodeURIComponent(eventId)}/items?${query}`, signal);
  },
  item: (eventId: string, itemId: string, signal: AbortSignal) => get<PublishedProgrammeItem>(`/events/${encodeURIComponent(eventId)}/items/${encodeURIComponent(itemId)}`, signal),
};
