"use client";

import { useEffect, useRef } from "react";

/**
 * A compact "product preview" panel for the hero. Its KPIs count up once on
 * mount and then hold the real values (no distracting loop). Values are the
 * live overview figures, so it always matches the dashboard below. Animated via
 * refs + rAF (no React re-renders) and it shows the final numbers immediately
 * under prefers-reduced-motion or without JS.
 */
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function HeroPreview({
  units,
  attainmentPct,
  revenue, // in rupees
  caption,
}: {
  units: number;
  attainmentPct: number;
  revenue: number;
  caption?: string;
}) {
  const revenueCr = revenue / 1e7;
  const unitsRef = useRef<HTMLSpanElement>(null);
  const attainRef = useRef<HTMLSpanElement>(null);
  const revRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // final values are already rendered

    let raf = 0;
    let start: number | null = null;
    const DURATION = 1600; // count up once, then stop

    const frame = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      const e = easeOut(t);
      if (unitsRef.current)
        unitsRef.current.textContent = String(Math.round(units * e));
      if (attainRef.current)
        attainRef.current.textContent = `${(attainmentPct * e).toFixed(1)}%`;
      if (revRef.current)
        revRef.current.textContent = `₹${(revenueCr * e).toFixed(2)}`;
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [units, attainmentPct, revenueCr]);

  return (
    <div
      className="w-full rounded-xl border border-border bg-card p-4 shadow-sm"
      aria-hidden
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Group performance
        </span>
        {caption && (
          <span className="text-[10px] text-muted-foreground">{caption}</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Units">
          <span ref={unitsRef}>{Math.round(units)}</span>
        </Stat>
        <Stat label="Attainment">
          <span ref={attainRef}>{attainmentPct.toFixed(1)}%</span>
        </Stat>
        <Stat label="Revenue">
          <span ref={revRef}>₹{revenueCr.toFixed(2)}</span>
          <span className="text-xs font-normal text-muted-foreground"> Cr</span>
        </Stat>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-background/60 p-2 ring-1 ring-foreground/5">
      <div className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-heading text-sm [overflow-wrap:anywhere] sm:text-base font-semibold tabular-nums leading-none">
        {children}
      </div>
    </div>
  );
}
