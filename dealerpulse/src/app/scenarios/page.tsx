import { getDataset, getIndexes } from "@/lib/data";
import { parseFilter } from "@/lib/filter";
import { pipelineForecast, scenarioInputs } from "@/lib/insights";
import type { Filter } from "@/lib/types";
import { formatCrore, formatDate, formatInt, formatMonth, formatPct } from "@/lib/format";
import { PageHero } from "@/components/layout/page-hero";
import { ScenarioLab } from "@/components/dashboard/scenario-lab";
import { PipelineForecastPanel } from "@/components/dashboard/pipeline-forecast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ScenariosPage(props: PageProps<"/scenarios">) {
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

  const inputs = scenarioInputs(d, idx, f);
  const forecast = pipelineForecast(d, idx, f);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <PageHero
        title="What-If Lab"
        period={`${formatMonth(base.from)} – ${formatMonth(base.to)}`}
        lead={
          <>
            <span className="text-brand">{formatInt(inputs.baseUnits)}</span>{" "}
            cars delivered from {formatInt(inputs.leadsInView)} leads (
            {formatPct(inputs.baseConversionPct, 0)} conversion),{" "}
            {formatCrore(inputs.baseRevenue)} revenue.
          </>
        }
      >
        {base.branchId ? idx.branchById.get(base.branchId)?.name : "all branches"}{" "}
        ·{" "}
        <span className="font-medium text-foreground">
          as of {formatDate(idx.cutoff.toISOString())}
        </span>
      </PageHero>

      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-brand-secondary">
          Choose a lever
        </h2>
        <span className="text-xs text-muted-foreground">
          Compare one lever at a time
        </span>
      </div>

      <ScenarioLab inputs={inputs} />

      {/* Open pipeline forecast */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pipeline forecast</CardTitle>
          <CardDescription>
            Expected deliveries from open deals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PipelineForecastPanel forecast={forecast} />
        </CardContent>
      </Card>

    </main>
  );
}
