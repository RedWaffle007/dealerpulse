import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KpiTone = "neutral" | "good" | "warn" | "bad";

const valueClasses: Record<KpiTone, string> = {
  neutral: "text-foreground",
  good: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  bad: "text-red-600 dark:text-red-400",
};

// A thin colored rail on the left edge cues health at a glance.
const railClasses: Record<KpiTone, string> = {
  neutral: "before:bg-brand",
  good: "before:bg-emerald-500",
  warn: "before:bg-amber-500",
  bad: "before:bg-red-500",
};

export function KpiCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: KpiTone;
}) {
  return (
    <Card
      className={cn(
        "relative gap-0 overflow-hidden py-4 transition-shadow hover:shadow-md",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        railClasses[tone],
      )}
    >
      <CardContent className="px-4 pl-5">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            "mt-1.5 text-2xl font-semibold tabular-nums leading-none",
            valueClasses[tone],
          )}
        >
          {value}
        </div>
        {sub && <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
