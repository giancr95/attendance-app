import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { ReportFilters } from "@/components/report-filters";
import { ExportButton } from "@/components/export-button";
import { DEPARTMENT_LABEL } from "@/lib/labels";
import { summarizeByDay } from "@/lib/punch-interpretation";
import { ATTENDANCE_RULES } from "@/lib/rules";
import type { Department } from "@/generated/prisma/client";

export const metadata = {
  title: "Reportes · LCDP",
};

const DEVICE_SERIAL = "UDP3243700044";

// Parse a YYYY-MM-DD string in CR (UTC-6) → UTC Date.
function parseCrDate(s: string | undefined, fallback: Date): Date {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return fallback;
  return new Date(`${s}T00:00:00-06:00`);
}

type SearchParams = Promise<{ start?: string; end?: string }>;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  // Default window: last 30 days, ending today (in CR time).
  const today = new Date();
  const todayCr = new Date(
    `${new Date(today.getTime() - 6 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)}T00:00:00-06:00`
  );
  const defaultStart = new Date(todayCr.getTime() - 30 * 24 * 60 * 60 * 1000);

  const startDate = parseCrDate(sp.start, defaultStart);
  const endDate = parseCrDate(sp.end, todayCr);
  // Inclusive: punches up to end of "end day"
  const endExclusive = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);

  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  // Admins don't punch the clock — exclude them from headcount and queries.
  const [device, totalUsers, activeUsers, allUsers, punches] = await Promise.all([
    prisma.device.findUnique({ where: { serial: DEVICE_SERIAL } }),
    prisma.user.count({ where: { role: "EMPLOYEE" } }),
    prisma.user.count({ where: { status: "ACTIVE", role: "EMPLOYEE" } }),
    prisma.user.findMany({
      where: { status: "ACTIVE", role: "EMPLOYEE" },
      select: {
        id: true,
        name: true,
        department: true,
        lateCutoffMin: true,
      },
    }),
    prisma.punch.findMany({
      where: {
        timestamp: { gte: startDate, lt: endExclusive },
        user: { role: "EMPLOYEE" },
      },
      orderBy: { timestamp: "asc" },
      select: { id: true, userId: true, timestamp: true },
    }),
  ]);

  // Group punches by user, then summarize each via the ordinal helper.
  const punchesByUser = new Map<string, typeof punches>();
  for (const p of punches) {
    if (!punchesByUser.has(p.userId)) punchesByUser.set(p.userId, []);
    punchesByUser.get(p.userId)!.push(p);
  }

  let workingDays = 0;
  for (
    let day = new Date(startDate);
    day < endExclusive;
    day = new Date(day.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const dow = day.getUTCDay();
    if (dow !== 0) workingDays++;
  }

  type Row = {
    userId: string;
    name: string;
    department: Department;
    daysPresent: number;
    daysAbsent: number;
    lateCount: number;
    longLunchCount: number;
    totalHours: number;
    avgHours: number;
  };

  const rows: Row[] = allUsers.map((u) => {
    const summaries = summarizeByDay(
      punchesByUser.get(u.id) ?? [],
      u.lateCutoffMin ?? null
    );
    const daysPresent = summaries.filter((s) => !!s.entrance).length;
    const totalHours = summaries.reduce((s, d) => s + d.workedHours, 0);
    const lateCount = summaries.filter((s) => s.isLate).length;
    const longLunchCount = summaries.filter(
      (s) =>
        s.lunchMinutes != null &&
        s.lunchMinutes > ATTENDANCE_RULES.lunchThresholdMinutes
    ).length;
    return {
      userId: u.id,
      name: u.name,
      department: u.department,
      daysPresent,
      daysAbsent: Math.max(0, workingDays - daysPresent),
      lateCount,
      longLunchCount,
      totalHours: Math.round(totalHours * 10) / 10,
      avgHours:
        daysPresent > 0
          ? Math.round((totalHours / daysPresent) * 10) / 10
          : 0,
    };
  });

  rows.sort((a, b) => b.totalHours - a.totalHours);

  const totalLatePunches = rows.reduce((s, r) => s + r.lateCount, 0);
  const allHours = rows.reduce((s, r) => s + r.totalHours, 0);
  const totalDaysPresent = rows.reduce((s, r) => s + r.daysPresent, 0);
  const avgHoursPerDay =
    totalDaysPresent > 0
      ? Math.round((allHours / totalDaysPresent) * 10) / 10
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reportes de asistencia"
        actions={
          <ExportButton
            filename={`reporte_${startStr}_${endStr}.csv`}
            rows={rows.map((r) => ({
              name: r.name,
              department: DEPARTMENT_LABEL[r.department],
              daysPresent: r.daysPresent,
              daysAbsent: r.daysAbsent,
              lateCount: r.lateCount,
              longLunchCount: r.longLunchCount,
              totalHours: r.totalHours,
              avgHours: r.avgHours,
            }))}
            columns={[
              { key: "name", header: "Empleado" },
              { key: "department", header: "Departamento" },
              { key: "daysPresent", header: "Días presente" },
              { key: "daysAbsent", header: "Días ausente" },
              { key: "lateCount", header: "Tardanzas" },
              { key: "longLunchCount", header: "Almuerzos largos" },
              { key: "totalHours", header: "Horas totales" },
              { key: "avgHours", header: "Promedio horas/día" },
            ]}
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuración del reporte</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ReportFilters start={startStr} end={endStr} />
          <p className="text-xs text-muted-foreground">
            Período:{" "}
            <span className="font-medium text-foreground">
              {formatDate(startDate)}
            </span>{" "}
            –{" "}
            <span className="font-medium text-foreground">
              {formatDate(endDate)}
            </span>{" "}
            · Fuente:{" "}
            <span className="font-medium text-foreground">
              {device?.name ?? "MB10-VL"} ·{" "}
              {device?.ipAddress ?? "192.168.1.202"}
            </span>{" "}
            · {punches.length.toLocaleString("es-CR")} registros
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Total empleados" value={totalUsers} />
        <KpiCard label="Activos" value={activeUsers} valueTone="success" />
        <KpiCard
          label="Inactivos"
          value={totalUsers - activeUsers}
          valueTone={totalUsers - activeUsers > 0 ? "danger" : "default"}
        />
        <KpiCard
          label="Marcajes tarde"
          value={totalLatePunches}
          valueTone={totalLatePunches > 0 ? "warning" : "default"}
        />
        <KpiCard label="Promedio horas/día" value={avgHoursPerDay.toFixed(1)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No hay marcajes en el período seleccionado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="hidden sm:table-cell">Depto.</TableHead>
                  <TableHead>Días presente</TableHead>
                  <TableHead>Días ausente</TableHead>
                  <TableHead>Tardanzas</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Alm. largos
                  </TableHead>
                  <TableHead>Horas totales</TableHead>
                  <TableHead>Prom. h/día</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.userId}>
                    <TableCell className="text-sm font-medium">
                      {r.name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {DEPARTMENT_LABEL[r.department]}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {r.daysPresent}
                    </TableCell>
                    <TableCell
                      className={`font-mono text-sm ${
                        r.daysAbsent > workingDays / 2
                          ? "text-red-600"
                          : r.daysAbsent > 0
                          ? "text-amber-600"
                          : ""
                      }`}
                    >
                      {r.daysAbsent}
                    </TableCell>
                    <TableCell
                      className={`font-mono text-sm ${
                        r.lateCount > 0 ? "text-amber-600" : ""
                      }`}
                    >
                      {r.lateCount}
                    </TableCell>
                    <TableCell
                      className={`hidden md:table-cell font-mono text-sm ${
                        r.longLunchCount > 0
                          ? "text-red-600 dark:text-red-400"
                          : ""
                      }`}
                    >
                      {r.longLunchCount}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {r.totalHours.toFixed(1)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {r.avgHours.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Mostrando {rows.length} de {totalUsers} empleados · {workingDays} días
        laborales analizados
      </p>
    </div>
  );
}
