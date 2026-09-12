"use client";

import { useState } from "react";
import { formatPct } from "@/lib/format";
import { SortableTable, type SortColumn, type SortRow } from "./sortable-table";

type BranchStoryRow = { id: string; name: string; attainmentPct: number };

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
  const [topId, setTopId] = useState<string | undefined>(rows[0]?.id);
  const top = storyRows.find((r) => r.id === topId) ?? storyRows[0];
  const bottom = storyRows.find((r) => r.id !== top?.id) ?? top;
  return (
    <>
      {top && (
        <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
          {top.name} leads at {formatPct(top.attainmentPct, 0)} attainment
          {bottom && bottom.id !== top.id && (
            <>; {bottom.name} trails at {formatPct(bottom.attainmentPct, 0)}.</>
          )}
        </p>
      )}
      <SortableTable columns={columns} rows={rows} initialSort="attainmentPct" initialDir="asc" csvFilename={csvFilename} onSortChange={(_, __, id) => setTopId(id)} />
    </>
  );
}
