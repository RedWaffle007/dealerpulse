"use client";

import { useState } from "react";
import { formatCrore, formatInt, formatPct } from "@/lib/format";
import { SortableTable, type SortColumn, type SortRow } from "./sortable-table";

type BranchStoryRow = { id: string; name: string; leads: number; delivered: number; conversionPct: number; attainmentPct: number; revenue: number };

export function BranchStoryTable({
  columns,
  rows,
  storyRows,
  csvFilename,
}: {
  columns: SortColumn[];
  rows: SortRow[];
  storyRows: BranchStoryRow[];
  csvFilename?: string;
}) {
  const [sortState, setSortState] = useState({ key: "attainmentPct", dir: "asc" as "asc" | "desc" });
  const [topId, setTopId] = useState<string | undefined>(rows[0]?.id);
  const top = storyRows.find((r) => r.id === topId) ?? storyRows[0];
  const metric = ["leads", "delivered", "conversionPct", "attainmentPct", "revenue"].includes(sortState.key) ? sortState.key : "";
  const display = (r: BranchStoryRow) => sortState.key === "revenue" ? formatCrore(r.revenue) : sortState.key === "conversionPct" || sortState.key === "attainmentPct" ? formatPct(r[sortState.key], 0) : formatInt(r[sortState.key as "leads" | "delivered"]);
  const ordered = metric ? [...storyRows].sort((a, b) => { const av = a[sortState.key as keyof BranchStoryRow] as number; const bv = b[sortState.key as keyof BranchStoryRow] as number; return sortState.dir === "asc" ? av - bv : bv - av; }) : [];
  const bottom = ordered[ordered.length - 1];
  return (
    <>
      {top && (
        <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
          {metric && (sortState.dir === "desc" ? <><span className="font-medium text-foreground">{top.name}</span> leads on {metric === "conversionPct" ? "conversion" : metric === "attainmentPct" ? "attainment" : metric} ({display(top)})</> : <><span className="font-medium text-foreground">{top.name}</span> has the lowest {metric === "conversionPct" ? "conversion" : metric === "attainmentPct" ? "attainment" : metric} ({display(top)})</>)}
          {bottom && bottom.id !== top.id && (
            <>; {bottom.name} is the opposite extreme ({display(bottom)}).</>
          )}
        </p>
      )}
      <SortableTable columns={columns} rows={rows} initialSort="attainmentPct" initialDir="asc" csvFilename={csvFilename} onSortChange={(key, dir, id) => { setSortState({ key, dir }); setTopId(id); }} />
    </>
  );
}
