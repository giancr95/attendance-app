// Business rules for attendance, time, and payroll. Centralized here so the
// payroll page, the punches page, and the reports page all agree on what
// counts as "late", "lunch", "overtime", etc.
//
// Today these are constants. When we add a /rules page, this becomes the
// place that loads them from the DB instead.
//
// IMPORTANT: All times are expressed in CR local time (UTC-6, no DST).

export const ATTENDANCE_RULES = {
  // Expected entrance time. Anyone whose first punch is at or before this
  // is on time. Anyone after `lateThreshold` is considered late.
  entranceTimeCr: { hour: 7, minute: 55 },
  lateThresholdCr: { hour: 8, minute: 0 },

  // Standard workday in hours. Used to compute "expected" payroll for
  // salaried employees and to detect overtime.
  regularHoursPerDay: 8,

  // Lunch break (subtracted from total time-in-office for worked-hours
  // calculations). Used as a fallback when the employee didn't punch
  // their lunch in/out.
  defaultLunchMinutes: 60,

  // Workdays per week (Mon-Sat in CR). Sunday is non-working.
  workdayWeekday: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false } as const,
} as const;

// Convert CR wall-clock h/m to UTC offset since midnight UTC of the same day.
// CR is UTC-6, so 8:00 CR = 14:00 UTC of the same calendar day in UTC.
function crToUtcMinutes(h: number, m: number) {
  return (h + 6) * 60 + m;
}

/**
 * Is the given punch considered late?
 *
 * The cutoff is `cutoffMinCr` (minutes-since-midnight in CR time) when a
 * per-employee override is set, otherwise the global default from
 * ATTENDANCE_RULES.lateThresholdCr.
 */
export function isLateEntrance(
  timestamp: Date,
  cutoffMinCr: number | null | undefined = null
): boolean {
  const minutesUtc = timestamp.getUTCHours() * 60 + timestamp.getUTCMinutes();
  const cutoffCrHour =
    cutoffMinCr != null
      ? Math.floor(cutoffMinCr / 60)
      : ATTENDANCE_RULES.lateThresholdCr.hour;
  const cutoffCrMin =
    cutoffMinCr != null
      ? cutoffMinCr % 60
      : ATTENDANCE_RULES.lateThresholdCr.minute;
  const cutoffUtc = crToUtcMinutes(cutoffCrHour, cutoffCrMin);
  return minutesUtc > cutoffUtc;
}

/** "08:00" → 480 (minutes since midnight). Returns null if invalid. */
export function parseLateCutoff(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number.parseInt(m[1], 10);
  const min = Number.parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** 480 → "08:00" */
export function formatLateCutoff(minutes: number | null | undefined): string {
  if (minutes == null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function isWorkingDay(date: Date): boolean {
  // Convert UTC date to CR weekday
  const crDate = new Date(date.getTime() - 6 * 60 * 60 * 1000);
  const dow = crDate.getUTCDay();
  const w = ATTENDANCE_RULES.workdayWeekday;
  return [w.sunday, w.monday, w.tuesday, w.wednesday, w.thursday, w.friday, w.saturday][dow];
}
