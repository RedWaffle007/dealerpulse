import { DatasetSchema, type Dataset } from "./types";

/**
 * An uploaded continuation has the same shape as the full dataset, but every
 * section is optional (you might send only new leads + deliveries + targets).
 */
export const PartialDatasetSchema = DatasetSchema.partial();
export type PartialDataset = Partial<Dataset>;

export type SectionDiff = { added: number; updated: number };
export type MergeSummary = {
  branches: SectionDiff;
  sales_reps: SectionDiff;
  leads: SectionDiff;
  targets: SectionDiff;
  deliveries: SectionDiff;
  newMonths: string[];
};

function upsert<T>(baseArr: T[], incoming: T[] | undefined, key: (t: T) => string) {
  const map = new Map(baseArr.map((x) => [key(x), x]));
  let added = 0;
  let updated = 0;
  for (const x of incoming ?? []) {
    if (map.has(key(x))) updated++;
    else added++;
    map.set(key(x), x); // upsert: an updated record (e.g. a lead that advanced) replaces
  }
  return { arr: [...map.values()], added, updated };
}

/**
 * Merge a continuation into a base dataset by upserting each section on its
 * natural key. Pure and deterministic, so it can run on the server, in the
 * browser preview, and in tests alike.
 */
export function mergeDatasets(
  base: Dataset,
  incoming: PartialDataset,
): { merged: Dataset; summary: MergeSummary } {
  const b = upsert(base.branches, incoming.branches, (x) => x.id);
  const r = upsert(base.sales_reps, incoming.sales_reps, (x) => x.id);
  const l = upsert(base.leads, incoming.leads, (x) => x.id);
  const t = upsert(base.targets, incoming.targets, (x) => `${x.branch_id}:${x.month}`);
  const dv = upsert(base.deliveries, incoming.deliveries, (x) => x.lead_id);

  const baseMonths = new Set(base.targets.map((x) => x.month));
  const newMonths = [
    ...new Set((incoming.targets ?? []).map((x) => x.month).filter((m) => !baseMonths.has(m))),
  ].sort();

  const merged: Dataset = {
    metadata: { ...base.metadata, ...(incoming.metadata ?? {}) },
    branches: b.arr,
    sales_reps: r.arr,
    leads: l.arr,
    targets: t.arr,
    deliveries: dv.arr,
  };

  return {
    merged,
    summary: {
      branches: { added: b.added, updated: b.updated },
      sales_reps: { added: r.added, updated: r.updated },
      leads: { added: l.added, updated: l.updated },
      targets: { added: t.added, updated: t.updated },
      deliveries: { added: dv.added, updated: dv.updated },
      newMonths,
    },
  };
}
