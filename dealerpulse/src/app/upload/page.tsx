import { getDataset, getIndexes, isMerged } from "@/lib/data";
import { formatInt, formatMonth } from "@/lib/format";
import { PageHero } from "@/components/layout/page-hero";
import { UploadClient, type UploadSeed } from "@/components/upload/upload-client";

// Reads the in-memory merge overlay, so it must render fresh on every request.
export const dynamic = "force-dynamic";

export default function UploadPage() {
  const d = getDataset();
  const idx = getIndexes();
  const merged = isMerged();

  const months = idx.months;
  const lastMonth = months[months.length - 1]; // e.g. "2025-12"
  const [y, m] = lastMonth.split("-").map(Number);
  const nextMonth =
    m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;

  // Next free lead id (ids look like "L0001").
  const maxLeadNum = d.leads.reduce((mx, l) => {
    const n = Number(l.id.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(mx, n) : mx;
  }, 0);

  // One officer per branch, so the demo continuation references real records.
  const officerByBranch: Record<string, string> = {};
  for (const r of d.sales_reps) {
    if (r.role === "sales_officer" && !officerByBranch[r.branch_id]) {
      officerByBranch[r.branch_id] = r.id;
    }
  }
  const seed: UploadSeed = {
    nextMonth,
    nextLeadNum: maxLeadNum + 1,
    branches: d.branches
      .filter((b) => officerByBranch[b.id])
      .map((b) => ({ id: b.id, repId: officerByBranch[b.id] })),
  };

  const counts = {
    leads: d.leads.length,
    deliveries: d.deliveries.length,
    targets: d.targets.length,
    range: `${formatMonth(months[0])} – ${formatMonth(lastMonth)}`,
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:py-8">
      <PageHero
        title="Data Import"
        period={merged ? "merged" : "original"}
        lead="Bring a new reporting period into the live dashboard."
      >
        Upload a validated JSON continuation (new months, leads, deliveries). It
        is merged into the dataset and reflected across every screen — and you
        can reset to the original at any time.
      </PageHero>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Leads" value={formatInt(counts.leads)} />
        <Stat label="Deliveries" value={formatInt(counts.deliveries)} />
        <Stat label="Targets" value={formatInt(counts.targets)} />
        <Stat label="Coverage" value={counts.range} />
      </section>

      <UploadClient seed={seed} merged={merged} />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
