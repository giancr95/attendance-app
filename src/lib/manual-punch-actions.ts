// Manual punch entry for employees who are NOT registered on the biometric
// clock. These employees have deviceUserId = null, so the ZKTeco sync
// never touches them, and the clock's unique constraint
// (deviceId, userId, timestamp) can never collide with a manual entry
// because no device-sourced punch will ever be created for them.
//
// To keep the design simple we store manual punches against the existing
// MB10-VL device row so the rest of the app (reports, payroll) works
// unchanged. We mark them with rawStatus = -1 and rawPunch = -1 so the
// raw-data view can distinguish them.
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PunchKind } from "@/generated/prisma/client";

const DEVICE_SERIAL = "UDP3243700044";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (session.user.role !== "ADMIN") {
    throw new Error("Solo los administradores pueden registrar marcajes.");
  }
  return session;
}

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? {} : { data: T }))
  | { ok: false; error: string };

const CreateManualPunchSchema = z.object({
  userId: z.string().min(1, "Empleado requerido"),
  // YYYY-MM-DD in CR local
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  // HH:MM in CR local
  time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  kind: z.nativeEnum(PunchKind).optional(),
});

export type CreateManualPunchInput = z.input<typeof CreateManualPunchSchema>;

export async function createManualPunch(
  input: CreateManualPunchInput
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = CreateManualPunchSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, deviceUserId: true, role: true },
    });
    if (!user) return { ok: false, error: "Empleado no encontrado." };
    if (user.role !== "EMPLOYEE") {
      return {
        ok: false,
        error: "Solo empleados pueden tener marcajes.",
      };
    }
    if (user.deviceUserId != null) {
      return {
        ok: false,
        error:
          "Este empleado está registrado en el reloj. Sus marcajes vienen del reloj — no se permiten entradas manuales para evitar conflictos.",
      };
    }

    const device = await prisma.device.findUnique({
      where: { serial: DEVICE_SERIAL },
    });
    if (!device) {
      return { ok: false, error: "Dispositivo no configurado." };
    }

    // Parse date+time as CR local → UTC
    const timestamp = new Date(
      `${parsed.data.date}T${parsed.data.time}:00-06:00`
    );

    // Idempotency: the unique constraint will reject exact duplicates,
    // so we catch P2002 and return a friendly message instead of crashing.
    try {
      await prisma.punch.create({
        data: {
          deviceId: device.id,
          userId: user.id,
          timestamp,
          kind: parsed.data.kind ?? PunchKind.OTHER,
          rawStatus: -1,
          rawPunch: -1,
        },
      });
    } catch (e: any) {
      if (e?.code === "P2002") {
        return {
          ok: false,
          error: "Ya hay un marcaje registrado en ese instante.",
        };
      }
      throw e;
    }

    revalidatePath("/punches");
    revalidatePath("/employees");
    revalidatePath("/reports");
    revalidatePath("/payroll");
    revalidatePath("/raw");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function deleteManualPunch(
  punchId: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const punch = await prisma.punch.findUnique({
      where: { id: punchId },
      select: { id: true, rawStatus: true },
    });
    if (!punch) return { ok: false, error: "Marcaje no encontrado." };
    if (punch.rawStatus !== -1) {
      return {
        ok: false,
        error: "Solo se pueden borrar marcajes manuales.",
      };
    }
    await prisma.punch.delete({ where: { id: punchId } });
    revalidatePath("/punches");
    revalidatePath("/raw");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
