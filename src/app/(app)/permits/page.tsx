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
  PERMIT_STATUS_LABEL,
  PERMIT_STATUS_VARIANT,
  PERMIT_TYPE_LABEL,
} from "@/lib/labels";

export const metadata = {
  title: "Permisos · LCDP",
};

export default async function PermitsPage() {
  const permits = await prisma.permit.findMany({
    orderBy: [{ status: "asc" }, { date: "desc" }],
    take: 100,
    include: {
      user: { select: { name: true } },
      reviewer: { select: { name: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Permisos</h1>
        <p className="text-sm text-muted-foreground">
          Solicitudes de permiso del personal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes</CardTitle>
          <CardDescription>
            {permits.length} solicitudes mostradas (las más recientes primero).
          </CardDescription>
        </CardHeader>
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Motivo
                  </TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permits.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-medium">
                      {p.user.name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {PERMIT_TYPE_LABEL[p.type]}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(p.date)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs truncate text-sm text-muted-foreground">
                      {p.reason}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={PERMIT_STATUS_VARIANT[p.status]}>
                        {PERMIT_STATUS_LABEL[p.status]}
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
