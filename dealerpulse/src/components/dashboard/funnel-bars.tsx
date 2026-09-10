import type { FunnelStep } from "@/lib/metrics";
import { formatPct, stageLabel } from "@/lib/format";

/** Compact horizontal funnel with per-stage leak %. */
export function FunnelBars({ steps }: { steps: FunnelStep[] }) {
  const top = steps[0]?.reached || 1;
  return (
    <div className="space-y-2">
      {steps.map((s) => (
        <div key={s.stage}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{stageLabel(s.stage)}</span>
            <span className="text-muted-foreground tabular-nums">
              {s.reached}
              {s.leakPct != null && s.leakPct > 0 && (
                <span className="ml-2 text-red-500">−{formatPct(s.leakPct, 0)}</span>
              )}
            </span>
          </div>
          <div className="bg-muted mt-1 h-2 rounded-full">
            <div
              className="bg-primary h-2 rounded-full"
              style={{ width: `${(100 * s.reached) / top}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
