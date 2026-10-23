// F09-US03 procurement proposal client contract (review-procurement-proposals r15 over approve-external-actions r2).
// Every consumed server field is validated here before rendering; the server remains authoritative.
const BASE = "/api/v1/business";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const AMOUNT = /^(0|[1-9][0-9]{0,17})$/;
const DIGEST = /^[0-9a-f]{64}$/;
const STAMP = /^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/;
export const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
export const ACTIONS = ["quotation_request", "purchase_cart"] as const;
const STATES = ["open", "cancelled", "simulated", "failed", "uncertain"] as const;
const APPROVAL_STATES = ["valid", "expired", "cancelled", "consumed"] as const;
const REASONS = ["source_price_unknown", "quantity_mismatch", "arithmetic_overflow"] as const;
export type ActionType = typeof ACTIONS[number];
export type ProposalState = typeof STATES[number];
export type Reason = typeof REASONS[number];

type Rec = Record<string, unknown>;
const record = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);
export const uuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const positive = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number => Number.isSafeInteger(v) && Number(v) >= 1 && Number(v) <= max;
const stamp = (v: unknown): v is string => typeof v === "string" && STAMP.test(v) && Number.isFinite(Date.parse(v));
const text = (v: unknown, max = 4000): v is string => typeof v === "string" && !!v.trim() && Array.from(v).length <= max;
const among = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);
export const validEmail = (v: unknown): v is string => typeof v === "string" && v.length <= 254 && !/[\r\n]/.test(v) && EMAIL.test(v);
export const validRequestText = (v: string) => Array.from(v.trim()).length <= 1000;

// ---- Errors: only allowlisted code/status pairs are recognized; server prose is never kept. ----
const EXPECTED: Record<string, number> = {
  unauthenticated: 401, forbidden: 403, password_change_required: 403, not_found: 404, method_not_allowed: 405, validation_error: 422,
  revision_conflict: 409, stale_source: 409, expired: 409, cancelled: 409, execution_claimed: 409, idempotency_conflict: 409,
  quota_exceeded: 429, internal_error: 500, service_unavailable: 503,
};
export const NON_COMMITTING = new Set(["revision_conflict", "stale_source", "expired", "cancelled", "idempotency_conflict", "validation_error", "quota_exceeded", "service_unavailable"]);
export class ProposalError extends Error {
  /** status 0 means the request outcome is unknown (network failure or abort). */
  constructor(readonly status: number, readonly code: string) { super("Procurement proposal request failed."); }
}
export const indeterminate = (e: unknown) => !(e instanceof ProposalError) || !NON_COMMITTING.has(e.code);
/** Access failures clear all private state. */
export const accessFailure = (e: unknown) => e instanceof ProposalError && (e.status === 401 || e.status === 403 || e.status === 404 && e.code === "not_found");
export function errorMessage(e: unknown): string {
  const code = e instanceof ProposalError ? e.code : "";
  if (code === "unauthenticated") return "Sign in again to continue. Private proposal details were cleared from this page.";
  if (code === "forbidden" || code === "password_change_required") return "Not permitted. Private proposal details were cleared from this page.";
  if (code === "not_found") return "Unavailable. This participation's proposals could not be opened.";
  if (code === "validation_error") return "The saved selection or entered fields cannot be accepted. Check them and try again.";
  if (["revision_conflict", "stale_source", "expired", "cancelled", "execution_claimed", "idempotency_conflict"].includes(code)) return "The proposal or its supplier evidence changed. Reload and review the latest saved details before continuing.";
  if (code === "quota_exceeded") return "The service limit was reached. Try again later.";
  if (code === "service_unavailable") return "The service is temporarily unavailable. Reload before trying again.";
  return "The request could not be completed. Reload before trying again.";
}

const REQUEST_TIMEOUT_MS = 30_000;
async function call(path: string, method = "GET", body?: unknown): Promise<unknown> {
  let response: Response;
  // A hung request becomes an indeterminate (status 0) outcome instead of leaving the page busy forever.
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(path, { method, credentials: "same-origin", cache: "no-store", signal: abort.signal, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  } catch { throw new ProposalError(0, "network"); }
  finally { clearTimeout(timer); }
  if (!response.ok) {
    let code = "unknown";
    try {
      const value: unknown = await response.json();
      if (record(value) && typeof value.code === "string" && EXPECTED[value.code] === response.status) code = value.code;
    } catch { /* Non-JSON errors use the generic fixed message. */ }
    throw new ProposalError(response.status, code);
  }
  try { return await response.json(); } catch { throw new ProposalError(response.status, "invalid_response"); }
}
const id = (v: string) => { if (!uuid(v)) throw new ProposalError(0, "invalid_identifier"); return encodeURIComponent(v); };
export interface ItemInput { snapshotId: string; offerId: string; quantity: number }
export interface ProposalInput { participationId: string; actionType: ActionType; shortlistId: string; expectedShortlistRevision: number; items: ItemInput[]; recipientEmail?: string; requestText?: string }
export const proposalApi = {
  shortlist: (participationId: string) => call(`${BASE}/participations/${id(participationId)}/supplier-shortlist`),
  snapshot: (snapshotId: string) => call(`${BASE}/supplier-research/${id(snapshotId)}`),
  page: (offset: number) => call(`${BASE}/action-proposals?limit=100&offset=${offset}`),
  detail: (proposalId: string) => call(`${BASE}/action-proposals/${id(proposalId)}`),
  create: (body: ProposalInput) => call(`${BASE}/action-proposals`, "POST", body),
  revise: (proposalId: string, body: ProposalInput & { expectedProposalRevision: number }) => call(`${BASE}/action-proposals/${id(proposalId)}/revisions`, "POST", body),
  approve: (proposalId: string, proposalRevision: number) => call(`${BASE}/action-proposals/${id(proposalId)}/approvals`, "POST", { proposalRevision }),
  cancel: (proposalId: string, expectedProposalRevision: number) => call(`${BASE}/action-proposals/${id(proposalId)}/cancel`, "POST", { expectedProposalRevision }),
  execute: (approvalId: string, idempotencyKey: string) => call(`${BASE}/action-approvals/${id(approvalId)}/execute`, "POST", { idempotencyKey }),
};

// ---- Money: exact decimal-string minor units, never floating point. ----
export function sgd(minor: bigint) {
  const whole = (minor / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `SGD ${whole}.${(minor % 100n).toString().padStart(2, "0")}`;
}

// ---- Shortlist resolution through authorized snapshot reads ----
export interface Shortlist { id: string | null; participationId: string; revision: number; selectedOffers: { snapshotId: string; offerId: string }[] }
export interface Choice { snapshotId: string; offerId: string; supplierName: string; productDescription: string; quantity: number; priceKnown: boolean }
class Malformed extends Error {}
const bad = (): never => { throw new Malformed(); };

export function parseShortlist(v: unknown, participationId: string): Shortlist {
  if (!record(v) || v.participationId !== participationId || !positive(v.revision) || !(v.id === null || uuid(v.id)) || !Array.isArray(v.selectedOffers) || v.selectedOffers.length > 100) throw new ProposalError(200, "invalid_response");
  const seen = new Set<string>();
  for (const ref of v.selectedOffers) {
    if (!record(ref) || !uuid(ref.snapshotId) || !uuid(ref.offerId) || seen.has(`${ref.snapshotId}:${ref.offerId}`)) throw new ProposalError(200, "invalid_response");
    seen.add(`${ref.snapshotId}:${ref.offerId}`);
  }
  if (v.selectedOffers.length && v.id === null) throw new ProposalError(200, "invalid_response");
  return { id: v.id as string | null, participationId, revision: v.revision, selectedOffers: v.selectedOffers.map((r) => ({ snapshotId: (r as Rec).snapshotId as string, offerId: (r as Rec).offerId as string })) };
}

/** Returns only the fields needed for selection; throws if any reference cannot be matched exactly. */
export function resolveChoices(shortlist: Shortlist, snapshots: Map<string, unknown>): Choice[] {
  const parsed = new Map<string, { quantity: number; offers: Map<string, Rec> }>();
  for (const [snapshotId, value] of snapshots) {
    if (!record(value) || value.id !== snapshotId || value.participationId !== shortlist.participationId || !positive(value.revision) || !record(value.request) || !positive(value.request.quantity, 1_000_000) || !Array.isArray(value.offers)) bad();
    const offers = new Map<string, Rec>();
    for (const offer of (value as Rec).offers as unknown[]) {
      if (!record(offer) || !uuid(offer.id) || offers.has(offer.id)) bad();
      offers.set((offer as Rec).id as string, offer as Rec);
    }
    parsed.set(snapshotId, { quantity: ((value as Rec).request as Rec).quantity as number, offers });
  }
  return shortlist.selectedOffers.map(({ snapshotId, offerId }) => {
    const snapshot = parsed.get(snapshotId) ?? bad();
    const offer = snapshot.offers.get(offerId) ?? bad();
    const amount = offer.estimatedItemSubtotalMinorUnits;
    if (!text(offer.supplierName, 300) || !text(offer.productDescription) || !(amount === null || typeof amount === "string" && AMOUNT.test(amount))) bad();
    return { snapshotId, offerId, supplierName: offer.supplierName as string, productDescription: offer.productDescription as string, quantity: snapshot.quantity, priceKnown: amount !== null };
  });
}

// ---- Proposal DTO validation ----
export type Amount = { known: true; minor: bigint } | { known: false; reason: Reason };
export interface Source { sourceId: string; requestedUrl: string; finalUrl: string; retrievedAt: string }
export interface Line { snapshotId: string; offerId: string; quantity: number; productDescription: string; amount: Amount | null; sources: Source[] }
export interface Payload { supplierName: string; origin: string; lines: Line[]; amountsValid: boolean; recipientEmail: string | null; requestText: string | null }
export interface Approval { approvalId: string; proposalRevision: number; approvedAt: string; expiresAt: string; state: typeof APPROVAL_STATES[number] }
export interface Receipt { executionId: string; approvalId: string; proposalRevision: number; outcome: "simulated" | "failed" | "uncertain"; completedAt: string }
export interface Revision { proposalRevision: number; actionType: ActionType; payload: Payload; payloadDigest: string; state: ProposalState; createdAt: string; approvals: Approval[]; receipt: Receipt | null }
export type HistoryEntry = { valid: true; revision: Revision } | { valid: false; proposalRevision: number | null };
export interface Proposal { proposalId: string; proposalRevision: number; current: Revision; history: HistoryEntry[] }
export type Entry = { key: string; valid: true; proposal: Proposal } | { key: string; valid: false; proposalId: string | null; proposalRevision: number | null };
export interface Context { actorId: string; businessIds: string[]; participationId: string }

function origin(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 4096 || /[\s\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    return `https://${url.hostname.toLowerCase()}:${url.port ? Number(url.port) : 443}`;
  } catch { return null; }
}

function amount(item: Rec): Amount | null {
  if (!("estimatedItemSubtotalMinorUnits" in item) || !("estimatedCurrency" in item) || !("unknownReason" in item)) return null;
  const value = item.estimatedItemSubtotalMinorUnits, currency = item.estimatedCurrency, reason = item.unknownReason;
  if (typeof value === "string" && AMOUNT.test(value) && currency === "SGD" && reason === null) return { known: true, minor: BigInt(value) };
  if (value === null && currency === null && among(REASONS, reason)) return { known: false, reason };
  return null;
}

function parsePayload(v: unknown, actionType: ActionType): Payload {
  if (!record(v) || !record(v.seller) || !text(v.seller.supplierName, 300) || !record(v.seller.sourceOrigin)) return bad();
  const seller = v.seller.supplierName as string, so = v.seller.sourceOrigin as Rec;
  if (so.scheme !== "https" || !text(so.host, 253) || /[\s/]/.test(so.host as string) || !positive(so.port, 65535)) bad();
  const expectedOrigin = `https://${(so.host as string).toLowerCase()}:${so.port}`;
  if (!Array.isArray(v.items) || v.items.length < 1 || v.items.length > 100) bad();
  const keys = new Set<string>(), snapshots = new Set<string>();
  let amountsValid = true;
  const lines = (v.items as unknown[]).map((item): Line => {
    if (!record(item) || !uuid(item.snapshotId) || !positive(item.snapshotRevision) || !uuid(item.offerId) || !positive(item.quantity, 1_000_000) || item.supplierName !== seller || !text(item.productDescription) || !Array.isArray(item.sources) || !item.sources.length) return bad();
    const key = `${item.snapshotId}:${item.offerId}`;
    if (keys.has(key)) bad();
    keys.add(key); snapshots.add(item.snapshotId as string);
    const sources = (item.sources as unknown[]).map((s): Source => {
      if (!record(s) || !uuid(s.sourceId) || !positive(s.sourceRevision) || !stamp(s.retrievedAt) || origin(s.requestedUrl) === null || origin(s.finalUrl) !== expectedOrigin) return bad();
      return { sourceId: s.sourceId as string, requestedUrl: s.requestedUrl as string, finalUrl: s.finalUrl as string, retrievedAt: s.retrievedAt as string };
    });
    const value = amount(item);
    if (!value) amountsValid = false;
    return { snapshotId: item.snapshotId as string, offerId: item.offerId as string, quantity: item.quantity as number, productDescription: item.productDescription as string, amount: value, sources };
  });
  if (snapshots.size !== 1) bad();
  let recipientEmail: string | null = null, requestText: string | null = null;
  if (actionType === "quotation_request") {
    if (!("recipientEmail" in v) || !("requestText" in v)) bad();
    if (!(v.recipientEmail === null || validEmail(v.recipientEmail))) bad();
    if (!(v.requestText === null || typeof v.requestText === "string" && Array.from(v.requestText).length <= 1000)) bad();
    recipientEmail = v.recipientEmail as string | null; requestText = v.requestText as string | null;
  } else if ((v.recipientEmail ?? null) !== null || (v.requestText ?? null) !== null) bad();
  return { supplierName: seller, origin: expectedOrigin.replace(/:443$/, ""), lines, amountsValid, recipientEmail, requestText };
}

function parseApprovals(v: unknown, revision: number, digest: string, creatorId: string): Approval[] {
  if (!Array.isArray(v)) return bad();
  const seen = new Set<string>();
  const approvals = v.map((a): Approval => {
    if (!record(a) || !uuid(a.approvalId) || seen.has(a.approvalId) || a.proposalRevision !== revision || a.payloadDigest !== digest || a.approvedBy !== creatorId || !among(APPROVAL_STATES, a.state) || !stamp(a.approvedAt) || !stamp(a.expiresAt)) return bad();
    seen.add(a.approvalId as string);
    return { approvalId: a.approvalId as string, proposalRevision: revision, approvedAt: a.approvedAt as string, expiresAt: a.expiresAt as string, state: a.state };
  });
  for (let index = 1; index < approvals.length; index += 1) {
    const before = approvals[index - 1], after = approvals[index], delta = Date.parse(before.approvedAt) - Date.parse(after.approvedAt);
    if (delta > 0 || delta === 0 && before.approvalId > after.approvalId) bad();
  }
  return approvals;
}

/** Validates a receipt bound to a revision's approval history. Throws Malformed. */
export function parseReceipt(v: unknown, revision: number, approvals: Approval[], creatorId: string): Receipt {
  if (!record(v) || !uuid(v.executionId) || !uuid(v.approvalId) || !approvals.some((a) => a.approvalId === v.approvalId) || v.proposalRevision !== revision || v.actorId !== creatorId || !uuid(v.idempotencyKey)) return bad();
  if (!among(["simulated", "failed", "uncertain"] as const, v.outcome) || !stamp(v.startedAt) || !stamp(v.completedAt) || v.outcome === "simulated" && v.reasonCode != null) return bad();
  return { executionId: v.executionId as string, approvalId: v.approvalId as string, proposalRevision: revision, outcome: v.outcome, completedAt: v.completedAt as string };
}

function parseRevision(v: unknown, creatorId: string): Revision {
  if (!record(v) || !positive(v.proposalRevision) || !among(ACTIONS, v.actionType) || !uuid(v.shortlistId) || !positive(v.shortlistRevision) || typeof v.payloadDigest !== "string" || !DIGEST.test(v.payloadDigest) || !among(STATES, v.state) || !stamp(v.createdAt) || !stamp(v.updatedAt) || !("executionReceipt" in v)) return bad();
  const revision = v.proposalRevision as number, state = v.state as ProposalState;
  const payload = parsePayload(v.payload, v.actionType as ActionType);
  const approvals = parseApprovals(v.approvals, revision, v.payloadDigest as string, creatorId);
  const receipt = v.executionReceipt === null ? null : parseReceipt(v.executionReceipt, revision, approvals, creatorId);
  if (state === "open" && (receipt || approvals.some((a) => a.state === "consumed"))) bad();
  if (state === "cancelled" && (receipt || approvals.some((a) => a.state === "valid"))) bad();
  if (state !== "open" && state !== "cancelled" && (!receipt || receipt.outcome !== state || !approvals.some((a) => a.approvalId === receipt.approvalId && a.state === "consumed"))) bad();
  return { proposalRevision: revision, actionType: v.actionType as ActionType, payload, payloadDigest: v.payloadDigest as string, state, createdAt: v.createdAt as string, approvals, receipt };
}

function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (record(v)) return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  return JSON.stringify(v) ?? "undefined";
}

/** Classifies one ProposalView. Non-amount problems make the whole proposal invalid; amount-only problems keep it valid with amountsValid=false. */
export function parseView(raw: unknown, context: Context, fallbackKey: string): Entry {
  const proposalId = record(raw) && uuid(raw.proposalId) ? raw.proposalId : null;
  const proposalRevision = record(raw) && positive(raw.proposalRevision) ? raw.proposalRevision : null;
  const invalid: Entry = { key: proposalId ?? fallbackKey, valid: false, proposalId, proposalRevision };
  try {
    if (!record(raw) || !proposalId || !proposalRevision) return invalid;
    if (raw.creatorId !== context.actorId || !context.businessIds.includes(raw.businessId as string) || raw.participationId !== context.participationId || raw.mode !== "simulation") return invalid;
    if (!Array.isArray(raw.revisions) || !raw.revisions.length) return invalid;
    const numbers = raw.revisions.map((r) => record(r) ? r.proposalRevision : undefined);
    if (!numbers.every((n) => positive(n)) || new Set(numbers).size !== numbers.length || Math.max(...(numbers as number[])) !== proposalRevision) return invalid;
    const highest = raw.revisions.find((r) => (r as Rec).proposalRevision === proposalRevision) as Rec;
    const current = parseRevision(highest, raw.creatorId as string);
    for (const field of ["actionType", "shortlistId", "shortlistRevision", "payloadDigest", "state", "createdAt", "updatedAt"]) if (raw[field] !== highest[field]) return invalid;
    if (canonical(raw.payload) !== canonical(highest.payload) || canonical(raw.approvals) !== canonical(highest.approvals) || canonical(raw.executionReceipt) !== canonical(highest.executionReceipt)) return invalid;
    const verification = current.actionType === "quotation_request" && current.payload.recipientEmail !== null ? "unverified" : null;
    if (raw.recipientVerification !== verification) return invalid;
    const history = raw.revisions.filter((r) => r !== highest).map((r): HistoryEntry => {
      try { return { valid: true, revision: parseRevision(r, raw.creatorId as string) }; }
      catch (error) { if (error instanceof Malformed) return { valid: false, proposalRevision: (r as Rec).proposalRevision as number }; throw error; }
    }).sort((a, b) => (b.valid ? b.revision.proposalRevision : b.proposalRevision ?? 0) - (a.valid ? a.revision.proposalRevision : a.proposalRevision ?? 0));
    return { key: proposalId, valid: true, proposal: { proposalId, proposalRevision, current, history } };
  } catch (error) {
    if (error instanceof Malformed) return invalid;
    throw error;
  }
}

/** Approval used by Simulate: the latest valid approval in canonical (approvedAt, approvalId) order. */
export const usableApproval = (revision: Revision) => revision.approvals.filter((a) => a.state === "valid").at(-1) ?? null;

/** Loads every creator-wide page, retaining only rows for the validated participation; restarts once on a list shift. */
export async function loadProposals(context: Context, fetchPage = proposalApi.page): Promise<Entry[]> {
  const invalid = () => new ProposalError(200, "invalid_response");
  const check = (page: unknown, offset: number): { items: unknown[]; total: number } => {
    if (!record(page) || !Array.isArray(page.items) || !Number.isSafeInteger(page.total) || Number(page.total) < 0 || page.limit !== 100 || page.offset !== offset) throw invalid();
    if (Number(page.total) > 10000) throw invalid();
    return { items: page.items, total: Number(page.total) };
  };
  const idOf = (item: unknown) => record(item) && typeof item.proposalId === "string" ? item.proposalId : null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const ids = new Set<string>(), kept: unknown[] = [];
    let total = 0, firstIds: (string | null)[] = [], shifted = false;
    for (let pageNumber = 0; ; pageNumber += 1) {
      if (pageNumber >= 100) throw invalid();
      const offset = pageNumber * 100, page = check(await fetchPage(offset), offset);
      if (pageNumber === 0) { total = page.total; firstIds = page.items.map(idOf); }
      else if (page.total !== total) { shifted = true; break; }
      if (page.items.length !== Math.min(100, total - offset)) throw invalid();
      for (const item of page.items) {
        const itemId = idOf(item);
        if (itemId !== null && ids.has(itemId)) shifted = true;
        if (itemId !== null) ids.add(itemId);
        // Other-participation rows are discarded immediately and never retained.
        if (record(item) && item.participationId === context.participationId) kept.push(item);
      }
      if (shifted || offset + 100 >= total) break;
    }
    if (!shifted) {
      const recheck = check(await fetchPage(0), 0);
      shifted = recheck.total !== total || canonical(recheck.items.map(idOf)) !== canonical(firstIds);
    }
    if (!shifted) return kept.map((item, index) => parseView(item, context, `invalid-${index}`));
  }
  throw invalid();
}
