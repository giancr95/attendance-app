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

export function isLateEntrance(timestamp: Date): boolean {
  const minutes = timestamp.getUTCHours() * 60 + timestamp.getUTCMinutes();
  const cutoff = crToUtcMinutes(
    ATTENDANCE_RULES.lateThresholdCr.hour,
    ATTENDANCE_RULES.lateThresholdCr.minute
  );
  return minutes > cutoff;
}

export function isWorkingDay(date: Date): boolean {
  // Convert UTC date to CR weekday
  const crDate = new Date(date.getTime() - 6 * 60 * 60 * 1000);
  const dow = crDate.getUTCDay();
  const w = ATTENDANCE_RULES.workdayWeekday;
  return [w.sunday, w.monday, w.tuesday, w.wednesday, w.thursday, w.friday, w.saturday][dow];
}
