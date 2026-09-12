import type { StatusEvent } from "@/lib/types";
import { formatDateTime, stageLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const DOT_TONE: Record<string, string> = {
  delivered: "bg-accent-pista",
  lost: "bg-accent-red",
  order_placed: "bg-brand",
};

/** Vertical status-history timeline: every stage transition, in order. */
export function LeadTimeline({ history }: { history: StatusEvent[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No history recorded.</p>;
  }
  return (
    <ol className="relative space-y-4 border-l border-border/70 pl-5">
      {history.map((h, i) => (
        <li key={i} className="relative">
          <span
            className={cn(
              "absolute -left-[26px] top-1 size-3 rounded-full ring-4 ring-background",
              DOT_TONE[h.status] ?? "bg-muted-foreground",
            )}
          />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-medium">{stageLabel(h.status)}</span>
            <time className="text-xs tabular-nums text-muted-foreground">
              {formatDateTime(h.timestamp)}
            </time>
          </div>
          {h.note && <p className="mt-0.5 text-sm text-muted-foreground">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}
