"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMonth } from "@/lib/format";

type BranchOption = { id: string; name: string };

/**
 * Global time-range + branch filter. State lives entirely in the URL
 * (shareable, and every server component re-reads it), so navigation preserves
 * context across Overview → branch → rep.
 */
export function FilterBar({
  months,
  branches,
}: {
  months: string[];
  branches: BranchOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const from = params.get("from") ?? months[0];
  const to = params.get("to") ?? months[months.length - 1];
  const branch = params.get("branch") ?? "all";

  const setParam = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) next.set(k, v);
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const applyPreset = (key: string | null) => {
    if (!key) return;
    if (key === "all") setParam({ from: months[0], to: months[months.length - 1] });
    else if (key === "q3") setParam({ from: "2025-07", to: "2025-09" });
    else if (key === "q4") setParam({ from: "2025-10", to: "2025-12" });
    else if (key === "last") setParam({ from: months[months.length - 1], to: months[months.length - 1] });
  };

  // Changing one end can never leave the range inverted: if the new start is
  // after the end (or the new end before the start), the other end follows.
  const setFrom = (v: string | null) => {
    if (v) setParam(v > to ? { from: v, to: v } : { from: v });
  };
  const setTo = (v: string | null) => {
    if (v) setParam(v < from ? { from: v, to: v } : { to: v });
  };

  const presetValue =
    from === months[0] && to === months[months.length - 1]
      ? "all"
      : from === "2025-07" && to === "2025-09"
        ? "q3"
        : from === "2025-10" && to === "2025-12"
          ? "q4"
          : from === to && to === months[months.length - 1]
            ? "last"
            : "custom";

  return (
    <div className="flex flex-wrap items-end gap-x-2 gap-y-2">
      <Field label="Period">
        <Select value={presetValue === "custom" ? null : presetValue} onValueChange={applyPreset}>
          <SelectTrigger size="sm" className="w-[148px]">
            <SelectValue placeholder="Custom range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All (Jun–Dec)</SelectItem>
            <SelectItem value="q3">Q3 (Jul–Sep)</SelectItem>
            <SelectItem value="q4">Q4 (Oct–Dec)</SelectItem>
            <SelectItem value="last">Latest month</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="From">
        <Select value={from} onValueChange={setFrom}>
          <SelectTrigger size="sm" className="w-[116px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              // A start month can't be after the current end month.
              <SelectItem key={m} value={m} disabled={m > to}>
                {formatMonth(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="To">
        <Select value={to} onValueChange={setTo}>
          <SelectTrigger size="sm" className="w-[116px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              // An end month can't be before the current start month.
              <SelectItem key={m} value={m} disabled={m < from}>
                {formatMonth(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Branch">
        <Select value={branch} onValueChange={(v) => v && setParam({ branch: v })}>
          <SelectTrigger size="sm" className="w-[168px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

/** A control with a small caption above it, so no dropdown is a mystery. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="px-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
