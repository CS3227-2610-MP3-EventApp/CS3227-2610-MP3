import type { components } from "./api-schema";

export type EventSummary = components["schemas"]["EventSummary"];
export type PublishedProgrammeItem = components["schemas"]["PublishedProgramme"];
export type ActivityType = PublishedProgrammeItem["type"];
export type ProgrammeVenue = components["schemas"]["VenueFacts"];
export type ProgrammeRoom = components["schemas"]["RoomFacts"];
export type ProgrammeProblem = components["schemas"]["ProgrammeProblem"];

/** Shared pagination fields come from the producer's generated page schema. */
export type ProgrammePage<T> = Omit<components["schemas"]["Page_EventSummary_"], "items"> & { items: T[] };
