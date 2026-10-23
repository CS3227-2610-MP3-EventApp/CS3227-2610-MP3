import { expect, test } from "vitest";
import { canonicalJson } from "./Preparation";

// Regression: the API returns budget lines as {category, id, ...} while the write body is rebuilt as {id, ...},
// so an order-sensitive comparison kept a just-saved page "unsaved".
test("canonicalJson treats the same saved line in a different key order as unchanged", () => {
  const server = [{ category: "Packaging", id: "l1", description: "Kraft paper bags", quantity: 3, unitPriceMinorUnits: 123, priceBasis: "estimate", quotationBasis: null }];
  const rebuilt = [{ id: "l1", category: "Packaging", description: "Kraft paper bags", quantity: 3, unitPriceMinorUnits: 123, priceBasis: "estimate", quotationBasis: null }];
  expect(canonicalJson(rebuilt)).toBe(canonicalJson(server));
});

test("canonicalJson still detects changed values and row order", () => {
  const saved = [{ id: "t1", title: "Print price cards", status: "not_started", dueDate: null }, { id: "t2", title: "Pack cups", status: "done", dueDate: null }];
  expect(canonicalJson([{ ...saved[0], title: "Print menus" }, saved[1]])).not.toBe(canonicalJson(saved));
  expect(canonicalJson([saved[1], saved[0]])).not.toBe(canonicalJson(saved));
});
