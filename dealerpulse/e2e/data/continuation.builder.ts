import { PartialDatasetSchema } from "@/lib/merge";
import type { Dataset, Delivery, Lead, Target } from "@/lib/types";
import { STAGES } from "@/lib/types";

type Seed = {
  month: string;
  nextLeadNum: number;
  repByBranch: Map<string, string>;
};

/** Derives the next free month and lead id from a dataset, the way the upload page does. */
export function seedFrom(d: Dataset): Seed {
  const months = [...new Set(d.targets.map((t) => t.month))].sort();
  const [y, m] = months[months.length - 1].split("-").map(Number);
  const month = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const nextLeadNum = Math.max(...d.leads.map((l) => Number(l.id.replace(/\D/g, "")))) + 1;
  const repByBranch = new Map<string, string>();
  for (const r of d.sales_reps) {
    if (r.role === "sales_officer" && !repByBranch.has(r.branch_id)) repByBranch.set(r.branch_id, r.id);
  }
  return { month, nextLeadNum, repByBranch };
}

/**
 * Builds a continuation upload: next month's targets, delivered deals, and open
 * leads. `build()` validates against the app's own upload schema, so a test can
 * never send a payload it believes is valid but isn't. `buildUnchecked()` is for
 * deliberately broken payloads.
 */
export class ContinuationBuilder {
  private readonly leads: Lead[] = [];
  private readonly deliveries: Delivery[] = [];
  private readonly targets: Target[] = [];
  private nextLead: number;

  private constructor(private readonly seed: Seed) {
    this.nextLead = seed.nextLeadNum;
  }

  static from(d: Dataset): ContinuationBuilder {
    return new ContinuationBuilder(seedFrom(d));
  }

  get month(): string {
    return this.seed.month;
  }

  withTarget(branchId: string, units = 20, revenue = 35_000_000): this {
    this.targets.push({ branch_id: branchId, month: this.seed.month, target_units: units, target_revenue: revenue });
    return this;
  }

  /** A lead that walks the full funnel and is delivered inside the new month. */
  withDeliveredDeal(branchId: string, dealValue = 4_200_000): this {
    const id = this.newLeadId();
    const at = (day: number) => `${this.seed.month}-${String(day).padStart(2, "0")}T10:00:00Z`;
    this.leads.push({
      ...this.leadBase(id, branchId, dealValue, at(3), at(20)),
      status: "delivered",
      status_history: STAGES.map((status, i) => ({ status, timestamp: at(3 + i * 3), note: null })),
    });
    this.deliveries.push({
      lead_id: id,
      order_date: `${this.seed.month}-15`,
      delivery_date: `${this.seed.month}-20`,
      days_to_deliver: 5,
      delay_reason: null,
    });
    return this;
  }

  /** A lead still in the pipeline at "negotiation". */
  withOpenLead(branchId: string, dealValue = 3_100_000): this {
    const id = this.newLeadId();
    const at = (day: number) => `${this.seed.month}-${String(day).padStart(2, "0")}T10:00:00Z`;
    this.leads.push({
      ...this.leadBase(id, branchId, dealValue, at(5), at(12)),
      status: "negotiation",
      status_history: ["new", "contacted", "test_drive", "negotiation"].map((status, i) => ({
        status,
        timestamp: at(5 + i * 2),
        note: null,
      })),
    });
    return this;
  }

  /** Same deal for every branch the dataset has an officer in. */
  forEveryBranch(apply: (b: this, branchId: string) => this): this {
    for (const branchId of this.seed.repByBranch.keys()) apply(this, branchId);
    return this;
  }

  buildUnchecked(): { leads: Lead[]; deliveries: Delivery[]; targets: Target[] } {
    return {
      leads: structuredClone(this.leads),
      deliveries: structuredClone(this.deliveries),
      targets: structuredClone(this.targets),
    };
  }

  build(): ReturnType<ContinuationBuilder["buildUnchecked"]> {
    const payload = this.buildUnchecked();
    PartialDatasetSchema.parse(payload);
    return payload;
  }

  private newLeadId(): string {
    return `L${String(this.nextLead++).padStart(4, "0")}`;
  }

  private leadBase(id: string, branchId: string, dealValue: number, created: string, last: string) {
    const rep = this.seed.repByBranch.get(branchId);
    if (!rep) throw new Error(`No sales officer in branch ${branchId}`);
    return {
      id,
      customer_name: `E2E Buyer ${id}`,
      phone: "+91 90000 00000",
      source: "walk_in",
      model_interested: "Fortuner",
      assigned_to: rep,
      branch_id: branchId,
      created_at: created,
      last_activity_at: last,
      expected_close_date: null,
      deal_value: dealValue,
      lost_reason: null,
    };
  }
}
