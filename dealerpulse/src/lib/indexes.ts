import type { Branch, Dataset, Delivery, Lead, Rep } from "./types";

/** Lookup indexes over the dataset. Pure — safe to use in tests and on the server. */
export type Indexes = {
  branchById: Map<string, Branch>;
  repById: Map<string, Rep>;
  leadById: Map<string, Lead>;
  deliveryByLead: Map<string, Delivery>;
  months: string[];
};

export function buildIndexes(d: Dataset): Indexes {
  return {
    branchById: new Map(d.branches.map((b) => [b.id, b])),
    repById: new Map(d.sales_reps.map((r) => [r.id, r])),
    leadById: new Map(d.leads.map((l) => [l.id, l])),
    deliveryByLead: new Map(d.deliveries.map((x) => [x.lead_id, x])),
    months: [...new Set(d.targets.map((t) => t.month))].sort(),
  };
}
