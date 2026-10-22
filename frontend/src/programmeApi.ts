import { ApiError } from "./api";
import type { EventSummary, ProgrammePage, PublishedProgrammeItem } from "./programmeTypes";

const root = "/api/v1/attendee";
const integerMax = 2147483647;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function integer(value: unknown, minimum: number, maximum = integerMax): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function accessibility(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function instant(value: unknown): value is string {
  return typeof value === "string" && /T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && Number.isFinite(Date.parse(value));
}

function timezone(value: unknown): value is string {
  if (!text(value)) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; }
  catch { return false; }
}

function validPage<T>(value: unknown, isItem: (item: unknown) => item is T): value is ProgrammePage<T> {
  return isRecord(value) && Array.isArray(value.items) && value.items.every(isItem)
    && integer(value.limit, 1, 100) && integer(value.offset, 0)
    && integer(value.total, 0, Number.MAX_SAFE_INTEGER) && value.items.length <= value.limit;
}

function validEventFacts(value: unknown): boolean {
  return isRecord(value) && text(value.id) && text(value.title) && timezone(value.timezone)
    && instant(value.startsAt) && instant(value.endsAt);
}

function validEvent(value: unknown): value is EventSummary {
  return isRecord(value) && validEventFacts(value) && integer(value.revision, 1);
}

function validProgrammeItem(value: unknown): value is PublishedProgrammeItem {
  if (!isRecord(value) || !isRecord(value.event) || !isRecord(value.room) || !isRecord(value.venue)) return false;
  const { event, room, venue } = value;
  return text(value.id) && text(value.eventId) && validEventFacts(event) && event.id === value.eventId
    && text(value.title) && typeof value.type === "string" && ["talk", "workshop", "panel", "booth", "performance", "other"].includes(value.type)
    && instant(value.startsAt) && instant(value.endsAt) && instant(value.publishedAt) && ["published", "cancelled"].includes(String(value.state))
    && (value.state !== "cancelled" || (instant(value.cancelledAt) && text(value.cancellationReason)))
    && integer(value.revision, 1) && integer(value.priceMinorUnits, 0, Number.MAX_SAFE_INTEGER)
    && value.currency === "SGD" && integer(value.capacity, 1) && accessibility(value.accessibilityDetails)
    && text(room.id) && text(room.name) && integer(room.maxCapacity, 1) && accessibility(room.accessibilityDetails)
    && text(venue.id) && text(venue.name) && text(venue.address) && accessibility(venue.accessibilityDetails);
}

async function get<T>(path: string, signal: AbortSignal, validate: (value: unknown) => value is T): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${root}${path}`, { method: "GET", credentials: "same-origin", signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "Unable to load the programme. Please try again.");
  }
  if (!response.ok) {
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
  if (!validate(body)) throw new ApiError(0, "The programme response was incomplete. Please try again.");
  return body;
}

export const programmeApi = {
  events: (offset: number, signal: AbortSignal) => get(`/events?${new URLSearchParams({ limit: "20", offset: String(offset) })}`, signal,
    (value): value is ProgrammePage<EventSummary> => validPage(value, validEvent)),
  items: (eventId: string, filters: { q: string; type: string; date: string }, offset: number, signal: AbortSignal) => {
    const query = new URLSearchParams({ limit: "20", offset: String(offset) });
    if (filters.q.trim()) query.set("q", filters.q.trim());
    if (filters.type) query.set("type", filters.type);
    if (filters.date) query.set("date", filters.date);
    return get(`/events/${encodeURIComponent(eventId)}/programme?${query}`, signal,
      (value): value is ProgrammePage<PublishedProgrammeItem> => validPage(value,
        (item): item is PublishedProgrammeItem => validProgrammeItem(item) && item.eventId === eventId));
  },
  item: (eventId: string, itemId: string, signal: AbortSignal) => get(`/events/${encodeURIComponent(eventId)}/programme/${encodeURIComponent(itemId)}`, signal,
    (value): value is PublishedProgrammeItem => validProgrammeItem(value) && value.eventId === eventId && value.id === itemId),
};
