import { getDataset, getIndexes } from "@/lib/data";
import { actionItems, type ActionType } from "@/lib/metrics";
import { parseFilter } from "@/lib/filter";
import { formatCrore, formatInt, formatMonth } from "@/lib/format";
import type { Filter } from "@/lib/types";
import { ActionList } from "@/components/dashboard/action-list";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const RULES: { type: ActionType; title: string; blurb: string }[] = [
  {
    type: "stale_order",
    title: "Order placed, going stale",
    blurb: "Committed buyers with no activity for 7+ days — highest urgency.",
  },
  {
    type: "overdue",
    title: "Past expected close",
    blurb: "Expected-close date has passed but the lead is still open.",
  },
  {
    type: "high_value_late",
    title: "Late-stage idle",
    blurb: "Negotiation-or-deeper leads with no movement for 7+ days.",
  },
  {
    type: "cold",
    title: "Cold leads",
    blurb: "Early-stage leads with no activity for 7+ days.",
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Action Center</h1>
        <p className="text-muted-foreground text-sm">
          Deterministic, explainable alerts ·{" "}
          {base.branchId
            ? idx.branchById.get(base.branchId)?.name
            : "all branches"}{" "}
          · as of 31 Dec 2025
        </p>
      </header>

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

      <div className="grid gap-6 md:grid-cols-2">
        {RULES.map((r) => {
          const list = byType(r.type);
          return (
            <Card key={r.type}>
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
                <ActionList items={list.slice(0, 8)} />
                {list.length > 8 && (
                  <p className="text-muted-foreground pt-2 text-xs">
                    +{list.length - 8} more
                  </p>
                )}
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
