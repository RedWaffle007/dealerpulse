import type { LossAnalysis, ModelRow, SourceRow } from "@/lib/metrics";
import { formatCrore, formatINR, formatInt, formatPct, stageLabel } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SortableTable,
  type SortColumn,
  type SortRow,
} from "@/components/dashboard/sortable-table";

const SOURCE_COLUMNS: SortColumn[] = [
  { key: "source", label: "Source", type: "text" },
  { key: "leads", label: "Leads", type: "number", align: "right" },
  { key: "conversionPct", label: "Conv.", type: "number", align: "right" },
  { key: "revenuePerLead", label: "₹/lead", type: "number", align: "right" },
  { key: "revenue", label: "Revenue", type: "number", align: "right" },
];

/** Where deals die: stage-before-lost with pipeline value. */
export function LossByStage({ loss }: { loss: LossAnalysis }) {
  const max = loss.byStage[0]?.value || 1;
  return (
    <div className="space-y-2">
      {loss.byStage.map((s) => (
        <div key={s.stage}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{stageLabel(s.stage)}</span>
            <span className="text-muted-foreground tabular-nums">
              {s.count} lost · {formatCrore(s.value)}
            </span>
          </div>
          <div className="bg-muted mt-1 h-2 rounded-full">
            <div
              className="h-2 rounded-full bg-red-500/70"
              style={{ width: `${(100 * s.value) / max}%` }}
            />
          </div>
        </div>
      ))}
      <div className="text-muted-foreground pt-1 text-xs">
        Top reasons:{" "}
        {loss.reasons
          .slice(0, 3)
          .map((r) => `${r.reason} (${r.count})`)
          .join(" · ")}
      </div>
    </div>
  );
}

/** Reason × stage cross-tab: which reason kills deals at which stage. */
export function LossMatrix({ loss }: { loss: LossAnalysis }) {
  const { stages, rows } = loss.matrix;
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        No lost leads in this view.
      </p>
    );
  }
  // Peak single cell drives the red-tint intensity, so the hotspot pops.
  const peak = Math.max(
    1,
    ...rows.flatMap((r) => stages.map((s) => r.cells[s] ?? 0)),
  );
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reason</TableHead>
            {stages.map((s) => (
              <TableHead key={s} className="text-right">
                {stageLabel(s)}
              </TableHead>
            ))}
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.reason}>
              <TableCell className="font-medium">{r.reason}</TableCell>
              {stages.map((s) => {
                const c = r.cells[s] ?? 0;
                return (
                  <TableCell
                    key={s}
                    className="text-right tabular-nums"
                    style={
                      c > 0
                        ? { background: `color-mix(in oklch, var(--destructive) ${Math.round((c / peak) * 55)}%, transparent)` }
                        : undefined
                    }
                  >
                    {c > 0 ? c : <span className="text-muted-foreground/40">·</span>}
                  </TableCell>
                );
              })}
              <TableCell className="text-right font-medium tabular-nums">
                {r.total}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Revenue concentration by model, as share bars (top models pay the bills). */
export function ModelConcentration({ rows }: { rows: ModelRow[] }) {
  const shown = rows.slice(0, 8);
  const max = shown[0]?.sharePct || 1;
  if (shown.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        No delivered revenue in this view.
      </p>
    );
  }
  return (
    <div className="space-y-2.5">
      {shown.map((m) => (
        <div key={m.model}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{m.model}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatCrore(m.revenue)} · {formatPct(m.sharePct, 0)} ·{" "}
              {formatInt(m.delivered)} sold
            </span>
          </div>
          <div className="mt-1 h-2.5 rounded-full bg-muted">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-brand to-brand/60"
              style={{ width: `${(100 * m.sharePct) / max}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Lead-source quality, value-weighted (revenue per lead). Sortable by any column. */
export function SourceTable({ rows }: { rows: SourceRow[] }) {
  const tableRows: SortRow[] = rows.map((s) => ({
    id: s.source,
    sort: {
      source: s.source,
      leads: s.leads,
      conversionPct: s.conversionPct,
      revenuePerLead: s.revenuePerLead,
      revenue: s.revenue,
    },
    cells: {
      source: (
        <span className="font-medium capitalize">
          {s.source.replace("_", " ")}
        </span>
      ),
      leads: s.leads,
      conversionPct: formatPct(s.conversionPct, 0),
      revenuePerLead: formatINR(s.revenuePerLead),
      revenue: formatCrore(s.revenue),
    },
  }));
  return (
    <SortableTable
      columns={SOURCE_COLUMNS}
      rows={tableRows}
      initialSort="revenuePerLead"
      initialDir="desc"
      emptyMessage="No lead sources in this view."
    />
  );
}
