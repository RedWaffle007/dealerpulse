import Link from "next/link";
import { notFound } from "next/navigation";
import { getDataset, getIndexes } from "@/lib/data";
import {
  kpis,
  funnel,
  actionItems,
  openPipeline,
  pipelineByStage,
} from "@/lib/metrics";
import { parseFilter } from "@/lib/filter";
import {
  formatCrore,
  formatDaysAgo,
  formatINR,
  formatInt,
  formatMonth,
  formatPct,
  stageLabel,
} from "@/lib/format";
import type { Filter } from "@/lib/types";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHero } from "@/components/layout/page-hero";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { ActionList } from "@/components/dashboard/action-list";
import {
  SortableTable,
  type SortColumn,
  type SortRow,
} from "@/components/dashboard/sortable-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { STAGE_INDEX } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const OPEN_LEAD_COLUMNS: SortColumn[] = [
  { key: "customer", label: "Customer", type: "text" },
  { key: "stage", label: "Stage", type: "text" },
  { key: "source", label: "Source", type: "text" },
  { key: "idle", label: "Idle", type: "number", align: "right" },
  { key: "value", label: "Value", type: "number", align: "right" },
];

export default async function RepPage(props: PageProps<"/reps/[repId]">) {
  const { repId } = await props.params;
  const d = await getDataset();
  const idx = await getIndexes();
  const rep = idx.repById.get(repId);
  if (!rep) notFound();
  const branch = idx.branchById.get(rep.branch_id);

  const sp = await props.searchParams;
  const base = parseFilter(
    {
      from: typeof sp.from === "string" ? sp.from : undefined,
      to: typeof sp.to === "string" ? sp.to : undefined,
    },
    idx.months,
  );
  const f: Filter = { months: base.months, repId };
  const qs = new URLSearchParams({ from: base.from, to: base.to }).toString();

  const k = kpis(d, idx, f);
  const steps = funnel(d, f);
  const actions = actionItems(d, idx, f);
  const pipeline = openPipeline(d, idx, f);
  const byStage = pipelineByStage(d, idx, f);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <PageHero
        title={rep.name}
        period={`${formatMonth(base.from)} – ${formatMonth(base.to)}`}
        backHref={`/branches/${rep.branch_id}?${qs}`}
        backLabel={branch?.name}
        actions={
          <>
            {rep.role === "branch_manager" && (
              <Badge variant="secondary">Manager</Badge>
            )}
            {k.leadsCreated < 5 && (
              <Badge variant="outline">Low sample ({k.leadsCreated} leads)</Badge>
            )}
          </>
        }
        lead={
          <>
            <span className="text-brand">{formatInt(k.leadsCreated)}</span>{" "}
            leads · {formatInt(k.convertedLeads)} delivered (
            {formatPct(k.conversionPct, 0)}) · {formatCrore(k.revenue)} revenue.
          </>
        }
      >
        {branch?.name}
      </PageHero>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        <KpiCard label="Leads" value={formatInt(k.leadsCreated)} />
        <KpiCard
          label="Delivered"
          value={formatInt(k.convertedLeads)}
          sub={`${formatPct(k.conversionPct)} conv.`}
        />
        <KpiCard label="Revenue" value={formatCrore(k.revenue)} />
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
        <Card>
          <CardHeader>
            <CardTitle>Conversion funnel</CardTitle>
            <CardDescription>This rep&apos;s leads</CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelChart steps={steps} showHeadline={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open pipeline by stage</CardTitle>
            <CardDescription>Current snapshot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {byStage.length === 0 && (
              <p className="text-muted-foreground">No open leads.</p>
            )}
            {byStage.map((s) => (
              <div key={s.stage} className="flex justify-between">
                <span>{stageLabel(s.stage)}</span>
                <span className="text-muted-foreground tabular-nums">
                  {s.count} · {formatCrore(s.value)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>{actions.length} flagged</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[22rem] overflow-y-auto pr-1">
              <ActionList items={actions} showBranch={false} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Open leads</CardTitle>
          <CardDescription>
            {rep.name}&apos;s active deals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SortableTable
            columns={OPEN_LEAD_COLUMNS}
            initialSort="value"
            initialDir="desc"
            emptyMessage="No open leads for this rep."
            rows={pipeline.map((l): SortRow => ({
              id: l.leadId,
              sort: {
                customer: l.customer,
                stage: STAGE_INDEX[l.stage] ?? 0,
                source: l.source,
                idle: l.daysStale,
                value: l.value,
              },
              cells: {
                customer: (
                  <Link
                    href={`/leads/${l.leadId}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {l.customer}
                  </Link>
                ),
                stage: stageLabel(l.stage),
                source: (
                  <span className="capitalize">{l.source.replace("_", " ")}</span>
                ),
                idle: (
                  <span className={l.daysStale >= 7 ? "text-amber-600" : ""}>
                    {formatDaysAgo(l.daysStale)}
                  </span>
                ),
                value: formatINR(l.value),
              },
            }))}
          />
        </CardContent>
      </Card>
    </main>
  );
}
