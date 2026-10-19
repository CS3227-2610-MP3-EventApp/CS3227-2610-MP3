import type { components } from "./api-schema";

export const roles = ["attendee", "organiser", "business"] as const;
export type Role = typeof roles[number];
export type CurrentActor = components["schemas"]["CurrentActor"];
