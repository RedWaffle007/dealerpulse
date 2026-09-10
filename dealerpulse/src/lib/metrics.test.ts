import { describe, it, expect } from "vitest";
import raw from "@/data/dealership_data.json";
import { DatasetSchema } from "./types";
import { buildIndexes } from "./indexes";
import {
  kpis,
  funnel,
  lossAnalysis,
  sourceQuality,
  velocity,
  actionItems,
  branchComparison,
  repLeaderboard,
} from "./metrics";

// These expectations are the figures independently verified in analysis/eda.ipynb.
const d = DatasetSchema.parse(raw);
const idx = buildIndexes(d);
const ALL = {}; // no filter

describe("dataset integrity", () => {
  it("has the expected shape", () => {
    expect(d.leads).toHaveLength(510);
    expect(d.branches).toHaveLength(5);
    expect(d.sales_reps).toHaveLength(30);
    expect(d.deliveries).toHaveLength(160);
    expect(d.targets).toHaveLength(35);
  });
});

describe("kpis (metric contract)", () => {
  const k = kpis(d, idx, ALL);
  it("overall attainment is the systemic-shortfall story", () => {
    expect(k.unitsDelivered).toBe(160);
    expect(k.targetUnits).toBe(1426);
    expect(k.unitAttainmentPct).toBeCloseTo(11.2, 1);
  });
  it("cold-lead snapshot matches (35 leads as of cutoff)", () => {
    expect(k.openPipelineCount).toBe(62);
    expect(k.coldCount).toBe(35);
  });
  it("avg delivery days is populated", () => {
    expect(k.avgDaysToDeliver).toBeGreaterThan(0);
  });
});

describe("funnel", () => {
  const steps = funnel(d, ALL);
  it("all 510 leads enter as 'new'", () => {
    expect(steps[0].reached).toBe(510);
  });
  it("160 leads reach delivered", () => {
    expect(steps.find((s) => s.stage === "delivered")!.reached).toBe(160);
  });
  it("early-stage leak is ~23%", () => {
    expect(steps[0].leakPct!).toBeCloseTo(23, 0);
  });
});

describe("loss analysis", () => {
  const la = lossAnalysis(d, ALL);
  it("288 total losses", () => {
    expect(la.totalLost).toBe(288);
  });
  it("biggest leak is at the 'new' stage", () => {
    expect(la.byStage[0].stage).toBe("new");
    expect(la.byStage[0].count).toBe(114);
  });
  it("14 malformed losses surface as 'Unknown', not dropped", () => {
    const unknown = la.reasons.find((r) => r.reason === "Unknown");
    expect(unknown?.count).toBe(14);
  });
});

describe("source quality", () => {
  const s = sourceQuality(d, ALL);
  it("walk_in is the top channel by revenue/lead", () => {
    expect(s[0].source).toBe("walk_in");
    expect(s[0].conversionPct).toBeCloseTo(45.7, 0);
  });
  it("social_media is the weakest", () => {
    const social = s.find((x) => x.source === "social_media")!;
    expect(social.conversionPct).toBeCloseTo(13.9, 0);
  });
});

describe("velocity", () => {
  const v = velocity(d, ALL);
  it("median sales cycle is ~37 days", () => {
    expect(v.cycleMedian).toBeCloseTo(37, 0);
  });
});

describe("branch comparison", () => {
  it("Lakeside is the conversion outlier", () => {
    const rows = branchComparison(d, idx, ALL);
    const lakeside = rows.find((r) => r.name.includes("Lakeside"))!;
    expect(lakeside.conversionPct).toBeCloseTo(7.6, 0);
  });
});

describe("rep leaderboard", () => {
  it("flags reps below the minimum-sample floor", () => {
    const rows = repLeaderboard(d, idx, ALL);
    expect(rows.some((r) => r.belowSample)).toBe(false); // all reps have ≥5 leads at full scope
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe("action center", () => {
  const items = actionItems(d, idx, ALL);
  it("surfaces cold/stale/overdue open leads, ranked by score", () => {
    expect(items.length).toBeGreaterThan(0);
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].score).toBeGreaterThanOrEqual(items[i].score);
    }
  });
  it("every item carries an explanation", () => {
    expect(items.every((i) => i.reason.length > 0)).toBe(true);
  });
});
