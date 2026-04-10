import { prisma } from "@/lib/prisma";
import { formatDate, startOfTodayCR } from "@/lib/format";
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
import { NewPermitDialog } from "@/components/new-permit-dialog";
import { PermitReviewDialog } from "@/components/permit-review-dialog";
import { ExportButton } from "@/components/export-button";
import {
  DEPARTMENT_LABEL,
  PERMIT_STATUS_LABEL,
  PERMIT_TYPE_LABEL,
} from "@/lib/labels";

export const metadata = {
  title: "Permisos · LCDP",
};

function startOfMonthCR() {
  const today = startOfTodayCR();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1, 6));
}

function startOfWeekCR() {
  const today = startOfTodayCR();
  const dow = today.getUTCDay();
  const diff = (dow + 6) % 7;
  return new Date(today.getTime() - diff * 24 * 60 * 60 * 1000);
}

export default async function PermitsPage() {
  const monthStart = startOfMonthCR();
  const weekStart = startOfWeekCR();

  const [
    permits,
    employees,
    pendingCount,
    approvedThisWeek,
    deniedTotal,
    monthTotal,
  ] = await Promise.all([
    prisma.permit.findMany({
      orderBy: [{ status: "asc" }, { date: "desc" }],
      take: 100,
      include: {
        user: { select: { name: true, department: true } },
        reviewer: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.permit.count({ where: { status: "PENDING" } }),
    prisma.permit.count({
      where: {
        status: "APPROVED",
        reviewedAt: { gte: weekStart },
      },
    }),
    prisma.permit.count({ where: { status: "DENIED" } }),
    prisma.permit.count({ where: { createdAt: { gte: monthStart } } }),
  ]);

  // Flatten for CSV export — server components can't pass functions to
  // client components, so the export rows must be plain objects.
  const exportRows = permits.map((p) => ({
    employee: p.user.name,
    department: DEPARTMENT_LABEL[p.user.department],
    type: PERMIT_TYPE_LABEL[p.type],
    date: formatDate(p.date),
    duration: p.duration,
    reason: p.reason,
    status: PERMIT_STATUS_LABEL[p.status],
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Permisos"
        subtitle="Gestiona permisos, salidas y aprobaciones del personal."
        actions={
          <>
            <ExportButton
              filename="permisos.csv"
              rows={exportRows}
              columns={[
                { key: "employee", header: "Empleado" },
                { key: "department", header: "Departamento" },
                { key: "type", header: "Tipo" },
                { key: "date", header: "Fecha" },
                { key: "duration", header: "Duración" },
                { key: "reason", header: "Motivo" },
                { key: "status", header: "Estado" },
              ]}
            />
            <NewPermitDialog employees={employees} />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Pendientes de aprobación"
          value={pendingCount}
          hint={pendingCount > 0 ? "esperan revisión" : undefined}
          hintTone="warning"
        />
        <KpiCard
          label="Aprobados (semana)"
          value={approvedThisWeek}
          valueTone="success"
        />
        <KpiCard
          label="Rechazados"
          value={deniedTotal}
          valueTone={deniedTotal > 0 ? "danger" : "default"}
        />
        <KpiCard label="Total este mes" value={monthTotal} />
      </div>

      <Card>
        <CardContent className="p-0">
          {permits.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Aún no hay solicitudes de permiso.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="hidden sm:table-cell">Depto.</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead className="hidden lg:table-cell">Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permits.map((p) => {
                  const status = p.status;
                  const statusBadge =
                    status === "PENDING" ? (
                      <Badge className="bg-foreground text-background">
                        {PERMIT_STATUS_LABEL[status]}
                      </Badge>
                    ) : status === "APPROVED" ? (
                      <Badge className="bg-green-600 text-white">
                        {PERMIT_STATUS_LABEL[status]}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        {PERMIT_STATUS_LABEL[status]}
                      </Badge>
                    );

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm font-medium">
                        {p.user.name}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {DEPARTMENT_LABEL[p.user.department]}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {PERMIT_TYPE_LABEL[p.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(p.date)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.duration}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-xs truncate text-sm text-muted-foreground">
                        {p.reason}
                      </TableCell>
                      <TableCell>{statusBadge}</TableCell>
                      <TableCell className="text-right">
                        <PermitReviewDialog permit={p} />
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
