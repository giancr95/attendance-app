import { prisma } from "@/lib/prisma";
import { formatDate, formatTime } from "@/lib/format";
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
import { DEPARTMENT_LABEL, PUNCH_KIND_LABEL } from "@/lib/labels";

export const metadata = {
  title: "Marcajes · LCDP",
};

const PAGE_SIZE = 50;

export default async function PunchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [total, punches] = await Promise.all([
    prisma.punch.count(),
    prisma.punch.findMany({
      orderBy: { timestamp: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        user: { select: { name: true, department: true } },
        device: { select: { name: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Marcajes</h1>
        <p className="text-sm text-muted-foreground">
          Bitácora de entradas, salidas y descansos del dispositivo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
          <CardDescription>
            {total} registros · página {page} de {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {punches.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No hay marcajes registrados todavía.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Depto.
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Dispositivo
                  </TableHead>
                  <TableHead className="text-right">Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {punches.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">
                      {formatDate(p.timestamp)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatTime(p.timestamp)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {p.user.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {DEPARTMENT_LABEL[p.user.department]}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {p.device.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {PUNCH_KIND_LABEL[p.kind]}
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
