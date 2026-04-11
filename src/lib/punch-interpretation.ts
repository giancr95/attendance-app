// Punch interpretation rules.
//
// The ZKTeco device has buttons for "in", "out", "lunch out", "lunch in"
// etc. but in practice employees just slap their finger and don't bother
// pressing the right key. So the device's `kind` / `status` field is
// untrustworthy and we ignore it everywhere except the raw data view.
//
// Instead we interpret a day's punches in *order*:
//
//   1st  → entrance
//   2nd  → lunch out
//   3rd  → lunch in
//   last → exit
//
// If an employee only has 2 punches we treat them as entrance + exit
// (no lunch). If they have 3 we assume entrance + lunch-out + exit (and
// guess a default lunch back). Anything in between the 1st and last that
// isn't covered is ignored for hours-worked computation but kept for
// auditing.
//
// All inputs and outputs use UTC Date instances. The day grouping is
// done in CR local time (UTC-6).

import { ATTENDANCE_RULES, isLateEntrance } from "./rules";

export type RawPunch = {
  id: string;
  userId: string;
  timestamp: Date;
};

export type DailySummary = {
  dayKey: string; // YYYY-MM-DD in CR local time
  date: Date;     // 00:00 CR of that day, expressed in UTC
  entrance?: Date;
  lunchOut?: Date;
  lunchIn?: Date;
  exit?: Date;
  punchCount: number;
  workedHours: number; // exit - entrance - lunch
  isLate: boolean;
};

/** Returns the YYYY-MM-DD key for a UTC Date in CR local time. */
export function dayKeyCR(d: Date): string {
  // CR is UTC-6
  const shifted = new Date(d.getTime() - 6 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** 00:00 CR of a YYYY-MM-DD string, expressed in UTC. */
export function startOfCrDay(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00-06:00`);
}

/**
 * Group raw punches by CR-local day and run the ordinal interpretation.
 * Punches must be sorted ascending by timestamp before calling.
 *
 * `lateCutoffMinCr` lets callers override the global 08:00 threshold on a
 * per-employee basis (minutes since midnight, CR time). Pass `null`/undefined
 * to use the default from rules.ts.
 */
export function summarizeByDay(
  punches: RawPunch[],
  lateCutoffMinCr: number | null = null
): DailySummary[] {
  const sorted = [...punches].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const byDay = new Map<string, RawPunch[]>();
  for (const p of sorted) {
    const k = dayKeyCR(p.timestamp);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(p);
  }

  const out: DailySummary[] = [];
  for (const [dayKey, dayPunches] of byDay) {
    out.push(interpretDay(dayKey, dayPunches, lateCutoffMinCr));
  }
  out.sort((a, b) => a.dayKey.localeCompare(b.dayKey));
  return out;
}

function interpretDay(
  dayKey: string,
  dayPunches: RawPunch[],
  lateCutoffMinCr: number | null = null
): DailySummary {
  const sorted = dayPunches.sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  let entrance: Date | undefined;
  let lunchOut: Date | undefined;
  let lunchIn: Date | undefined;
  let exit: Date | undefined;

  if (sorted.length >= 1) entrance = sorted[0].timestamp;
  if (sorted.length >= 4) {
    lunchOut = sorted[1].timestamp;
    lunchIn = sorted[2].timestamp;
    exit = sorted[sorted.length - 1].timestamp;
  } else if (sorted.length === 3) {
    lunchOut = sorted[1].timestamp;
    exit = sorted[2].timestamp;
  } else if (sorted.length === 2) {
    exit = sorted[1].timestamp;
  }

  // Compute worked hours: from entrance to exit, minus lunch.
  let workedHours = 0;
  if (entrance && exit) {
    const totalMs = exit.getTime() - entrance.getTime();
    let lunchMs = 0;
    if (lunchOut && lunchIn) {
      lunchMs = lunchIn.getTime() - lunchOut.getTime();
    } else if (lunchOut && !lunchIn) {
      // Employee left for lunch but didn't punch back — assume default
      lunchMs = ATTENDANCE_RULES.defaultLunchMinutes * 60 * 1000;
    }
    workedHours = Math.max(0, (totalMs - lunchMs) / (1000 * 60 * 60));
  }

  return {
    dayKey,
    date: startOfCrDay(dayKey),
    entrance,
    lunchOut,
    lunchIn,
    exit,
    punchCount: sorted.length,
    workedHours,
    isLate: !!entrance && isLateEntrance(entrance, lateCutoffMinCr),
  };
}
