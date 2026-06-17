"use client";

import Link from "next/link";
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
  return (
    <DropdownMenu>
      {/* Content lives INSIDE the Button render element (same pattern as
          employee-row-actions, which works with this Base UI version). */}
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-9 gap-2 rounded-full px-1.5 pr-3"
            aria-label="Cuenta"
          >
            <Avatar className="size-7">
              <AvatarFallback>{initialsFrom(name)}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{name}</span>
          </Button>
        }
      />
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
        {/*
          Logout via a server-action <form>. This is the canonical Auth.js v5
          App Router sign-out: the action issues a RELATIVE redirect to /login
          (no proxy host-mismatch like the next-auth/react client signOut), and
          form submits reliably follow server-action redirects. We use a plain
          styled submit button (not a Base UI Menu.Item) so the submit can't be
          swallowed by the menu's click handling.
        */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="group/dropdown-menu-item relative flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm text-destructive outline-none transition-colors select-none hover:bg-destructive/10 focus-visible:bg-destructive/10 dark:hover:bg-destructive/20"
          >
            <LogOutIcon className="mr-2 size-4" />
            Cerrar sesión
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
