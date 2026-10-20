import { describe, expect, test } from "vitest";
import { localTime, localTimeChoices } from "./programmeTime";

describe("event timezone wall-clock resolution", () => {
  test("round trips Singapore independently of the browser timezone", () => {
    expect(localTime("2027-01-01T01:00:00Z", "Asia/Singapore")).toBe("2027-01-01T09:00:00");
    expect(localTimeChoices("2027-01-01T09:00", "Asia/Singapore")).toEqual([{ instant: "2027-01-01T01:00:00.000Z", offset: "+08:00" }]);
  });
  test("rejects the nonexistent New York spring hour", () => {
    expect(localTimeChoices("2026-03-08T02:30", "America/New_York")).toEqual([]);
  });
  test("returns both offsets for the repeated New York autumn hour", () => {
    expect(localTimeChoices("2026-11-01T01:30", "America/New_York")).toEqual([
      { instant: "2026-11-01T05:30:00.000Z", offset: "−04:00" },
      { instant: "2026-11-01T06:30:00.000Z", offset: "−05:00" },
    ]);
  });
  test("rejects invalid calendar dates and malformed values", () => {
    for (const value of ["2026-02-30T10:00", "2026-13-01T10:00", "2026-01-01T24:00", "not a date", ""]) expect(localTimeChoices(value, "Asia/Singapore")).toEqual([]);
  });
  test("preserves Kathmandu's fractional-hour offset", () => {
    expect(localTimeChoices("2027-01-01T09:00", "Asia/Kathmandu")).toEqual([{ instant: "2027-01-01T03:15:00.000Z", offset: "+05:45" }]);
  });
});
