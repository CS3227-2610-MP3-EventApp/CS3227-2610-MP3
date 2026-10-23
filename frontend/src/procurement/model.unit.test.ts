// Developer-owned checks for the F09-US03 client contract; the independent acceptance file stays authoritative.
import { afterEach, expect, test } from "vitest";
import { clearMarkers, readMarkers, writeMarker } from "./markers";
import { loadProposals, ProposalError, sgd } from "./model";

const P = "88888888-8888-4888-8888-888888888888", ACTOR = "11111111-1111-4111-8111-111111111111", OTHER = "22222222-2222-4222-8222-222222222222";
const context = { actorId: ACTOR, businessIds: [], participationId: P };
const row = (n: number, participationId = P) => ({ proposalId: `${n.toString(16).padStart(8, "0")}-0000-4000-8000-000000000000`, participationId });

afterEach(() => { window.localStorage.clear(); });

test("money formatting is exact at the maximum line and aggregate without floating point", () => {
  expect(sgd(0n)).toBe("SGD 0.00");
  expect(sgd(5n)).toBe("SGD 0.05");
  expect(sgd(999999999999999999n)).toBe("SGD 9,999,999,999,999,999.99");
  expect(sgd(999999999999999999n * 100n)).toBe("SGD 999,999,999,999,999,999.00");
});

test("pagination keeps only current-participation rows and rechecks the first page", async () => {
  const rows = [...Array.from({ length: 100 }, (_v, i) => row(i, i % 2 ? P : OTHER)), row(100)];
  const offsets: number[] = [];
  const result = await loadProposals(context, async (offset) => { offsets.push(offset); return { items: rows.slice(offset, offset + 100), total: rows.length, limit: 100, offset }; });
  expect(offsets).toEqual([0, 100, 0]);
  expect(result).toHaveLength(51);
});

test("a persistent list shift fails closed after one restart", async () => {
  let total = 150;
  await expect(loadProposals(context, async (offset) => {
    if (offset === 0) total += 1;
    return { items: Array.from({ length: Math.min(100, total - offset) }, (_v, i) => row(offset + i)), total, limit: 100, offset };
  })).rejects.toBeInstanceOf(ProposalError);
});

test("markers hold identifiers only, are strictly parsed and are cleared by actor change or logout", () => {
  writeMarker(ACTOR, P, 3);
  expect(readMarkers(ACTOR)).toEqual({ map: new Map([[P, 3]]), broken: false });
  clearMarkers(ACTOR);
  expect(readMarkers(ACTOR).map.get(P)).toBe(3);
  clearMarkers(OTHER);
  expect(readMarkers(ACTOR).map.size).toBe(0);
  window.localStorage.setItem(`eventapp.procurement.execute.${P}`, JSON.stringify({ actorId: ACTOR, proposalId: P, proposalRevision: 1, extra: "x" }));
  expect(readMarkers(ACTOR).broken).toBe(true);
  clearMarkers(null);
  expect(window.localStorage.length).toBe(0);
});
