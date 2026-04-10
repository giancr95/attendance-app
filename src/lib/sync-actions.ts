// Server actions for syncing the ZKTeco MB10-VL device with our DB.
//
// Two operations:
//
//   syncDeviceUsers()  – pulls the user roster from the device and upserts
//                        the User table by deviceUserId. Existing email +
//                        passwordHash + role are preserved.
//
//   syncDevicePunches() – pulls the full attendance log and inserts new
//                         Punch rows. Idempotent thanks to the unique
//                         constraint on (deviceId, userId, timestamp).
//
// Both actions revalidate the relevant pages so the UI updates immediately.
"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  getDeviceUsers,
  getDeviceAttendances,
  getDeviceInfo,
} from "@/lib/zkteco";
import { Department, PunchKind, UserStatus } from "@/generated/prisma/client";

const DEVICE_SERIAL = "UDP3243700044";

// Sync entry points are reachable two ways:
//   - From the Employees / Punches page (admin-only, server action)
//   - From /api/sync (token-authed, called by cron / scheduled jobs)
//
// The token route already checks SYNC_TOKEN, so we let it skip the
// admin-session requirement by passing { skipAuth: true }. The button
// components on the pages always go through the default path.
async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("No autorizado");
  }
}

type SyncOpts = { skipAuth?: boolean };

async function getDevice() {
  const device = await prisma.device.findUnique({
    where: { serial: DEVICE_SERIAL },
  });
  if (!device) {
    throw new Error(
      `Dispositivo ${DEVICE_SERIAL} no encontrado en la base de datos.`
    );
  }
  return device;
}

export type SyncUsersResult = {
  ok: true;
  created: number;
  updated: number;
  total: number;
} | {
  ok: false;
  error: string;
};

export async function syncDeviceUsers(
  opts: SyncOpts = {}
): Promise<SyncUsersResult> {
  try {
    if (!opts.skipAuth) await requireAdmin();
    const device = await getDevice();

    const zkUsers = await getDeviceUsers();

    let created = 0;
    let updated = 0;

    for (const u of zkUsers) {
      const deviceUserId = Number.parseInt(u.userId, 10);
      if (!Number.isFinite(deviceUserId)) continue;

      // Strip control bytes (the device occasionally sends \x02 etc.)
      const cleanName = u.name.replace(/[\x00-\x1F]/g, "").trim();
      const hasDataIssue = cleanName.length === 0 || cleanName !== u.name;
      const fallbackName = cleanName || `Empleado #${deviceUserId} (sin nombre)`;

      const existing = await prisma.user.findUnique({
        where: { deviceUserId },
        select: { id: true, name: true, deviceName: true },
      });

      if (existing) {
        // Preserve any human-curated `name` an admin set in the UI.
        // We only overwrite `name` when it has never been touched (i.e. it
        // currently equals the previous deviceName, meaning nobody renamed
        // the user). `deviceName` is always refreshed.
        const nameWasAutomatic =
          existing.deviceName == null || existing.name === existing.deviceName;

        await prisma.user.update({
          where: { deviceUserId },
          data: {
            deviceUid: u.uid,
            deviceName: fallbackName,
            ...(nameWasAutomatic ? { name: fallbackName } : {}),
            hasDataIssue,
          },
        });
        updated++;
      } else {
        await prisma.user.create({
          data: {
            deviceUid: u.uid,
            deviceUserId,
            name: fallbackName,
            deviceName: fallbackName,
            hasDataIssue,
            status: UserStatus.INACTIVE,
            department: Department.PRODUCCION,
          },
        });
        created++;
      }
    }

    await prisma.device.update({
      where: { id: device.id },
      data: { lastSyncAt: new Date() },
    });

    revalidatePath("/employees");
    revalidatePath("/");
    return { ok: true, created, updated, total: zkUsers.length };
  } catch (e) {
    console.error("[sync-users] failed:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// Map ZKTeco's raw "punch" status to our PunchKind enum.
// MB10-VL standard punch codes (status field on Attendance):
//   0 = check-in     1 = check-out
//   2 = break-out    3 = break-in
//   4 = OT-in        5 = OT-out
//   15 = unknown / fingerprint match (LCDP device sends 15 for everything)
function mapPunchKind(status: number): PunchKind {
  switch (status) {
    case 0:
      return PunchKind.CHECK_IN;
    case 1:
      return PunchKind.CHECK_OUT;
    case 2:
      return PunchKind.BREAK_OUT;
    case 3:
      return PunchKind.BREAK_IN;
    case 4:
      return PunchKind.OT_IN;
    case 5:
      return PunchKind.OT_OUT;
    default:
      return PunchKind.OTHER;
  }
}

export type SyncPunchesResult =
  | {
      ok: true;
      inserted: number;
      skipped: number;
      total: number;
      missingUsers: number;
    }
  | { ok: false; error: string };

export async function syncDevicePunches(
  opts: SyncOpts = {}
): Promise<SyncPunchesResult> {
  try {
    if (!opts.skipAuth) await requireAdmin();
    const device = await getDevice();

    const zkLogs = await getDeviceAttendances();

    // Pre-fetch all known users so we can map deviceUserId → User.id without
    // hammering the DB inside the loop.
    const users = await prisma.user.findMany({
      select: { id: true, deviceUserId: true },
    });
    const userMap = new Map<number, string>();
    for (const u of users) {
      if (u.deviceUserId != null) userMap.set(u.deviceUserId, u.id);
    }

    // Build the rows to insert. Doing this in JS first lets us count
    // missing users and skip rows we can't link, then do ONE bulk SQL
    // insert with ON CONFLICT DO NOTHING — much faster than 1k+
    // sequential `prisma.punch.create()` calls.
    type PunchRow = {
      userId: string;
      timestamp: Date;
      kind: PunchKind;
      rawStatus: number;
      rawPunch: number;
    };
    const toInsert: PunchRow[] = [];
    let missingUsers = 0;

    for (const log of zkLogs) {
      const deviceUserId = Number.parseInt(log.userId, 10);
      if (!Number.isFinite(deviceUserId)) continue;
      const userId = userMap.get(deviceUserId);
      if (!userId) {
        missingUsers++;
        continue;
      }
      toInsert.push({
        userId,
        timestamp: log.timestamp,
        kind: mapPunchKind(log.status),
        rawStatus: log.status,
        rawPunch: log.punch,
      });
    }

    // Bulk insert with conflict tolerance. cuid() is generated per row in
    // JS so we don't depend on a server-side default.
    let inserted = 0;
    let skipped = 0;
    if (toInsert.length > 0) {
      // Generate ids client-side; a simple time-sortable random is enough
      // for a row that is uniquely keyed elsewhere.
      const cuid = () =>
        "p" +
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 12);

      // Process in chunks to keep param counts under Postgres' 65k limit.
      const CHUNK = 500;
      for (let i = 0; i < toInsert.length; i += CHUNK) {
        const slice = toInsert.slice(i, i + CHUNK);
        const values = slice
          .map(
            (_, idx) =>
              `($${idx * 7 + 1}, $${idx * 7 + 2}, $${idx * 7 + 3}, $${
                idx * 7 + 4
              }, $${idx * 7 + 5}::"PunchKind", $${idx * 7 + 6}, $${
                idx * 7 + 7
              })`
          )
          .join(",");
        const params: unknown[] = [];
        for (const row of slice) {
          params.push(
            cuid(),
            row.userId,
            device.id,
            row.timestamp,
            row.kind,
            row.rawStatus,
            row.rawPunch
          );
        }
        const result = await prisma.$executeRawUnsafe(
          `INSERT INTO "Punch"
             ("id", "userId", "deviceId", "timestamp", "kind", "rawStatus", "rawPunch")
           VALUES ${values}
           ON CONFLICT ("deviceId", "userId", "timestamp") DO NOTHING`,
          ...params
        );
        inserted += Number(result);
        skipped += slice.length - Number(result);
      }
    }

    await prisma.device.update({
      where: { id: device.id },
      data: { lastSyncAt: new Date() },
    });

    revalidatePath("/punches");
    revalidatePath("/");
    return {
      ok: true,
      inserted,
      skipped,
      total: zkLogs.length,
      missingUsers,
    };
  } catch (e) {
    console.error("[sync-punches] failed:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export type DeviceStatusResult =
  | {
      ok: true;
      reachable: true;
      info: {
        firmware: string;
        serial: string;
        deviceName: string;
        userCount: number;
        attendanceCount: number;
      };
    }
  | { ok: true; reachable: false; error: string }
  | { ok: false; error: string };

export async function getDeviceStatus(): Promise<DeviceStatusResult> {
  try {
    const info = await getDeviceInfo();
    return {
      ok: true,
      reachable: true,
      info: {
        firmware: info.firmware,
        serial: info.serial,
        deviceName: info.deviceName,
        userCount: info.userCount,
        attendanceCount: info.attendanceCount,
      },
    };
  } catch (e) {
    return {
      ok: true,
      reachable: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
