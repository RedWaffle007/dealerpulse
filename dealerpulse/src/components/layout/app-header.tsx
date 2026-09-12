import Link from "next/link";
import { Suspense } from "react";
import { getDataset, getIndexes } from "@/lib/data";
import { FilterBar } from "@/components/filters/filter-bar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MainNav } from "@/components/layout/main-nav";

/** Sticky top bar: brand, primary nav, and the global filter. */
export async function AppHeader() {
  const d = await getDataset();
  const idx = await getIndexes();
  const branches = d.branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col items-stretch gap-x-5 gap-y-3 px-4 py-2.5 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="flex items-center justify-between gap-3 lg:contents">
          <Link href="/" className="flex w-fit shrink-0 items-center gap-2 rounded-md font-semibold hover-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span className="grid h-6 w-6 place-items-center rounded bg-brand text-xs font-bold text-brand-foreground">
              DP
            </span>
            DealerPulse
          </Link>
          <div className="lg:order-last"><ThemeToggle /></div>
        </div>
        <MainNav />
        <div className="w-full min-w-0 lg:ml-auto lg:w-auto">
          <Suspense fallback={<div className="h-8" />}>
            <FilterBar months={idx.months} branches={branches} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
