import {
  OPEN_STATUSES,
  STAGES,
  type Dataset,
  type Filter,
  type Lead,
  type Stage,
} from "./types";
import type { Indexes } from "./indexes";
import {
  actionItems,
  branchComparison,
  kpis,
  monthlyAttainment,
  reachedStages,
  repLeaderboard,
  sourceQuality,
  type MonthPoint,
} from "./metrics";

/**
 * Higher-level, decision-support analytics built on top of the pure metric
 * layer (metrics.ts): a probability-weighted pipeline forecast, a delivery-
 * anchored "what changed" digest, and the baselines the interactive What-If
 * modeler perturbs. Everything here is deterministic and obeys the same metric
 * contract, so tests can pin the figures to the dataset.
 */

// Group-average deal value, used as a fallback when a filtered view has no
// deliveries of its own to average.
function groupAvgDealValue(d: Dataset, idx: Indexes): number {
  if (!d.deliveries.length) return 0;
  const total = d.deliveries.reduce(
    (s, x) => s + (idx.leadById.get(x.lead_id)?.deal_value ?? 0),
    0,
  );
  return total / d.deliveries.length;
}

/** Branch/rep scope WITHOUT the month filter (for stable historical rates). */
function inScope(l: Lead, f: Filter): boolean {
  return (
    (!f.branchId || l.branch_id === f.branchId) &&
    (!f.repId || l.assigned_to === f.repId)
  );
}

// ---- stage close rates + weighted pipeline forecast -------------------------

export type StageCloseRate = {
  stage: Stage;
  reached: number;
  delivered: number;
  /** Share of leads that reached this stage which have been delivered to date. */
  p: number;
};

/**
 * P(delivered | reached stage), computed over the full branch/rep-scoped book
 * (all months, so the rate isn't skewed by immature recent cohorts). Because
 * every delivered lead necessarily passed through each earlier stage, the
 * delivered count is constant across stages and the rate rises monotonically —
 * later stages are genuinely likelier to close. In-flight (still-open) leads
 * count against the denominator, so this is deliberately conservative.
 */
export function stageCloseRates(d: Dataset, f: Filter): StageCloseRate[] {
  const leads = d.leads.filter((l) => inScope(l, f));
  const pipelineStages = STAGES.slice(0, -1); // exclude "delivered" itself
  return pipelineStages.map((stage) => {
    let reached = 0;
    let delivered = 0;
    for (const l of leads) {
      if (reachedStages(l).has(stage)) {
        reached += 1;
        if (l.status === "delivered") delivered += 1;
      }
    }
    return { stage, reached, delivered, p: reached ? delivered / reached : 0 };
  });
}

export type ForecastStage = {
  stage: Stage;
  count: number;
  value: number;
  p: number;
  expectedUnits: number;
  expectedValue: number;
};

export type PipelineForecast = {
  openCount: number;
  openValue: number;
  expectedUnits: number;
  expectedValue: number;
  byStage: ForecastStage[];
};

/**
 * Probability-weighted view of the open pipeline: each live lead's face value
 * discounted by its current stage's historical close rate. Answers "if the
 * team works today's open book at its usual effectiveness, what actually lands?"
 * — the do-nothing baseline the What-If scenarios move against.
 */
export function pipelineForecast(
  d: Dataset,
  idx: Indexes,
  f: Filter,
): PipelineForecast {
  const rate = new Map(stageCloseRates(d, f).map((r) => [r.stage, r.p]));
  const open = d.leads.filter(
    (l) => inScope(l, f) && OPEN_STATUSES.has(l.status),
  );

  const agg = new Map<Stage, { count: number; value: number }>();
  for (const l of open) {
    const s = l.status as Stage;
    const e = agg.get(s) ?? { count: 0, value: 0 };
    e.count += 1;
    e.value += l.deal_value;
    agg.set(s, e);
  }

  const byStage: ForecastStage[] = STAGES.filter((s) => agg.has(s)).map((s) => {
    const { count, value } = agg.get(s)!;
    const p = rate.get(s) ?? 0;
    return {
      stage: s,
      count,
      value,
      p,
      expectedUnits: count * p,
      expectedValue: value * p,
    };
  });

  return {
    openCount: open.length,
    openValue: open.reduce((s, l) => s + l.deal_value, 0),
    expectedUnits: byStage.reduce((s, x) => s + x.expectedUnits, 0),
    expectedValue: byStage.reduce((s, x) => s + x.expectedValue, 0),
    byStage,
  };
}

// ---- KPI sparklines + month-over-month deltas -------------------------------

export type Spark = {
  /** Monthly values within the selected range, chronological. */
  series: number[];
  /** Latest in-range month value. */
  curr: number;
  /** The prior calendar month's value, or null if none exists. */
  prev: number | null;
};
export type KpiSparks = { units: Spark; attainment: Spark; revenue: Spark };

/**
 * Monthly series + latest/prior values for the three delivery-anchored KPIs
 * (units, attainment, revenue). Deliberately excludes lead conversion and the
 * open-pipeline snapshots: a monthly conversion trend is confounded by cohort
 * immaturity (see periodDigest), and snapshots have no monthly series — a
 * sparkline on either would mislead. `prev` is the immediately preceding
 * calendar month (which may fall outside the selected range) to give an honest
 * month-over-month delta.
 */
export function kpiSparks(d: Dataset, idx: Indexes, f: Filter): KpiSparks {
  const all = monthlyAttainment(d, idx, f);
  const inRange = f.months?.length
    ? all.filter((m) => f.months!.includes(m.month))
    : all;
  const latest = inRange[inRange.length - 1];
  const priorMonth = latest
    ? idx.months[idx.months.indexOf(latest.month) - 1]
    : undefined;
  const prior = priorMonth
    ? all.find((m) => m.month === priorMonth)
    : undefined;

  const mk = (sel: (m: MonthPoint) => number): Spark => ({
    series: inRange.map(sel),
    curr: latest ? sel(latest) : 0,
    prev: prior ? sel(prior) : null,
  });

  return {
    units: mk((m) => m.delivered),
    attainment: mk((m) => m.attainmentPct),
    revenue: mk((m) => m.revenue),
  };
}

// ---- "what changed this period" digest --------------------------------------

export type DigestTone = "good" | "warn" | "bad" | "neutral";
export type DigestItem = {
  tone: DigestTone;
  headline: string;
  detail: string;
  href?: string;
};
export type PeriodDigest = {
  current: string;
  prior: string | null;
  items: DigestItem[];
};

function pct(n: number, dp = 1): string {
  return `${n.toFixed(dp)}%`;
}
function signedPts(n: number, dp = 1): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(dp)} pts`;
}
function crore(n: number): string {
  return `₹${(n / 1e7).toFixed(2)} Cr`;
}

/**
 * A deterministic, plain-language summary of how the latest reporting month
 * moved versus the one before it. Deliberately delivery-anchored (attainment,
 * units, revenue keyed on delivery_date) — it never reports month-over-month
 * lead conversion, which is confounded by cohort immaturity: the newest month's
 * leads are still inside the ~37-day sales cycle, so their conversion always
 * looks near-zero and would read as a false alarm.
 */
export function periodDigest(
  d: Dataset,
  idx: Indexes,
  f: Filter,
): PeriodDigest {
  const months = f.months?.length ? f.months : idx.months;
  const current = months[months.length - 1];
  const priorIdx = idx.months.indexOf(current) - 1;
  const prior = priorIdx >= 0 ? idx.months[priorIdx] : null;

  const at = (month: string): Filter => ({ branchId: f.branchId, months: [month] });
  const items: DigestItem[] = [];

  // Always surface current at-risk pipeline (a present-tense snapshot).
  const risks = actionItems(d, idx, { branchId: f.branchId, months: [current] });
  const riskValue = risks.reduce((s, a) => s + a.value, 0);

  if (!prior) {
    items.push({
      tone: "neutral",
      headline: `${current} is the first reporting month`,
      detail: "No prior month to compare against yet.",
    });
    if (risks.length) {
      items.push({
        tone: "warn",
        headline: `${risks.length} open deals need attention`,
        detail: `${crore(riskValue)} at risk, led by ${risks[0].customer} (${crore(risks[0].value)}).`,
        href: "/actions",
      });
    }
    return { current, prior, items };
  }

  const curMonths = monthlyAttainment(d, idx, at(current));
  const prevMonths = monthlyAttainment(d, idx, at(prior));
  const cur = curMonths.find((m) => m.month === current)!;
  const prev = prevMonths.find((m) => m.month === prior)!;

  // 1) Unit attainment movement.
  const attainDelta = cur.attainmentPct - prev.attainmentPct;
  items.push({
    tone: attainDelta >= 0 ? "good" : "bad",
    headline: `Unit attainment ${attainDelta >= 0 ? "rose" : "fell"} ${signedPts(attainDelta)} to ${pct(cur.attainmentPct)}`,
    detail: `${cur.delivered} cars delivered vs ${prev.delivered} the month before, against a ${cur.target}-unit target.`,
  });

  // 2) Revenue movement (realized on delivery).
  const revDeltaPct = prev.revenue ? (100 * (cur.revenue - prev.revenue)) / prev.revenue : 0;
  items.push({
    tone: cur.revenue >= prev.revenue ? "good" : "bad",
    headline: `Revenue ${cur.revenue >= prev.revenue ? "rose" : "fell"} ${prev.revenue ? `${revDeltaPct >= 0 ? "+" : ""}${revDeltaPct.toFixed(0)}%` : ""} to ${crore(cur.revenue)}`,
    detail: `Up from ${crore(prev.revenue)} in ${prior}.`,
  });

  // 3) Biggest branch movers (only when not already scoped to one branch).
  if (!f.branchId) {
    const curB = branchComparison(d, idx, at(current)).filter((b) => b.targetUnits > 0);
    const prevMap = new Map(
      branchComparison(d, idx, at(prior)).map((b) => [b.branchId, b.attainmentPct]),
    );
    const moves = curB
      .map((b) => ({
        name: b.name,
        branchId: b.branchId,
        delta: b.attainmentPct - (prevMap.get(b.branchId) ?? 0),
        attain: b.attainmentPct,
      }))
      .sort((a, b) => b.delta - a.delta);
    const gainer = moves[0];
    const dropper = moves[moves.length - 1];
    if (gainer && gainer.delta > 0.05) {
      items.push({
        tone: "good",
        headline: `${gainer.name} improved most (${signedPts(gainer.delta, 0)})`,
        detail: `Now at ${pct(gainer.attain, 0)} of target for ${current}.`,
        href: `/branches/${gainer.branchId}`,
      });
    }
    if (dropper && dropper.delta < -0.05 && dropper.branchId !== gainer?.branchId) {
      items.push({
        tone: "bad",
        headline: `${dropper.name} slipped most (${signedPts(dropper.delta, 0)})`,
        detail: `Down to ${pct(dropper.attain, 0)} of target for ${current}.`,
        href: `/branches/${dropper.branchId}`,
      });
    }
  }

  // 4) Present at-risk pipeline.
  if (risks.length) {
    items.push({
      tone: "warn",
      headline: `${risks.length} open deals need attention now`,
      detail: `${crore(riskValue)} at risk, led by ${risks[0].customer} (${crore(risks[0].value)}).`,
      href: "/actions",
    });
  }

  return { current, prior, items };
}

// ---- What-If scenario baselines ---------------------------------------------

export type Laggard = {
  repId: string;
  name: string;
  leads: number;
  conversionPct: number;
  gapPts: number;
  maxUnits: number; // units gained if this rep reached the median
};

export type SourceOption = {
  source: string;
  leads: number;
  conversionPct: number;
  revenuePerLead: number;
};

export type ScenarioInputs = {
  leadsInView: number;
  baseUnits: number;
  targetUnits: number;
  baseConversionPct: number;
  /** Realized revenue per delivered car in view (group fallback if none). */
  avgDealValue: number;
  baseRevenue: number;
  // Lever B — recover at-risk pipeline.
  atRiskCount: number;
  atRiskValue: number;
  // Lever C — coaching below-median reps up to the median.
  medianConversionPct: number;
  laggards: Laggard[];
  coachingCeilingUnits: number;
  // Lever D — grow a chosen source at its own historical quality.
  sources: SourceOption[];
  bestSource: string | null;
};

/**
 * The fixed baselines the What-If modeler reads; all live slider arithmetic is
 * pure and happens client-side (see scenario-lab.tsx and scenario.ts), so the
 * numbers here are the only thing that touches the dataset.
 */
export function scenarioInputs(
  d: Dataset,
  idx: Indexes,
  f: Filter,
): ScenarioInputs {
  const k = kpis(d, idx, f);
  const avgDealValue = k.unitsDelivered
    ? k.revenue / k.unitsDelivered
    : groupAvgDealValue(d, idx);

  const risks = actionItems(d, idx, f);
  const atRiskValue = risks.reduce((s, a) => s + a.value, 0);

  // Coaching: reps above the sample floor, gap to the team median conversion.
  const reps = repLeaderboard(d, idx, f).filter((r) => !r.belowSample);
  const convs = reps.map((r) => r.conversionPct).sort((a, b) => a - b);
  const median = convs.length
    ? convs.length % 2
      ? convs[(convs.length - 1) / 2]
      : (convs[convs.length / 2 - 1] + convs[convs.length / 2]) / 2
    : 0;
  const laggards: Laggard[] = reps
    .filter((r) => r.conversionPct < median)
    .map((r) => ({
      repId: r.repId,
      name: r.name,
      leads: r.leads,
      conversionPct: r.conversionPct,
      gapPts: median - r.conversionPct,
      maxUnits: (r.leads * (median - r.conversionPct)) / 100,
    }))
    .sort((a, b) => b.maxUnits - a.maxUnits);
  const coachingCeilingUnits = laggards.reduce((s, l) => s + l.maxUnits, 0);

  const sources: SourceOption[] = sourceQuality(d, f)
    .map((s) => ({
      source: s.source,
      leads: s.leads,
      conversionPct: s.conversionPct,
      revenuePerLead: s.revenuePerLead,
    }))
    .sort((a, b) => b.conversionPct - a.conversionPct);

  return {
    leadsInView: k.leadsCreated,
    baseUnits: k.unitsDelivered,
    targetUnits: k.targetUnits,
    baseConversionPct: k.conversionPct,
    avgDealValue,
    baseRevenue: k.revenue,
    atRiskCount: risks.length,
    atRiskValue,
    medianConversionPct: median,
    laggards,
    coachingCeilingUnits,
    sources,
    bestSource: sources[0]?.source ?? null,
  };
}
