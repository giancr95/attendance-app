"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";
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
  DialogTrigger,
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
import { createEvent, updateEvent } from "@/lib/event-actions";
import type { EventKind } from "@/generated/prisma/client";

const KIND_LABEL: Record<EventKind, string> = {
  GENERAL: "General",
  MEETING: "Reunión",
  HOLIDAY: "Feriado",
  TRAINING: "Capacitación",
  DEADLINE: "Fecha límite",
  BIRTHDAY: "Cumpleaños",
  OTHER: "Otro",
};

const KIND_OPTIONS: EventKind[] = [
  "GENERAL",
  "MEETING",
  "HOLIDAY",
  "TRAINING",
  "DEADLINE",
  "BIRTHDAY",
  "OTHER",
];

export type EventFormEvent = {
  id: string;
  title: string;
  description: string | null;
  /** YYYY-MM-DD in CR local. */
  dateKey: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  kind: EventKind;
  recurrence: "NONE" | "YEARLY";
};

type Props = {
  /** Pre-selected date (YYYY-MM-DD). Defaults to today (CR). */
  defaultDate?: string;
  /** If true, render a compact inline "+" button instead of the full trigger. */
  compact?: boolean;
  /** Controlled open state (for programmatic open from calendar cells). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When provided, the dialog switches to edit mode for this event. */
  event?: EventFormEvent;
};

function todayCr(): string {
  const now = new Date();
  const shifted = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export function NewEventDialog({
  defaultDate,
  compact,
  open: controlledOpen,
  onOpenChange,
  event,
}: Props) {
  const isEdit = event != null;

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [pending, start] = useTransition();

  const [title, setTitle] = useState(event?.title ?? "");
  const [kind, setKind] = useState<EventKind>(event?.kind ?? "GENERAL");
  const [date, setDate] = useState<string>(
    event?.dateKey ?? defaultDate ?? todayCr()
  );
  const [startTime, setStartTime] = useState(event?.startTime ?? "");
  const [endTime, setEndTime] = useState(event?.endTime ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [yearly, setYearly] = useState<boolean>(
    event?.recurrence === "YEARLY"
  );

  // Birthdays almost always recur yearly — flip the default whenever the
  // user picks that kind (without locking it; they can still uncheck).
  function handleKindChange(k: EventKind) {
    setKind(k);
    if (k === "BIRTHDAY") setYearly(true);
  }

  function reset() {
    // Only reset to blank when we're creating; in edit mode keep the
    // event's own values so reopening the dialog shows them again.
    if (isEdit && event) {
      setTitle(event.title);
      setKind(event.kind);
      setDate(event.dateKey);
      setStartTime(event.startTime ?? "");
      setEndTime(event.endTime ?? "");
      setLocation(event.location ?? "");
      setDescription(event.description ?? "");
      setYearly(event.recurrence === "YEARLY");
    } else {
      setTitle("");
      setKind("GENERAL");
      setDate(defaultDate ?? todayCr());
      setStartTime("");
      setEndTime("");
      setLocation("");
      setDescription("");
      setYearly(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const id = toast.loading(isEdit ? "Guardando…" : "Creando evento…");
      const payload = {
        title,
        kind,
        date,
        startTime: startTime || null,
        endTime: endTime || null,
        location: location || null,
        description: description || null,
        recurrence: (yearly ? "YEARLY" : "NONE") as "YEARLY" | "NONE",
      };
      const result = isEdit
        ? await updateEvent({ id: event!.id, ...payload })
        : await createEvent(payload);
      if (result.ok) {
        toast.success(isEdit ? "Evento actualizado" : "Evento creado", { id });
        if (!isEdit) reset();
        setOpen(false);
      } else {
        toast.error(result.error, { id });
      }
    });
  }

  const triggerNode = compact ? (
    <Button size="icon-sm" variant="ghost" aria-label="Agregar evento">
      <PlusIcon className="size-4" />
    </Button>
  ) : (
    <Button>
      <PlusIcon className="size-4" />
      Nuevo evento
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined ? (
        <DialogTrigger render={triggerNode} />
      ) : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar evento" : "Nuevo evento"}</DialogTitle>
          <DialogDescription>
            Visible para todos los empleados en el calendario.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-title">Título</Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Reunión quincenal"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-date">Fecha</Label>
              <Input
                id="ev-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-kind">Tipo</Label>
              <Select
                value={kind}
                onValueChange={(v) =>
                  handleKindChange((v ?? "GENERAL") as EventKind)
                }
              >
                <SelectTrigger id="ev-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={yearly}
              onCheckedChange={(v) => setYearly(v === true)}
            />
            <span>Repetir cada año</span>
            <span className="text-xs text-muted-foreground">
              (mismo día del mismo mes)
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-start">Hora inicio</Label>
              <Input
                id="ev-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-end">Hora fin</Label>
              <Input
                id="ev-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-location">Lugar</Label>
            <Input
              id="ev-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Oficina / Liberia / online"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-description">Descripción</Label>
            <Input
              id="ev-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional"
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
            <Button type="submit" disabled={pending || !title.trim()}>
              {pending
                ? isEdit
                  ? "Guardando…"
                  : "Creando…"
                : isEdit
                ? "Guardar cambios"
                : "Crear evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const EVENT_KIND_LABEL = KIND_LABEL;
