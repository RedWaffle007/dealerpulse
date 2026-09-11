import { getDataset, getIndexes } from "@/lib/data";
import { repLeaderboard } from "@/lib/metrics";
import { parseFilter } from "@/lib/filter";
import { formatMonth } from "@/lib/format";
import type { Filter } from "@/lib/types";
import { PageHero } from "@/components/layout/page-hero";
import { RepTable } from "@/components/dashboard/rep-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Company-wide sales-officer leaderboard — every rep across all branches, one screen. */
export default async function RepsIndexPage(props: PageProps<"/reps">) {
  const d = await getDataset();
  const idx = await getIndexes();
  const sp = await props.searchParams;
  const base = parseFilter(
    {
      from: typeof sp.from === "string" ? sp.from : undefined,
      to: typeof sp.to === "string" ? sp.to : undefined,
      branch: typeof sp.branch === "string" ? sp.branch : undefined,
    },
    idx.months,
  );
  const f: Filter = { months: base.months, branchId: base.branchId };
  const qs = new URLSearchParams({ from: base.from, to: base.to }).toString();

  const reps = repLeaderboard(d, idx, f);
  const topRep = reps[0];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <PageHero
        title="Sales team"
        period={`${formatMonth(base.from)} – ${formatMonth(base.to)}`}
        lead={
          topRep ? (
            <>
              {reps.length} officers carried pipeline this period.{" "}
              <span className="text-brand">{topRep.name}</span> tops the board at{" "}
              {topRep.conversionPct.toFixed(0)}% conversion.
            </>
          ) : undefined
        }
      >
        {base.branchId
          ? idx.branchById.get(base.branchId)?.name
          : "All branches"}{" "}
        · sort by any column to re-rank
      </PageHero>

      <Card>
        <CardHeader>
          <CardTitle>Rep leaderboard</CardTitle>
          <CardDescription>
            Every officer with leads in range. Click a column heading to re-rank;
            the medal tiers follow the top rows. Reps under 5 leads are flagged —
            too small a sample to rank reliably.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RankLegend />
          <RepTable rows={reps} qs={qs} showBranch ranked />
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        Branch managers don&apos;t carry individual pipeline in this dataset —
        their accountability unit is the branch, so a manager&apos;s scorecard is
        their branch page.
      </p>
    </main>
  );
}

/** Legend for the top-3 / top-5 / top-10 medal tiers used in ranked tables. */
function RankLegend() {
  const tiers = [
    { dot: "bg-amber-400", label: "Top 3" },
    { dot: "bg-zinc-400", label: "Top 5" },
    { dot: "bg-orange-600", label: "Top 10" },
  ];
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {tiers.map((t) => (
        <span key={t.label} className="inline-flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${t.dot}`} aria-hidden />
          {t.label}
        </span>
      ))}
    </div>
  );
}
