import type { Template } from "./types";

export const meetingMinutes: Template = {
  id: "meeting-minutes",
  title: "Acta de Reunión",
  description:
    "Plantilla para registrar agenda, decisiones y acciones de una reunión interna.",
  category: "operativo",
  sections: [
    { type: "heading", text: "1. Datos Generales", level: 2 },
    {
      type: "fields",
      fields: [
        { kind: "text", id: "title", label: "Título de la reunión" },
        { kind: "date", id: "date", label: "Fecha" },
        { kind: "text", id: "time", label: "Hora", placeholder: "08:00 – 09:30" },
        { kind: "text", id: "location", label: "Lugar / Plataforma" },
        { kind: "text", id: "facilitator", label: "Facilitador / Convocado por" },
        { kind: "text", id: "minuteTaker", label: "Encargado del acta" },
      ],
    },

    { type: "heading", text: "2. Asistentes", level: 2 },
    {
      type: "table",
      id: "attendees",
      columns: [
        { id: "name", label: "Nombre", weight: 2 },
        { id: "role", label: "Cargo", weight: 1.5 },
        { id: "department", label: "Departamento", weight: 1.5 },
      ],
      rows: 6,
    },

    { type: "heading", text: "3. Agenda", level: 2 },
    {
      type: "list",
      id: "agenda",
      count: 6,
      itemPlaceholder: "Tema a tratar",
    },

    { type: "heading", text: "4. Discusión y Acuerdos", level: 2 },
    {
      type: "textarea",
      id: "discussion",
      label: "Resumen de la discusión",
      rows: 8,
    },

    { type: "heading", text: "5. Acciones (Pendientes)", level: 2 },
    {
      type: "table",
      id: "actions",
      columns: [
        { id: "task", label: "Acción", weight: 2.5 },
        { id: "owner", label: "Responsable", weight: 1.5 },
        { id: "due", label: "Fecha límite", weight: 1 },
      ],
      rows: 6,
    },

    { type: "heading", text: "6. Próxima Reunión", level: 2 },
    {
      type: "fields",
      fields: [
        { kind: "date", id: "nextDate", label: "Fecha tentativa" },
        { kind: "text", id: "nextLocation", label: "Lugar / Plataforma" },
      ],
    },

    { type: "heading", text: "7. Comentarios", level: 2 },
    { type: "textarea", id: "notes", rows: 4 },
  ],
  filenameForValues: (v) => {
    const t = (v.title as string) || "reunion";
    const date = (v.date as string) || "";
    const slug = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
    const parts = [slug(t), date].filter(Boolean);
    return `acta-${parts.join("-") || "sin-titulo"}.pdf`;
  },
};
