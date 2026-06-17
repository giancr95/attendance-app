// Employee-facing self-service views (role = EMPLOYEE).
//
// These render ONLY the logged-in employee's own data — never anyone
// else's. They're plain server components that the shared (app) pages
// render instead of the admin views when `session.user.role !== "ADMIN"`.
// Mutations stay safe because the underlying server actions force the
// request onto the session user for non-admins.
import { prisma } from "@/lib/prisma";
import { vacationBalance } from "@/lib/vacation-calc";
import { formatDateOnly } from "@/lib/format";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { NewVacationDialog } from "@/components/new-vacation-dialog";
import { NewPermitDialog } from "@/components/new-permit-dialog";
import { Badge } from "@/components/ui/badge";
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
import {
  PERMIT_STATUS_LABEL,
  PERMIT_TYPE_LABEL,
  VACATION_STATUS_LABEL,
  VACATION_TYPE_LABEL,
} from "@/lib/labels";
import type { PermitStatus, VacationStatus } from "@/generated/prisma/client";

type Who = { userId: string; name: string };

function vacationStatusBadge(status: VacationStatus) {
  if (status === "PENDING")
    return (
      <Badge className="bg-foreground text-background">
        {VACATION_STATUS_LABEL[status]}
      </Badge>
    );
  if (status === "APPROVED")
    return (
      <Badge className="bg-green-600 text-white">
        {VACATION_STATUS_LABEL[status]}
      </Badge>
    );
  return <Badge variant="destructive">{VACATION_STATUS_LABEL[status]}</Badge>;
}

function permitStatusBadge(status: PermitStatus) {
  if (status === "PENDING")
    return (
      <Badge className="bg-foreground text-background">
        {PERMIT_STATUS_LABEL[status]}
      </Badge>
    );
  if (status === "APPROVED")
    return (
      <Badge className="bg-green-600 text-white">
        {PERMIT_STATUS_LABEL[status]}
      </Badge>
    );
  return <Badge variant="destructive">{PERMIT_STATUS_LABEL[status]}</Badge>;
}

async function loadMine(userId: string) {
  const [me, vacations, permits] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { hireDate: true },
    }),
    prisma.vacation.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
    }),
    prisma.permit.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    }),
  ]);
  const balance = vacationBalance(me?.hireDate ?? null, vacations);
  return { vacations, permits, balance };
}

// ───────────────────────────── portal home ─────────────────────────────

export async function EmployeePortal({ userId, name }: Who) {
  const { vacations, permits, balance } = await loadMine(userId);
  const self = [{ id: userId, name }];
  const firstName = name.trim().split(/\s+/)[0] ?? name;

  const permitPending = permits.filter((p) => p.status === "PENDING").length;
  const recentVacations = vacations.slice(0, 5);
  const recentPermits = permits.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Hola, ${firstName}`}
        subtitle="Solicita tus vacaciones o permisos y consulta tu saldo."
        actions={
          <>
            <NewVacationDialog employees={self} selfMode />
            <NewPermitDialog employees={self} selfMode />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Vacaciones disponibles"
          value={balance.available}
          hint={`${balance.accrued} acumulados · ${balance.used} usados`}
          valueTone="success"
          hintTone="info"
        />
        <KpiCard
          label="Vacaciones pendientes"
          value={balance.pending}
          hint={balance.pending > 0 ? "días en revisión" : undefined}
          hintTone="warning"
        />
        <KpiCard
          label="Permisos pendientes"
          value={permitPending}
          hint={permitPending > 0 ? "esperan aprobación" : undefined}
          hintTone="warning"
        />
        <KpiCard
          label="Meses trabajados"
          value={balance.monthsWorked}
          hint="1 día de vacaciones por mes"
          hintTone="default"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mis vacaciones recientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentVacations.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                Aún no has solicitado vacaciones.
              </p>
            ) : (
              <ul className="divide-y">
                {recentVacations.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-3 px-6 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {formatDateOnly(v.startDate)} – {formatDateOnly(v.endDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {VACATION_TYPE_LABEL[v.type]} · {v.days}{" "}
                        {v.days === 1 ? "día" : "días"}
                      </p>
                    </div>
                    {vacationStatusBadge(v.status)}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mis permisos recientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentPermits.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                Aún no has solicitado permisos.
              </p>
            ) : (
              <ul className="divide-y">
                {recentPermits.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-6 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {formatDateOnly(p.date)} · {PERMIT_TYPE_LABEL[p.type]}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.duration} — {p.reason}
                      </p>
                    </div>
                    {permitStatusBadge(p.status)}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────── my vacations ───────────────────────────

export async function EmployeeVacations({ userId, name }: Who) {
  const { vacations, balance } = await loadMine(userId);
  const self = [{ id: userId, name }];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mis vacaciones"
        subtitle="Tus solicitudes de vacaciones y tu saldo disponible."
        actions={<NewVacationDialog employees={self} selfMode />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Disponibles"
          value={balance.available}
          valueTone="success"
        />
        <KpiCard label="Acumuladas" value={balance.accrued} />
        <KpiCard label="Usadas" value={balance.used} />
        <KpiCard
          label="Pendientes"
          value={balance.pending}
          hint={balance.pending > 0 ? "días en revisión" : undefined}
          hintTone="warning"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {vacations.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Aún no has solicitado vacaciones.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-sm">
                      {formatDateOnly(v.startDate)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateOnly(v.endDate)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{v.days}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {VACATION_TYPE_LABEL[v.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>{vacationStatusBadge(v.status)}</TableCell>
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

// ──────────────────────────── my permits ────────────────────────────

export async function EmployeePermits({ userId, name }: Who) {
  const { permits } = await loadMine(userId);
  const self = [{ id: userId, name }];

  const pending = permits.filter((p) => p.status === "PENDING").length;
  const approved = permits.filter((p) => p.status === "APPROVED").length;
  const denied = permits.filter((p) => p.status === "DENIED").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mis permisos"
        subtitle="Tus solicitudes de permisos y salidas."
        actions={<NewPermitDialog employees={self} selfMode />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Pendientes"
          value={pending}
          hint={pending > 0 ? "esperan aprobación" : undefined}
          hintTone="warning"
        />
        <KpiCard label="Aprobados" value={approved} valueTone="success" />
        <KpiCard
          label="Rechazados"
          value={denied}
          valueTone={denied > 0 ? "danger" : "default"}
        />
        <KpiCard label="Total" value={permits.length} />
      </div>

      <Card>
        <CardContent className="p-0">
          {permits.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Aún no has solicitado permisos.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead className="hidden sm:table-cell">Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permits.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">
                      {formatDateOnly(p.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {PERMIT_TYPE_LABEL[p.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.duration}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell max-w-xs truncate text-sm text-muted-foreground">
                      {p.reason}
                    </TableCell>
                    <TableCell>{permitStatusBadge(p.status)}</TableCell>
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
