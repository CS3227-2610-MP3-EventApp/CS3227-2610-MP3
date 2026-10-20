// Resolve wall-clock input against the event zone, including both sides of DST changes.
export function localTime(instant: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}:${value("second")}`;
}

export function localTimeChoices(value: string, timezone: string): { instant: string; offset: string }[] {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return [];
  const normalized = value.length === 16 ? `${value}:00` : value;
  const wallClock = Date.parse(`${normalized}Z`);
  if (!Number.isFinite(wallClock) || new Date(wallClock).toISOString().slice(0, 19) !== normalized) return [];
  const offsets = new Set<number>();
  // Sampling around the requested date discovers both offsets for a repeated hour.
  for (let hours = -48; hours <= 48; hours += 6) {
    const sample = wallClock + hours * 3600000;
    offsets.add(Date.parse(`${localTime(new Date(sample).toISOString(), timezone)}Z`) - sample);
  }
  return [...offsets].flatMap((offset) => {
    const instant = new Date(wallClock - offset).toISOString();
    if (localTime(instant, timezone) !== normalized) return [];
    const minutes = Math.round(Math.abs(offset) / 60000);
    return [{ instant, offset: `${offset < 0 ? "−" : "+"}${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}` }];
  }).sort((a, b) => a.instant.localeCompare(b.instant));
}
