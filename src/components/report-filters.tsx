"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Props = {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
};

export function ReportFilters({ start, end }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(field: "start" | "end", value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(field, value);
    startTransition(() => {
      router.replace(`/reports?${next.toString()}`);
    });
  }

  function preset(days: number) {
    const endD = new Date();
    const startD = new Date(endD.getTime() - days * 24 * 60 * 60 * 1000);
    const next = new URLSearchParams(params.toString());
    next.set("start", startD.toISOString().slice(0, 10));
    next.set("end", endD.toISOString().slice(0, 10));
    startTransition(() => {
      router.replace(`/reports?${next.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-start">Inicio</Label>
        <Input
          id="report-start"
          type="date"
          value={start}
          max={end}
          onChange={(e) => update("start", e.target.value)}
          disabled={pending}
          className="w-44"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-end">Fin</Label>
        <Input
          id="report-end"
          type="date"
          value={end}
          min={start}
          onChange={(e) => update("end", e.target.value)}
          disabled={pending}
          className="w-44"
        />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => preset(7)}
        >
          7 días
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => preset(30)}
        >
          30 días
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => preset(90)}
        >
          Trimestre
        </Button>
      </div>
    </div>
  );
}
