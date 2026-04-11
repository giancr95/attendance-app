"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPermit } from "@/lib/permit-actions";
import { PERMIT_TYPE_LABEL } from "@/lib/labels";
import type { PermitType } from "@/generated/prisma/client";

const PERMIT_TYPES: PermitType[] = [
  "MEDICAL",
  "EARLY_LEAVE",
  "LATE_ARRIVAL",
  "FAMILY",
  "PERSONAL",
  "OTHER",
];

type EmployeeOption = { id: string; name: string };

type Props = {
  employees: EmployeeOption[];
};

export function NewPermitDialog({ employees }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [userId, setUserId] = useState<string>(employees[0]?.id ?? "");
  const [type, setType] = useState<PermitType>("MEDICAL");
  const [hours, setHours] = useState<string>("");
  const [paid, setPaid] = useState<boolean>(true);
  // Base UI's Select passes `string | null` to onValueChange; coerce to "".
  const pickString = (setter: (v: string) => void) => (v: string | null) =>
    setter(v ?? "");
  const [date, setDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );
  const [duration, setDuration] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  function reset() {
    setUserId(employees[0]?.id ?? "");
    setType("MEDICAL");
    setDate(new Date().toISOString().slice(0, 10));
    setDuration("");
    setReason("");
    setHours("");
    setPaid(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const id = toast.loading("Creando permiso…");
      const result = await createPermit({
        userId,
        type,
        date,
        duration,
        reason,
        hours: hours.trim() === "" ? null : Number(hours),
        paid,
      });
      if (result.ok) {
        toast.success("Permiso creado", { id });
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
          <Button>
            <PlusIcon className="size-4" />
            Nuevo permiso
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo permiso</DialogTitle>
          <DialogDescription>
            Registra una solicitud de permiso para un empleado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="permit-employee">Empleado</Label>
            <Select value={userId} onValueChange={pickString(setUserId)}>
              <SelectTrigger id="permit-employee">
                <SelectValue placeholder="Seleccionar empleado…" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="permit-type">Tipo</Label>
            <Select
              value={type}
              onValueChange={(v) => setType((v ?? "MEDICAL") as PermitType)}
            >
              <SelectTrigger id="permit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERMIT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {PERMIT_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="permit-date">Fecha</Label>
              <Input
                id="permit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="permit-duration">Duración</Label>
              <Input
                id="permit-duration"
                placeholder="2 horas"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="permit-hours">Horas pagables</Label>
              <Input
                id="permit-hours"
                type="number"
                step="0.25"
                min="0"
                max="24"
                placeholder="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Se suman a nómina si el permiso está marcado como pagado.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="select-none">Salario</Label>
              <label className="flex items-center gap-2 py-1 text-sm">
                <Checkbox
                  checked={paid}
                  onCheckedChange={(v) => setPaid(v === true)}
                />
                <span>Con goce de salario</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="permit-reason">Motivo</Label>
            <Input
              id="permit-reason"
              placeholder="Cita médica en Liberia"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
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
              {pending ? "Creando…" : "Crear permiso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
