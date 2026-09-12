"use client";

import { useState, type ReactNode } from "react";
import {
  TrendingUp,
  ShieldCheck,
  GraduationCap,
  Megaphone,
} from "lucide-react";
import type { ScenarioInputs } from "@/lib/insights";
import {
  conversionLift,
  liftedConversionPct,
  recoverAtRisk,
  coaching,
  scaleSource,
  attainmentAfter,
} from "@/lib/scenario";
import { formatCrore, formatInt, formatPct, stageLabel } from "@/lib/format";

/** A number rendered as "+6.3 units" style (one decimal, dropped when whole). */
function units(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? `${r}` : r.toFixed(1);
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
  format,
  hint,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  label: string;
  format: (n: number) => string;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        <span className="font-heading text-sm font-semibold tabular-nums text-brand">
          {format(value)}
        </span>
      </div>
      {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-brand hover-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={label}
      />
    </div>
  );
}

function ScenarioCard({
  icon: Icon,
  title,
  control,
  primary,
  secondary,
  note,
}: {
  icon: typeof TrendingUp;
  title: string;
  control: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
  note: string;
}) {
  return (
    <div data-slot="scenario-card" className="flex min-w-0 flex-col gap-5 rounded-xl bg-card p-5 border border-border border-t-2 border-t-brand even:border-t-brand-secondary hover-highlight">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-base font-semibold leading-tight">
            {title}
          </h3>
        </div>
      </div>

      {control}

      <div className="mt-auto rounded-lg bg-brand/[0.06] p-4">
        <div className="font-heading text-4xl font-semibold leading-tight tabular-nums text-brand [overflow-wrap:anywhere]">
          {primary}
        </div>
        {secondary && (
          <details className="mt-2 text-xs text-muted-foreground tabular-nums">
            <summary className="w-fit cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-ring">More detail</summary>
            <div className="mt-2 leading-relaxed">{secondary}</div>
          </details>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">{note}</p>
    </div>
  );
}

/**
 * The What-If modeler: four independent levers an executive can pull to size
 * the upside of a decision. Baselines come from the current view; all math is
 * pure (scenario.ts). Scenarios are NOT summed — they draw on overlapping
 * leads, so a naive total would double-count.
 */
export function ScenarioLab({ inputs }: { inputs: ScenarioInputs }) {
  const [deltaPts, setDeltaPts] = useState(5);
  const [recoverPct, setRecoverPct] = useState(50);
  const [closeGapPct, setCloseGapPct] = useState(50);
  const [source, setSource] = useState(inputs.bestSource ?? "");
  const [newLeads, setNewLeads] = useState(50);

  const hasBaseline = inputs.leadsInView > 0 && inputs.targetUnits > 0;

  // Lever A — conversion lift.
  const a = conversionLift(inputs, deltaPts);
  const aAttain = attainmentAfter(inputs, a.units);

  // Lever B — recover at-risk pipeline.
  const b = recoverAtRisk(inputs, recoverPct);

  // Lever C — coaching to median.
  const c = coaching(inputs, closeGapPct);
  const cAttain = attainmentAfter(inputs, c.units);

  // Lever D — scale a source.
  const dRes = scaleSource(inputs, source, newLeads);
  const dAttain = attainmentAfter(inputs, dRes.units);
  const srcOpt = inputs.sources.find((s) => s.source === source);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* A: Conversion lift */}
      <ScenarioCard
        icon={TrendingUp}
        title="Convert more leads"
        control={
          <Slider
            label="Raise conversion rate"
            value={deltaPts}
            min={0}
            max={15}
            step={1}
            onChange={setDeltaPts}
            format={(n) => `+${n} points → ${formatPct(inputs.baseConversionPct, 0)} to ${formatPct(liftedConversionPct(inputs, n), 0)}`}
            hint="Share of leads that convert, not a lead count."
          />
        }
        primary={
          <>
            +{units(a.units)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              cars delivered this period
            </span>
          </>
        }
        secondary={
          hasBaseline ? (
            <>
              +{formatCrore(a.revenue)} revenue · Unit-target attainment: {formatPct(attainmentAfter(inputs, 0), 0)} →{" "}
              <span className="font-medium text-foreground">
                {formatPct(aAttain, 0)}
              </span> (share of this period's car target)
            </>
          ) : (
            <>+{formatCrore(a.revenue)} revenue</>
          )
        }
        note={`What this shows: extra conversions become delivered cars.`}
      />

      {/* B: Recover at-risk pipeline */}
      <ScenarioCard
        icon={ShieldCheck}
        title="Rescue at-risk deals"
        control={
          inputs.atRiskCount > 0 ? (
            <Slider
              label="Deals recovered"
              value={recoverPct}
              min={0}
              max={100}
              step={5}
              onChange={setRecoverPct}
              format={(n) => `${n}%`}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              No deals need rescue.
            </p>
          )
        }
        primary={
          <>
            {formatCrore(b.revenue)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              protected revenue this period
            </span>
          </>
        }
        secondary={<>{units(b.deals)} deals saved from slipping</>}
        note={`What this shows: recovering idle deals protects booked revenue.`}
      />

      {/* C: Coaching to median */}
      <ScenarioCard
        icon={GraduationCap}
        title="Coach the team"
        control={
          inputs.laggards.length > 0 ? (
            <Slider
              label={`Bring ${inputs.laggards.length} below-average reps ${closeGapPct}% of the way to the team's median conversion`}
              value={closeGapPct}
              min={0}
              max={100}
              step={5}
              onChange={setCloseGapPct}
              format={(n) => `${n}%`}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              No eligible reps to coach.
            </p>
          )
        }
        primary={
          <>
            +{units(c.units)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              cars delivered this period
            </span>
          </>
        }
        secondary={
          inputs.laggards.length > 0 ? (
            <>
              +{formatCrore(c.revenue)} · ceiling{" "}
              {units(inputs.coachingCeilingUnits)} cars
              {hasBaseline && (
                <>
                  {" "}
                  · attainment → {formatPct(cAttain, 0)}
                </>
              )}
            </>
          ) : undefined
        }
        note="What this shows: closing the team gap adds delivered cars."
      />

      {/* D: Scale a source */}
      <ScenarioCard
        icon={Megaphone}
        title="Grow a channel"
        control={
          inputs.sources.length > 0 ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full rounded-md border border-input bg-background hover-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring px-2.5 py-1.5 text-sm"
                  aria-label="Lead source"
                >
                  {inputs.sources.map((s) => (
                    <option key={s.source} value={s.source}>
                      {stageLabel(s.source)} · {formatPct(s.conversionPct, 0)} conv
                    </option>
                  ))}
                </select>
              </div>
              <Slider
                label="Extra leads"
                value={newLeads}
                min={0}
                max={200}
                step={10}
                onChange={setNewLeads}
                format={(n) => `+${n}`}
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No channel data available.
            </p>
          )
        }
        primary={
          <>
            +{units(dRes.units)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              cars delivered this period
            </span>
          </>
        }
        secondary={
          srcOpt ? (
            <>
              +{formatCrore(dRes.revenue)}
              {hasBaseline && <> · attainment → {formatPct(dAttain, 0)}</>}
            </>
          ) : undefined
        }
        note="What this shows: more leads from this channel create expected deliveries."
      />
    </div>
  );
}
