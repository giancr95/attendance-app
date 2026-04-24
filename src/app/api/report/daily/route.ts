// Daily marcajes report endpoint.
//
// Called by the cron sidecar once a day. Protected with REPORT_TOKEN
// (same pattern as /api/sync). Generates the PDF, posts it to the WAHA
// session, and returns a small JSON receipt.
//
// GET returns an inline PDF preview (no send) for manual QA — useful
// when developing locally without a WAHA session authed.

import { NextResponse } from "next/server";

import {
  buildDailyReport,
  renderDailyReportPdf,
  runDailyReport,
} from "@/lib/report-actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: Request, url: URL): boolean {
  const expected = process.env.REPORT_TOKEN;
  if (!expected) return false;
  const header = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const query = url.searchParams.get("token");
  return header === expected || query === expected;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!isAuthorized(req, url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailyReport();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// Inline PDF preview — same token gate, but no WAHA send. Handy for
// checking the layout from a browser.
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!isAuthorized(req, url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const report = await buildDailyReport();
  const pdf = await renderDailyReportPdf(report);

  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="marcas-${report.dayKey}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
