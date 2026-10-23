// Minimal cross-tab no-retry markers for sandbox execution (review-procurement-proposals r15).
// A marker holds only actor/proposal/revision identifiers: never idempotency keys or quote content.
const PREFIX = "eventapp.procurement.execute.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface MarkerState { map: Map<string, number>; broken: boolean }
interface Marker { actorId: string; proposalId: string; proposalRevision: number }

export const isMarkerKey = (key: string | null) => key === null || key.startsWith(PREFIX);

function parse(key: string, raw: string | null): Marker | null {
  try {
    const value: unknown = JSON.parse(raw ?? "");
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (Object.keys(record).sort().join() !== "actorId,proposalId,proposalRevision") return null;
    if (typeof record.actorId !== "string" || !UUID.test(record.actorId) || typeof record.proposalId !== "string" || !UUID.test(record.proposalId)) return null;
    if (!Number.isSafeInteger(record.proposalRevision) || Number(record.proposalRevision) < 1 || key !== PREFIX + record.proposalId) return null;
    return record as unknown as Marker;
  } catch { return null; }
}

function entries() {
  const storage = window.localStorage, found: [string, string | null][] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(PREFIX)) found.push([key, storage.getItem(key)]);
  }
  return found;
}

/** Reads this actor's markers. Throws when storage is unavailable; a malformed marker marks the state broken. */
export function readMarkers(actorId: string): MarkerState {
  const map = new Map<string, number>();
  let broken = false;
  for (const [key, raw] of entries()) {
    const marker = parse(key, raw);
    if (!marker) broken = true;
    else if (marker.actorId === actorId) map.set(marker.proposalId, marker.proposalRevision);
  }
  return { map, broken };
}

export function safeReadMarkers(actorId: string): MarkerState {
  try { return readMarkers(actorId); } catch { return { map: new Map(), broken: true }; }
}

export function writeMarker(actorId: string, proposalId: string, proposalRevision: number) {
  window.localStorage.setItem(PREFIX + proposalId, JSON.stringify({ actorId, proposalId, proposalRevision }));
}

export function removeMarker(proposalId: string) {
  try { window.localStorage.removeItem(PREFIX + proposalId); } catch { /* A retained marker only keeps controls fail-closed. */ }
}

/** Logout (null) removes every marker; an actor change removes other actors' markers. Malformed markers stay fail-closed until logout. */
export function clearMarkers(keepActorId: string | null) {
  try {
    for (const [key, raw] of entries()) {
      const marker = parse(key, raw);
      if (keepActorId === null || marker && marker.actorId !== keepActorId) window.localStorage.removeItem(key);
    }
  } catch { /* Storage may be unavailable; nothing private is stored in markers. */ }
}
