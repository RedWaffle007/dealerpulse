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
import { formatMonth } from "@/lib/format";

/** Monthly units delivered vs target. Bars colored by attainment health. */
export function AttainmentChart({ data }: { data: MonthPoint[] }) {
  const rows = data.map((d) => ({
    ...d,
    label: formatMonth(d.month).replace(" 2025", ""),
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} />
        <Tooltip
          cursor={{ opacity: 0.06 }}
          formatter={(value, name) => [
            String(value),
            name === "delivered" ? "Delivered" : "Target",
          ]}
          labelFormatter={(l) => `${l} 2025`}
        />
        <Bar dataKey="target" fill="var(--muted)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="delivered" radius={[3, 3, 0, 0]}>
          {rows.map((r, i) => (
            <Cell
              key={i}
              fill={
                r.attainmentPct >= 90
                  ? "var(--chart-2, #16a34a)"
                  : r.attainmentPct >= 50
                    ? "var(--chart-4, #d97706)"
                    : "var(--chart-1, #dc2626)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
