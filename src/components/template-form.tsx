"use client";

import { useState, useTransition } from "react";
import { DownloadIcon, EraserIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadTemplatePdf } from "@/lib/template-pdf";
import type {
  Template,
  TemplateField,
  TemplateSection,
} from "@/lib/templates";

type Values = Record<string, unknown>;

type Props = {
  template: Template;
};

export function TemplateForm({ template }: Props) {
  // Local-only state. Resets on unmount (i.e. when user navigates away).
  const [values, setValues] = useState<Values>({});
  const [pending, start] = useTransition();

  function setField(id: string, value: unknown) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function setListItem(id: string, idx: number, value: string) {
    setValues((prev) => {
      const arr = Array.isArray(prev[id]) ? [...(prev[id] as string[])] : [];
      arr[idx] = value;
      return { ...prev, [id]: arr };
    });
  }

  function setTableCell(
    id: string,
    rowIdx: number,
    colId: string,
    value: string
  ) {
    setValues((prev) => {
      const rows = Array.isArray(prev[id])
        ? [...(prev[id] as Record<string, string>[])]
        : [];
      const row = { ...(rows[rowIdx] ?? {}) };
      row[colId] = value;
      rows[rowIdx] = row;
      return { ...prev, [id]: rows };
    });
  }

  function handleDownload() {
    start(async () => {
      const id = toast.loading("Generando PDF…");
      try {
        await downloadTemplatePdf(template, values);
        toast.success("PDF descargado", { id });
      } catch (e) {
        toast.error(
          `No se pudo generar el PDF: ${
            e instanceof Error ? e.message : String(e)
          }`,
          { id }
        );
      }
    });
  }

  function handleClear() {
    if (!confirm("¿Borrar todos los campos de esta plantilla?")) return;
    setValues({});
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6">
        {template.sections.map((section, idx) => (
          <SectionRenderer
            key={idx}
            section={section}
            values={values}
            setField={setField}
            setListItem={setListItem}
            setTableCell={setTableCell}
          />
        ))}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={handleClear}
          >
            <EraserIcon className="size-4" />
            Limpiar
          </Button>
          <Button type="button" onClick={handleDownload} disabled={pending}>
            <DownloadIcon className="size-4" />
            {pending ? "Generando…" : "Descargar PDF"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Section renderer ──────────────────────────────────────────────────

type RendererProps = {
  section: TemplateSection;
  values: Values;
  setField: (id: string, value: unknown) => void;
  setListItem: (id: string, idx: number, value: string) => void;
  setTableCell: (
    id: string,
    rowIdx: number,
    colId: string,
    value: string
  ) => void;
};

function SectionRenderer({
  section,
  values,
  setField,
  setListItem,
  setTableCell,
}: RendererProps) {
  switch (section.type) {
    case "heading": {
      const Tag = ((section.level ?? 2) === 1
        ? "h2"
        : (section.level ?? 2) === 2
        ? "h3"
        : "h4") as keyof React.JSX.IntrinsicElements;
      return (
        <Tag className="text-base font-semibold tracking-tight first-letter:uppercase">
          {section.text}
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className="text-sm text-muted-foreground">{section.text}</p>
      );
    case "fields":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {section.fields.map((f) => (
            <FieldInput
              key={f.id}
              field={f}
              value={(values[f.id] as string) ?? ""}
              onChange={(v) => setField(f.id, v)}
            />
          ))}
        </div>
      );
    case "list":
      return (
        <div className="flex flex-col gap-2">
          {section.label ? (
            <Label className="text-sm font-medium">{section.label}</Label>
          ) : null}
          {section.hint ? (
            <p className="text-xs text-muted-foreground">{section.hint}</p>
          ) : null}
          <ul className="flex flex-col gap-1.5">
            {Array.from({ length: section.count }).map((_, i) => {
              const arr = (values[section.id] as string[]) ?? [];
              return (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs text-muted-foreground">
                    {i + 1}.
                  </span>
                  <Input
                    value={arr[i] ?? ""}
                    onChange={(e) => setListItem(section.id, i, e.target.value)}
                    placeholder={section.itemPlaceholder ?? ""}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      );
    case "table":
      return (
        <div className="flex flex-col gap-2">
          {section.label ? (
            <Label className="text-sm font-medium">{section.label}</Label>
          ) : null}
          {section.hint ? (
            <p className="text-xs text-muted-foreground">{section.hint}</p>
          ) : null}
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {section.columns.map((c) => (
                    <th
                      key={c.id}
                      className="border-b border-border/60 px-2 py-1.5 text-left text-xs font-medium text-muted-foreground"
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: section.rows }).map((_, r) => {
                  const rows =
                    (values[section.id] as Record<string, string>[]) ?? [];
                  const row = rows[r] ?? {};
                  return (
                    <tr key={r}>
                      {section.columns.map((c) => (
                        <td
                          key={c.id}
                          className="border-b border-border/40 p-1 align-top"
                        >
                          <input
                            type="text"
                            value={row[c.id] ?? ""}
                            onChange={(e) =>
                              setTableCell(section.id, r, c.id, e.target.value)
                            }
                            className="w-full bg-transparent px-2 py-1 text-sm outline-none focus:bg-muted/30"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    case "textarea":
      return (
        <div className="flex flex-col gap-1.5">
          {section.label ? (
            <Label htmlFor={`${section.id}-ta`} className="text-sm font-medium">
              {section.label}
            </Label>
          ) : null}
          {section.hint ? (
            <p className="text-xs text-muted-foreground">{section.hint}</p>
          ) : null}
          <textarea
            id={`${section.id}-ta`}
            rows={section.rows ?? 4}
            value={(values[section.id] as string) ?? ""}
            onChange={(e) => setField(section.id, e.target.value)}
            placeholder={section.placeholder ?? ""}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-none outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      );
  }
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.kind === "select") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={field.id} className="text-sm">
          {field.label}
        </Label>
        <Select
          value={value || undefined}
          onValueChange={(v) => onChange(v ?? "")}
        >
          <SelectTrigger id={field.id}>
            <SelectValue placeholder="Seleccionar…" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (field.kind === "textarea") {
    return (
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={field.id} className="text-sm">
          {field.label}
        </Label>
        <textarea
          id={field.id}
          rows={field.rows ?? 3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? ""}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.id} className="text-sm">
        {field.label}
      </Label>
      <Input
        id={field.id}
        type={field.kind === "date" ? "date" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.kind === "text" ? field.placeholder ?? "" : ""}
      />
    </div>
  );
}
