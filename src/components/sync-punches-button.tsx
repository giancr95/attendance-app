"use client";

import { useTransition } from "react";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { syncDevicePunches } from "@/lib/sync-actions";

export function SyncPunchesButton() {
  const [pending, start] = useTransition();

  function handleClick() {
    start(async () => {
      const id = toast.loading("Descargando marcajes del dispositivo…");
      const result = await syncDevicePunches();
      if (result.ok) {
        toast.success(
          `${result.inserted} nuevo(s), ${result.skipped} ya importados${
            result.missingUsers
              ? ` · ${result.missingUsers} sin usuario`
              : ""
          }`,
          { id }
        );
      } else {
        toast.error(`Error: ${result.error}`, { id });
      }
    });
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={pending}>
      <RefreshCwIcon className={`size-4 ${pending ? "animate-spin" : ""}`} />
      <span>Sync Now</span>
    </Button>
  );
}
