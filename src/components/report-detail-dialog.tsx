"use client";

import { useState } from "react";

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
import { cn } from "@/lib/utils";

export type DetailEntry = {
  date: string;          // "lunes, 14 de abril" etc. (pre-formatted)
  label?: string;        // e.g. "07:58" for tardanza, "72 min" for lunch
  subtext?: string;      // small secondary info
};

type Props = {
  count: number;
  entries: DetailEntry[];
  /** Dialog title, e.g. "Días ausente" */
  title: string;
  /** Subject of the list, e.g. "Hector Cordoba" */
  subject: string;
  /** Color tone to style the count number when > 0 */
  tone?: "danger" | "warning" | "amber";
};

const TONE_CLASS: Record<NonNullable<Props["tone"]>, string> = {
  danger: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  amber: "text-amber-600 dark:text-amber-400",
};

/**
 * Renders a count that's clickable if > 0; clicking opens a dialog
 * listing the specific days that contributed to that count.
 */
export function ReportDetailDialog({
  count,
  entries,
  title,
  subject,
  tone,
}: Props) {
  const [open, setOpen] = useState(false);

  if (count === 0) {
    return <span className="font-mono text-sm">0</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "font-mono text-sm underline-offset-2 hover:underline",
          tone ? TONE_CLASS[tone] : undefined
        )}
      >
        {count}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {subject} · {count} {count === 1 ? "día" : "días"}
            </DialogDescription>
          </DialogHeader>

          <ul className="flex max-h-80 flex-col divide-y overflow-auto">
            {entries.length === 0 ? (
              <li className="py-4 text-center text-sm text-muted-foreground">
                Sin detalle disponible.
              </li>
            ) : (
              entries.map((e, i) => (
                <li
                  key={`${e.date}-${i}`}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="first-letter:uppercase">{e.date}</div>
                    {e.subtext ? (
                      <div className="text-xs text-muted-foreground">
                        {e.subtext}
                      </div>
                    ) : null}
                  </div>
                  {e.label ? (
                    <div
                      className={cn(
                        "font-mono text-xs",
                        tone ? TONE_CLASS[tone] : "text-muted-foreground"
                      )}
                    >
                      {e.label}
                    </div>
                  ) : null}
                </li>
              ))
            )}
          </ul>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cerrar
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
