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

/** Lead-source quality, value-weighted (revenue per lead). */
export function SourceTable({ rows }: { rows: SourceRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Source</TableHead>
          <TableHead className="text-right">Leads</TableHead>
          <TableHead className="text-right">Conv.</TableHead>
          <TableHead className="text-right">₹/lead</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => (
          <TableRow key={s.source}>
            <TableCell className="font-medium capitalize">
              {s.source.replace("_", " ")}
            </TableCell>
            <TableCell className="text-right tabular-nums">{s.leads}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPct(s.conversionPct, 0)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatINR(s.revenuePerLead)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCrore(s.revenue)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
