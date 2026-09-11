import type { ScenarioInputs } from "./insights";

/**
 * Pure projection math for the What-If modeler. Kept separate from the React
 * layer so every formula is unit-testable and the assumptions are explicit.
 *
 * The four levers are deliberately independent scenarios, each answering one
 * executive question against the same in-view book. They are NOT summed: they
 * draw on overlapping leads (a rep coached to the median and an across-the-board
 * conversion lift would partly claim the same deals), so a naive total would
 * double-count. Each stands alone.
 */

export type ScenarioResult = {
  /** Incremental cars delivered (0 for the pipeline-recovery lever). */
  units: number;
  /** Incremental (or protected) revenue, in rupees. */
  revenue: number;
};

/**
 * Lever A — lift lead-to-delivery conversion by `deltaPts` percentage points,
 * holding lead volume constant. Extra units scale with the in-view book.
 */
export function conversionLift(
  s: ScenarioInputs,
  deltaPts: number,
): ScenarioResult {
  const units = (s.leadsInView * deltaPts) / 100;
  return { units, revenue: units * s.avgDealValue };
}

/** Resulting conversion rate after an A-lever lift, for display. */
export function liftedConversionPct(s: ScenarioInputs, deltaPts: number): number {
  return s.baseConversionPct + deltaPts;
}

/**
 * Lever B — recover `recoverPct`% of the flagged at-risk pipeline that would
 * otherwise slip. Reports revenue protected and the deals saved; these are
 * future deliveries, so they are not added to the current period's units.
 */
export function recoverAtRisk(
  s: ScenarioInputs,
  recoverPct: number,
): ScenarioResult & { deals: number } {
  const frac = recoverPct / 100;
  return {
    units: 0,
    revenue: s.atRiskValue * frac,
    deals: s.atRiskCount * frac,
  };
}

/**
 * Lever C — close `closeGapPct`% of the gap between each below-median rep and
 * the team median conversion. Ceiling (100%) = every laggard at the median.
 */
export function coaching(s: ScenarioInputs, closeGapPct: number): ScenarioResult {
  const units = (s.coachingCeilingUnits * closeGapPct) / 100;
  return { units, revenue: units * s.avgDealValue };
}

/**
 * Lever D — add `newLeads` more leads through `source`, projected at THAT
 * source's own historical conversion and revenue-per-lead. The only assumption
 * is that a channel scales at its own observed quality (far milder than assuming
 * leads convert the same across channels).
 */
export function scaleSource(
  s: ScenarioInputs,
  source: string,
  newLeads: number,
): ScenarioResult {
  const src = s.sources.find((x) => x.source === source);
  if (!src) return { units: 0, revenue: 0 };
  return {
    units: (newLeads * src.conversionPct) / 100,
    revenue: newLeads * src.revenuePerLead,
  };
}

/** Unit attainment (%) after adding `extraUnits` delivered cars. */
export function attainmentAfter(s: ScenarioInputs, extraUnits: number): number {
  if (!s.targetUnits) return 0;
  return (100 * (s.baseUnits + extraUnits)) / s.targetUnits;
}
