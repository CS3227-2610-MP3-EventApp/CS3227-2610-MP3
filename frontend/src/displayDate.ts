/** Shared presentation only: authoritative ISO values remain unchanged. */
export function displayDate(value: string, timezone?: string): string {
  try {
    const calendar = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = new Date(calendar ? `${value}T12:00:00Z` : value);
    if (calendar && Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) !== value) return "Date unavailable";
    if (!Number.isFinite(date.getTime())) return "Date unavailable";
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: calendar ? "UTC" : timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone, day: "2-digit", month: "short", year: "numeric", ...(calendar ? {} : { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const }) }).formatToParts(date);
    const part = (type: string) => parts.find(p => p.type === type)?.value ?? "";
    return `${part("day")} ${part("month")} ${part("year")}${calendar ? "" : ` ${part("hour")}:${part("minute")}`}`;
  } catch { return "Date unavailable"; }
}
export const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
