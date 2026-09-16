import { describe, expect, it } from "vitest";
import { rangeLabel } from "./filter";
import {
  formatDate,
  formatDateTime,
  formatINR,
  formatInt,
  formatMonth,
  stageLabel,
} from "./format";
import { buildIndexes } from "./indexes";
import { mergeDatasets } from "./merge";
import { coaching } from "./scenario";
import {
  actionItems,
  branchComparison,
  branchesBehindTarget,
  daysBetween,
  daysStale,
  deliverySLA,
  funnel,
  kpis,
  lossAnalysis,
  modelConcentration,
  monthlyAttainment,
  monthOf,
  openPipeline,
  parseTs,
  pipelineByStage,
  reachedAt,
  reachedStages,
  repLeaderboard,
  scopedLeads,
  sourceQuality,
  stageBeforeLost,
  velocity,
} from "./metrics";
import type { Dataset, Lead } from "./types";

/**
 * Exact, synthetic oracles for gaps found by the command-runner Stryker run.
 *
 * The broad property and reconciliation tests deliberately avoid pinning every
 * display field and implementation boundary. These small examples complement
 * them with hand-calculated answers, including cache-key collisions that would
 * be almost impossible to expose with the production fixture by accident.
 */

function lead(
  id: string,
  overrides: Partial<Lead> = {},
): Lead {
  return {
    id,
    customer_name: `Customer ${id}`,
    phone: "000",
    source: "walk_in",
    model_interested: "Model A",
    status: "new",
    assigned_to: "R1",
    branch_id: "B1",
    created_at: "2025-01-01T00:00:00Z",
    last_activity_at: "2025-01-01T00:00:00Z",
    status_history: [{ status: "new", timestamp: "2025-01-01T00:00:00Z" }],
    expected_close_date: null,
    deal_value: 1_000_000,
    lost_reason: null,
    ...overrides,
  };
}

function dataset(overrides: Partial<Dataset> = {}): Dataset {
  return {
    metadata: { version: "base", owner: "old" },
    branches: [
      { id: "B1", name: "North", city: "Delhi" },
      { id: "B2", name: "South", city: "Chennai" },
    ],
    sales_reps: [
      { id: "R1", name: "Asha", branch_id: "B1", role: "Sales", joined: "2024-01-01" },
      { id: "R2", name: "Bilal", branch_id: "B2", role: "Sales", joined: "2024-01-01" },
    ],
    leads: [lead("L1")],
    targets: [
      { branch_id: "B1", month: "2025-03", target_units: 3, target_revenue: 30 },
      { branch_id: "B1", month: "2025-01", target_units: 1, target_revenue: 10 },
      { branch_id: "B2", month: "2025-03", target_units: 2, target_revenue: 20 },
    ],
    deliveries: [
      {
        lead_id: "L1",
        order_date: "2025-01-10",
        delivery_date: "2025-01-20",
        days_to_deliver: 10,
        delay_reason: null,
      },
    ],
    ...overrides,
  };
}

function analyticsDataset(): Dataset {
  const deliveredOne = lead("D1", {
    customer_name: "Delivered One",
    status: "delivered",
    source: "web",
    model_interested: "Model A",
    deal_value: 10_000_000,
    status_history: [
      { status: "new", timestamp: "2025-01-01T00:00:00Z" },
      { status: "contacted", timestamp: "2025-01-02T00:00:00Z" },
      { status: "test_drive", timestamp: "2025-01-04T00:00:00Z" },
      { status: "negotiation", timestamp: "2025-01-07T00:00:00Z" },
      { status: "order_placed", timestamp: "2025-01-09T00:00:00Z" },
      { status: "delivered", timestamp: "2025-01-11T00:00:00Z" },
    ],
  });
  const deliveredTwo = lead("D2", {
    customer_name: "Delivered Two",
    status: "delivered",
    assigned_to: "R2",
    branch_id: "B2",
    source: "referral",
    model_interested: "Model B",
    created_at: "2025-02-01T00:00:00Z",
    deal_value: 20_000_000,
    status_history: [
      { status: "new", timestamp: "2025-02-01T00:00:00Z" },
      { status: "contacted", timestamp: "2025-02-04T00:00:00Z" },
      { status: "test_drive", timestamp: "2025-02-05T00:00:00Z" },
      { status: "negotiation", timestamp: "2025-02-07T00:00:00Z" },
      { status: "order_placed", timestamp: "2025-02-11T00:00:00Z" },
      { status: "delivered", timestamp: "2025-02-21T00:00:00Z" },
    ],
  });
  const open = lead("O1", {
    customer_name: "Open One",
    status: "negotiation",
    source: "web",
    model_interested: "Model A",
    created_at: "2025-02-10T00:00:00Z",
    last_activity_at: "2025-02-21T00:00:00Z",
    expected_close_date: "2025-03-10",
    deal_value: 5_000_000,
    status_history: [
      { status: "new", timestamp: "2025-02-10T00:00:00Z" },
      { status: "contacted", timestamp: "2025-02-11T00:00:00Z" },
      { status: "test_drive", timestamp: "2025-02-12T00:00:00Z" },
      { status: "negotiation", timestamp: "2025-02-13T00:00:00Z" },
    ],
  });
  const lost = lead("L1", {
    customer_name: "Lost One",
    status: "lost",
    assigned_to: "R1",
    branch_id: "B2",
    source: "referral",
    model_interested: "Model B",
    created_at: "2025-01-05T00:00:00Z",
    deal_value: 7_000_000,
    lost_reason: "Price",
    status_history: [
      { status: "new", timestamp: "2025-01-05T00:00:00Z" },
      { status: "lost", timestamp: "2025-01-06T00:00:00Z" },
    ],
  });

  return dataset({
    leads: [deliveredOne, deliveredTwo, open, lost],
    targets: [
      { branch_id: "B1", month: "2025-01", target_units: 2, target_revenue: 20_000_000 },
      { branch_id: "B1", month: "2025-02", target_units: 3, target_revenue: 30_000_000 },
      { branch_id: "B2", month: "2025-01", target_units: 4, target_revenue: 40_000_000 },
      { branch_id: "B2", month: "2025-02", target_units: 5, target_revenue: 50_000_000 },
    ],
    deliveries: [
      {
        lead_id: "D1",
        order_date: "2025-01-09",
        delivery_date: "2025-02-10",
        days_to_deliver: 10,
        delay_reason: "Stock",
      },
      {
        lead_id: "D2",
        order_date: "2025-02-11",
        delivery_date: "2025-01-21",
        days_to_deliver: 20,
        delay_reason: null,
      },
      {
        lead_id: "missing-parent",
        order_date: "2025-01-01",
        delivery_date: "2025-01-02",
        days_to_deliver: 1,
        delay_reason: "Invalid orphan",
      },
    ],
  });
}

describe("filter and presentation contracts exposed by mutation testing", () => {
  it("labels both a single month and a genuine range exactly", () => {
    expect(rangeLabel("2025-06", "2025-06")).toBe("2025-06");
    expect(rangeLabel("2025-06", "2025-08")).toBe("2025-06 → 2025-08");
  });

  it("pins compact currency and integer grouping rather than only the unit", () => {
    expect(formatINR(10_000_000)).toBe("₹1.00 Cr");
    expect(formatINR(-250_000)).toBe("₹-2.5 L");
    expect(formatINR(1_234.4)).toBe("₹1,234");
    expect(formatInt(123_456.6)).toBe("1,23,457");
  });

  it("pins the documented UTC date and month representations", () => {
    expect(formatMonth("2025-06")).toBe("Jun 2025");
    expect(formatDate("2025-06-16")).toBe("16 Jun 2025");
    expect(formatDate("2025-06-16T23:30:00-05:00")).toBe("17 Jun 2025");
    expect(formatDateTime("2025-06-16T04:08:00Z")).toBe("16 Jun 2025, 04:08");
  });

  it("turns an underscored stage into a human label", () => {
    expect(stageLabel("order_placed")).toBe("Order Placed");
  });
});

describe("index construction", () => {
  it("sorts and deduplicates months, builds every lookup, and uses the latest cutoff", () => {
    const d = dataset();
    const idx = buildIndexes(d);

    expect(idx.months).toEqual(["2025-01", "2025-03"]);
    expect(idx.cutoff.toISOString()).toBe("2025-03-31T00:00:00.000Z");
    expect(idx.branchById.get("B1")).toBe(d.branches[0]);
    expect(idx.repById.get("R2")).toBe(d.sales_reps[1]);
    expect(idx.leadById.get("L1")).toBe(d.leads[0]);
    expect(idx.deliveryByLead.get("L1")).toBe(d.deliveries[0]);
  });

  it("uses the documented deterministic cutoff when there are no targets", () => {
    expect(buildIndexes(dataset({ targets: [] })).cutoff.toISOString()).toBe(
      "2025-12-31T00:00:00.000Z",
    );
  });
});

describe("whole-dataset continuation merge", () => {
  it("uses each section's natural key and reports every update and addition", () => {
    const base = dataset();
    const b1 = { ...base.branches[0], name: "North updated" };
    const b3 = { id: "B3", name: "East", city: "Kolkata" };
    const r1 = { ...base.sales_reps[0], name: "Asha updated" };
    const r3 = { id: "R3", name: "Chen", branch_id: "B3", role: "Sales", joined: "2025-01-01" };
    const l1 = { ...base.leads[0], customer_name: "Updated customer" };
    const l2 = lead("L2", { branch_id: "B2", assigned_to: "R2" });
    const janTarget = { ...base.targets[1], target_units: 9 };
    const aprB1 = { branch_id: "B1", month: "2025-04", target_units: 4, target_revenue: 40 };
    const aprB2 = { branch_id: "B2", month: "2025-04", target_units: 5, target_revenue: 50 };
    const l1Delivery = { ...base.deliveries[0], days_to_deliver: 12 };
    const l2Delivery = {
      lead_id: "L2",
      order_date: "2025-02-01",
      delivery_date: "2025-02-05",
      days_to_deliver: 4,
      delay_reason: "Paperwork",
    };

    const { merged, summary } = mergeDatasets(base, {
      metadata: { owner: "new", imported: true },
      branches: [b1, b3],
      sales_reps: [r1, r3],
      leads: [l1, l2],
      targets: [janTarget, aprB1, aprB2],
      deliveries: [l1Delivery, l2Delivery],
    });

    expect(summary).toEqual({
      branches: { added: 1, updated: 1 },
      sales_reps: { added: 1, updated: 1 },
      leads: { added: 1, updated: 1 },
      targets: { added: 2, updated: 1 },
      deliveries: { added: 1, updated: 1 },
      newMonths: ["2025-04"],
    });
    expect(merged.metadata).toEqual({ version: "base", owner: "new", imported: true });
    expect(merged.branches).toEqual([b1, base.branches[1], b3]);
    expect(merged.sales_reps).toEqual([r1, base.sales_reps[1], r3]);
    expect(merged.leads).toEqual([l1, l2]);
    expect(merged.targets).toEqual([base.targets[0], janTarget, base.targets[2], aprB1, aprB2]);
    expect(merged.deliveries).toEqual([l1Delivery, l2Delivery]);
  });
});

describe("metric helper and memoisation gaps", () => {
  it("extracts the canonical month and discloses an empty history as unknown", () => {
    expect(monthOf("2025-06-19T12:34:56Z")).toBe("2025-06");
    expect(stageBeforeLost(lead("empty", { status_history: [] }))).toBe("unknown");
  });

  it("applies rep and month filters independently", () => {
    const d = dataset({
      leads: [
        lead("jan-r1"),
        lead("feb-r2", {
          assigned_to: "R2",
          branch_id: "B2",
          created_at: "2025-02-01T00:00:00Z",
        }),
      ],
    });

    expect(scopedLeads(d, { repId: "R2" }).map((l) => l.id)).toEqual(["feb-r2"]);
    expect(scopedLeads(d, { months: ["2025-01"] }).map((l) => l.id)).toEqual(["jan-r1"]);
  });

  it("returns the memoised array for the identical dataset and filter", () => {
    const d = dataset();
    const first = scopedLeads(d, { branchId: "B1" });
    expect(scopedLeads(d, { branchId: "B1" })).toBe(first);
  });

  it("keeps undefined branch, rep, and month keys distinct from literal values", () => {
    const branchData = dataset({
      leads: [lead("normal"), lead("special", { branch_id: "Stryker was here!" })],
    });
    expect(scopedLeads(branchData, { branchId: "Stryker was here!" })).toHaveLength(1);
    expect(scopedLeads(branchData, {})).toHaveLength(2);

    const repData = dataset({
      leads: [lead("normal"), lead("special", { assigned_to: "Stryker was here!" })],
    });
    expect(scopedLeads(repData, { repId: "Stryker was here!" })).toHaveLength(1);
    expect(scopedLeads(repData, {})).toHaveLength(2);

    const monthData = dataset({ leads: [lead("normal")] });
    expect(scopedLeads(monthData, { months: ["Stryker was here"] })).toHaveLength(0);
    expect(scopedLeads(monthData, {})).toHaveLength(1);
  });

  it("does not conflate comma-joined month lists", () => {
    const d = dataset({
      leads: [
        lead("jan"),
        lead("feb", { created_at: "2025-02-01T00:00:00Z" }),
      ],
    });
    expect(scopedLeads(d, { months: ["2025-012025-02"] })).toHaveLength(0);
    expect(scopedLeads(d, { months: ["2025-01", "2025-02"] })).toHaveLength(2);
  });

  it("computes empty, even-sized, unsorted median/mean/percentile cases exactly", () => {
    const empty = velocity(dataset({ leads: [] }), {});
    expect(empty.perStage).toEqual([
      { stage: "new", medianDays: 0, meanDays: 0, n: 0 },
      { stage: "contacted", medianDays: 0, meanDays: 0, n: 0 },
      { stage: "test_drive", medianDays: 0, meanDays: 0, n: 0 },
      { stage: "negotiation", medianDays: 0, meanDays: 0, n: 0 },
      { stage: "order_placed", medianDays: 0, meanDays: 0, n: 0 },
    ]);
    expect({
      cycleMedian: empty.cycleMedian,
      cycleMean: empty.cycleMean,
      cycleP90: empty.cycleP90,
    }).toEqual({ cycleMedian: 0, cycleMean: 0, cycleP90: 0 });

    const first = lead("slow", {
      status: "delivered",
      status_history: [
        { status: "new", timestamp: "2025-01-01T00:00:00Z" },
        { status: "contacted", timestamp: "2025-01-04T00:00:00Z" },
        { status: "delivered", timestamp: "2025-01-21T00:00:00Z" },
      ],
    });
    const second = lead("fast", {
      status: "delivered",
      status_history: [
        { status: "new", timestamp: "2025-01-01T00:00:00Z" },
        { status: "contacted", timestamp: "2025-01-02T00:00:00Z" },
        { status: "delivered", timestamp: "2025-01-11T00:00:00Z" },
      ],
    });
    const skippedStage = lead("skip", {
      status: "negotiation",
      status_history: [
        { status: "new", timestamp: "2025-01-01T00:00:00Z" },
        { status: "negotiation", timestamp: "2025-01-05T00:00:00Z" },
      ],
    });
    const deliveredHistoryButOpen = lead("history-only", {
      status: "contacted",
      status_history: [
        { status: "new", timestamp: "2025-01-01T00:00:00Z" },
        { status: "delivered", timestamp: "2025-01-06T00:00:00Z" },
      ],
    });
    const deliveredWithoutHistory = lead("missing-delivered-event", {
      status: "delivered",
      status_history: [{ status: "new", timestamp: "2025-01-01T00:00:00Z" }],
    });
    const v = velocity(
      dataset({
        leads: [
          first,
          second,
          skippedStage,
          deliveredHistoryButOpen,
          deliveredWithoutHistory,
        ],
      }),
      {},
    );

    expect(v.perStage).toEqual([
      { stage: "new", medianDays: 2, meanDays: 2, n: 2 },
      { stage: "contacted", medianDays: 0, meanDays: 0, n: 0 },
      { stage: "test_drive", medianDays: 0, meanDays: 0, n: 0 },
      { stage: "negotiation", medianDays: 0, meanDays: 0, n: 0 },
      { stage: "order_placed", medianDays: 0, meanDays: 0, n: 0 },
    ]);
    expect({ cycleMedian: v.cycleMedian, cycleMean: v.cycleMean, cycleP90: v.cycleP90 }).toEqual({
      cycleMedian: 15,
      cycleMean: 15,
      cycleP90: 20,
    });

    const manyCycles = Array.from({ length: 20 }, (_, i) => lead(`cycle-${i + 1}`, {
      status: "delivered",
      status_history: [
        { status: "new", timestamp: "2025-01-01T00:00:00Z" },
        {
          status: "delivered",
          timestamp: `2025-01-${String(i + 2).padStart(2, "0")}T00:00:00Z`,
        },
      ],
    }));
    expect(velocity(dataset({ leads: manyCycles }), {}).cycleP90).toBe(19);
  });
});

describe("exact reconciliation oracles on a synthetic dealership", () => {
  const d = analyticsDataset();
  const idx = buildIndexes(d);

  it("pins the date, history, and stage helpers", () => {
    expect(parseTs("2025-02-03T04:05:06Z").toISOString()).toBe("2025-02-03T04:05:06.000Z");
    expect(daysBetween(new Date("2025-01-03T12:00:00Z"), new Date("2025-01-01T00:00:00Z"))).toBe(2);
    expect(daysBetween(new Date("2025-01-01T12:00:00Z"), new Date("2025-01-02T00:00:00Z"))).toBe(-1);
    expect(daysStale(d.leads[2], idx.cutoff)).toBe(7);
    expect(reachedStages({
      ...d.leads[0],
      status_history: [
        { status: "new", timestamp: "2025-01-01T00:00:00Z" },
        { status: "new", timestamp: "2025-01-02T00:00:00Z" },
        { status: "contacted", timestamp: "2025-01-03T00:00:00Z" },
      ],
    })).toEqual(new Set(["new", "contacted"]));
    expect(reachedAt(d.leads[0], "contacted")?.toISOString()).toBe("2025-01-02T00:00:00.000Z");
    expect(reachedAt(d.leads[0], "missing")).toBeNull();
    expect(stageBeforeLost(d.leads[3])).toBe("new");
    expect(stageBeforeLost({
      ...d.leads[2],
      status_history: [
        { status: "new", timestamp: "2025-01-01T00:00:00Z" },
        { status: "contacted", timestamp: "2025-01-02T00:00:00Z" },
      ],
    })).toBe("contacted");
  });

  it("computes every KPI field and keeps snapshot metrics outside the month filter", () => {
    expect(kpis(d, idx, {})).toEqual({
      unitsDelivered: 2,
      targetUnits: 14,
      unitAttainmentPct: (100 * 2) / 14,
      revenue: 30_000_000,
      targetRevenue: 140_000_000,
      revenueAttainmentPct: (100 * 30_000_000) / 140_000_000,
      leadsCreated: 4,
      convertedLeads: 2,
      conversionPct: 50,
      openPipelineCount: 1,
      openPipelineValue: 5_000_000,
      coldCount: 1,
      coldValue: 5_000_000,
      avgDaysToDeliver: 15,
    });
    expect(kpis(d, idx, { branchId: "B1", months: ["2025-01"] })).toEqual({
      unitsDelivered: 0,
      targetUnits: 2,
      unitAttainmentPct: 0,
      revenue: 0,
      targetRevenue: 20_000_000,
      revenueAttainmentPct: 0,
      leadsCreated: 1,
      convertedLeads: 1,
      conversionPct: 100,
      openPipelineCount: 1,
      openPipelineValue: 5_000_000,
      coldCount: 1,
      coldValue: 5_000_000,
      avgDaysToDeliver: 0,
    });
  });

  it("pins monthly delivery-date attainment and revenue", () => {
    expect(monthlyAttainment(d, idx, {})).toEqual([
      {
        month: "2025-01",
        delivered: 1,
        target: 6,
        attainmentPct: 100 / 6,
        revenue: 20_000_000,
        targetRevenue: 60_000_000,
      },
      {
        month: "2025-02",
        delivered: 1,
        target: 8,
        attainmentPct: 12.5,
        revenue: 10_000_000,
        targetRevenue: 80_000_000,
      },
    ]);
    expect(monthlyAttainment(d, idx, { branchId: "B1" })).toEqual([
      { month: "2025-01", delivered: 0, target: 2, attainmentPct: 0, revenue: 0, targetRevenue: 20_000_000 },
      { month: "2025-02", delivered: 1, target: 3, attainmentPct: 100 / 3, revenue: 10_000_000, targetRevenue: 30_000_000 },
    ]);
  });

  it("returns explicit zero target buckets for a branch with no target that month", () => {
    const sparse = dataset({
      leads: [],
      deliveries: [],
      targets: [
        { branch_id: "B2", month: "2025-04", target_units: 4, target_revenue: 40_000_000 },
      ],
    });
    expect(monthlyAttainment(sparse, buildIndexes(sparse), { branchId: "B1" })).toEqual([
      { month: "2025-04", delivered: 0, target: 0, attainmentPct: 0, revenue: 0, targetRevenue: 0 },
    ]);
  });

  it("applies the month to branch leads, deliveries, and targets", () => {
    expect(branchComparison(d, idx, { months: ["2025-01"] })).toEqual([
      {
        branchId: "B1",
        name: "North",
        city: "Delhi",
        leads: 1,
        delivered: 1,
        conversionPct: 100,
        targetUnits: 2,
        attainmentPct: 0,
        revenue: 0,
      },
      {
        branchId: "B2",
        name: "South",
        city: "Chennai",
        leads: 1,
        delivered: 0,
        conversionPct: 0,
        targetUnits: 4,
        attainmentPct: 25,
        revenue: 20_000_000,
      },
    ]);
  });

  it("returns explicit zeros for an empty branch and counts multiple deliveries", () => {
    const b3 = { id: "B3", name: "East", city: "Kolkata" };
    const expanded = { ...d, branches: [...d.branches, b3] };
    expect(branchComparison(expanded, buildIndexes(expanded), {})[2]).toEqual({
      branchId: "B3",
      name: "East",
      city: "Kolkata",
      leads: 0,
      delivered: 0,
      conversionPct: 0,
      targetUnits: 0,
      attainmentPct: 0,
      revenue: 0,
    });

    const duplicateDelivery = { ...d, deliveries: [...d.deliveries, { ...d.deliveries[0] }] };
    expect(branchComparison(duplicateDelivery, buildIndexes(duplicateDelivery), {})[0]).toMatchObject({
      attainmentPct: 40,
      revenue: 20_000_000,
    });
  });

  it("pins branch rows and the below-group portfolio alert", () => {
    expect(branchComparison(d, idx, {})).toEqual([
      {
        branchId: "B1",
        name: "North",
        city: "Delhi",
        leads: 2,
        delivered: 1,
        conversionPct: 50,
        targetUnits: 5,
        attainmentPct: 20,
        revenue: 10_000_000,
      },
      {
        branchId: "B2",
        name: "South",
        city: "Chennai",
        leads: 2,
        delivered: 1,
        conversionPct: 50,
        targetUnits: 9,
        attainmentPct: 100 / 9,
        revenue: 20_000_000,
      },
    ]);
    expect(branchesBehindTarget(d, idx, {})).toEqual([
      {
        branchId: "B2",
        name: "South",
        delivered: 1,
        targetUnits: 9,
        attainmentPct: 100 / 9,
        unitGap: 8,
      },
    ]);
  });

  it("excludes zero-target branches, excludes equal attainment, and sorts multiple gaps", () => {
    const branches = [
      { id: "B0", name: "Zero target", city: "Zero" },
      { id: "B3", name: "Three", city: "Three" },
      { id: "B2", name: "Two", city: "Two" },
      { id: "B1", name: "One", city: "One" },
    ];
    const specs = [
      ...Array.from({ length: 10 }, (_, i) => ["B0", `Z${i}`] as const),
      ...Array.from({ length: 2 }, (_, i) => ["B3", `C${i}`] as const),
      ["B2", "B-only"] as const,
      ...Array.from({ length: 5 }, (_, i) => ["B1", `A${i}`] as const),
    ];
    const leads = specs.map(([branchId, id]) => lead(id, {
      branch_id: branchId,
      status: "delivered",
    }));
    const deliveries = specs.map(([, id]) => ({
      lead_id: id,
      order_date: "2025-01-01",
      delivery_date: "2025-01-02",
      days_to_deliver: 1,
      delay_reason: null,
    }));
    const ranked = dataset({
      branches,
      leads,
      deliveries,
      targets: ["B3", "B2", "B1"].map((branch_id) => ({
        branch_id,
        month: "2025-01",
        target_units: 10,
        target_revenue: 1,
      })),
    });
    expect(branchesBehindTarget(ranked, buildIndexes(ranked), {})).toEqual([
      { branchId: "B2", name: "Two", delivered: 1, targetUnits: 10, attainmentPct: 10, unitGap: 9 },
      { branchId: "B3", name: "Three", delivered: 2, targetUnits: 10, attainmentPct: 20, unitGap: 8 },
    ]);

    const equal = dataset({
      leads: [
        lead("E1", { branch_id: "B1", status: "delivered" }),
        lead("E2", { branch_id: "B2", status: "delivered" }),
      ],
      deliveries: ["E1", "E2"].map((lead_id) => ({
        lead_id,
        order_date: "2025-01-01",
        delivery_date: "2025-01-02",
        days_to_deliver: 1,
        delay_reason: null,
      })),
      targets: ["B1", "B2"].map((branch_id) => ({
        branch_id,
        month: "2025-01",
        target_units: 2,
        target_revenue: 1,
      })),
    });
    expect(branchesBehindTarget(equal, buildIndexes(equal), {})).toEqual([]);
  });

  it("pins every funnel numerator, advance rate, and leak rate", () => {
    expect(funnel(d, {})).toEqual([
      { stage: "new", reached: 4, advancePct: 75, leakPct: 25 },
      { stage: "contacted", reached: 3, advancePct: 100, leakPct: 0 },
      { stage: "test_drive", reached: 3, advancePct: 100, leakPct: 0 },
      { stage: "negotiation", reached: 3, advancePct: (100 * 2) / 3, leakPct: 100 - (100 * 2) / 3 },
      { stage: "order_placed", reached: 2, advancePct: 100, leakPct: 0 },
      { stage: "delivered", reached: 2, advancePct: null, leakPct: null },
    ]);
    expect(funnel(dataset({ leads: [] }), {})).toEqual([
      { stage: "new", reached: 0, advancePct: null, leakPct: null },
      { stage: "contacted", reached: 0, advancePct: null, leakPct: null },
      { stage: "test_drive", reached: 0, advancePct: null, leakPct: null },
      { stage: "negotiation", reached: 0, advancePct: null, leakPct: null },
      { stage: "order_placed", reached: 0, advancePct: null, leakPct: null },
      { stage: "delivered", reached: 0, advancePct: null, leakPct: null },
    ]);
  });

  it("pins loss values, anomaly disclosure, matrix cells, and ordering", () => {
    const losses = dataset({
      leads: [
        lead("U1", {
          status: "lost",
          deal_value: 1_000_000,
          lost_reason: null,
          status_history: [
            { status: "new", timestamp: "2025-01-01T00:00:00Z" },
            { status: "contacted", timestamp: "2025-01-02T00:00:00Z" },
            { status: "lost", timestamp: "2025-01-03T00:00:00Z" },
          ],
        }),
        lead("P1", {
          status: "lost",
          deal_value: 10_000_000,
          lost_reason: "Price",
          status_history: [
            { status: "new", timestamp: "2025-01-01T00:00:00Z" },
            { status: "lost", timestamp: "2025-01-02T00:00:00Z" },
          ],
        }),
        lead("P2", {
          status: "lost",
          deal_value: 2_000_000,
          lost_reason: "Price",
          status_history: [
            { status: "new", timestamp: "2025-01-01T00:00:00Z" },
            { status: "lost", timestamp: "2025-01-02T00:00:00Z" },
          ],
        }),
      ],
    });

    expect(lossAnalysis(losses, {})).toEqual({
      byStage: [
        { stage: "new", count: 2, value: 12_000_000 },
        { stage: "contacted", count: 1, value: 1_000_000 },
      ],
      reasons: [
        { reason: "Price", count: 2 },
        { reason: "Unknown", count: 1 },
      ],
      matrix: {
        stages: ["new", "contacted"],
        rows: [
          { reason: "Price", total: 2, cells: { new: 2 } },
          { reason: "Unknown", total: 1, cells: { contacted: 1 } },
        ],
      },
      totalLost: 3,
      totalLostValue: 13_000_000,
    });
  });

  it("pins source/model partitions and their revenue-based ordering", () => {
    expect(sourceQuality(d, {})).toEqual([
      { source: "referral", leads: 2, delivered: 1, conversionPct: 50, revenue: 20_000_000, revenuePerLead: 10_000_000 },
      { source: "web", leads: 2, delivered: 1, conversionPct: 50, revenue: 10_000_000, revenuePerLead: 5_000_000 },
    ]);
    expect(modelConcentration(d, {})).toEqual([
      { model: "Model B", leads: 2, delivered: 1, revenue: 20_000_000, sharePct: (100 * 20) / 30 },
      { model: "Model A", leads: 2, delivered: 1, revenue: 10_000_000, sharePct: (100 * 10) / 30 },
    ]);
    expect(modelConcentration(dataset({ leads: [lead("open-only")] }), {})).toEqual([
      { model: "Model A", leads: 1, delivered: 0, revenue: 0, sharePct: 0 },
    ]);
  });

  it("pins SLA filtering, averages, reason counts, and empty sides", () => {
    expect(deliverySLA(d, idx, {})).toEqual({
      total: 2,
      delayed: 1,
      avgDelayed: 10,
      avgOnTime: 20,
      reasons: [{ reason: "Stock", count: 1 }],
    });
    expect(deliverySLA(d, idx, { months: ["2025-01"] })).toEqual({
      total: 1,
      delayed: 0,
      avgDelayed: 0,
      avgOnTime: 20,
      reasons: [],
    });

    const reasonOrder = dataset({
      leads: [lead("P"), lead("S1"), lead("S2")],
      deliveries: [
        { lead_id: "P", order_date: "2025-01-01", delivery_date: "2025-01-02", days_to_deliver: 9, delay_reason: "Paperwork" },
        { lead_id: "S1", order_date: "2025-01-01", delivery_date: "2025-01-02", days_to_deliver: 3, delay_reason: "Stock" },
        { lead_id: "S2", order_date: "2025-01-01", delivery_date: "2025-01-02", days_to_deliver: 6, delay_reason: "Stock" },
      ],
    });
    expect(deliverySLA(reasonOrder, buildIndexes(reasonOrder), {}).reasons).toEqual([
      { reason: "Stock", count: 2 },
      { reason: "Paperwork", count: 1 },
    ]);
  });

  it("pins rep metadata, revenue, sample floor, and conversion ordering", () => {
    expect(repLeaderboard(d, idx, {})).toEqual([
      {
        repId: "R2",
        name: "Bilal",
        branchName: "South",
        role: "Sales",
        leads: 1,
        delivered: 1,
        conversionPct: 100,
        revenue: 20_000_000,
        belowSample: true,
      },
      {
        repId: "R1",
        name: "Asha",
        branchName: "North",
        role: "Sales",
        leads: 3,
        delivered: 1,
        conversionPct: 100 / 3,
        revenue: 10_000_000,
        belowSample: true,
      },
    ]);
  });

  it("falls back safely for an unknown rep and treats exactly five leads as rankable", () => {
    const missingRep = dataset({
      leads: Array.from({ length: 5 }, (_, i) => lead(`M${i}`, {
        assigned_to: "RX",
        branch_id: "BX",
      })),
    });
    expect(repLeaderboard(missingRep, buildIndexes(missingRep), {})).toEqual([
      {
        repId: "RX",
        name: "RX",
        branchName: "",
        role: "",
        leads: 5,
        delivered: 0,
        conversionPct: 0,
        revenue: 0,
        belowSample: false,
      },
    ]);

    const missingBranch = dataset({
      sales_reps: [
        ...dataset().sales_reps,
        { id: "R3", name: "Chandra", branch_id: "BX", role: "Sales", joined: "2025-01-01" },
      ],
      leads: [lead("missing-branch", { assigned_to: "R3", branch_id: "BX" })],
    });
    expect(repLeaderboard(missingBranch, buildIndexes(missingBranch), {})).toEqual([
      {
        repId: "R3",
        name: "Chandra",
        branchName: "",
        role: "Sales",
        leads: 1,
        delivered: 0,
        conversionPct: 0,
        revenue: 0,
        belowSample: true,
      },
    ]);
  });

  it("checks coaching revenue as well as units", () => {
    const result = coaching({
      leadsInView: 0,
      baseUnits: 0,
      targetUnits: 1,
      baseConversionPct: 0,
      avgDealValue: 2_000_000,
      baseRevenue: 0,
      atRiskCount: 0,
      atRiskValue: 0,
      medianConversionPct: 0,
      laggards: [],
      coachingCeilingUnits: 12,
      sources: [],
      bestSource: null,
    }, 50);
    expect(result).toEqual({ units: 6, revenue: 12_000_000 });
  });
});

describe("open-pipeline and action-center exact oracles", () => {
  const actionData = dataset({
    targets: [{ branch_id: "B1", month: "2025-02", target_units: 1, target_revenue: 1 }],
    leads: [
      lead("A", {
        customer_name: "Stale order",
        status: "order_placed",
        last_activity_at: "2025-02-21T00:00:00Z",
        expected_close_date: "2025-03-05",
        deal_value: 8_000_000,
      }),
      lead("B", {
        customer_name: "Overdue",
        status: "negotiation",
        assigned_to: "R2",
        branch_id: "B2",
        last_activity_at: "2025-02-18T00:00:00Z",
        expected_close_date: "2025-02-20",
        deal_value: 6_000_000,
      }),
      lead("C", {
        customer_name: "Late stage",
        status: "negotiation",
        last_activity_at: "2025-02-21T00:00:00Z",
        expected_close_date: "2025-03-10",
        deal_value: 4_000_000,
      }),
      lead("D", {
        customer_name: "Cold",
        status: "contacted",
        assigned_to: "R2",
        branch_id: "B2",
        last_activity_at: "2025-02-20T00:00:00Z",
        deal_value: 3_000_000,
      }),
      lead("F", {
        customer_name: "Cold boundary",
        status: "contacted",
        last_activity_at: "2025-02-21T00:00:00Z",
        deal_value: 1_000_000,
      }),
      lead("G", {
        customer_name: "Due today",
        status: "negotiation",
        last_activity_at: "2025-02-28T00:00:00Z",
        expected_close_date: "2025-02-28",
        deal_value: 2_500_000,
      }),
      lead("E", {
        customer_name: "Fresh fallback",
        status: "new",
        assigned_to: "RX",
        branch_id: "BX",
        last_activity_at: "2025-02-28T00:00:00Z",
        deal_value: 2_000_000,
      }),
      lead("LOST", {
        status: "lost",
        last_activity_at: "2025-02-01T00:00:00Z",
      }),
      lead("DONE", {
        status: "delivered",
        last_activity_at: "2025-02-01T00:00:00Z",
      }),
    ],
    deliveries: [],
  });
  const idx = buildIndexes(actionData);

  it("maps and sorts every open row, including lookup fallbacks", () => {
    expect(openPipeline(actionData, idx, {})).toEqual([
      { leadId: "A", customer: "Stale order", stage: "order_placed", value: 8_000_000, daysStale: 7, expectedClose: "2025-03-05", repName: "Asha", branchName: "North", source: "walk_in" },
      { leadId: "B", customer: "Overdue", stage: "negotiation", value: 6_000_000, daysStale: 10, expectedClose: "2025-02-20", repName: "Bilal", branchName: "South", source: "walk_in" },
      { leadId: "C", customer: "Late stage", stage: "negotiation", value: 4_000_000, daysStale: 7, expectedClose: "2025-03-10", repName: "Asha", branchName: "North", source: "walk_in" },
      { leadId: "G", customer: "Due today", stage: "negotiation", value: 2_500_000, daysStale: 0, expectedClose: "2025-02-28", repName: "Asha", branchName: "North", source: "walk_in" },
      { leadId: "D", customer: "Cold", stage: "contacted", value: 3_000_000, daysStale: 8, expectedClose: null, repName: "Bilal", branchName: "South", source: "walk_in" },
      { leadId: "F", customer: "Cold boundary", stage: "contacted", value: 1_000_000, daysStale: 7, expectedClose: null, repName: "Asha", branchName: "North", source: "walk_in" },
      { leadId: "E", customer: "Fresh fallback", stage: "new", value: 2_000_000, daysStale: 0, expectedClose: null, repName: "RX", branchName: "BX", source: "walk_in" },
    ]);

    const reversed = { ...actionData, leads: [...actionData.leads].reverse() };
    expect(openPipeline(reversed, buildIndexes(reversed), {}).map((row) => row.leadId)).toEqual([
      "A", "B", "C", "G", "D", "F", "E",
    ]);
    expect(openPipeline(actionData, idx, { branchId: "B1", repId: "R2" })).toEqual([]);
  });

  it("aggregates open value in canonical stage order", () => {
    expect(pipelineByStage(actionData, idx, {})).toEqual([
      { stage: "new", count: 1, value: 2_000_000 },
      { stage: "contacted", count: 2, value: 4_000_000 },
      { stage: "negotiation", count: 3, value: 12_500_000 },
      { stage: "order_placed", count: 1, value: 8_000_000 },
    ]);
  });

  it("classifies priority rules, exact boundaries, scores, reasons, and rank", () => {
    expect(actionItems(actionData, idx, {})).toEqual([
      {
        type: "stale_order",
        leadId: "A",
        customer: "Stale order",
        branchName: "North",
        repName: "Asha",
        stage: "order_placed",
        daysStale: 7,
        value: 8_000_000,
        expectedClose: "2025-03-05",
        score: 28,
        reason: "Order placed but no activity for 7 days; delivery at risk.",
      },
      {
        type: "overdue",
        leadId: "B",
        customer: "Overdue",
        branchName: "South",
        repName: "Bilal",
        stage: "negotiation",
        daysStale: 10,
        value: 6_000_000,
        expectedClose: "2025-02-20",
        score: 24,
        reason: "Past expected close date (2025-02-20) and still open.",
      },
      {
        type: "high_value_late",
        leadId: "C",
        customer: "Late stage",
        branchName: "North",
        repName: "Asha",
        stage: "negotiation",
        daysStale: 7,
        value: 4_000_000,
        expectedClose: "2025-03-10",
        score: 11.200000000000001,
        reason: "Late-stage lead (negotiation) idle for 7 days.",
      },
      {
        type: "cold",
        leadId: "D",
        customer: "Cold",
        branchName: "South",
        repName: "Bilal",
        stage: "contacted",
        daysStale: 8,
        value: 3_000_000,
        expectedClose: null,
        score: 4.8,
        reason: "No activity for 8 days.",
      },
      {
        type: "cold",
        leadId: "F",
        customer: "Cold boundary",
        branchName: "North",
        repName: "Asha",
        stage: "contacted",
        daysStale: 7,
        value: 1_000_000,
        expectedClose: null,
        score: 1.4000000000000001,
        reason: "No activity for 7 days.",
      },
    ]);
    expect(actionItems(actionData, idx, { branchId: "B1", repId: "R2" })).toEqual([]);
  });
});
