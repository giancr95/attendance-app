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
import { ManualPunchDialog } from "@/components/manual-punch-dialog";
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
  lateCutoffMin: number | null;
  deviceUserId: number | null;
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
  const [manualPunchOpen, setManualPunchOpen] = useState(false);

  // Manual punch entry is only available for employees who aren't on
  // the clock. The server action also enforces this, but gating the UI
  // keeps the menu cleaner.
  const canPunchManually =
    user.role === "EMPLOYEE" && user.deviceUserId == null;
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
      {/* Dialogs rendered as siblings so they survive the menu closing. */}
      <EmployeeEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={user}
      />
      {canPunchManually ? (
        <ManualPunchDialog
          open={manualPunchOpen}
          onOpenChange={setManualPunchOpen}
          user={{ id: user.id, name: user.name }}
        />
      ) : null}
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
          {canPunchManually ? (
            <DropdownMenuItem onClick={() => setManualPunchOpen(true)}>
              Registrar marcaje manual…
            </DropdownMenuItem>
          ) : null}
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
