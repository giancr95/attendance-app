"use client";

import { useState, useTransition } from "react";
import { MoreHorizontalIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmployeeEditDialog } from "@/components/employee-edit-dialog";
import {
  setUserStatus,
  setUserRole,
  setUserDepartment,
} from "@/lib/user-actions";
import { DEPARTMENT_LABEL, DEPARTMENT_OPTIONS } from "@/lib/labels";
import type {
  Department,
  Role,
  UserStatus,
} from "@/generated/prisma/client";

type EditProps = {
  id: string;
  name: string;
  deviceName: string | null;
  email: string | null;
  hourlyRate: number | null;
  monthlySalary: number | null;
  hireDate: Date | null;
  department: Department;
  role: Role;
  status: UserStatus;
};

type Props = {
  user: EditProps;
};

export function EmployeeRowActions({ user }: Props) {
  const { id: userId, status, role, department } = user;
  const [editOpen, setEditOpen] = useState(false);
  const [pending, start] = useTransition();

  function run<T>(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, label: string) {
    start(async () => {
      const id = toast.loading(label);
      const result = await fn();
      if (result.ok) {
        toast.success("Listo", { id });
      } else {
        toast.error(result.error, { id });
      }
    });
  }

  return (
    <>
      {/* Edit dialog is rendered as a sibling of the menu so it survives the
          menu closing on item click. The dropdown item just toggles `editOpen`. */}
      <EmployeeEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={user}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" disabled={pending}>
              <MoreHorizontalIcon className="size-4" />
              <span className="sr-only">Acciones</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Editar empleado…
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Estado</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={status === "ACTIVE"}
            onClick={() =>
              run(() => setUserStatus(userId, "ACTIVE"), "Activando…")
            }
          >
            Activar
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={status === "INACTIVE"}
            onClick={() =>
              run(() => setUserStatus(userId, "INACTIVE"), "Desactivando…")
            }
          >
            Desactivar
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={status === "ARCHIVED"}
            onClick={() =>
              run(() => setUserStatus(userId, "ARCHIVED"), "Archivando…")
            }
          >
            Archivar
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Rol</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={role === "ADMIN"}
            onClick={() =>
              run(() => setUserRole(userId, "ADMIN"), "Promoviendo…")
            }
          >
            Hacer administrador
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={role === "EMPLOYEE"}
            onClick={() =>
              run(() => setUserRole(userId, "EMPLOYEE"), "Cambiando rol…")
            }
          >
            Hacer empleado
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Departamento</DropdownMenuLabel>
          {DEPARTMENT_OPTIONS.map((d) => (
            <DropdownMenuItem
              key={d}
              disabled={department === d}
              onClick={() =>
                run(
                  () => setUserDepartment(userId, d),
                  "Cambiando departamento…"
                )
              }
            >
              {DEPARTMENT_LABEL[d]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
