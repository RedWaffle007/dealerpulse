"use client";

import Link from "next/link";
import { useState } from "react";
import type { RepRow } from "@/lib/metrics";
import { formatCrore, formatPct } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  SortableTable,
  type SortColumn,
  type SortRow,
} from "@/components/dashboard/sortable-table";

/**
 * Rep leaderboard on the shared sortable table. `ranked` adds serial numbers and
 * the top-3/5/10 medal tiers (tracking the current sort). A <5-lead sample is
 * still flagged as an unreliable ranking.
 */
export function RepTable({
  rows,
  qs,
  showBranch = false,
  ranked = false,
}: {
  rows: RepRow[];
  qs?: string;
  showBranch?: boolean;
  ranked?: boolean;
}) {
  const [topId, setTopId] = useState<string | undefined>(rows[0]?.repId);
  const topRep = rows.find((r) => r.repId === topId) ?? rows[0];
  const columns: SortColumn[] = [
    { key: "name", label: "Rep", type: "text" },
    ...(showBranch
      ? [{ key: "branch", label: "Branch", type: "text" as const }]
      : []),
    { key: "leads", label: "Leads", type: "number", align: "right" },
    { key: "delivered", label: "Delivered", type: "number", align: "right" },
    { key: "conversionPct", label: "Conv.", type: "number", align: "right" },
    { key: "revenue", label: "Revenue", type: "number", align: "right" },
  ];

  const tableRows: SortRow[] = rows.map((r) => ({
    id: r.repId,
    sort: {
      name: r.name,
      branch: r.branchName,
      leads: r.leads,
      delivered: r.delivered,
      conversionPct: r.conversionPct,
      revenue: r.revenue,
    },
    cells: {
      name: (
        <>
          <Link
            href={`/reps/${r.repId}${qs ? `?${qs}` : ""}`}
            className="font-medium text-brand hover:underline"
          >
            {r.name}
          </Link>{" "}
          {r.role === "branch_manager" && (
            <Badge variant="secondary" className="ml-1 text-[10px]">
              Manager
            </Badge>
          )}
          {r.belowSample && (
            <Badge variant="outline" className="ml-1 text-[10px]">
              low sample
            </Badge>
          )}
        </>
      ),
      branch: <span className="text-muted-foreground">{r.branchName}</span>,
      leads: r.leads,
      delivered: r.delivered,
      conversionPct: formatPct(r.conversionPct, 0),
      revenue: formatCrore(r.revenue),
    },
  }));

  return (
    <>
      {topRep && (
        <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
          Current leader: <span className="font-medium text-foreground">{topRep.name}</span>{" "}
          at {formatPct(topRep.conversionPct, 0)} conversion.
        </p>
      )}
      <SortableTable
        columns={columns}
        rows={tableRows}
      initialSort="conversionPct"
      initialDir="desc"
      serial={ranked}
      rankTiers={ranked}
      emptyMessage="No reps with pipeline in this view."
        csvFilename="dealerpulse-sales-team"
        onSortChange={(_, __, id) => setTopId(id)}
      />
    </>
  );
}
