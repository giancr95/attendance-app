"use client";

import { useState, useTransition } from "react";
import { ClockIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { createManualPunch } from "@/lib/manual-punch-actions";
import { PUNCH_KIND_LABEL } from "@/lib/labels";
import type { PunchKind } from "@/generated/prisma/client";

const KIND_OPTIONS: PunchKind[] = [
  "CHECK_IN",
  "CHECK_OUT",
  "BREAK_OUT",
  "BREAK_IN",
  "OT_IN",
  "OT_OUT",
  "OTHER",
];

type Props = {
  /** Employee this dialog will register the punch for. */
  user: { id: string; name: string };
  /** Controlled open state from the parent (row action). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function todayCr(): string {
  const shifted = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function nowCrTime(): string {
  const shifted = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const iso = shifted.toISOString();
  return iso.slice(11, 16); // HH:MM
}

export function ManualPunchDialog({ user, open, onOpenChange }: Props) {
  const [pending, start] = useTransition();
  const [date, setDate] = useState<string>(() => todayCr());
  const [time, setTime] = useState<string>(() => nowCrTime());
  const [kind, setKind] = useState<PunchKind>("CHECK_IN");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const id = toast.loading("Registrando marcaje…");
      const result = await createManualPunch({
        userId: user.id,
        date,
        time,
        kind,
      });
      if (result.ok) {
        toast.success("Marcaje registrado", { id });
        onOpenChange(false);
      } else {
        toast.error(result.error, { id });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Marcaje manual</DialogTitle>
          <DialogDescription>
            Para <span className="font-medium">{user.name}</span>. Solo se
            permiten marcajes manuales para empleados que no están registrados
            en el reloj.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mp-date">Fecha</Label>
              <Input
                id="mp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mp-time">Hora</Label>
              <Input
                id="mp-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mp-kind">Tipo</Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind((v ?? "CHECK_IN") as PunchKind)}
            >
              <SelectTrigger id="mp-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {PUNCH_KIND_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              El orden de los marcajes del día define entrada / almuerzo /
              salida, independiente del tipo elegido aquí.
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
            <Button type="submit" disabled={pending}>
              {pending ? "Registrando…" : (
                <>
                  <ClockIcon className="size-4" />
                  Registrar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
