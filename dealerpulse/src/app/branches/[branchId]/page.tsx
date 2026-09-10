import Link from "next/link";
import { notFound } from "next/navigation";
import { getDataset, getIndexes } from "@/lib/data";
import {
  kpis,
  monthlyAttainment,
  funnel,
  lossAnalysis,
  sourceQuality,
  repLeaderboard,
  actionItems,
  velocity,
  deliverySLA,
} from "@/lib/metrics";
import { parseFilter } from "@/lib/filter";
import {
  formatCrore,
  formatInt,
  formatMonth,
  formatPct,
} from "@/lib/format";
import type { Filter } from "@/lib/types";
import { KpiCard, type KpiTone } from "@/components/dashboard/kpi-card";
import { AttainmentChart } from "@/components/charts/attainment-chart";
import { FunnelBars } from "@/components/dashboard/funnel-bars";
import { ActionList } from "@/components/dashboard/action-list";
import { RepTable } from "@/components/dashboard/rep-table";
import { LossByStage, SourceTable } from "@/components/dashboard/insight-tables";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function tone(pct: number): KpiTone {
  if (pct >= 90) return "good";
  if (pct >= 50) return "warn";
  return "bad";
}

export default async function BranchPage(
  props: PageProps<"/branches/[branchId]">,
) {
  const { branchId } = await props.params;
  const d = getDataset();
  const idx = getIndexes();
  const branch = idx.branchById.get(branchId);
  if (!branch) notFound();

  const sp = await props.searchParams;
  const base = parseFilter(
    {
      from: typeof sp.from === "string" ? sp.from : undefined,
      to: typeof sp.to === "string" ? sp.to : undefined,
    },
    idx.months,
  );
  const f: Filter = { months: base.months, branchId };
  const qs = new URLSearchParams({ from: base.from, to: base.to }).toString();

  const k = kpis(d, idx, f);
  const months = monthlyAttainment(d, idx, f);
  const steps = funnel(d, f);
  const loss = lossAnalysis(d, f);
  const sources = sourceQuality(d, f);
  const reps = repLeaderboard(d, idx, f);
  const actions = actionItems(d, idx, f);
  const v = velocity(d, f);
  const sla = deliverySLA(d, idx, f);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <div className="mb-4 text-sm">
        <Link href={`/?${qs}`} className="text-muted-foreground hover:text-foreground">
          ← Overview
        </Link>
      </div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{branch.name}</h1>
        <p className="text-muted-foreground text-sm">
          {branch.city} · {formatMonth(base.from)} – {formatMonth(base.to)}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Units delivered"
          value={formatInt(k.unitsDelivered)}
          sub={`of ${formatInt(k.targetUnits)} target`}
          tone={tone(k.unitAttainmentPct)}
        />
        <KpiCard
          label="Attainment"
          value={formatPct(k.unitAttainmentPct)}
          tone={tone(k.unitAttainmentPct)}
        />
        <KpiCard label="Revenue" value={formatCrore(k.revenue)} />
        <KpiCard
          label="Conversion"
          value={formatPct(k.conversionPct)}
          sub={`${k.convertedLeads}/${k.leadsCreated}`}
        />
        <KpiCard
          label="Open pipeline"
          value={formatCrore(k.openPipelineValue)}
          sub={`${k.openPipelineCount} leads`}
        />
        <KpiCard
          label="Cold leads"
          value={formatInt(k.coldCount)}
          tone={k.coldCount ? "warn" : "neutral"}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly attainment</CardTitle>
            <CardDescription>Units delivered vs target</CardDescription>
          </CardHeader>
          <CardContent>
            <AttainmentChart data={months} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>{actions.length} open leads flagged</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionList items={actions.slice(0, 6)} showBranch={false} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversion funnel</CardTitle>
            <CardDescription>Reconstructed from status history</CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelBars steps={steps} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Where deals are lost</CardTitle>
            <CardDescription>By stage, weighted by pipeline value</CardDescription>
          </CardHeader>
          <CardContent>
            <LossByStage loss={loss} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rep leaderboard</CardTitle>
            <CardDescription>Ranked by conversion (≥5 leads reliable)</CardDescription>
          </CardHeader>
          <CardContent>
            <RepTable rows={reps} qs={qs} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lead sources</CardTitle>
            <CardDescription>Value-weighted channel quality</CardDescription>
          </CardHeader>
          <CardContent>
            <SourceTable rows={sources} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline velocity</CardTitle>
            <CardDescription>
              Median sales cycle {v.cycleMedian} days (p90 {v.cycleP90})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 text-sm">
              {v.perStage.map((s) => (
                <div key={s.stage} className="flex justify-between">
                  <span className="capitalize">{s.stage.replace("_", " ")}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {s.medianDays.toFixed(1)} d median
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delivery health</CardTitle>
            <CardDescription>
              {sla.delayed}/{sla.total} deliveries delayed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2 text-sm">
              Avg{" "}
              <span className="font-medium">{sla.avgDelayed.toFixed(1)} d</span>{" "}
              when delayed vs{" "}
              <span className="font-medium">{sla.avgOnTime.toFixed(1)} d</span>{" "}
              on time
            </div>
            <div className="space-y-1 text-sm">
              {sla.reasons.slice(0, 5).map((r) => (
                <div key={r.reason} className="flex justify-between">
                  <span>{r.reason}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {r.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
