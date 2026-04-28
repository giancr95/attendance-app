// Render a Template + values into a PDF using pdf-lib.
//
// pdf-lib is already in the bundle for the WhatsApp daily report; we
// reuse it here to keep the dependency footprint flat.
//
// Layout strategy: A4 portrait, ~36pt margins, top-down cursor `y`.
// Each section drawer takes (page, y, width) and returns the new y.
// When y goes below the bottom margin we add a new page.

import {
  PDFDocument,
  PDFFont,
  PDFPage,
  rgb,
  StandardFonts,
} from "pdf-lib";

import {
  type Template,
  type TemplateSection,
  type TemplateValues,
  getListValue,
  getStringValue,
  getTableValue,
} from "@/lib/templates";

// ─── A4 ────────────────────────────────────────────────────────────────
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN_X = 48;
const MARGIN_Y = 48;
const CONTENT_WIDTH = A4_WIDTH - MARGIN_X * 2;
const FOOTER_RESERVED = 36;

// ─── Type sizes ─────────────────────────────────────────────────────────
const SIZE = {
  h1: 18,
  h2: 13,
  h3: 11,
  body: 10,
  small: 9,
  label: 8.5,
} as const;

const COLOR = {
  text: rgb(0.13, 0.13, 0.13),
  muted: rgb(0.45, 0.45, 0.45),
  rule: rgb(0.85, 0.85, 0.85),
  cellBg: rgb(0.96, 0.97, 0.98),
  headBg: rgb(0.92, 0.95, 1.0),
} as const;

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  /** Cursor: distance from page top to current draw position. */
  y: number;
};

function addPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([A4_WIDTH, A4_HEIGHT]);
  ctx.y = MARGIN_Y;
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y + needed > A4_HEIGHT - MARGIN_Y - FOOTER_RESERVED) {
    addPage(ctx);
  }
}

// ─── Word wrap ─────────────────────────────────────────────────────────
function wrap(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  if (!text) return [];
  const lines: string[] = [];
  const paragraphs = text.split(/\n/);
  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let current = "";
    for (const w of words) {
      const test = current ? current + " " + w : w;
      const width = font.widthOfTextAtSize(test, size);
      if (width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        // word longer than line: hard-break it
        if (font.widthOfTextAtSize(w, size) > maxWidth) {
          let chunk = "";
          for (const ch of w) {
            if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
              if (chunk) lines.push(chunk);
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          current = chunk;
        } else {
          current = w;
        }
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

// ─── Drawing primitives ────────────────────────────────────────────────
function drawText(
  ctx: Ctx,
  text: string,
  opts: {
    size?: number;
    font?: PDFFont;
    color?: ReturnType<typeof rgb>;
    x?: number;
    indent?: number;
    maxWidth?: number;
    lineGap?: number;
    bottomGap?: number;
  } = {}
) {
  const size = opts.size ?? SIZE.body;
  const font = opts.font ?? ctx.font;
  const color = opts.color ?? COLOR.text;
  const x = opts.x ?? MARGIN_X + (opts.indent ?? 0);
  const maxWidth = opts.maxWidth ?? CONTENT_WIDTH - (opts.indent ?? 0);
  const lineHeight = size * 1.35;
  const lineGap = opts.lineGap ?? lineHeight;
  const lines = wrap(text, font, size, maxWidth);

  for (const line of lines) {
    ensureSpace(ctx, lineHeight);
    ctx.page.drawText(line, {
      x,
      y: A4_HEIGHT - ctx.y - size,
      size,
      font,
      color,
    });
    ctx.y += lineGap;
  }
  if (opts.bottomGap != null) ctx.y += opts.bottomGap;
}

function drawDivider(ctx: Ctx) {
  ensureSpace(ctx, 6);
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: A4_HEIGHT - ctx.y },
    end: { x: MARGIN_X + CONTENT_WIDTH, y: A4_HEIGHT - ctx.y },
    thickness: 0.6,
    color: COLOR.rule,
  });
  ctx.y += 6;
}

// ─── Section drawers ───────────────────────────────────────────────────
function drawHeading(ctx: Ctx, text: string, level: 1 | 2 | 3 = 2) {
  const size =
    level === 1 ? SIZE.h1 : level === 2 ? SIZE.h2 : SIZE.h3;
  ctx.y += level === 1 ? 4 : 8;
  drawText(ctx, text, { size, font: ctx.bold, bottomGap: level === 1 ? 8 : 4 });
  if (level === 1) drawDivider(ctx);
}

function drawParagraph(ctx: Ctx, text: string) {
  drawText(ctx, text, {
    size: SIZE.small,
    color: COLOR.muted,
    bottomGap: 6,
  });
}

function drawFields(
  ctx: Ctx,
  section: Extract<TemplateSection, { type: "fields" }>,
  values: TemplateValues
) {
  const labelWidth = 130;
  const lineHeight = 16;

  for (const f of section.fields) {
    ensureSpace(ctx, lineHeight + 8);
    const labelY = A4_HEIGHT - ctx.y - SIZE.label;
    ctx.page.drawText(f.label + ":", {
      x: MARGIN_X,
      y: labelY,
      size: SIZE.label,
      font: ctx.bold,
      color: COLOR.muted,
    });

    const valueX = MARGIN_X + labelWidth;
    const valueWidth = CONTENT_WIDTH - labelWidth;

    let value = getStringValue(values, f.id);
    if (f.kind === "select" && value) {
      const opt = f.options.find((o) => o.value === value);
      if (opt) value = opt.label;
    }

    // Value text
    if (value) {
      const lines = wrap(value, ctx.font, SIZE.body, valueWidth);
      let yi = ctx.y;
      for (const line of lines) {
        ctx.page.drawText(line, {
          x: valueX,
          y: A4_HEIGHT - yi - SIZE.body,
          size: SIZE.body,
          font: ctx.font,
          color: COLOR.text,
        });
        yi += SIZE.body * 1.4;
      }
      ctx.y = yi + 4;
    } else {
      // Empty field — draw a light underline so the reader sees the slot.
      ctx.page.drawLine({
        start: { x: valueX, y: A4_HEIGHT - ctx.y - 1 },
        end: { x: valueX + valueWidth, y: A4_HEIGHT - ctx.y - 1 },
        thickness: 0.4,
        color: COLOR.rule,
      });
      ctx.y += lineHeight;
    }
  }
  ctx.y += 4;
}

function drawList(
  ctx: Ctx,
  section: Extract<TemplateSection, { type: "list" }>,
  values: TemplateValues
) {
  if (section.label) {
    drawText(ctx, section.label, { font: ctx.bold, bottomGap: 4 });
  }
  if (section.hint) {
    drawText(ctx, section.hint, {
      size: SIZE.small,
      color: COLOR.muted,
      bottomGap: 4,
    });
  }
  const items = getListValue(values, section.id);
  for (let i = 0; i < section.count; i++) {
    const item = items[i] ?? "";
    const bullet = `•  ${item || ""}`;
    drawText(ctx, bullet, {
      size: SIZE.body,
      indent: 8,
      bottomGap: 4,
    });
  }
  ctx.y += 4;
}

function drawTable(
  ctx: Ctx,
  section: Extract<TemplateSection, { type: "table" }>,
  values: TemplateValues
) {
  if (section.label) {
    drawText(ctx, section.label, { font: ctx.bold, bottomGap: 4 });
  }
  if (section.hint) {
    drawText(ctx, section.hint, {
      size: SIZE.small,
      color: COLOR.muted,
      bottomGap: 4,
    });
  }

  const rows = getTableValue(values, section.id);
  // Compute column widths from weights
  const totalWeight = section.columns.reduce(
    (s, c) => s + (c.weight ?? 1),
    0
  );
  const colWidths = section.columns.map(
    (c) => (CONTENT_WIDTH * (c.weight ?? 1)) / totalWeight
  );

  // Pre-wrap every cell to compute row heights
  const cellPad = 6;
  const headerLines = section.columns.map((c) =>
    wrap(c.label, ctx.bold, SIZE.label, colWidths[0] - cellPad * 2)
  );
  const headerHeight =
    Math.max(...headerLines.map((l) => l.length)) * SIZE.label * 1.4 +
    cellPad * 2;

  type RenderRow = { lines: string[][]; height: number };
  const renderRows: RenderRow[] = [];
  for (let r = 0; r < section.rows; r++) {
    const data = rows[r] ?? {};
    const cellLines = section.columns.map((c, i) => {
      const txt = String(data[c.id] ?? "");
      return wrap(txt, ctx.font, SIZE.body, colWidths[i] - cellPad * 2);
    });
    const height =
      Math.max(1, ...cellLines.map((l) => l.length)) * SIZE.body * 1.4 +
      cellPad * 2;
    renderRows.push({ lines: cellLines, height });
  }

  // Header
  ensureSpace(ctx, headerHeight + 4);
  let xCursor = MARGIN_X;
  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: A4_HEIGHT - ctx.y - headerHeight,
    width: CONTENT_WIDTH,
    height: headerHeight,
    color: COLOR.headBg,
  });
  for (let i = 0; i < section.columns.length; i++) {
    const lines = headerLines[i];
    let yi = ctx.y + cellPad;
    for (const line of lines) {
      ctx.page.drawText(line, {
        x: xCursor + cellPad,
        y: A4_HEIGHT - yi - SIZE.label,
        size: SIZE.label,
        font: ctx.bold,
        color: COLOR.text,
      });
      yi += SIZE.label * 1.4;
    }
    xCursor += colWidths[i];
  }
  // Header borders
  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: A4_HEIGHT - ctx.y - headerHeight,
    width: CONTENT_WIDTH,
    height: headerHeight,
    borderWidth: 0.6,
    borderColor: COLOR.rule,
  });
  ctx.y += headerHeight;

  // Body rows
  for (const rr of renderRows) {
    ensureSpace(ctx, rr.height);
    ctx.page.drawRectangle({
      x: MARGIN_X,
      y: A4_HEIGHT - ctx.y - rr.height,
      width: CONTENT_WIDTH,
      height: rr.height,
      borderWidth: 0.4,
      borderColor: COLOR.rule,
    });
    let xc = MARGIN_X;
    for (let i = 0; i < section.columns.length; i++) {
      let yi = ctx.y + cellPad;
      for (const line of rr.lines[i]) {
        ctx.page.drawText(line, {
          x: xc + cellPad,
          y: A4_HEIGHT - yi - SIZE.body,
          size: SIZE.body,
          font: ctx.font,
          color: COLOR.text,
        });
        yi += SIZE.body * 1.4;
      }
      xc += colWidths[i];
    }
    ctx.y += rr.height;
  }

  ctx.y += 8;
}

function drawTextarea(
  ctx: Ctx,
  section: Extract<TemplateSection, { type: "textarea" }>,
  values: TemplateValues
) {
  if (section.label) {
    drawText(ctx, section.label, { font: ctx.bold, bottomGap: 4 });
  }
  if (section.hint) {
    drawText(ctx, section.hint, {
      size: SIZE.small,
      color: COLOR.muted,
      bottomGap: 4,
    });
  }
  const value = getStringValue(values, section.id);
  if (value.trim()) {
    drawText(ctx, value, { bottomGap: 6 });
  } else {
    // Empty: draw a light box so it's visible there's a free-text slot.
    const boxHeight = (section.rows ?? 4) * 14;
    ensureSpace(ctx, boxHeight + 4);
    ctx.page.drawRectangle({
      x: MARGIN_X,
      y: A4_HEIGHT - ctx.y - boxHeight,
      width: CONTENT_WIDTH,
      height: boxHeight,
      borderWidth: 0.4,
      borderColor: COLOR.rule,
    });
    ctx.y += boxHeight + 6;
  }
}

// ─── Public API ────────────────────────────────────────────────────────
/** Render a Template+values into a PDF. Returns the bytes (Uint8Array). */
export async function renderTemplatePdf(
  template: Template,
  values: TemplateValues
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(template.title);
  doc.setProducer("LCDP RRHH");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ctx: Ctx = {
    doc,
    page: doc.addPage([A4_WIDTH, A4_HEIGHT]),
    font,
    bold,
    y: MARGIN_Y,
  };

  // Header: app + title
  drawText(ctx, "LCDP · Recursos Humanos", {
    size: SIZE.small,
    color: COLOR.muted,
    bottomGap: 2,
  });
  drawHeading(ctx, template.title, 1);

  for (const section of template.sections) {
    switch (section.type) {
      case "heading":
        drawHeading(ctx, section.text, section.level ?? 2);
        break;
      case "paragraph":
        drawParagraph(ctx, section.text);
        break;
      case "fields":
        drawFields(ctx, section, values);
        break;
      case "list":
        drawList(ctx, section, values);
        break;
      case "table":
        drawTable(ctx, section, values);
        break;
      case "textarea":
        drawTextarea(ctx, section, values);
        break;
    }
  }

  // Footer with generation timestamp on every page
  const pages = doc.getPages();
  const stamp = new Date().toLocaleString("es-CR", {
    timeZone: "America/Costa_Rica",
  });
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    p.drawText(
      `Generado ${stamp} · página ${i + 1}/${pages.length}`,
      {
        x: MARGIN_X,
        y: 24,
        size: 8,
        font,
        color: COLOR.muted,
      }
    );
  }

  return doc.save();
}

/** Trigger a browser download for a Template + values combo. */
export async function downloadTemplatePdf(
  template: Template,
  values: TemplateValues
) {
  const bytes = await renderTemplatePdf(template, values);
  const filename =
    template.filenameForValues?.(values) ?? `${template.id}.pdf`;
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
