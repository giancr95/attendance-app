// Calendario page.
//
// Server component. Renders a month grid with events for that month,
// defaulting to the current CR month. Query string:
//   ?m=YYYY-MM   – render this month instead of "now"
//
// Admins can create/delete events; everyone can view.

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import {
  CalendarMonth,
  type CalendarEvent,
} from "@/components/calendar-month";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const metadata = {
  title: "Calendario · LCDP",
};

/** CR-local today, YYYY-MM-DD. */
function todayCrKey(): string {
  const shifted = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** CR-local YYYY-MM for the current instant. */
function thisMonthCr(): string {
  return todayCrKey().slice(0, 7);
}

/** Date at the first-of-month in CR time (UTC instant). */
function firstOfMonth(ym: string): Date {
  return new Date(`${ym}-01T00:00:00-06:00`);
}
function nextMonth(ym: string): Date {
  const [y, m] = ym.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return new Date(
    `${ny}-${nm.toString().padStart(2, "0")}-01T00:00:00-06:00`
  );
}

function isValidYM(s: string): boolean {
  return /^\d{4}-\d{2}$/.test(s);
}

/** Convert DB date to the YYYY-MM-DD key it represents.
 *
 * Prisma DATE columns are timezone-agnostic — they store a calendar date.
 * When read back, Prisma returns a Date at midnight *UTC* of that same
 * calendar day. So we just take the UTC ISO date portion; no timezone
 * shift needed. (Earlier I was shifting -6h which made every event
 * appear on the previous day.)
 */
function dbDateToKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type SearchParams = Promise<{ m?: string }>;

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const ym = sp.m && isValidYM(sp.m) ? sp.m : thisMonthCr();

  const session = await auth();
  const canEdit = session?.user?.role === "ADMIN";

  // Pull events that fall within the displayed month. We widen by ±1 day
  // to be safe against timezone edge cases.
  const start = firstOfMonth(ym);
  const end = nextMonth(ym);

  const dbEvents = await prisma.event.findMany({
    where: { date: { gte: start, lt: end } },
    include: { createdBy: { select: { name: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const events: CalendarEvent[] = dbEvents.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    dateKey: dbDateToKey(e.date),
    startTime: e.startTime,
    endTime: e.endTime,
    location: e.location,
    kind: e.kind,
    createdBy: e.createdBy ? { name: e.createdBy.name } : null,
  }));

  const todayKey = todayCrKey();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendario"
        subtitle="Eventos, reuniones y feriados programados."
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <CalendarMonth
            ym={ym}
            todayKey={todayKey}
            events={events}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
