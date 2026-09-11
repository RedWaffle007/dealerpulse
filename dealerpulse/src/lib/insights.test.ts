import { describe, it, expect } from "vitest";
import raw from "@/data/dealership_data.json";
import { DatasetSchema } from "./types";
import { buildIndexes } from "./indexes";
import {
  stageCloseRates,
  pipelineForecast,
  periodDigest,
  scenarioInputs,
} from "./insights";
import {
  conversionLift,
  recoverAtRisk,
  coaching,
  scaleSource,
  attainmentAfter,
} from "./scenario";

// Figures independently verified against the raw dataset in scratchpad scripts.
const d = DatasetSchema.parse(raw);
const idx = buildIndexes(d);
const ALL = {}; // no filter

describe("stage close rates", () => {
  const rates = stageCloseRates(d, ALL);
  it("covers the five pipeline stages, excluding delivered", () => {
    expect(rates.map((r) => r.stage)).toEqual([
      "new",
      "contacted",
      "test_drive",
      "negotiation",
      "order_placed",
    ]);
  });
  it("rises monotonically with stage depth", () => {
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i].p).toBeGreaterThanOrEqual(rates[i - 1].p);
    }
  });
  it("matches the verified endpoints", () => {
    expect(rates[0].p).toBeCloseTo(0.314, 2); // new: 160/510
    expect(rates[4].p).toBeCloseTo(0.808, 2); // order_placed: 160/198
  });
});

describe("pipeline forecast", () => {
  const fc = pipelineForecast(d, idx, ALL);
  it("weights the open book down from face value", () => {
    expect(fc.openCount).toBe(62);
    expect(fc.openValue / 1e7).toBeCloseTo(15.15, 1);
    expect(fc.expectedUnits).toBeCloseTo(41.6, 0);
    expect(fc.expectedValue).toBeLessThan(fc.openValue);
    expect(fc.expectedValue / 1e7).toBeCloseTo(9.88, 1);
  });
  it("expected units equal the sum over stages", () => {
    const sum = fc.byStage.reduce((s, x) => s + x.expectedUnits, 0);
    expect(fc.expectedUnits).toBeCloseTo(sum, 6);
  });
});

describe("period digest", () => {
  const dg = periodDigest(d, idx, ALL);
  it("compares the latest month to the prior month", () => {
    expect(dg.current).toBe("2025-12");
    expect(dg.prior).toBe("2025-11");
  });
  it("leads with a positive, delivery-anchored attainment story for Dec", () => {
    expect(dg.items[0].tone).toBe("good");
    expect(dg.items[0].headline).toMatch(/attainment rose/i);
  });
  it("never reports month-over-month lead conversion (a cohort artifact)", () => {
    for (const item of dg.items) {
      expect(`${item.headline} ${item.detail}`).not.toMatch(/conversion/i);
    }
  });
});

describe("scenario inputs", () => {
  const s = scenarioInputs(d, idx, ALL);
  it("carries the verified baselines", () => {
    expect(s.leadsInView).toBe(510);
    expect(s.baseUnits).toBe(160);
    expect(s.baseConversionPct).toBeCloseTo(31.37, 1);
    expect(s.atRiskCount).toBe(37);
    expect(s.atRiskValue / 1e7).toBeCloseTo(8.25, 1);
    expect(s.bestSource).toBe("walk_in");
  });
  it("finds a coaching ceiling of ~30 units below the median", () => {
    expect(s.medianConversionPct).toBeCloseTo(33.3, 1);
    expect(s.coachingCeilingUnits).toBeCloseTo(30, 0);
    expect(s.laggards.length).toBeGreaterThan(0);
    // Every laggard is genuinely below the median.
    for (const l of s.laggards) expect(l.conversionPct).toBeLessThan(s.medianConversionPct);
  });
});

describe("scenario projections", () => {
  const s = scenarioInputs(d, idx, ALL);
  it("A: +5 conversion points adds leadsInView * 5% units", () => {
    expect(conversionLift(s, 5).units).toBeCloseTo((510 * 5) / 100, 6);
    expect(conversionLift(s, 0).units).toBe(0);
  });
  it("B: recovering half the at-risk book protects half its value, no new units", () => {
    const r = recoverAtRisk(s, 50);
    expect(r.units).toBe(0);
    expect(r.revenue).toBeCloseTo(s.atRiskValue / 2, 6);
    expect(r.deals).toBeCloseTo(s.atRiskCount / 2, 6);
  });
  it("C: closing the full gap hits the coaching ceiling", () => {
    expect(coaching(s, 100).units).toBeCloseTo(s.coachingCeilingUnits, 6);
    expect(coaching(s, 0).units).toBe(0);
  });
  it("D: scaling a source uses that source's own conversion", () => {
    const walkIn = s.sources.find((x) => x.source === "walk_in")!;
    expect(scaleSource(s, "walk_in", 100).units).toBeCloseTo(walkIn.conversionPct, 6);
    expect(scaleSource(s, "does_not_exist", 100).units).toBe(0);
  });
  it("attainment rises with extra units against the target", () => {
    expect(attainmentAfter(s, 0)).toBeCloseTo((100 * 160) / 1426, 4);
    expect(attainmentAfter(s, 100)).toBeGreaterThan(attainmentAfter(s, 0));
  });
});
