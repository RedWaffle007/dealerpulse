"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { ArrowUpRight, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import { cn } from "@/lib/utils";

/** A month-over-month change: a percent change, or a percentage-point change. */
export type KpiDelta = { value: number; kind: "pct" | "pts" };

function DeltaChip({ delta, label }: { delta: KpiDelta; label?: string }) {
  const up = delta.value > 0.05;
  const down = delta.value < -0.05;
  const mag =
    delta.kind === "pts"
      ? `${Math.abs(delta.value).toFixed(1)} pts`
      : `${Math.abs(delta.value).toFixed(0)}%`;
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums",
          up && "bg-accent-pista/15 text-accent-pista",
          down && "bg-accent-red/15 text-accent-red",
          !up && !down && "bg-muted text-muted-foreground",
        )}
      >
        {up && <ArrowUp className="size-2.5" aria-hidden />}
        {down && <ArrowDown className="size-2.5" aria-hidden />}
        {mag}
      </span>
      {label && (
        <span className="text-[10px] text-muted-foreground">{label}</span>
      )}
    </span>
  );
}

export type KpiTone = "neutral" | "good" | "warn" | "bad";

const valueClasses: Record<KpiTone, string> = {
  neutral: "text-foreground",
  good: "text-accent-pista",
  warn: "text-accent-golden",
  bad: "text-accent-red",
};

// A thin colored rail on the left edge cues health at a glance.
const railClasses: Record<KpiTone, string> = {
  neutral: "before:bg-brand",
  good: "before:bg-accent-pista",
  warn: "before:bg-accent-golden",
  bad: "before:bg-accent-red",
};

export function KpiCard({
  label,
  value,
  sub,
  tone = "neutral",
  href,
  drillLabel,
  spark,
  delta,
  deltaLabel,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: KpiTone;
  /** When set, the whole card becomes a drill-down link to the underlying data. */
  href?: string;
  /** Short caption for what clicking reveals, e.g. "by branch". */
  drillLabel?: string;
  /** Monthly series for an inline trend sparkline. */
  spark?: number[];
  /** Month-over-month change chip. */
  delta?: KpiDelta | null;
  /** Caption for the delta, e.g. "vs Nov". */
  deltaLabel?: string;
}) {
  const card = (
    <Card
      className={cn(
        "relative h-full gap-0 overflow-hidden py-4",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        railClasses[tone],
        href &&
          "cursor-pointer",
      )}
    >
      <CardContent className="px-4 pl-5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          {href && (
            <ArrowUpRight
              className="size-3.5 text-muted-foreground transition-colors duration-150 group-hover/card:text-brand"
              aria-hidden
            />
          )}
        </div>
        <div
          className={cn(
            "mt-2 font-heading text-[1.4rem] tracking-tight [overflow-wrap:anywhere] sm:text-[1.6rem] font-semibold tabular-nums leading-none",
            valueClasses[tone],
          )}
        >
          {value}
        </div>
        {sub && <div className="mt-2 text-xs leading-relaxed text-muted-foreground">{sub}</div>}
        {(delta || (spark && spark.length > 1)) && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {delta ? <DeltaChip delta={delta} label={deltaLabel} /> : <span />}
            {spark && <Sparkline values={spark} />}
          </div>
        )}
        {href && drillLabel && (
          <div className="mt-2 text-[10px] font-medium uppercase tracking-wide text-brand/80">
            {drillLabel} →
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!href) return card;

  const wrapperClass =
    "group/card block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const ariaLabel = `${label}: ${value}. ${drillLabel ?? "View details"}`;

  // On-page anchors (#section): scroll on every click, even when the hash is
  // already set or shared by several cards — a plain hash link would no-op.
  if (href.startsWith("#")) {
    const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
      const el = document.getElementById(href.slice(1));
      if (!el) return; // fall back to default anchor behavior
      e.preventDefault();
      // If the target is a collapsible section, expand it before scrolling so
      // the click lands on its data, not a collapsed header.
      if (el instanceof HTMLDetailsElement) el.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", href); // keep the hash shareable, no jump
    };
    return (
      <a href={href} onClick={onClick} className={wrapperClass} aria-label={ariaLabel}>
        {card}
      </a>
    );
  }

  // Cross-page drill-downs use client navigation.
  return (
    <Link href={href} className={wrapperClass} aria-label={ariaLabel}>
      {card}
    </Link>
  );
}
