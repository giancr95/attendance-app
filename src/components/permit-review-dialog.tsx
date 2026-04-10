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
import { reviewPermit } from "@/lib/permit-actions";
import {
  PERMIT_STATUS_LABEL,
  PERMIT_TYPE_LABEL,
  DEPARTMENT_LABEL,
} from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type {
  Department,
  PermitStatus,
  PermitType,
} from "@/generated/prisma/client";

type Props = {
  permit: {
    id: string;
    type: PermitType;
    date: Date;
    duration: string;
    reason: string;
    status: PermitStatus;
    user: { name: string; department: Department };
    reviewer: { name: string } | null;
    reviewedAt: Date | null;
  };
};

export function PermitReviewDialog({ permit }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const isPending = permit.status === "PENDING";

  function handleReview(status: PermitStatus) {
    start(async () => {
      const id = toast.loading(
        status === "APPROVED" ? "Aprobando…" : "Rechazando…"
      );
      const result = await reviewPermit(permit.id, status);
      if (result.ok) {
        toast.success(
          status === "APPROVED" ? "Permiso aprobado" : "Permiso rechazado",
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
        render={
          <Button variant="ghost" size="sm" className="text-xs" />
        }
      >
        {isPending ? "Revisar" : "Ver"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{permit.user.name}</DialogTitle>
          <DialogDescription>
            {DEPARTMENT_LABEL[permit.user.department]} ·{" "}
            {PERMIT_TYPE_LABEL[permit.type]} · {permit.duration}
          </DialogDescription>
        </DialogHeader>

        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Fecha</dt>
            <dd>{formatDate(permit.date)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Estado</dt>
            <dd>
              <Badge
                className={
                  permit.status === "APPROVED"
                    ? "bg-green-600 text-white"
                    : permit.status === "DENIED"
                    ? ""
                    : "bg-foreground text-background"
                }
                variant={permit.status === "DENIED" ? "destructive" : undefined}
              >
                {PERMIT_STATUS_LABEL[permit.status]}
              </Badge>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Motivo</dt>
            <dd className="rounded-md border bg-muted/30 px-3 py-2">
              {permit.reason}
            </dd>
          </div>
          {permit.reviewer && permit.reviewedAt ? (
            <div className="flex justify-between text-xs text-muted-foreground">
              <dt>Revisado por</dt>
              <dd>
                {permit.reviewer.name} · {formatDate(permit.reviewedAt)}
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
                onClick={() => handleReview("DENIED")}
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
