import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KpiTone = "default" | "success" | "warning" | "danger" | "info";

type Props = {
  label: string;
  value: number | string;
  hint?: string;
  hintTone?: KpiTone;
  valueTone?: KpiTone;
};

const TONE_HINT: Record<KpiTone, string> = {
  default: "text-muted-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  info: "text-blue-600 dark:text-blue-400",
};

const TONE_VALUE: Record<KpiTone, string> = {
  default: "text-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  info: "text-blue-600 dark:text-blue-400",
};

export function KpiCard({
  label,
  value,
  hint,
  hintTone = "default",
  valueTone = "default",
}: Props) {
  return (
    <Card className="rounded-xl border-border/60 shadow-none">
      <CardContent className="flex flex-col gap-1.5 p-5">
        <span className="text-[13px] font-medium tracking-tight text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "text-3xl font-semibold tabular-nums tracking-tight leading-none",
            TONE_VALUE[valueTone]
          )}
        >
          {value}
        </span>
        {hint ? (
          <span className={cn("text-xs", TONE_HINT[hintTone])}>{hint}</span>
        ) : null}
      </CardContent>
    </Card>
  );
}
