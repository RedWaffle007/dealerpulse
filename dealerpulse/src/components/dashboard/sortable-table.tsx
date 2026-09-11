"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";
export type ColType = "text" | "number" | "date";

export type SortColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
  /** text → A–Z/Z–A · number → asc/desc · date → oldest/newest. Default: text. */
  type?: ColType;
  sortable?: boolean;
  className?: string;
};

export type SortRow = {
  id: string;
  /** Rendered cell content, keyed by column. */
  cells: Record<string, ReactNode>;
  /** Raw sortable value per column (number for numeric/currency/%, string/ISO otherwise). */
  sort: Record<string, string | number | null | undefined>;
};

/** Tailwind classes for the top-3 / top-5 / top-10 "medal" tiers (by row position). */
function tierClass(i: number): string {
  if (i < 3) return "bg-amber-400/15 hover:bg-amber-400/25";
  if (i < 5) return "bg-zinc-400/12 hover:bg-zinc-400/20";
  if (i < 10) return "bg-orange-700/10 hover:bg-orange-700/16";
  return "";
}
function tierDot(i: number): string | null {
  if (i < 3) return "bg-amber-400";
  if (i < 5) return "bg-zinc-400";
  if (i < 10) return "bg-orange-600";
  return null;
}

/**
 * A single, reusable table primitive for every ranked/tabular view. Sorting is
 * client-side on raw values (so ₹ and % sort by magnitude, not text); each
 * header toggles direction with a sensible per-type default. Optional serial
 * numbers and top-3/5/10 medal tiers track the current sort order.
 */
export function SortableTable({
  columns,
  rows,
  initialSort,
  initialDir = "desc",
  rankTiers = false,
  serial = false,
  emptyMessage = "No rows to show.",
}: {
  columns: SortColumn[];
  rows: SortRow[];
  initialSort?: string;
  initialDir?: SortDir;
  rankTiers?: boolean;
  serial?: boolean;
  emptyMessage?: string;
}) {
  const [sortKey, setSortKey] = useState(initialSort ?? columns[0]?.key);
  const [dir, setDir] = useState<SortDir>(initialDir);

  const sorted = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      const av = a.sort[sortKey];
      const bv = b.sort[sortKey];
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }
      return dir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, sortKey, dir]);

  const toggle = (c: SortColumn) => {
    if (c.sortable === false) return;
    if (c.key === sortKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(c.key);
      setDir(c.type === "text" ? "asc" : "desc");
    }
  };

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        {emptyMessage}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {serial && (
            <TableHead className="w-10 text-right text-muted-foreground">
              #
            </TableHead>
          )}
          {columns.map((c) => {
            const active = c.key === sortKey;
            const canSort = c.sortable !== false;
            return (
              <TableHead
                key={c.key}
                className={cn(
                  c.align === "right" ? "text-right" : "text-left",
                  c.className,
                )}
              >
                {canSort ? (
                  <button
                    type="button"
                    onClick={() => toggle(c)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded transition-colors hover:text-brand",
                      c.align === "right" && "flex-row-reverse",
                      active ? "text-brand" : "text-foreground",
                    )}
                    aria-label={`Sort by ${c.label}`}
                  >
                    {c.label}
                    {active ? (
                      dir === "asc" ? (
                        <ChevronUp className="size-3.5" aria-hidden />
                      ) : (
                        <ChevronDown className="size-3.5" aria-hidden />
                      )
                    ) : (
                      <ChevronsUpDown
                        className="size-3 text-muted-foreground/40"
                        aria-hidden
                      />
                    )}
                  </button>
                ) : (
                  c.label
                )}
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r, i) => {
          const dot = rankTiers ? tierDot(i) : null;
          return (
            <TableRow key={r.id} className={rankTiers ? tierClass(i) : undefined}>
              {serial && (
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {dot && (
                      <span
                        className={cn("size-1.5 rounded-full", dot)}
                        aria-hidden
                      />
                    )}
                    {i + 1}
                  </span>
                </TableCell>
              )}
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  className={cn(
                    c.align === "right" && "text-right tabular-nums",
                    c.className,
                  )}
                >
                  {r.cells[c.key]}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
