"use client";

import Link from "next/link";
import { useTransition } from "react";
import { LogOutIcon, UserIcon } from "lucide-react";

import { logoutAction } from "@/lib/auth-actions";
import { ROLE_LABEL } from "@/lib/labels";
import type { Role } from "@/generated/prisma/client";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  name: string;
  email?: string | null;
  role: Role;
};

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function UserMenu({ name, email, role }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-9 gap-2 rounded-full px-1.5 pr-3"
            aria-label="Cuenta"
          />
        }
      >
        <Avatar className="size-7">
          <AvatarFallback>{initialsFrom(name)}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium sm:inline">{name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{name}</span>
          {email ? (
            <span className="text-xs text-muted-foreground">{email}</span>
          ) : null}
          <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {ROLE_LABEL[role] ?? role}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/perfil" />}>
          <UserIcon className="mr-2 size-4" />
          Mi perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onClick={(event) => {
            // Base UI closes the menu on click; run the logout server action
            // in a transition so the redirect isn't lost when the popup
            // unmounts. (A nested <form> submit inside a menu item is flaky.)
            event.preventDefault();
            startTransition(async () => {
              await logoutAction();
            });
          }}
        >
          <LogOutIcon className="mr-2 size-4" />
          {pending ? "Cerrando sesión…" : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
