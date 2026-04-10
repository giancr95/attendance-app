// Vacation accrual.
//
// Costa Rican labor convention (and the LCDP house rule): an employee
// accrues **1 vacation day per full calendar month worked** since their
// hire date. So someone hired on 2025-04-15 has:
//
//   2025-05-15 → 1 day
//   2025-06-15 → 2 days
//   ...
//   2026-04-15 → 12 days
//
// Available days = accrued − approved-and-taken. Pending requests do not
// reduce the balance until they're approved (matches the rest of the app).

import type { Vacation } from "@/generated/prisma/client";

/** Whole calendar months between two dates, floored. Never negative. */
export function monthsBetween(start: Date, end: Date): number {
  if (end < start) return 0;
  const years = end.getUTCFullYear() - start.getUTCFullYear();
  const months = end.getUTCMonth() - start.getUTCMonth();
  let total = years * 12 + months;
  // If we haven't reached the day-of-month yet this month, the latest
  // month doesn't fully count.
  if (end.getUTCDate() < start.getUTCDate()) total -= 1;
  return Math.max(0, total);
}

export type VacationBalance = {
  accrued: number;        // total days earned since hire date
  used: number;           // approved + already-taken
  pending: number;        // pending review (does not reduce balance)
  available: number;      // accrued - used
  monthsWorked: number;
};

/**
 * Compute vacation balance from an employee's hire date and their list of
 * vacation requests. The vacations array can include all statuses; we
 * filter internally.
 */
export function vacationBalance(
  hireDate: Date | null | undefined,
  vacations: Pick<Vacation, "status" | "days">[],
  asOf: Date = new Date()
): VacationBalance {
  if (!hireDate) {
    return {
      accrued: 0,
      used: 0,
      pending: 0,
      available: 0,
      monthsWorked: 0,
    };
  }

  const monthsWorked = monthsBetween(hireDate, asOf);
  const accrued = monthsWorked; // 1 day per month
  let used = 0;
  let pending = 0;
  for (const v of vacations) {
    if (v.status === "APPROVED") used += v.days;
    else if (v.status === "PENDING") pending += v.days;
  }
  return {
    accrued,
    used,
    pending,
    available: Math.max(0, accrued - used),
    monthsWorked,
  };
}
