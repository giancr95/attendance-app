import { AlertTriangleIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
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
  DEPARTMENT_LABEL,
  ROLE_LABEL,
  USER_STATUS_LABEL,
  USER_STATUS_VARIANT,
} from "@/lib/labels";

export const metadata = {
  title: "Empleados · LCDP",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default async function EmployeesPage() {
  const users = await prisma.user.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      deviceUserId: true,
      name: true,
      email: true,
      role: true,
      status: true,
      department: true,
      fingerprints: true,
      hasFace: true,
      hasDataIssue: true,
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Empleados</h1>
        <p className="text-sm text-muted-foreground">
          Usuarios sincronizados desde el dispositivo ZKTeco MB10-VL.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de empleados</CardTitle>
          <CardDescription>
            {users.length} registros en total.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead className="hidden sm:table-cell">Depto.</TableHead>
                <TableHead className="hidden md:table-cell">Rol</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Biométricos
                </TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback>{initials(u.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                          {u.name}
                          {u.hasDataIssue ? (
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
                  <TableCell className="hidden md:table-cell text-sm">
                    {ROLE_LABEL[u.role]}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {u.fingerprints} huella{u.fingerprints === 1 ? "" : "s"}
                    {u.hasFace ? " · rostro" : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={USER_STATUS_VARIANT[u.status]}>
                      {USER_STATUS_LABEL[u.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
