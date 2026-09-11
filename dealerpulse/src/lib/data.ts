import "server-only";
import { cache } from "react";
import { del, list, put } from "@vercel/blob";
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
 * Merge-overlay persistence.
 *
 * The overlay is the result of an uploaded continuation merged onto the base
 * dataset (see /upload and /api/dataset). Two backends:
 *
 * 1. **Vercel Blob** (when `BLOB_READ_WRITE_TOKEN` is set) — the merged dataset
 *    is stored as a single JSON blob, so it is shared across every serverless
 *    instance and survives redeploys. This is what makes a merge reflect on the
 *    hosted deployment, not just a single warm process.
 * 2. **In-memory on `globalThis`** (local dev without a token) — kept as a
 *    zero-setup fallback so the flow works out of the box with `npm run dev`.
 *    It is held on `globalThis` because Next can load the route handler and the
 *    page components in separate module instances within one process.
 *
 * Reads are memoized per request with React `cache()`, so a single render that
 * touches the dataset several times hits the backend once.
 */
// Each write gets a unique suffixed pathname (dealerpulse-overlay-<id>.json), so
// every URL is immutable — the newest wins on read and the Blob CDN can never
// serve a stale merge (which a fixed pathname + edge cache would, given the SDK's
// 1-minute minimum cacheControlMaxAge).
const BLOB_PREFIX = "dealerpulse-overlay";
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

type OverlayStore = { overlay: Dataset | null };
const globalForOverlay = globalThis as unknown as {
  __dealerpulseOverlay?: OverlayStore;
};
const memStore: OverlayStore = (globalForOverlay.__dealerpulseOverlay ??= {
  overlay: null,
});

/** Read the current overlay from the active backend, or null if none. */
const getOverlay = cache(async (): Promise<Dataset | null> => {
  if (!blobToken) return memStore.overlay;
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX, token: blobToken });
    if (blobs.length === 0) return null;
    const newest = blobs.reduce((a, b) =>
      new Date(b.uploadedAt) > new Date(a.uploadedAt) ? b : a,
    );
    const res = await fetch(newest.url, { cache: "no-store" });
    if (!res.ok) return null;
    const parsed = DatasetSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    // Never let a storage hiccup take down the dashboard — fall back to base.
    return null;
  }
});

export const getDataset = cache(async (): Promise<Dataset> => {
  return (await getOverlay()) ?? getBase();
});

/** The pristine bundled dataset, ignoring any merge overlay. */
export function getBaseDataset(): Dataset {
  return getBase();
}

/**
 * Which persistence backend is live in this environment — surfaced in the UI so
 * a deployment can confirm at a glance whether the Blob token actually reached
 * the running app (a connected store with no redeploy shows "memory").
 */
export function storageBackend(): "blob" | "memory" {
  return blobToken ? "blob" : "memory";
}

export const getIndexes = cache(async (): Promise<Indexes> => {
  return buildIndexes(await getDataset());
});

/** True when an uploaded continuation has been merged into the live dataset. */
export const isMerged = cache(async (): Promise<boolean> => {
  return (await getOverlay()) !== null;
});

/** Replace the live dataset with a merged result. */
export async function setMergedDataset(ds: Dataset): Promise<void> {
  if (!blobToken) {
    memStore.overlay = ds;
    return;
  }
  const { url } = await put(`${BLOB_PREFIX}.json`, JSON.stringify(ds), {
    access: "public",
    token: blobToken,
    addRandomSuffix: true,
    contentType: "application/json",
  });
  // Best-effort cleanup of superseded versions so the store doesn't accumulate.
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX, token: blobToken });
    const stale = blobs.filter((b) => b.url !== url).map((b) => b.url);
    if (stale.length) await del(stale, { token: blobToken });
  } catch {
    // Cleanup is non-critical; the newest blob still wins on read.
  }
}

/** Discard any merge and return to the pristine bundled dataset. */
export async function resetDataset(): Promise<void> {
  if (!blobToken) {
    memStore.overlay = null;
    return;
  }
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX, token: blobToken });
    if (blobs.length) await del(blobs.map((b) => b.url), { token: blobToken });
  } catch {
    // A missing blob is already "reset" — nothing to do.
  }
}

export type { Indexes } from "./indexes";
