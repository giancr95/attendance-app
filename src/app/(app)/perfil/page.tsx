import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { ChangePasswordForm } from "@/components/change-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEPARTMENT_LABEL, ROLE_LABEL } from "@/lib/labels";
import { formatDateOnly } from "@/lib/format";

export const metadata = {
  title: "Mi perfil · LCDP",
};

export default async function ProfilePage() {
  const sessionUser = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      name: true,
      email: true,
      role: true,
      department: true,
      hireDate: true,
    },
  });

  if (!user) {
    // Session points at a row that no longer exists — nothing to show.
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Mi perfil" />
        <p className="text-sm text-muted-foreground">
          No se encontró tu información de usuario.
        </p>
      </div>
    );
  }

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: "Nombre", value: user.name },
    { label: "Correo", value: user.email ?? "—" },
    { label: "Rol", value: ROLE_LABEL[user.role] ?? user.role },
    { label: "Departamento", value: DEPARTMENT_LABEL[user.department] },
    {
      label: "Fecha de ingreso",
      value: user.hireDate ? formatDateOnly(user.hireDate) : "—",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mi perfil"
        subtitle="Tu información de cuenta y seguridad."
      />

      <Card>
        <CardHeader>
          <CardTitle>Información</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.label} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{f.label}</dt>
                <dd className="text-sm font-medium">
                  {f.label === "Rol" ? (
                    <Badge variant="outline">{f.value}</Badge>
                  ) : (
                    f.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
          <CardDescription>
            Necesitas tu contraseña actual para confirmar el cambio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
