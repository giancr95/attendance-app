// Raw clock data view.
//
// Unlike /punches and /reports — which interpret the punches via ordinal
// rules — this page shows the data EXACTLY as the device sent it. The
// rawStatus / rawPunch fields and the device's claim of CHECK_IN /
// CHECK_OUT are all surfaced here so an admin can audit weird sync
// behaviour or trace a single employee's punches.

import { prisma } from "@/lib/prisma";
import { formatDate, formatTime } from "@/lib/format";
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
import { ExportButton } from "@/components/export-button";
import { RawDataFilters } from "@/components/raw-data-filters";
import { PUNCH_KIND_LABEL, DEPARTMENT_LABEL } from "@/lib/labels";

export const metadata = {
  title: "Datos crudos · LCDP",
};

function parseCrDate(s: string | undefined, fallback: Date): Date {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return fallback;
  return new Date(`${s}T00:00:00-06:00`);
}

function defaultRange() {
  const end = new Date();
  const endCr = new Date(
    `${new Date(end.getTime() - 6 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)}T00:00:00-06:00`
  );
  const start = new Date(endCr.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { start, end: endCr };
}

type SearchParams = Promise<{
  start?: string;
  end?: string;
  userId?: string;
}>;

export default async function RawDataPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const range = defaultRange();
  const startDate = parseCrDate(sp.start, range.start);
  const endDate = parseCrDate(sp.end, range.end);
  const endExclusive = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);

  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);
  const userId = sp.userId ?? "";

  const where = {
    timestamp: { gte: startDate, lt: endExclusive },
    ...(userId ? { userId } : {}),
  };

  const [punches, employees, totalAll] = await Promise.all([
    prisma.punch.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 500,
      include: {
        user: {
          select: { id: true, name: true, deviceName: true, department: true },
        },
        device: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.punch.count({ where }),
  ]);

  const exportRows = punches.map((p) => ({
    employee: p.user.name,
    deviceName: p.user.deviceName ?? "",
    department: DEPARTMENT_LABEL[p.user.department],
    date: formatDate(p.timestamp),
    time: formatTime(p.timestamp),
    deviceLabel: PUNCH_KIND_LABEL[p.kind],
    rawStatus: p.rawStatus,
    rawPunch: p.rawPunch,
    device: p.device.name,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Datos crudos del dispositivo"
        subtitle="Marcajes tal como los entrega el ZKTeco. Solo para inspección manual."
        actions={
          <ExportButton
            filename={`raw_${startStr}_${endStr}.csv`}
            rows={exportRows}
            columns={[
              { key: "employee", header: "Empleado" },
              { key: "deviceName", header: "Nombre en dispositivo" },
              { key: "department", header: "Depto." },
              { key: "date", header: "Fecha" },
              { key: "time", header: "Hora" },
              { key: "deviceLabel", header: "Etiqueta del dispositivo" },
              { key: "rawStatus", header: "Status crudo" },
              { key: "rawPunch", header: "Punch crudo" },
              { key: "device", header: "Dispositivo" },
            ]}
          />
        }
      />

      <Card>
        <CardContent className="p-4">
          <RawDataFilters
            start={startStr}
            end={endStr}
            userId={userId}
            employees={employees}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Marcajes en período" value={totalAll} />
        <KpiCard label="Mostrando" value={`${punches.length}/${totalAll}`} />
        <KpiCard
          label="Empleado"
          value={
            userId
              ? employees.find((e) => e.id === userId)?.name ?? "—"
              : "Todos"
          }
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {punches.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No hay marcajes para este filtro.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Etiqueta</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Status crudo
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Punch crudo
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Nombre en dispositivo
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {punches.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-medium">
                      {p.user.name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(p.timestamp)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatTime(p.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {PUNCH_KIND_LABEL[p.kind]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                      {p.rawStatus}
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                      {p.rawPunch}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">
                      {p.user.deviceName ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalAll > 500 ? (
        <p className="text-xs text-muted-foreground">
          Mostrando los 500 más recientes. Refina el filtro de fecha o empleado
          para ver registros anteriores.
        </p>
      ) : null}
    </div>
  );
}
