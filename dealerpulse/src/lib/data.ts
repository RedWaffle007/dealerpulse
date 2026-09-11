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
 *
 * It is held on `globalThis` on purpose: Next.js can load route handlers and
 * page components in separate module instances, so a plain module-level `let`
 * would not be shared between the /api/dataset writer and the page readers.
 */
type OverlayStore = { overlay: Dataset | null; idx: Indexes | null };
const globalForOverlay = globalThis as unknown as {
  __dealerpulseOverlay?: OverlayStore;
};
const store: OverlayStore = (globalForOverlay.__dealerpulseOverlay ??= {
  overlay: null,
  idx: null,
});

export function getDataset(): Dataset {
  return store.overlay ?? getBase();
}

/** The pristine bundled dataset, ignoring any merge overlay. */
export function getBaseDataset(): Dataset {
  return getBase();
}

export function getIndexes(): Indexes {
  if (!store.idx) store.idx = buildIndexes(getDataset());
  return store.idx;
}

/** True when an uploaded continuation has been merged into the live dataset. */
export function isMerged(): boolean {
  return store.overlay !== null;
}

/** Replace the live dataset with a merged result and drop the index cache. */
export function setMergedDataset(ds: Dataset): void {
  store.overlay = ds;
  store.idx = null;
}

/** Discard any merge and return to the pristine bundled dataset. */
export function resetDataset(): void {
  store.overlay = null;
  store.idx = null;
}

export type { Indexes } from "./indexes";
