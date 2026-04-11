// Server actions for managing permits (employee leave / time-off requests).
//
// Pattern (re-used by vacation-actions.ts and any future "request +
// approval" entity): a server-only module exposing one verb per state
// transition. Each action validates input with Zod, checks auth, mutates
// the DB, and revalidates the relevant page paths.
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PermitStatus, PermitType } from "@/generated/prisma/client";

// ─────────────────────────── helpers ───────────────────────────

async function getSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }
  return session;
}

async function requireAdmin() {
  const session = await getSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("Solo los administradores pueden realizar esta acción.");
  }
  return session;
}

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? {} : { data: T }))
  | { ok: false; error: string };

// ─────────────────────────── create ───────────────────────────

const CreatePermitSchema = z.object({
  userId: z.string().min(1, "Empleado requerido"),
  type: z.nativeEnum(PermitType),
  date: z.coerce.date(),
  duration: z.string().min(1, "Duración requerida").max(50),
  reason: z.string().min(3, "Motivo muy corto").max(500),
  // Payable hours for this permit. Optional — when null, the permit shows
  // up in the UI but doesn't contribute to payroll. Typical values: 1, 2,
  // 4 (half day), 8 (full day).
  hours: z.number().min(0).max(24).nullable().optional(),
  // "Con goce de salario" — defaults to true.
  paid: z.boolean().optional(),
});

export type CreatePermitInput = z.input<typeof CreatePermitSchema>;

export async function createPermit(
  input: CreatePermitInput
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const parsed = CreatePermitSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    // Non-admins can only request permits for themselves.
    const userId =
      session.user.role === "ADMIN" ? parsed.data.userId : session.user.id;

    await prisma.permit.create({
      data: {
        userId,
        type: parsed.data.type,
        date: parsed.data.date,
        duration: parsed.data.duration,
        reason: parsed.data.reason,
        hours: parsed.data.hours ?? null,
        paid: parsed.data.paid ?? true,
        status: PermitStatus.PENDING,
      },
    });

    revalidatePath("/permits");
    revalidatePath("/payroll");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ─────────────────────────── review ───────────────────────────

export async function reviewPermit(
  permitId: string,
  status: PermitStatus
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    if (status === PermitStatus.PENDING) {
      return { ok: false, error: "Estado inválido para revisión." };
    }

    await prisma.permit.update({
      where: { id: permitId },
      data: {
        status,
        reviewerId: session.user.id,
        reviewedAt: new Date(),
      },
    });

    revalidatePath("/permits");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ─────────────────────────── delete ───────────────────────────

export async function deletePermit(permitId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.permit.delete({ where: { id: permitId } });
    revalidatePath("/permits");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
