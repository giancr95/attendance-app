// Plantillas index page.
//
// Lists every Template registered in `lib/templates`. Categories group the
// cards so the user can find what they need fast.

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/authz";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TEMPLATES, CATEGORY_LABEL } from "@/lib/templates";

export const metadata = {
  title: "Plantillas · LCDP",
};

export default async function PlantillasPage() {
  await requireAdmin();
  // Group by category, preserving the registration order within each
  const byCategory = new Map<string, typeof TEMPLATES>();
  for (const t of TEMPLATES) {
    if (!byCategory.has(t.category)) byCategory.set(t.category, []);
    byCategory.get(t.category)!.push(t);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Plantillas"
        subtitle="Formularios para llenar y descargar como PDF. La información se borra al salir."
      />

      <div className="flex flex-col gap-6">
        {Array.from(byCategory.entries()).map(([category, templates]) => (
          <div key={category} className="flex flex-col gap-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL]}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <Card
                  key={t.id}
                  className="rounded-xl border-border/60 shadow-none transition-colors hover:border-foreground/30"
                >
                  <CardHeader>
                    <CardTitle className="text-base">{t.title}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {t.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link
                      href={`/plantillas/${t.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
                    >
                      Abrir plantilla
                      <ArrowRightIcon className="size-3.5" />
                    </Link>
                    <Badge
                      variant="outline"
                      className="ml-2 align-middle text-[10px]"
                    >
                      {t.sections.filter((s) =>
                        ["fields", "list", "table", "textarea"].includes(s.type)
                      ).length}{" "}
                      secciones
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
