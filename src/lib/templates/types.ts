// Type definitions for HR document templates.
//
// A Template is a list of sections. Each section is either presentational
// (heading, paragraph) or interactive (fields, list, table, textarea).
// Interactive sections own form state under their `id`.

export type TemplateField =
  | { kind: "text"; id: string; label: string; placeholder?: string }
  | {
      kind: "textarea";
      id: string;
      label: string;
      rows?: number;
      placeholder?: string;
    }
  | { kind: "date"; id: string; label: string }
  | {
      kind: "select";
      id: string;
      label: string;
      options: { value: string; label: string }[];
    };

export type TableColumn = {
  id: string;
  label: string;
  /** Relative width hint (1 = default). Columns share remaining space. */
  weight?: number;
};

export type TemplateSection =
  | { type: "heading"; text: string; level?: 1 | 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "fields"; fields: TemplateField[] }
  | {
      type: "list";
      id: string;
      label?: string;
      hint?: string;
      itemPlaceholder?: string;
      count: number;
    }
  | {
      type: "table";
      id: string;
      label?: string;
      hint?: string;
      columns: TableColumn[];
      rows: number;
    }
  | {
      type: "textarea";
      id: string;
      label?: string;
      hint?: string;
      rows?: number;
      placeholder?: string;
    };

export type Template = {
  id: string;
  title: string;
  description: string;
  /** Category for grouping in the index page. */
  category: "desempeno" | "incidentes" | "operativo" | "rrhh";
  sections: TemplateSection[];
  /** Build a sensible filename for the downloaded PDF. */
  filenameForValues?: (values: Record<string, unknown>) => string;
};

export type TemplateValues = Record<string, unknown>;

/** Fetch a section's stored value, normalised to string. */
export function getStringValue(
  values: TemplateValues,
  id: string,
  fallback = ""
): string {
  const v = values[id];
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

/** A list value is `string[]`. */
export function getListValue(values: TemplateValues, id: string): string[] {
  const v = values[id];
  return Array.isArray(v) ? v.map((x) => String(x ?? "")) : [];
}

/** A table value is `Record<columnId, string>[]`. */
export function getTableValue(
  values: TemplateValues,
  id: string
): Record<string, string>[] {
  const v = values[id];
  if (!Array.isArray(v)) return [];
  return v.map((row) =>
    typeof row === "object" && row != null
      ? Object.fromEntries(
          Object.entries(row as Record<string, unknown>).map(([k, val]) => [
            k,
            String(val ?? ""),
          ])
        )
      : {}
  );
}
