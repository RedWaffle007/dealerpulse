import type { Filter } from "./types";

/** Raw search params a page receives (all optional strings). */
export type SearchParams = {
  from?: string;
  to?: string;
  branch?: string;
};

/**
 * Turn URL search params into a typed Filter, clamped to the months that
 * actually exist in the dataset. Missing/invalid params fall back to full range
 * / all branches.
 */
export function parseFilter(
  sp: SearchParams,
  allMonths: string[],
): Filter & { from: string; to: string } {
  const first = allMonths[0];
  const last = allMonths[allMonths.length - 1];
  const from = sp.from && allMonths.includes(sp.from) ? sp.from : first;
  const to = sp.to && allMonths.includes(sp.to) ? sp.to : last;
  const lo = from <= to ? from : to;
  const hi = from <= to ? to : from;
  const months = allMonths.filter((m) => m >= lo && m <= hi);
  const branchId = sp.branch && sp.branch !== "all" ? sp.branch : undefined;
  return { months, branchId, from: lo, to: hi };
}

/** Human label for a from–to month range. */
export function rangeLabel(from: string, to: string): string {
  return from === to ? from : `${from} → ${to}`;
}
