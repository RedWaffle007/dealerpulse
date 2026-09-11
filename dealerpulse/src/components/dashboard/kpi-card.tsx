import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
  href,
  drillLabel,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: KpiTone;
  /** When set, the whole card becomes a drill-down link to the underlying data. */
  href?: string;
  /** Short caption for what clicking reveals, e.g. "by branch". */
  drillLabel?: string;
}) {
  const card = (
    <Card
      className={cn(
        "relative h-full gap-0 overflow-hidden py-4 transition-all",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        railClasses[tone],
        href &&
          "cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:ring-brand/40 focus-within:ring-brand/40",
      )}
    >
      <CardContent className="px-4 pl-5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          {href && (
            <ArrowUpRight
              className="size-3.5 text-muted-foreground/50 transition-colors group-hover/card:text-brand"
              aria-hidden
            />
          )}
        </div>
        <div
          className={cn(
            "mt-1.5 font-heading text-[1.6rem] font-semibold tabular-nums leading-none",
            valueClasses[tone],
          )}
        >
          {value}
        </div>
        {sub && <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div>}
        {href && drillLabel && (
          <div className="mt-2 text-[10px] font-medium uppercase tracking-wide text-brand/80">
            {drillLabel} →
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!href) return card;
  return (
    <Link
      href={href}
      className="group/card block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      aria-label={`${label}: ${value}. ${drillLabel ?? "View details"}`}
    >
      {card}
    </Link>
  );
}
