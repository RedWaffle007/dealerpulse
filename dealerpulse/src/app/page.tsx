import Link from "next/link";
import { getDataset, getIndexes } from "@/lib/data";
import {
  kpis,
  monthlyAttainment,
  branchComparison,
  funnel,
  actionItems,
  lossAnalysis,
} from "@/lib/metrics";
import { parseFilter } from "@/lib/filter";
import { formatMonth } from "@/lib/format";
import {
  formatCrore,
  formatINR,
  formatInt,
  formatPct,
  stageLabel,
} from "@/lib/format";
import { KpiCard, type KpiTone } from "@/components/dashboard/kpi-card";
import { PageHero } from "@/components/layout/page-hero";
import { AttainmentChart } from "@/components/charts/attainment-chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function attainmentTone(pct: number): KpiTone {
  if (pct >= 90) return "good";
  if (pct >= 50) return "warn";
  return "bad";
}

export default async function OverviewPage(props: PageProps<"/">) {
  const d = getDataset();
  const idx = getIndexes();
  const sp = await props.searchParams;
  const f = parseFilter(
    {
      from: typeof sp.from === "string" ? sp.from : undefined,
      to: typeof sp.to === "string" ? sp.to : undefined,
      branch: typeof sp.branch === "string" ? sp.branch : undefined,
    },
    idx.months,
  );

  const qs = new URLSearchParams({ from: f.from, to: f.to }).toString();
  const k = kpis(d, idx, f);
  const months = monthlyAttainment(d, idx, f);
  const branches = branchComparison(d, idx, f).sort(
    (a, b) => a.attainmentPct - b.attainmentPct,
  );
  const steps = funnel(d, f);
  const actions = actionItems(d, idx, f);
  const loss = lossAnalysis(d, f);
  const funnelTop = steps[0].reached || 1;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <PageHero
        title="Executive overview"
        period={`${formatMonth(f.from)} – ${formatMonth(f.to)}`}
      >
        {f.branchId ? idx.branchById.get(f.branchId)?.name : "All branches"} ·
        pipeline &amp; alerts{" "}
        <span className="font-medium text-foreground">as of 31 Dec 2025</span>
      </PageHero>

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Units delivered"
          value={formatInt(k.unitsDelivered)}
          sub={`of ${formatInt(k.targetUnits)} target`}
          tone={attainmentTone(k.unitAttainmentPct)}
        />
        <KpiCard
          label="Unit attainment"
          value={formatPct(k.unitAttainmentPct)}
          sub="vs target"
          tone={attainmentTone(k.unitAttainmentPct)}
        />
        <KpiCard
          label="Revenue"
          value={formatCrore(k.revenue)}
          sub={`${formatPct(k.revenueAttainmentPct)} of target`}
          tone={attainmentTone(k.revenueAttainmentPct)}
        />
        <KpiCard
          label="Lead conversion"
          value={formatPct(k.conversionPct)}
          sub={`${formatInt(k.convertedLeads)} / ${formatInt(k.leadsCreated)} leads`}
        />
        <KpiCard
          label="Open pipeline"
          value={formatCrore(k.openPipelineValue)}
          sub={`${formatInt(k.openPipelineCount)} active leads`}
        />
        <KpiCard
          label="Cold leads"
          value={formatInt(k.coldCount)}
          sub={`${formatCrore(k.coldValue)} at risk`}
          tone={k.coldCount > 0 ? "warn" : "neutral"}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Attainment trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly attainment</CardTitle>
            <CardDescription>
              Units delivered vs target. Early months lag due to the ~37-day
              sales cycle; the group is well below target all period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttainmentChart data={months} />
          </CardContent>
        </Card>

        {/* Needs attention */}
        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>
              Top open leads by urgency (value × stage × staleness)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {actions.slice(0, 5).map((a) => (
              <div
                key={a.leadId}
                className="rounded-md border border-l-2 border-border/60 border-l-brand/60 bg-brand/[0.03] p-2.5 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/leads/${a.leadId}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {a.customer}
                  </Link>
                  <span className="tabular-nums text-muted-foreground">
                    {formatINR(a.value)}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {a.branchName} · {stageLabel(a.stage)}
                </div>
                <div className="mt-1 text-xs">{a.reason}</div>
              </div>
            ))}
            <Link
              href={`/actions?${qs}${f.branchId ? `&branch=${f.branchId}` : ""}`}
              className="inline-flex pt-1 text-xs font-medium text-brand hover:underline"
            >
              View all {actions.length} in Action Center →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Branch comparison */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Branch performance</CardTitle>
            <CardDescription>Ranked by target attainment (worst first)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Conv.</TableHead>
                  <TableHead className="text-right">Attainment</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((b) => (
                  <TableRow key={b.branchId}>
                    <TableCell>
                      <Link
                        href={`/branches/${b.branchId}?${qs}`}
                        className="font-medium text-brand hover:underline"
                      >
                        {b.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{b.city}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{b.leads}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.delivered}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPct(b.conversionPct, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Badge
                        variant={b.attainmentPct >= 50 ? "secondary" : "destructive"}
                      >
                        {formatPct(b.attainmentPct, 0)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCrore(b.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion funnel</CardTitle>
            <CardDescription>
              Leaks early: {formatCrore(loss.byStage[0]?.value ?? 0)} lost at{" "}
              {stageLabel(loss.byStage[0]?.stage ?? "new")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {steps.map((s) => (
              <div key={s.stage}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{stageLabel(s.stage)}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {s.reached}
                    {s.leakPct != null && (
                      <span className="ml-2 text-red-500">
                        −{formatPct(s.leakPct, 0)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-2.5 rounded-full bg-muted">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-brand to-brand/60 transition-[width]"
                    style={{ width: `${(100 * s.reached) / funnelTop}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
