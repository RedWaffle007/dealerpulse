import type { LossAnalysis, SourceRow } from "@/lib/metrics";
import { formatCrore, formatINR, formatPct, stageLabel } from "@/lib/format";
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
