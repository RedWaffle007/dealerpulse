"use client";

import Link from "next/link";
import { useState } from "react";
import type { RepRow } from "@/lib/metrics";
import { formatCrore, formatInt, formatPct } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  SortableTable,
  sortRows,
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
  const [sortState, setSortState] = useState({ key: "conversionPct", dir: "desc" as "asc" | "desc" });
  const [topId, setTopId] = useState<string | undefined>(rows[0]?.repId);
  const topRep = rows.find((r) => r.repId === topId) ?? rows[0];
  const metric = sortState.key === "conversionPct" ? "conversion" : sortState.key === "revenue" ? "revenue" : sortState.key;
  const value = (r: RepRow) => {
    if (sortState.key === "revenue") return formatCrore(r.revenue);
    if (sortState.key === "conversionPct") return formatPct(r.conversionPct, 0);
    if (sortState.key === "leads") return formatInt(r.leads);
    if (sortState.key === "delivered") return formatInt(r.delivered);
    return "";
  };
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
  const sortedRows = sortRows(tableRows, sortState.key, sortState.dir);
  const opposite = rows.find((r) => r.repId === sortedRows.at(-1)?.id);

  return (
    <>
      {topRep && (
        <p className="mb-3 rounded-lg bg-accent-pista/10 px-3 py-2 text-sm font-semibold text-foreground" aria-live="polite">
          {metric === "conversion" || metric === "leads" || metric === "delivered" || metric === "revenue" ? (
            sortState.dir === "desc"
              ? <><span className="font-medium">{topRep.name}</span> leads on {metric} at {value(topRep)}{opposite && opposite.repId !== topRep.repId && <>; {opposite.name} is lowest at {value(opposite)}.</>}</>
              : <><span className="font-medium">{topRep.name}</span> has the lowest {metric} at {value(topRep)}{opposite && opposite.repId !== topRep.repId && <>; {opposite.name} leads at {value(opposite)}.</>}</>
          ) : null}
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
        onSortChange={(key, dir, id) => { setSortState({ key, dir }); setTopId(id); }}
      />
    </>
  );
}
