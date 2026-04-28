import type { Template } from "./types";

export const weeklyReport: Template = {
  id: "weekly-report",
  title: "Reporte Semanal",
  description:
    "Seguimiento continuo al desempeño, identifica áreas de mejora y facilita la comunicación con la jefatura directa.",
  category: "desempeno",
  sections: [
    {
      type: "paragraph",
      text:
        "Este documento tiene como propósito dar seguimiento continuo al desempeño, identificar áreas de mejora y facilitar la comunicación proactiva entre el colaborador y su jefatura directa.",
    },

    { type: "heading", text: "1. Información General del Colaborador", level: 2 },
    {
      type: "fields",
      fields: [
        { kind: "text", id: "name", label: "Nombre Completo" },
        { kind: "text", id: "role", label: "Puesto / Cargo" },
        { kind: "text", id: "department", label: "Departamento" },
        { kind: "text", id: "week", label: "Semana del Reporte", placeholder: "Del 21 al 27 de abril 2026" },
      ],
    },

    { type: "heading", text: "2. Logros de la Semana", level: 2 },
    {
      type: "paragraph",
      text:
        "Enumera las principales metas alcanzadas, tareas críticas finalizadas o aportes de valor al equipo durante los últimos días.",
    },
    {
      type: "list",
      id: "achievements",
      count: 5,
      itemPlaceholder: "Describe brevemente el logro y su impacto",
    },

    { type: "heading", text: "3. Desafíos de la Semana", level: 2 },
    {
      type: "paragraph",
      text:
        "Identifica los obstáculos encontrados, cuellos de botella y detalla si necesitas recursos o ayuda para superarlos.",
    },
    {
      type: "table",
      id: "challenges",
      columns: [
        { id: "description", label: "Descripción del desafío", weight: 2 },
        { id: "impact", label: "Impacto en el trabajo", weight: 2 },
        { id: "support", label: "¿Requiere apoyo? (Especificar)", weight: 1.5 },
      ],
      rows: 3,
    },

    { type: "heading", text: "4. Propuestas para la Siguiente Semana", level: 2 },
    {
      type: "paragraph",
      text:
        "Detalla tus objetivos clave para la próxima semana y cualquier idea de innovación o mejora continua para el departamento.",
    },
    {
      type: "table",
      id: "proposals",
      columns: [
        { id: "objective", label: "Propuesta / Objetivo a cumplir", weight: 2 },
        { id: "resources", label: "Recursos necesarios (si aplica)", weight: 1.5 },
      ],
      rows: 4,
    },

    { type: "heading", text: "5. Comentarios Adicionales", level: 2 },
    {
      type: "paragraph",
      text:
        "Espacio opcional para comentarios sobre el clima laboral, feedback hacia la jefatura, o cualquier tema relevante no cubierto en las secciones anteriores.",
    },
    { type: "textarea", id: "comments", rows: 5 },
  ],
  filenameForValues: (v) => {
    const name = (v.name as string) || "colaborador";
    const week = (v.week as string) || "";
    const slug = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
    const parts = [slug(name), slug(week)].filter(Boolean);
    return `reporte-semanal-${parts.join("-") || "sin-nombre"}.pdf`;
  },
};
