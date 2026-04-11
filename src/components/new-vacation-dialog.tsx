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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createVacation } from "@/lib/vacation-actions";
import { VACATION_TYPE_LABEL } from "@/lib/labels";
import type { VacationType } from "@/generated/prisma/client";

const VACATION_TYPES: VacationType[] = ["ANUAL", "PERSONAL", "SICK"];

type EmployeeOption = { id: string; name: string };

type Props = {
  employees: EmployeeOption[];
};

export function NewVacationDialog({ employees }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const today = () => new Date().toISOString().slice(0, 10);

  const [userId, setUserId] = useState<string>(employees[0]?.id ?? "");
  const [type, setType] = useState<VacationType>("ANUAL");
  // Base UI's Select passes `string | null` to onValueChange; coerce to "".
  const pickString = (setter: (v: string) => void) => (v: string | null) =>
    setter(v ?? "");
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [notes, setNotes] = useState<string>("");

  function reset() {
    setUserId(employees[0]?.id ?? "");
    setType("ANUAL");
    setStartDate(today());
    setEndDate(today());
    setNotes("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const id = toast.loading("Creando solicitud…");
      const result = await createVacation({
        userId,
        type,
        startDate,
        endDate,
        notes: notes || undefined,
      });
      if (result.ok) {
        toast.success("Solicitud creada", { id });
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
            Solicitar vacaciones
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva solicitud de vacaciones</DialogTitle>
          <DialogDescription>
            Registra un período de vacaciones para revisión.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vac-employee">Empleado</Label>
            <Select value={userId} onValueChange={pickString(setUserId)}>
              <SelectTrigger id="vac-employee">
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
            <Label htmlFor="vac-type">Tipo</Label>
            <Select
              value={type}
              onValueChange={(v) => setType((v ?? "ANUAL") as VacationType)}
            >
              <SelectTrigger id="vac-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VACATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {VACATION_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vac-start">Inicio</Label>
              <Input
                id="vac-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vac-end">Fin</Label>
              <Input
                id="vac-end"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vac-notes">Notas (opcional)</Label>
            <Input
              id="vac-notes"
              placeholder="Vacaciones familiares"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              {pending ? "Creando…" : "Crear solicitud"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
