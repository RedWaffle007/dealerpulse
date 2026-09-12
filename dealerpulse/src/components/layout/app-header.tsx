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
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 rounded-md font-semibold hover-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
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
