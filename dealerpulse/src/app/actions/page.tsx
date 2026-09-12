import Link from "next/link";
import { getDataset, getIndexes } from "@/lib/data";
import {
  actionItems,
  branchesBehindTarget,
  deliverySLA,
  type ActionType,
} from "@/lib/metrics";
import { parseFilter } from "@/lib/filter";
import { formatCrore, formatDate, formatInt, formatMonth, formatPct } from "@/lib/format";
import type { Filter } from "@/lib/types";
import { ActionList } from "@/components/dashboard/action-list";
import { KpiCard, type KpiTone } from "@/components/dashboard/kpi-card";
import { PageHero } from "@/components/layout/page-hero";
import { Disclosure } from "@/components/ui/disclosure";
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
  tone: KpiTone;
}[] = [
  {
    type: "stale_order",
    title: "Order placed, going stale",
    blurb: "Follow up on orders idle for 7+ days.",
    accent: "border-t-2 border-t-red-500",
    tone: "bad",
  },
  {
    type: "overdue",
    title: "Past expected close",
    blurb: "Reconfirm overdue close dates.",
    accent: "border-t-2 border-t-amber-500",
    tone: "warn",
  },
  {
    type: "high_value_late",
    title: "Late-stage idle",
    blurb: "Move late-stage deals idle for 7+ days.",
    accent: "border-t-2 border-t-orange-500",
    tone: "warn",
  },
  {
    type: "cold",
    title: "Cold leads",
    blurb: "Reconnect with leads idle for 7+ days.",
    accent: "border-t-2 border-t-brand",
    tone: "neutral",
  },
];

/** DOM id for a category's detail section, used by its tile to scroll + expand. */
const sectionId = (t: ActionType) => `alert-${t}`;

export default async function ActionsPage(props: PageProps<"/actions">) {
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
        lead={
          items.length > 0
            ? "Your priority follow-ups."
            : "No urgent follow-ups."
        }
      >
        {base.branchId
          ? idx.branchById.get(base.branchId)?.name
          : "all branches"}{" "}
        ·{" "}
        <span className="font-medium text-foreground">
          as of {formatDate(idx.cutoff.toISOString())}
        </span>
      </PageHero>

      {/* Total, framed as the sum of the groups below */}
      <section className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-xl bg-card px-4 py-3.5 ring-1 ring-foreground/10">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Leads needing action
          </div>
          <div
            className={
              "mt-1 font-heading text-2xl font-semibold leading-none tabular-nums " +
              (items.length
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400")
            }
          >
            {formatInt(items.length)}
            <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
              {formatCrore(totalValue)} at risk
            </span>
          </div>
        </div>
        <p className="max-w-md text-xs text-muted-foreground">
          Select a category to see who needs a call.
        </p>
      </section>

      {/* Breakdown — each tile scrolls to and opens its list below */}
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {RULES.map((r) => {
          const list = byType(r.type);
          return (
            <KpiCard
              key={r.type}
              label={r.title}
              value={formatInt(list.length)}
              sub={`${formatCrore(list.reduce((s, a) => s + a.value, 0))} at risk`}
              tone={list.length ? r.tone : "neutral"}
              href={`#${sectionId(r.type)}`}
              drillLabel="view leads"
            />
          );
        })}
      </section>

      <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Priority worklist
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {RULES.map((r) => {
          const list = byType(r.type);
          return (
            <Disclosure
              key={r.type}
              id={sectionId(r.type)}
              accent={r.accent}
              title={r.title}
              description={r.blurb}
              meta={
                <span className="tabular-nums">
                  {list.length} · {formatCrore(list.reduce((s, a) => s + a.value, 0))}
                </span>
              }
            >
              <div className="max-h-[30rem] overflow-y-auto pr-1">
                <ActionList items={list} />
              </div>
            </Disclosure>
          );
        })}
      </div>

      <h2 className="mt-8 mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Portfolio alerts
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-t-2 border-t-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Branches behind the group</span>
              <span className="text-muted-foreground text-sm font-normal tabular-nums">
                {behind.length}
              </span>
            </CardTitle>
            <CardDescription>
              Below group attainment, largest shortfall first
            </CardDescription>
          </CardHeader>
          <CardContent>
            {behind.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                All branches meet the group average.
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
              Orders taking longer to deliver
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
                Average days: delayed / on time
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

    </main>
  );
}
