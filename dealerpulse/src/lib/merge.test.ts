import { describe, it, expect } from "vitest";
import raw from "@/data/dealership_data.json";
import { DatasetSchema } from "./types";
import { mergeDatasets, PartialDatasetSchema } from "./merge";

const base = DatasetSchema.parse(raw);

describe("mergeDatasets", () => {
  it("adds new leads and detects a new month", () => {
    const incoming = {
      leads: [
        {
          id: "LNEW1",
          customer_name: "New Buyer",
          phone: "x",
          source: "walk_in",
          model_interested: "Fortuner",
          status: "contacted",
          assigned_to: base.sales_reps[0].id,
          branch_id: base.branches[0].id,
          created_at: "2026-01-05T10:00:00Z",
          last_activity_at: "2026-01-06T10:00:00Z",
          deal_value: 1000000,
          status_history: [{ status: "new", timestamp: "2026-01-05T10:00:00Z" }],
        },
      ],
      targets: [
        { branch_id: base.branches[0].id, month: "2026-01", target_units: 10, target_revenue: 1 },
      ],
    };
    const { merged, summary } = mergeDatasets(base, PartialDatasetSchema.parse(incoming));
    expect(summary.leads.added).toBe(1);
    expect(summary.leads.updated).toBe(0);
    expect(summary.newMonths).toEqual(["2026-01"]);
    expect(merged.leads.length).toBe(base.leads.length + 1);
    // Merged whole still satisfies the full schema.
    expect(DatasetSchema.safeParse(merged).success).toBe(true);
  });

  it("upserts an existing lead by id (update, not duplicate)", () => {
    const existing = base.leads[0];
    const incoming = { leads: [{ ...existing, status: "lost", lost_reason: "Test" }] };
    const { merged, summary } = mergeDatasets(base, PartialDatasetSchema.parse(incoming));
    expect(summary.leads.added).toBe(0);
    expect(summary.leads.updated).toBe(1);
    expect(merged.leads.length).toBe(base.leads.length);
    expect(merged.leads.find((l) => l.id === existing.id)?.status).toBe("lost");
  });

  it("leaves the base unchanged when nothing is sent", () => {
    const { merged, summary } = mergeDatasets(base, {});
    expect(merged.leads.length).toBe(base.leads.length);
    expect(summary.newMonths).toEqual([]);
  });
});
