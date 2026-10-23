import type { PublishedProgrammeItem } from "../programmeTypes";

export type Preferences = { revision: number; interests: string; budgetMinorUnits: number | null; currency: "SGD"; accessibilityNeeds: string; minimumGapMinutes: number };
export type Selection = { programmeItemId: string; observedProgrammeRevision: number; accessibilityConfirmed: boolean };
export type DraftItem = Selection & { currentItem: PublishedProgrammeItem; currentProgrammeRevision: number; changed: boolean };
export type Validation = { valid: boolean; totalMinorUnits: number; currency: "SGD"; issues: { code: string; itemIds: string[] }[] };
export type PlanningState = { eventId: string; stateRevision: number; preferences: Preferences; bookmarks: string[]; draft: { revision: number; preferenceRevision: number; items: DraftItem[]; validation: Validation }; acceptedVersions: { id: string; version: number; acceptedAt: string }[]; currentAcceptedVersionId: string | null };
export type AcceptedPlan = { id: string; eventId: string; version: number; draftRevision: number; preferenceRevision: number; acceptedAt: string; preferencesSnapshot: Omit<Preferences, "revision">; totalMinorUnits: number; currency: "SGD"; needsAttention: boolean; items: (Selection & { acceptedItem: PublishedProgrammeItem; currentItem: PublishedProgrammeItem | null; changed: boolean })[] };
