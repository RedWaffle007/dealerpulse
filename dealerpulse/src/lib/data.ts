import "server-only";
import raw from "@/data/dealership_data.json";
import { DatasetSchema, type Dataset } from "./types";
import { buildIndexes, type Indexes } from "./indexes";

/**
 * Parse + validate the bundled dataset exactly once (module scope). Runs on the
 * server at build/request time, so the 622 KB JSON never ships to the client
 * bundle. Zod guarantees the shape the metrics layer relies on.
 */
let cachedBase: Dataset | null = null;

function getBase(): Dataset {
  if (cachedBase) return cachedBase;
  const parsed = DatasetSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      "dealership_data.json failed validation: " +
        JSON.stringify(parsed.error.issues.slice(0, 3), null, 2),
    );
  }
  cachedBase = parsed.data;
  return cachedBase;
}

/**
 * Optional in-memory overlay produced by an upload merge (see /upload and
 * /api/dataset). NOTE: this lives in server memory only — it survives while the
 * server instance is warm, resets on restart/redeploy, and is not shared across
 * serverless instances. Real persistence would back this with a store (e.g.
 * Vercel KV/Blob or a database). Documented as a deliberate take-home tradeoff.
 */
let overlay: Dataset | null = null;
let cachedIdx: Indexes | null = null;

export function getDataset(): Dataset {
  return overlay ?? getBase();
}

/** The pristine bundled dataset, ignoring any merge overlay. */
export function getBaseDataset(): Dataset {
  return getBase();
}

export function getIndexes(): Indexes {
  if (!cachedIdx) cachedIdx = buildIndexes(getDataset());
  return cachedIdx;
}

/** True when an uploaded continuation has been merged into the live dataset. */
export function isMerged(): boolean {
  return overlay !== null;
}

/** Replace the live dataset with a merged result and drop the index cache. */
export function setMergedDataset(ds: Dataset): void {
  overlay = ds;
  cachedIdx = null;
}

/** Discard any merge and return to the pristine bundled dataset. */
export function resetDataset(): void {
  overlay = null;
  cachedIdx = null;
}

export type { Indexes } from "./indexes";
