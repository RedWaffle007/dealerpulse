"use client";

import { useEffect, useRef } from "react";

/**
 * A self-contained, looping "product preview" for the hero — a mini dashboard
 * whose KPIs count up and whose bars grow, on a ~3s loop. Pure decoration built
 * in code (no video asset), animated via refs + rAF so it never re-renders the
 * React tree, and it holds its final frame under prefers-reduced-motion.
 */
const BARS = [8, 15, 22, 30, 26, 34, 41]; // illustrative monthly deliveries
const BAR_MAX = Math.max(...BARS);

// Target KPI values shown counting up.
const UNITS = 176;
const ATTAIN = 12; // %
const REVENUE = 42.5; // ₹ Cr

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function HeroPreview() {
  const unitsRef = useRef<HTMLSpanElement>(null);
  const attainRef = useRef<HTMLSpanElement>(null);
  const revRef = useRef<HTMLSpanElement>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // leave the static final frame in place

    let raf = 0;
    let start: number | null = null;
    const RISE = 1500;
    const HOLD = 1400;
    const CYCLE = RISE + HOLD;

    const frame = (now: number) => {
      if (start === null) start = now;
      const elapsed = (now - start) % CYCLE;
      const t = elapsed < RISE ? easeOut(elapsed / RISE) : 1;

      if (unitsRef.current)
        unitsRef.current.textContent = String(Math.round(UNITS * t));
      if (attainRef.current)
        attainRef.current.textContent = `${Math.round(ATTAIN * t)}%`;
      if (revRef.current)
        revRef.current.textContent = `₹${(REVENUE * t).toFixed(1)}`;
      barRefs.current.forEach((bar, i) => {
        if (bar) bar.style.height = `${(BARS[i] / BAR_MAX) * 100 * t}%`;
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="w-full rounded-2xl border border-white/60 bg-card/80 p-4 shadow-xl ring-1 ring-brand/10 backdrop-blur dark:border-white/10"
      aria-hidden
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Group performance · live
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
          syncing
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Units" prefix="">
          <span ref={unitsRef}>{UNITS}</span>
        </Stat>
        <Stat label="Attainment" prefix="">
          <span ref={attainRef}>{ATTAIN}%</span>
        </Stat>
        <Stat label="Revenue" prefix="">
          <span ref={revRef}>₹{REVENUE.toFixed(1)}</span>
          <span className="text-xs font-normal text-muted-foreground"> Cr</span>
        </Stat>
      </div>

      <div className="mt-4 flex h-24 gap-1.5">
        {BARS.map((v, i) => (
          <div
            key={i}
            className="relative flex-1 overflow-hidden rounded-sm bg-muted"
          >
            <div
              ref={(el) => {
                barRefs.current[i] = el;
              }}
              className="absolute bottom-0 w-full rounded-sm bg-gradient-to-t from-brand to-brand/60"
              style={{ height: `${(v / BAR_MAX) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[9px] text-muted-foreground">
        <span>Jun</span>
        <span>Dec</span>
      </div>
    </div>
  );
}

function Stat({
  label,
  prefix,
  children,
}: {
  label: string;
  prefix: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-background/60 p-2 ring-1 ring-foreground/5">
      <div className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-heading text-base font-semibold tabular-nums leading-none">
        {prefix}
        {children}
      </div>
    </div>
  );
}
