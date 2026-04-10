"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  start: string;
  end: string;
  userId: string;
  employees: Array<{ id: string; name: string }>;
};

const ALL = "__all__";

export function RawDataFilters({ start, end, userId, employees }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(field: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "" || value === ALL) {
      next.delete(field);
    } else {
      next.set(field, value);
    }
    startTransition(() => router.replace(`/raw?${next.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="raw-employee">Empleado</Label>
        <Select
          value={userId || ALL}
          onValueChange={(v) => update("userId", v)}
        >
          <SelectTrigger id="raw-employee" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los empleados</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="raw-start">Desde</Label>
        <Input
          id="raw-start"
          type="date"
          value={start}
          max={end}
          onChange={(e) => update("start", e.target.value)}
          disabled={pending}
          className="w-44"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="raw-end">Hasta</Label>
        <Input
          id="raw-end"
          type="date"
          value={end}
          min={start}
          onChange={(e) => update("end", e.target.value)}
          disabled={pending}
          className="w-44"
        />
      </div>
    </div>
  );
}
