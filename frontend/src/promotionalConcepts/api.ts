export const factFields = ["event.title", "event.startsAt", "event.endsAt", "event.timezone", "setup.boothLabel", "setup.setupInstructions"] as const;
export type FactField = typeof factFields[number];
export type Fact = {field: FactField; value: string | null; observedRevision: number; currentRevision: number | null; status: "current" | "stale" | "unavailable"};
export type Concept = {id: string; participationId: string; revision: number; sourceRevisions: {event: number; setup: number | null}; factFields: FactField[]; sourceFacts: Fact[]; posterCopySuggestions: string[]; freebieConcepts: {name: string; description: string}[]; layoutBrief: string; createdAt: string; updatedAt: string};
export type Job = {id: string; eventId: string; participationId: string; state: "pending" | "running" | "completed" | "failed" | "cancelled"; createdAt: string; updatedAt: string; completedAt: string | null; failureCode: string | null; providerMayHaveRun: boolean; concept: Concept | null};
export type History = {items: Concept[]; total: number; limit: number; offset: number; latestJob: Job | null};
const messages: Record<string,string> = {not_found:"This private concept is unavailable.", forbidden:"Access is not permitted.", unauthenticated:"Sign in again.", password_change_required:"Change your password first.", revision_conflict:"The draft changed elsewhere. Reopen its latest version before saving.", source_changed:"Source facts changed. Reload the facts before generating or refreshing.", active_job:"An AI request is already active.", quota_exceeded:"The daily AI limit has been reached.", validation_error:"Check the brief, selected facts and draft fields.", service_unavailable:"AI generation is unavailable. Existing drafts can still be edited.", request_conflict:"This request identifier was already used for different inputs."};
export class ConceptError extends Error {constructor(readonly status: number, readonly code: string) {super(messages[code] ?? "Request could not be confirmed. Reload the saved state before trying again.");}}
export const object = (value: unknown): value is Record<string,unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value)>0;
const uuid = (value: unknown): value is string => typeof value==="string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const date = (value: unknown): value is string => typeof value === "string" && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
const text = (value: unknown, max: number, empty = false): value is string => typeof value === "string" && (empty || !!value.trim()) && Array.from(value).length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
export function parseConcept(value: unknown, participationId: string): Concept {
  if (!object(value) || !uuid(value.id) || value.participationId !== participationId || !positive(value.revision) || !object(value.sourceRevisions) || !positive(value.sourceRevisions.event) || !(value.sourceRevisions.setup===null || positive(value.sourceRevisions.setup)) || !Array.isArray(value.factFields) || value.factFields.some(f=>!factFields.includes(f)) || new Set(value.factFields).size!==value.factFields.length || !Array.isArray(value.sourceFacts) || value.sourceFacts.length!==value.factFields.length || !Array.isArray(value.posterCopySuggestions) || value.posterCopySuggestions.length>5 || value.posterCopySuggestions.some(t=>!text(t,4000)) || !Array.isArray(value.freebieConcepts) || value.freebieConcepts.length>10 || value.freebieConcepts.some(t=>!object(t)||!text(t.name,120)||!text(t.description,500)) || !text(value.layoutBrief,4000,true) || !date(value.createdAt) || !date(value.updatedAt)) throw new ConceptError(0,"invalid_response");
  const seen = new Set<string>();
  for (const f of value.sourceFacts) {
    if (!object(f) || typeof f.field!=="string" || !value.factFields.includes(f.field) || seen.has(f.field) || !positive(f.observedRevision) || !["current","stale","unavailable"].includes(String(f.status))) throw new ConceptError(0,"invalid_response");
    seen.add(f.field);
    if (f.status==="unavailable" ? f.value!==null || f.currentRevision!==null : typeof f.value!=="string" || !positive(f.currentRevision) || f.status==="current" && f.currentRevision!==f.observedRevision) throw new ConceptError(0,"invalid_response");
  }
  return value as unknown as Concept;
}
export function parseJob(value: unknown, participationId: string, eventId: string): Job {
  if (!object(value) || !uuid(value.id) || value.participationId!==participationId || value.eventId!==eventId || !["pending","running","completed","failed","cancelled"].includes(String(value.state)) || !date(value.createdAt) || !date(value.updatedAt) || !(value.completedAt===null||date(value.completedAt)) || !(value.failureCode===null||typeof value.failureCode==="string") || typeof value.providerMayHaveRun!=="boolean" || !(value.concept===null||object(value.concept)) || value.state!=="completed"&&value.concept!==null) throw new ConceptError(0,"invalid_response");
  if(value.concept!==null) parseConcept(value.concept,participationId);
  return value as unknown as Job;
}
export function parseHistory(value: unknown, participationId: string, eventId: string): History {
  if(!object(value)||!Array.isArray(value.items)||!Number.isSafeInteger(value.total)||Number(value.total)<0||!positive(value.limit)||Number(value.limit)>100||!Number.isSafeInteger(value.offset)||Number(value.offset)<0)throw new ConceptError(0,"invalid_response");
  return {items:value.items.map(v=>parseConcept(v,participationId)),total:Number(value.total),limit:value.limit,offset:Number(value.offset),latestJob:value.latestJob===null?null:parseJob(value.latestJob,participationId,eventId)};
}
async function call(path: string, method="GET", body?: unknown): Promise<unknown> {
  let response: Response;
  try { response = await fetch(path,{method,credentials:"same-origin",cache:"no-store",...(body===undefined?{}:{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})}); } catch {throw new ConceptError(0,"uncertain");}
  if(!response.ok){let code="";try{const v:unknown=await response.json();if(object(v)&&typeof v.code==="string"&&Object.hasOwn(messages,v.code))code=v.code;}catch{/* Never render arbitrary server detail. */}throw new ConceptError(response.status,code);}
  if(response.status===204)return null;
  try{return await response.json();}catch{throw new ConceptError(0,"invalid_response");}
}
const id=(value:string)=>{if(!uuid(value))throw new ConceptError(422,"validation_error");return encodeURIComponent(value);};
const collection=(p:string)=>`/api/v1/business/participations/${id(p)}/promotional-concepts`;
const detail=(c:string)=>`/api/v1/business/promotional-concepts/${id(c)}`;
export const conceptsApi = {
  history:(p:string,offset=0)=>call(`${collection(p)}?limit=20&offset=${offset}`), create:(p:string,body:unknown)=>call(collection(p),"POST",body),
  read:(c:string)=>call(detail(c)), save:(c:string,body:unknown)=>call(detail(c),"PUT",body),
  remove:(c:string,revision:number)=>call(`${detail(c)}?expectedRevision=${revision}`,"DELETE"),
  refreshFacts:(c:string,body:unknown)=>call(`${detail(c)}/refresh-facts`,"POST",body),
  job:(j:string)=>call(`/api/v1/ai/jobs/${id(j)}`), cancel:(j:string)=>call(`/api/v1/ai/jobs/${id(j)}/cancel`,"POST",{}),
  setup:(p:string)=>call(`/api/v1/business/participations/${id(p)}/setup`),
};
