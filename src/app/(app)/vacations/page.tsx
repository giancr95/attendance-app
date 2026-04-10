import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
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
  VACATION_STATUS_LABEL,
  VACATION_STATUS_VARIANT,
  VACATION_TYPE_LABEL,
} from "@/lib/labels";

export const metadata = {
  title: "Vacaciones · LCDP",
};

export default async function VacationsPage() {
  const vacations = await prisma.vacation.findMany({
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    take: 100,
    include: {
      user: { select: { name: true } },
      reviewer: { select: { name: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vacaciones</h1>
        <p className="text-sm text-muted-foreground">
          Solicitudes de vacaciones del personal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes</CardTitle>
          <CardDescription>
            {vacations.length} solicitudes mostradas.
          </CardDescription>
        </CardHeader>
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Días</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-sm font-medium">
                      {v.user.name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {VACATION_TYPE_LABEL[v.type]}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(v.startDate)} – {formatDate(v.endDate)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {v.days}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={VACATION_STATUS_VARIANT[v.status]}>
                        {VACATION_STATUS_LABEL[v.status]}
                      </Badge>
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
