// Tiny client-friendly CSV utility. No dependencies — works in browsers and
// Node alike. Used by the *-export-button components.
//
// Why client-side instead of a server endpoint? Two reasons:
//   1. The data is already in memory (server component fetched it for the
//      page), so re-querying would waste DB time.
//   2. We avoid building a download API route per page.
//
// Constraint: server components cannot pass *functions* to client components.
// So instead of column accessors with closures, the page does its own data
// flattening and hands ExportButton a pre-built array of plain objects with
// the same shape as the column definitions.

export type CsvColumn = { key: string; header: string };
export type CsvRow = Record<string, string | number | boolean | null | undefined>;

function escapeCsv(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function rowsToCsv(rows: CsvRow[], columns: CsvColumn[]): string {
  const header = columns.map((c) => escapeCsv(c.header)).join(",");
  const body = rows.map((row) =>
    columns
      .map((c) => escapeCsv(formatCell(row[c.key])))
      .join(",")
  );
  // Excel-friendly: BOM + CRLF
  return "\ufeff" + [header, ...body].join("\r\n");
}

/** Trigger a browser download of the given CSV string. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
