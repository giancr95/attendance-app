// Today's marcajes view.
//
// Uses the *ordinal* punch interpretation (1st = entrance, 2nd = lunch out,
// 3rd = lunch in, last = exit) — never trusts the device's CHECK_IN /
// CHECK_OUT labels because employees don't bother pressing the right key.
import { prisma } from "@/lib/prisma";
import {
  formatDate,
  formatTime,
  formatDateTime,
  startOfTodayCR,
} from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { SyncPunchesButton } from "@/components/sync-punches-button";
import { DEPARTMENT_LABEL } from "@/lib/labels";
import { summarizeByDay } from "@/lib/punch-interpretation";
import type { Department } from "@/generated/prisma/client";

export const metadata = {
  title: "Marcajes · LCDP",
};

const DEVICE_SERIAL = "UDP3243700044";

export default async function PunchesPage() {
  const today = startOfTodayCR();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const [device, allUsers, todayPunches] = await Promise.all([
    prisma.device.findUnique({ where: { serial: DEVICE_SERIAL } }),
    // Admins don't punch a clock — exclude them from attendance views.
    prisma.user.findMany({
      where: { status: "ACTIVE", role: "EMPLOYEE" },
      select: {
        id: true,
        name: true,
        department: true,
        lateCutoffMin: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.punch.findMany({
      where: {
        timestamp: { gte: today, lt: tomorrow },
        user: { role: "EMPLOYEE" },
      },
      orderBy: { timestamp: "asc" },
      select: { id: true, userId: true, timestamp: true },
    }),
  ]);

  const punchesByUser = new Map<string, typeof todayPunches>();
  for (const p of todayPunches) {
    if (!punchesByUser.has(p.userId)) punchesByUser.set(p.userId, []);
    punchesByUser.get(p.userId)!.push(p);
  }

  type Row = {
    userId: string;
    name: string;
    department: Department;
    entrance?: Date;
    exit?: Date;
    workedHours: number;
    isLate: boolean;
    punchCount: number;
    present: boolean;
  };

  const rows: Row[] = allUsers.map((u) => {
    const summaries = summarizeByDay(
      punchesByUser.get(u.id) ?? [],
      u.lateCutoffMin ?? null
    );
    const today = summaries[0];
    return {
      userId: u.id,
      name: u.name,
      department: u.department,
      entrance: today?.entrance,
      exit: today?.exit,
      workedHours: today?.workedHours ?? 0,
      isLate: today?.isLate ?? false,
      punchCount: today?.punchCount ?? 0,
      present: !!today?.entrance,
    };
  });

  // KPIs
  const totalUsers = allUsers.length;
  const presentToday = rows.filter((r) => r.present).length;
  const presentPct =
    totalUsers > 0 ? Math.round((presentToday / totalUsers) * 100) : 0;
  const lateCount = rows.filter((r) => r.isLate).length;
  const absentCount = totalUsers - presentToday;

  const subtitle = (
    <>
      MB10-VL · 192.168.1.202 ·{" "}
      {device?.lastSyncAt ? (
        <>
          última sincronización{" "}
          <span className="font-medium text-foreground">
            {formatDateTime(device.lastSyncAt)}
          </span>
        </>
      ) : (
        "sin sincronizar"
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Marcajes"
        subtitle={subtitle}
        actions={<SyncPunchesButton />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total empleados" value={totalUsers} />
        <KpiCard
          label="Presentes hoy"
          value={presentToday}
          hint={`${presentPct}% asistencia`}
          hintTone="success"
        />
        <KpiCard
          label="Llegadas tarde"
          value={lateCount}
          hint={lateCount > 0 ? "después de 07:55" : undefined}
          hintTone="danger"
          valueTone={lateCount > 0 ? "danger" : "default"}
        />
        <KpiCard
          label="Ausentes"
          value={absentCount}
          hint={absentCount > 0 ? "sin marcaje hoy" : undefined}
          hintTone="warning"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No hay empleados activos.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="hidden md:table-cell">Depto.</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Marcajes
                  </TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const hours = !r.entrance
                    ? "—"
                    : r.exit
                    ? `${r.workedHours.toFixed(1)}h`
                    : "trabajando";
                  const status = !r.entrance ? (
                    <Badge variant="destructive">Ausente</Badge>
                  ) : r.isLate ? (
                    <Badge className="bg-amber-500 text-white">Tarde</Badge>
                  ) : (
                    <Badge className="bg-foreground text-background">
                      Presente
                    </Badge>
                  );
                  return (
                    <TableRow key={r.userId}>
                      <TableCell className="text-sm font-medium">
                        {r.name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {DEPARTMENT_LABEL[r.department]}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {r.entrance ? formatTime(r.entrance) : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {r.exit ? formatTime(r.exit) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {hours}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {r.punchCount > 0 ? r.punchCount : "—"}
                      </TableCell>
                      <TableCell className="text-right">{status}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Hoy: {formatDate(today)} · Las horas se calculan tomando la 1.ª marca
        como entrada, la 2.ª como salida a almuerzo, la 3.ª como regreso y la
        última como salida.
      </p>
    </div>
  );
}
