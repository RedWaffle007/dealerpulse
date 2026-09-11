import Link from "next/link";
import { getDataset, getIndexes } from "@/lib/data";
import {
  kpis,
  monthlyAttainment,
  branchComparison,
  funnel,
  actionItems,
  pipelineByStage,
} from "@/lib/metrics";
import { parseFilter } from "@/lib/filter";
import {
  formatCrore,
  formatDate,
  formatINR,
  formatInt,
  formatMonth,
  formatPct,
  stageLabel,
} from "@/lib/format";
import { KpiCard, type KpiTone } from "@/components/dashboard/kpi-card";
import { PageHero } from "@/components/layout/page-hero";
import { HeroPreview } from "@/components/layout/hero-preview";
import { buttonVariants } from "@/components/ui/button";
import { AttainmentChart } from "@/components/charts/attainment-chart";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { Disclosure } from "@/components/ui/disclosure";
import {
  SortableTable,
  type SortColumn,
  type SortRow,
} from "@/components/dashboard/sortable-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function attainmentTone(pct: number): KpiTone {
  if (pct >= 90) return "good";
  if (pct >= 50) return "warn";
  return "bad";
}

const BRANCH_COLUMNS: SortColumn[] = [
  { key: "name", label: "Branch", type: "text" },
  { key: "leads", label: "Leads", type: "number", align: "right" },
  { key: "delivered", label: "Delivered", type: "number", align: "right" },
  { key: "conversionPct", label: "Conv.", type: "number", align: "right" },
  { key: "attainmentPct", label: "Attainment", type: "number", align: "right" },
  { key: "revenue", label: "Revenue", type: "number", align: "right" },
];

export default async function OverviewPage(props: PageProps<"/">) {
  const d = await getDataset();
  const idx = await getIndexes();
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
  const branchQs = f.branchId ? `&branch=${f.branchId}` : "";
  const actionsHref = `/actions?${qs}${branchQs}`;

  const k = kpis(d, idx, f);
  const months = monthlyAttainment(d, idx, f);
  const branches = branchComparison(d, idx, f).sort(
    (a, b) => a.attainmentPct - b.attainmentPct,
  );
  const steps = funnel(d, f);
  const actions = actionItems(d, idx, f);
  const actionsValue = actions.reduce((s, a) => s + a.value, 0);
  const pipeline = pipelineByStage(d, idx, f);
  const pipelineTop = Math.max(1, ...pipeline.map((s) => s.value));

  // Plain-language story headline, computed from the data in view.
  const withTargets = branches.filter((b) => b.targetUnits > 0);
  const worst = withTargets[0];
  const best = withTargets[withTargets.length - 1];
  const lead = (
    <>
      The group delivered{" "}
      <span className="text-brand">{formatInt(k.unitsDelivered)}</span> of{" "}
      {formatInt(k.targetUnits)} target cars ({formatPct(k.unitAttainmentPct, 0)}{" "}
      of plan).
      {best && worst && best.branchId !== worst.branchId && (
        <>
          {" "}
          {best.name} leads at {formatPct(best.attainmentPct, 0)};{" "}
          {worst.name} trails at {formatPct(worst.attainmentPct, 0)}.
        </>
      )}
    </>
  );

  const branchRows: SortRow[] = branches.map((b) => ({
    id: b.branchId,
    sort: {
      name: b.name,
      leads: b.leads,
      delivered: b.delivered,
      conversionPct: b.conversionPct,
      attainmentPct: b.attainmentPct,
      revenue: b.revenue,
    },
    cells: {
      name: (
        <>
          <Link
            href={`/branches/${b.branchId}?${qs}`}
            className="font-medium text-brand hover:underline"
          >
            {b.name}
          </Link>
          <div className="text-xs text-muted-foreground">{b.city}</div>
        </>
      ),
      leads: b.leads,
      delivered: b.delivered,
      conversionPct: formatPct(b.conversionPct, 0),
      attainmentPct: (
        <Badge variant={b.attainmentPct >= 50 ? "secondary" : "destructive"}>
          {formatPct(b.attainmentPct, 0)}
        </Badge>
      ),
      revenue: formatCrore(b.revenue),
    },
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <PageHero
        title="Executive overview"
        period={`${formatMonth(f.from)} – ${formatMonth(f.to)}`}
        lead={lead}
        cta={
          <>
            <Link href={actionsHref} className={buttonVariants({ size: "sm" })}>
              Review {actions.length} alerts →
            </Link>
            <Link
              href="/upload"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Import data
            </Link>
          </>
        }
        visual={<HeroPreview />}
      >
        {f.branchId ? idx.branchById.get(f.branchId)?.name : "All branches"} ·
        pipeline &amp; alerts{" "}
        <span className="font-medium text-foreground">
          as of {formatDate(idx.cutoff.toISOString())}
        </span>
      </PageHero>

      {/* KPI row — every card drills into the underlying data */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Units delivered"
          value={formatInt(k.unitsDelivered)}
          sub={`of ${formatInt(k.targetUnits)} target`}
          tone={attainmentTone(k.unitAttainmentPct)}
          href="#branch-performance"
          drillLabel="by branch"
        />
        <KpiCard
          label="Unit attainment"
          value={formatPct(k.unitAttainmentPct)}
          sub="delivered ÷ target"
          tone={attainmentTone(k.unitAttainmentPct)}
          href="#attainment"
          drillLabel="monthly trend"
        />
        <KpiCard
          label="Revenue"
          value={formatCrore(k.revenue)}
          sub={`${formatPct(k.revenueAttainmentPct)} of target`}
          tone={attainmentTone(k.revenueAttainmentPct)}
          href="#branch-performance"
          drillLabel="by branch"
        />
        <KpiCard
          label="Lead conversion"
          value={formatPct(k.conversionPct)}
          sub={`${formatInt(k.convertedLeads)} / ${formatInt(k.leadsCreated)} leads`}
          href="#funnel"
          drillLabel="see funnel"
        />
        <KpiCard
          label="Open pipeline"
          value={formatCrore(k.openPipelineValue)}
          sub={`${formatInt(k.openPipelineCount)} live leads`}
          href="#pipeline"
          drillLabel="by stage"
        />
        <KpiCard
          label="Needs attention"
          value={formatInt(actions.length)}
          sub={`${formatCrore(actionsValue)} at risk`}
          tone={actions.length > 0 ? "warn" : "good"}
          href={actionsHref}
          drillLabel="in Action Center"
        />
      </section>

      {/* Needs attention — collapsible so the overview stays uncluttered */}
      <div className="mt-6">
        <Disclosure
          title="Needs attention"
          description="Top open leads by urgency (value × stage × staleness)"
          meta={
            <span className="tabular-nums">
              {actions.length} flagged ·{" "}
              {formatCrore(actions.reduce((s, a) => s + a.value, 0))} at risk
            </span>
          }
        >
          {actions.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">
              Nothing needs attention in this view. 🎉
            </p>
          ) : (
            <div className="space-y-2">
              {actions.slice(0, 6).map((a) => (
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
                href={actionsHref}
                className="inline-flex pt-1 text-xs font-medium text-brand hover:underline"
              >
                View all {actions.length} in Action Center →
              </Link>
            </div>
          )}
        </Disclosure>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Attainment trend */}
        <Card id="attainment" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly attainment</CardTitle>
            <CardDescription>
              Units delivered vs target. Early months lag due to the ~37-day
              sales cycle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttainmentChart data={months} />
          </CardContent>
        </Card>

        {/* Conversion funnel */}
        <Card id="funnel">
          <CardHeader>
            <CardTitle>Conversion funnel</CardTitle>
            <CardDescription>Where leads advance and drop off</CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelChart steps={steps} />
          </CardContent>
        </Card>
      </div>

      {/* Branch performance — sortable; click any header to re-rank */}
      <Card id="branch-performance" className="mt-6">
        <CardHeader>
          <CardTitle>Branch performance</CardTitle>
          <CardDescription>
            Ranked by target attainment (worst first). Click a column to re-sort.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SortableTable
            columns={BRANCH_COLUMNS}
            rows={branchRows}
            initialSort="attainmentPct"
            initialDir="asc"
          />
        </CardContent>
      </Card>

      {/* Open pipeline by stage — where the live pipeline (KPI above) actually sits */}
      <Card id="pipeline" className="mt-6">
        <CardHeader>
          <CardTitle>Open pipeline by stage</CardTitle>
          <CardDescription>
            The {formatInt(k.openPipelineCount)} live leads worth{" "}
            {formatCrore(k.openPipelineValue)}, by current stage. (The Action Center
            works the {actions.length} of these that are stalling.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pipeline.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No open leads in this view.
            </p>
          ) : (
            <div className="space-y-2.5">
              {pipeline.map((s) => (
                <div key={s.stage}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{stageLabel(s.stage)}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatInt(s.count)} leads ·{" "}
                      <span className="font-medium text-foreground">
                        {formatCrore(s.value)}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 rounded-full bg-muted">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-brand to-brand/55"
                      style={{ width: `${(100 * s.value) / pipelineTop}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
