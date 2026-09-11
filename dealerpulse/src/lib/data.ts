import "server-only";
import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { del, get, list, put } from "@vercel/blob";
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
// The store is private, so the blob is written and read only server-side with
// the token (never a public URL). A fixed pathname is safe because reads use
// `get(..., { useCache: false })`, which bypasses the CDN and returns the latest
// content from origin — so a merge/reset is visible immediately, with no stale
// edge cache.
const BLOB_PATH = "dealerpulse-overlay.json";
const BLOB_ACCESS = "private" as const;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
const OVERLAY_TAG = "dp-overlay";

type OverlayStore = { overlay: Dataset | null };
const globalForOverlay = globalThis as unknown as {
  __dealerpulseOverlay?: OverlayStore;
};
const memStore: OverlayStore = (globalForOverlay.__dealerpulseOverlay ??= {
  overlay: null,
});

/**
 * Fetch + parse the overlay blob from origin. Wrapped in the Next data cache so
 * navigation doesn't re-read storage on every request (that was the ~seconds of
 * latency on the hosted site). A merge/reset busts it immediately via
 * `revalidateTag(OVERLAY_TAG)`; the 30s `revalidate` bounds staleness if a bust
 * is ever missed (e.g. a write on a cold instance).
 */
const loadOverlayFromBlob = unstable_cache(
  async (): Promise<Dataset | null> => {
    if (!blobToken) return null;
    try {
      const result = await get(BLOB_PATH, {
        access: BLOB_ACCESS,
        token: blobToken,
        useCache: false, // read the latest from origin; the Next cache layers on top
      });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      const json = await new Response(result.stream).json();
      const parsed = DatasetSchema.safeParse(json);
      return parsed.success ? parsed.data : null;
    } catch {
      // Never let a storage hiccup take down the dashboard — fall back to base.
      return null;
    }
  },
  ["dp-overlay-blob"],
  { tags: [OVERLAY_TAG], revalidate: 30 },
);

/** Read the current overlay from the active backend, or null if none. */
const getOverlay = cache(async (): Promise<Dataset | null> => {
  if (!blobToken) return memStore.overlay;
  return loadOverlayFromBlob();
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
  await put(BLOB_PATH, JSON.stringify(ds), {
    access: BLOB_ACCESS,
    token: blobToken,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  revalidateTag(OVERLAY_TAG, { expire: 0 }); // drop the cached overlay so the merge shows at once
}

/** Discard any merge and return to the pristine bundled dataset. */
export async function resetDataset(): Promise<void> {
  if (!blobToken) {
    memStore.overlay = null;
    return;
  }
  try {
    const { blobs } = await list({ prefix: BLOB_PATH, token: blobToken });
    if (blobs.length) await del(blobs.map((b) => b.url), { token: blobToken });
  } catch {
    // A missing blob is already "reset" — nothing to do.
  }
  revalidateTag(OVERLAY_TAG, { expire: 0 }); // drop the cached overlay so reset shows at once
}

export type { Indexes } from "./indexes";
