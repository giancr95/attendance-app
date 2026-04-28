// Single-template form page.
//
// Server component that looks up the template by id and renders the form
// inside a client component (state is local — pressing back / leaving
// wipes everything, which is what the user asked for).

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { TEMPLATE_BY_ID } from "@/lib/templates";
import { TemplateForm } from "@/components/template-form";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const tpl = TEMPLATE_BY_ID[id];
  return {
    title: tpl ? `${tpl.title} · Plantillas · LCDP` : "Plantilla · LCDP",
  };
}

export default async function TemplateFormPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const tpl = TEMPLATE_BY_ID[id];
  if (!tpl) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        render={<Link href="/plantillas" />}
      >
        <ArrowLeftIcon className="size-4" />
        Volver a plantillas
      </Button>

      <PageHeader title={tpl.title} subtitle={tpl.description} />

      <TemplateForm templateId={tpl.id} />
    </div>
  );
}
