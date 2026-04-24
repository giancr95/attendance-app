"use server";

// Daily attendance report generator.
//
// Fetches today's punches, runs the ordinal interpretation, produces a
// single-page PDF (name + entrance / lunch / exit times) and pushes it
// to WAHA to be forwarded over WhatsApp.
//
// Invoked by `/api/report/daily` with skipAuth so the cron sidecar can
// hit it without a session — same token-auth pattern as /api/sync.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { prisma } from "@/lib/prisma";
import { startOfCrDay, dayKeyCR, summarizeByDay } from "@/lib/punch-interpretation";
import { DEPARTMENT_LABEL } from "@/lib/labels";

const CR_TZ = "America/Costa_Rica";

type EmployeeRow = {
  name: string;
  department: string;
  entrance: string;
  lunchOut: string;
  lunchIn: string;
  exit: string;
  late: boolean;
  absent: boolean;
};

type DailyReport = {
  dayKey: string;
  headerDate: string;
  rows: EmployeeRow[];
  presentCount: number;
  absentCount: number;
  lateCount: number;
};

function fmtTime(d: Date | undefined | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-CR", {
    timeZone: CR_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function fmtHeaderDate(d: Date): string {
  return new Intl.DateTimeFormat("es-CR", {
    timeZone: CR_TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

export async function buildDailyReport(refDate: Date = new Date()): Promise<DailyReport> {
  const dayKey = dayKeyCR(refDate);
  const dayStart = startOfCrDay(dayKey);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [users, punches] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE", role: "EMPLOYEE" },
      select: {
        id: true,
        name: true,
        department: true,
        lateCutoffMin: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.punch.findMany({
      where: {
        timestamp: { gte: dayStart, lt: dayEnd },
        user: { role: "EMPLOYEE" },
      },
      select: { id: true, userId: true, timestamp: true },
      orderBy: { timestamp: "asc" },
    }),
  ]);

  const byUser = new Map<string, typeof punches>();
  for (const p of punches) {
    if (!byUser.has(p.userId)) byUser.set(p.userId, []);
    byUser.get(p.userId)!.push(p);
  }

  const rows: EmployeeRow[] = users.map((u) => {
    const raw = byUser.get(u.id) ?? [];
    const [summary] = summarizeByDay(raw, u.lateCutoffMin);
    const absent = !summary || summary.punchCount === 0;
    return {
      name: u.name,
      department: DEPARTMENT_LABEL[u.department] ?? u.department,
      entrance: fmtTime(summary?.entrance),
      lunchOut: fmtTime(summary?.lunchOut),
      lunchIn: fmtTime(summary?.lunchIn),
      exit: fmtTime(summary?.exit),
      late: !!summary?.isLate,
      absent,
    };
  });

  const presentCount = rows.filter((r) => !r.absent).length;
  const absentCount = rows.filter((r) => r.absent).length;
  const lateCount = rows.filter((r) => r.late).length;

  return {
    dayKey,
    headerDate: fmtHeaderDate(dayStart),
    rows,
    presentCount,
    absentCount,
    lateCount,
  };
}

export async function renderDailyReportPdf(report: DailyReport): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]); // US Letter
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  let y = 792 - margin;
  const width = 612 - margin * 2;

  // Title
  page.drawText("Reporte Diario de Marcajes", {
    x: margin, y, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  });
  y -= 22;
  page.drawText("LaCasaDelPlastico", {
    x: margin, y, size: 11, font, color: rgb(0.4, 0.4, 0.4),
  });
  y -= 14;
  page.drawText(report.headerDate, {
    x: margin, y, size: 11, font, color: rgb(0.4, 0.4, 0.4),
  });
  y -= 24;

  // Summary line
  const summary = `Presentes: ${report.presentCount}   Ausentes: ${report.absentCount}   Tardíos: ${report.lateCount}`;
  page.drawText(summary, { x: margin, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
  y -= 20;

  // Header row
  const cols = [
    { label: "Nombre", x: margin, w: 180 },
    { label: "Entrada", x: margin + 180, w: 65 },
    { label: "S. Almuerzo", x: margin + 245, w: 75 },
    { label: "R. Almuerzo", x: margin + 320, w: 75 },
    { label: "Salida", x: margin + 395, w: 65 },
    { label: "Estado", x: margin + 460, w: 72 },
  ];

  page.drawRectangle({
    x: margin - 2, y: y - 4, width: width + 4, height: 16,
    color: rgb(0.93, 0.93, 0.95),
  });
  for (const c of cols) {
    page.drawText(c.label, { x: c.x, y: y, size: 9, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
  }
  y -= 16;

  const rowHeight = 14;
  for (const row of report.rows) {
    if (y < margin + rowHeight) {
      // Page overflow — add another page and reset
      const p2 = pdf.addPage([612, 792]);
      y = 792 - margin;
      // Keep drawing on the new page by reassigning (pdf-lib tracks per-page)
      for (const c of cols) {
        p2.drawText(c.label, { x: c.x, y, size: 9, font: fontBold });
      }
      y -= 16;
      drawRow(p2, row, cols, y, font, fontBold);
    } else {
      drawRow(page, row, cols, y, font, fontBold);
    }
    y -= rowHeight;
  }

  // Footer
  page.drawText(
    `Generado ${new Date().toISOString()}`,
    { x: margin, y: margin - 20, size: 7, font, color: rgb(0.6, 0.6, 0.6) }
  );

  return pdf.save();
}

function drawRow(
  page: import("pdf-lib").PDFPage,
  row: EmployeeRow,
  cols: Array<{ label: string; x: number; w: number }>,
  y: number,
  font: import("pdf-lib").PDFFont,
  fontBold: import("pdf-lib").PDFFont,
) {
  const color = row.absent ? rgb(0.6, 0.25, 0.25) : rgb(0.15, 0.15, 0.15);
  const status = row.absent ? "Ausente" : row.late ? "Tardío" : "OK";
  const statusFont = row.absent || row.late ? fontBold : font;

  // Truncate long names to fit column
  const maxNameChars = 26;
  const name = row.name.length > maxNameChars ? row.name.slice(0, maxNameChars - 1) + "…" : row.name;

  page.drawText(name, { x: cols[0].x, y, size: 9, font, color });
  page.drawText(row.entrance, { x: cols[1].x, y, size: 9, font, color });
  page.drawText(row.lunchOut, { x: cols[2].x, y, size: 9, font, color });
  page.drawText(row.lunchIn,  { x: cols[3].x, y, size: 9, font, color });
  page.drawText(row.exit,     { x: cols[4].x, y, size: 9, font, color });
  page.drawText(status,       { x: cols[5].x, y, size: 9, font: statusFont, color });
}

type SendOpts = {
  wahaUrl: string;
  wahaApiKey: string;
  wahaSession?: string;
  chatId: string;       // e.g. "50683156424@c.us"
  pdf: Uint8Array;
  filename: string;
  caption: string;
};

export async function sendPdfToWhatsapp(opts: SendOpts): Promise<void> {
  const session = opts.wahaSession ?? "default";
  const base = opts.wahaUrl.replace(/\/+$/, "");

  const base64 = Buffer.from(opts.pdf).toString("base64");

  const body = {
    chatId: opts.chatId,
    file: {
      mimetype: "application/pdf",
      filename: opts.filename,
      data: base64,
    },
    caption: opts.caption,
    session,
  };

  const res = await fetch(`${base}/api/sendFile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": opts.wahaApiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WAHA sendFile failed: ${res.status} ${res.statusText} — ${text.slice(0, 300)}`);
  }
}

export async function runDailyReport(): Promise<{
  dayKey: string;
  bytes: number;
  presentCount: number;
  absentCount: number;
}> {
  const wahaUrl = process.env.WAHA_URL;
  const wahaApiKey = process.env.WAHA_API_KEY;
  const chatId = process.env.REPORT_CHAT_ID;

  if (!wahaUrl || !wahaApiKey || !chatId) {
    throw new Error("Missing WAHA_URL / WAHA_API_KEY / REPORT_CHAT_ID env vars");
  }

  const report = await buildDailyReport();
  const pdf = await renderDailyReportPdf(report);

  const filename = `marcas-${report.dayKey}.pdf`;
  const caption =
    `Reporte de marcajes — ${report.headerDate}\n` +
    `Presentes: ${report.presentCount} · Ausentes: ${report.absentCount} · Tardíos: ${report.lateCount}`;

  await sendPdfToWhatsapp({
    wahaUrl,
    wahaApiKey,
    wahaSession: process.env.WAHA_SESSION ?? "default",
    chatId,
    pdf,
    filename,
    caption,
  });

  return {
    dayKey: report.dayKey,
    bytes: pdf.byteLength,
    presentCount: report.presentCount,
    absentCount: report.absentCount,
  };
}
