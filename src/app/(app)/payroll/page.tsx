// Payroll page.
//
// For each active employee, computes:
//   - days worked in the period
//   - hours worked (using the punch-interpretation helper, NOT the device's
//     CHECK_IN/CHECK_OUT labels)
//   - regular pay = hours × hourly rate
//   - if no hourly rate but a monthly salary is set, that monthly salary is
//     used as the period total instead
//
// The period defaults to the current calendar month, picked in CR time.
// Date range is URL-driven so it's bookmarkable / shareable.

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
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { ReportFilters } from "@/components/report-filters";
import { ExportButton } from "@/components/export-button";
import { DEPARTMENT_LABEL } from "@/lib/labels";
import { summarizeByDay } from "@/lib/punch-interpretation";
import { ATTENDANCE_RULES } from "@/lib/rules";
import type { Department } from "@/generated/prisma/client";

export const metadata = {
  title: "Nómina · LCDP",
};

function parseCrDate(s: string | undefined, fallback: Date): Date {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return fallback;
  return new Date(`${s}T00:00:00-06:00`);
}

function startOfMonthCr(): Date {
  const now = new Date();
  // CR is UTC-6, so the 1st in CR is the 1st 00:00 -06:00
  const crNow = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const y = crNow.getUTCFullYear();
  const m = crNow.getUTCMonth();
  return new Date(`${y.toString().padStart(4, "0")}-${(m + 1)
    .toString()
    .padStart(2, "0")}-01T00:00:00-06:00`);
}

function endOfTodayCr(): Date {
  const now = new Date();
  const crNow = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  return new Date(
    `${crNow.toISOString().slice(0, 10)}T00:00:00-06:00`
  );
}

const CRC = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

type SearchParams = Promise<{ start?: string; end?: string }>;

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const startDate = parseCrDate(sp.start, startOfMonthCr());
  const endDate = parseCrDate(sp.end, endOfTodayCr());
  const endExclusive = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);

  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  // Admins don't earn hourly attendance pay — exclude them from payroll.
  const [users, punches, permits, vacations] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE", role: "EMPLOYEE" },
      orderBy: { name: "asc" },
    }),
    prisma.punch.findMany({
      where: {
        timestamp: { gte: startDate, lt: endExclusive },
        user: { role: "EMPLOYEE" },
      },
      orderBy: { timestamp: "asc" },
      select: { id: true, userId: true, timestamp: true },
    }),
    // Approved + paid permits that overlap the period.
    prisma.permit.findMany({
      where: {
        status: "APPROVED",
        paid: true,
        date: { gte: startDate, lt: endExclusive },
        user: { role: "EMPLOYEE" },
      },
      select: { userId: true, hours: true },
    }),
    // Approved + paid vacations that overlap the period. We count any day
    // of the vacation that falls inside [startDate, endExclusive).
    prisma.vacation.findMany({
      where: {
        status: "APPROVED",
        paid: true,
        startDate: { lt: endExclusive },
        endDate: { gte: startDate },
        user: { role: "EMPLOYEE" },
      },
      select: { userId: true, startDate: true, endDate: true },
    }),
  ]);

  // Group punches by user
  const punchesByUser = new Map<string, typeof punches>();
  for (const p of punches) {
    if (!punchesByUser.has(p.userId)) punchesByUser.set(p.userId, []);
    punchesByUser.get(p.userId)!.push(p);
  }

  // Per-user accumulators for paid-leave hours. Permit hours are added
  // directly; vacation days are converted to hours using the regular
  // 8-hour workday (only days that fall inside the selected period).
  const permitHoursByUser = new Map<string, number>();
  for (const p of permits) {
    if (p.hours == null) continue;
    permitHoursByUser.set(
      p.userId,
      (permitHoursByUser.get(p.userId) ?? 0) + Number(p.hours)
    );
  }

  const vacationHoursByUser = new Map<string, number>();
  const DAY_MS = 24 * 60 * 60 * 1000;
  for (const v of vacations) {
    // Clip to the period window
    const from = v.startDate > startDate ? v.startDate : startDate;
    const to = v.endDate < endExclusive ? v.endDate : new Date(endExclusive.getTime() - DAY_MS);
    if (to < from) continue;
    // Count calendar days inclusive (skip Sundays per CR convention)
    let days = 0;
    for (
      let d = new Date(from);
      d <= to;
      d = new Date(d.getTime() + DAY_MS)
    ) {
      const dow = d.getUTCDay();
      if (dow !== 0) days++;
    }
    vacationHoursByUser.set(
      v.userId,
      (vacationHoursByUser.get(v.userId) ?? 0) +
        days * ATTENDANCE_RULES.regularHoursPerDay
    );
  }

  type Row = {
    userId: string;
    name: string;
    department: Department;
    hourlyRate: number | null;
    monthlySalary: number | null;
    daysWorked: number;
    workedHours: number;     // from punches only
    paidLeaveHours: number;  // from approved+paid permits & vacations
    totalHours: number;      // worked + paid leave
    grossPay: number;
    paymentBasis: "hourly" | "salary" | "none";
  };

  const rows: Row[] = users.map((u) => {
    const hourlyRate = u.hourlyRate != null ? Number(u.hourlyRate) : null;
    const monthlySalary =
      u.monthlySalary != null ? Number(u.monthlySalary) : null;

    const daily = summarizeByDay(
      punchesByUser.get(u.id) ?? [],
      u.lateCutoffMin ?? null
    );
    const workedHours = daily.reduce((s, d) => s + d.workedHours, 0);
    const daysWorked = daily.filter((d) => d.entrance != null).length;
    const paidLeaveHours =
      (permitHoursByUser.get(u.id) ?? 0) +
      (vacationHoursByUser.get(u.id) ?? 0);
    const totalHours = workedHours + paidLeaveHours;

    let grossPay = 0;
    let paymentBasis: Row["paymentBasis"] = "none";
    if (hourlyRate != null) {
      grossPay = Math.round(totalHours * hourlyRate);
      paymentBasis = "hourly";
    } else if (monthlySalary != null) {
      grossPay = Math.round(monthlySalary);
      paymentBasis = "salary";
    }

    return {
      userId: u.id,
      name: u.name,
      department: u.department,
      hourlyRate,
      monthlySalary,
      daysWorked,
      workedHours: Math.round(workedHours * 100) / 100,
      paidLeaveHours: Math.round(paidLeaveHours * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
      grossPay,
      paymentBasis,
    };
  });

  rows.sort((a, b) => b.grossPay - a.grossPay);

  const totalPayroll = rows.reduce((s, r) => s + r.grossPay, 0);
  const totalHours = rows.reduce((s, r) => s + r.totalHours, 0);
  const employeesWithPay = rows.filter((r) => r.grossPay > 0).length;
  const employeesWithoutRate = rows.filter(
    (r) => r.paymentBasis === "none"
  ).length;

  const exportRows = rows.map((r) => ({
    employee: r.name,
    department: DEPARTMENT_LABEL[r.department],
    paymentBasis:
      r.paymentBasis === "hourly"
        ? "Por hora"
        : r.paymentBasis === "salary"
        ? "Salario fijo"
        : "Sin tarifa",
    hourlyRate: r.hourlyRate ?? "",
    monthlySalary: r.monthlySalary ?? "",
    daysWorked: r.daysWorked,
    workedHours: r.workedHours,
    paidLeaveHours: r.paidLeaveHours,
    totalHours: r.totalHours,
    grossPay: r.grossPay,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nómina"
        subtitle="Cálculo de pago basado en horas trabajadas reales del dispositivo."
        actions={
          <ExportButton
            filename={`nomina_${startStr}_${endStr}.csv`}
            rows={exportRows}
            columns={[
              { key: "employee", header: "Empleado" },
              { key: "department", header: "Departamento" },
              { key: "paymentBasis", header: "Base de pago" },
              { key: "hourlyRate", header: "Tarifa/hora" },
              { key: "monthlySalary", header: "Salario mensual" },
              { key: "daysWorked", header: "Días trabajados" },
              { key: "workedHours", header: "Horas marcadas" },
              { key: "paidLeaveHours", header: "Horas con goce" },
              { key: "totalHours", header: "Horas totales" },
              { key: "grossPay", header: "Pago bruto" },
            ]}
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Período</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ReportFilters start={startStr} end={endStr} />
          <p className="text-xs text-muted-foreground">
            Del{" "}
            <span className="font-medium text-foreground">
              {formatDate(startDate)}
            </span>{" "}
            al{" "}
            <span className="font-medium text-foreground">
              {formatDate(endDate)}
            </span>{" "}
            · {punches.length.toLocaleString("es-CR")} marcajes
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Pago total" value={CRC.format(totalPayroll)} />
        <KpiCard
          label="Horas totales"
          value={totalHours.toFixed(1)}
          hint="trabajadas en el período"
        />
        <KpiCard
          label="Empleados con pago"
          value={`${employeesWithPay}/${rows.length}`}
          hintTone="info"
        />
        <KpiCard
          label="Sin tarifa configurada"
          value={employeesWithoutRate}
          valueTone={employeesWithoutRate > 0 ? "warning" : "default"}
          hint={employeesWithoutRate > 0 ? "asignar en /empleados" : undefined}
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
                  <TableHead className="hidden sm:table-cell">Depto.</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Marcadas</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Con goce
                  </TableHead>
                  <TableHead>Total h.</TableHead>
                  <TableHead className="hidden lg:table-cell">Tarifa</TableHead>
                  <TableHead className="text-right">Pago bruto</TableHead>
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
                    <TableCell>
                      {r.paymentBasis === "hourly" ? (
                        <Badge variant="outline" className="text-xs">
                          Por hora
                        </Badge>
                      ) : r.paymentBasis === "salary" ? (
                        <Badge variant="outline" className="text-xs">
                          Salario fijo
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Sin tarifa
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {r.daysWorked}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {r.workedHours.toFixed(1)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-sm text-emerald-600 dark:text-emerald-400">
                      {r.paidLeaveHours > 0
                        ? `+${r.paidLeaveHours.toFixed(1)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">
                      {r.totalHours.toFixed(1)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">
                      {r.paymentBasis === "hourly"
                        ? `${CRC.format(r.hourlyRate ?? 0)}/h`
                        : r.paymentBasis === "salary"
                        ? `${CRC.format(r.monthlySalary ?? 0)}/mes`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {r.grossPay > 0 ? CRC.format(r.grossPay) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
