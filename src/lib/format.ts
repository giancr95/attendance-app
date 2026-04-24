// Small formatting helpers used across pages. Kept dependency-free so both
// server and client components can import them.

const DATE_TZ = "America/Costa_Rica";

const dateFmt = new Intl.DateTimeFormat("es-CR", {
  timeZone: DATE_TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("es-CR", {
  timeZone: DATE_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateTimeFmt = new Intl.DateTimeFormat("es-CR", {
  timeZone: DATE_TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDate(d: Date | string) {
  return dateFmt.format(new Date(d));
}

// Formatter for DAY-ONLY values (no time component semantically).
// These are stored as timestamps at UTC midnight via z.coerce.date() —
// with a CR-timezone formatter that instant lands at 18:00 the previous
// day, which is why Permit.date / Vacation.startDate etc. appeared off
// by one. Formatting in UTC sidesteps the shift. Use this whenever the
// value represents "a calendar day" rather than an instant.
const dayOnlyFmt = new Intl.DateTimeFormat("es-CR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDateOnly(d: Date | string) {
  return dayOnlyFmt.format(new Date(d));
}

export function formatTime(d: Date | string) {
  return timeFmt.format(new Date(d));
}

export function formatDateTime(d: Date | string) {
  return dateTimeFmt.format(new Date(d));
}

export function startOfTodayCR(): Date {
  // Returns a Date corresponding to 00:00 America/Costa_Rica in UTC.
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DATE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  // CR is UTC-6 (no DST). 00:00 CR == 06:00 UTC.
  return new Date(`${y}-${m}-${d}T06:00:00.000Z`);
}
