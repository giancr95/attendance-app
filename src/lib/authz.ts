// Server-side authorization helpers for App Router pages.
//
// `(app)/layout.tsx` already guarantees a logged-in session, but each page
// is the source of truth for its own role gate. Admin-only pages call
// `requireAdmin()` at the top so an EMPLOYEE who types the URL directly is
// bounced back to their portal instead of seeing org-wide data.
import "server-only";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/client";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
};

/** Returns the logged-in user, or redirects to /login if there isn't one. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    role: session.user.role,
  };
}

/**
 * Gate an admin-only page. Employees are redirected to their portal (/);
 * unauthenticated requests go to /login.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect("/");
  }
  return user;
}
