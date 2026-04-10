// Public-ish sync endpoint for scheduled triggers (Coolify cron, etc.).
//
// Auth: requires SYNC_TOKEN env var to be passed as ?token=… or in the
// Authorization header. This is intentionally simple — the endpoint runs
// inside the same Tailscale network as the device, so a shared token is
// adequate for our threat model.
//
// Usage:
//   POST /api/sync?token=…           → users + punches
//   POST /api/sync?token=…&kind=users    → users only
//   POST /api/sync?token=…&kind=punches  → punches only

import { NextResponse } from "next/server";

import {
  syncDeviceUsers,
  syncDevicePunches,
} from "@/lib/sync-actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: Request, url: URL): boolean {
  const expected = process.env.SYNC_TOKEN;
  if (!expected) return false;

  const headerToken = req.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const queryToken = url.searchParams.get("token");

  return headerToken === expected || queryToken === expected;
}

async function runSync(kind: string | null) {
  // The token check above is the auth gate for this route, so skip the
  // session-based admin check inside the server actions.
  const opts = { skipAuth: true } as const;

  if (kind === "users") {
    const users = await syncDeviceUsers(opts);
    return { users };
  }
  if (kind === "punches") {
    const punches = await syncDevicePunches(opts);
    return { punches };
  }
  // default: sync users first (so punches can resolve userId), then punches
  const users = await syncDeviceUsers(opts);
  const punches = await syncDevicePunches(opts);
  return { users, punches };
}

export async function POST(req: Request) {
  const url = new URL(req.url);

  if (!isAuthorized(req, url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const kind = url.searchParams.get("kind");
  const startedAt = Date.now();

  try {
    const result = await runSync(kind);
    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startedAt,
      ...result,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}

// GET is allowed too so it's easy to test from a browser/curl.
export async function GET(req: Request) {
  return POST(req);
}
