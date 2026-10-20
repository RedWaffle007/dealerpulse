import raw from "@/data/dealership_data.json";
import { parseFilter } from "@/lib/filter";
import { formatCrore, formatInt, formatMonth, formatPct } from "@/lib/format";
import { buildIndexes, type Indexes } from "@/lib/indexes";
import { actionItems, branchComparison, kpis, type BranchRow } from "@/lib/metrics";
import { DatasetSchema, type Dataset } from "@/lib/types";
import type { FilterQuery } from "../pages/base.page";

export type OverviewKpiLabel =
  | "Units delivered"
  | "Unit attainment"
  | "Revenue"
  | "Lead conversion"
  | "Open pipeline"
  | "Needs attention";

/**
 * Expected values for the UI, computed in the test process from the same
 * bundled dataset. The analytics layer has its own unit, property, and mutation
 * suites; this oracle checks the other half: that each URL state reaches the
 * right numbers on screen, formatted the way users read them.
 */
export class MetricsOracle {
  readonly dataset: Dataset;
  readonly idx: Indexes;

  constructor(dataset: Dataset = DatasetSchema.parse(raw)) {
    this.dataset = dataset;
    this.idx = buildIndexes(dataset);
  }

  get months(): string[] {
    return this.idx.months;
  }

  branchName(id: string): string {
    const b = this.idx.branchById.get(id);
    if (!b) throw new Error(`Unknown branch ${id}`);
    return b.name;
  }

  filter(query: FilterQuery) {
    return parseFilter(query, this.idx.months);
  }

  /** Displayed period label, e.g. "Jul 2025 – Sep 2025". */
  periodLabel(query: FilterQuery): string {
    const f = this.filter(query);
    return `${formatMonth(f.from)} – ${formatMonth(f.to)}`;
  }

  overviewKpis(query: FilterQuery): Record<OverviewKpiLabel, string> {
    const f = this.filter(query);
    const k = kpis(this.dataset, this.idx, f);
    return {
      "Units delivered": formatInt(k.unitsDelivered),
      "Unit attainment": formatPct(k.unitAttainmentPct),
      Revenue: formatCrore(k.revenue),
      "Lead conversion": formatPct(k.conversionPct),
      "Open pipeline": formatCrore(k.openPipelineValue),
      "Needs attention": formatInt(actionItems(this.dataset, this.idx, f).length),
    };
  }

  rawKpis(query: FilterQuery) {
    return kpis(this.dataset, this.idx, this.filter(query));
  }

  branchRows(query: FilterQuery): BranchRow[] {
    return branchComparison(this.dataset, this.idx, this.filter(query));
  }

  /** A lead with a delivery record, for drill-down checks. */
  deliveredLead() {
    const delivery = this.dataset.deliveries[0];
    const lead = this.idx.leadById.get(delivery.lead_id);
    if (!lead) throw new Error("Dataset has a delivery without a lead");
    return { lead, delivery };
  }
}
