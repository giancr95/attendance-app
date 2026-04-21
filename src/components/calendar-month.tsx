"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  RepeatIcon,
  TrashIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NewEventDialog, EVENT_KIND_LABEL } from "@/components/new-event-dialog";
import { deleteEvent } from "@/lib/event-actions";
import { cn } from "@/lib/utils";
import type {
  EventKind,
  EventRecurrence,
} from "@/generated/prisma/client";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  dateKey: string; // YYYY-MM-DD in CR (projected to current year for YEARLY)
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  kind: EventKind;
  recurrence: EventRecurrence;
  createdBy: { name: string } | null;
};

type Props = {
  /** Year-month currently rendered, YYYY-MM (from the URL). */
  ym: string;
  /** Today's date in CR (YYYY-MM-DD) for highlighting. */
  todayKey: string;
  /** All events that overlap this month. */
  events: CalendarEvent[];
  /** Is the viewer allowed to create/delete events? */
  canEdit: boolean;
};

const WEEKDAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Background + border classes per event kind. Purposely soft so a day
// full of events doesn't look alarming.
const KIND_CLASS: Record<EventKind, string> = {
  GENERAL: "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200",
  MEETING:
    "bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-200",
  HOLIDAY:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
  TRAINING:
    "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  DEADLINE: "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200",
  BIRTHDAY:
    "bg-pink-100 text-pink-900 dark:bg-pink-500/20 dark:text-pink-200",
  OTHER:
    "bg-slate-100 text-slate-900 dark:bg-slate-500/20 dark:text-slate-200",
};

/** Parse YYYY-MM into year/month numbers. */
function parseYM(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-").map((n) => Number.parseInt(n, 10));
  return { year: y, month: m };
}

/**
 * Pretty-print a YYYY-MM-DD key as "sábado, 25 de abril de 2026".
 * Builds the Date from integer Y/M/D so we never rely on string-parsing
 * timezone interpretation (which varies across browsers / OS locales).
 */
function formatDayKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map((n) => Number.parseInt(n, 10));
  const localDate = new Date(y, m - 1, d);
  return localDate.toLocaleDateString("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function monthName(year: number, month: number) {
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toLocaleDateString("es-CR", { month: "long", year: "numeric" });
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/**
 * Build the 6-row × 7-col grid for a given month, Monday-first.
 * Returns an array of 42 day cells (some from prev/next month).
 */
function buildGrid(year: number, month: number): Array<{
  dateKey: string;
  dayNum: number;
  inMonth: boolean;
}> {
  const first = new Date(Date.UTC(year, month - 1, 1));
  // Monday-first: Mon=0, Sun=6
  const firstDow = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<{ dateKey: string; dayNum: number; inMonth: boolean }> = [];

  // Previous-month tail
  const prevLastDay = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = prevLastDay - i;
    const py = month === 1 ? year - 1 : year;
    const pm = month === 1 ? 12 : month - 1;
    cells.push({
      dateKey: `${py}-${pad(pm)}-${pad(d)}`,
      dayNum: d,
      inMonth: false,
    });
  }
  // This month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      dateKey: `${year}-${pad(month)}-${pad(d)}`,
      dayNum: d,
      inMonth: true,
    });
  }
  // Next-month fill to 42
  let nd = 1;
  while (cells.length < 42) {
    const ny = month === 12 ? year + 1 : year;
    const nm = month === 12 ? 1 : month + 1;
    cells.push({
      dateKey: `${ny}-${pad(nm)}-${pad(nd)}`,
      dayNum: nd,
      inMonth: false,
    });
    nd++;
  }
  return cells;
}

export function CalendarMonth({ ym, todayKey, events, canEdit }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [creatingForDay, setCreatingForDay] = useState<string | null>(null);

  const { year, month } = useMemo(() => parseYM(ym), [ym]);
  const grid = useMemo(() => buildGrid(year, month), [year, month]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      if (!m.has(e.dateKey)) m.set(e.dateKey, []);
      m.get(e.dateKey)!.push(e);
    }
    // Sort intra-day by start time
    for (const arr of m.values()) {
      arr.sort((a, b) =>
        (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99")
      );
    }
    return m;
  }, [events]);

  function goto(delta: number) {
    let y = year;
    let m = month + delta;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    const next = new URLSearchParams(params.toString());
    next.set("m", `${y}-${pad(m)}`);
    startTransition(() => router.replace(`/calendario?${next.toString()}`));
  }

  function gotoToday() {
    const next = new URLSearchParams(params.toString());
    next.delete("m");
    startTransition(() => router.replace(`/calendario?${next.toString()}`));
  }

  const selectedEvents = selectedDay
    ? eventsByDay.get(selectedDay) ?? []
    : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Month nav */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={() => goto(-1)}>
          <ChevronLeftIcon className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => goto(1)}>
          <ChevronRightIcon className="size-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={gotoToday}>
          Hoy
        </Button>
        <h2 className="ml-2 text-lg font-semibold tracking-tight first-letter:uppercase">
          {monthName(year, month)}
        </h2>
        {canEdit ? (
          <div className="ml-auto">
            <NewEventDialog defaultDate={todayKey} />
          </div>
        ) : null}
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px rounded-t-md border border-border bg-border overflow-hidden">
        {WEEKDAY_HEADERS.map((d) => (
          <div
            key={d}
            className="bg-muted px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="-mt-4 grid grid-cols-7 gap-px rounded-b-md border-x border-b border-border bg-border overflow-hidden">
        {grid.map((cell) => {
          const dayEvents = eventsByDay.get(cell.dateKey) ?? [];
          const isToday = cell.dateKey === todayKey;
          return (
            <button
              type="button"
              key={cell.dateKey}
              onClick={() => setSelectedDay(cell.dateKey)}
              className={cn(
                "group flex min-h-[88px] flex-col items-stretch gap-1 bg-background p-1.5 text-left transition-colors hover:bg-muted/50",
                !cell.inMonth && "text-muted-foreground/60 bg-muted/30",
                isToday && "bg-primary/5 ring-1 ring-inset ring-primary/30"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-medium tabular-nums",
                    isToday &&
                      "inline-flex size-5 items-center justify-center rounded-full bg-foreground text-background"
                  )}
                >
                  {cell.dayNum}
                </span>
                {dayEvents.length > 0 ? (
                  <span className="text-[10px] text-muted-foreground">
                    {dayEvents.length}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className={cn(
                      "flex items-center gap-1 truncate rounded-sm px-1 py-0.5 text-[11px] leading-tight",
                      KIND_CLASS[e.kind]
                    )}
                    title={
                      e.recurrence === "YEARLY"
                        ? `${e.title} (anual)`
                        : e.title
                    }
                  >
                    {e.recurrence === "YEARLY" ? (
                      <RepeatIcon className="size-2.5 shrink-0 opacity-70" />
                    ) : null}
                    <span className="truncate">
                      {e.startTime ? `${e.startTime} ` : ""}
                      {e.title}
                    </span>
                  </span>
                ))}
                {dayEvents.length > 3 ? (
                  <span className="px-1 text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3} más
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day detail dialog */}
      <Dialog
        open={selectedDay != null}
        onOpenChange={(v) => !v && setSelectedDay(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="first-letter:uppercase">
              {selectedDay
                ? formatDayKey(selectedDay)
                : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedEvents.length === 0
                ? "No hay eventos este día."
                : `${selectedEvents.length} evento${
                    selectedEvents.length === 1 ? "" : "s"
                  }.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            {selectedEvents.map((e) => (
              <EventRow key={e.id} event={e} canEdit={canEdit} />
            ))}
          </div>

          <DialogFooter>
            {canEdit && selectedDay ? (
              <Button
                onClick={() => {
                  setCreatingForDay(selectedDay);
                  setSelectedDay(null);
                }}
              >
                Agregar evento
              </Button>
            ) : null}
            <DialogClose render={<Button variant="outline" />}>
              Cerrar
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Controlled-open new-event dialog for day-specific creation */}
      {creatingForDay ? (
        <NewEventDialog
          key={creatingForDay}
          defaultDate={creatingForDay}
          open={true}
          onOpenChange={(v) => !v && setCreatingForDay(null)}
        />
      ) : null}
    </div>
  );
}

// ─────────────────────────── EventRow ───────────────────────────

function EventRow({
  event,
  canEdit,
}: {
  event: CalendarEvent;
  canEdit: boolean;
}) {
  const [pending, start] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  function handleDelete() {
    if (!confirm(`¿Eliminar el evento "${event.title}"?`)) return;
    start(async () => {
      const id = toast.loading("Eliminando…");
      const r = await deleteEvent(event.id);
      if (r.ok) toast.success("Evento eliminado", { id });
      else toast.error(r.error, { id });
    });
  }

  const timeLabel =
    event.startTime && event.endTime
      ? `${event.startTime} – ${event.endTime}`
      : event.startTime
      ? event.startTime
      : "Todo el día";

  return (
    <>
      <div
        className={cn(
          "flex items-start justify-between gap-2 rounded-md border border-border/60 p-2.5",
          KIND_CLASS[event.kind]
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{event.title}</span>
            <Badge variant="outline" className="text-[10px]">
              {EVENT_KIND_LABEL[event.kind]}
            </Badge>
            {event.recurrence === "YEARLY" ? (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <RepeatIcon className="size-2.5" />
                Anual
              </Badge>
            ) : null}
          </div>
          <div className="mt-0.5 text-xs opacity-80">
            {timeLabel}
            {event.location ? ` · ${event.location}` : ""}
          </div>
          {event.description ? (
            <div className="mt-1 text-xs opacity-80">{event.description}</div>
          ) : null}
          {event.createdBy?.name ? (
            <div className="mt-1 text-[10px] opacity-60">
              por {event.createdBy.name}
            </div>
          ) : null}
        </div>
        {canEdit ? (
          <div className="flex flex-col gap-0.5 sm:flex-row">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pending}
              onClick={() => setEditOpen(true)}
              aria-label="Editar"
            >
              <PencilIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pending}
              onClick={handleDelete}
              aria-label="Eliminar"
            >
              <TrashIcon className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>

      {/* Controlled edit dialog rendered alongside the row. */}
      {editOpen ? (
        <NewEventDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          event={{
            id: event.id,
            title: event.title,
            description: event.description,
            dateKey: event.dateKey,
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
            kind: event.kind,
            recurrence: event.recurrence,
          }}
        />
      ) : null}
    </>
  );
}
