import { AlertTriangleIcon, ShieldIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
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
import { SyncUsersButton } from "@/components/sync-users-button";
import { EmployeeRowActions } from "@/components/employee-row-actions";
import { ExportButton } from "@/components/export-button";
import {
  DEPARTMENT_LABEL,
  ROLE_LABEL,
  USER_STATUS_LABEL,
} from "@/lib/labels";
import { vacationBalance } from "@/lib/vacation-calc";

export const metadata = {
  title: "Empleados · LCDP",
};

const DEVICE_SERIAL = "UDP3243700044";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default async function EmployeesPage() {
  const [users, device, lastPunches, vacations] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.device.findUnique({ where: { serial: DEVICE_SERIAL } }),
    prisma.punch.groupBy({
      by: ["userId"],
      _max: { timestamp: true },
    }),
    prisma.vacation.findMany({
      select: { userId: true, status: true, days: true },
    }),
  ]);

  const lastPunchMap = new Map<string, Date>();
  for (const p of lastPunches) {
    if (p._max.timestamp) lastPunchMap.set(p.userId, p._max.timestamp);
  }

  // Group vacations by employee for balance calculation.
  const vacByUser = new Map<string, typeof vacations>();
  for (const v of vacations) {
    if (!vacByUser.has(v.userId)) vacByUser.set(v.userId, []);
    vacByUser.get(v.userId)!.push(v);
  }

  const totalFingerprints = users.reduce((sum, u) => sum + u.fingerprints, 0);
  const totalFaces = users.filter((u) => u.hasFace).length;
  // ZKTeco MB10-VL stores up to ~3000 users + ~300k logs. We approximate
  // storage usage by combining the two.
  const storagePct = Math.min(
    100,
    Math.round(((users.length / 3000) * 0.5 + (totalFingerprints / 4500) * 0.5) * 100)
  );

  const subtitle = (
    <>
      {users.length} registrados en MB10-VL · {totalFingerprints} huellas ·{" "}
      {totalFaces} rostros
      {device?.lastSyncAt ? (
        <>
          {" · última sincronización "}
          <span className="font-medium text-foreground">
            {formatDateTime(device.lastSyncAt)}
          </span>
        </>
      ) : null}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Empleados"
        subtitle={subtitle}
        actions={
          <>
            <ExportButton
              filename="empleados.csv"
              rows={users.map((u) => ({
                pin: u.deviceUserId ?? "",
                name: u.name,
                email: u.email ?? "",
                department: DEPARTMENT_LABEL[u.department],
                role: ROLE_LABEL[u.role],
                status: USER_STATUS_LABEL[u.status],
                fingerprints: u.fingerprints,
                face: u.hasFace ? "sí" : "no",
              }))}
              columns={[
                { key: "pin", header: "PIN" },
                { key: "name", header: "Nombre" },
                { key: "email", header: "Email" },
                { key: "department", header: "Departamento" },
                { key: "role", header: "Rol" },
                { key: "status", header: "Estado" },
                { key: "fingerprints", header: "Huellas" },
                { key: "face", header: "Rostro" },
              ]}
            />
            <SyncUsersButton />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total empleados" value={users.length} />
        <KpiCard label="Huellas" value={totalFingerprints} />
        <KpiCard label="Rostros" value={totalFaces} />
        <KpiCard label="Almacenamiento" value={`${storagePct}%`} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead className="hidden sm:table-cell">Depto.</TableHead>
                <TableHead className="hidden md:table-cell">Vac. disp.</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Último marcaje
                </TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const lastPunch = lastPunchMap.get(u.id);
                const vac = vacationBalance(
                  u.hireDate,
                  vacByUser.get(u.id) ?? []
                );
                const statusBadge =
                  u.role === "ADMIN" ? (
                    <Badge className="bg-foreground text-background">
                      <ShieldIcon className="mr-1 size-3" />
                      Admin
                    </Badge>
                  ) : u.status === "ACTIVE" ? (
                    <Badge className="bg-foreground text-background">
                      Activo
                    </Badge>
                  ) : u.status === "INACTIVE" ? (
                    <Badge variant="secondary">Inactivo</Badge>
                  ) : (
                    <Badge variant="outline">Archivado</Badge>
                  );

                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="text-xs">
                            {u.deviceUserId
                              ? `#${u.deviceUserId}`
                              : initials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                            {u.name}
                            {u.hasDataIssue && u.name === u.deviceName ? (
                              <AlertTriangleIcon
                                className="size-3.5 text-amber-500"
                                aria-label="Nombre corrupto en dispositivo"
                              />
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {u.email ??
                              (u.deviceUserId
                                ? `PIN ${u.deviceUserId}`
                                : "—")}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {DEPARTMENT_LABEL[u.department]}
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-sm">
                      {u.hireDate ? (
                        <span
                          className={
                            vac.available > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                          }
                        >
                          {vac.available} día{vac.available === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          sin fecha
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {lastPunch ? formatDateTime(lastPunch) : "—"}
                    </TableCell>
                    <TableCell>{statusBadge}</TableCell>
                    <TableCell className="text-right">
                      <EmployeeRowActions
                        user={{
                          id: u.id,
                          name: u.name,
                          deviceName: u.deviceName,
                          email: u.email,
                          hourlyRate:
                            u.hourlyRate != null ? Number(u.hourlyRate) : null,
                          monthlySalary:
                            u.monthlySalary != null
                              ? Number(u.monthlySalary)
                              : null,
                          hireDate: u.hireDate,
                          lateCutoffMin: u.lateCutoffMin,
                          department: u.department,
                          role: u.role,
                          status: u.status,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
