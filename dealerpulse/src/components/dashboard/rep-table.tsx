import Link from "next/link";
import type { RepRow } from "@/lib/metrics";
import { formatCrore, formatPct } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

/** Rep leaderboard with a minimum-sample guardrail (<5 leads flagged). */
export function RepTable({
  rows,
  qs,
  showBranch = false,
}: {
  rows: RepRow[];
  qs?: string;
  showBranch?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rep</TableHead>
          {showBranch && <TableHead>Branch</TableHead>}
          <TableHead className="text-right">Leads</TableHead>
          <TableHead className="text-right">Delivered</TableHead>
          <TableHead className="text-right">Conv.</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.repId}>
            <TableCell>
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
            </TableCell>
            {showBranch && (
              <TableCell className="text-muted-foreground">
                {r.branchName}
              </TableCell>
            )}
            <TableCell className="text-right tabular-nums">{r.leads}</TableCell>
            <TableCell className="text-right tabular-nums">{r.delivered}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPct(r.conversionPct, 0)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCrore(r.revenue)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
