// Server actions for managing vacation requests.
// Mirrors the structure of permit-actions.ts — see that file for the pattern.
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { VacationStatus, VacationType } from "@/generated/prisma/client";

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

// Returns the number of inclusive days between two dates (counting both ends).
function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

const CreateVacationSchema = z
  .object({
    userId: z.string().min(1, "Empleado requerido"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    type: z.nativeEnum(VacationType),
    notes: z.string().max(500).optional(),
    // "Con goce de salario" — defaults to true.
    paid: z.boolean().optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "La fecha de fin debe ser igual o posterior a la de inicio",
    path: ["endDate"],
  });

export type CreateVacationInput = z.input<typeof CreateVacationSchema>;

export async function createVacation(
  input: CreateVacationInput
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const parsed = CreateVacationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    const userId =
      session.user.role === "ADMIN" ? parsed.data.userId : session.user.id;
    const days = daysBetween(parsed.data.startDate, parsed.data.endDate);

    await prisma.vacation.create({
      data: {
        userId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        days,
        type: parsed.data.type,
        notes: parsed.data.notes ?? null,
        paid: parsed.data.paid ?? true,
        status: VacationStatus.PENDING,
      },
    });

    revalidatePath("/vacations");
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

export async function reviewVacation(
  vacationId: string,
  status: VacationStatus
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    if (status === VacationStatus.PENDING) {
      return { ok: false, error: "Estado inválido para revisión." };
    }

    await prisma.vacation.update({
      where: { id: vacationId },
      data: {
        status,
        reviewerId: session.user.id,
        reviewedAt: new Date(),
      },
    });

    revalidatePath("/vacations");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function deleteVacation(
  vacationId: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.vacation.delete({ where: { id: vacationId } });
    revalidatePath("/vacations");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
