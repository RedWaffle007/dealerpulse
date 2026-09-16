import { describe, it, expect } from "vitest";
import fc from "fast-check";
import raw from "@/data/dealership_data.json";
import { DatasetSchema, type Lead } from "./types";
import { buildIndexes } from "./indexes";
import {
  kpis,
  branchComparison,
  sourceQuality,
  repLeaderboard,
  modelConcentration,
  lossAnalysis,
  funnel,
} from "./metrics";
import { mergeDatasets, PartialDatasetSchema } from "./merge";
import { parseFilter } from "./filter";
import {
  conversionLift,
  recoverAtRisk,
  coaching,
  scaleSource,
  attainmentAfter,
  liftedConversionPct,
  type ScenarioResult,
} from "./scenario";
import type { ScenarioInputs } from "./insights";
import { formatDaysAgo, formatINR, formatPct, formatCrore } from "./format";

/**
 * Property, metamorphic and invariant tests (fast-check) that complement the
 * example-based golden suite. The golden tests pin exact figures against the
 * bundled dataset; these assert the *laws* the analytics layer must obey for
 * every input — reconciliation identities (a dashboard's core correctness
 * property), scenario-math linearity, the filter's clamping/ordering contract,
 * and merge's upsert algebra. All pure; no I/O.
 */

const d = DatasetSchema.parse(raw);
const idx = buildIndexes(d);
const ALL = {};

// ── reconciliation: partitioning by branch conserves every additive total ────
// A branch is a partition of the book, so summing the per-branch metric must
// reproduce the whole-group metric exactly. This is *the* invariant a reconciling
// dashboard has to hold, and it is a metamorphic relation (split the input,
// recombine the outputs) that needs no hand-computed oracle.
describe("branch partition conserves group totals", () => {
  const whole = kpis(d, idx, ALL);
  const perBranch = d.branches.map((b) => kpis(d, idx, { branchId: b.id }));

  it("units delivered sum to the group total", () => {
    expect(perBranch.reduce((s, k) => s + k.unitsDelivered, 0)).toBe(whole.unitsDelivered);
  });
  it("realized revenue sums to the group total", () => {
    expect(perBranch.reduce((s, k) => s + k.revenue, 0)).toBeCloseTo(whole.revenue, 6);
  });
  it("leads created sum to the group total", () => {
    expect(perBranch.reduce((s, k) => s + k.leadsCreated, 0)).toBe(whole.leadsCreated);
  });
  it("open pipeline count + value sum to the group total", () => {
    expect(perBranch.reduce((s, k) => s + k.openPipelineCount, 0)).toBe(whole.openPipelineCount);
    expect(perBranch.reduce((s, k) => s + k.openPipelineValue, 0)).toBeCloseTo(
      whole.openPipelineValue, 6);
  });
});

// ── the same total, computed two independent ways, must agree ─────────────────
describe("cross-view reconciliation at full scope", () => {
  const whole = kpis(d, idx, ALL);

  it("branchComparison delivered/revenue reconcile with kpis", () => {
    const rows = branchComparison(d, idx, ALL);
    expect(rows.reduce((s, r) => s + r.delivered, 0)).toBe(whole.convertedLeads);
    expect(rows.reduce((s, r) => s + r.revenue, 0)).toBeCloseTo(whole.revenue, 6);
  });
  it("sourceQuality and repLeaderboard partition the same leads", () => {
    const src = sourceQuality(d, ALL);
    const reps = repLeaderboard(d, idx, ALL);
    expect(src.reduce((s, r) => s + r.leads, 0)).toBe(whole.leadsCreated);
    expect(reps.reduce((s, r) => s + r.leads, 0)).toBe(whole.leadsCreated);
    // Every partition reports the same delivered count.
    expect(src.reduce((s, r) => s + r.delivered, 0)).toBe(whole.convertedLeads);
    expect(reps.reduce((s, r) => s + r.delivered, 0)).toBe(whole.convertedLeads);
  });
  it("modelConcentration shares sum to 100 and revenue reconciles", () => {
    const rows = modelConcentration(d, ALL);
    expect(rows.reduce((s, r) => s + r.sharePct, 0)).toBeCloseTo(100, 6);
    expect(rows.reduce((s, r) => s + r.revenue, 0)).toBeCloseTo(whole.revenue, 6);
  });
  it("lossAnalysis matrix cells sum to total losses", () => {
    const la = lossAnalysis(d, ALL);
    const cellSum = la.matrix.rows.reduce(
      (s, r) => s + la.matrix.stages.reduce((t, st) => t + (r.cells[st] ?? 0), 0), 0);
    expect(cellSum).toBe(la.totalLost);
    expect(la.byStage.reduce((s, r) => s + r.count, 0)).toBe(la.totalLost);
  });
});

// ── invariants that must hold under any filter (fast-check over the book) ─────
describe("metric invariants hold under any month filter", () => {
  const months = idx.months;
  const monthSubset = fc.uniqueArray(fc.constantFrom(...months), { minLength: 0, maxLength: months.length });

  it("percentages stay in range; converted <= created; cold <= open", () => {
    fc.assert(
      fc.property(monthSubset, (ms) => {
        const f = { months: ms };
        const k = kpis(d, idx, f);
        expect(k.conversionPct).toBeGreaterThanOrEqual(0);
        expect(k.conversionPct).toBeLessThanOrEqual(100);
        expect(k.convertedLeads).toBeLessThanOrEqual(k.leadsCreated);
        expect(k.coldCount).toBeLessThanOrEqual(k.openPipelineCount);
        expect(k.coldValue).toBeLessThanOrEqual(k.openPipelineValue + 1e-6);
        // Every conversion rate in a breakdown is a valid percentage.
        for (const r of sourceQuality(d, f)) {
          expect(r.conversionPct).toBeGreaterThanOrEqual(0);
          expect(r.conversionPct).toBeLessThanOrEqual(100);
        }
      }),
      { numRuns: 60 },
    );
  });

  it("the funnel is non-increasing from 'new' to 'delivered'", () => {
    fc.assert(
      fc.property(monthSubset, (ms) => {
        const steps = funnel(d, { months: ms });
        for (let i = 1; i < steps.length; i++) {
          expect(steps[i].reached).toBeLessThanOrEqual(steps[i - 1].reached);
        }
      }),
      { numRuns: 40 },
    );
  });
});

// ── scenario math: linearity, monotonicity, boundaries ───────────────────────
const baseInputs: ScenarioInputs = {
  leadsInView: 200,
  baseUnits: 40,
  targetUnits: 300,
  baseConversionPct: 20,
  avgDealValue: 2_000_000,
  baseRevenue: 80_000_000,
  atRiskCount: 25,
  atRiskValue: 50_000_000,
  medianConversionPct: 22,
  laggards: [],
  coachingCeilingUnits: 12,
  sources: [
    { source: "walk_in", leads: 100, delivered: 46, conversionPct: 46, revenue: 9e7, revenuePerLead: 900000 },
    { source: "social_media", leads: 80, delivered: 11, conversionPct: 13.9, revenue: 1e7, revenuePerLead: 125000 },
  ] as ScenarioInputs["sources"],
  bestSource: "walk_in",
};

const pct = fc.double({ min: 0, max: 100, noNaN: true });

describe("scenario projections obey their formulas", () => {
  it("conversionLift is linear in the delta and monotonic", () => {
    fc.assert(fc.property(pct, (delta) => {
      const r = conversionLift(baseInputs, delta);
      expect(r.units).toBeCloseTo((baseInputs.leadsInView * delta) / 100, 9);
      expect(r.revenue).toBeCloseTo(r.units * baseInputs.avgDealValue, 3);
    }));
    fc.assert(fc.property(pct, pct, (a, b) => {
      if (a <= b) {
        expect(conversionLift(baseInputs, a).units).toBeLessThanOrEqual(
          conversionLift(baseInputs, b).units + 1e-9);
      }
    }));
    expect(liftedConversionPct(baseInputs, 5)).toBeCloseTo(baseInputs.baseConversionPct + 5, 9);
  });

  it("recoverAtRisk protects a fraction of value, adds zero units", () => {
    fc.assert(fc.property(pct, (p) => {
      const r = recoverAtRisk(baseInputs, p);
      expect(r.units).toBe(0);
      expect(r.revenue).toBeCloseTo((baseInputs.atRiskValue * p) / 100, 3);
      expect(r.deals).toBeCloseTo((baseInputs.atRiskCount * p) / 100, 9);
    }));
  });

  it("coaching is proportional to the gap closed", () => {
    fc.assert(fc.property(pct, (p) => {
      const r = coaching(baseInputs, p);
      expect(r.units).toBeCloseTo((baseInputs.coachingCeilingUnits * p) / 100, 9);
    }));
  });

  it("scaleSource uses the channel's own quality; unknown source is a no-op", () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 10000 }), (n) => {
      const r = scaleSource(baseInputs, "walk_in", n);
      expect(r.units).toBeCloseTo((n * 46) / 100, 6);
      expect(r.revenue).toBeCloseTo(n * 900000, 3);
    }));
    const none: ScenarioResult = scaleSource(baseInputs, "no_such_source", 500);
    expect(none).toEqual({ units: 0, revenue: 0 });
  });

  it("attainmentAfter is monotonic in extra units and 0 when no target", () => {
    fc.assert(fc.property(fc.double({ min: 0, max: 1000, noNaN: true }), (x) => {
      expect(attainmentAfter(baseInputs, x)).toBeCloseTo(
        (100 * (baseInputs.baseUnits + x)) / baseInputs.targetUnits, 6);
    }));
    expect(attainmentAfter({ ...baseInputs, targetUnits: 0 }, 10)).toBe(0);
  });
});

// ── parseFilter: clamping, ordering, contiguity, order-independence ───────────
describe("parseFilter contract", () => {
  const monthPool = [
    "2025-01", "2025-02", "2025-03", "2025-06", "2025-09", "2025-12", "2026-01", "2026-03",
  ];
  const someMonths = fc
    .uniqueArray(fc.constantFrom(...monthPool), { minLength: 1, maxLength: monthPool.length })
    .map((a) => [...a].sort());
  const maybeMonth = fc.option(fc.constantFrom(...monthPool, "not-a-month", "2099-01"), { nil: undefined });
  const maybeBranch = fc.option(fc.constantFrom("all", "B1", "B2", "B3"), { nil: undefined });

  it("from/to land inside the dataset and are ordered lo<=hi", () => {
    fc.assert(fc.property(someMonths, maybeMonth, maybeMonth, maybeBranch, (allMonths, from, to, branch) => {
      const r = parseFilter({ from, to, branch }, allMonths);
      expect(allMonths).toContain(r.from);
      expect(allMonths).toContain(r.to);
      expect(r.from <= r.to).toBe(true);
      // months is exactly the contiguous inclusive slice [from,to].
      expect(r.months).toEqual(allMonths.filter((m) => m >= r.from && m <= r.to));
      // branch normalisation.
      expect(r.branchId).toBe(branch && branch !== "all" ? branch : undefined);
    }));
  });

  it("is order-independent when both endpoints are valid months", () => {
    // Symmetry is only expected when both endpoints exist in allMonths; an
    // out-of-range endpoint falls back to first/last, which is asymmetric by
    // design, so both a and b are drawn from the generated list itself.
    const withEndpoints = someMonths.chain((allMonths) =>
      fc.tuple(
        fc.constant(allMonths),
        fc.integer({ min: 0, max: allMonths.length - 1 }),
        fc.integer({ min: 0, max: allMonths.length - 1 }),
      ),
    );
    fc.assert(fc.property(withEndpoints, ([allMonths, i, j]) => {
      const a = allMonths[i], b = allMonths[j];
      const x = parseFilter({ from: a, to: b }, allMonths);
      const y = parseFilter({ from: b, to: a }, allMonths);
      expect(x.months).toEqual(y.months);
      expect([x.from, x.to]).toEqual([y.from, y.to]);
    }));
  });
});

// ── mergeDatasets: upsert algebra (conservation, idempotence, schema) ─────────
describe("mergeDatasets upsert algebra", () => {
  const existingIds = d.leads.slice(0, 20).map((l) => l.id);
  const templateLead = (id: string): Lead => ({
    ...d.leads[0],
    id,
    status: "contacted",
    status_history: [{ status: "new", timestamp: "2026-02-01T00:00:00Z" }],
  });
  const incomingLeads = fc.array(
    fc.record({ id: fc.oneof(fc.constantFrom(...existingIds), fc.string({ minLength: 1, maxLength: 6 }).map((s) => `X${s}`)) }),
    { maxLength: 30 },
  ).map((rows) => rows.map((r) => templateLead(r.id)));

  it("added + updated always equals the number of incoming rows", () => {
    fc.assert(fc.property(incomingLeads, (leads) => {
      const { summary } = mergeDatasets(d, PartialDatasetSchema.parse({ leads }));
      expect(summary.leads.added + summary.leads.updated).toBe(leads.length);
    }));
  });

  it("merged leads = the union of ids, and re-parses as a valid dataset", () => {
    fc.assert(fc.property(incomingLeads, (leads) => {
      const { merged } = mergeDatasets(d, PartialDatasetSchema.parse({ leads }));
      const union = new Set([...d.leads.map((l) => l.id), ...leads.map((l) => l.id)]);
      expect(merged.leads.length).toBe(union.size);
      expect(DatasetSchema.safeParse(merged).success).toBe(true);
    }), { numRuns: 40 });
  });

  it("is idempotent: merging the same batch twice adds nothing new", () => {
    fc.assert(fc.property(incomingLeads, (leads) => {
      const once = mergeDatasets(d, PartialDatasetSchema.parse({ leads })).merged;
      const twice = mergeDatasets(once, PartialDatasetSchema.parse({ leads }));
      expect(twice.summary.leads.added).toBe(0);
      expect(twice.merged.leads.length).toBe(once.leads.length);
    }), { numRuns: 40 });
  });

  it("newMonths are unique, sorted, and absent from the base", () => {
    const baseMonths = new Set(d.targets.map((t) => t.month));
    fc.assert(fc.property(
      fc.array(fc.constantFrom("2025-12", "2026-01", "2026-02", "2026-03"), { maxLength: 8 }),
      (ms) => {
        const targets = ms.map((m, i) => ({
          branch_id: d.branches[i % d.branches.length].id,
          month: m, target_units: 10, target_revenue: 1,
        }));
        const { summary } = mergeDatasets(d, PartialDatasetSchema.parse({ targets }));
        expect([...summary.newMonths]).toEqual([...new Set(summary.newMonths)].sort());
        expect(summary.newMonths.every((m) => !baseMonths.has(m))).toBe(true);
      }));
  });
});

// ── format: boundaries and precision ─────────────────────────────────────────
describe("format boundaries", () => {
  it("formatDaysAgo handles today / singular / plural", () => {
    expect(formatDaysAgo(0)).toBe("today");
    expect(formatDaysAgo(-3)).toBe("today");
    expect(formatDaysAgo(1)).toBe("1 day ago");
    expect(formatDaysAgo(2)).toBe("2 days ago");
  });
  it("formatINR switches unit at the crore and lakh thresholds", () => {
    expect(formatINR(1e7)).toContain("Cr");
    expect(formatINR(1e5)).toContain("L");
    expect(formatINR(9.9e6)).toContain("L");   // just below a crore
    expect(formatINR(5000)).not.toContain("L");
  });
  it("formatPct honours the requested precision", () => {
    expect(formatPct(12.345, 2)).toBe("12.35%");
    expect(formatPct(12.345, 0)).toBe("12%");
  });
  it("formatCrore always shows two decimals of crore", () => {
    expect(formatCrore(2e7)).toBe("₹2.00 Cr");
  });
});
