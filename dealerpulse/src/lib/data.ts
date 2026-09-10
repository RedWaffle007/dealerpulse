import "server-only";
import raw from "@/data/dealership_data.json";
import { DatasetSchema, type Dataset } from "./types";
import { buildIndexes, type Indexes } from "./indexes";

/**
 * Parse + validate the dataset exactly once (module scope). Runs on the server
 * at build/request time, so the 622 KB JSON never ships to the client bundle.
 * Zod guarantees the shape the metrics layer relies on.
 */
let cachedData: Dataset | null = null;

export function getDataset(): Dataset {
  if (cachedData) return cachedData;
  const parsed = DatasetSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      "dealership_data.json failed validation: " +
        JSON.stringify(parsed.error.issues.slice(0, 3), null, 2),
    );
  }
  cachedData = parsed.data;
  return cachedData;
}

let cachedIdx: Indexes | null = null;

export function getIndexes(): Indexes {
  if (cachedIdx) return cachedIdx;
  cachedIdx = buildIndexes(getDataset());
  return cachedIdx;
}

export type { Indexes } from "./indexes";
