"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
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
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            // Client-side sign-out — posts to /api/auth/signout and then
            // navigates to /login. Robust from a click handler (a server
            // action that redirects does not navigate reliably here).
            void signOut({ callbackUrl: "/login" });
          }}
        >
          <LogOutIcon className="mr-2 size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
