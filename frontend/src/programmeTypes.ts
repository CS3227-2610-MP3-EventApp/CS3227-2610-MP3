/**
 * Interim frontend types for the attendee read proposal in
 * specs/programme/create-and-publish-programme.md (revision 7).
 * These are consumer types, not generated OpenAPI schema or producer agreement.
 */
export type ActivityType = "talk" | "workshop" | "booth" | "performance" | "other";

export interface EventSummary {
  id: string;
  title: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  revision: number;
}

export interface ProgrammeVenue {
  id: string;
  name: string;
  address: string;
  accessibilityDetails: string | null;
}

export interface ProgrammeRoom {
  id: string;
  name: string;
  accessibilityDetails: string | null;
  venue: ProgrammeVenue;
}

export interface PublishedProgrammeItem {
  id: string;
  eventId: string;
  eventTimezone: string;
  title: string;
  type: ActivityType;
  startsAt: string;
  endsAt: string;
  revision: number;
  state: "published";
  room: ProgrammeRoom;
  priceMinorUnits: number;
  currency: "SGD";
  capacity: number;
  accessibilityDetails: string | null;
}

export interface ProgrammePage<T> {
  items: T[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ProgrammeProblem {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  code?: string;
}
