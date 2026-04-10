import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
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
import { NewVacationDialog } from "@/components/new-vacation-dialog";
import { VacationReviewDialog } from "@/components/vacation-review-dialog";
import { ExportButton } from "@/components/export-button";
import {
  DEPARTMENT_LABEL,
  VACATION_STATUS_LABEL,
  VACATION_TYPE_LABEL,
} from "@/lib/labels";
import { vacationBalance } from "@/lib/vacation-calc";

export const metadata = {
  title: "Vacaciones · LCDP",
};

export default async function VacationsPage() {
  const quarter = Math.floor(new Date().getUTCMonth() / 3);
  const quarterStart = new Date(new Date().getUTCFullYear(), quarter * 3, 1);

  // Pull every employee + every vacation in one round trip so we can compute
  // accrual balances per person without a join. Admins are excluded — they
  // don't accrue vacation here.
  const [vacations, employees, pendingCount, approvedQtr, rejectedTotal] =
    await Promise.all([
      prisma.vacation.findMany({
        orderBy: [{ status: "asc" }, { startDate: "desc" }],
        take: 100,
        include: {
          user: { select: { name: true, department: true } },
          reviewer: { select: { name: true } },
        },
      }),
      prisma.user.findMany({
        where: { status: "ACTIVE", role: "EMPLOYEE" },
        select: { id: true, name: true, hireDate: true },
        orderBy: { name: "asc" },
      }),
      prisma.vacation.count({ where: { status: "PENDING" } }),
      prisma.vacation.count({
        where: {
          status: "APPROVED",
          reviewedAt: { gte: quarterStart },
        },
      }),
      prisma.vacation.count({ where: { status: "REJECTED" } }),
    ]);

  // Aggregate per-employee balances for the headline KPIs.
  const allVacations = await prisma.vacation.findMany({
    where: { user: { role: "EMPLOYEE" } },
    select: { userId: true, status: true, days: true },
  });
  const vacByUser = new Map<string, typeof allVacations>();
  for (const v of allVacations) {
    if (!vacByUser.has(v.userId)) vacByUser.set(v.userId, []);
    vacByUser.get(v.userId)!.push(v);
  }

  let totalAccrued = 0;
  let totalUsed = 0;
  let totalAvailable = 0;
  for (const u of employees) {
    const bal = vacationBalance(u.hireDate, vacByUser.get(u.id) ?? []);
    totalAccrued += bal.accrued;
    totalUsed += bal.used;
    totalAvailable += bal.available;
  }
  const avgPerEmployee =
    employees.length > 0
      ? (totalAvailable / employees.length).toFixed(1)
      : "0";

  const exportRows = vacations.map((v) => ({
    employee: v.user.name,
    department: DEPARTMENT_LABEL[v.user.department],
    type: VACATION_TYPE_LABEL[v.type],
    startDate: formatDate(v.startDate),
    endDate: formatDate(v.endDate),
    days: v.days,
    status: VACATION_STATUS_LABEL[v.status],
    notes: v.notes ?? "",
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vacaciones"
        subtitle="Solicitudes y aprobaciones de vacaciones del personal."
        actions={
          <>
            <ExportButton
              filename="vacaciones.csv"
              rows={exportRows}
              columns={[
                { key: "employee", header: "Empleado" },
                { key: "department", header: "Departamento" },
                { key: "type", header: "Tipo" },
                { key: "startDate", header: "Inicio" },
                { key: "endDate", header: "Fin" },
                { key: "days", header: "Días" },
                { key: "status", header: "Estado" },
                { key: "notes", header: "Notas" },
              ]}
            />
            <NewVacationDialog employees={employees} />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Pendientes"
          value={pendingCount}
          hint={pendingCount > 0 ? "esperan revisión" : undefined}
          hintTone="warning"
        />
        <KpiCard
          label="Aprobadas (trimestre)"
          value={approvedQtr}
          valueTone="success"
        />
        <KpiCard
          label="Rechazadas"
          value={rejectedTotal}
          valueTone={rejectedTotal > 0 ? "danger" : "default"}
        />
        <KpiCard
          label="Días disponibles"
          value={totalAvailable}
          hint={`${totalUsed} usados · prom. ${avgPerEmployee}/emp`}
          hintTone="info"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {vacations.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Aún no hay solicitudes de vacaciones.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="hidden sm:table-cell">Depto.</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacations.map((v) => {
                  const statusBadge =
                    v.status === "PENDING" ? (
                      <Badge className="bg-foreground text-background">
                        {VACATION_STATUS_LABEL[v.status]}
                      </Badge>
                    ) : v.status === "APPROVED" ? (
                      <Badge className="bg-green-600 text-white">
                        {VACATION_STATUS_LABEL[v.status]}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        {VACATION_STATUS_LABEL[v.status]}
                      </Badge>
                    );

                  return (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm font-medium">
                        {v.user.name}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {DEPARTMENT_LABEL[v.user.department]}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(v.startDate)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(v.endDate)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {v.days}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {VACATION_TYPE_LABEL[v.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>{statusBadge}</TableCell>
                      <TableCell className="text-right">
                        <VacationReviewDialog vacation={v} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
