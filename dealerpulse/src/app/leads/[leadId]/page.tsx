import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getIndexes } from "@/lib/data";
import { daysStale, stageBeforeLost } from "@/lib/metrics";
import {
  formatDate,
  formatDaysAgo,
  formatINR,
  stageLabel,
} from "@/lib/format";
import { PageHero } from "@/components/layout/page-hero";
import { LeadTimeline } from "@/components/dashboard/lead-timeline";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STATUS_VARIANT: Record<string, "secondary" | "destructive" | "outline"> = {
  delivered: "secondary",
  lost: "destructive",
};

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default async function LeadPage(props: PageProps<"/leads/[leadId]">) {
  const { leadId } = await props.params;
  const idx = await getIndexes();
  const lead = idx.leadById.get(leadId);
  if (!lead) notFound();

  const sp = await props.searchParams;
  const qs = new URLSearchParams(
    typeof sp.from === "string" && typeof sp.to === "string"
      ? { from: sp.from, to: sp.to }
      : {},
  ).toString();

  const rep = idx.repById.get(lead.assigned_to);
  const branch = idx.branchById.get(lead.branch_id);
  const delivery = idx.deliveryByLead.get(lead.id);
  const open = lead.status !== "delivered" && lead.status !== "lost";
  const backHref = rep
    ? `/reps/${rep.id}${qs ? `?${qs}` : ""}`
    : `/branches/${lead.branch_id}${qs ? `?${qs}` : ""}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <PageHero
        title={lead.customer_name}
        backHref={backHref}
        backLabel={rep?.name ?? branch?.name}
        actions={
          <Badge variant={STATUS_VARIANT[lead.status] ?? "outline"}>
            {stageLabel(lead.status)}
          </Badge>
        }
      >
        {branch?.name} · {lead.model_interested} ·{" "}
        <span className="capitalize">{lead.source.replace("_", " ")}</span>
      </PageHero>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Deal value" value={formatINR(lead.deal_value)} />
        <KpiCard label="Current stage" value={stageLabel(lead.status)} />
        {open ? (
          <KpiCard
            label="Idle"
            value={formatDaysAgo(daysStale(lead, idx.cutoff))}
            tone={daysStale(lead, idx.cutoff) >= 7 ? "warn" : "neutral"}
          />
        ) : (
          <KpiCard
            label={lead.status === "delivered" ? "Delivered" : "Lost at"}
            value={
              lead.status === "delivered"
                ? "Yes"
                : stageLabel(stageBeforeLost(lead))
            }
            tone={lead.status === "lost" ? "bad" : "good"}
          />
        )}
        <KpiCard
          label="Expected close"
          value={lead.expected_close_date ? formatDate(lead.expected_close_date) : "n/a"}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Journey</CardTitle>
            <CardDescription>
              Every stage transition, reconstructed from status history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeadTimeline history={lead.status_history} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/60">
            <Row label="Owner" value={rep?.name ?? lead.assigned_to} />
            <Row label="Branch" value={branch?.name ?? lead.branch_id} />
            <Row label="Created" value={formatDate(lead.created_at)} />
            <Row label="Last activity" value={formatDate(lead.last_activity_at)} />
            <Row label="Phone" value={lead.phone} />
            {lead.status === "lost" && (
              <Row
                label="Lost reason"
                value={lead.lost_reason ?? "Unknown"}
              />
            )}
            {delivery && (
              <>
                <Row label="Order date" value={formatDate(delivery.order_date)} />
                <Row
                  label="Delivery date"
                  value={formatDate(delivery.delivery_date)}
                />
                <Row
                  label="Days to deliver"
                  value={`${delivery.days_to_deliver} d`}
                />
                {delivery.delay_reason && (
                  <Row label="Delay reason" value={delivery.delay_reason} />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
