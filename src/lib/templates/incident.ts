import type { Template } from "./types";

export const incident: Template = {
  id: "incident",
  title: "Reporte de Incidente Laboral",
  description:
    "Documento formal para registrar un accidente, casi-accidente o incidente de seguridad ocupacional.",
  category: "incidentes",
  sections: [
    {
      type: "paragraph",
      text:
        "Completa todos los campos relevantes lo antes posible después del incidente. Esta información es necesaria para la investigación y el cumplimiento ante el INS.",
    },

    { type: "heading", text: "1. Información del Reporte", level: 2 },
    {
      type: "fields",
      fields: [
        { kind: "text", id: "reporter", label: "Persona que reporta" },
        { kind: "text", id: "reporterRole", label: "Cargo de quien reporta" },
        { kind: "date", id: "reportedAt", label: "Fecha del reporte" },
      ],
    },

    { type: "heading", text: "2. Persona Afectada", level: 2 },
    {
      type: "fields",
      fields: [
        { kind: "text", id: "affectedName", label: "Nombre del afectado" },
        { kind: "text", id: "affectedRole", label: "Puesto" },
        { kind: "text", id: "affectedId", label: "Cédula o ID" },
        { kind: "text", id: "affectedDepartment", label: "Departamento" },
      ],
    },

    { type: "heading", text: "3. Detalle del Incidente", level: 2 },
    {
      type: "fields",
      fields: [
        { kind: "date", id: "incidentDate", label: "Fecha del incidente" },
        { kind: "text", id: "incidentTime", label: "Hora aproximada" },
        { kind: "text", id: "location", label: "Lugar específico" },
        {
          kind: "select",
          id: "kind",
          label: "Tipo de incidente",
          options: [
            { value: "accidente", label: "Accidente con lesión" },
            { value: "casi-accidente", label: "Casi accidente (sin lesión)" },
            { value: "enfermedad", label: "Enfermedad laboral" },
            { value: "danio-material", label: "Daño material" },
            { value: "otro", label: "Otro" },
          ],
        },
        {
          kind: "select",
          id: "severity",
          label: "Gravedad",
          options: [
            { value: "leve", label: "Leve" },
            { value: "moderado", label: "Moderado" },
            { value: "grave", label: "Grave" },
            { value: "fatal", label: "Fatal" },
          ],
        },
      ],
    },
    {
      type: "textarea",
      id: "description",
      label: "Descripción de lo ocurrido",
      hint: "Sé específico: actividad que se realizaba, mecanismo del incidente, secuencia de eventos.",
      rows: 6,
    },

    { type: "heading", text: "4. Lesiones / Daños", level: 2 },
    {
      type: "textarea",
      id: "injuries",
      label: "Tipo y zona de lesiones (si las hubo)",
      rows: 3,
      placeholder: "Ej: Corte superficial en mano izquierda, contusión en rodilla derecha…",
    },
    {
      type: "textarea",
      id: "damages",
      label: "Daños a equipo o instalaciones",
      rows: 3,
    },

    { type: "heading", text: "5. Atención Brindada", level: 2 },
    {
      type: "fields",
      fields: [
        {
          kind: "select",
          id: "firstAid",
          label: "¿Recibió primeros auxilios?",
          options: [
            { value: "no", label: "No" },
            { value: "si-en-sitio", label: "Sí, en el sitio" },
            { value: "si-clinica", label: "Sí, en clínica/hospital" },
            { value: "ins", label: "Atendido por el INS" },
          ],
        },
        { kind: "text", id: "attendedBy", label: "Atendido por (nombre)" },
        { kind: "text", id: "centerName", label: "Centro médico (si aplica)" },
      ],
    },

    { type: "heading", text: "6. Testigos", level: 2 },
    {
      type: "table",
      id: "witnesses",
      columns: [
        { id: "name", label: "Nombre", weight: 2 },
        { id: "role", label: "Puesto", weight: 1 },
        { id: "contact", label: "Contacto", weight: 1.5 },
      ],
      rows: 3,
    },

    { type: "heading", text: "7. Causa Probable y Acciones Inmediatas", level: 2 },
    {
      type: "textarea",
      id: "rootCause",
      label: "Causa probable",
      rows: 4,
    },
    {
      type: "textarea",
      id: "immediateActions",
      label: "Acciones tomadas inmediatamente",
      rows: 4,
    },

    { type: "heading", text: "8. Recomendaciones de Prevención", level: 2 },
    {
      type: "list",
      id: "preventionActions",
      count: 5,
      itemPlaceholder: "Acción concreta para evitar que se repita",
    },
  ],
  filenameForValues: (v) => {
    const name = (v.affectedName as string) || "afectado";
    const date = (v.incidentDate as string) || "";
    const slug = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
    const parts = [slug(name), date].filter(Boolean);
    return `incidente-${parts.join("-") || "sin-info"}.pdf`;
  },
};
