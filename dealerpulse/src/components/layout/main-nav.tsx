"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/reps", label: "Sales Team" },
  { href: "/actions", label: "Action Center" },
  { href: "/scenarios", label: "What-If Lab" },
  { href: "/upload", label: "Data Import" },
];

/**
 * Primary nav with an explicit "you are here" state. The active route reads
 * as a solid tab so there's never ambiguity about which view you're on.
 */
export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-full min-w-0 flex-nowrap items-center gap-1 overflow-x-auto p-1 text-sm lg:w-auto lg:p-0">
      {LINKS.map((l) => {
        const active =
          l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 font-medium hover-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
