"use client";

import { DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  downloadCsv,
  rowsToCsv,
  type CsvColumn,
  type CsvRow,
} from "@/lib/csv";

type Props = {
  filename: string;
  rows: CsvRow[];
  columns: CsvColumn[];
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
};

export function ExportButton({
  filename,
  rows,
  columns,
  label = "Exportar",
  variant = "outline",
}: Props) {
  function handleClick() {
    const csv = rowsToCsv(rows, columns);
    downloadCsv(filename, csv);
  }

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      disabled={rows.length === 0}
    >
      <DownloadIcon className="size-4" />
      {label}
    </Button>
  );
}
