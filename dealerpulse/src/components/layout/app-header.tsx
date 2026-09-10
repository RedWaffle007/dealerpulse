import Link from "next/link";
import { Suspense } from "react";
import { getDataset, getIndexes } from "@/lib/data";
import { FilterBar } from "@/components/filters/filter-bar";

/** Sticky top bar: brand, primary nav, and the global filter. */
export function AppHeader() {
  const d = getDataset();
  const idx = getIndexes();
  const branches = d.branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-6 w-6 place-items-center rounded bg-primary text-xs text-primary-foreground">
            DP
          </span>
          DealerPulse
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Overview
          </Link>
          <Link href="/actions" className="hover:text-foreground">
            Action Center
          </Link>
        </nav>
        <div className="ml-auto">
          <Suspense fallback={<div className="h-8" />}>
            <FilterBar months={idx.months} branches={branches} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
