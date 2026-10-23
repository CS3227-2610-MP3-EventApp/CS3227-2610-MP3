import { expect, test } from "vitest";
import { displayDate } from "./displayDate";
test("dates display in the authoritative event region with24-hour time",()=>{
 expect(displayDate("2027-01-01T01:00:00Z","Asia/Singapore")).toBe("01 Jan 2027 09:00");
 expect(displayDate("2027-01-01T10:00:00Z","Asia/Singapore")).toBe("01 Jan 2027 18:00");
 expect(displayDate("2027-01-01T23:30:00Z","Asia/Singapore")).toBe("02 Jan 2027 07:30");
});
test("calendar dates do not shift and invalid timezones are safe",()=>{
 expect(displayDate("2027-01-01","America/Los_Angeles")).toBe("01 Jan 2027");
 expect(displayDate("2027-02-29","Asia/Singapore")).toBe("Date unavailable");
 expect(displayDate("bad","Asia/Singapore")).toBe("Date unavailable");
 expect(displayDate("2027-01-01T00:00:00Z","bad")).toBe("Date unavailable");
});
