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
import { formatCrore, formatINR, formatInt, formatPct, stageLabel } from "@/lib/format";

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
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  label: string;
  format: (n: number) => string;
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
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-brand"
        aria-label={label}
      />
    </div>
  );
}

function ScenarioCard({
  icon: Icon,
  title,
  question,
  control,
  primary,
  secondary,
  note,
}: {
  icon: typeof TrendingUp;
  title: string;
  question: string;
  control: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-all hover:ring-brand/30 hover:shadow-md hover:shadow-brand/10">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-sm font-semibold leading-tight">
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{question}</p>
        </div>
      </div>

      {control}

      <div className="mt-auto rounded-lg bg-muted/40 p-3">
        <div className="font-heading text-xl font-semibold leading-none tabular-nums text-foreground">
          {primary}
        </div>
        {secondary && (
          <div className="mt-1.5 text-sm text-muted-foreground tabular-nums">
            {secondary}
          </div>
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
  const newConv = liftedConversionPct(inputs, deltaPts);

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
        title="Lift lead conversion"
        question={`What if the team converts more of its ${formatInt(inputs.leadsInView)} leads?`}
        control={
          <Slider
            label={`Conversion ${formatPct(inputs.baseConversionPct, 0)} → ${formatPct(newConv, 0)}`}
            value={deltaPts}
            min={0}
            max={15}
            step={0.5}
            onChange={setDeltaPts}
            format={(n) => `+${n} pts`}
          />
        }
        primary={
          <>
            +{units(a.units)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              cars
            </span>
          </>
        }
        secondary={
          hasBaseline ? (
            <>
              +{formatCrore(a.revenue)} revenue · attainment{" "}
              {formatPct(attainmentAfter(inputs, 0), 0)} →{" "}
              <span className="font-medium text-foreground">
                {formatPct(aAttain, 0)}
              </span>
            </>
          ) : (
            <>+{formatCrore(a.revenue)} revenue</>
          )
        }
        note={`Each point of conversion is worth ${units(inputs.leadsInView / 100)} cars on this book, at the in-view average deal of ${formatINR(inputs.avgDealValue)}.`}
      />

      {/* B: Recover at-risk pipeline */}
      <ScenarioCard
        icon={ShieldCheck}
        title="Rescue at-risk pipeline"
        question={`What if you save deals from the ${formatInt(inputs.atRiskCount)} flagged in the Action Center?`}
        control={
          inputs.atRiskCount > 0 ? (
            <Slider
              label="Share of at-risk deals recovered"
              value={recoverPct}
              min={0}
              max={100}
              step={5}
              onChange={setRecoverPct}
              format={(n) => `${n}%`}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Nothing is flagged at risk in this view.
            </p>
          )
        }
        primary={
          <>
            {formatCrore(b.revenue)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              protected
            </span>
          </>
        }
        secondary={<>{units(b.deals)} deals saved from slipping</>}
        note={`The flagged book is ${formatCrore(inputs.atRiskValue)} of open pipeline going stale or overdue. This is revenue protected from loss (future deliveries), so it is shown apart from period attainment.`}
      />

      {/* C: Coaching to median */}
      <ScenarioCard
        icon={GraduationCap}
        title="Coach laggards to the median"
        question={`What if below-median reps closed at the team median (${formatPct(inputs.medianConversionPct, 0)})?`}
        control={
          inputs.laggards.length > 0 ? (
            <Slider
              label={`Gap to median closed · ${inputs.laggards.length} reps`}
              value={closeGapPct}
              min={0}
              max={100}
              step={5}
              onChange={setCloseGapPct}
              format={(n) => `${n}%`}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Not enough rep sample in this view to model coaching.
            </p>
          )
        }
        primary={
          <>
            +{units(c.units)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              cars
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
        note={
          inputs.laggards.length > 0
            ? `Biggest lever: ${inputs.laggards[0].name} (${formatPct(inputs.laggards[0].conversionPct, 0)} on ${formatInt(inputs.laggards[0].leads)} leads). Only reps above a 5-lead sample floor are counted.`
            : "Rep rankings need at least 5 leads to be reliable; this view has too few."
        }
      />

      {/* D: Scale a source */}
      <ScenarioCard
        icon={Megaphone}
        title="Grow your best channels"
        question="What if more leads came through a high-converting source?"
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
                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
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
                label="Extra leads added"
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
              No source data in this view.
            </p>
          )
        }
        primary={
          <>
            +{units(dRes.units)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              cars
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
        note={
          srcOpt
            ? `Projected at ${stageLabel(source)}'s own history: ${formatPct(srcOpt.conversionPct, 0)} conversion, ${formatINR(srcOpt.revenuePerLead)} per lead. Assumes the channel scales at its observed quality.`
            : "Pick a source to model added demand at that channel's historical quality."
        }
      />
    </div>
  );
}
