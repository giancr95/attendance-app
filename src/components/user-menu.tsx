"use client";

import Link from "next/link";
import { LogOutIcon, UserIcon } from "lucide-react";

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
          Logout is a plain <a> to the GET /logout route handler. A native full
          navigation can't be swallowed by the menu's click handling, doesn't
          depend on server-action/redirect mechanics, and /logout clears the
          cookie + redirects to /login using the public host. Most robust option.
        */}
        <a
          href="/logout"
          className="group/dropdown-menu-item relative flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm text-destructive no-underline outline-none transition-colors select-none hover:bg-destructive/10 focus-visible:bg-destructive/10 dark:hover:bg-destructive/20"
        >
          <LogOutIcon className="mr-2 size-4" />
          Cerrar sesión
        </a>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
