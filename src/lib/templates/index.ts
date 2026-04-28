// Registry of all available HR document templates.
//
// Adding a new template is a 2-step process:
//   1. Create a new file under this directory exporting a `Template`.
//   2. Add it to TEMPLATES below. The /plantillas page picks it up
//      automatically.

import type { Template } from "./types";
import { complaint } from "./complaint";
import { incident } from "./incident";
import { meetingMinutes } from "./meeting-minutes";
import { weeklyReport } from "./weekly-report";

export type {
  Template,
  TemplateSection,
  TemplateField,
  TemplateValues,
} from "./types";
export { getStringValue, getListValue, getTableValue } from "./types";

export const TEMPLATES: Template[] = [
  weeklyReport,
  complaint,
  incident,
  meetingMinutes,
];

export const TEMPLATE_BY_ID: Record<string, Template> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t])
);

export const CATEGORY_LABEL: Record<Template["category"], string> = {
  desempeno: "Desempeño",
  rrhh: "Recursos Humanos",
  incidentes: "Seguridad e incidentes",
  operativo: "Operación",
};
