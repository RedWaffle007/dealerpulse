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
import { FunnelBars } from "@/components/dashboard/funnel-bars";
import { ActionList } from "@/components/dashboard/action-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

export default async function RepPage(props: PageProps<"/reps/[repId]">) {
  const { repId } = await props.params;
  const d = getDataset();
  const idx = getIndexes();
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
            <FunnelBars steps={steps} />
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
            Every active lead assigned to {rep.name}, most advanced first
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pipeline.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No open leads for this rep.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Idle</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipeline.map((l) => (
                  <TableRow key={l.leadId}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/leads/${l.leadId}`}
                        className="text-brand hover:underline"
                      >
                        {l.customer}
                      </Link>
                    </TableCell>
                    <TableCell>{stageLabel(l.stage)}</TableCell>
                    <TableCell className="capitalize">
                      {l.source.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={l.daysStale >= 7 ? "text-amber-600" : ""}>
                        {formatDaysAgo(l.daysStale)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINR(l.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
