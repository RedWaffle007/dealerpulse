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
  const d = getDataset();
  const idx = getIndexes();
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <PageHero
        title="Sales team"
        period={`${formatMonth(base.from)} – ${formatMonth(base.to)}`}
      >
        {base.branchId
          ? idx.branchById.get(base.branchId)?.name
          : "All branches"}{" "}
        · {reps.length} reps with pipeline · ranked by conversion
      </PageHero>

      <Card>
        <CardHeader>
          <CardTitle>Rep leaderboard</CardTitle>
          <CardDescription>
            Every officer with leads in range, ranked by conversion. Reps under 5
            leads are flagged — too small a sample to rank reliably.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RepTable rows={reps} qs={qs} showBranch />
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
