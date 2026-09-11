import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Faint film grain over the hero gradient — the subtle texture that reads as
// "designed" rather than flat. URL-encoded SVG, kept at very low opacity.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * The headline band shared by every page. A soft brand glow + grain give depth,
 * and an optional `visual` turns it into a two-column hero (used on the overview
 * for the animated product preview).
 */
export function PageHero({
  title,
  period,
  lead,
  children,
  backHref,
  backLabel,
  actions,
  cta,
  visual,
}: {
  title: string;
  period?: string;
  /** Plain-language headline takeaway — the one thing to read first. */
  lead?: ReactNode;
  children?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  /** Call-to-action buttons rendered under the copy. */
  cta?: ReactNode;
  /** Optional right-column visual; presence switches the hero to two columns. */
  visual?: ReactNode;
}) {
  return (
    <header className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand/12 via-brand/[0.05] to-transparent p-5 ring-1 ring-brand/15 md:p-7">
      {/* Brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-brand/25 blur-3xl"
      />
      {/* Grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: GRAIN }}
      />

      <div
        className={cn(
          "relative grid items-center gap-6 md:gap-8",
          visual && "md:grid-cols-[1.15fr_0.85fr]",
        )}
      >
        <div>
          {backHref && (
            <Link
              href={backHref}
              className="mb-2 inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              ← {backLabel ?? "Back"}
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-[1.6rem] font-semibold tracking-tight md:text-3xl">
              {title}
            </h1>
            {period && (
              <span className="rounded-full bg-background/70 px-2.5 py-0.5 text-xs font-medium text-brand ring-1 ring-brand/25">
                {period}
              </span>
            )}
            {actions}
          </div>
          {lead && (
            <p className="mt-2 max-w-2xl text-base font-medium leading-snug text-foreground md:text-lg">
              {lead}
            </p>
          )}
          {children && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {children}
            </p>
          )}
          {cta && <div className="mt-4 flex flex-wrap gap-2.5">{cta}</div>}
        </div>

        {visual && (
          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -m-6 rounded-full bg-brand/15 blur-3xl"
            />
            <div className="relative">{visual}</div>
          </div>
        )}
      </div>
    </header>
  );
}
