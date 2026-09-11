/** Indian-currency + number/percent formatting used across the dashboard. */

/** ₹ in crore, always 2dp — for large revenue/pipeline figures. */
export function formatCrore(n: number): string {
  return `₹${(n / 1e7).toFixed(2)} Cr`;
}

/** Compact INR: Cr for ≥1cr, L for ≥1lakh, else grouped rupees. */
export function formatINR(n: number): string {
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

/** Percentage with configurable precision. */
export function formatPct(n: number, dp = 1): string {
  return `${n.toFixed(dp)}%`;
}

/** e.g. "Jun 2025" from "2025-06". */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** e.g. "16 Jun 2025" from an ISO timestamp or date string. */
export function formatDate(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** e.g. "16 Jun 2025, 04:08" from an ISO timestamp. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

/** "3 days ago" style, given an integer day count. */
export function formatDaysAgo(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

/** Human stage label. */
export function stageLabel(stage: string): string {
  return stage
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
