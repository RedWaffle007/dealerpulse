import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  ArrowRight,
} from "lucide-react";
import type { DigestItem, DigestTone, PeriodDigest } from "@/lib/insights";
import { formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

const toneStyles: Record<
  DigestTone,
  { icon: typeof Info; dot: string; text: string; ring: string }
> = {
  good: {
    icon: TrendingUp,
    dot: "text-emerald-600 dark:text-emerald-400",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/20 bg-emerald-500/[0.04]",
  },
  bad: {
    icon: TrendingDown,
    dot: "text-red-600 dark:text-red-400",
    text: "text-red-700 dark:text-red-300",
    ring: "ring-red-500/20 bg-red-500/[0.04]",
  },
  warn: {
    icon: AlertTriangle,
    dot: "text-amber-600 dark:text-amber-400",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/20 bg-amber-500/[0.04]",
  },
  neutral: {
    icon: Info,
    dot: "text-brand",
    text: "text-foreground",
    ring: "ring-foreground/10 bg-muted/30",
  },
};

function DigestRow({ item }: { item: DigestItem }) {
  const s = toneStyles[item.tone];
  const Icon = s.icon;
  const body = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg px-3 py-2.5 ring-1 transition-colors",
        s.ring,
        item.href && "hover:brightness-[0.99] group-hover/row:underline",
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", s.dot)} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className={cn("text-sm font-medium leading-snug", s.text)}>
          {item.headline}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{item.detail}</div>
      </div>
      {item.href && (
        <ArrowRight
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60"
          aria-hidden
        />
      )}
    </div>
  );
  return item.href ? (
    <Link href={item.href} className="group/row block">
      {body}
    </Link>
  ) : (
    body
  );
}

/**
 * "What changed this period" — a scannable, delivery-anchored digest of how the
 * latest reporting month moved versus the one before it, plus the live at-risk
 * pipeline. The narrative is generated deterministically in periodDigest().
 */
export function PeriodDigestPanel({ digest }: { digest: PeriodDigest }) {
  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 md:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-base font-medium">
          What changed this period
        </h2>
        {digest.prior && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatMonth(digest.current)} vs {formatMonth(digest.prior)}
          </span>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {digest.items.map((item, i) => (
          <DigestRow key={i} item={item} />
        ))}
      </div>
    </section>
  );
}
