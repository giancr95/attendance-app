"use client";

import { useTransition } from "react";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { syncDeviceUsers } from "@/lib/sync-actions";

export function SyncUsersButton() {
  const [pending, start] = useTransition();

  function handleClick() {
    start(async () => {
      const id = toast.loading("Sincronizando usuarios desde MB10-VL…");
      const result = await syncDeviceUsers();
      if (result.ok) {
        toast.success(
          `Sincronización completada · ${result.created} nuevo(s), ${result.updated} actualizado(s)`,
          { id }
        );
      } else {
        toast.error(`Error: ${result.error}`, { id });
      }
    });
  }

  return (
    <Button onClick={handleClick} disabled={pending}>
      <RefreshCwIcon
        className={`size-4 ${pending ? "animate-spin" : ""}`}
      />
      <span>Sincronizar usuarios</span>
    </Button>
  );
}
