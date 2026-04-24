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

// Inline PDF — same token gate, no WAHA send. Accepts ?date=YYYY-MM-DD
// so the cron can post a link like /api/report/daily?token=…&date=…
// to WhatsApp and the phone can open that date's report on demand.
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!isAuthorized(req, url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dateParam = url.searchParams.get("date");
  const dayKey = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined;

  const report = await buildDailyReport(dayKey ?? new Date());
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
