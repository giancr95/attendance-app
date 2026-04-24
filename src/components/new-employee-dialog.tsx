"use client";

import { useState, useTransition } from "react";
import { UserPlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { createEmployee } from "@/lib/user-actions";
import {
  DEPARTMENT_LABEL,
  DEPARTMENT_OPTIONS,
} from "@/lib/labels";
import { parseLateCutoff } from "@/lib/rules";
import type { Department } from "@/generated/prisma/client";

export function NewEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [name, setName] = useState("");
  const [department, setDepartment] = useState<Department>("PRODUCCION");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [lateCutoff, setLateCutoff] = useState("");

  // Clock integration — when checked, the user's PIN on the clock must
  // be provided. When unchecked, the employee is manual-entry only.
  const [onClock, setOnClock] = useState(false);
  const [deviceUserId, setDeviceUserId] = useState("");

  function reset() {
    setName("");
    setDepartment("PRODUCCION");
    setEmail("");
    setPassword("");
    setHireDate("");
    setHourlyRate("");
    setMonthlySalary("");
    setLateCutoff("");
    setOnClock(false);
    setDeviceUserId("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      // Validate late cutoff if entered
      let lateCutoffMin: number | null = null;
      if (lateCutoff.trim() !== "") {
        const parsed = parseLateCutoff(lateCutoff);
        if (parsed == null) {
          toast.error("Hora de tardanza inválida (use HH:MM)");
          return;
        }
        lateCutoffMin = parsed;
      }

      // If on clock, require the PIN
      let devUid: number | null = null;
      if (onClock) {
        const n = Number.parseInt(deviceUserId, 10);
        if (!Number.isFinite(n) || n <= 0) {
          toast.error("Debe ingresar el PIN en el reloj (entero positivo)");
          return;
        }
        devUid = n;
      }

      const id = toast.loading("Creando empleado…");
      const result = await createEmployee({
        name,
        department,
        email: email || undefined,
        password: password || undefined,
        hireDate: hireDate ? new Date(`${hireDate}T00:00:00-06:00`) : null,
        hourlyRate: hourlyRate.trim() === "" ? null : Number(hourlyRate),
        monthlySalary:
          monthlySalary.trim() === "" ? null : Number(monthlySalary),
        lateCutoffMin,
        deviceUserId: devUid,
      });

      if (result.ok) {
        toast.success("Empleado creado", { id });
        reset();
        setOpen(false);
      } else {
        toast.error(result.error, { id });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <UserPlusIcon className="size-4" />
            Nuevo empleado
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo empleado</DialogTitle>
          <DialogDescription>
            Si el empleado aún no está registrado en el reloj biométrico,
            desmarca la casilla — sus marcajes se pueden ingresar manualmente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="emp-new-name">Nombre</Label>
            <Input
              id="emp-new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Nombre Completo"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-new-dept">Departamento</Label>
              <Select
                value={department}
                onValueChange={(v) =>
                  setDepartment((v ?? "PRODUCCION") as Department)
                }
              >
                <SelectTrigger id="emp-new-dept">
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
              <Label htmlFor="emp-new-hire">Fecha de ingreso</Label>
              <Input
                id="emp-new-hire"
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={onClock}
                onCheckedChange={(v) => setOnClock(v === true)}
              />
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">
                  Registrado en el reloj biométrico
                </span>
                <span className="text-xs text-muted-foreground">
                  Marca si el empleado ya tiene un PIN en el MB10-VL. Si no,
                  podrás agregar sus marcajes manualmente.
                </span>
              </div>
            </label>
            {onClock ? (
              <div className="mt-3 flex flex-col gap-1.5">
                <Label htmlFor="emp-new-pin">PIN en el reloj</Label>
                <Input
                  id="emp-new-pin"
                  type="number"
                  min="1"
                  value={deviceUserId}
                  onChange={(e) => setDeviceUserId(e.target.value)}
                  placeholder="11"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  El PIN es el número que marcas en el reloj (ej. 1, 2, 3…).
                </p>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-new-rate">Tarifa por hora (₡)</Label>
              <Input
                id="emp-new-rate"
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="2500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-new-salary">Salario mensual (₡)</Label>
              <Input
                id="emp-new-salary"
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
              <Label htmlFor="emp-new-email">Correo (opcional)</Label>
              <Input
                id="emp-new-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="empleado@lacasadelplastico.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-new-password">Contraseña (opcional)</Label>
              <Input
                id="emp-new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="emp-new-cutoff">Tardanza después de (HH:MM)</Label>
            <Input
              id="emp-new-cutoff"
              type="time"
              value={lateCutoff}
              onChange={(e) => setLateCutoff(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Dejar vacío para usar el global (07:55).
            </p>
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={pending} />
              }
            >
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Creando…" : "Crear empleado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
