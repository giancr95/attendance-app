import type { Template } from "./types";

export const complaint: Template = {
  id: "complaint",
  title: "Queja o Denuncia",
  description:
    "Formulario para presentar una queja, sugerencia o denuncia formal al departamento de Recursos Humanos.",
  category: "rrhh",
  sections: [
    {
      type: "paragraph",
      text:
        "La información proporcionada será tratada con confidencialidad. Por favor describe los hechos con la mayor precisión posible.",
    },

    { type: "heading", text: "1. Información del Solicitante", level: 2 },
    {
      type: "fields",
      fields: [
        { kind: "text", id: "name", label: "Nombre Completo" },
        { kind: "text", id: "role", label: "Puesto / Cargo" },
        { kind: "text", id: "department", label: "Departamento" },
        { kind: "date", id: "submittedAt", label: "Fecha de la solicitud" },
        {
          kind: "select",
          id: "anonymous",
          label: "¿Anónima?",
          options: [
            { value: "no", label: "No, mantener mi nombre" },
            { value: "yes", label: "Sí, anónima" },
          ],
        },
      ],
    },

    { type: "heading", text: "2. Tipo de Solicitud", level: 2 },
    {
      type: "fields",
      fields: [
        {
          kind: "select",
          id: "kind",
          label: "Categoría",
          options: [
            { value: "queja", label: "Queja" },
            { value: "denuncia", label: "Denuncia" },
            { value: "sugerencia", label: "Sugerencia" },
            { value: "reconocimiento", label: "Reconocimiento" },
            { value: "otro", label: "Otro" },
          ],
        },
        {
          kind: "select",
          id: "severity",
          label: "Nivel de gravedad",
          options: [
            { value: "baja", label: "Baja" },
            { value: "media", label: "Media" },
            { value: "alta", label: "Alta" },
            { value: "critica", label: "Crítica / Urgente" },
          ],
        },
      ],
    },

    { type: "heading", text: "3. Descripción de los Hechos", level: 2 },
    {
      type: "paragraph",
      text:
        "Detalla qué sucedió, cuándo, dónde y quiénes estuvieron involucrados. Sé objetivo y evita opiniones.",
    },
    {
      type: "textarea",
      id: "facts",
      rows: 8,
      placeholder: "Describe los hechos…",
    },

    { type: "heading", text: "4. Personas Involucradas", level: 2 },
    {
      type: "table",
      id: "involved",
      columns: [
        { id: "name", label: "Nombre", weight: 2 },
        { id: "role", label: "Puesto / Relación", weight: 1.5 },
        { id: "involvement", label: "Tipo de involucramiento", weight: 2 },
      ],
      rows: 3,
    },

    { type: "heading", text: "5. Testigos (si aplica)", level: 2 },
    {
      type: "list",
      id: "witnesses",
      count: 3,
      itemPlaceholder: "Nombre y forma de contacto del testigo",
    },

    { type: "heading", text: "6. Resolución Sugerida", level: 2 },
    {
      type: "paragraph",
      text:
        "¿Qué resultado o medida esperas que tome la empresa para resolver la situación?",
    },
    {
      type: "textarea",
      id: "expectedResolution",
      rows: 5,
    },

    { type: "heading", text: "7. Documentación Adjunta", level: 2 },
    {
      type: "paragraph",
      text:
        "Lista los documentos, fotos, capturas o evidencias que adjuntas a esta solicitud.",
    },
    {
      type: "list",
      id: "attachments",
      count: 4,
      itemPlaceholder: "Descripción del documento o evidencia",
    },
  ],
  filenameForValues: (v) => {
    const name = (v.name as string) || "anonimo";
    const kind = (v.kind as string) || "queja";
    const slug = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
    return `${slug(kind)}-${slug(name) || "sin-nombre"}.pdf`;
  },
};
