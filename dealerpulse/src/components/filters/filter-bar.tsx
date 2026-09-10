"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
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
    else if (key === "q4") setParam({ from: "2025-10", to: "2025-12" });
    else if (key === "last") setParam({ from: months[months.length - 1], to: months[months.length - 1] });
  };

  const presetValue =
    from === months[0] && to === months[months.length - 1]
      ? "all"
      : from === "2025-10" && to === "2025-12"
        ? "q4"
        : from === to && to === months[months.length - 1]
          ? "last"
          : "custom";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={presetValue === "custom" ? undefined : presetValue} onValueChange={applyPreset}>
        <SelectTrigger size="sm" className="w-[150px]">
          <SelectValue placeholder="Custom range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All (Jun–Dec)</SelectItem>
          <SelectItem value="q4">Q4 (Oct–Dec)</SelectItem>
          <SelectItem value="last">Latest month</SelectItem>
        </SelectContent>
      </Select>

      <Select value={from} onValueChange={(v) => v && setParam({ from: v })}>
        <SelectTrigger size="sm" className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m} value={m}>
              {formatMonth(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground text-xs">to</span>
      <Select value={to} onValueChange={(v) => v && setParam({ to: v })}>
        <SelectTrigger size="sm" className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m} value={m}>
              {formatMonth(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={branch} onValueChange={(v) => v && setParam({ branch: v })}>
        <SelectTrigger size="sm" className="w-[170px]">
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
    </div>
  );
}
