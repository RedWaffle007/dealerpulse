import Link from "next/link";
import { getDataset, getIndexes } from "@/lib/data";
import {
  actionItems,
  branchesBehindTarget,
  deliverySLA,
  type ActionType,
} from "@/lib/metrics";
import { parseFilter } from "@/lib/filter";
import { formatCrore, formatInt, formatMonth, formatPct } from "@/lib/format";
import type { Filter } from "@/lib/types";
import { ActionList } from "@/components/dashboard/action-list";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHero } from "@/components/layout/page-hero";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const RULES: {
  type: ActionType;
  title: string;
  blurb: string;
  accent: string;
}[] = [
  {
    type: "stale_order",
    title: "Order placed, going stale",
    blurb: "Committed buyers with no activity for 7+ days — highest urgency.",
    accent: "border-t-red-500",
  },
  {
    type: "overdue",
    title: "Past expected close",
    blurb: "Expected-close date has passed but the lead is still open.",
    accent: "border-t-amber-500",
  },
  {
    type: "high_value_late",
    title: "Late-stage idle",
    blurb: "Negotiation-or-deeper leads with no movement for 7+ days.",
    accent: "border-t-orange-500",
  },
  {
    type: "cold",
    title: "Cold leads",
    blurb: "Early-stage leads with no activity for 7+ days.",
    accent: "border-t-brand",
  },
];

export default async function ActionsPage(props: PageProps<"/actions">) {
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

  const items = actionItems(d, idx, f);
  const totalValue = items.reduce((s, a) => s + a.value, 0);
  const byType = (t: ActionType) => items.filter((a) => a.type === t);
  const behind = branchesBehindTarget(d, idx, f);
  const sla = deliverySLA(d, idx, f);
  const qs = new URLSearchParams({ from: base.from, to: base.to }).toString();

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <PageHero
        title="Action Center"
        period={`${formatMonth(base.from)} – ${formatMonth(base.to)}`}
      >
        Deterministic, explainable alerts ·{" "}
        {base.branchId
          ? idx.branchById.get(base.branchId)?.name
          : "all branches"}{" "}
        · <span className="font-medium text-foreground">as of 31 Dec 2025</span>
      </PageHero>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Flagged leads"
          value={formatInt(items.length)}
          sub={`${formatCrore(totalValue)} at risk`}
          tone={items.length ? "warn" : "good"}
        />
        {RULES.map((r) => {
          const list = byType(r.type);
          return (
            <KpiCard
              key={r.type}
              label={r.title}
              value={formatInt(list.length)}
              sub={formatCrore(list.reduce((s, a) => s + a.value, 0))}
            />
          );
        })}
      </section>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card className="border-t-2 border-t-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Branches behind the group</span>
              <span className="text-muted-foreground text-sm font-normal tabular-nums">
                {behind.length}
              </span>
            </CardTitle>
            <CardDescription>
              Below group attainment for this period, by unit shortfall
            </CardDescription>
          </CardHeader>
          <CardContent>
            {behind.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No branch is below the group average. 🎉
              </p>
            ) : (
              <ul className="space-y-2">
                {behind.map((b) => (
                  <li
                    key={b.branchId}
                    className="flex items-center justify-between rounded-md border border-l-2 border-border/60 border-l-amber-500/60 p-2.5 text-sm"
                  >
                    <Link
                      href={`/branches/${b.branchId}?${qs}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {b.name}
                    </Link>
                    <span className="tabular-nums text-muted-foreground">
                      {formatPct(b.attainmentPct, 0)} attained ·{" "}
                      <span className="font-medium text-foreground">
                        {formatInt(b.unitGap)} units short
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-t-2 border-t-orange-500">
          <CardHeader>
            <CardTitle>Delivery delays</CardTitle>
            <CardDescription>
              Fulfilment slipping against the order-to-delivery clock
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Delayed deliveries</span>
              <span className="tabular-nums font-medium">
                {formatInt(sla.delayed)} / {formatInt(sla.total)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">
                Avg days to deliver (delayed vs on-time)
              </span>
              <span className="tabular-nums font-medium">
                {sla.avgDelayed.toFixed(1)} vs {sla.avgOnTime.toFixed(1)}
              </span>
            </div>
            {sla.reasons.length > 0 && (
              <div>
                <div className="text-muted-foreground mb-1">Top delay reasons</div>
                <ul className="space-y-1">
                  {sla.reasons.slice(0, 4).map((r) => (
                    <li
                      key={r.reason}
                      className="flex items-baseline justify-between"
                    >
                      <span>{r.reason}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {r.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {RULES.map((r) => {
          const list = byType(r.type);
          return (
            <Card key={r.type} className={cn("border-t-2", r.accent)}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{r.title}</span>
                  <span className="text-muted-foreground text-sm font-normal tabular-nums">
                    {list.length}
                  </span>
                </CardTitle>
                <CardDescription>{r.blurb}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[30rem] overflow-y-auto pr-1">
                  <ActionList items={list} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-muted-foreground mt-6 text-xs">
        Ranking score = deal value × stage depth × days idle. Staleness measured
        from the dataset cutoff ({formatMonth(base.to)} data). Filter by branch
        or time range using the controls above.
      </p>
    </main>
  );
}
