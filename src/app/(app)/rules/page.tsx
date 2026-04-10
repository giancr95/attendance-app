// Rules page.
//
// For now this is a read-only display of the constants in `lib/rules.ts`.
// Editing them requires a code change. The plan is to lift them into a
// Settings table once the requirements stabilize so admins can tweak from
// the UI without a redeploy.

import { InfoIcon } from "lucide-react";

import { ATTENDANCE_RULES } from "@/lib/rules";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "Reglas · LCDP",
};

function fmtTime(t: { hour: number; minute: number }) {
  return `${t.hour.toString().padStart(2, "0")}:${t.minute
    .toString()
    .padStart(2, "0")}`;
}

export default function RulesPage() {
  const days = [
    ["Lunes", ATTENDANCE_RULES.workdayWeekday.monday],
    ["Martes", ATTENDANCE_RULES.workdayWeekday.tuesday],
    ["Miércoles", ATTENDANCE_RULES.workdayWeekday.wednesday],
    ["Jueves", ATTENDANCE_RULES.workdayWeekday.thursday],
    ["Viernes", ATTENDANCE_RULES.workdayWeekday.friday],
    ["Sábado", ATTENDANCE_RULES.workdayWeekday.saturday],
    ["Domingo", ATTENDANCE_RULES.workdayWeekday.sunday],
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reglas de asistencia"
        subtitle="Parámetros que determinan tardanzas, horas laborales y nómina."
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-100">
        <div className="flex items-start gap-2">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Configuración por código</p>
            <p className="text-amber-800 dark:text-amber-200">
              Estas reglas viven en{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/30">
                src/lib/rules.ts
              </code>
              . Para editarlas se requiere un cambio de código + redeploy. La
              migración a una tabla de configuración editable está planeada
              cuando las reglas se estabilicen.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horario</CardTitle>
            <CardDescription>Tiempos de entrada y umbral de tardanza</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entrada esperada</span>
              <span className="font-mono font-medium">
                {fmtTime(ATTENDANCE_RULES.entranceTimeCr)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Umbral de tardanza</span>
              <span className="font-mono font-medium">
                {fmtTime(ATTENDANCE_RULES.lateThresholdCr)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Horas regulares/día</span>
              <span className="font-mono font-medium">
                {ATTENDANCE_RULES.regularHoursPerDay} h
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Almuerzo (sin marca)
              </span>
              <span className="font-mono font-medium">
                {ATTENDANCE_RULES.defaultLunchMinutes} min
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Días laborales</CardTitle>
            <CardDescription>
              Días contados como hábiles para reportes y nómina
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5 text-sm">
              {days.map(([label, on]) => (
                <li key={label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span
                    className={`font-medium ${
                      on
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {on ? "Laboral" : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Interpretación de marcajes
            </CardTitle>
            <CardDescription>
              Cómo se mapean las marcas del dispositivo a entrada / almuerzo /
              salida
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <span className="font-mono text-foreground">1.ª marca</span> →
                Entrada
              </li>
              <li>
                <span className="font-mono text-foreground">2.ª marca</span> →
                Salida a almuerzo
              </li>
              <li>
                <span className="font-mono text-foreground">3.ª marca</span> →
                Regreso de almuerzo
              </li>
              <li>
                <span className="font-mono text-foreground">Última marca</span>{" "}
                → Salida
              </li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              Las etiquetas que el dispositivo asigna a cada marca (Entrada,
              Salida, etc.) se ignoran porque los empleados rara vez presionan
              la tecla correcta. Solo se usan en la vista de{" "}
              <strong className="text-foreground">Datos crudos</strong> para
              auditoría.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
