"use client";

import { useState, useTransition } from "react";
import { CheckIcon, XIcon } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { reviewVacation } from "@/lib/vacation-actions";
import {
  VACATION_STATUS_LABEL,
  VACATION_TYPE_LABEL,
  DEPARTMENT_LABEL,
} from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type {
  Department,
  VacationStatus,
  VacationType,
} from "@/generated/prisma/client";

type Props = {
  vacation: {
    id: string;
    type: VacationType;
    startDate: Date;
    endDate: Date;
    days: number;
    notes: string | null;
    status: VacationStatus;
    user: { name: string; department: Department };
    reviewer: { name: string } | null;
    reviewedAt: Date | null;
  };
};

export function VacationReviewDialog({ vacation }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const isPending = vacation.status === "PENDING";

  function handleReview(status: VacationStatus) {
    start(async () => {
      const id = toast.loading(
        status === "APPROVED" ? "Aprobando…" : "Rechazando…"
      );
      const result = await reviewVacation(vacation.id, status);
      if (result.ok) {
        toast.success(
          status === "APPROVED" ? "Aprobada" : "Rechazada",
          { id }
        );
        setOpen(false);
      } else {
        toast.error(result.error, { id });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" className="text-xs" />}
      >
        {isPending ? "Revisar" : "Ver"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{vacation.user.name}</DialogTitle>
          <DialogDescription>
            {DEPARTMENT_LABEL[vacation.user.department]} ·{" "}
            {VACATION_TYPE_LABEL[vacation.type]} · {vacation.days} día
            {vacation.days === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>

        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Inicio</dt>
            <dd>{formatDate(vacation.startDate)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Fin</dt>
            <dd>{formatDate(vacation.endDate)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Estado</dt>
            <dd>
              <Badge
                className={
                  vacation.status === "APPROVED"
                    ? "bg-green-600 text-white"
                    : vacation.status === "REJECTED"
                    ? ""
                    : "bg-foreground text-background"
                }
                variant={
                  vacation.status === "REJECTED" ? "destructive" : undefined
                }
              >
                {VACATION_STATUS_LABEL[vacation.status]}
              </Badge>
            </dd>
          </div>
          {vacation.notes ? (
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">Notas</dt>
              <dd className="rounded-md border bg-muted/30 px-3 py-2">
                {vacation.notes}
              </dd>
            </div>
          ) : null}
          {vacation.reviewer && vacation.reviewedAt ? (
            <div className="flex justify-between text-xs text-muted-foreground">
              <dt>Revisado por</dt>
              <dd>
                {vacation.reviewer.name} · {formatDate(vacation.reviewedAt)}
              </dd>
            </div>
          ) : null}
        </dl>

        <DialogFooter>
          {isPending ? (
            <>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => handleReview("REJECTED")}
              >
                <XIcon className="size-4" />
                Rechazar
              </Button>
              <Button
                disabled={pending}
                onClick={() => handleReview("APPROVED")}
              >
                <CheckIcon className="size-4" />
                Aprobar
              </Button>
            </>
          ) : (
            <DialogClose render={<Button variant="outline" />}>
              Cerrar
            </DialogClose>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
