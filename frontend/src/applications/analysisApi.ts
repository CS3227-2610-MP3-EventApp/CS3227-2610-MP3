import type { components } from "../api-schema";
import { request } from "../api";

type Schemas = components["schemas"];
export type Rubric = Schemas["AnalysisRubric"];
export type Job = Schemas["AnalysisJob"];
export type Report = Schemas["AnalysisReport"];
const eventPath = (eventId: string) => `/organiser/events/${encodeURIComponent(eventId)}`;
const applicationPath = (eventId: string, applicationId: string) => `${eventPath(eventId)}/applications/${encodeURIComponent(applicationId)}/analyses`;
export const analysisApi = {
  rubric: (eventId: string, revision?: number) => request<Rubric>(`${eventPath(eventId)}/analysis-rubric${revision === undefined ? "" : `?revision=${revision}`}`, "GET", undefined, "domain"),
  saveRubric: (eventId: string, expectedRevision: number, criteria: Rubric["criteria"]) => request<Rubric>(`${eventPath(eventId)}/analysis-rubric`, "PUT", { expectedRevision, criteria }, "domain"),
  history: (eventId: string, applicationId: string, offset = 0) => request<Schemas["AnalysisHistory"]>(`${applicationPath(eventId, applicationId)}?limit=20&offset=${offset}`, "GET", undefined, "domain"),
  start: (eventId: string, applicationId: string, body: Schemas["CreateAnalysis"]) => request<Job>(applicationPath(eventId, applicationId), "POST", body, "domain"),
  job: (id: string) => request<Job>(`/ai/jobs/${encodeURIComponent(id)}`, "GET", undefined, "domain"),
  cancel: (id: string) => request<Job>(`/ai/jobs/${encodeURIComponent(id)}/cancel`, "POST", {}, "domain"),
};
