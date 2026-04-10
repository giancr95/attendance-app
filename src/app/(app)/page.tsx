import {
  ClipboardListIcon,
  FingerprintIcon,
  PlaneTakeoffIcon,
  UsersIcon,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { formatDateTime, startOfTodayCR } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PUNCH_KIND_LABEL } from "@/lib/labels";

export const metadata = {
  title: "Dashboard · LCDP",
};

async function loadDashboard() {
  const today = startOfTodayCR();

  // Dashboard counts only EMPLOYEE-role users (admins don't punch the clock).
  const [
    activeEmployees,
    inactiveEmployees,
    punchesToday,
    pendingPermits,
    pendingVacations,
    latestPunches,
  ] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE", role: "EMPLOYEE" } }),
    prisma.user.count({ where: { status: "INACTIVE", role: "EMPLOYEE" } }),
    prisma.punch.count({
      where: { timestamp: { gte: today }, user: { role: "EMPLOYEE" } },
    }),
    prisma.permit.count({ where: { status: "PENDING" } }),
    prisma.vacation.count({ where: { status: "PENDING" } }),
    prisma.punch.findMany({
      where: { user: { role: "EMPLOYEE" } },
      orderBy: { timestamp: "desc" },
      take: 8,
      include: { user: { select: { name: true, department: true } } },
    }),
  ]);

  return {
    activeEmployees,
    inactiveEmployees,
    punchesToday,
    pendingPermits,
    pendingVacations,
    latestPunches,
  };
}

export default async function DashboardPage() {
  const data = await loadDashboard();

  const stats = [
    {
      label: "Empleados activos",
      value: data.activeEmployees,
      hint: `${data.inactiveEmployees} inactivos`,
      icon: UsersIcon,
    },
    {
      label: "Marcajes hoy",
      value: data.punchesToday,
      hint: "Zona horaria CR",
      icon: FingerprintIcon,
    },
    {
      label: "Permisos pendientes",
      value: data.pendingPermits,
      hint: "Requieren revisión",
      icon: ClipboardListIcon,
    },
    {
      label: "Vacaciones pendientes",
      value: data.pendingVacations,
      hint: "Requieren revisión",
      icon: PlaneTakeoffIcon,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Resumen de asistencia y solicitudes pendientes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos marcajes</CardTitle>
          <CardDescription>
            Los 8 registros más recientes del dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.latestPunches.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aún no hay marcajes registrados.
            </p>
          ) : (
            <ul className="divide-y">
              {data.latestPunches.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {p.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.user.department}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {PUNCH_KIND_LABEL[p.kind]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(p.timestamp)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
