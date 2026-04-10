// Bridge between the Next.js sync actions and the ZKTeco MB10-VL device.
//
// We tried three Node.js libraries (zklib-js, node-zklib, zkteco-js) and all
// of them choked on this device's firmware ("Ver 6.60 Oct 12 2021"). They
// connect over TCP fine, but parse responses incorrectly because the device
// also requires comm-key authentication that none of those libs support.
//
// Python's pyzk handles both correctly, so we shell out to a tiny script
// (`scripts/zk-bridge.py`) that prints JSON to stdout. This wrapper just
// runs the script, parses the JSON, and re-throws errors with context.
//
// Required environment variables for the running container:
//   ZKTECO_IP        – default 192.168.1.202
//   ZKTECO_PORT      – default 4370
//   ZKTECO_PASSWORD  – default 0 (set to 123456 for the LCDP MB10-VL)
//   ZKTECO_TIMEOUT   – seconds, default 15

import "server-only";
import { spawn } from "node:child_process";
import path from "node:path";

const SCRIPT_PATH = path.join(process.cwd(), "scripts", "zk-bridge.py");
const PYTHON_BIN = process.env.PYTHON_BIN ?? "python3";

function runBridge<T>(command: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [SCRIPT_PATH, command], {
      env: {
        ...process.env,
        // pyzk sometimes prints to stderr; we only care about stdout
        PYTHONUNBUFFERED: "1",
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      reject(
        new Error(
          `failed to spawn ${PYTHON_BIN} ${SCRIPT_PATH}: ${err.message}`
        )
      );
    });

    child.on("close", (code) => {
      const trimmed = stdout.trim();
      if (!trimmed) {
        reject(
          new Error(
            `zk-bridge ${command} produced no output (exit ${code}). stderr=${stderr}`
          )
        );
        return;
      }
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.ok === false) {
          reject(
            new Error(
              `zk-bridge ${command}: ${parsed.error ?? "unknown error"}`
            )
          );
          return;
        }
        resolve(parsed as T);
      } catch (e) {
        reject(
          new Error(
            `zk-bridge ${command}: invalid JSON (${
              e instanceof Error ? e.message : String(e)
            }). raw=${trimmed.slice(0, 500)}`
          )
        );
      }
    });
  });
}

export type ZkInfo = {
  firmware: string;
  serial: string;
  platform: string;
  deviceName: string;
  userCount: number;
  attendanceCount: number;
};

export type ZkUser = {
  uid: number;
  userId: string;
  name: string;
  privilege: number; // 0 = user, 14 = admin
  password: string;
  groupId: string;
  card: number;
};

export type ZkAttendance = {
  uid: number;
  userId: string;
  // pyzk returns the device's local datetime in ISO 8601 (naive — no TZ).
  // The MB10-VL clock is configured to America/Costa_Rica (UTC-6), so we
  // treat the parsed timestamp as that timezone.
  timestamp: Date;
  status: number;
  punch: number;
};

function asDate(iso: string): Date {
  // The device runs in CR time (UTC-6). pyzk returns naive ISO strings like
  // "2026-02-09T15:55:34". Append the offset so JS parses it correctly.
  const withTz = iso.endsWith("Z") || /[+-]\d\d:\d\d$/.test(iso)
    ? iso
    : `${iso}-06:00`;
  return new Date(withTz);
}

export async function getDeviceInfo(): Promise<ZkInfo> {
  const result = await runBridge<ZkInfo & { ok: true }>("info");
  return result;
}

export async function getDeviceUsers(): Promise<ZkUser[]> {
  const result = await runBridge<{ ok: true; users: ZkUser[] }>("users");
  return result.users;
}

export async function getDeviceAttendances(): Promise<ZkAttendance[]> {
  const result = await runBridge<{
    ok: true;
    records: Array<Omit<ZkAttendance, "timestamp"> & { timestamp: string }>;
  }>("attendance");
  return result.records.map((r) => ({
    ...r,
    timestamp: asDate(r.timestamp),
  }));
}

// Best-effort liveness check. Returns null on success or an error message.
export async function pingDevice(): Promise<string | null> {
  try {
    await getDeviceInfo();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
