// Server actions for calendar events.
//
// Admin-only create/update/delete; everyone can read via the /calendario
// page's server-side query. Events are day-level (plus optional time
// range) so the month grid can render them cleanly.
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { EventKind, EventRecurrence } from "@/generated/prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  if (session.user.role !== "ADMIN") {
    throw new Error("Solo los administradores pueden gestionar eventos.");
  }
  return session;
}

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? {} : { data: T }))
  | { ok: false; error: string };

// YYYY-MM-DD → JS Date at UTC midnight of that calendar day.
//
// Postgres @db.Date stores just the calendar day (no time, no zone) and
// the adapter strips the time via `toISOString().slice(0, 10)`. Using
// UTC midnight here means that ISO string is always the same calendar
// day we received, no matter what timezone the server, DB, or driver
// think they're in. (Earlier I used `-06:00` which produced 06:00 UTC
// on the same day — equivalent in our UTC containers but ambiguous.)
function crDate(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

const CreateEventSchema = z.object({
  title: z.string().min(1, "Título requerido").max(200),
  description: z.string().max(1000).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  kind: z.nativeEnum(EventKind).optional(),
  recurrence: z.nativeEnum(EventRecurrence).optional(),
});

export type CreateEventInput = z.input<typeof CreateEventSchema>;

export async function createEvent(
  input: CreateEventInput
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = CreateEventSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }
    await prisma.event.create({
      data: {
        title: parsed.data.title.trim(),
        description: parsed.data.description?.trim() || null,
        date: crDate(parsed.data.date),
        startTime: parsed.data.startTime || null,
        endTime: parsed.data.endTime || null,
        location: parsed.data.location?.trim() || null,
        kind: parsed.data.kind ?? "GENERAL",
        recurrence: parsed.data.recurrence ?? "NONE",
        createdById: session.user.id,
      },
    });
    revalidatePath("/calendario");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.event.delete({ where: { id: eventId } });
    revalidatePath("/calendario");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

const UpdateEventSchema = CreateEventSchema.partial().extend({
  id: z.string(),
});

export async function updateEvent(
  input: z.input<typeof UpdateEventSchema>
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = UpdateEventSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }
    const { id, ...data } = parsed.data;
    const update: Record<string, unknown> = {};
    if (data.title !== undefined) update.title = data.title.trim();
    if (data.description !== undefined)
      update.description = data.description?.trim() || null;
    if (data.date !== undefined) update.date = crDate(data.date);
    if (data.startTime !== undefined) update.startTime = data.startTime || null;
    if (data.endTime !== undefined) update.endTime = data.endTime || null;
    if (data.location !== undefined)
      update.location = data.location?.trim() || null;
    if (data.kind !== undefined) update.kind = data.kind;
    if (data.recurrence !== undefined) update.recurrence = data.recurrence;

    await prisma.event.update({ where: { id }, data: update });
    revalidatePath("/calendario");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
