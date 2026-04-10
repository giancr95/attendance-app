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
  const [users, punches] = await Promise.all([
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
  ]);

  // Group punches by user
  const punchesByUser = new Map<string, typeof punches>();
  for (const p of punches) {
    if (!punchesByUser.has(p.userId)) punchesByUser.set(p.userId, []);
    punchesByUser.get(p.userId)!.push(p);
  }

  type Row = {
    userId: string;
    name: string;
    department: "PRODUCCION" | "ADMINISTRACION";
    hourlyRate: number | null;
    monthlySalary: number | null;
    daysWorked: number;
    totalHours: number;
    grossPay: number;
    paymentBasis: "hourly" | "salary" | "none";
  };

  const rows: Row[] = users.map((u) => {
    const hourlyRate = u.hourlyRate != null ? Number(u.hourlyRate) : null;
    const monthlySalary =
      u.monthlySalary != null ? Number(u.monthlySalary) : null;

    const daily = summarizeByDay(punchesByUser.get(u.id) ?? []);
    const totalHours = daily.reduce((s, d) => s + d.workedHours, 0);
    const daysWorked = daily.filter((d) => d.entrance != null).length;

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
                  <TableHead>Horas</TableHead>
                  <TableHead>Tarifa</TableHead>
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
                      {r.totalHours.toFixed(1)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
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
