import type { components } from "./api-schema";
import { request, type ItemFields, type ProgrammeItem } from "./api";

type Page<T> = {items: T[]; total: number; limit: number; offset: number};
type Schemas = components["schemas"];
export type ProgrammeChange = Schemas["Change"];
export type AnnouncementSourceFacts = Schemas["AnnouncementSourceFacts"];
export type Announcement = Schemas["Announcement"];
export type PublicationPreview = Schemas["Preview"];
export type AnnouncementJob = Schemas["AnalysisJob"];
const root = (event: string) => `/organiser/events/${encodeURIComponent(event)}`;
const announcements = (event: string) => `${root(event)}/announcements`;
export const disruptionApi = {
  change: (event: string, item: ProgrammeItem, fields: ItemFields, reason: string) => request<ProgrammeItem>(`${root(event)}/programme-items/${item.id}/changes`, "POST", {...fields, expectedRevision: item.revision, confirmed: true, reason: reason.trim() || null}, "domain"),
  cancel: (event: string, item: ProgrammeItem, reason: string) => request<ProgrammeItem>(`${root(event)}/programme-items/${item.id}/cancel`, "POST", {expectedRevision: item.revision, confirmed: true, reason: reason.trim()}, "domain"),
  history: (event: string, item: string, offset = 0) => request<Page<ProgrammeChange>>(`${root(event)}/programme-items/${item}/changes?limit=50&offset=${offset}`, "GET", undefined, "domain"),
  drafts: (event: string, offset = 0) => request<Page<Announcement>>(`${announcements(event)}?limit=50&offset=${offset}`, "GET", undefined, "domain"),
  draft: (event: string, id: string) => request<Announcement>(`${announcements(event)}/${id}`, "GET", undefined, "domain"),
  save: (event: string, changeId: string, body: string, draft: Announcement | null) => request<Announcement>(draft ? `${announcements(event)}/${draft.id}` : announcements(event), draft ? "PATCH" : "POST", draft ? {expectedRevision: draft.revision, body} : {changeId, body}, "domain"),
  preview: (event: string, draft: Announcement) => request<PublicationPreview>(`${announcements(event)}/${draft.id}/preview`, "POST", {expectedRevision: draft.revision}, "domain"),
  publish: (event: string, draft: Announcement, preview: PublicationPreview) => request<Announcement>(`${announcements(event)}/${draft.id}/publish`, "POST", {previewId: preview.previewId}, "domain"),
  generate: (event: string, changeId: string, requestId: string) => request<AnnouncementJob>(`${announcements(event)}/generate`, "POST", {changeId, requestId, syntheticDataConfirmed: true}, "domain"),
  job: (id: string) => request<AnnouncementJob>(`/ai/jobs/${id}`, "GET", undefined, "domain"),
  cancelJob: (id: string) => request<AnnouncementJob>(`/ai/jobs/${id}/cancel`, "POST", {}, "domain"),
};

export function disruptionError(error: unknown) {
  if (!(error instanceof Error)) return "The request failed. Check the latest state before retrying.";
  if ("status" in error && error.status === 409) return "Changed elsewhere, expired preview, or already published. Reload the saved state and review it before retrying.";
  if ("status" in error && error.status === 503) return "Temporarily unavailable. F02 notification integration or AI configuration may not be ready. Manual authoring remains available.";
  return error.message;
}
