"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserProfile } from "@/lib/user-actions";
import {
  DEPARTMENT_LABEL,
  DEPARTMENT_OPTIONS,
  ROLE_LABEL,
  USER_STATUS_LABEL,
} from "@/lib/labels";
import { formatLateCutoff, parseLateCutoff } from "@/lib/rules";
import type {
  Department,
  Role,
  UserStatus,
} from "@/generated/prisma/client";

type Props = {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    deviceName: string | null;
    email: string | null;
    hourlyRate: number | null;
    monthlySalary: number | null;
    hireDate: Date | null;
    lateCutoffMin: number | null;
    department: Department;
    role: Role;
    status: UserStatus;
  };
};

export function EmployeeEditDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  user,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [pending, start] = useTransition();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? "");
  const [hourlyRate, setHourlyRate] = useState<string>(
    user.hourlyRate != null ? String(user.hourlyRate) : ""
  );
  const [monthlySalary, setMonthlySalary] = useState<string>(
    user.monthlySalary != null ? String(user.monthlySalary) : ""
  );
  const [hireDate, setHireDate] = useState<string>(
    user.hireDate ? user.hireDate.toISOString().slice(0, 10) : ""
  );
  const [lateCutoff, setLateCutoff] = useState<string>(
    formatLateCutoff(user.lateCutoffMin)
  );
  const [department, setDepartment] = useState<Department>(user.department);
  const [role, setRole] = useState<Role>(user.role);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [newPassword, setNewPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const id = toast.loading("Guardando cambios…");
      // Validate the cutoff input: empty → use global default, otherwise
      // must parse as HH:MM. Reject anything in between.
      let lateCutoffMin: number | null = null;
      if (lateCutoff.trim() !== "") {
        const parsed = parseLateCutoff(lateCutoff);
        if (parsed == null) {
          toast.error("Hora de tardanza inválida (use HH:MM)", { id: "" });
          return;
        }
        lateCutoffMin = parsed;
      }

      const result = await updateUserProfile({
        userId: user.id,
        name,
        email: email || null,
        hourlyRate: hourlyRate.trim() === "" ? null : Number(hourlyRate),
        monthlySalary:
          monthlySalary.trim() === "" ? null : Number(monthlySalary),
        hireDate: hireDate ? new Date(`${hireDate}T00:00:00-06:00`) : null,
        lateCutoffMin,
        department,
        role,
        status,
        newPassword: newPassword || undefined,
      });
      if (result.ok) {
        toast.success("Empleado actualizado", { id });
        setNewPassword("");
        setOpen(false);
      } else {
        toast.error(result.error, { id });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger as React.ReactElement} />
      ) : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar empleado</DialogTitle>
          <DialogDescription>
            {user.deviceName ? (
              <>
                Nombre en el dispositivo:{" "}
                <span className="font-mono text-foreground">
                  {user.deviceName}
                </span>
              </>
            ) : (
              "Empleado sin enlace al dispositivo"
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="emp-name">Nombre</Label>
            <Input
              id="emp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-email">Correo (opcional)</Label>
              <Input
                id="emp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="empleado@lacasadelplastico.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-password">Nueva contraseña</Label>
              <Input
                id="emp-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="(dejar vacío para no cambiar)"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-rate">Tarifa por hora (₡)</Label>
              <Input
                id="emp-rate"
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="2500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-salary">Salario mensual (₡)</Label>
              <Input
                id="emp-salary"
                type="number"
                step="0.01"
                min="0"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                placeholder="450000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-hire">Fecha de ingreso</Label>
              <Input
                id="emp-hire"
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                1 día de vacaciones por mes completo desde esta fecha.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-cutoff">Tardanza después de</Label>
              <Input
                id="emp-cutoff"
                type="time"
                value={lateCutoff}
                onChange={(e) => setLateCutoff(e.target.value)}
                placeholder="08:00"
              />
              <p className="text-[11px] text-muted-foreground">
                Dejar vacío para usar el global (08:00).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-dept">Departamento</Label>
              <Select
                value={department}
                onValueChange={(v) =>
                  setDepartment((v ?? "PRODUCCION") as Department)
                }
              >
                <SelectTrigger id="emp-dept">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {DEPARTMENT_LABEL[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-role">Rol</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole((v ?? "EMPLOYEE") as Role)}
              >
                <SelectTrigger id="emp-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">
                    {ROLE_LABEL.EMPLOYEE}
                  </SelectItem>
                  <SelectItem value="ADMIN">{ROLE_LABEL.ADMIN}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-status">Estado</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus((v ?? "ACTIVE") as UserStatus)
                }
              >
                <SelectTrigger id="emp-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">
                    {USER_STATUS_LABEL.ACTIVE}
                  </SelectItem>
                  <SelectItem value="INACTIVE">
                    {USER_STATUS_LABEL.INACTIVE}
                  </SelectItem>
                  <SelectItem value="ARCHIVED">
                    {USER_STATUS_LABEL.ARCHIVED}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={pending} />
              }
            >
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
