import Link from "next/link";
import type { ActionItem, ActionType } from "@/lib/metrics";
import { formatINR, formatDaysAgo, stageLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

const TYPE_LABEL: Record<ActionType, string> = {
  stale_order: "Stale order",
  overdue: "Overdue",
  high_value_late: "Late-stage",
  cold: "Cold",
};

const TYPE_TONE: Record<ActionType, string> = {
  stale_order: "border-accent-red/40 bg-accent-red/5",
  overdue: "border-accent-golden/40 bg-accent-golden/5",
  high_value_late: "border-accent-orange/40 bg-accent-orange/5",
  cold: "border-border/60",
};

/** Ranked, explainable action items. Each row states why it surfaced. */
export function ActionList({
  items,
  showBranch = true,
}: {
  items: ActionItem[];
  showBranch?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        Nothing needs attention in this view. 🎉
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((a) => (
        <li
          key={a.leadId}
          className={`rounded-md border p-2.5 text-sm ${TYPE_TONE[a.type]}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {TYPE_LABEL[a.type]}
              </Badge>
              <Link
                href={`/leads/${a.leadId}`}
                className="font-medium text-brand hover:underline"
              >
                {a.customer}
              </Link>
            </div>
            <span className="text-muted-foreground tabular-nums">
              {formatINR(a.value)}
            </span>
          </div>
          <div className="text-muted-foreground mt-0.5 text-xs">
            {showBranch && <>{a.branchName} · </>}
            {stageLabel(a.stage)} · {a.repName} · {formatDaysAgo(a.daysStale)}
          </div>
          <div className="mt-1 text-xs">{a.reason}</div>
        </li>
      ))}
    </ul>
  );
}
