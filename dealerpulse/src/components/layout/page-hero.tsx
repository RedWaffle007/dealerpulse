import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The gradient headline band shared by every page, so the top of each view
 * reads as a headline instead of plain text — and the app feels like one system.
 */
export function PageHero({
  title,
  period,
  lead,
  children,
  backHref,
  backLabel,
  actions,
}: {
  title: string;
  period?: string;
  /** Plain-language headline takeaway — the one thing to read first. */
  lead?: ReactNode;
  children?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand/12 via-brand/5 to-transparent p-5 ring-1 ring-brand/15 md:p-6">
      {backHref && (
        <Link
          href={backHref}
          className="mb-2 inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← {backLabel ?? "Back"}
        </Link>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
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
        <p className="mt-2 max-w-3xl text-base font-medium leading-snug text-foreground md:text-lg">
          {lead}
        </p>
      )}
      {children && (
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      )}
    </header>
  );
}
