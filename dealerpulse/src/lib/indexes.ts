import type { Branch, Dataset, Delivery, Lead, Rep } from "./types";

/** Lookup indexes over the dataset. Pure — safe to use in tests and on the server. */
export type Indexes = {
  branchById: Map<string, Branch>;
  repById: Map<string, Rep>;
  leadById: Map<string, Lead>;
  deliveryByLead: Map<string, Delivery>;
  months: string[];
  /**
   * The analytical "now": the last day of the latest reporting month. Derived
   * from the data rather than hardcoded, so merging a new month advances it and
   * every aging/staleness metric moves with the data. For the bundled dataset
   * (latest month 2025-12) this resolves to exactly 2025-12-31, so baseline
   * numbers are unchanged.
   */
  cutoff: Date;
};

/** Last day of a `YYYY-MM` month at 00:00:00Z. */
export function monthEnd(month: string): Date {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)); // day 0 of the next month = last day of this one
}

export function buildIndexes(d: Dataset): Indexes {
  const months = [...new Set(d.targets.map((t) => t.month))].sort();
  const lastMonth = months[months.length - 1];
  return {
    branchById: new Map(d.branches.map((b) => [b.id, b])),
    repById: new Map(d.sales_reps.map((r) => [r.id, r])),
    leadById: new Map(d.leads.map((l) => [l.id, l])),
    deliveryByLead: new Map(d.deliveries.map((x) => [x.lead_id, x])),
    months,
    cutoff: lastMonth ? monthEnd(lastMonth) : new Date("2025-12-31T00:00:00Z"),
  };
}
