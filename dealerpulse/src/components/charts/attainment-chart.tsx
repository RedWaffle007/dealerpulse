"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthPoint } from "@/lib/metrics";
import { formatInt, formatMonth } from "@/lib/format";

/** Color a delivered bar by how close it is to target. */
function healthColor(pct: number): string {
  if (pct >= 90) return "var(--chart-2)"; // turquoise — on/above target
  if (pct >= 50) return "var(--chart-3)"; // golden — lagging
  return "var(--chart-4)"; // red — well below target
}

/** Monthly units delivered vs target. Bars colored by attainment health. */
export function AttainmentChart({ data }: { data: MonthPoint[] }) {
  const rows = data.map((d) => ({
    ...d,
    label: formatMonth(d.month).replace(/ 20\d\d/, ""),
  }));
  return (
    <div>
      {/* Explicit legend: target vs delivered, and what the delivered color means. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-3 rounded-sm bg-muted-foreground/30" aria-hidden />
          Target
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-3 rounded-sm bg-[var(--chart-2)]" aria-hidden />
          Delivered — on target (≥90%)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-3 rounded-sm bg-[var(--chart-3)]" aria-hidden />
          lagging (≥50%)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-3 rounded-sm bg-[var(--chart-4)]" aria-hidden />
          well behind (&lt;50%)
        </span>
      </div>
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[32rem]">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "var(--muted-foreground)" }} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "var(--muted-foreground)" }} />
              <Tooltip
                cursor={{ opacity: 0.06 }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
                itemStyle={{ color: "var(--popover-foreground)" }}
                labelStyle={{ color: "var(--popover-foreground)" }}
                // Each bar sets its own `name` ("Delivered" / "Target"), so the
                // tooltip labels each row correctly — no custom name mapping needed.
                formatter={(value) => formatInt(Number(value) || 0)}
              />
              <Bar
                dataKey="target"
                name="Target"
                fill="var(--muted-foreground)"
                fillOpacity={0.28}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="delivered"
                name="Delivered"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              >
                {rows.map((r) => (
                  <Cell key={r.month} fill={healthColor(r.attainmentPct)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
