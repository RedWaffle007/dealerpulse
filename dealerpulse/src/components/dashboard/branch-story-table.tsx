"use client";

import { useState } from "react";
import { formatCrore, formatInt, formatPct } from "@/lib/format";
import { SortableTable, sortRows, type SortColumn, type SortRow } from "./sortable-table";

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
  const display = (r: BranchStoryRow) => {
    if (sortState.key === "revenue") return formatCrore(r.revenue);
    if (sortState.key === "conversionPct") return formatPct(r.conversionPct, 0);
    if (sortState.key === "attainmentPct") return formatPct(r.attainmentPct, 0);
    if (sortState.key === "leads") return formatInt(r.leads);
    if (sortState.key === "delivered") return formatInt(r.delivered);
    return "";
  };
  const ordered = metric ? sortRows(rows, sortState.key, sortState.dir) : [];
  const bottom = storyRows.find((r) => r.id === ordered.at(-1)?.id);
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
