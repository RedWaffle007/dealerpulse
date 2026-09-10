import {
  CUTOFF,
  OPEN_STATUSES,
  STAGES,
  STAGE_INDEX,
  type Dataset,
  type Filter,
  type Lead,
  type Stage,
} from "./types";
import type { Indexes } from "./indexes";

/**
 * Pure analytics layer. Every function is deterministic and obeys the metric
 * contract (PLAN.md): "now" = CUTOFF; delivery metrics key on delivery_date;
 * lead/funnel/source metrics key on created_at; revenue realized on delivery;
 * funnel reconstructed from status_history; targets summed over selected months.
 */

const DAY = 86_400_000;

export function parseTs(s: string): Date {
  return new Date(s);
}
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}
export function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / DAY);
}
/** Days since a lead's last activity, measured from the analytical cutoff. */
export function daysStale(lead: Lead): number {
  return daysBetween(CUTOFF, parseTs(lead.last_activity_at));
}
export function reachedStages(lead: Lead): Set<string> {
  return new Set(lead.status_history.map((h) => h.status));
}
export function reachedAt(lead: Lead, status: string): Date | null {
  const ev = lead.status_history.find((h) => h.status === status);
  return ev ? parseTs(ev.timestamp) : null;
}
/** The stage a lead occupied immediately before it was marked lost. */
export function stageBeforeLost(lead: Lead): string {
  let prev = "unknown";
  for (const h of lead.status_history) {
    if (h.status === "lost") return prev;
    prev = h.status;
  }
  return prev;
}

// ---- filter helpers ---------------------------------------------------------

function branchMatch(branchId: string, f: Filter): boolean {
  return !f.branchId || f.branchId === branchId;
}
function repMatch(repId: string, f: Filter): boolean {
  return !f.repId || f.repId === repId;
}
function monthMatch(iso: string, f: Filter): boolean {
  return !f.months?.length || f.months.includes(monthOf(iso));
}
/** True if a delivery's parent lead matches the branch + rep scope. */
function deliveryInScope(leadId: string, idx: Indexes, f: Filter): boolean {
  const lead = idx.leadById.get(leadId);
  return (
    !!lead && branchMatch(lead.branch_id, f) && repMatch(lead.assigned_to, f)
  );
}

/** Leads scoped by branch + rep + created_at month (for volume/funnel/source). */
export function scopedLeads(d: Dataset, f: Filter): Lead[] {
  return d.leads.filter(
    (l) =>
      branchMatch(l.branch_id, f) &&
      repMatch(l.assigned_to, f) &&
      monthMatch(l.created_at, f),
  );
}

// ---- statistics helpers -----------------------------------------------------

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

// ---- KPIs -------------------------------------------------------------------

export type Kpis = {
  unitsDelivered: number;
  targetUnits: number;
  unitAttainmentPct: number;
  revenue: number;
  targetRevenue: number;
  revenueAttainmentPct: number;
  leadsCreated: number;
  convertedLeads: number;
  conversionPct: number;
  openPipelineCount: number;
  openPipelineValue: number;
  coldCount: number;
  coldValue: number;
  avgDaysToDeliver: number;
};

export function kpis(d: Dataset, idx: Indexes, f: Filter): Kpis {
  // Deliveries keyed on delivery_date + branch/rep (via the parent lead).
  const deliveries = d.deliveries.filter(
    (x) => deliveryInScope(x.lead_id, idx, f) && monthMatch(x.delivery_date, f),
  );
  const unitsDelivered = deliveries.length;
  const revenue = deliveries.reduce(
    (s, x) => s + (idx.leadById.get(x.lead_id)?.deal_value ?? 0),
    0,
  );
  const avgDaysToDeliver = mean(deliveries.map((x) => x.days_to_deliver));

  const targets = d.targets.filter(
    (t) => branchMatch(t.branch_id, f) && monthMatch(t.month + "-01", f),
  );
  const targetUnits = targets.reduce((s, t) => s + t.target_units, 0);
  const targetRevenue = targets.reduce((s, t) => s + t.target_revenue, 0);

  // Lead-based conversion uses created_at scope.
  const leads = scopedLeads(d, f);
  const convertedLeads = leads.filter((l) => l.status === "delivered").length;

  // Open pipeline + cold are a current snapshot (branch/rep-scoped, not month-scoped).
  const openLeads = d.leads.filter(
    (l) =>
      branchMatch(l.branch_id, f) &&
      repMatch(l.assigned_to, f) &&
      OPEN_STATUSES.has(l.status),
  );
  const cold = openLeads.filter((l) => daysStale(l) >= 7);

  return {
    unitsDelivered,
    targetUnits,
    unitAttainmentPct: targetUnits ? (100 * unitsDelivered) / targetUnits : 0,
    revenue,
    targetRevenue,
    revenueAttainmentPct: targetRevenue ? (100 * revenue) / targetRevenue : 0,
    leadsCreated: leads.length,
    convertedLeads,
    conversionPct: leads.length ? (100 * convertedLeads) / leads.length : 0,
    openPipelineCount: openLeads.length,
    openPipelineValue: openLeads.reduce((s, l) => s + l.deal_value, 0),
    coldCount: cold.length,
    coldValue: cold.reduce((s, l) => s + l.deal_value, 0),
    avgDaysToDeliver,
  };
}

// ---- monthly attainment trend ----------------------------------------------

export type MonthPoint = {
  month: string;
  delivered: number;
  target: number;
  attainmentPct: number;
  revenue: number;
  targetRevenue: number;
};

export function monthlyAttainment(
  d: Dataset,
  idx: Indexes,
  f: Filter,
): MonthPoint[] {
  return idx.months.map((month) => {
    const dels = d.deliveries.filter(
      (x) =>
        deliveryInScope(x.lead_id, idx, f) && monthOf(x.delivery_date) === month,
    );
    const tgts = d.targets.filter(
      (t) => branchMatch(t.branch_id, f) && t.month === month,
    );
    const target = tgts.reduce((s, t) => s + t.target_units, 0);
    const revenue = dels.reduce(
      (s, x) => s + (idx.leadById.get(x.lead_id)?.deal_value ?? 0),
      0,
    );
    return {
      month,
      delivered: dels.length,
      target,
      attainmentPct: target ? (100 * dels.length) / target : 0,
      revenue,
      targetRevenue: tgts.reduce((s, t) => s + t.target_revenue, 0),
    };
  });
}

// ---- branch comparison ------------------------------------------------------

export type BranchRow = {
  branchId: string;
  name: string;
  city: string;
  leads: number;
  delivered: number;
  conversionPct: number;
  targetUnits: number;
  attainmentPct: number;
  revenue: number;
};

export function branchComparison(
  d: Dataset,
  idx: Indexes,
  f: Filter,
): BranchRow[] {
  return d.branches.map((b) => {
    const bf: Filter = { ...f, branchId: b.id };
    const leads = scopedLeads(d, bf);
    const delivered = leads.filter((l) => l.status === "delivered");
    const dels = d.deliveries.filter((x) => {
      const lead = idx.leadById.get(x.lead_id);
      return lead && lead.branch_id === b.id && monthMatch(x.delivery_date, f);
    });
    const targetUnits = d.targets
      .filter((t) => t.branch_id === b.id && monthMatch(t.month + "-01", f))
      .reduce((s, t) => s + t.target_units, 0);
    return {
      branchId: b.id,
      name: b.name,
      city: b.city,
      leads: leads.length,
      delivered: delivered.length,
      conversionPct: leads.length
        ? (100 * delivered.length) / leads.length
        : 0,
      targetUnits,
      attainmentPct: targetUnits ? (100 * dels.length) / targetUnits : 0,
      revenue: dels.reduce(
        (s, x) => s + (idx.leadById.get(x.lead_id)?.deal_value ?? 0),
        0,
      ),
    };
  });
}

// ---- funnel + leak ----------------------------------------------------------

export type FunnelStep = {
  stage: Stage;
  reached: number;
  advancePct: number | null;
  leakPct: number | null;
};

export function funnel(d: Dataset, f: Filter): FunnelStep[] {
  const leads = scopedLeads(d, f);
  const reached: Record<string, number> = {};
  for (const l of leads) {
    for (const s of reachedStages(l)) {
      if (s in STAGE_INDEX) reached[s] = (reached[s] ?? 0) + 1;
    }
  }
  return STAGES.map((stage, i) => {
    const next = STAGES[i + 1];
    const r = reached[stage] ?? 0;
    const adv = next ? reached[next] ?? 0 : null;
    return {
      stage,
      reached: r,
      advancePct: next && r ? (100 * (adv as number)) / r : null,
      leakPct: next && r ? 100 - (100 * (adv as number)) / r : null,
    };
  });
}

// ---- loss analysis ----------------------------------------------------------

export type LossAnalysis = {
  byStage: { stage: string; count: number; value: number }[];
  reasons: { reason: string; count: number }[];
  totalLost: number;
  totalLostValue: number;
};

export function lossAnalysis(d: Dataset, f: Filter): LossAnalysis {
  const lost = scopedLeads(d, f).filter((l) => l.status === "lost");
  const stageCount: Record<string, number> = {};
  const stageValue: Record<string, number> = {};
  const reasonCount: Record<string, number> = {};
  for (const l of lost) {
    const s = stageBeforeLost(l);
    stageCount[s] = (stageCount[s] ?? 0) + 1;
    stageValue[s] = (stageValue[s] ?? 0) + l.deal_value;
    const reason = l.lost_reason ?? "Unknown"; // anomaly disclosure, never dropped
    reasonCount[reason] = (reasonCount[reason] ?? 0) + 1;
  }
  return {
    byStage: Object.keys(stageCount)
      .map((stage) => ({
        stage,
        count: stageCount[stage],
        value: stageValue[stage],
      }))
      .sort((a, b) => b.value - a.value),
    reasons: Object.entries(reasonCount)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    totalLost: lost.length,
    totalLostValue: lost.reduce((s, l) => s + l.deal_value, 0),
  };
}

// ---- source quality ---------------------------------------------------------

export type SourceRow = {
  source: string;
  leads: number;
  delivered: number;
  conversionPct: number;
  revenue: number;
  revenuePerLead: number;
};

export function sourceQuality(d: Dataset, f: Filter): SourceRow[] {
  const map = new Map<string, { leads: number; delivered: number; rev: number }>();
  for (const l of scopedLeads(d, f)) {
    const e = map.get(l.source) ?? { leads: 0, delivered: 0, rev: 0 };
    e.leads += 1;
    if (l.status === "delivered") {
      e.delivered += 1;
      e.rev += l.deal_value;
    }
    map.set(l.source, e);
  }
  return [...map.entries()]
    .map(([source, e]) => ({
      source,
      leads: e.leads,
      delivered: e.delivered,
      conversionPct: e.leads ? (100 * e.delivered) / e.leads : 0,
      revenue: e.rev,
      revenuePerLead: e.leads ? e.rev / e.leads : 0,
    }))
    .sort((a, b) => b.revenuePerLead - a.revenuePerLead);
}

// ---- velocity ---------------------------------------------------------------

export type Velocity = {
  perStage: { stage: string; medianDays: number; meanDays: number; n: number }[];
  cycleMedian: number;
  cycleMean: number;
  cycleP90: number;
};

export function velocity(d: Dataset, f: Filter): Velocity {
  const leads = scopedLeads(d, f);
  const durs: Record<string, number[]> = {};
  for (const l of leads) {
    const h = l.status_history;
    for (let i = 0; i < h.length - 1; i++) {
      const a = h[i].status,
        b = h[i + 1].status;
      if (
        a in STAGE_INDEX &&
        b in STAGE_INDEX &&
        STAGE_INDEX[b] === STAGE_INDEX[a] + 1
      ) {
        (durs[a] ??= []).push(
          (parseTs(h[i + 1].timestamp).getTime() -
            parseTs(h[i].timestamp).getTime()) /
            DAY,
        );
      }
    }
  }
  const cycle: number[] = [];
  for (const l of leads) {
    if (l.status === "delivered") {
      const del = reachedAt(l, "delivered");
      if (del) cycle.push(daysBetween(del, parseTs(l.created_at)));
    }
  }
  return {
    perStage: STAGES.slice(0, -1).map((stage) => ({
      stage,
      medianDays: median(durs[stage] ?? []),
      meanDays: mean(durs[stage] ?? []),
      n: (durs[stage] ?? []).length,
    })),
    cycleMedian: median(cycle),
    cycleMean: mean(cycle),
    cycleP90: percentile(cycle, 0.9),
  };
}

// ---- delivery SLA -----------------------------------------------------------

export type DeliverySLA = {
  total: number;
  delayed: number;
  avgDelayed: number;
  avgOnTime: number;
  reasons: { reason: string; count: number }[];
};

export function deliverySLA(d: Dataset, idx: Indexes, f: Filter): DeliverySLA {
  const dels = d.deliveries.filter(
    (x) => deliveryInScope(x.lead_id, idx, f) && monthMatch(x.delivery_date, f),
  );
  const delayed = dels.filter((x) => x.delay_reason);
  const onTime = dels.filter((x) => !x.delay_reason);
  const reasonCount: Record<string, number> = {};
  for (const x of delayed)
    reasonCount[x.delay_reason as string] =
      (reasonCount[x.delay_reason as string] ?? 0) + 1;
  return {
    total: dels.length,
    delayed: delayed.length,
    avgDelayed: mean(delayed.map((x) => x.days_to_deliver)),
    avgOnTime: mean(onTime.map((x) => x.days_to_deliver)),
    reasons: Object.entries(reasonCount)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  };
}

// ---- rep leaderboard --------------------------------------------------------

export type RepRow = {
  repId: string;
  name: string;
  branchName: string;
  role: string;
  leads: number;
  delivered: number;
  conversionPct: number;
  revenue: number;
  belowSample: boolean; // < 5 leads → ranking not reliable
};

const MIN_SAMPLE = 5;

export function repLeaderboard(d: Dataset, idx: Indexes, f: Filter): RepRow[] {
  const map = new Map<string, { leads: number; delivered: number; rev: number }>();
  for (const l of scopedLeads(d, f)) {
    const e = map.get(l.assigned_to) ?? { leads: 0, delivered: 0, rev: 0 };
    e.leads += 1;
    if (l.status === "delivered") {
      e.delivered += 1;
      e.rev += l.deal_value;
    }
    map.set(l.assigned_to, e);
  }
  return [...map.entries()]
    .map(([repId, e]) => {
      const rep = idx.repById.get(repId);
      return {
        repId,
        name: rep?.name ?? repId,
        branchName: rep ? idx.branchById.get(rep.branch_id)?.name ?? "" : "",
        role: rep?.role ?? "",
        leads: e.leads,
        delivered: e.delivered,
        conversionPct: e.leads ? (100 * e.delivered) / e.leads : 0,
        revenue: e.rev,
        belowSample: e.leads < MIN_SAMPLE,
      };
    })
    .sort((a, b) => b.conversionPct - a.conversionPct);
}

// ---- open pipeline snapshot -------------------------------------------------

export type OpenLeadRow = {
  leadId: string;
  customer: string;
  stage: string;
  value: number;
  daysStale: number;
  expectedClose: string | null;
  repName: string;
  branchName: string;
  source: string;
};

/** Current open leads (branch/rep-scoped, NOT month-scoped — it's a snapshot). */
export function openPipeline(d: Dataset, idx: Indexes, f: Filter): OpenLeadRow[] {
  return d.leads
    .filter(
      (l) =>
        branchMatch(l.branch_id, f) &&
        repMatch(l.assigned_to, f) &&
        OPEN_STATUSES.has(l.status),
    )
    .map((l) => ({
      leadId: l.id,
      customer: l.customer_name,
      stage: l.status,
      value: l.deal_value,
      daysStale: daysStale(l),
      expectedClose: l.expected_close_date ?? null,
      repName: idx.repById.get(l.assigned_to)?.name ?? l.assigned_to,
      branchName: idx.branchById.get(l.branch_id)?.name ?? l.branch_id,
      source: l.source,
    }))
    .sort(
      (a, b) =>
        STAGE_INDEX[b.stage] - STAGE_INDEX[a.stage] || b.value - a.value,
    );
}

/** Open-pipeline count + value grouped by stage. */
export function pipelineByStage(
  d: Dataset,
  idx: Indexes,
  f: Filter,
): { stage: string; count: number; value: number }[] {
  const rows = openPipeline(d, idx, f);
  const byStage = new Map<string, { count: number; value: number }>();
  for (const r of rows) {
    const e = byStage.get(r.stage) ?? { count: 0, value: 0 };
    e.count += 1;
    e.value += r.value;
    byStage.set(r.stage, e);
  }
  return STAGES.filter((s) => byStage.has(s)).map((s) => ({
    stage: s,
    count: byStage.get(s)!.count,
    value: byStage.get(s)!.value,
  }));
}

// ---- action center ----------------------------------------------------------

export type ActionType =
  | "stale_order"
  | "overdue"
  | "cold"
  | "high_value_late";

export type ActionItem = {
  type: ActionType;
  leadId: string;
  customer: string;
  branchName: string;
  repName: string;
  stage: string;
  daysStale: number;
  value: number;
  expectedClose: string | null;
  score: number;
  reason: string; // human explanation of why this surfaced
};

/**
 * Deterministic, explainable alert rules. A lead can match several rules; we
 * keep the single highest-priority classification and rank by an urgency score
 * = value(cr) × stage-depth × staleness.
 */
export function actionItems(d: Dataset, idx: Indexes, f: Filter): ActionItem[] {
  const open = d.leads.filter(
    (l) =>
      branchMatch(l.branch_id, f) &&
      repMatch(l.assigned_to, f) &&
      OPEN_STATUSES.has(l.status),
  );
  const items: ActionItem[] = [];
  for (const l of open) {
    const stale = daysStale(l);
    const rep = idx.repById.get(l.assigned_to);
    const base = {
      leadId: l.id,
      customer: l.customer_name,
      branchName: idx.branchById.get(l.branch_id)?.name ?? l.branch_id,
      repName: rep?.name ?? l.assigned_to,
      stage: l.status,
      daysStale: stale,
      value: l.deal_value,
      expectedClose: l.expected_close_date ?? null,
      score:
        (l.deal_value / 1e7) *
        (STAGE_INDEX[l.status] + 1) *
        Math.max(stale, 1),
    };
    const overdue =
      l.expected_close_date &&
      parseTs(l.expected_close_date + "T00:00:00Z") < CUTOFF;

    let type: ActionType | null = null;
    let reason = "";
    if (l.status === "order_placed" && stale >= 7) {
      type = "stale_order";
      reason = `Order placed but no activity for ${stale} days — delivery at risk.`;
    } else if (overdue) {
      type = "overdue";
      reason = `Past expected close date (${l.expected_close_date}) and still open.`;
    } else if (
      stale >= 7 &&
      STAGE_INDEX[l.status] >= STAGE_INDEX["negotiation"]
    ) {
      type = "high_value_late";
      reason = `Late-stage lead (${l.status}) idle for ${stale} days.`;
    } else if (stale >= 7) {
      type = "cold";
      reason = `No activity for ${stale} days.`;
    }
    if (type) items.push({ ...base, type, reason });
  }
  return items.sort((a, b) => b.score - a.score);
}
