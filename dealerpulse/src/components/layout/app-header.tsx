import Link from "next/link";
import { Suspense } from "react";
import { getDataset, getIndexes } from "@/lib/data";
import { FilterBar } from "@/components/filters/filter-bar";
import { MainNav } from "@/components/layout/main-nav";

/** Sticky top bar: brand, primary nav, and the global filter. */
export async function AppHeader() {
  const d = await getDataset();
  const idx = await getIndexes();
  const branches = d.branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-6 w-6 place-items-center rounded bg-brand text-xs font-bold text-brand-foreground">
            DP
          </span>
          DealerPulse
        </Link>
        <MainNav />
        <div className="ml-auto">
          <Suspense fallback={<div className="h-8" />}>
            <FilterBar months={idx.months} branches={branches} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
