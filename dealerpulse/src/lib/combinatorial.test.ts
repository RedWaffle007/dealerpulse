import { describe, it, expect } from "vitest";
import raw from "@/data/dealership_data.json";
import { DatasetSchema, type Filter } from "./types";
import { buildIndexes } from "./indexes";
import { kpis, branchComparison } from "./metrics";

/**
 * Combinatorial interaction testing (CIT) over the dashboard's filter space.
 *
 * The dashboard is driven by three interacting filters — branch, rep, and month
 * window — and a bug can hide in a *combination* (e.g. a branch+rep pair that
 * scopes to zero leads, or a month window that clips deliveries but not
 * targets). Exhaustively crossing 3 branch × 3 rep × 3 month levels is 27 runs;
 * a strength-2 (pairwise) covering array reaches every 2-way interaction in
 * **9 configs** (an L9 orthogonal array, a 3× reduction) — the same technique
 * used on software-builder, and Cohen's own research area.
 *
 * The oracle is invariant/metamorphic, so it needs no hand-computed figures:
 * every config must satisfy the KPI range invariants, and — crucially —
 * partitioning any (rep, month) config across the five branches must conserve
 * every additive total (a branch is a partition of the book).
 */

const d = DatasetSchema.parse(raw);
const idx = buildIndexes(d);

// Factor levels. 0 is always the "all" level; 1/2 are two concrete values.
const BRANCHES = [undefined, d.branches[0].id, d.branches[1].id];
const REPS = [undefined, d.sales_reps[0].id, d.sales_reps[1].id];
const half = Math.ceil(idx.months.length / 2);
const MONTHS: (string[] | undefined)[] = [
  undefined,                    // all months
  idx.months.slice(0, half),    // first half
  idx.months.slice(half),       // second half
];

// L9(3^3) pairwise covering array: any two of the three columns contain all
// nine (level,level) pairs exactly once.
const L9: [number, number, number][] = [
  [0, 0, 0], [0, 1, 1], [0, 2, 2],
  [1, 0, 1], [1, 1, 2], [1, 2, 0],
  [2, 0, 2], [2, 1, 0], [2, 2, 1],
];

function filterFor([b, r, m]: [number, number, number]): Filter {
  return { branchId: BRANCHES[b], repId: REPS[r], months: MONTHS[m] ?? undefined };
}

describe("filter-space covering array", () => {
  it("is a genuine strength-2 covering array (every pair of every two factors)", () => {
    for (const [i, j] of [[0, 1], [0, 2], [1, 2]] as const) {
      const pairs = new Set(L9.map((row) => `${row[i]},${row[j]}`));
      const expected = new Set<string>();
      for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) expected.add(`${a},${c}`);
      expect(pairs).toEqual(expected);
    }
  });

  it("every config satisfies the KPI range invariants", () => {
    for (const row of L9) {
      const f = filterFor(row);
      const k = kpis(d, idx, f);
      expect(k.convertedLeads).toBeLessThanOrEqual(k.leadsCreated);
      expect(k.coldCount).toBeLessThanOrEqual(k.openPipelineCount);
      expect(k.conversionPct).toBeGreaterThanOrEqual(0);
      expect(k.conversionPct).toBeLessThanOrEqual(100);
      expect(k.unitAttainmentPct).toBeGreaterThanOrEqual(0);
      // A fully empty scope must degrade cleanly to zeros, never NaN.
      expect(Number.isFinite(k.conversionPct)).toBe(true);
      expect(Number.isFinite(k.revenue)).toBe(true);
    }
  });

  it("branch-partitioning any (rep, month) config conserves the group totals", () => {
    // Take the distinct (rep, month) combinations the array exercises and check
    // that summing the five branch-scoped KPIs reproduces the all-branch KPI.
    const combos = new Map<string, [number, number]>();
    for (const [, r, m] of L9) combos.set(`${r}:${m}`, [r, m]);

    for (const [r, m] of combos.values()) {
      const scope: Filter = { repId: REPS[r], months: MONTHS[m] ?? undefined };
      const whole = kpis(d, idx, scope);
      const parts = d.branches.map((b) => kpis(d, idx, { ...scope, branchId: b.id }));
      expect(parts.reduce((s, k) => s + k.unitsDelivered, 0)).toBe(whole.unitsDelivered);
      expect(parts.reduce((s, k) => s + k.leadsCreated, 0)).toBe(whole.leadsCreated);
      expect(parts.reduce((s, k) => s + k.convertedLeads, 0)).toBe(whole.convertedLeads);
      expect(parts.reduce((s, k) => s + k.revenue, 0)).toBeCloseTo(whole.revenue, 6);
      expect(parts.reduce((s, k) => s + k.openPipelineCount, 0)).toBe(whole.openPipelineCount);
    }
  });

  it("a single-branch KPI reconciles with that branch's branchComparison row", () => {
    // For each config with a concrete branch, the KPI conversion count must
    // equal the branchComparison 'delivered' for that branch under the same
    // rep+month scope — two independent code paths, one answer.
    for (const row of L9) {
      const [b, r, m] = row;
      if (b === 0) continue; // only the concrete-branch configs
      const scope: Filter = { repId: REPS[r], months: MONTHS[m] ?? undefined };
      const branchId = BRANCHES[b]!;
      const k = kpis(d, idx, { ...scope, branchId });
      const bc = branchComparison(d, idx, scope).find((x) => x.branchId === branchId);
      expect(k.convertedLeads).toBe(bc?.delivered ?? 0);
    }
  });
});
