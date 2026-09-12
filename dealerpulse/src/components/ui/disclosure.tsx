import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A styled, accessible collapsible built on native <details> — no client JS, so
 * it works inside server components. Used for expandable dashboard sections.
 */
export function Disclosure({
  id,
  title,
  description,
  meta,
  defaultOpen = false,
  children,
  className,
  accent,
}: {
  /** Optional DOM id so a KPI/link can scroll to (and open) this section. */
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned summary content shown while collapsed (e.g. a count). */
  meta?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  /** Optional top accent border class, e.g. "border-t-2 border-t-red-500". */
  accent?: string;
}) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className={cn(
        "group/disc overflow-hidden rounded-xl bg-card border border-border",
        "transition-[border-color,box-shadow] duration-150 ease-out hover:ring-1 hover:ring-brand/30",
        accent,
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="font-heading text-base font-semibold leading-snug">
            {title}
          </div>
          {description && (
            <div className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
          {meta}
          <ChevronDown
            className="size-4 transition-transform duration-200 group-open/disc:rotate-180"
            aria-hidden
          />
        </div>
      </summary>
      <div className="border-t border-border/60 px-4 py-4">{children}</div>
    </details>
  );
}
